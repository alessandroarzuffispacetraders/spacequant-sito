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
  version: '3.0.0',
  commit: '0e28f9e',
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
  downloadBase: 'https://github.com/alessandroarzuffispacetraders/spacequant-releases/releases/download/3.0.0',

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
      size: 446,
      sha256: '32cd77babc3420d28045b2ae03b75efc96e570c8b8030fb2b96afd8463bf7a63',
      os: 'mac', arch: 'arm64',
    },
    macIntel: {
      file: 'SpaceQuant-Algo-x64.dmg',
      size: 489,
      sha256: 'cfde76e5f6c8cfcf709f0c97340ce6a978d064ab53ea8059bcfb108af98526a6',
      os: 'mac', arch: 'x64',
    },
    winSetup: {
      file: 'SpaceQuant-Algo-Setup-x64.exe',
      size: 308,
      sha256: '80c47a209349d3c42111bb0b363a20925a379a7d678c764f65a9709db7a9d863',
      os: 'win', arch: 'x64',
    },
    winPortable: {
      file: 'SpaceQuant-Algo-portable-x64.zip',
      size: 452,
      sha256: '8f7eaba6f97477953f186f76fbc8eee57f5037ba0833514066d42789dab1dc4c',
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
