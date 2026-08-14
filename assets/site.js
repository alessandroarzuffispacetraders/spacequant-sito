/* =============================================================================
   SpaceQuant — logica comune a tutte le pagine
   -----------------------------------------------------------------------------
   Tre compiti:
     1. lingua (IT di default nell'HTML, EN dal dizionario in i18n.js)
     2. iniezione dei valori di configurazione (prezzi, pesi, hash, link)
     3. piccole interazioni (copia negli appunti)

   L'italiano è scritto direttamente nell'HTML: senza JavaScript il sito resta
   leggibile e navigabile, e perde soltanto la traduzione inglese.
   ============================================================================= */

/* ===========================================================================
   1. LINGUA
   =========================================================================== */

const SQLang = (function () {
  const KEY = 'sq-lang';
  const SUPPORTED = ['it', 'en'];
  let current = 'it';

  /* Alla prima esecuzione conserviamo il testo italiano scritto nell'HTML, così
     tornare a IT non richiede di ricaricare la pagina. */
  function snapshotItalian() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.dataset.itText === undefined) el.dataset.itText = el.textContent;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      if (el.dataset.itHtml === undefined) el.dataset.itHtml = el.innerHTML;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      const attr = el.dataset.i18nAttr.split(':')[0];
      if (el.dataset.itAttr === undefined) el.dataset.itAttr = el.getAttribute(attr) || '';
    });
  }

  function resolve(key) {
    return (typeof I18N_EN !== 'undefined' && I18N_EN[key]) || null;
  }

  function apply(lang) {
    const toEnglish = (lang === 'en');

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const t = toEnglish ? resolve(el.dataset.i18n) : el.dataset.itText;
      if (t != null) el.textContent = t;
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const t = toEnglish ? resolve(el.dataset.i18nHtml) : el.dataset.itHtml;
      if (t != null) el.innerHTML = t;
    });

    /* Attributi: data-i18n-attr="aria-label:chiave" */
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      const parts = el.dataset.i18nAttr.split(':');
      const attr = parts[0], key = parts[1];
      const t = toEnglish ? resolve(key) : el.dataset.itAttr;
      if (t != null) el.setAttribute(attr, t);
    });

    document.documentElement.lang = lang;
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    current = lang;
    document.dispatchEvent(new CustomEvent('sq:langchange', { detail: { lang: lang } }));
  }

  function set(lang, remember) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    if (remember) { try { localStorage.setItem(KEY, lang); } catch (e) {} }
    apply(lang);
  }

  /* Priorità: ?lang= nell'URL → scelta salvata → lingua del browser → IT */
  function initial() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED.indexOf(q) !== -1) return q;

    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;

    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'it';
    return nav.toLowerCase().indexOf('it') === 0 ? 'it' : 'en';
  }

  function init() {
    snapshotItalian();
    apply(initial());

    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', function () { set(b.dataset.lang, true); });
    });
  }

  /* Da chiamare quando del markup nuovo viene aggiunto alla pagina (per esempio
     il riquadro di scelta della pagina download, costruito dopo il rilevamento):
     conserva l'italiano dei nodi nuovi e riapplica la lingua in uso. */
  function refresh() {
    snapshotItalian();
    apply(current);
  }

  return {
    init: init,
    set: set,
    refresh: refresh,
    get: function () { return current; },
  };
})();


/* ===========================================================================
   2. CONFIGURAZIONE → PAGINA
   Riempie ogni [data-cfg="percorso"] con il valore corrispondente di CONFIG.
   Se il valore è un segnaposto non ancora deciso, lo segnala a schermo: un
   link rotto silenzioso è peggio di un avviso visibile.
   =========================================================================== */

const SQConfig = (function () {

  function valueAt(path) {
    return path.split('.').reduce(function (o, k) {
      return (o == null) ? null : o[k];
    }, CONFIG);
  }

  function fillText() {
    document.querySelectorAll('[data-cfg]').forEach(function (el) {
      const v = valueAt(el.dataset.cfg);
      if (v == null || CONFIG.isPlaceholder(v)) {
        el.textContent = 'da definire';
        el.classList.add('todo-flag');
      } else {
        el.textContent = v;
      }
    });
  }

  /* Link: data-cfg-href="whop.monthly" */
  function fillLinks() {
    document.querySelectorAll('[data-cfg-href]').forEach(function (el) {
      const v = valueAt(el.dataset.cfgHref);
      if (v == null || CONFIG.isPlaceholder(v)) {
        markUnavailable(el, 'Link non ancora configurato');
      } else {
        // Un indirizzo email va aperto come mailto:, non come pagina.
        const isEmail = (v.indexOf('@') !== -1 && v.indexOf('://') === -1);
        el.href = isEmail ? 'mailto:' + v : v;
      }
    });
  }

  /* Download: data-build="macArm" imposta href, nome file e peso */
  function fillDownloads() {
    document.querySelectorAll('[data-build]').forEach(function (el) {
      const key = el.dataset.build;
      const url = CONFIG.urlFor(key);
      if (!url) {
        markUnavailable(el, 'File non ancora pubblicato');
      } else {
        el.href = url;
        el.setAttribute('download', '');
      }
    });
  }

  function markUnavailable(el, reason) {
    el.removeAttribute('href');
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('title', reason);
    el.style.opacity = '.5';
    el.style.cursor = 'not-allowed';
    el.addEventListener('click', function (e) { e.preventDefault(); });
  }

  function init() {
    fillText();
    fillLinks();
    fillDownloads();
  }

  return { init: init, valueAt: valueAt };
})();


/* ===========================================================================
   3. COPIA NEGLI APPUNTI
   Usato per gli SHA256 e per i comandi di verifica.
   =========================================================================== */

const SQCopy = (function () {

  function feedback(btn, ok) {
    const label = btn.querySelector('.copy-label') || btn;
    const original = label.textContent;
    label.textContent = ok
      ? (SQLang.get() === 'en' ? 'Copied' : 'Copiato')
      : (SQLang.get() === 'en' ? 'Failed' : 'Non riuscito');
    btn.classList.toggle('copied', ok);
    setTimeout(function () {
      label.textContent = original;
      btn.classList.remove('copied');
    }, 1800);
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      feedback(btn, true);
    } catch (e) {
      // Fallback per contesti non sicuri (file:// su alcuni browser)
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        feedback(btn, true);
      } catch (e2) {
        feedback(btn, false);
      }
    }
  }

  function init() {
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        // data-copy contiene il testo, oppure il selettore dell'elemento da cui leggerlo
        const raw = btn.dataset.copy;
        const target = raw.charAt(0) === '#' ? document.querySelector(raw) : null;
        copy(target ? target.textContent.trim() : raw, btn);
      });
    });
  }

  return { init: init };
})();


/* ===========================================================================
   Avvio
   =========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  SQConfig.init();   // prima la configurazione: crea testo che poi va tradotto
  SQLang.init();
  SQCopy.init();
});
