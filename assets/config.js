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
  version: '3.8.4',
  commit: 'd925ba7',
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
  downloadBase: 'https://github.com/alessandroarzuffispacetraders/spacequant-releases/releases/download/3.8.4',

  /* --- Checkout Whop ------------------------------------------------------
     Whop ospita già la pagina di pagamento: il sito non incassa nulla,
     manda soltanto qui. Servono solo quando pricing.mode passa a 'public'. */
  whop: {
    monthly: 'DA_DEFINIRE_URL_WHOP_MENSILE',
    yearly:  'DA_DEFINIRE_URL_WHOP_ANNUALE',
  },

  /* --- Prezzi -------------------------------------------------------------
     mode: 'onRequest' → i due piani mostrano «su richiesta» e il pulsante
                         scrive all'indirizzo di contatto. È lo stato di oggi:
                         l'accesso si richiede, quindi non c'è un checkout
                         aperto a tutti.
     mode: 'public'    → compaiono i prezzi qui sotto e i pulsanti portano al
                         checkout Whop. Passando a 'public' vanno compilati
                         monthly, yearly E i due URL di whop.

     I prezzi, quando ci saranno, devono coincidere ESATTAMENTE con quanto
     configurato su Whop: un prezzo diverso fra sito e checkout è il modo più
     veloce di perdere fiducia.                                               */
  pricing: {
    mode: 'onRequest',
    currency: '€',
    monthly: null,          // es. 49
    yearly: null,           // es. 490
    devices: 2,             // limite dispositivi per abbonamento
  },

  /* --- Contatti ----------------------------------------------------------- */
  supportEmail: 'info@oriontradedynamics.com',

  /* Numero WhatsApp in formato internazionale, SENZA «+», spazi o trattini:
     è la forma che vuole wa.me. Ci arriva chi compila il questionario in
     richiedi.html, con le tre risposte già scritte nel messaggio.

     ⚠️ QUI VA IL NUMERO, NON IL LINK BREVE. WhatsApp Business genera anche un
     indirizzo della forma `wa.me/message/CODICE`: è comodo da mandare a mano,
     ma **non può portare un messaggio precompilato**. Verificato il 14 agosto
     2026: aprendo `wa.me/message/PNSX5TR4UH4LP1?text=PROVA` si finisce allo
     stesso identico indirizzo che si raggiunge senza `?text=` — il parametro
     viene scartato dal reindirizzamento, in silenzio. Con quel link il
     questionario resterebbe in piedi e le risposte non arriverebbero mai:
     il guasto peggiore, perché non somiglia a un guasto.
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
      size: 463,
      sha256: 'e1d09e6163949ea1c7346fe9da26921ebe47412c09deac45fa6703889c9ca12f',
      os: 'mac', arch: 'arm64',
    },
    macIntel: {
      file: 'SpaceQuant-Algo-x64.dmg',
      size: 510,
      sha256: 'cb0e8f2850328fb405fda453d54c8de9aa3052328a8aea5fc413e049e0d727c4',
      os: 'mac', arch: 'x64',
    },
    winSetup: {
      file: 'SpaceQuant-Algo-Setup-x64.exe',
      size: 309,
      sha256: '2276b8394f294dafb9f5d916f184bf838d49d63ce23bc1ee8329d8739a37da22',
      os: 'win', arch: 'x64',
    },
    winPortable: {
      file: 'SpaceQuant-Algo-portable-x64.zip',
      size: 453,
      sha256: '193e01e73e37c80d2c674eed1f73ed88c160e400eef0bd1cda54f7a73c5848a3',
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
