/* =============================================================================
   SpaceQuant — i cinque passaggi che si accendono uno dopo l'altro
   -----------------------------------------------------------------------------
   Stessa regola dell'apertura cinematica, e non per simmetria: ciò che si vede è
   funzione pura della posizione di scorrimento. Nessun timer, nessuno stato che
   si accumula, nessun «già mostrato». Da lì discende che risalendo la pagina i
   passaggi si rispengono nell'ordine inverso invece di restare accesi — che è
   quello che ci si aspetta da qualcosa legato allo scorrimento, e che un
   IntersectionObserver con una classe `.visibile` non sa fare.

   Il filo che unisce i numeri appartiene al passaggio da cui parte e si allunga
   con lui: la riga arriva prima del numero che sta per accendersi, e il gruppo
   si legge come una sequenza invece che come cinque cose comparse insieme.

   Senza JavaScript, o con animazioni ridotte, `--on` non viene mai scritto e il
   valore di ripiego nel foglio di stile (1) lascia tutto visibile e fermo.
   ============================================================================= */

(function () {

  const flow = document.querySelector('.flow');
  if (!flow) return;

  const steps = Array.from(flow.querySelectorAll('.flow-step'));
  if (!steps.length) return;

  /* Sfasamento fra un passaggio e il successivo, e durata di ciascuno, in
     frazioni della corsa. Con cinque passaggi l'ultimo parte a 0,52 e finisce a
     0,86: resta un margine prima della fine, così l'ultimo numero è acceso da un
     po' quando il gruppo esce dalla zona di lettura. */
  const STAGGER = 0.13;
  const SPAN    = 0.34;

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* La corsa: da quando il gruppo entra dal basso a quando è salito in alto
     nella finestra. Su schermo corto la finestra di lettura è più stretta, e
     una corsa lunga uguale lascerebbe gli ultimi passaggi ancora spenti quando
     sono già a metà schermo. */
  function progress() {
    const r = flow.getBoundingClientRect();
    const h = window.innerHeight;
    const from = h * 0.92;
    const to   = h * (h < 700 ? 0.42 : 0.28);
    return clamp((from - r.top) / (from - to), 0, 1);
  }

  function frame() {
    const p = progress();
    for (let i = 0; i < steps.length; i++) {
      const a = easeOut(clamp((p - i * STAGGER) / SPAN, 0, 1));
      steps[i].style.setProperty('--on', a.toFixed(3));
    }
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function start() {
    if (reduced.matches) {
      steps.forEach(function (el) { el.style.removeProperty('--on'); });
      return;
    }
    frame();
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
