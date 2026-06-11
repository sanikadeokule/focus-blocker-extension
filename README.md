# Focus Blocker 🛡️

A personal browser extension to block distracting sites and stay focused.

## Features (V1)
- Static blocklist (AO3, FanFiction.net, Wattpad, Literotica, ISS, etc.)
- Add/remove your own sites from the popup
- Weekly block counter
- Custom motivational message on the block page
- Friction lock: must type a sentence to disable the blocker
- Persists across browser restarts

## Install (Chrome / Edge / Brave)
1. Open `chrome://extensions` (or `edge://extensions`)
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder: `blocker-extension`
5. Pin the icon to your toolbar

## Use
- Click the 🛡️ icon to open the popup
- Type a domain (e.g. `example.com`) and hit Add
- Toggle off → must type the confirmation sentence
- Visit a blocked site → redirected to the block page

## To enable in Incognito
- Go to `chrome://extensions`
- Click **Details** on Focus Blocker
- Turn on **Allow in Incognito**

## Tech
- Manifest V3
- `declarativeNetRequest` (static + dynamic rules)
- `chrome.storage.local`

## Heads-up
This blocks at the browser level. To go harder, pair it with DNS-level filtering
at the router (e.g. Cloudflare Family DNS `1.1.1.3`).
