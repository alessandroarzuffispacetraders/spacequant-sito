/* =============================================================================
   SpaceQuant — le tre scene delle sezioni finali
   -----------------------------------------------------------------------------
   La riserva, l'evidenza, il registro dei difetti. Stessa regola dell'apertura
   cinematica, e non per simmetria: ciò che si vede è FUNZIONE PURA della
   posizione di scorrimento. Nessun timer, nessuno stato che si accumula,
   nessun «già mostrato». Da lì discende che risalendo la pagina la scena torna
   indietro invece di restare all'ultimo fotogramma — che è quello che ci si
   aspetta da qualcosa legato allo scorrimento, e che nessun osservatore di
   visibilità sa fare.

   ⚠️ Le parole che finiscono DENTRO un canvas non sono traducibili: il canvas
   non ha testo, ha pixel. Stanno quindi in nodi nascosti nel markup, con il
   loro `data-i18n`, e il disegno le legge da lì a ogni fotogramma. Così
   check-i18n.js le vede come tutte le altre, e cambiando lingua la scena si
   ridisegna da sé (evento `sq:langchange`).

   Con animazioni ridotte le scene non si animano: si disegna direttamente lo
   stato finale, che è quello che porta l'informazione. Mai il nulla.
   ============================================================================= */

(function () {

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const norm  = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const easeOut   = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const COL = {
    ink:    '#1d1d1f',
    t2:     '#6e6e73',
    t3:     '#86868b',
    rule:   'rgba(0,0,0,.12)',
    blu:    '#3b6ef5',
    viola:  '#7b3fe4',
    magenta:'#e0489f',
    verde:  '#34c759',
    ambra:  '#c77700',
    scuro:  '#1d1d1f',
  };
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  /* La corsa di una scena: da quando entra dal basso a quando è salita nella
     zona di lettura. Le stesse proporzioni dei cinque passaggi, perché il
     ritmo della pagina dev'essere uno solo. */
  function progressOf(el) {
    const r = el.getBoundingClientRect();
    const h = window.innerHeight;
    const from = h * 0.88;
    const to   = h * (h < 700 ? 0.34 : 0.22);
    return clamp((from - r.top) / (from - to), 0, 1);
  }

  /* Le parole della scena, lette dal markup: chiave `w1`, `w2`… nell'ordine. */
  function paroleDi(fig) {
    return Array.from(fig.querySelectorAll('.sc-words i')).map(n => n.textContent.trim());
  }

  /* --- il canvas, misurato sul contenitore e sulla densità dello schermo --- */
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
    return { ctx, w, h, k: Math.min(w / 700, 1.15) };
  }

  function testo(ctx, s, x, y, px, colore, allineamento) {
    ctx.font = px + 'px ' + MONO;
    ctx.fillStyle = colore;
    ctx.textAlign = allineamento || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }

  /* =========================================================================
     SCENA 1 — LA RISERVA
     Una barra che è tutto lo storico di un mercato. L'ultimo quarto si chiude
     e resta chiuso; alla fine si spende UNA delle cinque verifiche, e si vede
     che è una sola.
     ========================================================================= */

  /* La linea dello storico: deterministica, così la scena è identica a ogni
     caricamento — la stessa ragione per cui la scena d'apertura ha un seme. */
  const STORIA = (function () {
    let a = 991, v = 0;
    const out = [];
    for (let i = 0; i <= 220; i++) {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      v += ((a / 0x7fffffff) - 0.46) * 1.9;
      out.push(v);
    }
    const min = Math.min.apply(null, out), max = Math.max.apply(null, out);
    return out.map(x => (x - min) / (max - min || 1));
  })();

  function scenaRiserva(fig, p) {
    const g = prepara(fig.querySelector('canvas'));
    if (!g) return;
    const { ctx, w, h, k } = g;
    const P = paroleDi(fig);
    const padX = 14 * k, padY = 26 * k;
    const x0 = padX, x1 = w - padX;
    const y0 = padY, y1 = h - padY * 1.4;
    const BORDO = 0.75;                       // dove comincia la riserva
    const xb = x0 + (x1 - x0) * BORDO;

    /* 1. lo storico si disegna da sinistra */
    const tracciato = easeOut(norm(p, 0, 0.34));
    const fino = x0 + (x1 - x0) * tracciato;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, fino - x0, h);
    ctx.clip();
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, COL.blu);
    grad.addColorStop(0.55, COL.viola);
    grad.addColorStop(1, COL.magenta);
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1.6, 2.2 * k);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < STORIA.length; i++) {
      const x = x0 + (x1 - x0) * (i / (STORIA.length - 1));
      const y = y1 - (y1 - y0) * STORIA[i];
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    /* 2. la riserva si chiude: il velo scende sull'ultimo quarto */
    const velo = easeInOut(norm(p, 0.30, 0.52));
    if (velo > 0.01) {
      ctx.save();
      ctx.globalAlpha = velo * 0.93;
      ctx.fillStyle = '#f0f0f2';
      ctx.fillRect(xb, y0 - 8 * k, x1 - xb, (y1 - y0) + 16 * k);
      ctx.globalAlpha = velo;
      ctx.strokeStyle = COL.ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([5 * k, 4 * k]);
      ctx.beginPath();
      ctx.moveTo(Math.round(xb) + 0.5, y0 - 10 * k);
      ctx.lineTo(Math.round(xb) + 0.5, y1 + 10 * k);
      ctx.stroke();
      ctx.restore();
    }

    /* 3. le etichette delle due zone */
    const et = easeOut(norm(p, 0.36, 0.55));
    if (et > 0.01) {
      ctx.save();
      ctx.globalAlpha = et;
      testo(ctx, P[0] || '', (x0 + xb) / 2, y1 + 17 * k, 11 * k, COL.t3, 'center');
      testo(ctx, P[1] || '', (xb + x1) / 2, y1 + 17 * k, 11 * k, COL.ink, 'center');
      ctx.restore();
    }

    /* 4. il lucchetto, al centro della riserva */
    const luc = easeOut(norm(p, 0.44, 0.62));
    const apre = easeInOut(norm(p, 0.80, 0.92));     // si apre UNA volta sola
    if (luc > 0.01) {
      const cx = (xb + x1) / 2, cy = (y0 + y1) / 2;
      const s = 19 * k;
      const bw = s * 1.30, bh = s * 1.00;
      const topCorpo = cy + s * 0.06;
      const r = bw * 0.34;                       // raggio dell'arco
      ctx.save();
      ctx.globalAlpha = luc;
      ctx.strokeStyle = COL.ink;
      ctx.fillStyle = COL.ink;
      ctx.lineWidth = Math.max(1.6, 2.4 * k);
      ctx.lineCap = 'round';

      /* ⚠️ L'arco ruota attorno al PIEDE SINISTRO, non attorno al proprio
         centro: è così che si apre un lucchetto vero, ed è l'unico modo per
         cui a `apre = 0` i due piedi poggiano entrambi sul corpo — cioè per
         cui si legge CHIUSO. Ruotandolo sul centro resta socchiuso sempre, e
         la scena perde il suo scatto finale. */
      const perno = { x: cx - r, y: topCorpo };
      ctx.save();
      ctx.translate(perno.x, perno.y);
      ctx.rotate(-apre * 0.62);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 0.30);
      ctx.arc(r, -s * 0.30, r, Math.PI, 0);
      ctx.lineTo(2 * r, 0);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, topCorpo, bw, bh, 3.5 * k);
      ctx.fill();
      ctx.restore();
    }

    /* 5. la verifica spesa: un solo segno attraversa il confine, e il
          contatore scende da 5 a 4. Una sola, e si vede che è una sola. */
    const spesa = easeInOut(norm(p, 0.84, 0.98));
    if (luc > 0.01) {
      const cy = (y0 + y1) / 2;
      const restano = spesa > 0.5 ? 4 : 5;
      ctx.save();
      ctx.globalAlpha = easeOut(norm(p, 0.62, 0.76));
      testo(ctx, restano + ' ' + (P[2] || ''), (xb + x1) / 2, y1 - 2 * k, 11 * k, COL.t2, 'center');
      ctx.restore();

      if (spesa > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, spesa * 2) * (1 - Math.max(0, (spesa - 0.75) / 0.25) * 0.4);
        ctx.strokeStyle = COL.verde;
        ctx.lineWidth = Math.max(1.6, 2.4 * k);
        ctx.lineCap = 'round';
        const da = xb - 26 * k, a = lerp(da, xb + 34 * k, easeOut(spesa));
        ctx.beginPath();
        ctx.moveTo(da, cy + 26 * k);
        ctx.lineTo(a, cy + 26 * k);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(a, cy + 26 * k, 3.4 * k, 0, Math.PI * 2);
        ctx.fillStyle = COL.verde;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* =========================================================================
     SCENA 2 — L'EVIDENZA
     La soglia è √(2·ln N): è la formula vera del prodotto
     (research/evidenza.py). Il risultato NON cambia mai — cambia l'asticella.
     È tutto l'argomento della sezione, e si vede solo mettendoli insieme.
     ========================================================================= */

  const N_MAX = 1000;
  const RISULTATO = 3.0;                    // t del risultato, fisso
  const soglia = n => Math.sqrt(2 * Math.log(Math.max(n, 1.0001)));
  const N_CROSS = Math.exp(RISULTATO * RISULTATO / 2);   // ≈ 90 tentativi

  function scenaEvidenza(fig, p) {
    const g = prepara(fig.querySelector('canvas'));
    if (!g) return;
    const { ctx, w, h, k } = g;
    const P = paroleDi(fig);
    const padL = 16 * k, padR = 16 * k, padT = 30 * k, padB = 34 * k;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const yMax = 4.2;
    const X = n => x0 + (x1 - x0) * (Math.log(Math.max(n, 1)) / Math.log(N_MAX));
    const Y = v => y1 - (y1 - y0) * (v / yMax);

    /* Quanti tentativi a questo punto della corsa.
       ⚠️ NON una salita esponenziale uniforme: quella porta oltre
       l'attraversamento nei primi istanti, e il resto della scena non ha più
       niente da dire. Il passo è spezzato in due, con l'attraversamento al 60%
       della corsa: prima si guarda un risultato che regge, poi lo si guarda
       smettere di reggere. Il secondo momento vale solo se il primo è durato. */
    const t = easeInOut(norm(p, 0.06, 0.94));
    const lnC = Math.log(N_CROSS), lnM = Math.log(N_MAX), QUANDO = 0.6;
    const ln = t <= QUANDO ? (t / QUANDO) * lnC
                           : lnC + ((t - QUANDO) / (1 - QUANDO)) * (lnM - lnC);
    const n = Math.max(1, Math.round(Math.exp(ln)));

    // i due assi, appena accennati: la disciplina del grafico del prodotto
    ctx.strokeStyle = COL.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(y1) + 0.5); ctx.lineTo(x1, Math.round(y1) + 0.5);
    ctx.stroke();

    // il risultato: una riga orizzontale che non si muove mai
    const rr = easeOut(norm(p, 0.02, 0.18));
    if (rr > 0.01) {
      ctx.save();
      ctx.globalAlpha = rr;
      ctx.strokeStyle = COL.viola;
      ctx.lineWidth = Math.max(1.4, 1.8 * k);
      ctx.setLineDash([6 * k, 5 * k]);
      ctx.beginPath();
      ctx.moveTo(x0, Y(RISULTATO)); ctx.lineTo(x1, Y(RISULTATO));
      ctx.stroke();
      ctx.setLineDash([]);
      testo(ctx, P[2] || '', x0, Y(RISULTATO) - 12 * k, 11 * k, COL.viola);
      ctx.restore();
    }

    // la soglia che sale col numero di tentativi
    ctx.strokeStyle = COL.ink;
    ctx.lineWidth = Math.max(1.8, 2.4 * k);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const nn = Math.exp((i / 160) * Math.log(Math.max(n, 1.02)));
      const x = X(nn), y = Y(soglia(nn));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    const sopra = soglia(n) < RISULTATO;      // il risultato batte ancora la soglia?

    /* L'area fra il risultato e la soglia, in DUE colori: verde finché il
       risultato batteva la soglia, ambra da dove ha smesso. Un colore solo
       riscriverebbe il passato — a fine corsa direbbe che non ha mai retto,
       che è il contrario di quello che è successo. */
    function riempi(daN, aN, colore) {
      if (aN <= daN) return;
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = colore;
      ctx.beginPath();
      ctx.moveTo(X(daN), Y(RISULTATO));
      const passi = 90;
      for (let i = 0; i <= passi; i++) {
        const nn = Math.exp(lerp(Math.log(daN), Math.log(aN), i / passi));
        ctx.lineTo(X(nn), Y(soglia(nn)));
      }
      ctx.lineTo(X(aN), Y(RISULTATO));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    riempi(1, Math.min(n, N_CROSS), COL.verde);
    riempi(N_CROSS, n, COL.ambra);

    // la testa della curva
    ctx.beginPath();
    ctx.arc(X(n), Y(soglia(n)), 4 * k, 0, Math.PI * 2);
    ctx.fillStyle = COL.ink;
    ctx.fill();

    // il contatore e il verdetto
    testo(ctx, String(n), x0, y0 - 12 * k, 22 * k, COL.ink);
    testo(ctx, P[0] || '', x0 + ctx.measureText(String(n)).width + 10 * k, y0 - 9 * k,
          11 * k, COL.t3);
    /* l'etichetta segue la testa: ferma a destra, a inizio corsa era lontana
       dalla cosa che nomina */
    const xh = X(n), yh = Y(soglia(n));
    testo(ctx, P[1] || '', Math.min(xh + 10 * k, x1), yh - 13 * k, 11 * k, COL.t2,
          xh > x1 - 90 * k ? 'right' : 'left');

    const verdetto = sopra ? (P[3] || '') : (P[4] || '');
    ctx.save();
    ctx.globalAlpha = easeOut(norm(p, 0.2, 0.34));
    testo(ctx, verdetto, x1, y1 + 18 * k, 12 * k, sopra ? COL.verde : COL.ambra, 'right');
    ctx.restore();
  }

  /* =========================================================================
     SCENA 3 — LE TRE PASTIGLIE
     Non è un canvas: sono parole, e le parole vanno nel markup — così si
     traducono, si selezionano e le legge un lettore di schermo.
     Il terzo esito NON diventa verde. È il punto della sezione: si vede solo
     se resta lì, grigio, accanto agli altri due che hanno deciso.
     ========================================================================= */

  function scenaDifetti(el, p) {
    const righe = el.querySelectorAll('.pas');
    for (let i = 0; i < righe.length; i++) {
      const a = easeOut(clamp((p - i * 0.16) / 0.42, 0, 1));
      righe[i].style.setProperty('--on', a.toFixed(3));
    }
  }

  /* =========================================================================
     IL GIRO
     ========================================================================= */

  const scene = [];
  const add = (sel, fn) => { const el = document.querySelector(sel); if (el) scene.push({ el, fn }); };
  add('#sc-riserva',  scenaRiserva);
  add('#sc-evidenza', scenaEvidenza);
  add('#sc-difetti',  scenaDifetti);
  if (!scene.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function frame() {
    for (const s of scene) s.fn(s.el, reduced.matches ? 1 : progressOf(s.el));
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }

  window.addEventListener('scroll', function () {
    if (!reduced.matches) onScroll();
  }, { passive: true });
  window.addEventListener('resize', frame);
  reduced.addEventListener('change', frame);
  /* cambiando lingua le parole dentro il canvas sono altre: si ridisegna */
  document.addEventListener('sq:langchange', frame);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', frame);
  } else {
    frame();
  }

})();
