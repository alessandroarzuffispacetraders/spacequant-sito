/* =============================================================================
   SpaceQuant — il pagamento, dentro il sito
   -----------------------------------------------------------------------------
   La pagina abbonati.html: il riepilogo a sinistra, il modulo di Whop a
   destra. Il sito resta il sito — menu, riepilogo, colori — e Whop compare
   solo dove serve un processore di pagamento: il riquadro della carta.

   Il montaggio del modulo, i prezzi e il ritorno a pagamento finito stanno in
   assets/checkout.js, in comune con la finestra di pagamento di pricing.html.
   Qui c'è ciò che è solo di questa pagina:

     · è l'indirizzo dei link diretti (un broker, una mail, un messaggio) e il
       ripiego della finestra quando non si può aprire: il piano arriva come
       `?piano=mensile|trimestrale|annuale`, e senza si parte dal mensile —
       il più acquistato, e quello della promozione;
     · è il posto in cui Whop riporta dopo il pagamento, con `?status=`
       nell'indirizzo: qui si decide dove andare.
   ============================================================================= */

(function () {

  const $ = id => document.getElementById(id);

  const card    = $('ab-card');
  if (!card) return;

  const mountEl = $('ab-mount');
  const direct  = $('ab-direct');
  const C = SQCheckout;

  /* «/ mese», «/ 3 mesi», «/ anno»: chiave del dizionario e testo italiano. */
  const PER = {
    mensile:     ['pr.m.per', '/ mese'],
    trimestrale: ['pr.q.per', '/ 3 mesi'],
    annuale:     ['pr.y.per', '/ anno'],
  };

  let piano = sceltaIniziale();

  function sceltaIniziale() {
    const q = new URLSearchParams(location.search).get('piano');
    return C.esiste(q) ? q : 'mensile';
  }

  /* --- Il riepilogo ------------------------------------------------------- */

  function riepilogo() {
    const sw = document.querySelector('.ab-switch');
    sw.dataset.sel = piano;
    sw.querySelectorAll('.ab-opt').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.dataset.piano === piano));
      b.tabIndex = (b.dataset.piano === piano) ? 0 : -1;
    });

    $('ab-amount').textContent = C.prezzo(piano);

    /* Si cambia la CHIAVE, non solo il testo, così il cambio di lingua
       successivo riprende quella giusta. */
    const per = $('ab-per');
    per.dataset.i18n = PER[piano][0];
    per.dataset.itText = PER[piano][1];
    per.textContent = C.lingua() === 'en' ? (I18N_EN[PER[piano][0]] || PER[piano][1]) : PER[piano][1];

    C.descrivi($('ab-calc'), piano);

    // Il codice sconto, solo sul piano a cui vale (site.js toglie la riga se
    // non c'è promozione).
    const promo = $('ab-promo');
    if (promo) promo.hidden = !(CONFIG.promo && CONFIG.promo.plan === piano);
  }

  const monta = () => C.monta(card, mountEl, direct, piano);

  /* Ritorno da Whop. Whop ha usato due vocabolari nel tempo
     (`success`/`error`, poi `succeeded`/`failed`/`canceled`): si accettano
     entrambi. Qualunque altro valore — «in elaborazione», per esempio — non è
     un esito: il modulo resta lì com'è. */
  function esitoEsterno() {
    const st = new URLSearchParams(location.search).get('status');
    if (st === 'success' || st === 'succeeded') {
      location.replace('download.html?attivato=1');
      return true;
    }
    if (st === 'error' || st === 'failed' || st === 'canceled') {
      $('ab-fail').hidden = false;
    }
    return false;
  }

  /* Pronto, o cosa manca. */
  function stato() {
    const manca = C.mancanti();
    const pronto = C.pronto();

    card.hidden = !pronto;
    $('ab-legal').hidden = !pronto;

    const todo = $('ab-todo');
    todo.classList.toggle('hidden', manca.length === 0);
    if (manca.length) {
      $('ab-todo-body').innerHTML = 'Da compilare in <code>assets/config.js</code>: <code>' +
        manca.join('</code>, <code>') + '</code>. Il modulo di pagamento compare da solo ' +
        'appena ci sono — gli ID dei piani hanno la forma <code>plan_…</code>.';
    }
    return pronto;
  }

  /* --- La scelta del piano ------------------------------------------------ */

  function scegli(p) {
    if (p === piano || !C.esiste(p)) return;
    piano = p;
    /* L'indirizzo segue la scelta: ricaricando, o mandando il link a
       qualcuno, si ritrova lo stesso piano. Il codice di chi ha presentato il
       cliente resta dov'è; l'esito di un pagamento precedente no. */
    const u = new URL(location.href);
    u.searchParams.set('piano', p);
    u.searchParams.delete('status');
    u.searchParams.delete('payment');
    history.replaceState(null, '', u);
    riepilogo();
    if (stato()) monta();
  }

  document.querySelectorAll('.ab-opt').forEach(function (b) {
    b.addEventListener('click', function () { scegli(b.dataset.piano); });
    /* Un gruppo di pulsanti radio si percorre con le frecce, come quelli veri. */
    b.addEventListener('keydown', function (e) {
      const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!passo) return;
      e.preventDefault();
      const i = C.PIANI.indexOf(piano);
      const altro = C.PIANI[(i + passo + C.PIANI.length) % C.PIANI.length];
      scegli(altro);
      document.querySelector('.ab-opt[data-piano="' + altro + '"]').focus();
    });
  });

  /* --- Avvio -------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (esitoEsterno()) return;
    riepilogo();
    if (stato()) monta();
  });

  /* Il modulo di Whop ha la sua lingua: cambiando quella della pagina va
     rimontato, o resterebbe un riquadro italiano dentro una pagina inglese. */
  document.addEventListener('sq:langchange', function () {
    riepilogo();
    if (!card.hidden && mountEl.dataset.lingua && mountEl.dataset.lingua !== C.lingua()) {
      monta();
    }
  });

})();
