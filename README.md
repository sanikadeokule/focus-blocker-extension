# Focus Blocker

A Chrome extension that blocks distracting websites so you can stay focused. Built with Manifest V3 — no external services, no accounts, runs entirely in your browser.

## Motivation

The primary goal of this extension is blocking **erotic literature** — sites like AO3, FanFiction.net, Wattpad, Literotica, and similar platforms. The built-in static blocklist and keyword system are specifically tuned for this use case.

There is also a best-effort attempt at blocking **visual erotic content** (image/video sites) via the bulk domain ruleset and keyword detection, though this is harder to cover comprehensively given how many sites exist.

If you're building something similar, the keyword blocking tab is the most flexible tool — add terms that appear in URLs or page titles of the specific content you want to avoid.

---

## Features

### Blocking
- **50,000+ pre-blocked domains** — ships with a large static blocklist covering social media, entertainment, and adult content sites
- **Custom blocklist** — add any domain from the popup (e.g. `reddit.com`, `twitter.com`)
- **Whitelist** — mark specific domains as never-block exceptions
- **Keyword blocking** — automatically blocks pages whose URL or title contains words you specify (e.g. `fanfic`, `wattpad`). Catches pages that slip through URL-only blocking

### Schedule
- Set a **block window** (e.g. 9:00 AM – 9:00 PM) — the extension only enforces blocks during those hours. Sites unblock automatically outside the window, no action needed

### Friction Lock
- Disabling the blocker requires you to **type a full confirmation sentence** exactly: *"I am choosing to disable my focus blocker."*
- This deliberate friction buys you a moment to reconsider — no accidental toggles

### Stats & Streak
- **Weekly block counter** — shows how many times blocked sites were intercepted this week
- **Day streak** — tracks consecutive days without disabling the blocker
- Stats reset weekly and are stored locally (not synced across devices)

### Import / Export
- **Export** your custom blocklist and settings as a JSON file
- **Import** a previously exported file to restore or transfer your settings

### Custom block page message
- Write a motivational note to yourself that shows up on the block page every time you're redirected

### OS-level blocking (optional)
- A native host (`native-host/host.js`) can write your blocked domains to the Windows **hosts file**, so blocks apply in every browser and app on your system. Requires a one-time admin install — see [Native Host Setup](#native-host-setup)

---

## Installation

### Chrome / Edge / Brave / any Chromium browser

1. Download or clone this repository
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing `manifest.json`
6. Pin the shield icon to your toolbar

> After editing any file, click **Reload** on the extension card in `chrome://extensions`.  
> After editing `manifest.json`, remove and re-add the extension.

### To allow blocking in Incognito

1. Go to `chrome://extensions`
2. Click **Details** on Focus Blocker
3. Turn on **Allow in Incognito**

---

## How to Use

### Turn blocking on/off
Click the shield icon to open the popup. The toggle at the top turns all blocking on or off. Turning it off triggers the friction lock — you must type the confirmation sentence.

### Block a site
1. Open the popup → **Block** tab
2. Type a domain in the "Add a site to block" field (e.g. `instagram.com`)
3. Click **Add**

The site is immediately blocked without reloading the extension.

### Whitelist a site
On the **Block** tab, use the "Whitelist — never block" field to add domains that should always load, even if they match the keyword list.

### Block by keyword
1. Open the popup → **Keywords** tab
2. Type a keyword (e.g. `fanfic`, `romance`, `nsfw`)
3. Click **Add**

The content script checks every page's URL and title in real time and redirects to the block page if a keyword matches.

### Set a schedule
1. Open the popup → **Schedule** tab
2. Toggle **Schedule mode** on
3. Set your start and end times
4. Click **Save schedule**

Blocking is only enforced during the set hours. A background alarm checks the schedule every minute so transitions happen automatically.

### View your streak & export settings
Open the popup → **Stats** tab to see your streak details and use the Export/Import buttons.

---

## Native Host Setup

The native host is **optional** — the extension works fully without it. It adds OS-level blocking via the Windows hosts file.

**Requirements:** Windows, Node.js, administrator privileges

```powershell
# Run PowerShell as Administrator
cd native-host
.\install.ps1
```

Once installed, blocked domains are written to `C:\Windows\System32\drivers\etc\hosts`, blocking them across all browsers and applications.

---

## Tech Stack

| | |
|---|---|
| **Platform** | Chrome Extension — Manifest V3 |
| **Blocking engine** | `declarativeNetRequest` (static + dynamic rules) |
| **Storage** | `chrome.storage.sync` (settings) + `chrome.storage.local` (counters) |
| **Content blocking** | MutationObserver on page title + URL for keyword detection |
| **Background** | Service worker with `chrome.alarms` for schedule checks |
| **Native messaging** | Optional Node.js host for hosts-file editing |
| **Build** | None — load directly as unpacked extension |

---

## Project Structure

```
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker — all blocking logic lives here
├── popup.html / popup.js  # Extension popup UI
├── popup.css              # Popup styles
├── content.js             # Content script — keyword detection per page
├── blocked.html / .js     # Block page shown when a site is intercepted
├── blocked.css            # Block page styles
├── rules.json             # 12 hand-curated static rules
├── bulk-rules-1..5.json   # ~50,000 static domain rules
├── icons/                 # Extension icons
└── native-host/           # Optional OS-level blocking (Windows)
    ├── host.js            # Node.js native messaging host
    ├── host.bat           # Launcher batch file
    └── install.ps1        # Install script (run as admin)
```

---

## Tips

- **Layered defense** — pair with DNS-level filtering (e.g. Cloudflare Family DNS `1.1.1.3` in your router settings) for blocking outside the browser
- **Sync** — `chrome.storage.sync` keeps your custom blocklist and settings in sync across Chrome sign-in devices automatically
- **The friction lock works** — the confirmation sentence is long enough that you'll rarely type it impulsively
