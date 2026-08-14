/* =============================================================================
   SpaceQuant — rilevamento di sistema operativo e architettura
   -----------------------------------------------------------------------------
   PERCHÉ ESISTE QUESTO FILE

   Su macOS l'impronta hardware della licenza è SHA256(UUID + architettura +
   hostname). Lo stesso Mac fisico produce quindi DUE identità diverse a seconda
   che giri la fetta arm64 o quella x64. Chi scarica la .dmg sbagliata non riceve
   un errore comprensibile: l'app parte, il login fallisce con «la licenza in
   cache non appartiene a questa macchina», e nel frattempo ha già consumato uno
   dei due slot dispositivo.

   Non è correggibile lato client senza rifare la Fase 3 del licensing, quindi si
   risolve qui: file giusto in evidenza, l'altro come alternativa spiegata.

   IL PRINCIPIO CHE SEGUE
   Lo stesso del motore: mai un ripiego silenzioso. Quando l'architettura non è
   determinabile — e su Safari spesso NON lo è, perché maschera il renderer —
   questo modulo restituisce `unknown` e la pagina mostra le due opzioni con pari
   dignità, spiegando come verificare in due secondi. Un'ipotesi sbagliata qui
   costa uno slot dispositivo all'utente: indovinare è peggio che chiedere.
   ============================================================================= */

const SQDetect = (function () {

  /* --- Sistema operativo -------------------------------------------------- */
  function detectOS() {
    const ua = navigator.userAgent || '';
    const plat = (navigator.userAgentData && navigator.userAgentData.platform) ||
                 navigator.platform || '';

    // iPadOS si dichiara come Mac: si distingue dal touch.
    const isIOS = /iPhone|iPad|iPod/.test(ua) ||
                  (/Mac/.test(plat) && navigator.maxTouchPoints > 1);
    if (isIOS) return 'ios';

    if (/Win/i.test(plat) || /Windows/i.test(ua)) return 'win';
    if (/Mac/i.test(plat) || /Mac OS X/i.test(ua)) return 'mac';
    if (/Android/i.test(ua)) return 'android';
    if (/Linux|X11/i.test(plat) || /Linux/i.test(ua)) return 'linux';
    return 'other';
  }

  /* --- Architettura, via Client Hints (Chromium) ---------------------------
     L'unica fonte che dichiara l'architettura in modo esplicito. Disponibile su
     Chrome, Edge, Brave, Opera. Restituisce 'arm' oppure 'x86'.

     ⚠️ Descrive il PROCESSO DEL BROWSER, non la macchina. Un Chrome installato
     come binario Intel su un Mac Apple Silicon gira sotto Rosetta e qui
     dichiara 'x86', pur essendo su un Mac M. Per questo viene interrogata DOPO
     il renderer WebGL, che invece vede la GPU reale. Verificato su questa
     macchina (Apple M4): Client Hints risponde 'arm' per un browser nativo.  */
  async function archFromClientHints() {
    if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) {
      return null;
    }
    try {
      const d = await navigator.userAgentData.getHighEntropyValues(['architecture']);
      if (!d || !d.architecture) return null;
      if (d.architecture === 'arm')  return { arch: 'arm64', confidence: 'certain', method: 'client-hints' };
      if (d.architecture === 'x86')  return { arch: 'x64',   confidence: 'certain', method: 'client-hints' };
      return null;
    } catch (e) {
      return null;
    }
  }

  /* --- Architettura, via renderer WebGL -----------------------------------
     Fonte interrogata per PRIMA, perché descrive l'hardware e non il processo:
     su Chrome la stringa è del tipo
        "ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)"
     e resta quella anche se il browser gira sotto Rosetta.

     ATTENZIONE alla stringa generica: Safari restituisce spesso "Apple GPU" per
     QUALUNQUE Mac, Intel compresi. Riconoscerla come Apple Silicon sarebbe
     esattamente il ripiego silenzioso che vogliamo evitare, quindi conta solo
     un numero di chip esplicito (Apple M1/M2/M3/M4...).

     Restituisce null anche quando il renderer è software (SwiftShader nei
     browser headless): una GPU emulata non dice nulla sulla macchina.        */
  function archFromWebGL() {
    let gl = null;
    try {
      const canvas = document.createElement('canvas');
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return null;

      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      if (!renderer) return null;

      const r = String(renderer);

      // Renderer software: non descrive la macchina, non conta.
      if (/SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(r)) return null;

      // Apple Silicon: il chip è dichiarato per numero.
      if (/Apple\s+M\d/i.test(r)) {
        return { arch: 'arm64', confidence: 'certain', method: 'webgl:' + r };
      }
      // GPU che su un Mac esistono solo nei modelli Intel.
      if (/Intel|AMD|Radeon|NVIDIA|GeForce/i.test(r)) {
        return { arch: 'x64', confidence: 'certain', method: 'webgl:' + r };
      }
      // "Apple GPU" e simili: NON discrimina. Si dichiara ignoto.
      return null;

    } catch (e) {
      return null;
    } finally {
      // Libera subito il contesto: su alcuni browser il numero di contesti
      // WebGL vivi è limitato.
      try {
        if (gl) {
          const lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        }
      } catch (e) { /* nulla da fare */ }
    }
  }

  /* --- API pubblica --------------------------------------------------------
     Restituisce { os, arch, confidence, method }
       os         'mac' | 'win' | 'linux' | 'ios' | 'android' | 'other'
       arch       'arm64' | 'x64' | null
       confidence 'certain' | 'likely' | 'unknown'
     Su Windows l'architettura non serve: c'è un solo binario x64 (su Windows
     ARM gira in emulazione, più lento al primo avvio ma funzionante).        */
  async function detect() {
    const os = detectOS();

    if (os !== 'mac') {
      return { os: os, arch: os === 'win' ? 'x64' : null, confidence: 'certain', method: 'os' };
    }

    // Prima l'hardware (GPU), poi il processo (Client Hints): vedi le note
    // sopra: le due fonti divergono quando il browser gira in emulazione, e in
    // quel caso è l'hardware ad avere ragione su quale .dmg serve.
    const webgl = archFromWebGL();
    if (webgl) return Object.assign({ os: 'mac' }, webgl);

    const hints = await archFromClientHints();
    if (hints) return Object.assign({ os: 'mac' }, hints);

    return { os: 'mac', arch: null, confidence: 'unknown', method: 'none' };
  }

  return { detect: detect, detectOS: detectOS };
})();
