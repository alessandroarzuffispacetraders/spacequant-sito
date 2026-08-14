/* =============================================================================
   SpaceQuant — pagina di download: scelta del file giusto
   -----------------------------------------------------------------------------
   Costruisce il riquadro in cima alla pagina a partire da SQDetect.

   Regola di condotta, la stessa del motore: quando l'architettura NON è
   determinabile, le due versioni macOS vengono mostrate con pari dignità e
   accompagnate dall'istruzione per verificare. Non si sceglie per l'utente
   quando la scelta sbagliata gli costa uno slot dispositivo.
   ============================================================================= */

(function () {

  const B = () => CONFIG.builds;

  /* --- Mattoncini di markup ---------------------------------------------- */

  /* Card del file consigliato. `strength` cambia solo l'aspetto:
     'primary' = scelta consigliata, 'equal' = una delle due opzioni pari. */
  function fileCard(buildKey, titleKey, titleIt, subKey, subIt, strength) {
    const b = B()[buildKey];
    return `
      <div class="pick ${strength === 'primary' ? 'pick-primary' : ''}">
        <div class="pick-body">
          <p class="pick-eyebrow" data-i18n="${titleKey}">${titleIt}</p>
          <h3 class="pick-title" data-i18n="${subKey}">${subIt}</h3>
          <p class="pick-file"><code>${b.file}</code> · ${b.size} MB</p>
        </div>
        <a class="btn ${strength === 'primary' ? 'btn-primary btn-lg' : 'btn-ghost'} pick-btn"
           data-build="${buildKey}" data-i18n="dl.get">Scarica</a>
      </div>`;
  }

  /* Riga discreta con l'alternativa. */
  function altRow(innerIt, innerKey) {
    return `<p class="pick-alt" data-i18n-html="${innerKey}">${innerIt}</p>`;
  }

  /* --- I casi ------------------------------------------------------------- */

  function renderMacKnown(arch) {
    const isArm = (arch === 'arm64');
    const main = isArm ? 'macArm' : 'macIntel';

    const card = isArm
      ? fileCard('macArm', 'dl.pick.det.arm', 'Rilevato: Mac con Apple Silicon',
                 'dl.pick.macArm', 'macOS · Apple Silicon', 'primary')
      : fileCard('macIntel', 'dl.pick.det.intel', 'Rilevato: Mac con processore Intel',
                 'dl.pick.macIntel', 'macOS · Intel', 'primary');

    const alt = isArm
      ? altRow('Hai un Mac Intel? <a href="#file-macIntel">Scarica invece la versione x64</a>.', 'dl.pick.altIntel')
      : altRow('Hai un Mac con chip Apple M? <a href="#file-macArm">Scarica invece la versione arm64</a>.', 'dl.pick.altArm');

    return card + alt + macWarning();
  }

  function renderMacUnknown() {
    return `
      <div class="note note-warn" style="margin-top:0">
        <div class="note-title" data-i18n="dl.pick.unknown.title">Il tuo browser non dice quale Mac hai</div>
        <p data-i18n-html="dl.pick.unknown.body">
          Safari non espone l'informazione, quindi qui non la indoviniamo: sceglierla
          a caso ti costerebbe uno slot dispositivo. Apri il menu Apple →
          <strong>Informazioni su questo Mac</strong> e guarda la prima riga.
        </p>
      </div>
      <div class="pick-pair">
        ${fileCard('macArm', 'dl.pick.ifChip', 'Se leggi «Chip: Apple M…»',
                   'dl.pick.macArm', 'macOS · Apple Silicon', 'equal')}
        ${fileCard('macIntel', 'dl.pick.ifIntel', 'Se leggi «Processore: Intel»',
                   'dl.pick.macIntel', 'macOS · Intel', 'equal')}
      </div>` + macWarning();
  }

  function macWarning() {
    return `
      <p class="pick-warn" data-i18n-html="dl.pick.warn">
        ⚠️ Le due versioni non sono intercambiabili: aprire quella sbagliata fa
        fallire l'accesso e <strong>occupa comunque uno dei tuoi due
        dispositivi</strong>. <a href="#macos">Perché succede</a>.
      </p>`;
  }

  function renderWindows() {
    return fileCard('winSetup', 'dl.pick.det.win', 'Rilevato: Windows',
                    'dl.pick.win', 'Windows · installer', 'primary')
      + altRow('Preferisci non installare nulla? <a href="#file-winPortable">Scarica la versione portable</a>.', 'dl.pick.altPortable')
      + `<p class="pick-warn" data-i18n-html="dl.pick.winWarn">
           ⚠️ Al primo avvio Windows mostrerà «Windows ha protetto il PC»:
           è previsto. <a href="#windows">Come procedere in due clic</a>.
         </p>`;
  }

  function renderOther(os) {
    const mobile = (os === 'ios' || os === 'android');
    return `
      <div class="note note-info" style="margin-top:0">
        <div class="note-title" data-i18n="${mobile ? 'dl.pick.mobile.title' : 'dl.pick.other.title'}">${
          mobile ? 'SpaceQuant è un\'applicazione per computer' : 'Nessuna versione per questo sistema'
        }</div>
        <p data-i18n="${mobile ? 'dl.pick.mobile.body' : 'dl.pick.other.body'}">${
          mobile
            ? 'Non esiste una versione per telefono o tablet: apri questa pagina dal Mac o dal PC su cui vuoi lavorare.'
            : 'Le versioni disponibili sono per macOS e Windows. Qui sotto trovi tutti i file.'
        }</p>
      </div>`;
  }

  /* --- Avvio -------------------------------------------------------------- */

  function render(result) {
    const slot = document.getElementById('detect-slot');
    if (!slot) return;

    let html;
    if (result.os === 'mac') {
      html = (result.arch && result.confidence !== 'unknown')
        ? renderMacKnown(result.arch)
        : renderMacUnknown();
    } else if (result.os === 'win') {
      html = renderWindows();
    } else {
      html = renderOther(result.os);
    }

    slot.innerHTML = html;

    // I nodi sono nuovi: vanno collegati alla configurazione e alla lingua.
    // Nota: SQLang è dichiarato con `const`, quindi NON esiste come
    // window.SQLang — controllarlo lì lo darebbe sempre per assente e il
    // riquadro resterebbe in italiano anche con la pagina in inglese.
    SQConfig.init();
    if (typeof SQLang !== 'undefined') SQLang.refresh();
  }

  document.addEventListener('DOMContentLoaded', function () {
    SQDetect.detect().then(render).catch(function () {
      render({ os: 'other', arch: null, confidence: 'unknown' });
    });
  });

})();
