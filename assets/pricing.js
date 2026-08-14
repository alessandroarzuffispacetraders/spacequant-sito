/* =============================================================================
   SpaceQuant — pagina abbonamento
   -----------------------------------------------------------------------------
   Tre compiti:

     1. mostrare lo stato giusto fra i due previsti da CONFIG.pricing.mode
        ('onRequest' oggi, 'public' quando il checkout sarà aperto a tutti);
     2. calcolare il risparmio dell'annuale, ma solo se ENTRAMBI i prezzi sono
        configurati — un risparmio calcolato su un prezzo mancante sarebbe
        esattamente il genere di numero plausibile e privo di significato che
        questo prodotto rifiuta di produrre;
     3. segnalare una configurazione incompleta, così una pubblicazione a metà
        si vede subito invece di arrivare all'utente.
   ============================================================================= */

(function () {

  const mode = () => (CONFIG.pricing.mode === 'public' ? 'public' : 'onRequest');

  /* --- 1. Quale dei due stati mostrare ------------------------------------ */
  function applyMode() {
    const m = mode();
    document.querySelectorAll('[data-when]').forEach(function (el) {
      el.hidden = (el.dataset.when !== m);
    });
  }

  /* --- Pulsanti «Richiedi l'accesso» --------------------------------------
     Portano al questionario, portandosi dietro il piano scelto. Prima aprivano
     direttamente una mail vuota con l'oggetto intestato: chi scriveva doveva
     inventarsi cosa dire, e chi rispondeva non sapeva nulla di lui. Le tre
     domande di richiedi.html costano venti secondi a chi le compila e fanno
     arrivare una richiesta a cui si può rispondere nel merito.

     L'indirizzo resta un link vero — non un pulsante che apre qualcosa con
     JavaScript: si può aprire in una scheda nuova, copiare, mandare a qualcuno.
     Il piano viaggia in chiaro nell'indirizzo, e la pagina di destinazione
     accetta solo i due valori previsti (vedi assets/richiedi.js).            */
  function wireContactLinks() {
    document.querySelectorAll('[data-contact]').forEach(function (el) {
      el.href = 'richiedi.html?piano=' + encodeURIComponent(el.dataset.contact);
    });
  }

  /* --- 2. Risparmio dell'annuale ------------------------------------------ */
  function fmt(n) {
    const locale = document.documentElement.lang === 'en' ? 'en-US' : 'it-IT';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  }

  function updateSaving() {
    const el = document.getElementById('plan-save');
    const badge = document.getElementById('plan-badge');
    if (!el) return;

    const m = CONFIG.pricing.monthly;
    const y = CONFIG.pricing.yearly;
    const cur = CONFIG.pricing.currency;

    const usable = mode() === 'public' &&
      typeof m === 'number' && typeof y === 'number' && m > 0 && y > 0 &&
      (m * 12) > y;   // se l'annuale non conviene, non lo si annuncia lo stesso

    if (!usable) {
      el.classList.add('hidden');
      if (badge) badge.classList.add('hidden');
      return;
    }

    const fullYear = m * 12;
    const saved = fullYear - y;
    const pct = Math.round((saved / fullYear) * 100);
    const en = document.documentElement.lang === 'en';

    el.textContent = en
      ? `You save ${cur}${fmt(saved)} a year — ${pct}% less than paying monthly.`
      : `Risparmi ${cur}${fmt(saved)} l'anno, il ${pct}% rispetto al mensile.`;
    el.classList.remove('hidden');

    if (badge) {
      badge.textContent = en ? `Save ${pct}%` : `Risparmi il ${pct}%`;
      badge.classList.remove('hidden');
    }
  }

  /* --- 3. Configurazione incompleta ---------------------------------------
     Cosa manca dipende dallo stato: con l'accesso su richiesta i prezzi non
     servono, serve un indirizzo a cui scrivere.                              */
  function checkConfigured() {
    const box = document.getElementById('price-todo');
    const body = document.getElementById('price-todo-body');
    if (!box) return;

    const missing = [];
    if (CONFIG.isPlaceholder(CONFIG.supportEmail)) missing.push('supportEmail');

    if (mode() === 'public') {
      if (typeof CONFIG.pricing.monthly !== 'number') missing.push('pricing.monthly');
      if (typeof CONFIG.pricing.yearly  !== 'number') missing.push('pricing.yearly');
      if (CONFIG.isPlaceholder(CONFIG.whop.monthly))  missing.push('whop.monthly');
      if (CONFIG.isPlaceholder(CONFIG.whop.yearly))   missing.push('whop.yearly');
    }

    box.classList.toggle('hidden', missing.length === 0);
    if (missing.length && body) {
      body.innerHTML = 'Da compilare in <code>assets/config.js</code>: <code>' +
        missing.join('</code>, <code>') + '</code>. ' +
        'Questo avviso sparisce da solo appena vengono inseriti, e non compare ' +
        'mai a configurazione completa.';
    }
  }

  function refresh() {
    applyMode();
    wireContactLinks();
    updateSaving();
    checkConfigured();
  }

  document.addEventListener('DOMContentLoaded', refresh);

  // Oggetto della mail e testo del risparmio sono generati, non presi dal
  // dizionario: vanno rifatti quando cambia la lingua.
  document.addEventListener('sq:langchange', function () {
    wireContactLinks();
    updateSaving();
  });

})();
