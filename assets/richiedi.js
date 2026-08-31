/* =============================================================================
   SpaceQuant — il questionario di richiesta accesso
   -----------------------------------------------------------------------------
   Tre domande, poi WhatsApp con il messaggio già scritto.

   DOVE FINISCONO LE RISPOSTE: da nessuna parte. Non c'è un server, non c'è una
   richiesta che parte, non si scrive niente in memoria. Le risposte esistono
   solo dentro il messaggio che la persona vede e decide se mandare. È coerente
   con tutto il resto del sito — e va detto chiaro, perché ha una conseguenza:
   chi abbandona prima di premere invio non lascia traccia. Vale già così con
   l'email di oggi, quindi non è un peggioramento.

   IL TESTO DEL MESSAGGIO SEGUE LA LINGUA DELLA PAGINA. Chi lo manda deve poter
   leggere quello che sta mandando: un messaggio in italiano spedito da chi ha
   scelto l'inglese è qualcosa che si firma senza capire.
   ============================================================================= */

(function () {

  const form   = document.getElementById('rq-form');
  if (!form) return;

  const esito   = document.getElementById('rq-esito');
  const manca   = document.getElementById('rq-manca');
  const link    = document.getElementById('rq-link');
  const testoEl = document.getElementById('rq-testo');
  const qrEl    = document.getElementById('rq-qr');
  const mailEl  = document.getElementById('rq-mail');
  const nonConf = document.getElementById('rq-nonconf');
  const btnCopia = document.getElementById('rq-copia');
  const torna   = document.getElementById('rq-torna');

  /* --- Le etichette che finiscono nel messaggio ---------------------------
     Sono corte di proposito, e NON sono le stesse frasi che si leggono nel
     modulo: lì servono a scegliere, qui a essere lette di sfuggita in una chat.
     «Ho già strategie automatiche che girano in MetaTrader 5» diventa
     «strategie automatiche in MT5». Un messaggio che si legge in tre righe
     viene letto; uno di dieci righe si scorre. */
  const RISPOSTE = {
    it: {
      q1: {
        'a-mano':     'a mano, vorrei automatizzare',
        'gia-mt5':    'strategie automatiche già in MT5',
        'fuori-mt5':  'sviluppo strategie, ma fuori da MT5',
        'imparo':     'sto imparando',
      },
      q2: {
        'tester-mt5':  'strategy tester di MT5',
        'codice':      'codice mio (Python/R/altro)',
        'tradingview': 'TradingView / Pine',
        'non-provo':   'non in modo sistematico',
      },
      q3: {
        'verificare': 'verificare una strategia che uso già',
        'cercare':    'cercarne di nuove ottimizzando',
        'portare':    'portare in MT5 una strategia esterna',
        'capire':     'capire se fa al caso mio',
      },
    },
    en: {
      q1: {
        'a-mano':     'by hand, would like to automate',
        'gia-mt5':    'already running automated strategies in MT5',
        'fuori-mt5':  'I build strategies, but outside MT5',
        'imparo':     'still learning',
      },
      q2: {
        'tester-mt5':  'MT5 strategy tester',
        'codice':      'my own code (Python/R/other)',
        'tradingview': 'TradingView / Pine',
        'non-provo':   'not systematically',
      },
      q3: {
        'verificare': 'verify a strategy I already use',
        'cercare':    'find new ones by optimising',
        'portare':    'bring an outside strategy into MT5',
        'capire':     'work out whether it suits me',
      },
    },
  };

  const TESTI = {
    it: {
      /* ⚠️ La call sta nella STESSA frase d'apertura, non su una riga a parte:
         il messaggio resta di cinque righe — sotto la soglia oltre la quale in
         chat si scorre invece di leggere — e le due richieste sono una cosa
         sola, non un elenco di cose volute.
         Vale anche per chi arriva dall'abbonamento: la call è in corso, e
         chiederla solo a metà delle persone vorrebbe dire perderne metà. */
      apertura: (piano) => 'Ciao, vorrei richiedere l\'accesso a SpaceQuant' +
                           (piano ? ' (piano ' + piano + ')' : '') + 
                           ' e partecipare alla call di lancio.',
      r1: 'Oggi', r2: 'Provo le strategie', r3: 'Vorrei',
      oggetto: (piano) => 'Accesso a SpaceQuant e call di lancio' + (piano ? ' — piano ' + piano : ''),
      copiato: 'Copiato',
    },
    en: {
      apertura: (piano) => 'Hi, I would like to request access to SpaceQuant' +
                           (piano ? ' (' + piano + ' plan)' : '') + 
                           ' and join the launch call.',
      r1: 'Today', r2: 'I test strategies with', r3: 'I would like to',
      oggetto: (piano) => 'SpaceQuant access and launch call' + (piano ? ' — ' + piano + ' plan' : ''),
      copiato: 'Copied',
    },
  };

  /* Il piano arriva dalla pagina abbonamento: `richiedi.html?piano=annuale`.
     ⚠️ Non si fida di ciò che c'è nell'indirizzo — è testo che chiunque può
     scrivere, e finisce dentro un messaggio: si accettano solo i due valori
     previsti, tutto il resto diventa «nessun piano». */
  const PIANI = { it: { mensile: 'mensile', annuale: 'annuale' },
                  en: { mensile: 'monthly', annuale: 'annual' } };

  function pianoScelto(lang) {
    const q = new URLSearchParams(location.search).get('piano');
    return (q && PIANI[lang][q]) || null;
  }

  function lingua() {
    return document.documentElement.lang === 'en' ? 'en' : 'it';
  }

  function risposte() {
    const d = new FormData(form);
    return { q1: d.get('q1'), q2: d.get('q2'), q3: d.get('q3') };
  }

  function messaggio(lang) {
    const r = risposte();
    const T = TESTI[lang], R = RISPOSTE[lang];
    return [
      T.apertura(pianoScelto(lang)),
      '',
      T.r1 + ': ' + R.q1[r.q1],
      T.r2 + ': ' + R.q2[r.q2],
      T.r3 + ': ' + R.q3[r.q3],
    ].join('\n');
  }

  const numero = () => (CONFIG.whatsapp && !CONFIG.isPlaceholder(CONFIG.whatsapp))
                       ? String(CONFIG.whatsapp).replace(/[^\d]/g, '') : null;

  function urlWhatsApp(testo) {
    const n = numero();
    return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(testo) : null;
  }

  function urlMail(testo, lang) {
    return 'mailto:' + CONFIG.supportEmail +
           '?subject=' + encodeURIComponent(TESTI[lang].oggetto(pianoScelto(lang))) +
           '&body=' + encodeURIComponent(testo);
  }

  /* --- il codice QR -------------------------------------------------------
     Serve a chi compila al computer: inquadra col telefono e si ritrova la
     stessa chat con lo stesso messaggio, senza dover ricopiare nulla da uno
     schermo all'altro. È generato qui in pagina — vedi assets/qr.js per il
     perché non è un servizio esterno. */
  function disegnaQR(url) {
    qrEl.innerHTML = '';
    if (!url) return;
    try {
      /* Livello L: la correzione più leggera, quindi il codice più piccolo a
         parità di contenuto — cioè moduli più grandi nello stesso spazio a
         schermo. Su un monitor, dove il codice non è né stampato male né
         sgualcito, la robustezza in più non serve a niente e la dimensione sì. */
      qrEl.innerHTML = SQQR.svg(url, { level: 'L', quiet: 3, dark: '#1d1d1f' });
    } catch (e) {
      qrEl.textContent = '';
    }
  }

  function mostraEsito() {
    const lang = lingua();
    const testo = messaggio(lang);
    const wa = urlWhatsApp(testo);

    testoEl.textContent = testo;
    mailEl.href = urlMail(testo, lang);

    if (wa) {
      link.href = wa;
      link.hidden = false;
      disegnaQR(wa);
      qrEl.parentElement.hidden = false;
      if (nonConf) nonConf.hidden = true;
    } else {
      /* Senza numero non si produce un link che non apre nulla: si dice cosa
         manca e si lascia la via dell'email, che funziona. */
      link.hidden = true;
      qrEl.parentElement.hidden = true;
      if (nonConf) nonConf.hidden = false;
    }

    form.hidden = true;
    esito.hidden = false;
    esito.scrollIntoView({ block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const r = risposte();
    if (!r.q1 || !r.q2 || !r.q3) {
      manca.hidden = false;
      const primaMancante = ['q1', 'q2', 'q3'].find(k => !r[k]);
      const el = form.querySelector('input[name="' + primaMancante + '"]');
      if (el) el.closest('fieldset').scrollIntoView({ block: 'center' });
      return;
    }
    manca.hidden = true;
    mostraEsito();
  });

  form.addEventListener('change', function () {
    const r = risposte();
    if (r.q1 && r.q2 && r.q3) manca.hidden = true;
  });

  if (torna) {
    torna.addEventListener('click', function (e) {
      e.preventDefault();
      esito.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ block: 'start' });
    });
  }

  if (btnCopia) {
    btnCopia.addEventListener('click', function () {
      const testo = testoEl.textContent;
      const fatto = () => {
        const prima = btnCopia.textContent;
        btnCopia.textContent = TESTI[lingua()].copiato;
        setTimeout(() => { btnCopia.textContent = prima; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(testo).then(fatto, () => {});
      } else {
        /* Ripiego per i contesti senza appunti moderni (per esempio una pagina
           servita in http). Senza, il pulsante non farebbe nulla in silenzio. */
        const t = document.createElement('textarea');
        t.value = testo;
        t.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(t);
        t.select();
        try { document.execCommand('copy'); fatto(); } catch (err) {}
        document.body.removeChild(t);
      }
    });
  }

  /* Cambiando lingua a risultato già mostrato, il messaggio va rifatto: era
     rimasto nella lingua di prima, e con lui il codice QR. */
  document.addEventListener('sq:langchange', function () {
    if (!esito.hidden) mostraEsito();
  });

})();
