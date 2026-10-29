/* =============================================================================
   SpaceQuant — la pagina per i broker
   -----------------------------------------------------------------------------
   Due tipi di movimento, e la differenza conta.

   1. LEGATO ALLO SCORRIMENTO — la rete che si allontana, le due corsie, il
      percorso in orizzontale, l'anello della quota, i numeri che contano, le
      rivelazioni. Sono FUNZIONE PURA della posizione, come in tutto il resto
      del sito (vedi flow.js e la trappola 18 in STATO.md): nessun «già
      mostrato», nessuno stato che si accumula. Risalendo, tutto torna indietro.

   2. LEGATO AL TEMPO — la rete d'apertura che respira, i flussi del triangolo,
      il terminale che scrive operazioni. Sono ambienti, non rivelazioni:
      funzioni del tempo, senza stato, che girano SOLO mentre sono in vista.
      Fuori campo non costano niente.

   Con animazioni ridotte: niente blocchi di scorrimento, niente orizzontale,
   ogni scena disegnata nel suo stato finale — che è quello che porta
   l'informazione. Mai il nulla.

   ⚠️ Le parole che finiscono DENTRO un canvas stanno in nodi nascosti nel
   markup, con il loro `data-i18n`: così si traducono come tutte le altre, e
   check-i18n.js le vede. Stesso principio di scene.js.
   ============================================================================= */

(function () {

  if (!document.querySelector('.bk')) return;

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const norm  = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const easeOut   = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* Il carattere del sito, anche dentro i canvas. Niente monospaziato nelle
     grafiche: è il tratto che fa sembrare «generata» una pagina. */
  const SANS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lingua = () => (document.documentElement.lang === 'en' ? 'en' : 'it');

  /* Generatore pseudo-casuale con seme fisso. Serve a disporre le operazioni
     delle corsie e le righe del terminale in modo irregolare ma IDENTICO a
     ogni fotogramma: un Math.random() per fotogramma farebbe tremare la scena
     e romperebbe la reversibilità. */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parole(sel) {
    return Array.from(document.querySelectorAll(sel + ' i')).map(n => n.textContent.trim());
  }

  /* Il canvas misurato sul suo contenitore e sulla densità dello schermo. */
  function prepara(cv) {
    const box = cv.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(box.width), h = Math.round(box.height);
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr; cv.height = h * dpr;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  /* Quanto di un elemento alto è già stato attraversato: 0 quando il suo
     bordo alto tocca la cima della finestra, 1 quando il suo fondo tocca il
     fondo. È la corsa delle sezioni bloccate. */
  function corsa(el) {
    const r = el.getBoundingClientRect();
    const resto = r.height - window.innerHeight;
    return resto > 0 ? clamp(-r.top / resto, 0, 1) : (r.top < 0 ? 1 : 0);
  }

  /* La corsa di una rivelazione: dall'ingresso dal basso alla zona di lettura.
     Le stesse proporzioni di flow.js e scene.js: il ritmo del sito è uno. */
  function ingresso(el) {
    const r = el.getBoundingClientRect();
    const h = window.innerHeight;
    const from = h * 0.92;
    const to   = h * (h < 700 ? 0.46 : 0.34);
    return clamp((from - r.top) / (from - to), 0, 1);
  }


  /* ===========================================================================
     1. L'APERTURA — la sala
     Una scena in prospettiva, non un diagramma. Al centro la piattaforma del
     broker con il suo pannello degli ordini in arrivo. Intorno, su un pavimento
     a punti, i terminali MetaTrader dei clienti, ognuno con un grafico che si
     muove davvero. Quelli con un Expert Advisor mandano ordini al centro con
     regolarità, lungo archi di luce; quelli che operano a mano sono più spenti
     e ne mandano uno ogni tanto.

     Tutto è funzione del tempo e di un seme fisso: il terminale numero 4 ha
     sempre lo stesso grafico, e l'ordine numero n parte sempre da lì. L'unica
     cosa che si accumula è la camera che segue piano il puntatore.

     ⚠️ Le parole dentro la scena sono nel carattere del sito, non in un
     monospaziato: Alessandro l'ha chiesto esplicitamente (27 ottobre 2026).
     =========================================================================== */

  const hero = document.getElementById('bk-hero');
  const net  = document.getElementById('bk-net');

  /* Durata del volo di un ordine, in secondi. */
  const VOLO = 1.5;

  const TERMINALI = (function () {
    const r = rng(7);
    const SIMB = ['EURUSD', 'XAUUSD', 'GBPUSD', 'US500', 'USDJPY', 'GER40', 'AUDUSD',
                  'NAS100', 'EURJPY', 'USDCHF', 'GBPJPY', 'USDCAD', 'EURGBP', 'NZDUSD'];
    const TF = ['M5', 'M15', 'M30', 'H1', 'H4'];
    /* [raggio, angolo in gradi, ha un EA]. Angolo 0 = a destra, 90 = in fondo.
       Tutta la metà sinistra resta vuota di proposito: lì sopra c'è il testo
       dell'apertura, e un grafico dietro a una frase la rende illeggibile. */
    const POSTI = [
      [2.0, -40, true], [2.0, 12, false], [2.0, 58, true], [2.05, 100, true], [2.1, 142, false],
      [3.5, -60, false], [3.4, -24, true], [3.5, 14, true], [3.45, 48, false], [3.6, 80, true],
      [3.5, 112, true], [3.6, 142, true],
    ];
    return POSTI.map(function (p, i) {
      const a = p[1] * Math.PI / 180;
      return {
        i,
        x: Math.cos(a) * p[0], z: Math.sin(a) * p[0],
        esterno: p[0] > 3,
        auto: p[2],
        simbolo: SIMB[i % SIMB.length],
        tf: TF[Math.floor(r() * TF.length)],
        periodo: p[2] ? 2.8 + r() * 1.8 : 10 + r() * 9,
        fase: r() * 14,
        onde: [0, 1, 2, 3].map(() => ({ a: 0.35 + r(), p: 3 + r() * 15, f: r() * 6.283 })),
        deriva: (r() - 0.5) * 0.09,
      };
    });
  })();

  /* Rumore deterministico in [0,1): stessa coppia, stesso numero. */
  function rumore(a, b) {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function prezzo(tm, u) {
    let v = tm.deriva * u;
    for (const o of tm.onde) v += o.a * Math.sin(u * 6.283 / o.p + o.f);
    return v;
  }

  /* L'ultimo ordine ARRIVATO da un terminale, e quello ancora in volo. */
  function ultimoArrivo(tm, t) {
    const n = Math.floor((t - VOLO + tm.fase) / tm.periodo);
    return { n, quando: n * tm.periodo - tm.fase + VOLO };
  }
  function inVolo(tm, t) {
    const n = Math.floor((t + tm.fase) / tm.periodo);
    const dt = t - (n * tm.periodo - tm.fase);
    return dt < VOLO ? { n, q: dt / VOLO, dt } : null;
  }

  /* La camera segue il puntatore, piano. È l'unico stato della scena. */
  let puntatore = 0, puntatoreMeta = 0;
  if (hero) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      puntatoreMeta = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
    });
    hero.addEventListener('pointerleave', function () { puntatoreMeta = 0; });
  }

  function proietta(cam, x, y, z) {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const X = x * cy - z * sy;
    const Z = x * sy + z * cy + cam.D;
    const Y = y - cam.H;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const Y2 = Y * cp + Z * sp;
    const Z2 = -Y * sp + Z * cp;
    if (Z2 < 0.5) return null;
    const k = cam.f / Z2;
    return { x: cam.cx + X * k, y: cam.cy - Y2 * k, k, z: Z2 };
  }

  /* Un punto lungo l'arco che va dal terminale alla piattaforma. */
  function arco(tm, q) {
    const x0 = tm.x, y0 = 0.25, z0 = tm.z;
    const x2 = 0, y2 = 1.25, z2 = 0;
    const x1 = (x0 + x2) / 2, y1 = 2.3 + (tm.esterno ? 0.5 : 0), z1 = (z0 + z2) / 2;
    const a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c = q * q;
    return [a * x0 + b * x1 + c * x2, a * y0 + b * y1 + c * y2, a * z0 + b * z1 + c * z2];
  }

  function rett(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function testoSala(ctx, s, x, y, px, peso, colore, allinea) {
    if (px < 6.5) return;
    ctx.font = peso + ' ' + px.toFixed(1) + 'px ' + SANS;
    ctx.fillStyle = colore;
    ctx.textAlign = allinea || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  /* --- un terminale del cliente: finestra, intestazione, grafico ---------- */
  function terminale(ctx, cam, tm, t, W) {
    const LW = 1.15, LH = 0.74;
    const P = proietta(cam, tm.x, 0.16 + LH / 2, tm.z);
    if (!P) return;
    const w = LW * P.k, h = LH * P.k;
    const x = P.x - w / 2, y = P.y - h / 2;
    const nebbia = clamp(1.25 - (P.z - 6) / 9, 0.38, 1);
    const spento = tm.auto ? 1 : 0.62;

    /* l'ombra sul pavimento */
    const B = proietta(cam, tm.x, 0, tm.z);
    if (B) {
      const g = ctx.createRadialGradient(B.x, B.y, 0, B.x, B.y, w * 0.6);
      g.addColorStop(0, 'rgba(0,0,0,' + 0.55 * nebbia + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(B.x, B.y, w * 0.6, w * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha *= nebbia;

    /* Appena parte un ordine il bordo si accende: si vede DA DOVE parte. */
    const v = inVolo(tm, t);
    const lampo = (tm.auto && v) ? clamp(1 - v.dt / 0.7, 0, 1) : 0;
    if (lampo > 0) {
      ctx.shadowColor = 'rgba(150,110,255,' + lampo + ')';
      ctx.shadowBlur = 22 * lampo;
    }
    const r = Math.max(3, h * 0.07);
    rett(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(13,13,22,.94)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = lampo > 0
      ? 'rgba(174,134,255,' + (0.35 + 0.6 * lampo) + ')'
      : 'rgba(255,255,255,' + (tm.auto ? 0.14 : 0.08) + ')';
    ctx.stroke();

    /* intestazione: simbolo, timeframe, e chi sta operando */
    const th = h * 0.19;
    ctx.save();
    rett(ctx, x, y, w, h, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    ctx.fillRect(x, y, w, th);
    ctx.restore();
    const fs = th * 0.5;
    testoSala(ctx, tm.simbolo, x + w * 0.06, y + th / 2, fs, 600, 'rgba(255,255,255,' + 0.9 * spento + ')');
    if (fs >= 6.5) {
      ctx.font = '600 ' + fs.toFixed(1) + 'px ' + SANS;
      const ls = ctx.measureText(tm.simbolo).width;
      testoSala(ctx, tm.tf, x + w * 0.06 + ls + fs * 0.6, y + th / 2, fs * 0.92, 500, 'rgba(255,255,255,' + 0.42 * spento + ')');
    }
    if (tm.auto) {
      const pw = fs * 3.1, ph = fs * 1.5;
      const px = x + w - w * 0.05 - pw, py = y + th / 2 - ph / 2;
      if (fs >= 5) {
        const g = ctx.createLinearGradient(px, 0, px + pw, 0);
        g.addColorStop(0, '#3b6ef5'); g.addColorStop(0.55, '#7b3fe4'); g.addColorStop(1, '#e0489f');
        rett(ctx, px, py, pw, ph, ph / 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.arc(px + ph * 0.55, py + ph / 2, ph * 0.17, 0, Math.PI * 2); ctx.fill();
        testoSala(ctx, 'EA', px + pw * 0.6, py + ph / 2 + 0.5, fs * 0.82, 700, '#fff', 'center');
      }
    } else {
      testoSala(ctx, W[2] || '', x + w * 0.94, y + th / 2, fs * 0.88, 500, 'rgba(255,255,255,.38)', 'right');
    }

    /* il grafico: candele vere di una serie che non si ripete, che avanza */
    const N = 22;
    const u = t * (tm.auto ? 0.55 : 0.4) + tm.i * 37;
    const ultimo = Math.floor(u);
    let lo = Infinity, hi = -Infinity;
    const cand = [];
    for (let k = ultimo - N + 1; k <= ultimo; k++) {
      const o = prezzo(tm, k), c = (k === ultimo) ? prezzo(tm, u) : prezzo(tm, k + 1);
      const s = 0.06 + 0.22 * rumore(k, tm.i);
      const a = Math.max(o, c) + s, b = Math.min(o, c) - s * 0.8;
      cand.push([o, c, a, b]);
      if (a > hi) hi = a;
      if (b < lo) lo = b;
    }
    const gx = x + w * 0.05, gw = w * 0.9;
    const gy = y + th + h * 0.08, gh = h - th - h * 0.16;
    const Y = vv => gy + (1 - (vv - lo) / (hi - lo || 1)) * gh;
    const cw = gw / N;
    ctx.globalAlpha *= tm.auto ? 1 : 0.72;
    for (let j = 0; j < cand.length; j++) {
      const [o, c, a, b] = cand[j];
      const su = c >= o;
      const cx = gx + cw * (j + 0.5);
      ctx.strokeStyle = ctx.fillStyle = su ? '#4ade80' : '#f87171';
      ctx.lineWidth = Math.max(0.6, cw * 0.12);
      ctx.beginPath(); ctx.moveTo(cx, Y(a)); ctx.lineTo(cx, Y(b)); ctx.stroke();
      const top = Y(Math.max(o, c)), bh = Math.max(1, Math.abs(Y(o) - Y(c)));
      ctx.fillRect(cx - cw * 0.3, top, cw * 0.6, bh);
    }
    /* la linea del prezzo corrente */
    const yc = Y(cand[cand.length - 1][1]);
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(gx, yc); ctx.lineTo(gx + gw, yc); ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /* --- il pannello del broker: gli ordini che arrivano --------------------- */
  function pannello(ctx, cam, t, W) {
    const LW = 2.25, LH = 1.42;
    const P = proietta(cam, 0, 1.3 + LH / 2, 0);
    if (!P) return;
    const w = LW * P.k, h = LH * P.k;
    const x = P.x - w / 2, y = P.y - h / 2;
    const r = h * 0.06;

    ctx.save();
    ctx.shadowColor = 'rgba(123,63,228,.55)';
    ctx.shadowBlur = h * 0.35;
    rett(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(18,15,36,.93)';
    ctx.fill();
    ctx.restore();
    const bordo = ctx.createLinearGradient(x, y, x + w, y + h);
    bordo.addColorStop(0, 'rgba(122,160,255,.75)');
    bordo.addColorStop(0.5, 'rgba(174,134,255,.55)');
    bordo.addColorStop(1, 'rgba(255,124,198,.7)');
    rett(ctx, x, y, w, h, r);
    ctx.strokeStyle = bordo; ctx.lineWidth = 1.2; ctx.stroke();

    const pad = w * 0.06;
    const fs = h * 0.085;
    /* il marchio: la stessa sfumatura del sito, come un punto di stato */
    const dot = ctx.createLinearGradient(x + pad, 0, x + pad + fs, 0);
    dot.addColorStop(0, '#3b6ef5'); dot.addColorStop(1, '#e0489f');
    ctx.fillStyle = dot;
    ctx.beginPath(); ctx.arc(x + pad + fs * 0.45, y + h * 0.13, fs * 0.45, 0, Math.PI * 2); ctx.fill();
    testoSala(ctx, W[0] || '', x + pad + fs * 1.3, y + h * 0.13, fs, 650, '#fff');
    testoSala(ctx, W[1] || '', x + pad, y + h * 0.26, fs * 0.78, 500, 'rgba(255,255,255,.5)');

    /* Le righe: l'ultimo ordine arrivato da ciascun terminale, i più recenti
       in alto. Una riga nuova entra accesa e si spegne in un secondo. */
    const righe = [];
    TERMINALI.forEach(function (tm) {
      const a = ultimoArrivo(tm, t);
      righe.push({ tm, quando: a.quando, n: a.n });
      const b = { n: a.n - 1, quando: a.quando - tm.periodo };
      righe.push({ tm, quando: b.quando, n: b.n });
    });
    righe.sort((p, q) => q.quando - p.quando);
    const R = 5;
    const rh = h * 0.118, ry0 = y + h * 0.36;
    for (let j = 0; j < R; j++) {
      const rg = righe[j];
      const yy = ry0 + j * rh;
      const eta = t - rg.quando;
      const nuova = clamp(1 - eta / 1.1, 0, 1);
      if (nuova > 0) {
        rett(ctx, x + pad * 0.5, yy - rh * 0.45, w - pad, rh * 0.9, rh * 0.25);
        ctx.fillStyle = 'rgba(123,63,228,' + 0.35 * nuova + ')';
        ctx.fill();
      }
      const buy = rumore(rg.n, rg.tm.i * 3.1) > 0.45;
      const lotti = ((Math.floor(rumore(rg.n, rg.tm.i) * 5) + 1) / 10).toFixed(2);
      const al = 0.92 - j * 0.12;
      testoSala(ctx, rg.tm.simbolo, x + pad, yy, fs * 0.82, 600, 'rgba(255,255,255,' + al + ')');
      testoSala(ctx, buy ? 'BUY' : 'SELL', x + w * 0.47, yy, fs * 0.76, 700,
                buy ? 'rgba(122,160,255,' + al + ')' : 'rgba(255,124,198,' + al + ')');
      testoSala(ctx, lotti, x + w * 0.70, yy, fs * 0.78, 500, 'rgba(255,255,255,' + al * 0.7 + ')', 'right');
      testoSala(ctx, rg.tm.auto ? 'EA' : (W[2] || ''), x + w - pad, yy, fs * 0.72, 600,
                rg.tm.auto ? 'rgba(174,134,255,' + al + ')' : 'rgba(255,255,255,' + al * 0.45 + ')', 'right');
    }
  }

  function disegnaRete(t, sp) {
    if (!net) return;
    const c = prepara(net);
    if (!c) return;
    const { ctx, w, h } = c;
    /* ⚠️ Deve corrispondere a `@media (max-width: 759px)` in style.css, che su
       telefono sposta il testo in alto per lasciare qui il posto alla scena.
       La stessa soglia in due file si scolla (trappola 31 in STATO.md). */
    const stretto = w < 760;
    const W = parole('.bk-net-words');

    if (!reduced.matches) puntatore += (puntatoreMeta - puntatore) * 0.05;
    /* Su telefono la scena è più vicina e più grande: la sua fascia è stretta,
       e i terminali che escono dai bordi fanno sentire la sala più grande
       dello schermo invece di rimpicciolirla dentro. */
    const H = 2.9;
    const D = (stretto ? 8.6 : 8.2) - sp * 2.4;
    const cam = {
      yaw: 0.12 * Math.sin(t * 0.05) + puntatore * 0.14 - 0.06,
      H, D, pitch: Math.atan2(H, D) - 0.04,
      cx: stretto ? w * 0.5 : w * 0.74,
      cy: stretto ? h - Math.min(h * 0.22, 190) : h * 0.6,
      f: stretto ? w * 1.75 : Math.min(w * 0.58, h * 1.1),
    };

    ctx.globalAlpha = 1 - sp * 0.9;

    /* --- il pavimento: una griglia di punti, con un'onda che parte dal
       centro e si allarga — l'attività della piattaforma --- */
    const onda = (t * 0.9) % 9;
    ctx.fillStyle = '#fff';
    for (let gx = -7; gx <= 7.01; gx += 0.5) {
      for (let gz = -5; gz <= 9.01; gz += 0.5) {
        const d = Math.hypot(gx, gz);
        let a = Math.pow(clamp(1 - d / 7.6, 0, 1), 1.4) * 0.3;
        if (a <= 0.01) continue;
        a += Math.max(0, 1 - Math.abs(d - onda) / 0.6) * 0.25 * clamp(1 - d / 8, 0, 1);
        const P = proietta(cam, gx, 0, gz);
        if (!P) continue;
        const s = Math.max(0.7, P.k * 0.016);
        ctx.globalAlpha = a * (1 - sp * 0.9);
        ctx.fillRect(P.x - s / 2, P.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1 - sp * 0.9;

    /* --- la piattaforma del broker: anelli sul pavimento e una colonna di
       luce. Ogni ordine che arriva lascia un'onda. --- */
    const centro = proietta(cam, 0, 0, 0);
    if (centro) {
      const g = ctx.createRadialGradient(centro.x, centro.y, 0, centro.x, centro.y, centro.k * 2.2);
      g.addColorStop(0, 'rgba(123,63,228,.42)');
      g.addColorStop(0.45, 'rgba(59,110,245,.12)');
      g.addColorStop(1, 'rgba(59,110,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(centro.x, centro.y, centro.k * 2.2, centro.k * 0.75, 0, 0, Math.PI * 2); ctx.fill();
    }
    function anello(rr, colore, spessore) {
      ctx.beginPath();
      for (let s = 0; s <= 64; s++) {
        const a = s / 64 * Math.PI * 2;
        const P = proietta(cam, Math.cos(a) * rr, 0, Math.sin(a) * rr);
        if (!P) continue;
        if (s === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y);
      }
      ctx.strokeStyle = colore; ctx.lineWidth = spessore; ctx.stroke();
    }
    anello(0.55, 'rgba(174,134,255,.55)', 1.4);
    anello(0.9, 'rgba(174,134,255,.28)', 1);
    anello(1.3, 'rgba(255,255,255,.10)', 1);
    TERMINALI.forEach(function (tm) {
      const eta = t - ultimoArrivo(tm, t).quando;
      if (eta >= 0 && eta < 1.2) {
        anello(0.55 + eta * 1.1, 'rgba(174,134,255,' + (0.5 * (1 - eta / 1.2)) + ')', 1.2);
      }
    });
    const base = proietta(cam, 0, 0, 0), cima = proietta(cam, 0, 1.3, 0);
    if (base && cima) {
      const g = ctx.createLinearGradient(0, base.y, 0, cima.y);
      g.addColorStop(0, 'rgba(174,134,255,.0)');
      g.addColorStop(0.3, 'rgba(174,134,255,.35)');
      g.addColorStop(1, 'rgba(174,134,255,.7)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, base.k * 0.03);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(cima.x, cima.y); ctx.stroke();
    }

    const visibili = TERMINALI.filter(tm => !(stretto && tm.esterno && tm.i % 2));

    /* --- i percorsi degli ordini, tenui: si vede chi è collegato --- */
    visibili.forEach(function (tm) {
      if (!tm.auto) return;
      ctx.beginPath();
      for (let s = 0; s <= 28; s++) {
        const p = arco(tm, s / 28);
        const P = proietta(cam, p[0], p[1], p[2]);
        if (!P) continue;
        if (s === 0) ctx.moveTo(P.x, P.y); else ctx.lineTo(P.x, P.y);
      }
      ctx.strokeStyle = 'rgba(140,110,255,.13)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* --- terminali e pannello, dal più lontano al più vicino --- */
    const oggetti = visibili.map(tm => ({ tm, z: (proietta(cam, tm.x, 0.5, tm.z) || { z: 0 }).z }));
    const zp = (proietta(cam, 0, 2, 0) || { z: 0 }).z;
    oggetti.push({ pannello: true, z: zp });
    oggetti.sort((a, b) => b.z - a.z);
    oggetti.forEach(function (o) {
      if (o.pannello) pannello(ctx, cam, t, W);
      else terminale(ctx, cam, o.tm, t, W);
    });

    /* --- gli ordini in volo: una cometa con la sua scia, in luce additiva --- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    visibili.forEach(function (tm) {
      const v = inVolo(tm, t);
      if (!v) return;
      const q = easeInOut(v.q);
      const col = tm.auto ? '160,130,255' : '255,255,255';
      for (let s = 10; s >= 0; s--) {
        const qq = q - s * 0.018;
        if (qq < 0) continue;
        const p = arco(tm, qq);
        const P = proietta(cam, p[0], p[1], p[2]);
        if (!P) continue;
        const rr = Math.max(1, P.k * 0.05 * (1 - s / 12));
        ctx.fillStyle = 'rgba(' + col + ',' + (0.55 * (1 - s / 11)) + ')';
        ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.fill();
      }
      const p = arco(tm, q);
      const P = proietta(cam, p[0], p[1], p[2]);
      if (P) {
        const rr = Math.max(4, P.k * 0.22);
        const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rr);
        g.addColorStop(0, 'rgba(' + col + ',.9)');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  function scorriApertura() {
    if (!hero) return 0;
    const r = hero.getBoundingClientRect();
    const sp = clamp(-r.top / (r.height * 0.9), 0, 1);
    hero.style.setProperty('--sp', sp.toFixed(3));
    return sp;
  }


  /* ===========================================================================
     2. LE DUE CORSIE
     In alto il trading a mano: operazioni a grappoli, pause, poi il conto si
     ferma. In basso l'Expert Advisor: un tratto di formazione, poi operazioni
     regolari fino alla fine — e dal settimo mese una seconda strategia.
     Le tre tappe del testo si alternano mentre la figura avanza.
     ⚠️ È un'ILLUSTRAZIONE e lo dice in pagina: nessuna di queste operazioni
     è un dato, e nessuna ha un colore di guadagno o di perdita.
     =========================================================================== */

  const story = document.getElementById('bk-story');
  const lanes = document.getElementById('bk-lanes');
  const beats = Array.from(document.querySelectorAll('.bk-beat'));

  const MANO = (function () {
    const r = rng(11), out = [];
    const grappoli = [[0.035, 5], [0.10, 3], [0.215, 6], [0.30, 2], [0.43, 4], [0.52, 2], [0.585, 1]];
    for (const [c, n] of grappoli) {
      for (let i = 0; i < n; i++) out.push(c + (r() - 0.5) * 0.035);
    }
    return out.sort((a, b) => a - b);
  })();
  const FERMO = 0.62;
  const FORMAZIONE = 0.15;

  const EA = (function () {
    const r = rng(23), out = [];
    for (let x = FORMAZIONE + 0.02; x < 0.995; x += 0.018 + r() * 0.012) out.push({ x, riga: 0 });
    for (let x = 0.56; x < 0.995; x += 0.026 + r() * 0.016) out.push({ x, riga: 1 });
    return out;
  })();

  /* Una tappa alla volta: piena per buona parte del suo tratto, e a ZERO sul
     confine con la successiva. Con una dissolvenza incrociata le due frasi
     restavano a mezza opacità una sopra l'altra, illeggibili entrambe; così
     c'è un istante di vuoto, e il movimento verticale lo riempie. */
  function tappe(p) {
    const seg = p * beats.length;
    beats.forEach(function (b, i) {
      const d = Math.abs(seg - (i + 0.5));
      let on = clamp((0.5 - d) / 0.14, 0, 1);
      if (i === 0 && seg < 0.5) on = 1;
      if (i === beats.length - 1 && seg > beats.length - 0.5) on = 1;
      b.style.setProperty('--on', on.toFixed(3));
      b.style.setProperty('--dir', seg < i + 0.5 ? '1' : '-1');
    });
  }

  function disegnaCorsie(p) {
    if (!lanes) return;
    const c = prepara(lanes);
    if (!c) return;
    const { ctx, w, h } = c;
    const W = parole('.bk-lanes-words');
    const stretto = w < 520;

    const fs = stretto ? 11 : 12.5;
    const sx = stretto ? 0 : 128;              // colonna delle etichette
    const x0 = sx + 6, x1 = w - 8;
    const X = f => lerp(x0, x1, f);

    const top = stretto ? 26 : 34;
    const corsiaH = (h - top - 46) / 2;
    const yA = top + corsiaH * 0.5;
    const yB = top + corsiaH * 1.5 + 10;
    const tick = Math.min(corsiaH * 0.42, 34);

    /* quanto di ciascuna corsia è già passato sotto la testina */
    const pA = norm(p, 0.02, 0.30);
    const pB = norm(p, 0.36, 0.64);
    const enfasi = norm(p, 0.70, 0.86);
    const alfaA = 1 - 0.55 * norm(p, 0.33, 0.45);
    const alfaB = 0.3 + 0.7 * norm(p, 0.31, 0.40);

    ctx.textBaseline = 'middle';

    function etichetta(s, y, alfa, colore) {
      ctx.globalAlpha = alfa;
      ctx.font = '600 ' + fs + 'px ' + SANS;
      ctx.fillStyle = colore;
      if (stretto) { ctx.textAlign = 'left'; ctx.fillText(s, x0, y - corsiaH * 0.5 + 2); }
      else { ctx.textAlign = 'left'; ctx.fillText(s, 0, y); }
      ctx.globalAlpha = 1;
    }

    function binario(y, alfa) {
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = 'rgba(0,0,0,.10)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function stanghetta(x, y, col, alfa, alt) {
      ctx.globalAlpha = alfa;
      ctx.fillStyle = col;
      const bw = stretto ? 2.4 : 3;
      const hh = alt || tick;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - bw / 2, y - hh / 2, bw, hh, bw / 2);
      else ctx.rect(x - bw / 2, y - hh / 2, bw, hh);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* --- corsia A: a mano --- */
    etichetta(W[0] || '', yA, alfaA, '#6e6e73');
    binario(yA, alfaA);
    const testaA = X(pA);
    for (const f of MANO) {
      const x = X(f);
      if (x > testaA) break;
      const appena = clamp((testaA - x) / 18, 0, 1);
      stanghetta(x, yA, '#86868b', alfaA * appena, tick * (0.55 + 0.45 * appena));
    }
    if (pA > FERMO) {
      const xf = X(FERMO);
      const fino = Math.min(testaA, x1);
      ctx.globalAlpha = alfaA;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(199,119,0,.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xf, yA); ctx.lineTo(fino, yA); ctx.stroke();
      ctx.setLineDash([]);
      const comparsa = norm(pA, FERMO + 0.03, FERMO + 0.12);
      ctx.globalAlpha = alfaA * comparsa;
      ctx.font = '600 ' + (fs - 1) + 'px ' + SANS;
      ctx.fillStyle = '#c77700';
      ctx.textAlign = 'left';
      ctx.fillText(W[3] || '', xf + 8, yA - tick * 0.62 - 4);
      ctx.globalAlpha = 1;
    }
    if (pA > 0 && pA < 1) {
      ctx.globalAlpha = alfaA * 0.5;
      ctx.fillStyle = '#86868b';
      ctx.fillRect(testaA - 0.5, yA - tick * 0.9, 1, tick * 1.8);
      ctx.globalAlpha = 1;
    }

    /* --- corsia B: l'Expert Advisor --- */
    etichetta(W[1] || '', yB, alfaB, '#7b3fe4');
    binario(yB, alfaB);
    const testaB = X(pB);

    /* il tratto di formazione: un blocco a righe, che cresce con la testina */
    const xF1 = Math.min(X(FORMAZIONE), testaB);
    if (xF1 > x0) {
      ctx.save();
      ctx.globalAlpha = alfaB;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0, yB - tick * 0.42, xF1 - x0, tick * 0.84, 6);
      else ctx.rect(x0, yB - tick * 0.42, xF1 - x0, tick * 0.84);
      ctx.fillStyle = 'rgba(123,63,228,.08)';
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(123,63,228,.28)';
      ctx.lineWidth = 1;
      for (let x = x0 - tick; x < xF1 + tick; x += 7) {
        ctx.beginPath(); ctx.moveTo(x, yB + tick); ctx.lineTo(x + tick * 1.4, yB - tick); ctx.stroke();
      }
      ctx.restore();
      if (testaB >= X(FORMAZIONE) * 0.98 && !stretto) {
        ctx.globalAlpha = alfaB;
        ctx.font = '600 ' + (fs - 1.5) + 'px ' + SANS;
        ctx.fillStyle = '#7b3fe4';
        ctx.textAlign = 'center';
        ctx.fillText(W[2] || '', (x0 + X(FORMAZIONE)) / 2, yB + tick * 0.42 + 13);
        ctx.globalAlpha = 1;
      }
    }

    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, '#3b6ef5'); grad.addColorStop(0.52, '#7b3fe4'); grad.addColorStop(1, '#e0489f');
    for (const op of EA) {
      const x = X(op.x);
      if (x > testaB) continue;
      const appena = clamp((testaB - x) / 18, 0, 1);
      const y = yB + (op.riga ? tick * 0.28 : -tick * 0.06);
      stanghetta(x, y, grad, alfaB * appena * (op.riga ? 0.7 : 1),
                 tick * (op.riga ? 0.5 : 0.82) * (0.55 + 0.45 * appena));
    }
    if (pB > 0 && pB < 1) {
      ctx.globalAlpha = alfaB * 0.7;
      ctx.fillStyle = '#7b3fe4';
      ctx.fillRect(testaB - 0.5, yB - tick * 0.9, 1, tick * 1.8);
      ctx.globalAlpha = 1;
    }

    /* --- la terza tappa: dove sta tutto questo. Una parentesi sulla corsia
       dell'EA e il nome del posto: il conto presso il broker. --- */
    if (enfasi > 0) {
      const xa = X(FORMAZIONE + 0.02), xb = x1;
      const yb = yB + tick * 0.62 + 10;
      ctx.globalAlpha = enfasi;
      ctx.strokeStyle = '#7b3fe4';
      ctx.lineWidth = 1.5;
      const meta = lerp(xa, xb, 0.5);
      const fine = lerp(meta, xb, easeOut(enfasi));
      const inizio = lerp(meta, xa, easeOut(enfasi));
      ctx.beginPath();
      ctx.moveTo(inizio, yb - 5); ctx.lineTo(inizio, yb); ctx.lineTo(fine, yb); ctx.lineTo(fine, yb - 5);
      ctx.stroke();
      ctx.font = '650 ' + (fs + 0.5) + 'px ' + SANS;
      ctx.fillStyle = '#1d1d1f';
      ctx.textAlign = 'center';
      ctx.fillText(W[4] || '', meta, yb + 15);
      ctx.globalAlpha = 1;
    }

    /* --- l'asse: un anno, dodici tacche, nessun nome di mese --- */
    const ya = h - 10;
    ctx.strokeStyle = 'rgba(0,0,0,.14)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(x1, ya); ctx.stroke();
    for (let i = 0; i <= 12; i++) {
      const x = X(i / 12);
      ctx.beginPath(); ctx.moveTo(x, ya - (i % 12 === 0 ? 6 : 3)); ctx.lineTo(x, ya); ctx.stroke();
    }
    ctx.font = '500 ' + (fs - 1.5) + 'px ' + SANS;
    ctx.fillStyle = '#86868b';
    ctx.textAlign = 'right';
    ctx.fillText(W[5] || '', x1, ya - 12);
  }


  /* ===========================================================================
     3. IL PERCORSO IN ORIZZONTALE
     La sezione è alta quanto serve perché lo scorrimento verticale copra lo
     spostamento laterale; la scena resta ferma e la traccia scorre.
     =========================================================================== */

  const path  = document.getElementById('percorso');
  const track = document.getElementById('bk-path-track');
  const view  = path && path.querySelector('.bk-path-view');

  function misuraPercorso() {
    if (!path || !track) return;
    if (reduced.matches) { path.style.height = ''; track.style.transform = ''; return; }
    const extra = Math.max(0, track.scrollWidth - view.clientWidth);
    /* Lo scorrimento verticale che serve è lo spostamento laterale, più una
       sosta all'inizio e una alla fine: senza, il primo e l'ultimo passaggio
       si vedrebbero solo di sfuggita. */
    path.style.height = (window.innerHeight + extra * 1.1 + window.innerHeight * 0.35) + 'px';
  }

  /* La traccia non scorre a velocità costante: si FERMA su ogni passaggio,
     centrato, e poi va al successivo. A velocità costante, su telefono —
     dove si vede una scheda alla volta — la scheda «di adesso» restava quasi
     sempre tagliata a metà fra due. */
  function scorriPercorso() {
    if (!path || !track || reduced.matches) return;
    const p = corsa(path);
    const q = norm(p, 0.1, 0.92);
    const extra = Math.max(0, track.scrollWidth - view.clientWidth);
    const tr = track.getBoundingClientRect();
    const schede = track.querySelectorAll('.bk-step');
    const fermate = Array.from(schede, function (sc) {
      const r = sc.getBoundingClientRect();
      return clamp(r.left + r.width / 2 - tr.left - view.clientWidth / 2, 0, extra);
    });
    let x = extra * q;
    if (fermate.length > 1) {
      const s = q * (fermate.length - 1);
      const i = Math.min(Math.floor(s), fermate.length - 2);
      const g = easeInOut(clamp((s - i - 0.22) / 0.56, 0, 1));
      x = lerp(fermate[i], fermate[i + 1], g);
    }
    track.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
    path.style.setProperty('--p', q.toFixed(3));

    /* Il passaggio più vicino al centro della vista è quello «di adesso». */
    const mezzo = window.innerWidth / 2;
    track.querySelectorAll('.bk-step').forEach(function (s) {
      const r = s.getBoundingClientRect();
      const d = Math.abs((r.left + r.width / 2) - mezzo) / (window.innerWidth * 0.6);
      s.style.setProperty('--on', clamp(1.25 - d, 0.35, 1).toFixed(3));
    });
  }


  /* ===========================================================================
     4. IL TRIANGOLO
     Quattro flussi fra tre parti. Si sceglie un vertice; i flussi che lo
     toccano si accendono e ci scorrono sopra dei punti. Gli altri restano
     tenui ma visibili: il disegno resta un sistema, non un elenco.
     =========================================================================== */

  const tri = document.getElementById('bk-tri');
  const triSvg = tri && tri.querySelector('svg');
  const triDots = tri && tri.querySelector('.tri-dots');
  const edges = tri ? Array.from(tri.querySelectorAll('.tri-edge')) : [];
  const PUNTI = 4;
  let scelto = 'broker';

  const lunghezze = edges.map(e => e.getTotalLength ? e.getTotalLength() : 0);

  if (triDots) {
    edges.forEach(function (e) {
      for (let k = 0; k < PUNTI; k++) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('r', '4');
        c.dataset.edge = e.id;
        triDots.appendChild(c);
      }
    });
  }

  function scegliNodo(n) {
    scelto = n;
    tri.querySelectorAll('.bk-node').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.node === n));
    });
    edges.forEach(function (e) {
      const tocca = e.dataset.from === n || e.dataset.to === n;
      e.classList.toggle('on', tocca);
      const lab = tri.querySelector('.tri-label[data-edge="' + e.id + '"]');
      if (lab) lab.classList.toggle('on', tocca);
    });
    document.querySelectorAll('.bk-tri-card').forEach(function (c) {
      c.hidden = c.dataset.node !== n;
    });
    disegnaTriangolo(ultimoT);
  }

  function disegnaTriangolo(t) {
    if (!triDots) return;
    const cerchi = triDots.children;
    let i = 0;
    edges.forEach(function (e, j) {
      const L = lunghezze[j];
      const on = e.classList.contains('on');
      for (let k = 0; k < PUNTI; k++, i++) {
        const c = cerchi[i];
        const f = ((t * 0.16) + k / PUNTI) % 1;
        const pt = e.getPointAtLength(L * f);
        c.setAttribute('cx', pt.x.toFixed(1));
        c.setAttribute('cy', pt.y.toFixed(1));
        /* i punti nascono e muoiono sfumando, così il flusso non «salta» */
        const vita = Math.sin(Math.PI * f);
        c.setAttribute('opacity', ((on ? 1 : 0.18) * vita).toFixed(3));
        c.setAttribute('r', on ? '4.5' : '3');
      }
    });
  }

  if (tri) {
    tri.querySelectorAll('.bk-node').forEach(function (b) {
      b.addEventListener('click', function () { scegliNodo(b.dataset.node); });
      b.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover)').matches) scegliNodo(b.dataset.node);
      });
    });
  }


  /* ===========================================================================
     5. IL TERMINALE — ultimo passaggio del percorso
     Righe di ordini che arrivano da sole. Sono funzione del tempo: la riga
     numero k è sempre la stessa riga, qualunque sia il momento in cui la si
     guarda. Nessun prezzo, nessun risultato: solo che l'EA sta lavorando.
     =========================================================================== */

  const term = document.getElementById('bk-term');
  const SIMBOLI = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'AUDUSD', 'US500'];
  /* Quattro, non cinque: col carattere del sito le righe sono più alte di
     quelle in monospaziato, e la quinta usciva dal riquadro. */
  const RIGHE = 4;
  let ultimaRiga = -1;

  function riga(k) {
    const r = rng(1000 + k);
    const minuti = (9 * 60 + k * 7) % (24 * 60);
    const hh = String(Math.floor(minuti / 60)).padStart(2, '0');
    const mm = String(minuti % 60).padStart(2, '0');
    const s = SIMBOLI[Math.floor(r() * SIMBOLI.length)];
    const buy = r() > 0.5;
    const lotti = (Math.floor(r() * 4) + 1) / 10;
    return '<span class="tr"><span class="tr-t">' + hh + ':' + mm + '</span>' +
           '<span class="tr-s">' + s + '</span>' +
           '<span class="tr-d ' + (buy ? 'buy' : 'sell') + '">' + (buy ? 'BUY' : 'SELL') + '</span>' +
           '<span class="tr-v">' + lotti.toFixed(2) + '</span></span>';
  }

  function disegnaTerminale(t) {
    if (!term) return;
    const k = Math.floor(t / 1.7);
    if (k === ultimaRiga) return;
    ultimaRiga = k;
    let html = '';
    for (let i = k; i > k - RIGHE; i--) html += riga(i);
    term.innerHTML = html;
    term.firstChild.classList.add('tr-new');
  }


  /* ===========================================================================
     6. L'ANELLO, I NUMERI, LE RIVELAZIONI
     =========================================================================== */

  const ring = document.getElementById('bk-ring');
  const ringSq  = ring && ring.querySelector('.ring-sq');
  const ringYou = ring && ring.querySelector('.ring-you');
  let ringFill = 1;

  /* L'anello si riempie con lo scorrimento. Il confine fra le due fette invece
     si muove da solo, piano, avanti e indietro: la quota non ha un numero
     perché si concorda, e un confine fermo ne disegnerebbe uno. Con animazioni
     ridotte resta fermo, e la cifra al centro continua a dire «da concordare». */
  const STACCO = 2.2;
  function disegnaAnello(t) {
    if (!ringSq) return;
    const tot = ringFill * (100 - 2 * STACCO);
    const quota = reduced.matches ? 0.3 : 0.3 + 0.08 * Math.sin(t * 0.7);
    const b = tot * quota, a = tot - b;
    ringSq.setAttribute('stroke-dasharray', a.toFixed(2) + ' ' + (100 - a).toFixed(2));
    ringYou.setAttribute('stroke-dasharray', b.toFixed(2) + ' ' + (100 - b).toFixed(2));
    ringYou.setAttribute('stroke-dashoffset', (-(a + (b > 0.05 ? STACCO : 0))).toFixed(2));
  }

  const contatori = Array.from(document.querySelectorAll('[data-count]'));
  const rivelazioni = Array.from(document.querySelectorAll('[data-rv]'));

  /* ⚠️ Non Intl.NumberFormat: in italiano non raggruppa i numeri di quattro
     cifre («4986»), e accanto al «4.986» della home sembrerebbe un altro
     numero. Il separatore si mette a mano. */
  function formatta(n, el) {
    const sep = lingua() === 'en' ? ',' : '.';
    const s = el.dataset.sep ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n);
    return s + (el.dataset.suffix || '');
  }

  function scorriResto() {
    if (ring) {
      ringFill = reduced.matches ? 1 : easeOut(ingresso(ring));
      disegnaAnello(ultimoT);
    }
    contatori.forEach(function (el) {
      /* Il conto finisce presto: un «0 verifiche» che resta a schermo mentre
         si legge la riga sotto direbbe una cosa falsa. */
      const p = reduced.matches ? 1 : easeOut(norm(ingresso(el), 0, 0.6));
      el.textContent = formatta(Math.round(Number(el.dataset.count) * p), el);
    });
    rivelazioni.forEach(function (el) {
      el.style.setProperty('--on', reduced.matches ? '1' : easeOut(ingresso(el)).toFixed(3));
    });
  }


  /* ===========================================================================
     IL MOTORE
     Lo scorrimento ridisegna ciò che dipende dallo scorrimento. Il tempo fa
     girare un solo ciclo, attivo solo mentre almeno una scena a tempo è in
     vista.
     =========================================================================== */

  let sp = 0;
  let ultimoT = 0;

  function fotogrammaScorrimento() {
    sp = scorriApertura();
    if (story) {
      const p = reduced.matches ? 1 : corsa(story);
      tappe(p);
      disegnaCorsie(p);
    }
    scorriPercorso();
    scorriResto();
    if (reduced.matches || !inVista.size) disegnaRete(ultimoT, sp);
  }

  let attesa = false;
  function suScorrimento() {
    if (attesa) return;
    attesa = true;
    requestAnimationFrame(function () { attesa = false; fotogrammaScorrimento(); });
  }

  const inVista = new Set();
  let ciclo = null;

  function giro(ms) {
    ciclo = null;
    if (reduced.matches || !inVista.size) return;
    ultimoT = ms / 1000;
    if (inVista.has(hero)) disegnaRete(ultimoT, sp);
    if (inVista.has(tri)) disegnaTriangolo(ultimoT);
    if (inVista.has(path)) disegnaTerminale(ultimoT);
    if (inVista.has(ring)) disegnaAnello(ultimoT);
    ciclo = requestAnimationFrame(giro);
  }

  function avviaCiclo() {
    if (!ciclo && !reduced.matches && inVista.size) ciclo = requestAnimationFrame(giro);
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) inVista.add(v.target); else inVista.delete(v.target);
      });
      avviaCiclo();
    });
    [hero, tri, path, ring].forEach(function (el) { if (el) io.observe(el); });
  }

  /* Un fotogramma fermo per le scene a tempo: con animazioni ridotte è
     l'unico, altrimenti è quello che si vede prima che parta il ciclo. */
  function statico() {
    disegnaRete(4.2, sp);
    disegnaTriangolo(1.3);
    disegnaTerminale(20);
    disegnaAnello(0);
  }


  /* ===========================================================================
     7. IL MODULO «INCONTRIAMOCI»
     Nessun server: il messaggio si compone qui, chi scrive lo legge e decide
     se mandarlo.
     =========================================================================== */

  const form = document.getElementById('bk-form');
  const done = document.getElementById('bk-done');

  const TESTI = {
    it: {
      msg: (n, s, g) => 'Ciao, sono ' + n + ' di ' + s + '. Vorrei incontrarvi al SiGMA World di Roma' +
                        (g ? ' ' + g : '') + ' per parlare di una collaborazione con SpaceQuant.',
      giorno: g => '— ' + g,
      oggetto: s => 'SiGMA World — incontro con ' + s,
    },
    en: {
      msg: (n, s, g) => 'Hi, I\'m ' + n + ' from ' + s + '. I\'d like to meet you at SiGMA World in Rome' +
                        (g ? ' ' + g : '') + ' to talk about partnering with SpaceQuant.',
      giorno: g => 'on ' + g,
      oggetto: s => 'SiGMA World — meeting with ' + s,
    },
  };

  function giorni() {
    const row = document.getElementById('bk-days');
    if (!row || !CONFIG.event || !CONFIG.event.days) return;
    const sel = (form.querySelector('input[name="giorno"]:checked') || {}).value || '';
    const loc = lingua() === 'en' ? 'en-GB' : 'it-IT';
    const breve = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric' });
    row.querySelectorAll('.bk-day:not(.bk-day-any)').forEach(n => n.remove());
    CONFIG.event.days.forEach(function (iso) {
      const [y, m, d] = iso.split('-').map(Number);
      const data = new Date(y, m - 1, d);
      const l = document.createElement('label');
      l.className = 'bk-day';
      l.innerHTML = '<input type="radio" name="giorno"><span></span>';
      l.querySelector('input').value = iso;
      l.querySelector('input').checked = (sel === iso);
      l.querySelector('span').textContent = breve.format(data);
      row.insertBefore(l, row.querySelector('.bk-day-any'));
    });
  }

  function giornoLungo(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const loc = lingua() === 'en' ? 'en-GB' : 'it-IT';
    return new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(y, m - 1, d));
  }

  function componi() {
    const d = new FormData(form);
    const nome = String(d.get('nome') || '').trim().slice(0, 80);
    const soc  = String(d.get('societa') || '').trim().slice(0, 80);
    const g    = String(d.get('giorno') || '');
    const T = TESTI[lingua()];
    return { nome, soc, testo: T.msg(nome, soc, g ? T.giorno(giornoLungo(g)) : ''), oggetto: T.oggetto(soc) };
  }

  function mostraMessaggio() {
    const m = componi();
    const n = (CONFIG.whatsapp && !CONFIG.isPlaceholder(CONFIG.whatsapp))
      ? String(CONFIG.whatsapp).replace(/[^\d]/g, '') : null;
    const wa = n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(m.testo) : null;

    document.getElementById('bk-msg').textContent = m.testo;
    document.getElementById('bk-mail').href = 'mailto:' + CONFIG.supportEmail +
      '?subject=' + encodeURIComponent(m.oggetto) + '&body=' + encodeURIComponent(m.testo);

    const link = document.getElementById('bk-wa');
    const qrWrap = document.getElementById('bk-qr-wrap');
    link.hidden = !wa;
    qrWrap.hidden = !wa;
    if (wa) {
      link.href = wa;
      try {
        document.getElementById('bk-qr').innerHTML = SQQR.svg(wa, { level: 'L', quiet: 3, dark: '#1d1d1f' });
      } catch (e) { qrWrap.hidden = true; }
    }
    form.hidden = true;
    done.hidden = false;
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const m = componi();
      const manca = document.getElementById('bk-manca');
      if (!m.nome || !m.soc) {
        manca.hidden = false;
        const vuoto = form.querySelector(m.nome ? 'input[name="societa"]' : 'input[name="nome"]');
        if (vuoto) vuoto.focus();
        return;
      }
      manca.hidden = true;
      mostraMessaggio();
    });
    document.getElementById('bk-back').addEventListener('click', function (e) {
      e.preventDefault();
      done.hidden = true;
      form.hidden = false;
    });
  }


  /* ===========================================================================
     8. LE FILE DA SCORRERE — solo su telefono
     Sotto i 700 px garanzie, numeri e punti della quota diventano una fila
     che si scorre di lato (il CSS fa tutto il resto). Qui solo i puntini:
     quale scheda è in vista è funzione della posizione della fila, e un
     puntino toccato porta alla sua scheda.
     =========================================================================== */

  document.querySelectorAll('[data-swipe]').forEach(function (fila) {
    const schede = Array.from(fila.children);
    if (schede.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'bk-dots';
    /* I puntini sono un indicatore, non l'unico modo di arrivare alle schede:
       fuori dal giro del tabulatore, e nascosti ai lettori di schermo, che le
       schede le leggono già tutte in fila. */
    dots.setAttribute('aria-hidden', 'true');
    const bottoni = schede.map(function (sc, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('click', function () {
        fila.scrollTo({ left: sc.offsetLeft - schede[0].offsetLeft, behavior: reduced.matches ? 'auto' : 'smooth' });
      });
      dots.appendChild(b);
      return b;
    });
    fila.after(dots);

    function segna() {
      const passo = schede[1].offsetLeft - schede[0].offsetLeft || 1;
      const max = fila.scrollWidth - fila.clientWidth;
      let i = Math.round(fila.scrollLeft / passo);
      if (fila.scrollLeft >= max - 2) i = schede.length - 1;   // l'ultima non arriva a filo
      bottoni.forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
    }
    fila.addEventListener('scroll', segna, { passive: true });
    window.addEventListener('resize', segna);
    segna();
  });


  /* --- Avvio -------------------------------------------------------------- */

  /* Le sezioni bloccate e lo scorrimento laterale esistono SOLO con questa
     classe: senza JavaScript, o con animazioni ridotte, la pagina resta un
     testo che si legge dall'alto in basso, con ogni elemento al suo posto. */
  function modo() {
    document.documentElement.classList.toggle('bk-anim', !reduced.matches);
  }

  function tutto() {
    modo();
    misuraPercorso();
    fotogrammaScorrimento();
    statico();
  }

  window.addEventListener('scroll', suScorrimento, { passive: true });
  window.addEventListener('resize', function () { misuraPercorso(); suScorrimento(); statico(); });
  reduced.addEventListener('change', function () { tutto(); avviaCiclo(); });

  /* Cambiando lingua cambiano le parole dentro i canvas, la larghezza dei
     passaggi (quindi la corsa laterale) e i nomi dei giorni. */
  document.addEventListener('sq:langchange', function () {
    if (form) giorni();
    if (done && !done.hidden) mostraMessaggio();
    tutto();
  });

  function avvio() {
    if (form) giorni();
    if (tri) scegliNodo('broker');
    tutto();
    avviaCiclo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvio);
  else avvio();

  /* I caratteri di sistema possono cambiare la larghezza dei testi dopo il
     primo disegno: si rimisura quando la pagina ha finito di caricare. */
  window.addEventListener('load', tutto);

})();
