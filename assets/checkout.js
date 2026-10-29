/* =============================================================================
   SpaceQuant — il modulo di pagamento di Whop, in comune
   -----------------------------------------------------------------------------
   Lo montano due posti: abbonati.html (il pagamento come pagina) e la finestra
   che si apre sopra pricing.html (il pagamento senza cambiare pagina). Le
   regole sono le stesse — quando il modulo si può montare, il prezzo, il
   codice di chi ha presentato il cliente, dove si va dopo — e stanno qui una
   volta sola: due copie divergerebbero al primo ritocco. I piani sono tre —
   mensile, trimestrale, annuale — in `CONFIG.pricing.plans`.

   COME FUNZIONA. Whop Elements (`elements.js`): si crea un «checkout» col
   piano e lo si monta in un contenitore, dove Whop mette il suo riquadro, che
   si ridimensiona da solo all'altezza del contenuto. Per cambiare piano o
   lingua lo si distrugge e se ne monta un altro: Whop non permette di
   cambiare il piano di un checkout già creato.
   ⚠️ NON il vecchio `loader.js` (js.whop.com/static/checkout), quello ad
   attributi `data-whop-checkout-*`: col piano vero risponde «Questo checkout
   non è più disponibile», mentre il link diretto e Elements funzionano.
   Verificato il 27 ottobre 2026 caricando il riquadro di ciascuno dei due.

   DOPO IL PAGAMENTO si va al download. Whop riporta il browser a `returnUrl`
   — abbonati.html — con `?status=` nell'indirizzo, sia quando il pagamento
   finisce dentro il riquadro sia dopo una pagina esterna (3-D Secure,
   PayPal…). È abbonati.html a decidere: riuscito → download, rifiutato → il
   modulo di nuovo, con l'errore accanto. Vale anche per la finestra di
   pricing.html. In nessun caso il sito «concede» qualcosa: l'abbonamento lo
   verifica l'app all'accesso con Whop. `?attivato=1` cambia un messaggio, non
   un permesso.

   NIENTE PARTE FINCHÉ NON SERVE. Lo script di Whop è l'unica richiesta a un
   servizio esterno di tutto il sito: in pricing.html si carica solo quando la
   mano arriva sul pulsante «Abbonati», e mai se mancano ID del piano o
   prezzo.
   ============================================================================= */

const SQCheckout = (function () {

  const SCRIPT = 'https://cdn.whop.com/elements/amber/elements.js';

  /* Dopo quanto un modulo che non è arrivato smette di essere «lento» e
     diventa «non arriva»: da lì il link diretto a whop.com passa in primo
     piano. Un blocco delle pubblicità o una rete aziendale possono fermare lo
     script senza alcun errore visibile. */
  const PAZIENZA_MS = 12000;

  /* Se dopo il pagamento Whop non ci ha già portati altrove, ci si va da
     soli: il pagamento c'è, e restare sul riquadro di conferma non serve. */
  const DOPO_MS = 1500;

  let script = null;               // la promessa dello script, una per pagina
  let whop = null;                 // l'istanza di Whop Elements, una per pagina
  const riquadri = new Set();      // i riquadri montati, da avvisare se lo script non arriva
  const attese = new WeakMap();    // riquadro → timer della pazienza
  const montati = new WeakMap();   // riquadro → checkout di Whop, da distruggere prima di rimontare
  const turni = new WeakMap();     // riquadro → ultimo montaggio chiesto

  const lingua = () => (document.documentElement.lang === 'en' ? 'en' : 'it');

  /* Il codice di chi ci ha presentato il cliente — un broker partner, per
     esempio — arriva come `?ref=`. Finisce dentro il modulo come codice
     affiliato di Whop, ed è così che un abbonamento si attribuisce a chi l'ha
     portato. ⚠️ È testo che chiunque può scrivere nell'indirizzo: passa solo se
     ha la forma di un codice, altrimenti non passa niente. */
  function riferimento() {
    const r = new URLSearchParams(location.search).get('ref');
    return (r && /^[A-Za-z0-9_-]{1,64}$/.test(r)) ? r : null;
  }

  const PIANI = Object.keys(CONFIG.pricing.plans);
  const piano = nome => CONFIG.pricing.plans[nome];
  const esiste = nome => PIANI.indexOf(nome) !== -1;

  function mancanti() {
    const m = [];
    PIANI.forEach(function (n) {
      const p = piano(n);
      if (typeof p.price !== 'number') m.push('pricing.plans.' + n + '.price');
      if (typeof p.months !== 'number') m.push('pricing.plans.' + n + '.months');
      if (!CONFIG.whopPlan(n)) m.push('pricing.plans.' + n + '.whop');
    });
    return m;
  }

  /* L'unica condizione in cui un modulo si monta: TUTTI i piani a posto. Un
     piano solo configurato a metà farebbe comparire un riquadro che su quel
     piano non si apre, ed è meglio saperlo dall'avviso giallo. */
  const pronto = () => mancanti().length === 0;

  /* Un importo come si scrive nella lingua della pagina: 69,99 in italiano,
     69.99 in inglese — e senza decimali se è tondo. Non passa da
     `data-cfg`, che scriverebbe il numero così com'è nel file, col punto. */
  function soldi(n) {
    if (typeof n !== 'number') return '—';
    const cifre = Number.isInteger(n) ? 0 : 2;
    return new Intl.NumberFormat(lingua() === 'en' ? 'en-US' : 'it-IT',
      { minimumFractionDigits: cifre, maximumFractionDigits: cifre }).format(n);
  }

  const prezzo = nome => soldi(piano(nome) && piano(nome).price);

  /* Quanto costa al mese un piano più lungo: 189,99 € in 3 mesi → 63,33.
     Arrotondato al centesimo, che è ciò che si legge. */
  function alMese(nome) {
    const p = piano(nome);
    if (!p || typeof p.price !== 'number' || !(p.months > 1)) return null;
    return soldi(Math.round(p.price / p.months * 100) / 100);
  }

  /* Il risparmio rispetto a pagare lo stesso periodo col mensile, solo se c'è
     davvero. La percentuale si arrotonda per DIFETTO: 9,5% si legge «9%», mai
     «10%». Un risparmio che si scopre più piccolo di quanto annunciato è
     esattamente il numero plausibile e sbagliato che questo prodotto non
     scrive. Gli euro sono quelli esatti. */
  function risparmio(nome) {
    const p = piano(nome), m = piano('mensile');
    if (!p || !m || p === m || typeof p.price !== 'number' || typeof m.price !== 'number') return null;
    const pieno = m.price * p.months;
    if (!(p.price < pieno)) return null;
    const euro = Math.round((pieno - p.price) * 100) / 100;
    return { euro: soldi(euro), pct: Math.floor((pieno - p.price) / pieno * 100) };
  }

  /* Le righe sotto al prezzo di un piano, nella lingua della pagina: «pari a
     … al mese» e il risparmio, ciascuna solo se c'è. Le scrive in `el`. */
  function descrivi(el, nome) {
    const en = lingua() === 'en', cur = CONFIG.pricing.currency;
    const mese = alMese(nome), r = risparmio(nome);
    el.innerHTML = '';
    if (mese) riga(el, 'plan-month', en ? `${cur}${mese} a month` : `pari a ${cur} ${mese} al mese`);
    if (r) riga(el, 'plan-save', en
      ? `you save ${cur}${r.euro} compared with monthly`
      : `risparmi ${cur} ${r.euro} rispetto al mensile`);
  }

  function riga(el, classe, testo) {
    const s = document.createElement('span');
    s.className = classe;
    s.textContent = testo;
    el.appendChild(s);
  }

  function lento(card) { card.classList.add('ab-slow'); }

  /* Si può chiamare in anticipo — quando la mano si avvicina al pulsante —
     per guadagnare il tempo dello script: il modulo arriva prima. */
  function carica() {
    if (!pronto()) {
      const no = Promise.reject(new Error('configurazione incompleta'));
      no.catch(function () {});   // chi chiama in anticipo non aspetta la risposta
      return no;
    }
    if (script) return script;
    script = new Promise(function (ok, ko) {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.setAttribute('data-whop-elements', '');   // come lo vuole la documentazione di Whop
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
    script.catch(function () { riquadri.forEach(lento); });
    return script;
  }

  /* Monta il modulo del piano `nome` dentro `mountEl` (che deve avere un id).
     `card` è il riquadro che lo contiene — riceve `ab-ready` quando il modulo
     è arrivato, `ab-slow` se non arriva — e `direct` il link di riserva a
     whop.com. */
  function monta(card, mountEl, direct, nome) {
    const plan = CONFIG.whopPlan(nome);
    const ref = riferimento();
    const lang = lingua();
    const turno = (turni.get(card) || 0) + 1;
    turni.set(card, turno);

    const prima = montati.get(card);
    if (prima) { try { prima.destroy(); } catch (e) { /* già distrutto */ } }
    montati.delete(card);
    mountEl.innerHTML = '';
    mountEl.dataset.lingua = lang;   // chi lo usa sa se va rimontato…
    mountEl.dataset.piano = nome;    // …per lingua o per piano
    card.classList.remove('ab-ready', 'ab-slow');
    clearTimeout(attese.get(card));
    riquadri.add(card);
    attese.set(card, setTimeout(function () { lento(card); }, PAZIENZA_MS));

    direct.href = 'https://whop.com/checkout/' + plan + '/' + (ref ? '?a=' + encodeURIComponent(ref) : '');

    carica().then(function () {
      // Un montaggio chiesto dopo questo (cambio di lingua mentre lo script
      // arrivava) ha la precedenza: questo non serve più.
      if (turni.get(card) !== turno) return;
      if (!whop) whop = window.WhopElements();

      const opzioni = {
        plan: plan,
        locale: lang,
        appearance: { theme: { appearance: 'light', accentColor: CONFIG.whop.accent || 'violet' } },
        /* Si torna ad abbonati.html, non al download: l'esito può essere
           anche un rifiuto, e va mostrato accanto al modulo per riprovare. */
        returnUrl: new URL('abbonati.html?piano=' + nome + (ref ? '&ref=' + ref : ''), location.href).href,
        onLoadingChange: function (carica) {
          if (carica) return;
          clearTimeout(attese.get(card));
          card.classList.add('ab-ready');
          const f = mountEl.querySelector('iframe');
          if (f) f.title = lang === 'en' ? 'Payment form' : 'Modulo di pagamento';
        },
        onComplete: function () {
          setTimeout(function () { location.href = 'download.html?attivato=1'; }, DOPO_MS);
        },
      };
      if (ref) opzioni.affiliateCode = ref;
      /* Il codice della promozione, già inserito: solo sul piano a cui vale,
         perché su un altro Whop lo segnalerebbe come non valido. */
      if (CONFIG.promo && CONFIG.promo.plan === nome && CONFIG.promo.code) {
        opzioni.promoCode = CONFIG.promo.code;
      }

      const checkout = whop.checkout.create(opzioni);
      checkout.create('checkout').mount('#' + mountEl.id);
      montati.set(card, checkout);
    }, function () { /* già segnalato: il riquadro è «lento» */ });
  }

  return {
    PIANI: PIANI, esiste: esiste,
    pronto: pronto, mancanti: mancanti,
    lingua: lingua, riferimento: riferimento,
    prezzo: prezzo, alMese: alMese, risparmio: risparmio, descrivi: descrivi,
    carica: carica, monta: monta,
  };
})();
