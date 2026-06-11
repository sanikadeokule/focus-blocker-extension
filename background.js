const DYNAMIC_RULE_OFFSET  = 1000;
const STATIC_RULESET_ID    = "static_rules";
const ALL_RULESETS         = [
  "static_rules",
  "bulk_rules_1", "bulk_rules_2", "bulk_rules_3"
];
const ALARM_NAME           = "schedule-check";
const NATIVE_HOST_NAME     = "com.focusblocker.host";

// ---- Helpers ----

async function buildDynamicRules(sites, shouldBlock) {
  const existing  = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);
  const addRules  = shouldBlock
    ? sites.map((domain, i) => ({
        id: DYNAMIC_RULE_OFFSET + i,
        priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] }
      }))
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
}

async function getStaticDomains() {
  try {
    const resp  = await fetch(chrome.runtime.getURL("rules.json"));
    const rules = await resp.json();
    return rules.map(r => r.condition.urlFilter.replace("||", "").replace("^", ""));
  } catch (_) { return []; }
}

// ---- Native host (OS-level blocking) ----
// Sends full domain list to host.js which writes to the Windows hosts file.
// Silently no-ops if the native host isn't installed.

async function syncNativeHost(shouldBlock, customSites) {
  try {
    const staticDomains = await getStaticDomains();
    await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, {
      type:          "sync",
      enabled:       shouldBlock,
      staticDomains,
      customSites:   customSites || [],
    });
  } catch (_) {
    // Native host not installed — extension-only mode, no action needed
  }
}

// ---- Main state applicator ----

async function applyBlockingState() {
  const data = await chrome.storage.sync.get(
    ["enabled", "customSites", "scheduleEnabled", "scheduleStart", "scheduleEnd"]
  );
  const globalEnabled = data.enabled !== false;
  let shouldBlock = globalEnabled;

  if (shouldBlock && data.scheduleEnabled) {
    const now = new Date();
    const [startH, startM] = (data.scheduleStart || "09:00").split(":").map(Number);
    const [endH,   endM]   = (data.scheduleEnd   || "21:00").split(":").map(Number);
    const nowMins   = now.getHours() * 60 + now.getMinutes();
    shouldBlock = nowMins >= startH * 60 + startM && nowMins < endH * 60 + endM;
  }

  // Chrome-level (declarativeNetRequest)
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    shouldBlock
      ? { enableRulesetIds:  ALL_RULESETS }
      : { disableRulesetIds: ALL_RULESETS }
  );
  await buildDynamicRules(data.customSites || [], shouldBlock);

  // OS-level (hosts file via native messaging)
  await syncNativeHost(shouldBlock, data.customSites || []);
}

// ---- Migration from V1 (local → sync) ----

async function migrateLocalToSync() {
  const [local, synced] = await Promise.all([
    chrome.storage.local.get(["customSites", "customMessage", "enabled"]),
    chrome.storage.sync.get("customSites"),
  ]);
  if (!synced.customSites && local.customSites?.length) {
    await chrome.storage.sync.set({
      customSites:   local.customSites,
      customMessage: local.customMessage || "",
      enabled:       local.enabled !== false,
    });
  }
}

// ---- Lifecycle ----

async function restore() {
  await migrateLocalToSync();
  await applyBlockingState();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(restore);
chrome.runtime.onStartup.addListener(restore);

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) applyBlockingState();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "applyState") {
    applyBlockingState().then(() => sendResponse({ ok: true }));
    return true;
  }
});
