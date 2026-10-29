/* =============================================================================
   SpaceQuant — pagina abbonamento
   -----------------------------------------------------------------------------
   Tre piani: mensile, trimestrale, annuale (CONFIG.pricing.plans). Qui:

     1. prezzi, «pari a … al mese» e risparmio, scritti come si scrivono nella
        lingua della pagina e calcolati dalla configurazione;
     2. su telefono si sceglie il piano con l'interruttore e se ne vede uno;
     3. una configurazione incompleta si segnala, così una pubblicazione a metà
        si vede subito invece di arrivare all'utente;
     4. «Abbonati» apre il modulo di Whop in una finestra sopra la pagina,
        senza cambiarla, già sul piano del pulsante.
   ============================================================================= */

(function () {

  const $ = id => document.getElementById(id);
  const C = SQCheckout;
  const en = () => C.lingua() === 'en';

  /* --- 1. Prezzi e calcoli ------------------------------------------------ */
  function scriviPrezzi() {
    document.querySelectorAll('[data-prezzo]').forEach(function (el) {
      el.textContent = C.prezzo(el.dataset.prezzo);
    });

    document.querySelectorAll('[data-calcolo]').forEach(function (el) {
      C.descrivi(el, el.dataset.calcolo);
    });

    // Il bollino dell'annuale dice di quanto conviene, solo se conviene.
    const badge = $('plan-badge');
    if (badge) {
      const r = C.risparmio('annuale');
      badge.hidden = !r;
      if (r) badge.textContent = en() ? `Save ${r.pct}%` : `Risparmi il ${r.pct}%`;
    }
  }

  /* --- 2. Su telefono, un piano alla volta --------------------------------
     Tre riquadri incolonnati non entrano in una schermata: l'interruttore ne
     mostra uno. Parte dal mensile: il più acquistato, e quello della
     promozione. La classe
     `plans-scelta` la mette solo questo script: senza JavaScript si vedono
     tutti e tre. Su schermo largo l'interruttore non c'è e i riquadri stanno
     affiancati, qualunque cosa sia scelta. */
  let scelto = 'mensile';

  function mostra(n) {
    if (!C.esiste(n)) return;
    scelto = n;
    document.querySelectorAll('.plan[data-piano]').forEach(function (el) {
      el.classList.toggle('plan-on', el.dataset.piano === n);
    });
    segna(document.querySelector('.plan-pick'), n);
  }

  /* Un interruttore a tre: aria-checked, tabindex e posizione del cursore. */
  function segna(sw, n) {
    if (!sw) return;
    sw.dataset.sel = n;
    sw.querySelectorAll('.ab-opt').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.piano === n));
      b.tabIndex = (b.dataset.piano === n) ? 0 : -1;
    });
  }

  /* Clic e frecce, come i pulsanti radio veri. */
  function cablaInterruttore(sw, scegli) {
    if (!sw) return;
    sw.querySelectorAll('.ab-opt').forEach(function (b) {
      b.addEventListener('click', function () { scegli(b.dataset.piano); });
      b.addEventListener('keydown', function (e) {
        const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!passo) return;
        e.preventDefault();
        const i = C.PIANI.indexOf(sw.dataset.sel);
        const altro = C.PIANI[(i + passo + C.PIANI.length) % C.PIANI.length];
        scegli(altro);
        sw.querySelector('.ab-opt[data-piano="' + altro + '"]').focus();
      });
    });
  }

  /* --- 3. Configurazione incompleta ---------------------------------------
     La lista è quella di checkout.js — la stessa regola con cui si decide se
     montare il modulo — più l'indirizzo a cui scrivere.                     */
  function checkConfigured() {
    const box = $('price-todo');
    const body = $('price-todo-body');
    if (!box) return;

    const missing = [];
    if (CONFIG.isPlaceholder(CONFIG.supportEmail)) missing.push('supportEmail');
    missing.push.apply(missing, C.mancanti());

    box.classList.toggle('hidden', missing.length === 0);
    if (missing.length && body) {
      body.innerHTML = 'Da compilare in <code>assets/config.js</code>: <code>' +
        missing.join('</code>, <code>') + '</code>. ' +
        'Questo avviso sparisce da solo appena vengono inseriti, e non compare ' +
        'mai a configurazione completa.';
    }
  }

  /* --- 4. Il pagamento, sopra la pagina -----------------------------------
     I pulsanti «Abbonati» restano link veri ad abbonati.html?piano=…: si
     aprono in una scheda nuova, si copiano, funzionano senza JavaScript. Un
     clic normale, a configurazione completa, non cambia pagina: apre il
     modulo nella finestra #pay, già sul piano del pulsante. Chi ha appena
     deciso non deve ritrovarsi su un'altra pagina.

     IL TASTO «INDIETRO» CHIUDE LA FINESTRA. Su telefono la finestra occupa lo
     schermo e sembra una pagina: indietro è il gesto che si fa per uscirne, e
     senza questa voce nella cronologia porterebbe via dal sito.

     CHIUDERE NON SMONTA. Il modulo resta dov'è: chi chiude per sbaglio, o per
     rileggere qualcosa, riapre sullo stesso piano e ritrova ciò che aveva
     scritto. Si rimonta solo cambiando piano o lingua.

     ⚠️ LA FINESTRA NON È MODALE (show, non showModal) — vedi la nota su #pay
     in pricing.html. Quello che un <dialog> modale darebbe da solo lo fa
     questo codice: la pagina sotto diventa `inert` (niente clic, niente Tab,
     niente lettore di schermo), Esc chiude, il fuoco entra nella finestra e
     torna al pulsante all'uscita.                                           */
  const dlg = $('pay');
  /* Per nome, non «tutto il body tranne #pay»: Whop aggiunge al body le sue
     finestre, e rese inerti fermerebbero il pagamento. */
  const sotto = () => document.querySelectorAll('body > header, body > main, body > footer, #promo, #promo-bar');
  let daDove = null;   // il pulsante che ha aperto, per restituirgli il fuoco
  let pianoPay = 'annuale';

  const finestraPossibile = () =>
    !!dlg && typeof dlg.showModal === 'function' && C.pronto();

  /* Il modulo montato è quello giusto per piano e lingua di adesso? */
  function montaSeServe() {
    const m = $('pay-mount');
    if (m.dataset.piano === pianoPay && m.dataset.lingua === C.lingua()) return;
    C.monta($('pay-card'), m, $('pay-direct'), pianoPay);
  }

  function scegliPay(n) {
    if (!C.esiste(n)) return;
    pianoPay = n;
    segna(dlg.querySelector('.pay-switch'), n);
    montaSeServe();
  }

  function apri(n, da) {
    daDove = da || null;
    scegliPay(n);
    dlg.show();
    sotto().forEach(function (el) { el.inert = true; });
    document.documentElement.classList.add('pay-open');
    $('pay-close').focus({ preventScroll: true });
    history.pushState({ sqPay: true }, '');
  }

  function wirePay() {
    if (!dlg) return;

    /* I link di riserva portano il codice di chi ha presentato il cliente, se
       c'è: senza, aprendoli in una scheda nuova si perdeva. */
    const ref = C.riferimento();
    document.querySelectorAll('[data-paga]').forEach(function (a) {
      a.href = 'abbonati.html?piano=' + a.dataset.paga + (ref ? '&ref=' + ref : '');

      a.addEventListener('click', function (e) {
        // Cmd/Ctrl/Maiusc/rotella: chi vuole una scheda nuova la ottiene.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!finestraPossibile()) return;   // si va ad abbonati.html
        e.preventDefault();
        apri(a.dataset.paga, a);
      });

      /* Lo script di Whop parte quando la mano si avvicina a un pulsante, non
         all'apertura della pagina: è l'unica richiesta a un servizio esterno
         del sito, e chi legge solo i prezzi non la paga. Il mezzo secondo
         guadagnato così è quello in cui altrimenti si vedrebbe lo scheletro. */
      ['pointerenter', 'focus', 'touchstart'].forEach(function (ev) {
        a.addEventListener(ev, function () { if (finestraPossibile()) C.carica(); },
          { passive: true });
      });
    });

    cablaInterruttore(dlg.querySelector('.pay-switch'), scegliPay);

    $('pay-close').addEventListener('click', function () { dlg.close(); });

    /* Un clic sul fondo scuro chiude. Il fondo è il <dialog> stesso, che
       copre lo schermo: il pannello è un suo figlio, quindi un clic dentro al
       pannello non ha il <dialog> come bersaglio. */
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

    /* Esc: un <dialog> non modale non lo ascolta da solo. Dentro al modulo
       di Whop i tasti restano a Whop — è un altro documento — e Esc chiude
       le sue finestre, non la nostra. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dlg.open) dlg.close();
    });

    /* Qualunque sia la via d'uscita — croce, Esc, fondo, indietro — si passa
       da qui. Se la voce aggiunta all'apertura è ancora in cima alla
       cronologia, la si toglie: altrimenti il primo «indietro» dopo la
       chiusura non farebbe niente di visibile. */
    dlg.addEventListener('close', function () {
      sotto().forEach(function (el) { el.inert = false; });
      document.documentElement.classList.remove('pay-open');
      if (daDove) daDove.focus({ preventScroll: true });
      if (history.state && history.state.sqPay) history.back();
    });
    window.addEventListener('popstate', function () {
      if (dlg.open) dlg.close();
    });

    /* Tornando qui col tasto indietro dopo aver pagato, il browser può
       restituire la pagina com'era — finestra aperta compresa. Si chiude
       senza toccare la cronologia, che è già al punto giusto. */
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted || !dlg.open) return;
      history.replaceState(null, '');
      dlg.close();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    scriviPrezzi();
    checkConfigured();

    const pick = document.querySelector('.plan-pick');
    if (pick) {
      pick.hidden = false;
      document.querySelector('.plans').classList.add('plans-scelta');
      cablaInterruttore(pick, mostra);
      mostra(scelto);
    }

    wirePay();
  });

  // Gli importi si scrivono diversi nelle due lingue (69,99 / 69.99) e le
  // frasi calcolate non passano dal dizionario. Il modulo di Whop ha la sua
  // lingua: se la finestra è aperta si rimonta subito, altrimenti alla
  // prossima apertura.
  document.addEventListener('sq:langchange', function () {
    scriviPrezzi();
    if (dlg && dlg.open) montaSeServe();
  });

})();
