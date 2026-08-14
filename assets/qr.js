/* =============================================================================
   SpaceQuant — codice QR, scritto in casa
   -----------------------------------------------------------------------------
   PERCHÉ NON UNA LIBRERIA. Il sito ha una regola sola da cui non si deroga:
   nessuna richiesta esce verso servizi di terzi, e non c'è alcun passo di build.
   Un servizio che genera codici QR da un URL manderebbe a un estraneo il numero
   di WhatsApp e le risposte di chi compila il questionario — cioè esattamente il
   contenuto che il questionario raccoglie. Una libreria via CDN sarebbe una
   richiesta esterna. Restava scriverlo, ed è quello che c'è qui.

   COSA COPRE. Modalità byte (UTF-8), versioni 1–20, correzione L e M. Basta e
   avanza: l'URL di WhatsApp con le tre risposte sta in circa 400 byte, cioè
   versione 13 in L. Chiedere di più solleva un errore esplicito invece di
   produrre un codice che non si legge.

   COM'È VERIFICATO. Non «sembra funzionare»: la matrice prodotta qui è
   confrontata modulo per modulo con quella di `segno`, un'implementazione
   indipendente, su una batteria di ingressi. I casi congelati stanno in
   tools/qr-fixtures.json e li ricontrolla tools/test-qr.js a ogni esecuzione.
   Un codice QR sbagliato non dà errore: dà un'immagine plausibile che nessun
   telefono legge — e chi la prova la prova su un telefono solo.

   Riferimento: ISO/IEC 18004. La nomenclatura qui sotto è la sua.
   ============================================================================= */

const SQQR = (function () {

  /* =========================================================================
     1. ARITMETICA NEL CAMPO DI GALOIS GF(256)
     La correzione d'errore Reed-Solomon vive qui dentro. Il polinomio
     generatore del campo è 0x11D, quello fissato dallo standard.
     ========================================================================= */

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (function initGF() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* Il polinomio generatore per `n` codeword di correzione:
     (x - α⁰)(x - α¹)…(x - αⁿ⁻¹), coefficienti dal grado più alto al più basso.

     ⚠️ Moltiplicando per (x + αⁱ) il termine che si SPOSTA è quello moltiplicato
     per x, e va in `next[j]`; quello moltiplicato per αⁱ resta indietro, in
     `next[j+1]`. Invertendoli esce il polinomio ribaltato — e con un solo
     termine (n = 1) il ribaltamento è simmetrico, quindi non si vede: il codice
     sembra funzionare finché non si prova una correzione più lunga di uno. */
  const genCache = {};
  function generator(n) {
    if (genCache[n]) return genCache[n];
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= gfMul(g[j], EXP[i]);
      }
      g = next;
    }
    return (genCache[n] = g);
  }

  /* Resto della divisione del messaggio per il generatore: sono le codeword
     di correzione. */
  function ecCodewords(data, n) {
    const g = generator(n);
    const res = new Uint8Array(data.length + n);
    res.set(data);
    for (let i = 0; i < data.length; i++) {
      const c = res[i];
      if (c === 0) continue;
      for (let j = 0; j < g.length; j++) res[i + j] ^= gfMul(g[j], c);
    }
    return res.slice(data.length);
  }

  /* =========================================================================
     2. LE TABELLE DELLO STANDARD
     Non sono ricavabili da una formula: sono scelte del comitato, e vanno
     riportate. Una riga per versione, da 1 a 20.
     ========================================================================= */

  // codeword totali (dati + correzione) per versione
  const TOTAL_CODEWORDS = [
    26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
    404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  ];

  /* Per ciascun livello: [codeword di correzione per blocco, numero di blocchi].
     Quando i blocchi non dividono i dati in parti uguali, lo standard fa i primi
     blocchi più corti di uno: è gestito in `splitBlocks`, non qui. */
  const ECC = {
    L: [[7, 1], [10, 1], [15, 1], [20, 1], [26, 1], [18, 2], [20, 2], [24, 2], [30, 2], [18, 4],
        [20, 4], [24, 4], [26, 4], [30, 4], [22, 6], [24, 6], [28, 6], [30, 6], [28, 7], [28, 8]],
    M: [[10, 1], [16, 1], [26, 1], [18, 2], [24, 2], [16, 4], [18, 4], [22, 4], [22, 5], [26, 5],
        [30, 5], [22, 8], [22, 9], [24, 9], [24, 10], [28, 10], [28, 11], [26, 13], [26, 14], [26, 16]],
  };

  const FORMAT_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };

  /* Posizioni dei quadrati di allineamento: questa invece è una regola, non una
     tabella arbitraria — primo a 6, ultimo a lato−7, gli altri distribuiti a
     passo pari. */
  function alignPositions(version) {
    if (version === 1) return [];
    const n = Math.floor(version / 7) + 2;
    const last = version * 4 + 10;
    const step = version === 32 ? 26
               : Math.ceil((last - 6) / (n - 1) / 2) * 2;
    const out = [6];
    for (let i = n - 1; i > 0; i--) out.splice(1, 0, last - (n - 1 - i) * step);
    return out;
  }

  /* =========================================================================
     3. I DATI → I BIT
     ========================================================================= */

  function utf8Bytes(text) {
    const out = [];
    for (const ch of unescape(encodeURIComponent(text))) out.push(ch.charCodeAt(0));
    return out;
  }

  function dataCapacity(version, level) {
    const [ecPerBlock, blocks] = ECC[level][version - 1];
    return TOTAL_CODEWORDS[version - 1] - ecPerBlock * blocks;
  }

  /* La versione più piccola in cui il messaggio ci sta. Piccola non è un
     vezzo: meno moduli vuol dire moduli più grandi a parità di spazio a
     schermo, cioè un codice che si legge da più lontano e più in fretta. */
  function fitVersion(bytes, level, minVersion) {
    const need = 4 + (bytes.length < 256 ? 8 : 16) + bytes.length * 8;
    for (let v = minVersion || 1; v <= 20; v++) {
      const countBits = v <= 9 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= dataCapacity(v, level) * 8) return v;
    }
    throw new Error('QR: messaggio troppo lungo (' + bytes.length +
                    ' byte, il massimo qui è la versione 20)');
  }

  function buildCodewords(bytes, version, level) {
    const capacity = dataCapacity(version, level);
    const countBits = version <= 9 ? 8 : 16;
    const bits = [];
    const push = (value, n) => { for (let i = n - 1; i >= 0; i--) bits.push((value >> i) & 1); };

    push(0b0100, 4);                    // modalità byte
    push(bytes.length, countBits);
    for (const b of bytes) push(b, 8);

    // terminatore: fino a quattro zeri, ma senza sforare
    for (let i = 0; i < 4 && bits.length < capacity * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);

    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }
    // riempimento alternato, come prescritto
    const PAD = [0xEC, 0x11];
    for (let i = 0; cw.length < capacity; i++) cw.push(PAD[i % 2]);
    return cw;
  }

  /* Blocchi e interfogliatura. È il passaggio dove si sbaglia in silenzio:
     con un blocco solo (versioni piccole) qualunque implementazione ingenua
     funziona, e si scopre che è sbagliata solo quando il messaggio cresce. */
  function interleave(codewords, version, level) {
    const [ecPerBlock, numBlocks] = ECC[level][version - 1];
    const totalData = codewords.length;
    const shortLen = Math.floor(totalData / numBlocks);
    const longCount = totalData % numBlocks;      // i blocchi finali, più lunghi di uno

    const dataBlocks = [], ecBlocks = [];
    let at = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = shortLen + (i >= numBlocks - longCount ? 1 : 0);
      const block = codewords.slice(at, at + len);
      at += len;
      dataBlocks.push(block);
      ecBlocks.push(ecCodewords(Uint8Array.from(block), ecPerBlock));
    }

    const out = [];
    const maxData = shortLen + (longCount ? 1 : 0);
    for (let i = 0; i < maxData; i++)
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ecPerBlock; i++)
      for (const b of ecBlocks) out.push(b[i]);
    return out;
  }

  /* =========================================================================
     4. LA MATRICE
     ========================================================================= */

  function emptyMatrix(size) {
    const m = [], reserved = [];
    for (let i = 0; i < size; i++) {
      m.push(new Int8Array(size).fill(-1));
      reserved.push(new Uint8Array(size));
    }
    return { m: m, reserved: reserved, size: size };
  }

  function placeFinder(g, r, c) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const y = r + dr, x = c + dc;
        if (y < 0 || y >= g.size || x < 0 || x >= g.size) continue;
        const inRing = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
           (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        g.m[y][x] = inRing ? 1 : 0;
        g.reserved[y][x] = 1;
      }
    }
  }

  function buildMatrix(version, level, codewords, mask) {
    const size = version * 4 + 17;
    const g = emptyMatrix(size);

    placeFinder(g, 0, 0);
    placeFinder(g, 0, size - 7);
    placeFinder(g, size - 7, 0);

    // temporizzatori
    for (let i = 8; i < size - 8; i++) {
      const bit = i % 2 === 0 ? 1 : 0;
      g.m[6][i] = bit; g.reserved[6][i] = 1;
      g.m[i][6] = bit; g.reserved[i][6] = 1;
    }

    // quadrati di allineamento, saltando quelli che cadrebbero sui finder
    const pos = alignPositions(version);
    for (const r of pos) {
      for (const c of pos) {
        if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            g.m[r + dr][c + dc] = on ? 1 : 0;
            g.reserved[r + dr][c + dc] = 1;
          }
        }
      }
    }

    // aree riservate all'informazione di formato
    for (let i = 0; i < 9; i++) {
      if (!g.reserved[8][i]) { g.reserved[8][i] = 1; g.m[8][i] = 0; }
      if (!g.reserved[i][8]) { g.reserved[i][8] = 1; g.m[i][8] = 0; }
    }
    for (let i = 0; i < 8; i++) {
      g.reserved[8][size - 1 - i] = 1; g.m[8][size - 1 - i] = 0;
      g.reserved[size - 1 - i][8] = 1; g.m[size - 1 - i][8] = 0;
    }

    /* ⚠️ Il modulo sempre scuro va messo DOPO le riserve, non prima: sta in
       (size−8, 8), che è l'ultima casella toccata dal ciclo qui sopra. Messo
       prima veniva riazzerato da quel ciclo, e l'unico modulo del codice che
       dev'essere scuro per definizione restava chiaro. */
    g.m[size - 8][8] = 1; g.reserved[size - 8][8] = 1;

    // informazione di versione (solo dalla 7 in su)
    if (version >= 7) {
      const bits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const b = (bits >> i) & 1;
        const r = Math.floor(i / 3), c = i % 3;
        g.m[r][size - 11 + c] = b; g.reserved[r][size - 11 + c] = 1;
        g.m[size - 11 + c][r] = b; g.reserved[size - 11 + c][r] = 1;
      }
    }

    // i dati, a serpentina da destra in basso, due colonne alla volta
    let bitIndex = 0;
    const totalBits = codewords.length * 8;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--;                 // la colonna del temporizzatore si salta
      for (let step = 0; step < size; step++) {
        const row = up ? size - 1 - step : step;
        for (let k = 0; k < 2; k++) {
          const col = right - k;
          if (g.reserved[row][col]) continue;
          let bit = 0;
          if (bitIndex < totalBits) {
            bit = (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
          }
          bitIndex++;
          g.m[row][col] = bit ^ maskBit(mask, row, col);
        }
      }
      up = !up;
    }

    placeFormat(g, level, mask);
    return g.m;
  }

  function maskBit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0 ? 1 : 0;
      case 1: return r % 2 === 0 ? 1 : 0;
      case 2: return c % 3 === 0 ? 1 : 0;
      case 3: return (r + c) % 3 === 0 ? 1 : 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0 ? 1 : 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0 ? 1 : 0;
      case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0 ? 1 : 0;
      default: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0 ? 1 : 0;
    }
  }

  /* Informazione di formato: 5 bit di dato, 10 di BCH, il tutto in XOR con una
     maschera fissa perché non risulti mai tutto zero. */
  function formatBits(level, mask) {
    let v = (FORMAT_BITS[level] << 3) | mask;
    let d = v << 10;
    for (let i = 4; i >= 0; i--) if ((d >> (i + 10)) & 1) d ^= 0b10100110111 << i;
    return ((v << 10) | d) ^ 0b101010000010010;
  }

  function versionBits(version) {
    let d = version << 12;
    for (let i = 5; i >= 0; i--) if ((d >> (i + 12)) & 1) d ^= 0b1111100100101 << i;
    return (version << 12) | d;
  }

  function placeFormat(g, level, mask) {
    const bits = formatBits(level, mask);
    const size = g.size;
    for (let i = 0; i < 15; i++) {
      /* ⚠️ Si scrive dal bit PIÙ significativo: il primo modulo porta il bit 14,
         non il bit 0. Al contrario il codice resta plausibile a vedersi — cambia
         solo un pugno di moduli su quattrocento — e nessun telefono lo legge. */
      const b = (bits >> (14 - i)) & 1;
      // copia attorno al finder in alto a sinistra
      if (i < 6)       g.m[8][i] = b;
      else if (i === 6) g.m[8][7] = b;
      else if (i === 7) g.m[8][8] = b;
      else if (i === 8) g.m[7][8] = b;
      else              g.m[14 - i][8] = b;

      /* ⚠️ La seconda copia si divide 7 + 8, non 8 + 7: sette moduli nella
         colonna 8 (righe size−1 … size−7) e otto nella riga 8 (colonne size−8
         … size−1). Il confine cade dove sta il modulo sempre scuro, in
         (size−8, 8): sbagliando il conto di uno lo si sovrascrive e insieme si
         sfalsano gli otto bit successivi. */
      if (i < 7) g.m[size - 1 - i][8] = b;
      else       g.m[8][size - 15 + i] = b;
    }
  }

  /* =========================================================================
     5. LA MASCHERA MIGLIORE
     Si provano tutte e otto e si tiene quella con la penalità più bassa: sono
     le quattro regole dello standard, che scoraggiano le figure che confondono
     un lettore — file lunghe uniformi, blocchi 2×2, sequenze simili al finder,
     e uno squilibrio fra chiaro e scuro.
     ========================================================================= */

  function penalty(m) {
    const n = m.length;
    let score = 0;

    // 1. cinque o più moduli uguali di fila
    for (let i = 0; i < n; i++) {
      for (const line of [m[i], m.map(row => row[i])]) {
        let run = 1;
        for (let j = 1; j < n; j++) {
          if (line[j] === line[j - 1]) { run++; }
          else { if (run >= 5) score += run - 2; run = 1; }
        }
        if (run >= 5) score += run - 2;
      }
    }

    // 2. blocchi 2×2 dello stesso colore
    for (let r = 0; r < n - 1; r++)
      for (let c = 0; c < n - 1; c++)
        if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1])
          score += 3;

    // 3. la sequenza 1:1:3:1:1 con quattro moduli chiari da un lato
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const match = (line, at, pat) => {
      for (let k = 0; k < pat.length; k++) if (line[at + k] !== pat[k]) return false;
      return true;
    };
    for (let i = 0; i < n; i++) {
      const row = m[i], col = m.map(r => r[i]);
      for (let j = 0; j + 11 <= n; j++) {
        if (match(row, j, A) || match(row, j, B)) score += 40;
        if (match(col, j, A) || match(col, j, B)) score += 40;
      }
    }

    // 4. squilibrio fra moduli scuri e chiari
    let dark = 0;
    for (const row of m) for (const v of row) dark += v;
    const pct = (dark * 100) / (n * n);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;

    return score;
  }

  /* =========================================================================
     6. QUELLO CHE SI USA DA FUORI
     ========================================================================= */

  /** Matrice di 0/1 del codice QR per `text`. */
  function matrix(text, opts) {
    const o = opts || {};
    const level = o.level || 'M';
    const bytes = utf8Bytes(text);
    const version = fitVersion(bytes, level, o.minVersion);
    const cw = interleave(buildCodewords(bytes, version, level), version, level);

    if (o.mask !== undefined && o.mask !== null) return buildMatrix(version, level, cw, o.mask);

    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = buildMatrix(version, level, cw, mask);
      const p = penalty(m);
      if (p < bestScore) { bestScore = p; best = m; }
    }
    return best;
  }

  /** Il codice QR come SVG: una stringa, nessuna immagine da caricare.
      Il margine di 4 moduli attorno NON è decorativo — è la «quiet zone» che
      lo standard richiede, e senza di essa molti telefoni non agganciano. */
  function svg(text, opts) {
    const o = opts || {};
    const m = matrix(text, o);
    const n = m.length;
    const quiet = o.quiet === undefined ? 4 : o.quiet;
    const tot = n + quiet * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!m[r][c]) { c++; continue; }
        let len = 1;
        while (c + len < n && m[r][c + len]) len++;
        d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h' + len + 'v1h-' + len + 'z';
        c += len;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tot + ' ' + tot +
           '" shape-rendering="crispEdges" role="img"' +
           (o.label ? ' aria-label="' + o.label + '"' : ' aria-hidden="true"') +
           '><rect width="' + tot + '" height="' + tot + '" fill="' + (o.light || '#fff') +
           '"/><path fill="' + (o.dark || '#000') + '" d="' + d + '"/></svg>';
  }

  return { matrix: matrix, svg: svg, _penalty: penalty };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SQQR;
