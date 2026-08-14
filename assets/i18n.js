/* =============================================================================
   SpaceQuant — dizionario inglese
   -----------------------------------------------------------------------------
   L'italiano NON sta qui: è scritto direttamente nell'HTML, così il sito resta
   leggibile anche senza JavaScript. Questo file contiene solo la traduzione.

   Regola per chi aggiunge testo: ogni elemento con data-i18n / data-i18n-html
   deve avere qui la sua chiave. Il controllo si fa con:
       node tools/check-i18n.js
   ============================================================================= */

const I18N_EN = {

  /* --- Testate delle pagine ----------------------------------------------
     Titolo e descrizione di ciascuna pagina. Sono le stringhe che finiscono
     nella scheda del browser, nel risultato di ricerca e nell'anteprima di un
     link condiviso: le tre occasioni in cui qualcuno legge il sito senza
     averlo ancora aperto. */
  'head.home.t': 'SpaceQuant — algorithmic strategy research for MetaTrader 5',
  'head.home.d': 'Desktop platform for algorithmic trading strategy research that exports Expert Advisors for MetaTrader 5. When something cannot be computed, it says so instead of inventing a number.',
  'head.pr.t':   'Pricing — SpaceQuant',
  'head.pr.d':   'One subscription, every feature, two devices. Monthly or yearly.',
  'head.dl.t':   'Download SpaceQuant',
  'head.dl.d':   'Download SpaceQuant for macOS and Windows. Installers you can verify with SHA256.',

  /* --- Navigazione e piè di pagina --------------------------------------- */
  'nav.how':      'How it works',
  'nav.pricing':  'Pricing',
  'nav.opt':      'Optimisation',

  'ft.tag':     'Algorithmic strategy research, with a verifiable export path to MetaTrader 5.',
  'ft.product': 'Product',
  'ft.support': 'Support',
  'ft.d1':      'SpaceQuant is a research and development tool. It is not a broker, it does not place orders, it does not access your trading account, and it does not provide financial advice.',
  'ft.d2':      'A backtest is a measurement over historical data, not a forecast of future results. Trading carries the risk of losing the capital you invest.',

  /* =========================================================================
     HOME
     ========================================================================= */
  'home.hero.h1':      'Your whole backtest,<br>in one click.',
  'home.hero.cta1':    'Request access',
  'home.cine.hint':    'Scroll',

  /* La barra strumenti dell'applicazione ricostruita nella scena */
  'home.app.indicator':   'Indicator',
  'home.app.occurrences': 'Occurrences',
  'home.app.debug':       'Debug',
  'home.app.replay':      'Replay',
  'home.panel.opt.t':     'Optimisation',
  'home.panel.pf.t':      'Portfolio',

  /* Le quattro capacità della sequenza d'apertura */
  'home.cap1.t':  'Search the markets',
  'home.cap1.b':  'One condition, the whole history: how many times it happened, and what followed.',
  'home.cap2.t':  'Optimise strategies',
  'home.cap2.b':  'Thousands of combinations, with in-sample and out-of-sample kept apart.',
  'home.cap3.t':  'Build portfolios',
  'home.cap3.b':  'Several strategies, several markets, one account — and you see how they live together.',
  'home.cap4.t':  'Export to MQL5',
  /* Lo spazio fra «MetaTrader» e «5» è unificatore ( ), come nell'HTML
     italiano: se va a capo lì, sotto resta il solo «5.». */
  'home.cap4.b':  'The strategy becomes an Expert Advisor that trades on its own in MetaTrader 5.',

  /* --- l'ottimizzazione vista in tre dimensioni --- */
  'home.opt.title': 'Every combination you tried, at a glance',
  'home.opt.sub':   'One point per configuration. The surfaces show where a strategy actually holds up, and where it merely shone at the spot it was picked.',
  'home.opt.m1':    'Expectancy (R)',
  'home.opt.m2':    'Max drawdown (R)',
  'home.opt.m3':    'Profit factor',
  'home.opt.m4':    'Longest stagnation (days)',
  'home.opt.note':  'The highlighted point is the chosen configuration. The axes are the two parameters explored.',




  'home.measure.eyebrow': 'Tested on a real terminal',
  'home.measure.cap':     'bars compared one by one between the engine and MetaTrader 5. <strong>Zero divergences.</strong>',
  'home.measure.note':    'It is a measurement, reported with its scope attached. It is not a promise about what will happen: a backtest remains a measurement over historical data.',
  'home.measure.p1':      'On 13 August 2026 the verification package was installed in MetaTrader 5, compiled and attached to an AUDUSD M5 chart. The largest deviation is 5×10⁻⁹: the precision with which the file writes numbers, not a difference.',


  'home.how.title':   'From strategy to market, in five steps',
  'home.how.lead':    'None of the five is a closed box: at every step the application tells you which numbers it is working with — and where it stops instead.',
  'home.how.s1.t':    'Build',
  'home.how.s1.b':    'Entry setups, condition tree, exits, risk management.',
  'home.how.s2.t':    'Measure',
  'home.how.s2.b':    'Backtest, with a count of the signals that never became trades — reason by reason.',
  'home.how.s3.t':    'Optimise',
  'home.how.s3.b':    'Thousands of combinations, with in-sample and out-of-sample kept apart.',
  'home.how.s4.t':    'Export',
  'home.how.s4.b':    'A <code>.mq5</code> file — or the reason it cannot be translated.',
  'home.how.s5.t':    'Verify',
  'home.how.s5.b':    'The EA starts in MetaTrader 5 and declares which numbers it is running with.',

  'home.feat.ind.t':    'You add the indicators yourself',
  'home.feat.ind.b':    'A file with a declared contract: name, parameters, how it should be drawn, the function that computes it. Yours and the bundled ones live in the same place and count the same — there is no closed list to pick from. The same goes for the strategy conditions.',
  'home.feat.ind.chip': '+ yours',

  'home.feat.ai.t':     'And AI sets up the work of writing them',
  'home.feat.ai.b':     'The application composes the text for you to paste: the contract to respect, the starting code, and what you are asking for. Whatever comes back, you read and save yourself. SpaceQuant calls no service on its own, and applies nothing on your behalf.',
  'home.feat.ai.panel': 'Prompt for the AI',
  'home.feat.ai.copy':  'Copy',
  'home.feat.ai.tag1':  'the contract',
  'home.feat.ai.tag2':  'the current code',
  'home.feat.ai.tag3':  'what you are asking for',
  'home.feat.ai.note':  'Paste it anywhere · read it · you save it',



  'home.end.title': 'Try it on your own data',
  'home.end.sub':   'One subscription, two devices, macOS and Windows.',
  'home.end.note':  'SpaceQuant is not a broker: it places no orders and never accesses your account.',

  /* =========================================================================
     ABBONAMENTO
     ========================================================================= */
  'pr.title': 'One subscription, every feature',
  'pr.sub':   'There are no tiers, and no features held back to push you up a plan: one licence, monthly or annual at a lower price.',

  'pr.req.lead': 'Access is by request: it is not bought from this page.',
  'pr.onreq':    'On request',
  'pr.req.cta':  'Request access',
  'pr.req.foot': 'A person replies, with the terms and the link to get started.',

  'pr.m.name': 'Monthly',
  'pr.m.desc': 'No minimum term: cancel whenever you want.',
  'pr.m.per':  '/ month',
  'pr.m.cta':  'Subscribe monthly',

  'pr.y.badge': 'Better value',
  'pr.y.name':  'Annual',
  'pr.y.desc':  'The same product, paid once a year.',
  'pr.y.per':   '/ year',
  'pr.y.cta':   'Subscribe annually',

  'pr.foot': 'Payment and invoicing handled by Whop.',

  'pr.inc.title':  'What you get',
  'pr.inc.i1':     'Strategy building: entry setups, condition tree, exits, management rules, risk sizing',
  'pr.inc.i2':     'Backtesting with a complete count of signals that never became trades, reason by reason',
  'pr.inc.i3':     'Parameter optimisation, in-sample / out-of-sample separation, trade replay on the chart',
  'pr.inc.i4':     'Expert Advisor export to MQL5, with an explicit refusal for anything that cannot be translated faithfully',
  'pr.inc.i5':     'Verification indicator package, to compare against the engine bar by bar',
  'pr.inc.i6':     'Market registry with declared provenance for every contract specification',
  'pr.inc.i7':     'Two devices per subscription, on macOS and Windows',
  'pr.inc.i8':     'Application updates included for as long as the subscription runs',
  'pr.inc.note.t': 'What you need to have already',
  'pr.inc.note.b': 'A Mac or a Windows PC, plus MetaTrader 5 if you want to compile and run the Expert Advisor you export. SpaceQuant is not a broker: it places no orders and never accesses your account.',

  'pr.start.eyebrow': 'From here to the app',
  'pr.start.title':   'Four steps',
  'pr.start.s1.t':    'Subscribe on Whop',
  'pr.start.s1.b':    'Payment happens on Whop\'s page: this site never handles or stores payment details.',
  'pr.start.r1.t':    'You write to us',
  'pr.start.r1.b':    'We reply with the terms and with the link to activate the subscription.',
  'pr.start.s2.t':    'You get the download link',
  'pr.start.s2.b':    'Right after activation you land on the download page, with the instructions for your system. On a Mac it matters which build you pick: Apple Silicon and Intel are not interchangeable.',
  'pr.start.s3.t':    'Sign in with Whop',
  'pr.start.s3.b':    'On first run the app opens your browser, you authorise with the same Whop account as your subscription, and you are returned to the application.',
  'pr.start.s4.t':    'Work, even offline',
  'pr.start.s4.b':    'The licence stays valid for 14 days and renews itself on any start with a connection.',

  'pr.faq.title': 'Questions',
  'pr.faq.q0':    'How do I get access?',
  'pr.faq.a0':    'You request it: write to us and we will send the terms and an activation link. There is no open checkout, and that is deliberate — we would rather stay close to the first users while there is still something to learn from every report.',
  'pr.faq.q1':    'How many computers can I use it on?',
  'pr.faq.a1':    'Two per subscription. There is no page yet for seeing which devices are linked or freeing one up: if you change computer, write to us and we will free the slot for you.',
  'pr.faq.q2':    'Does it work without an internet connection?',
  'pr.faq.a2':    'Yes. The licence is issued when you sign in and stays valid for 14 days; during that period the app works fully offline, and it renews itself on the first start with a connection.',
  'pr.faq.q3':    'How does the application update?',
  'pr.faq.a3':    'Manually for now: when a new version ships you download it from the download page and install it over the previous one. Your strategies and data stay where they are.',
  'pr.faq.q4':    'Do I need MetaTrader 5?',
  'pr.faq.a4':    'Not to build and measure strategies. You do need it to compile and run the exported Expert Advisor: compilation happens in MetaEditor, and it is always required before use, because SpaceQuant\'s internal checks do not replace the compiler.',
  'pr.faq.q5':    'How do I cancel?',
  'pr.faq.a5':    'From your Whop account, at any time. At the end of the period the licence simply stops renewing.',
  'pr.faq.q6':    'Does SpaceQuant trade for me?',
  'pr.faq.a6':    'No. It is not a broker, it places no orders, it never accesses your account and it gives no investment advice. It produces a file you decide whether to compile and where to use — and backtest results are not a forecast.',

  /* =========================================================================
     DOWNLOAD
     ========================================================================= */
  'dl.version': 'Version',
  'dl.build':   'build',
  'dl.title':   'Download SpaceQuant',
  'dl.sub':     'The download is open and requires no sign-in. Using the application does require an active subscription: without a valid licence the installer will install, but the app will do nothing.',

  'dl.nojs.title': 'Pick the file for your computer',
  'dl.nojs.body':  'With JavaScript enabled this page recognises your system and highlights the right file. The list below has every build.',

  /* Riquadro di scelta */
  'dl.pick.det.arm':      'Detected: Mac with Apple Silicon',
  'dl.pick.det.intel':    'Detected: Mac with an Intel processor',
  'dl.pick.det.win':      'Detected: Windows',
  'dl.pick.macArm':       'macOS · Apple Silicon',
  'dl.pick.macIntel':     'macOS · Intel',
  'dl.pick.win':          'Windows · installer',
  'dl.pick.altIntel':     'On an Intel Mac? <a href="#file-macIntel">Download the x64 build instead</a>.',
  'dl.pick.altArm':       'On a Mac with an Apple M chip? <a href="#file-macArm">Download the arm64 build instead</a>.',
  'dl.pick.altPortable':  'Would rather not install anything? <a href="#file-winPortable">Get the portable build</a>.',
  'dl.pick.ifChip':       'If it says “Chip: Apple M…”',
  'dl.pick.ifIntel':      'If it says “Processor: Intel”',
  'dl.pick.unknown.title':'Your browser won\'t say which Mac you have',
  'dl.pick.unknown.body': 'Safari does not expose it, so we will not guess: guessing would cost you a device slot. Open the Apple menu → <strong>About This Mac</strong> and read the first line.',
  'dl.pick.warn':         '⚠️ The two builds are not interchangeable: opening the wrong one makes sign-in fail and <strong>still uses up one of your two devices</strong>. <a href="#macos">Why this happens</a>.',
  'dl.pick.winWarn':      '⚠️ On first run Windows will show “Windows protected your PC”: that is expected. <a href="#windows">How to get past it in two clicks</a>.',
  'dl.pick.mobile.title': 'SpaceQuant is a desktop application',
  'dl.pick.mobile.body':  'There is no phone or tablet version: open this page on the Mac or PC you want to work on.',
  'dl.pick.other.title':  'No build for this system',
  'dl.pick.other.body':   'The available builds are for macOS and Windows. Every file is listed below.',

  /* Elenco file */
  'dl.all.title':      'All files',
  'dl.all.sub':        'Every file carries its SHA256 fingerprint. The Windows binaries are unsigned: the fingerprint is the only way for you to know the file you downloaded is the one we published.',
  'dl.get':            'Download',
  'dl.copy':           'Copy',
  'dl.copyHash':       'Copy the SHA256 fingerprint',
  'dl.f.macArm':       'macOS · Apple Silicon (M1, M2, M3, M4)',
  'dl.f.macIntel':     'macOS · Intel',
  'dl.f.winSetup':     'Windows · installer',
  'dl.f.winPortable':  'Windows · no installation',
  'dl.verify.title':   'How to check the fingerprint',
  'dl.verify.sub':     'One command, and the result must match the published fingerprint character for character. If it doesn\'t, don\'t open the file.',

  /* macOS */
  'dl.mac.title':       'Why the right build genuinely matters',
  'dl.mac.warn.title':  '⚠️ Downloading the wrong build uses up a device slot',
  'dl.mac.warn.body':   'The identity your licence uses to recognise your computer depends in part on the architecture. The same physical Mac produces two different identities depending on which build you open: open the wrong one and the app starts, sign-in fails with “the cached licence does not belong to this machine”, and one of your two devices is taken up all the same.',
  'dl.mac.check.title': 'How to tell which Mac you have, in two seconds',
  'dl.mac.check.body':  'Apple menu (top left) → <strong>About This Mac</strong>.',
  'dl.mac.check.arm':   'If it reads <strong>Chip: Apple M1 / M2 / M3 / M4</strong>, you need the <strong>arm64</strong> file.',
  'dl.mac.check.intel': 'If it reads <strong>Processor: Intel</strong>, you need the <strong>x64</strong> file.',
  'dl.mac.slow.title':  'Intel Macs: the first launch is slow',
  'dl.mac.slow.body':   'About 90 seconds, once: that is the Rosetta translation macOS performs on first launch. Later launches are normal. It is not a freeze, even though it looks like one.',

  /* Windows */
  'dl.win.title':      'Windows will show a warning. That is expected.',
  'dl.win.body':       'The Windows binaries are not signed with a commercial certificate, so SmartScreen shows “Windows protected your PC” the first time you open the installer. It is not an error, and not a sign that the file is compromised: it is what Windows does with any program whose publisher hasn\'t paid for a certificate. To actually verify the file, compare the SHA256 fingerprint above.',
  'dl.win.step1':      'Click <strong>More info</strong>.',
  'dl.win.step2':      'Click <strong>Run anyway</strong>.',

  /* Le parole esatte della finestra di SmartScreen: su un Windows inglese
     l'utente cerca queste, non la loro traduzione. */
  'ss.title': 'Windows protected your PC',
  'ss.text':  'Microsoft Defender SmartScreen prevented an unrecognised app from starting.',
  'ss.more':  'More info',
  'ss.dont':  'Don\'t run',
  'ss.run':   'Run anyway',
  'ss.pub':   'App: SpaceQuant-Algo-Setup-x64.exe<br>Publisher: Unknown publisher',
  'dl.win.av.title':   'Antivirus: a false positive can happen',
  'dl.win.av.body':    'The application is compiled with Nuitka and is unsigned: some antivirus products flag programs with those characteristics heuristically, even when there is nothing malicious. If it happens, check the SHA256 fingerprint: if it matches the published one, the file is exactly what we produced.',
  'dl.win.name.title': 'A long Windows username stops the installation',
  'dl.win.name.body':  'The measured limit is 30 characters. Past that the installer stops immediately and tells you how many characters it found and what the limit is, instead of breaking down halfway. The fix is to install from a Windows account with a shorter name.',

  /* Dopo l'installazione */
  'dl.after.eyebrow':   'After installing',
  'dl.after.title':     'The first run, step by step',
  'dl.after.s1.t':      'Sign-in screen',
  'dl.after.s1.b':      'On opening, the app asks you to sign in before anything else.',
  'dl.after.s2.t':      'Sign in with Whop',
  'dl.after.s2.b':      'Your usual browser opens, where you authorise access with the Whop account you subscribed with. Once authorised, the browser hands control back to the application.',
  'dl.after.s3.t':      'Subscription check',
  'dl.after.s3.b':      'The server checks that the subscription is active and that you are within the device limit, then issues a signed licence to the app.',
  'dl.after.s4.t':      'From then on, offline too',
  'dl.after.s4.b':      'The licence stays valid for 14 days and renews itself on any start with a connection. If you work without a network, the app keeps running until it expires.',
  'dl.after.dev.title': 'Two devices per subscription',
  'dl.after.dev.body':  'You can run SpaceQuant on two computers. There is no page yet for seeing which devices are linked or freeing one up: if you change computer, or if you used up a slot by mistake, write to us and we will free the slot.',
  'dl.after.upd.title': 'Updates',
  'dl.after.upd.body':  'The application does not update itself. When a new version ships you come back to this page, download it and install over the previous one: your strategies and data stay where they are.',

  /* Problemi */
  'dl.trouble.title':   'If something goes wrong',
  'dl.trouble.sub':     'The things that come up most often, and what they actually mean.',
  'dl.trouble.th1':     'What you see',
  'dl.trouble.th2':     'What happened',
  'dl.trouble.r1a':     '“The cached licence does not belong to this machine”',
  'dl.trouble.r1b':     'You installed the wrong macOS architecture. Download the other one and write to us to free the slot that was taken.',
  'dl.trouble.r2a':     '“Windows protected your PC”',
  'dl.trouble.r2b':     'SmartScreen: expected, the binary is unsigned. More info → Run anyway.',
  'dl.trouble.r3a':     'The Windows installation stops halfway',
  'dl.trouble.r3b':     'The Windows username is longer than 30 characters. Install from an account with a shorter name.',
  'dl.trouble.r4a':     'The first launch takes about a minute',
  'dl.trouble.r4b':     'On an Intel Mac that is the Rosetta translation, once only. On Windows ARM it is the x64 binary running under emulation.',
  'dl.trouble.r5a':     'The Concepts section is empty',
  'dl.trouble.r5b':     'This one is not normal: the bundled Concepts should be there. Please report it.',
  'dl.trouble.contact': 'For anything else, write to us: a person answers, not a form.',

};
