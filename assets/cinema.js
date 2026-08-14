/* =============================================================================
   SpaceQuant — apertura cinematica
   -----------------------------------------------------------------------------
   Il backtest va in replay mentre l'utente scorre, e torna indietro se l'utente
   torna indietro.

   IL PRINCIPIO DI COSTRUZIONE, uno solo: tutto ciò che si vede è funzione pura
   dello scorrimento. Nessuna animazione con vita propria, nessun timer, nessuno
   stato che si accumula. La conseguenza è che la scena è reversibile per
   costruzione: allo stesso punto di scorrimento corrisponde sempre lo stesso
   fotogramma, che ci si arrivi scendendo, risalendo o saltandoci dentro con un
   link. Se un domani qualcosa qui dentro comincia a dipendere dal tempo, la
   sequenza smetterà di tornare indietro correttamente.

   Le candele non compaiono già formate: ognuna nasce sull'apertura, si allunga
   verso i suoi estremi seguendo un percorso interno alla barra e si chiude sul
   suo prezzo di chiusura — come una candela viva in un replay.

   Il grafico è disegnato su DUE strati sovrapposti: le didascalie stanno in
   mezzo, così una parte delle candele scorre dietro al testo e le più recenti
   gli passano davanti.
   ============================================================================= */

(function () {

  const stage = document.getElementById('cine');
  if (!stage) return;

  const track    = document.getElementById('cine-track');
  const zoom     = document.getElementById('cine-zoom');
  const title    = document.getElementById('cine-title');
  const back     = document.getElementById('chart-back');
  const front    = document.getElementById('chart-front');
  const side     = document.getElementById('app-side');
  const caps     = Array.from(document.querySelectorAll('.cap'));
  const railFill = document.getElementById('cine-rail-fill');
  const ctxB = back.getContext('2d');
  const ctxF = front.getContext('2d');

  /* =========================================================================
     1. LA BARRA DEGLI STRUMENTI
     Le stesse voci dell'applicazione: selezione, linee, forme, testo,
     annotazioni, visibilità, blocco, eliminazione.
     ========================================================================= */

  const TOOLS = [
    ['M4 3l9 16 2.4-6.4L22 10z', true],   // cursore di selezione
    ['M3 12h18'],                          // linea orizzontale
    ['M12 3v18'],                          // linea verticale
    ['M4 19L20 5'],                        // linea obliqua
    ['M3 12h16m-5-5l5 5-5 5'],             // freccia
    ['M4 20L20 4m0 0h-6m6 0v6'],           // raggio
    ['M4 6h16v12H4z'],                     // rettangolo
    ['M4 8h16M4 12h16M4 16h16'],           // livelli
    ['M12 5a7 7 0 100 14 7 7 0 000-14z'],  // ellisse
    ['M5 6h14M12 6v12'],                   // testo
    ['M6 18c3 0 3-3 6-3s3 3 6-3'],         // pennello
    ['M4 16l5-6 4 4 7-8'],                 // misura
    ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z'], // visibilità
    ['M6 11h12v9H6z M9 11V8a3 3 0 016 0v3'],              // blocco
    ['M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13'],                // elimina
  ];

  (function buildTools() {
    if (!side) return;
    side.innerHTML = TOOLS.map(function (t) {
      return '<svg viewBox="0 0 24 24" class="' + (t[1] ? 'on' : '') +
             '" aria-hidden="true"><path d="' + t[0] + '"/></svg>';
    }).join('');
  })();

  /* =========================================================================
     2. I DATI — deterministici, quindi identici a ogni caricamento
     ========================================================================= */

  const N      = 260;
  const STEPS  = 14;
  const START  = 1.1500;
  const FRONT_BARS = 26;   // quante candele passano DAVANTI al testo

  /* Quante candele stanno in campo insieme. Su un telefono le stesse 84 di uno
     schermo largo diventano un pettine: il corpo della candela scende sotto il
     paio di pixel e il replay — che è tutto il senso della scena — non si legge
     più. Meno candele, più larghe: la finestra è l'unica leva che allarga la
     barra senza toccare il quarto libero a destra.

     Quante meno è un compromesso fra i due estremi della sequenza: a schermo
     intero la candela dev'essere leggibile (sotto i 3 px di corpo il replay
     sparisce), ma alla fine lo stesso grafico si guarda dentro un portatile
     largo un palmo, e lì poche candele grasse non somigliano più a un grafico.
     46 è il punto in cui reggono entrambe le inquadrature. */
  const WINDOW_WIDE   = 84;
  const WINDOW_NARROW = 46;
  let   WINDOW = WINDOW_WIDE;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260813);

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const candles = [];
  (function build() {
    let price = START, drift = 0;
    const t0 = Date.UTC(2026, 7, 5, 6, 0);

    for (let i = 0; i < N; i++) {
      drift = drift * 0.94 + gauss() * 0.000018;
      const open  = price;
      const close = open + drift + gauss() * 0.000085;
      const span  = Math.abs(gauss()) * 0.00009 + 0.00002;
      const high  = Math.max(open, close) + span * (0.35 + rnd() * 0.9);
      const low   = Math.min(open, close) - span * (0.35 + rnd() * 0.9);

      const bull = close >= open;
      const key  = bull ? [open, low, high, close] : [open, high, low, close];
      const path = [];
      for (let s = 0; s < STEPS; s++) {
        const u = s / (STEPS - 1);
        const seg = Math.min(Math.floor(u * 3), 2);
        const f = u * 3 - seg;
        const base = key[seg] + (key[seg + 1] - key[seg]) * f;
        const noise = (s === 0 || s === STEPS - 1) ? 0 : gauss() * span * 0.16 * (1 - u);
        path.push(Math.min(high, Math.max(low, base + noise)));
      }
      path[STEPS - 1] = close;

      candles.push({ open, high, low, close, path, t: t0 + i * 5 * 60000 });
      price = close;
    }
  })();

  /* Le scale verticali dipendono da quante candele sono in campo, e la finestra
     cambia fra telefono e schermo largo: si calcolano una volta per finestra e
     si tengono da parte. Restano comunque funzione pura dei dati. */
  const rangeCache = {};
  function rangesFor(win) {
    if (rangeCache[win]) return rangeCache[win];
    const out = [];
    for (let k = 0; k <= N - win; k++) {
      let lo = Infinity, hi = -Infinity;
      /* Esattamente le candele che verranno disegnate (vedi `first` e `last` in
         drawChart), non una in più: la scala deve inquadrare ciò che si vede.
         Comprendendo anche le due fuori campo, su un pannello alto e stretto si
         apriva sotto il grafico una fascia vuota che nessuna candela occupava. */
      for (let j = Math.max(0, k - 1); j <= Math.min(N - 1, k + win - 3); j++) {
        if (candles[j].low  < lo) lo = candles[j].low;
        if (candles[j].high > hi) hi = candles[j].high;
      }
      out.push({ lo, hi });
    }
    return (rangeCache[win] = out);
  }
  let ranges = rangesFor(WINDOW);

  /* --- le occorrenze della condizione ------------------------------------
     Non sono più bande piene: sono segni tracciati a mano, come se qualcuno
     avesse cerchiato con una penna i punti in cui la condizione si è
     verificata, e ci avesse puntato una freccia.

     ⚠️ L'irregolarità del tratto è PRECALCOLATA. Presa da un rnd() a ogni
     fotogramma sembrerebbe la stessa cosa e romperebbe l'unica regola su cui
     poggia la sequenza: allo stesso punto di scorrimento, lo stesso disegno. */
  const OCCURRENCES = [];
  for (let k = 26; k < N - WINDOW_WIDE; k += 31) {
    const len = 4 + Math.floor(rnd() * 4);
    let lo = Infinity, hi = -Infinity;
    for (let j = k; j < k + len && j < N; j++) {
      if (candles[j].low  < lo) lo = candles[j].low;
      if (candles[j].high > hi) hi = candles[j].high;
    }
    OCCURRENCES.push({
      from: k, len: len, lo: lo, hi: hi,
      // gli scostamenti del tratto: due giri di penna, mai identici fra loro
      wob: Array.from({ length: 24 }, () => (rnd() - 0.5) * 2),
      turn: (rnd() - 0.5) * 0.8,
    });
  }

  /* =========================================================================
     3. LE FASI
     ========================================================================= */

  const PHASE = {
    titleOut: [0.00, 0.08],
    chart:    [0.03, 0.82],
    caps: [
      [0.10, 0.28],
      [0.30, 0.46],
      [0.48, 0.64],
      [0.66, 0.80],
    ],
    zoom:  [0.82, 0.93],   // la camera arretra e compare il portatile
    light: [0.82, 0.91],   // il fondo passa al bianco della pagina
    logo:  [0.88, 0.99],   // il marchio emerge dietro
  };
  const HEADER_BACK = 0.97;   // da qui il menu del sito torna disponibile

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const norm  = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeOut   = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function visibility(p, span, fade) {
    const f = fade || 0.16;
    const t = norm(p, span[0], span[1]);
    if (t <= 0 || t >= 1) return 0;
    return Math.min(1, Math.min(t / f, (1 - t) / f));
  }

  /* =========================================================================
     4. IL GRAFICO
     ========================================================================= */

  /* Un quarto della larghezza resta libero a destra: la candela in formazione
     si ferma al 75% e ha spazio davanti a sé, come in un replay che deve
     ancora arrivare. */
  const FREE_RIGHT = 0.25;

  let W = 0, H = 0;
  let scaleStart = 1, scaleEnd = 1;
  let curAR = 16 / 10;

  const COL = {
    up:   '#4ade80',
    down: '#f87171',
    text: '#8b8d99',
    axis: 'rgba(255,255,255,.09)',
    bg:   '#0a0a0d',
    mark: '167,139,250',   // il colore della penna che cerchia le occorrenze
  };

  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  /* Larghezza del grafico di RIFERIMENTO: ogni misura del disegno è una sua
     frazione, e il rapporto con la larghezza vera dà il fattore di scala. Su
     uno schermo stretto il riferimento è più corto, e non per capriccio: su un
     pannello piccolo l'interfaccia è proporzionalmente più grande — altrimenti
     la scala dei prezzi finisce a quattro pixel e smette di essere un numero. */
  function refWidth() {
    return window.innerWidth < 700 ? 460 : 1100;
  }

  /* Schermo stretto: la stessa soglia della regola `@media (max-width: 820px)`
     del foglio di stile, che sposta il marchio e il nome. Qui il JS decide dove
     va il portatile: se le due soglie non coincidono, esiste una larghezza —
     esattamente 820 — in cui il marchio si colloca per il telefono e la
     macchina per il desktop, e i due si trovano a mezzo schermo di distanza. */
  function narrowScreen() {
    return window.innerWidth <= 820;
  }

  /* --- il tratto a mano ----------------------------------------------------
     Un cerchio fatto con la penna non è un'ellisse: il raggio respira, il giro
     non si chiude dove è partito, e la seconda passata non ricalca la prima.
     Sono queste tre cose — non il tremolio — a farlo sembrare disegnato. Gli
     scostamenti arrivano da `wob`, precalcolato una volta sola. */
  function penEllipse(ctx, cx, cy, rx, ry, wob, turn, pass) {
    const SEG  = 46;
    const CTRL = 11;                                        // scostamenti sul giro
    const off  = pass * 5;                                  // la seconda passata parte altrove
    const from = turn + pass * 0.24;
    const to   = from + Math.PI * 2 * (0.94 + pass * 0.11); // giro volutamente non chiuso
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const a = from + (to - from) * u;
      /* Lo scostamento va INTERPOLATO fra pochi punti di controllo. Preso a
         ogni vertice diventa un dente di sega: sembra un tremore, non un
         tratto — la mano ondeggia su archi lunghi, non a ogni millimetro. */
      const f  = u * CTRL;
      const i0 = (Math.floor(f) + off) % wob.length;
      const i1 = (i0 + 1) % wob.length;
      const r  = 1 + lerp(wob[i0], wob[i1], f - Math.floor(f)) * 0.08;
      ctx.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
    }
    ctx.stroke();
  }

  /* Freccia a mano: asta appena curva e due trattini alla punta, di lunghezza
     diversa fra loro — una punta simmetrica tradisce subito il calcolatore. */
  function penArrow(ctx, x0, y0, x1, y1, wob, k) {
    const dx = x1 - x0, dy = y1 - y0;
    const mx = (x0 + x1) / 2 - dy * 0.2 + wob[3] * 2 * k;
    const my = (y0 + y1) / 2 + dx * 0.2 + wob[5] * 2 * k;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx, my, x1, y1);
    ctx.stroke();

    const a = Math.atan2(y1 - my, x1 - mx);
    [[-0.52, 1.05], [0.48, 0.8]].forEach(function (h, i) {
      const b = a + h[0] + wob[i] * 0.1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(b) * 10 * k * h[1], y1 - Math.sin(b) * 10 * k * h[1]);
      ctx.stroke();
    });
  }

  function sizeCanvas(cv, ctx) {
    const box = cv.parentElement.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const over = clamp(scaleStart, 1, 2);
    const w = Math.round(box.width * dpr * over);
    const h = Math.round(box.height * dpr * over);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr * over, 0, 0, dpr * over, 0, 0);
    W = box.width; H = box.height;
    return true;
  }

  function resize() {
    return sizeCanvas(back, ctxB) && sizeCanvas(front, ctxF);
  }

  function niceStep(range, target) {
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }

  /* Disegna il grafico. `layer` vale 'back' (tutto) oppure 'front' (solo le
     ultime candele, quelle che devono passare davanti al testo). */
  function drawChart(p, ctx, layer) {
    if (!W) return;

    const k = Math.max(W, 1) / refWidth();    // fattore di proporzione

    /* Il corpo dei numeri lungo i due assi — e con lui la larghezza della scala
       dei prezzi, che è larga quanto il numero che ci deve stare più un margine:
       misurarla è più solido di un valore fisso, ma l'unica leva per stringerla
       resta il corpo del testo.

       Il tetto (AXIS_MAX) non è una rifinitura. Su un pannello stretto sette
       cifre a corpo pieno si prendevano un settimo della larghezza: a schermo
       intero passa, ma nell'ultimo tratto — dove il portatile è un oggetto
       piccolo in mezzo alla pagina — quel settimo si legge come una fascia
       grigia incollata al bordo, più grossa di tutto il resto dell'applicazione.
       Il numero si rimpicciolisce quel tanto che basta a rientrare. */
    const AXIS_MAX = 0.095;
    let fs = 9.2 * k;
    ctx.font = fs + 'px ' + MONO;
    /* larghezza dell'intera scala per corpo unitario: le cifre più i due
       margini, quello fra asse e numero e quello fino al bordo */
    const unit = ctx.measureText('0.00000').width / fs + 1.25;
    fs = Math.min(fs, W * AXIS_MAX / unit);
    ctx.font = fs + 'px ' + MONO;

    const PAD = {
      top: 12 * k,
      right: fs * unit,
      bottom: fs * 2.4,
      left: 12 * k,
    };

    const t = norm(p, PHASE.chart[0], PHASE.chart[1]);
    const cursor = t * (N - WINDOW - 1);
    const i = Math.floor(cursor);
    const f = cursor - i;

    const r0 = ranges[Math.min(i, ranges.length - 1)];
    const r1 = ranges[Math.min(i + 1, ranges.length - 1)];
    let lo = lerp(r0.lo, r1.lo, f);
    let hi = lerp(r0.hi, r1.hi, f);
    const padV = (hi - lo) * 0.12;
    lo -= padV; hi += padV;

    const axisX = W - PAD.right;
    const plotW = axisX - PAD.left;
    const plotH = H - PAD.top - PAD.bottom;
    const liveX = PAD.left + plotW * (1 - FREE_RIGHT);
    const step  = (liveX - PAD.left) / (WINDOW - 2);

    const y = v => PAD.top + (hi - v) / (hi - lo) * plotH;
    const x = j => PAD.left + (j - cursor) * step;

    const isBack = (layer === 'back');
    ctx.clearRect(0, 0, W, H);
    if (isBack) { ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H); }

    const bodyW = Math.max(1.5, step * 0.62);
    const last  = Math.min(N - 1, Math.floor(cursor) + WINDOW - 3);
    const first = isBack ? Math.max(0, Math.floor(cursor) - 1)
                         : Math.max(0, last - FRONT_BARS);

    /* --- scale, senza griglia -------------------------------------------
       Le linee della griglia attraversavano tutto il campo: su una scena a
       tutto schermo diventavano la prima cosa che si vedeva. Restano solo i
       numeri e i due separatori d'asse. */
    if (isBack) {
      const pStep = niceStep(hi - lo, 6);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = COL.text;
      for (let v = Math.ceil(lo / pStep) * pStep; v <= hi; v += pStep) {
        ctx.fillText(v.toFixed(5), axisX + fs * 0.55, Math.round(y(v)));
      }

      /* Un'ora ogni tot candele: con una finestra corta il passo va accorciato,
         o sotto il grafico resta una riga quasi vuota. */
      const tick = WINDOW >= 70 ? 18 : 9;
      ctx.textAlign = 'center';
      for (let j = Math.ceil(cursor); j < cursor + WINDOW; j++) {
        if (j % tick !== 0 || j >= N) continue;
        const xx = x(j);
        if (xx < 40 * k || xx > liveX) continue;
        const d = new Date(candles[j].t);
        ctx.fillText(
          String(d.getUTCHours()).padStart(2, '0') + ':' +
          String(d.getUTCMinutes()).padStart(2, '0'),
          xx, H - PAD.bottom / 2);
      }

      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(axisX) + 0.5, 0);
      ctx.lineTo(Math.round(axisX) + 0.5, H - PAD.bottom);
      ctx.moveTo(0, Math.round(H - PAD.bottom) + 0.5);
      ctx.lineTo(W, Math.round(H - PAD.bottom) + 0.5);
      ctx.stroke();

      /* Le occorrenze della condizione. Erano bande verticali piene, alte
         quanto il grafico: leggevano come una selezione del calcolatore, non
         come qualcuno che indica un punto. Ora sono cerchiate a penna, con una
         freccia che ci punta — la stessa gesto ripetuto lungo la storia, che è
         esattamente ciò che dice la didascalia: «quante volte è successa».

         Il segno svanisce prima del bordo destro invece di essere tagliato: il
         quarto libero davanti alla candela viva deve restare libero. */
      const occA = visibility(p, PHASE.caps[0], 0.22);
      if (occA > 0.01) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const o of OCCURRENCES) {
          const x0 = x(o.from), x1 = x(o.from + o.len);
          const cx = (x0 + x1) / 2;
          const rx = Math.max((x1 - x0) / 2 + 8 * k, 14 * k);
          const cy = (y(o.hi) + y(o.lo)) / 2;
          const ry = Math.max((y(o.lo) - y(o.hi)) / 2 + 10 * k, 13 * k);

          const fade = 56 * k;
          const a = occA * clamp(Math.min(cx + rx, liveX - cx - rx) / fade, 0, 1);
          if (a <= 0.02) continue;

          ctx.strokeStyle = 'rgba(' + COL.mark + ',' + (0.72 * a) + ')';
          ctx.lineWidth = Math.max(1, 1.7 * k);
          penEllipse(ctx, cx, cy, rx, ry, o.wob, o.turn, 0);
          ctx.strokeStyle = 'rgba(' + COL.mark + ',' + (0.32 * a) + ')';
          ctx.lineWidth = Math.max(1, 1.1 * k);
          penEllipse(ctx, cx, cy, rx, ry, o.wob, o.turn, 1);

          /* La freccia arriva dal basso, dove il grafico è più libero; se lì
             non c'è spazio scende dall'alto, e se non c'è da nessuna delle due
             parti resta il solo cerchio — meglio di una freccia mozzata. */
          const shaft = 46 * k;
          const down  = cy + ry + shaft + 12 * k < H - PAD.bottom;
          const up    = cy - ry - shaft - 12 * k > PAD.top;
          if (!down && !up) continue;
          const dir  = down ? 1 : -1;
          const tipY = cy + dir * (ry + 6 * k);

          ctx.strokeStyle = 'rgba(' + COL.mark + ',' + (0.6 * a) + ')';
          ctx.lineWidth = Math.max(1, 1.5 * k);
          penArrow(ctx,
                   cx - 24 * k + o.wob[7] * 7 * k, tipY + dir * shaft,
                   cx + o.wob[9] * 4 * k,          tipY,
                   o.wob, k);
        }
        ctx.restore();
      }
    }

    /* --- candele --------------------------------------------------------- */
    for (let j = first; j <= last; j++) {
      const c = candles[j];
      const xx = x(j);
      if (xx < -bodyW || xx > liveX + bodyW) continue;

      let o = c.open, cl = c.close, hg = c.high, lw = c.low;

      if (j === last) {
        const u = f * (STEPS - 1);
        const s = Math.floor(u);
        cl = lerp(c.path[Math.min(s, STEPS - 1)], c.path[Math.min(s + 1, STEPS - 1)], u - s);
        hg = -Infinity; lw = Infinity;
        for (let q = 0; q <= Math.min(s, STEPS - 1); q++) {
          if (c.path[q] > hg) hg = c.path[q];
          if (c.path[q] < lw) lw = c.path[q];
        }
        hg = Math.max(hg, cl); lw = Math.min(lw, cl);
      }

      const up = cl >= o;
      ctx.fillStyle = ctx.strokeStyle = up ? COL.up : COL.down;

      ctx.beginPath();
      ctx.lineWidth = Math.max(1, bodyW * 0.14);
      ctx.moveTo(Math.round(xx) + 0.5, y(hg));
      ctx.lineTo(Math.round(xx) + 0.5, y(lw));
      ctx.stroke();

      const yo = y(o), yc = y(cl);
      ctx.fillRect(xx - bodyW / 2, Math.min(yo, yc), bodyW, Math.max(1, Math.abs(yc - yo)));

      /* Prezzo corrente: linea tratteggiata nello spazio lasciato libero, più
         l'etichetta sulla scala di destra. */
      if (j === last && isBack) {
        const yy = Math.round(y(cl)) + 0.5;
        ctx.save();
        ctx.setLineDash([4 * k, 4 * k]);
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(xx, yy); ctx.lineTo(axisX, yy);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = up ? COL.up : COL.down;
        ctx.fillRect(axisX + 1, yy - fs * 0.8, PAD.right - 1, fs * 1.6);
        ctx.fillStyle = '#07070a';
        ctx.textAlign = 'left';
        ctx.font = fs + 'px ' + MONO;
        ctx.fillText(cl.toFixed(5), axisX + fs * 0.55, yy);
      }
    }

    if (isBack) drawWatermark(ctx, k, H - PAD.bottom);
  }

  /* Il marchio nell'angolo del grafico.
     Era una gaussiana ritracciata in canvas: somigliava al marchio senza
     esserlo — due curve diverse nella stessa schermata. Ora è LO STESSO file
     del logo, preso dal nodo che sta già in pagina (`.cine-logo img`): una
     sorgente sola, nessuna seconda richiesta, e nell'anteprima in file unico —
     dove quel `src` diventa un data URI — continua a funzionare da sé.

     Il PNG è già ritagliato sulla curva (tools/make-watermark.py), quindi si
     disegna intero: niente ritaglio da tenere allineato al foglio di stile. */
  const brandImg = document.querySelector('.cine-logo img');

  function drawWatermark(ctx, k, bottom) {
    if (!brandImg || !brandImg.complete || !brandImg.naturalWidth) return;
    const w = 74 * k;
    const h = w * (brandImg.naturalHeight / brandImg.naturalWidth);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(brandImg, 16 * k, bottom - h - 12 * k, w, h);
    ctx.restore();
  }

  /* =========================================================================
     5. I PANNELLI
     ========================================================================= */

  const panels = {
    opt: document.getElementById('panel-opt'),
    pf:  document.getElementById('panel-pf'),
    mql: document.getElementById('panel-mql'),
  };

  const OPT_CELLS = 66;
  const optValues = Array.from({ length: OPT_CELLS }, () => rnd());
  (function buildOptGrid() {
    const grid = document.getElementById('opt-grid');
    if (grid) grid.innerHTML = optValues.map(() => '<i></i>').join('');
  })();

  const MQL_LINES = [
    '//+---------------------------------------+',
    '//|  SQ_EMA_CROSS — da SpaceQuant         |',
    '//+---------------------------------------+',
    '#property strict',
    '',
    'input double InpRiskPct = 1.0;',
    'input int    InpFastEma = 12;',
    'input int    InpSlowEma = 26;',
    '',
    'void OnTick() {',
    '   if(!IsNewBar()) return;',
    '   AsqVerifyPanel();',
    '   if(CrossUp()) OpenLong();',
    '}',
  ];

  const PF_PATHS = (function () {
    const out = [];
    for (let s = 0; s < 3; s++) {
      const r = mulberry32(4100 + s * 77);
      let v = 0; const pts = [];
      for (let q = 0; q <= 48; q++) { v += (r() - 0.42) * 6 + 1.1; pts.push(v); }
      const min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
      out.push(pts.map(function (yv, q) {
        return (q ? 'L' : 'M') + ((q / 48) * 240).toFixed(1) + ' ' +
               (92 - ((yv - min) / (max - min || 1)) * 84).toFixed(1);
      }).join(' '));
    }
    return out;
  })();

  (function initPf() {
    document.querySelectorAll('.pf-line').forEach(function (el, q) {
      el.setAttribute('d', PF_PATHS[q]);
      const len = el.getTotalLength ? el.getTotalLength() : 400;
      el.style.strokeDasharray = len;
      el.dataset.len = len;
    });
  })();

  function setPanel(el, alpha) {
    if (!el) return;
    el.hidden = alpha <= 0.01;
    el.style.opacity = alpha;
  }

  function updatePanels(p) {
    const a2 = visibility(p, PHASE.caps[1], 0.18);
    setPanel(panels.opt, a2);
    if (a2 > 0 && panels.opt) {
      const t = norm(p, PHASE.caps[1][0], PHASE.caps[1][1]);
      const shown = Math.floor(t * OPT_CELLS);
      const cells = panels.opt.querySelectorAll('.opt-grid i');
      for (let q = 0; q < cells.length; q++) {
        const on = q < shown;
        cells[q].style.opacity = on ? 1 : 0.09;
        if (on && !cells[q].dataset.on) {
          const v = optValues[q];
          cells[q].style.background = v > 0.82 ? '#4ade80'
                                    : v > 0.55 ? 'rgba(74,222,128,.45)'
                                    : v > 0.30 ? 'rgba(77,141,255,.4)'
                                               : 'rgba(248,113,113,.3)';
          cells[q].dataset.on = '1';
        }
      }
      const n = document.getElementById('opt-count');
      if (n) n.textContent = Math.round(t * 1240).toLocaleString('it-IT');
    }

    const a3 = visibility(p, PHASE.caps[2], 0.18);
    setPanel(panels.pf, a3);
    if (a3 > 0) {
      const t = norm(p, PHASE.caps[2][0], PHASE.caps[2][1]);
      document.querySelectorAll('.pf-line').forEach(function (el, q) {
        const len = parseFloat(el.dataset.len);
        el.style.strokeDashoffset = len * (1 - easeOut(clamp((t - q * 0.08) / 0.55, 0, 1)));
      });
    }

    const a4 = visibility(p, PHASE.caps[3], 0.18);
    setPanel(panels.mql, a4);
    if (a4 > 0) {
      const t = norm(p, PHASE.caps[3][0], PHASE.caps[3][1]);
      const el = document.getElementById('mql-code');
      if (el) el.textContent = MQL_LINES.slice(0, Math.round(clamp(t / 0.7, 0, 1) * MQL_LINES.length)).join('\n');
    }
  }

  /* =========================================================================
     6. IL FOTOGRAMMA
     ========================================================================= */

  function frame(p) {
    const tOut = norm(p, PHASE.titleOut[0], PHASE.titleOut[1]);
    title.style.opacity = 1 - tOut;
    title.style.transform = 'translateY(' + (-tOut * 40) + 'px)';
    title.style.pointerEvents = tOut > 0.5 ? 'none' : 'auto';
    stage.style.setProperty('--veil', String(1 - tOut));

    /* La camera arretra; con lei compaiono la scocca e il fondo bianco. */
    const z = easeInOut(norm(p, PHASE.zoom[0], PHASE.zoom[1]));
    /* Scendendo di poco, il portatile lascia sopra di sé lo spazio in cui il
       nome del marchio resta leggibile invece di essere tagliato a metà.
       Su telefono non scende affatto: lì la macchina è già piccola e il nome
       trova posto sopra senza spostarla, mentre spostandola il centro
       dell'inquadratura finiva sotto e la scena pendeva. */
    const drop = z * window.innerHeight * (narrowScreen() ? 0 : 0.11);
    zoom.style.transform = 'translateY(' + drop + 'px) scale(' + lerp(scaleStart, scaleEnd, z) + ')';
    stage.style.setProperty('--frame', String(z));
    stage.style.setProperty('--light', String(easeInOut(norm(p, PHASE.light[0], PHASE.light[1]))));
    stage.style.setProperty('--logo',  String(easeOut(norm(p, PHASE.logo[0], PHASE.logo[1]))));

    /* Le proporzioni dello schermo seguono il dispositivo finché la scena è a
       tutto campo, e diventano quelle di un portatile quando la si vede da
       fuori. Si aggiornano solo a scatti percettibili: ridimensionare i canvas
       a ogni fotogramma costerebbe troppo. */
    const targetAR = lerp(deviceAR(), 16 / 10, z);
    if (Math.abs(targetAR - curAR) > 0.02) {
      curAR = targetAR;
      stage.style.setProperty('--ar', String(curAR));
      resize();
    }

    drawChart(p, ctxB, 'back');
    drawChart(p, ctxF, 'front');
    updatePanels(p);

    caps.forEach(function (el, q) {
      const a = visibility(p, PHASE.caps[q], 0.2);
      el.style.opacity = a;
      el.style.transform = 'translateY(' + ((1 - a) * 16) + 'px) scale(' + lerp(1.04, 1, a) + ')';
      el.hidden = a <= 0.01;
    });

    if (railFill) railFill.style.transform = 'scaleX(' + p + ')';

    /* Il menu del sito resta fuori campo finché la sequenza non è conclusa —
       ma solo se la sequenza è davvero in pagina. Senza questo controllo, in
       un contesto dove la landing è presente ma nascosta (l'anteprima in file
       unico) il menu sparirebbe anche sulle altre pagine. */
    const onStage = track.offsetParent !== null && track.offsetHeight > 0;
    document.body.classList.toggle('header-hidden', onStage && p < HEADER_BACK);
  }

  /* =========================================================================
     7. MISURE E SCORRIMENTO
     ========================================================================= */

  /* Proporzioni utili del dispositivo, tenute in un intervallo ragionevole: su
     un telefono in verticale il pannello diventa alto, su un monitor molto
     largo resta panoramico, senza mai degenerare. */
  function deviceAR() {
    /* Il limite inferiore è quello di un telefono in verticale: fermandosi
       prima, il pannello resta più stretto dello schermo e sopra e sotto
       compaiono due bande nere che non sono di nessuno. */
    return clamp(window.innerWidth / window.innerHeight, 0.42, 2.1);
  }

  function computeScale() {
    const w = zoom.offsetWidth || 1;
    const h = zoom.offsetHeight || 1;
    scaleStart = clamp(Math.min(window.innerWidth / w, window.innerHeight / h), 0.3, 3);

    /* Dimensione finale: un portatile appoggiato al centro della pagina, e
       piccolo — perché in quell'ultimo tratto il protagonista non è più lui ma
       il marchio che gli emerge dietro. Su uno schermo stretto la frazione è
       più generosa, altrimenti la macchina diventa un francobollo: lì lo spazio
       manca in larghezza, non in importanza. */
    const narrow = narrowScreen();
    const room = Math.min(window.innerWidth * (narrow ? 0.46 : 0.32),
                          window.innerHeight * 0.40 * (16 / 10));
    scaleEnd = clamp(room / w, 0.2, scaleStart);
  }

  let ticking = false, last = -1;

  function progress() {
    const r = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-r.top / total, 0, 1);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      const p = progress();
      if (Math.abs(p - last) < 0.00012) return;
      last = p;
      frame(p);
    });
  }

  /* Quante candele in campo: dipende dallo SCHERMO, non dalla larghezza del
     pannello. Il pannello si restringe durante lo zoom indietro, e legare la
     finestra a lui vorrebbe dire cambiare il numero di candele a metà sequenza
     — cioè cambiare il grafico mentre lo si guarda. */
  function fitWindow() {
    const win = window.innerWidth < 700 ? WINDOW_NARROW : WINDOW_WIDE;
    if (win === WINDOW) return;
    WINDOW = win;
    ranges = rangesFor(win);
  }

  function onResize() {
    fitWindow();
    curAR = deviceAR();
    stage.style.setProperty('--ar', String(curAR));
    computeScale();
    resize();
    last = -1;
    onScroll();

    /* Una seconda misura al fotogramma successivo. Quando la scena passa da
       nascosta a visibile — cambio di orientamento, oppure l'anteprima in file
       unico che torna alla landing — la prima misura cade su un impaginamento
       non ancora assestato: il canvas viene ridimensionato (e quindi svuotato)
       dopo il disegno, e resta nero. */
    requestAnimationFrame(function () {
      computeScale();
      if (resize()) { last = -1; onScroll(); }
    });
  }

  /* =========================================================================
     8. QUANDO LA SEQUENZA NON DEVE PARTIRE
     ========================================================================= */

  function staticFallback() {
    fitWindow();
    stage.classList.add('cine-static');
    document.body.classList.remove('header-hidden');
    caps.forEach(function (el) {
      el.hidden = false; el.style.opacity = 1; el.style.transform = 'none';
    });
    title.style.opacity = 1;
    stage.style.setProperty('--veil', '0');
    stage.style.setProperty('--frame', '1');
    stage.style.setProperty('--light', '1');
    stage.style.setProperty('--logo', '0');
    stage.style.setProperty('--ar', String(16 / 10));
    zoom.style.transform = 'none';
    scaleStart = 1;
    resize();
    drawChart(0.55, ctxB, 'back');
    if (W) ctxF.clearRect(0, 0, W, H);
    Object.keys(panels).forEach(function (q) { if (panels[q]) panels[q].hidden = true; });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function start() {
    if (reduced.matches) { staticFallback(); return; }
    stage.classList.remove('cine-static');
    onResize();
  }

  window.addEventListener('scroll', function () {
    if (!reduced.matches) onScroll();
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (reduced.matches) { staticFallback(); return; }
    onResize();
  });

  reduced.addEventListener('change', start);

  /* Il marchio nell'angolo del grafico arriva da un'immagine: finché non è
     caricata il fotogramma è corretto ma incompleto. Al suo arrivo si ridisegna
     una volta — altrimenti al primo caricamento quell'angolo resta vuoto e lo
     resta finché non si scorre. */
  if (brandImg && !brandImg.complete) {
    brandImg.addEventListener('load', function () {
      if (reduced.matches) { staticFallback(); return; }
      last = -1;
      onScroll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
