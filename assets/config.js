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
  version: '3.2.0',
  commit: 'e1d7bc4',
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
  downloadBase: 'https://github.com/alessandroarzuffispacetraders/spacequant-releases/releases/download/3.2.0',

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
      size: 447,
      sha256: '5c81ec415c8ff11928df903cfa94b0f2c4ab8239a4eec557092a74650f6b3ce4',
      os: 'mac', arch: 'arm64',
    },
    macIntel: {
      file: 'SpaceQuant-Algo-x64.dmg',
      size: 490,
      sha256: '6384caa0669b66b8bb44fd83bff67cc98291e6a843acd87b1bde7dc75882c29d',
      os: 'mac', arch: 'x64',
    },
    winSetup: {
      file: 'SpaceQuant-Algo-Setup-x64.exe',
      size: 308,
      sha256: 'c535933e718a1471924c084b5cf605c54f1726e581e91b8436743a0d188372ac',
      os: 'win', arch: 'x64',
    },
    winPortable: {
      file: 'SpaceQuant-Algo-portable-x64.zip',
      size: 453,
      sha256: 'c8056ab5a30e6824a1ff68b7b03ad40bc9ddde64198d7218c0af4cb8c1616f12',
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
