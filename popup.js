const $ = (id) => document.getElementById(id);

const CONFIRM_PHRASE = "I am choosing to disable my focus blocker.";
const DAY_MS = 86400000;

const sync  = { get: (k) => chrome.storage.sync.get(k),  set: (o) => chrome.storage.sync.set(o) };
const local = { get: (k) => chrome.storage.local.get(k), set: (o) => chrome.storage.local.set(o) };

function setStatus(msg) {
  $("status").textContent = msg;
  if (msg) setTimeout(() => { if ($("status").textContent === msg) $("status").textContent = ""; }, 2500);
}

function normalizeDomain(input) {
  return input.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function notifyBackground() {
  chrome.runtime.sendMessage({ type: "applyState" }).catch(() => {});
}

// ---- Tabs ----
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

// ---- Init ----
async function init() {
  const [s, l] = await Promise.all([
    sync.get(["customSites", "keywords", "customMessage", "enabled",
              "scheduleEnabled", "scheduleStart", "scheduleEnd", "streakStart",
              "keywordBlockingEnabled", "whitelist"]),
    local.get(["blockCount", "weekStart"]),
  ]);

  // Header toggle
  $("toggle").checked = s.enabled !== false;

  // Stat card — weekly count
  const now = Date.now();
  const weekMs = 7 * DAY_MS;
  const weekStart = l.weekStart || now;
  const count = (now - weekStart > weekMs) ? 0 : (l.blockCount || 0);
  $("count").textContent = count;

  // Stat card — streak
  const days = s.streakStart ? Math.floor((now - s.streakStart) / DAY_MS) : 0;
  $("streakDays").textContent = days;
  $("streakBig").textContent  = days;
  if (s.streakStart) {
    $("streakSince").textContent = "Since " + new Date(s.streakStart).toLocaleDateString();
  } else {
    $("streakSince").textContent = "";
  }

  // Block tab
  renderSites(s.customSites || []);
  $("customMessage").value = s.customMessage || "";

  // Schedule tab
  $("scheduleEnabled").checked = !!s.scheduleEnabled;
  $("scheduleStart").value = s.scheduleStart || "09:00";
  $("scheduleEnd").value   = s.scheduleEnd   || "21:00";
  updateScheduleOpacity();

  // Keywords tab
  $("keywordBlockingEnabled").checked = s.keywordBlockingEnabled !== false;
  renderKeywords(s.keywords || []);
  renderWhitelist(s.whitelist || []);
}

init();

// ---- Render helpers ----
function renderSites(sites) {
  const ul = $("customList");
  ul.innerHTML = "";
  if (!sites.length) { ul.innerHTML = '<li class="empty">No custom sites yet.</li>'; return; }
  sites.forEach(site => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${site}</span><button class="remove" data-val="${site}" title="Remove">×</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".remove").forEach(btn =>
    btn.addEventListener("click", () => removeSite(btn.dataset.val))
  );
}

function renderKeywords(kws) {
  const ul = $("keywordList");
  ul.innerHTML = "";
  if (!kws.length) { ul.innerHTML = '<li class="empty">No keywords yet.</li>'; return; }
  kws.forEach(kw => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${kw}</span><button class="remove" data-val="${kw}" title="Remove">×</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".remove").forEach(btn =>
    btn.addEventListener("click", () => removeKeyword(btn.dataset.val))
  );
}

// ---- Block tab ----
$("addBtn").addEventListener("click", async () => {
  const domain = normalizeDomain($("newSite").value);
  if (!domain || !domain.includes(".")) { setStatus("Enter a valid domain like example.com"); return; }
  const { customSites = [] } = await sync.get("customSites");
  if (customSites.includes(domain)) { setStatus("Already in your list."); return; }
  customSites.push(domain);
  await sync.set({ customSites });
  notifyBackground();
  $("newSite").value = "";
  renderSites(customSites);
  setStatus(`Blocked ${domain} ✓`);
});

async function removeSite(site) {
  const { customSites = [] } = await sync.get("customSites");
  const next = customSites.filter(s => s !== site);
  await sync.set({ customSites: next });
  notifyBackground();
  renderSites(next);
  setStatus(`Removed ${site}`);
}

$("saveMsg").addEventListener("click", async () => {
  await sync.set({ customMessage: $("customMessage").value.trim() });
  setStatus("Message saved ✓");
});

// ---- Schedule tab ----
function updateScheduleOpacity() {
  $("scheduleFields").style.opacity = $("scheduleEnabled").checked ? "1" : "0.4";
}
$("scheduleEnabled").addEventListener("change", updateScheduleOpacity);

$("saveSchedule").addEventListener("click", async () => {
  const enabled = $("scheduleEnabled").checked;
  const start   = $("scheduleStart").value;
  const end     = $("scheduleEnd").value;
  if (start >= end) { setStatus("Start time must be before end time."); return; }
  await sync.set({ scheduleEnabled: enabled, scheduleStart: start, scheduleEnd: end });
  notifyBackground();
  setStatus("Schedule saved ✓");
});

// ---- Whitelist ----
function renderWhitelist(domains) {
  const ul = $("whitelistList");
  ul.innerHTML = "";
  if (!domains.length) { ul.innerHTML = '<li class="empty">No exceptions yet.</li>'; return; }
  domains.forEach(d => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${d}</span><button class="remove" data-val="${d}" title="Remove">×</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".remove").forEach(btn =>
    btn.addEventListener("click", () => removeWhitelist(btn.dataset.val))
  );
}

$("addWhitelistBtn").addEventListener("click", async () => {
  const domain = normalizeDomain($("newWhitelist").value);
  if (!domain || !domain.includes(".")) { setStatus("Enter a valid domain."); return; }
  const { whitelist = [] } = await sync.get("whitelist");
  if (whitelist.includes(domain)) { setStatus("Already whitelisted."); return; }
  whitelist.push(domain);
  await sync.set({ whitelist });
  $("newWhitelist").value = "";
  renderWhitelist(whitelist);
  setStatus(`${domain} won't be blocked ✓`);
});

async function removeWhitelist(domain) {
  const { whitelist = [] } = await sync.get("whitelist");
  const next = whitelist.filter(d => d !== domain);
  await sync.set({ whitelist: next });
  renderWhitelist(next);
  setStatus(`Removed ${domain} from whitelist`);
}

// ---- Keywords tab ----
$("keywordBlockingEnabled").addEventListener("change", async (e) => {
  await sync.set({ keywordBlockingEnabled: e.target.checked });
});

$("addKwBtn").addEventListener("click", async () => {
  const kw = $("newKeyword").value.trim().toLowerCase();
  if (!kw) { setStatus("Enter a keyword."); return; }
  const { keywords = [] } = await sync.get("keywords");
  if (keywords.includes(kw)) { setStatus("Already in your list."); return; }
  keywords.push(kw);
  await sync.set({ keywords });
  $("newKeyword").value = "";
  renderKeywords(keywords);
  setStatus(`Keyword "${kw}" added ✓`);
});

async function removeKeyword(kw) {
  const { keywords = [] } = await sync.get("keywords");
  const next = keywords.filter(k => k !== kw);
  await sync.set({ keywords: next });
  renderKeywords(next);
  setStatus(`Removed "${kw}"`);
}

// ---- Stats tab — export / import ----
$("exportBtn").addEventListener("click", async () => {
  const data = await sync.get(
    ["customSites", "keywords", "customMessage", "scheduleEnabled", "scheduleStart", "scheduleEnd",
     "keywordBlockingEnabled", "whitelist"]
  );
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = "focus-blocker-backup.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported ✓");
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const allowed = ["customSites", "keywords", "customMessage", "scheduleEnabled", "scheduleStart", "scheduleEnd",
                     "keywordBlockingEnabled", "whitelist"];
    const clean = {};
    for (const key of allowed) { if (parsed[key] !== undefined) clean[key] = parsed[key]; }
    await sync.set(clean);
    notifyBackground();
    await init();
    setStatus("Imported ✓");
  } catch (_) {
    setStatus("Import failed — invalid file.");
  }
  e.target.value = "";
});

// ---- Toggle with friction lock ----
const toggle = $("toggle");
toggle.addEventListener("change", async (e) => {
  if (!e.target.checked) {
    e.target.checked = true;
    openModal();
  } else {
    await setEnabled(true);
  }
});

function openModal() {
  $("modal").classList.remove("hidden");
  $("confirmInput").value = "";
  $("confirmBtn").disabled = true;
  $("confirmInput").focus();
}
function closeModal() { $("modal").classList.add("hidden"); }

$("confirmInput").addEventListener("input", (e) => {
  $("confirmBtn").disabled = e.target.value !== CONFIRM_PHRASE;
});
$("cancelBtn").addEventListener("click", closeModal);
$("confirmBtn").addEventListener("click", async () => {
  await setEnabled(false);
  toggle.checked = false;
  closeModal();
  setStatus("Blocker disabled.");
  $("streakDays").textContent = 0;
  $("streakBig").textContent  = 0;
  $("streakSince").textContent = "";
});

async function setEnabled(enabled) {
  const updates = { enabled };
  if (enabled) {
    const { streakStart } = await sync.get("streakStart");
    if (!streakStart) updates.streakStart = Date.now();
  } else {
    updates.streakStart = null;
  }
  await sync.set(updates);
  notifyBackground();
}
