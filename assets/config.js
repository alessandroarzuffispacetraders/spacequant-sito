/* =============================================================================
   SpaceQuant — configurazione del sito
   -----------------------------------------------------------------------------
   Questo è l'UNICO file da toccare quando cambia una versione, un prezzo o un
   indirizzo. Le pagine leggono tutto da qui.

   ⚠️  I valori marcati DA_DEFINIRE non esistono ancora e vanno sostituiti prima
   di pubblicare. Finché contengono la stringa "DA_DEFINIRE", il sito lo mostra
   in modo visibile invece di produrre un link rotto silenzioso.
   ============================================================================= */

const CONFIG = {

  /* --- Versione pubblicata ------------------------------------------------ */
  version: '1.0.0',
  commit: '72687a5',
  releaseDate: '2026-08-13',

  /* --- Dove stanno gli installer -----------------------------------------
     Distribuzione da GITHUB RELEASES: una release per versione, i quattro file
     come allegati. Nessun dominio da collegare, nessun limite che i file
     superino (il tetto è 2 GB l'uno), traffico non fatturato.

     Qui va la parte dell'indirizzo che precede il nome del file, SENZA barra
     finale — il codice qui sotto aggiunge quella e il nome:

       https://github.com/UTENTE/REPO/releases/download/v3.0.0

     Il repository dev'essere pubblico: da uno privato gli allegati si scaricano
     solo con un token, e questo download è deliberatamente senza accesso.

     Cambiare distributore è questa riga sola: la forma «base + nome del file»
     è la stessa su GitHub, su un bucket R2 o su qualunque altro appoggio.     */
  downloadBase: 'https://github.com/alessandroarzuffispacetraders/spacequant-releases/releases/download/1.0.0',

  /* --- Checkout Whop ------------------------------------------------------
     Il pagamento NON lascia il sito: il modulo di Whop si apre in una finestra
     sopra pricing.html (o in abbonati.html, la stessa cosa come pagina). Whop
     elabora la carta in un riquadro suo — il sito non vede e non conserva
     nulla — ma intorno ci sono il nostro menu, il nostro riepilogo e i nostri
     colori.

     accent: il colore dei pulsanti DENTRO il modulo. Whop accetta solo nomi
             della sua tavolozza (violet, iris, indigo, blue, purple…), non
             codici: il più vicino al viola del marchio è `violet`. */
  whop: {
    accent: 'violet',
  },

  /* --- I piani ------------------------------------------------------------
     Tre, nell'ordine in cui si mostrano. Il nome del piano (mensile,
     trimestrale, annuale) è quello che viaggia negli indirizzi:
     abbonati.html?piano=annuale.

     whop:   l'ID DEL PIANO, non l'indirizzo: ha la forma `plan_…` ed è
             l'ultima parte del link di checkout di Whop
             (whop.com/checkout/plan_…). Dallo stesso ID si ricava il link
             diretto a whop.com, che il sito offre come ripiego.
     price:  ⚠️ deve coincidere ESATTAMENTE con quello del piano su Whop: un
             prezzo diverso fra sito e checkout è il modo più veloce di
             perdere fiducia. Letti sul checkout di Whop il 27 ottobre 2026,
             nessuno con periodo di prova. Cambiando un prezzo su Whop va
             cambiato qui.
     months: quanti mesi copre un pagamento. Serve a dire «pari a … al mese»
             e quanto si risparmia rispetto al mensile — calcolati qui, mai
             scritti a mano. */
  pricing: {
    currency: '€',
    devices: 2,             // limite dispositivi per abbonamento
    plans: {
      mensile:     { whop: 'plan_nEHt7m11K0Bjw', price: 69.99,  months: 1 },
      trimestrale: { whop: 'plan_0eQugEAEbBuZR', price: 189.99, months: 3 },
      annuale:     { whop: 'plan_4yIEFjd38dDEo', price: 699.99, months: 12 },
    },
  },

  /* --- La promozione -----------------------------------------------------
     Il codice sconto annunciato nel banner in cima a ogni pagina e nel
     riquadro del piano a cui vale. Nel modulo di pagamento di quel piano il
     codice è GIÀ INSERITO: chi paga non deve ricopiarlo.

     ⚠️ Il codice deve esistere su Whop (Codici promozionali) e valere per
     il piano scritto qui. Se non esiste, Whop apre il modulo a prezzo pieno
     senza errori in vista (verificato il 27 ottobre 2026) — cioè il banner
     prometterebbe uno sconto che non arriva.

     Finita la promozione: `promo: null`. Spariscono banner, riga nel
     riquadro e codice nel modulo, insieme. Il bollino «Il più acquistato»
     resta: non dipende dalla promozione. */
  promo: {
    code: 'SPACEQ50',
    plan: 'mensile',
  },

  /* --- L'evento ----------------------------------------------------------
     SiGMA World, padiglione FX World, Fiera Roma (2–5 novembre). Qui vanno i
     giorni in cui CI SIAMO NOI per gli incontri — il 3, il 4 e il 5, non il 2
     — e diventano i pulsanti «quando ci vediamo» del modulo in broker.html,
     col nome del giorno nella lingua della pagina, più «qualunque giorno».
     ⚠️ La frase sopra al modulo li ripete a parole («il 3, il 4 e il 5
     novembre»): sta nell'HTML perché deve leggersi anche senza JavaScript.
     Cambiando i giorni qui si cambia anche quella. */
  event: {
    days: ['2026-11-03', '2026-11-04', '2026-11-05'],
  },

  /* --- Contatti ----------------------------------------------------------- */
  supportEmail: 'info@oriontradedynamics.com',

  /* Numero WhatsApp in formato internazionale, SENZA «+», spazi o trattini:
     è la forma che vuole wa.me. Ci arriva chi chiede un incontro al SiGMA
     World da broker.html, col messaggio già scritto.

     ⚠️ QUI VA IL NUMERO, NON IL LINK BREVE. WhatsApp Business genera anche un
     indirizzo della forma `wa.me/message/CODICE`: è comodo da mandare a mano,
     ma **non può portare un messaggio precompilato**. Verificato il 14 agosto
     2026: aprendo `wa.me/message/PNSX5TR4UH4LP1?text=PROVA` si finisce allo
     stesso identico indirizzo che si raggiunge senza `?text=` — il parametro
     viene scartato dal reindirizzamento, in silenzio. Con quel link il
     modulo resterebbe in piedi e le richieste arriverebbero vuote: il guasto
     peggiore, perché non somiglia a un guasto.
     Il numero qui sotto è quello dietro a quel link breve. */
  whatsapp: '393513750293',

  /* --- Gli artefatti pubblicati -------------------------------------------
     ⚠️ NON si compilano a mano. Si verificano — e all'occorrenza si
     riscrivono — sui file veri:

         python tools/impronte.py ~/Desktop/SpaceQuant-3.0.0 [--scrivi]

     size:   in MEGABYTE DECIMALI (10⁶ byte), l'unità con cui macOS, Windows e
             i browser mostrano quel file. In MiB uscivano numeri più bassi del
             5%: «425 MB» accanto a un file che il sistema chiama «445,8 MB»
             fa dubitare di aver scaricato la cosa sbagliata, proprio mentre si
             sta verificando un'impronta.
     sha256: su Windows non c'è firma, e l'impronta è l'unico modo che ha una
             persona di sapere che il file è quello che abbiamo pubblicato noi.
             Una sbagliata è PEGGIO di nessuna: chi la controlla trova una
             differenza e conclude che il file è stato manomesso.             */
  builds: {
    macArm: {
      file: 'SpaceQuant-Algo-arm64.dmg',
      size: 470,
      sha256: 'ab72f6cf3ad7166ac6fdb4c36c9851878f5606b2877fc331c091274dbdc1746f',
      os: 'mac', arch: 'arm64',
    },
    macIntel: {
      file: 'SpaceQuant-Algo-x64.dmg',
      size: 517,
      sha256: 'd55b55d3954d82fe662f43d96cf6ed9e7c04d3dd358fb080733ecba66a29343f',
      os: 'mac', arch: 'x64',
    },
    winSetup: {
      file: 'SpaceQuant-Algo-Setup-x64.exe',
      size: 313,
      sha256: '326f0b87d374adf7d366ae2264129099b2053e8630653da39437b25f45dca0e5',
      os: 'win', arch: 'x64',
    },
    winPortable: {
      file: 'SpaceQuant-Algo-portable-x64.zip',
      size: 459,
      sha256: '3fa16a179e22978f92bd9e9d10c03626ea7d0ac3596adcd18a59894533c637f7',
      os: 'win', arch: 'x64',
    },
  },
};

/* Costruisce l'URL completo di un artefatto. Se il bucket non è ancora
   configurato restituisce null: chi chiama mostra un avviso invece di
   produrre un link che porta a una pagina di errore. */
CONFIG.urlFor = function (buildKey) {
  const b = CONFIG.builds[buildKey];
  if (!b) return null;
  if (CONFIG.downloadBase.indexOf('DA_DEFINIRE') === 0) return null;
  return CONFIG.downloadBase.replace(/\/+$/, '') + '/' + b.file;
};

/* true quando un valore di configurazione non è ancora stato deciso. */
CONFIG.isPlaceholder = function (value) {
  return typeof value === 'string' && value.indexOf('DA_DEFINIRE') === 0;
};

/* L'ID del piano Whop per 'mensile', 'trimestrale' o 'annuale', oppure null.
   Non basta che il valore non sia un segnaposto: dev'essere un ID. Un
   indirizzo intero incollato qui al posto dell'ID darebbe un modulo che non si
   apre, senza alcun errore visibile — quindi si rifiuta qui, e la pagina lo
   dice. */
CONFIG.whopPlan = function (piano) {
  const p = CONFIG.pricing.plans[piano];
  const v = p && p.whop;
  return (typeof v === 'string' && /^plan_[A-Za-z0-9]+$/.test(v)) ? v : null;
};
