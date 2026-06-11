# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Loading / reloading the extension

There is no build step. Load directly as an unpacked Chrome extension:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder
4. After editing any JS/JSON file, click **Reload** on the extension card (or press the reload icon)
5. After editing `manifest.json`, remove and re-add the extension

To inspect the service worker: click **Inspect views: service worker** on the extension card. Service worker errors also appear under the **Errors** button on the card.

The native host (`native-host/host.js`) is optional and only needed for OS-level hosts-file blocking. Install via `native-host/install.ps1` (requires admin). The extension works without it.

## Architecture

### Two-layer blocking

1. **Browser layer** — `declarativeNetRequest` static rulesets + dynamic rules redirect matching requests to `blocked.html` before they load.
2. **OS layer** — optional native messaging host (`native-host/host.js`, Node.js) writes blocked domains to the Windows hosts file so blocks apply in all browsers. The extension calls `chrome.runtime.sendNativeMessage` and silently no-ops if the host isn't installed.

### Rule files

- `rules.json` — 12 hand-curated static rules (IDs 1–12)
- `bulk-rules-1.json` through `bulk-rules-5.json` — 10,000 rules each (IDs 100000–149999), totalling 50,012 static rules across all rulesets
- Dynamic rules (user's custom sites) — IDs start at `DYNAMIC_RULE_OFFSET = 1000`, created at runtime via `chrome.declarativeNetRequest.updateDynamicRules`

**Important:** Chrome's `MAX_NUMBER_OF_STATIC_RULES` limit is 30,000. All six rulesets are enabled by default in the manifest *and* re-enabled on every `applyBlockingState()` call, so attempting to enable them all exceeds the limit and throws from `updateEnabledRulesets()`. This is the root cause of the **Errors** badge on the extension card. To stay within the limit, keep total enabled static rules ≤ 30,000 (i.e. at most two bulk files + `rules.json` simultaneously enabled, or reduce bulk file sizes).

### State and storage

- `chrome.storage.sync` — `enabled`, `customSites[]`, `keywords[]`, `customMessage`, `scheduleEnabled`, `scheduleStart`, `scheduleEnd`, `streakStart`
- `chrome.storage.local` — `blockCount`, `weekStart` (weekly counter; local because counts shouldn't sync)

### Signal flow

Every state change (toggle, add/remove site, schedule save) calls `notifyBackground()` in `popup.js`, which sends `{ type: "applyState" }` to the service worker. The service worker's `applyBlockingState()` re-reads all settings and rebuilds both the declarative rulesets and the dynamic rules from scratch on each call. A 1-minute alarm (`schedule-check`) also fires `applyBlockingState()` to handle schedule transitions without requiring user interaction.

### Key files

| File | Role |
|---|---|
| `background.js` | Service worker — single source of truth for blocking state |
| `popup.js` | Popup UI logic — reads/writes storage, sends `applyState` to background |
| `content.js` | Content script — keyword blocking (URL + title) via MutationObserver |
| `blocked.js` | Block-page logic — increments weekly counter, displays streak/message |
| `native-host/host.js` | Node.js native messaging host — manages hosts-file entries |

### V1 → V2 migration

`background.js` includes a one-time `migrateLocalToSync()` that copies `customSites`, `customMessage`, and `enabled` from `chrome.storage.local` to `chrome.storage.sync` on first run after upgrade. Safe to leave in place.
