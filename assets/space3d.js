/* =============================================================================
   SpaceQuant — nuvole di punti dell'ottimizzazione
   -----------------------------------------------------------------------------
   Quattro grafici tridimensionali: gli assi orizzontali sono i due parametri
   esplorati, quello verticale è la metrica. Ogni punto è una combinazione
   provata; quello in evidenza è la configurazione scelta.

   Ruotano con lo scorrimento — anche qui l'angolo è funzione della posizione
   nella pagina e di nient'altro, quindi risalendo la rotazione torna indietro.
   ============================================================================= */

(function () {

  const grid = document.getElementById('opt3d-grid');
  if (!grid) return;

  const cells = Array.from(grid.querySelectorAll('.opt3d-canvas'));
  if (!cells.length) return;

  /* --- 1. I dati: una superficie con un massimo, più rumore ---------------
     Serve che i quattro grafici raccontino la stessa esplorazione, quindi
     partono tutti dalla stessa griglia di parametri. */

  const SIDE = 22;                    // 22 × 22 combinazioni
  const BEST = { i: 15, j: 7 };       // la configurazione scelta

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(70414);

  /* Qualità di una combinazione: una collina attorno alla configurazione
     scelta, con un secondo rilievo minore e rumore. Da questa discendono
     tutte e quattro le metriche, perché nella realtà sono legate. */
  const quality = [];
  for (let i = 0; i < SIDE; i++) {
    quality[i] = [];
    for (let j = 0; j < SIDE; j++) {
      const d1 = Math.hypot(i - BEST.i, j - BEST.j) / SIDE;
      const d2 = Math.hypot(i - 5, j - 16) / SIDE;
      const q = Math.exp(-Math.pow(d1 * 2.6, 2)) * 0.95 +
                Math.exp(-Math.pow(d2 * 3.2, 2)) * 0.45 +
                (rnd() - 0.5) * 0.16;
      quality[i][j] = Math.min(1, Math.max(0, q));
    }
  }

  /* Le quattro metriche, con il verso giusto: per drawdown e stagnazione il
     valore "buono" è quello piccolo. */
  const METRICS = [
    { key: 0, min: 0.12, max: 1.05,  fmt: v => v.toFixed(2) },
    { key: 1, min: -18,  max: -3.5,  fmt: v => v.toFixed(1) },
    { key: 2, min: 1.05, max: 2.65,  fmt: v => v.toFixed(2) },
    { key: 3, min: 3500, max: 320,   fmt: v => Math.round(v) },
  ];

  /* --- 2. Proiezione ------------------------------------------------------ */

  const TILT = 0.52;          // inclinazione fissa della camera
  const RELIEF = 1.30;        // quanto conta l'altezza: con poco, la nuvola
                              // sembra una griglia piatta e la metrica sparisce
  const REF_H = 368;          // altezza del riquadro su desktop: è il metro a
                              // cui sono tarati i raggi dei punti

  function project(x, y, z, angle, w, h) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const rx = x * c - y * s;
    const ry = x * s + y * c;
    const persp = 1 / (1 + ry * 0.16);          // punti lontani leggermente più piccoli
    /* La nuvola ruota, quindi in diagonale è larga √2 volte il suo lato, e qui
       viene anche allargata di 1.30: sommate, servono ~3.9 volte lo scarto dal
       centro. Legare la misura alla sola altezza bastava finché il riquadro era
       4:3; diventato quadrato sul telefono, la nuvola sfondava di lato e restava
       tagliata dritta dal bordo della cella. Su desktop vince l'altezza come
       prima, quindi lì non cambia un pixel. */
    const scale = Math.min(w / 3.9, h * 0.30) * persp;
    return {
      x: w / 2 + rx * scale * 1.30,
      y: h * 0.58 + (ry * Math.cos(TILT) - z * RELIEF) * scale,
      d: ry,
      k: persp,
    };
  }

  /* Colore per qualità: dal rosso tenue al verde, passando per un neutro
     caldo — la stessa lettura del pannello di ottimizzazione. */
  function colorFor(q) {
    if (q > 0.5) {
      const t = (q - 0.5) / 0.5;
      return 'rgba(' + Math.round(212 - 130 * t) + ',' + Math.round(200 + 20 * t) + ',' +
             Math.round(180 - 40 * t) + ',.85)';
    }
    const t = q / 0.5;
    return 'rgba(' + Math.round(226 - 14 * t) + ',' + Math.round(120 + 80 * t) + ',' +
           Math.round(110 + 70 * t) + ',.8)';
  }

  /* --- 3. Disegno --------------------------------------------------------- */

  function draw(canvas, metricIdx, angle) {
    const ctx = canvas.getContext('2d');
    const box = canvas.getBoundingClientRect();
    if (!box.width) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(box.width), h = Math.round(box.height);
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const m = METRICS[metricIdx];

    /* Riquadro di riferimento: solo lo spigolo di fondo, appena accennato.
       Un reticolo completo sarebbe la prima cosa che si vede, e qui i
       protagonisti sono i punti. */
    ctx.strokeStyle = 'rgba(0,0,0,.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    corners.forEach(function (c, i) {
      const a = project(c[0], c[1], 0, angle, w, h);
      i ? ctx.lineTo(a.x, a.y) : ctx.moveTo(a.x, a.y);
    });
    ctx.closePath();
    ctx.stroke();

    // montanti verticali agli angoli
    ctx.strokeStyle = 'rgba(0,0,0,.06)';
    corners.forEach(function (c) {
      const a = project(c[0], c[1], 0, angle, w, h);
      const b = project(c[0], c[1], 1, angle, w, h);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    /* I punti, dal più lontano al più vicino: senza ordinamento quelli dietro
       finirebbero disegnati sopra a quelli davanti. */
    const pts = [];
    for (let i = 0; i < SIDE; i++) {
      for (let j = 0; j < SIDE; j++) {
        const q = quality[i][j];
        const value = m.min + (m.max - m.min) * q;
        const z = (value - m.min) / (m.max - m.min);
        const p = project((i / (SIDE - 1)) * 2 - 1, (j / (SIDE - 1)) * 2 - 1,
                          z, angle, w, h);
        pts.push({ p: p, q: q, best: (i === BEST.i && j === BEST.j) });
      }
    }
    pts.sort(function (a, b) { return b.p.d - a.p.d; });

    /* Il raggio dei punti è una FRAZIONE del riquadro, non un numero di pixel.
       Scritto in pixel fissi era giusto sul desktop e su nient'altro: sul
       telefono lo stesso riquadro è alto un terzo, i punti restavano quelli, e
       le 484 combinazioni si saldavano in una macchia unica. Spariva la collina
       e spariva il punto scelto — cioè tutto quello che il grafico ha da dire.
       Il riferimento è l'altezza del riquadro su desktop: lì non cambia nulla. */
    const rk = Math.min(w, h) / REF_H;

    /* La nuvola si rimpicciolisce tutta insieme, il punto scelto no: quello non
       è tessitura, è il segnaposto che dice dove si è finiti. Rimpicciolito in
       proporzione resterebbe leggibile ma smetterebbe di essere la prima cosa
       che si trova, che è l'unico suo compito. */
    const rBest = Math.max(6.5 * rk, 3.6);

    for (const pt of pts) {
      const r = pt.best ? rBest * pt.p.k
                        : (2.2 + (1 - pt.q) * 1.5) * pt.p.k * rk;
      ctx.beginPath();
      ctx.arc(pt.p.x, pt.p.y, r, 0, Math.PI * 2);
      if (pt.best) {
        ctx.fillStyle = '#f5b301';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        /* il filo bianco attorno al punto scelto ha un minimo: sotto il mezzo
           pixel non lo stacca più dal verde che ha intorno */
        ctx.lineWidth = Math.max(0.9, 1.5 * rk);
        ctx.stroke();
      } else {
        ctx.fillStyle = colorFor(pt.q);
        ctx.fill();
      }
    }
  }

  /* --- 4. Rotazione legata allo scorrimento ------------------------------- */

  const section = grid.closest('section') || grid;
  let ticking = false, lastAngle = null;

  function sectionProgress() {
    const r = section.getBoundingClientRect();
    const span = r.height + window.innerHeight;
    const t = (window.innerHeight - r.top) / span;
    return Math.max(0, Math.min(1, t));
  }

  function render() {
    const p = sectionProgress();
    const angle = -0.9 + p * 1.5;               // poco meno di mezzo giro
    if (lastAngle !== null && Math.abs(angle - lastAngle) < 0.002) return;
    lastAngle = angle;
    cells.forEach(function (cv, i) {
      // ogni riquadro parte da un angolo leggermente diverso: le quattro
      // nuvole non devono sembrare la stessa immagine ripetuta
      draw(cv, parseInt(cv.dataset.metric, 10) || 0, angle + i * 0.22);
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(); });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function start() {
    lastAngle = null;
    if (reduced.matches) {
      // ferme, ma disegnate: l'informazione resta
      cells.forEach(function (cv, i) {
        draw(cv, parseInt(cv.dataset.metric, 10) || 0, -0.35 + i * 0.22);
      });
      return;
    }
    render();
  }

  window.addEventListener('scroll', function () {
    if (!reduced.matches) onScroll();
  }, { passive: true });
  window.addEventListener('resize', start);
  reduced.addEventListener('change', start);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
