const STRONG_KWS = [
  'porn', 'qorno', 'xxx', 'xnxx', 'xvideos', 'erotic', 'redtube', 'hentai',
  'nsfw', 'incest', 'milf', 'camgirl', 'onlyfans', 'fetish', 'bdsm',
  'horny', 'orgasm', 'masturbat', 'blowjob', 'handjob', 'gangbang',
  'creampie', 'fap', 'jizz', 'smut', 'lewd', 'xhamster', 'spankbang',
  'brazzers', 'nubile', 'flyflv', 'tube8', '4tube', 'drtuber',
  'threesome', 'foursome',
  'whore', 'wank', 'dildo', 'vibrator',
  'rimjob', 'deepthroat', 'cuckold', 'voyeur', 'upskirt',
  'chaturbate', 'bangbros', 'shemale',
  'twink', 'yaoi', 'ecchi', 'ahegao', 'doujin', 'lolicon', 'rule34',
  'fuck', 'slut', 'boobs', 'busty', 'pussy', 'nude', 'kinky', 'sex', 'doggystyle'
];
const WEAK_KWS = [
  'sex', 'tits', 'cum', 'anal', 'cock',
  'orny', 'dick', 'naked', 'naughty',
  'amateur', 'stripper', 'escort', 'squirt', 'facial'
];
const WHITELIST_TLDS    = ['.gov', '.edu'];
const WHITELIST_DOMAINS = [
  'wikipedia.org', 'mayoclinic.org', 'nih.gov', 'who.int',
  'youtube.com', 'google.com', 'github.com', 'stackoverflow.com'
];

function isWhitelisted(host, userList) {
  if (WHITELIST_TLDS.some(t => host.endsWith(t))) return true;
  if (WHITELIST_DOMAINS.some(d => host === d || host.endsWith('.' + d))) return true;
  return userList.some(d => host === d || host.endsWith('.' + d));
}

function autoMatches(text) {
  if (STRONG_KWS.some(k => text.includes(k))) return true;
  return WEAK_KWS.filter(k => text.includes(k)).length >= 2;
}

function goBlocked(kw) {
  const base = chrome.runtime.getURL('blocked.html');
  window.location.replace(kw ? `${base}?kw=${encodeURIComponent(kw)}` : base);
}

(async () => {
  if (window.top !== window.self) return;
  if (!['http:', 'https:'].includes(window.location.protocol)) return;

  try {
    const data = await chrome.storage.sync.get([
      'keywords', 'enabled', 'scheduleEnabled', 'scheduleStart', 'scheduleEnd',
      'keywordBlockingEnabled', 'whitelist'
    ]);

    if (data.enabled === false) return;

    if (data.scheduleEnabled) {
      const now  = new Date();
      const [sh, sm] = (data.scheduleStart || '09:00').split(':').map(Number);
      const [eh, em] = (data.scheduleEnd   || '21:00').split(':').map(Number);
      const mins = now.getHours() * 60 + now.getMinutes();
      if (mins < sh * 60 + sm || mins >= eh * 60 + em) return;
    }

    const hostname = window.location.hostname.replace(/^www\./, '');
    if (isWhitelisted(hostname, data.whitelist || [])) return;

    // ---- User-defined keyword list ----
    const userKws = (data.keywords || []).map(k => k.toLowerCase());
    if (userKws.length) {
      const urlHit = userKws.find(k => window.location.href.toLowerCase().includes(k));
      if (urlHit) { goBlocked(urlHit); return; }

      let obs;
      const checkUserTitle = () => {
        const hit = userKws.find(k => document.title.toLowerCase().includes(k));
        if (hit) { obs?.disconnect(); goBlocked(hit); }
      };
      checkUserTitle();
      obs = new MutationObserver(checkUserTitle);
      obs.observe(document.head, { subtree: true, childList: true, characterData: true });
    }

    // ---- Auto keyword detection ----
    if (data.keywordBlockingEnabled === false) return;

    const urlText = `${hostname} ${window.location.pathname.toLowerCase()}`;
    if (autoMatches(urlText)) { goBlocked(null); return; }

    let autoObs;
    const checkAutoTitle = () => {
      if (autoMatches(document.title.toLowerCase())) { autoObs?.disconnect(); goBlocked(null); }
    };
    checkAutoTitle();
    autoObs = new MutationObserver(checkAutoTitle);
    autoObs.observe(document.head, { subtree: true, childList: true, characterData: true });

  } catch (_) {}
})();
