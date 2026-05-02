# Browser extension (Chrome / Edge)

This folder is an **unpacked** Manifest V3 extension. It does not upload your data anywhere by itself: it only adds links from `github.com` to **your** dashboard URL (local or deployed).

## Install (development)

1. Open `chrome://extensions` (or Edge: `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose this `extension` directory.

## Configure

1. Right-click the extension icon → **Options** (or open the options page from the popup link).
2. Set **Dashboard URL** to where the frontend runs, e.g. `http://localhost:5173` or `https://your-app.vercel.app` (no trailing slash).

## Use

- On a GitHub **user** profile (`github.com/username`), **org** (`github.com/orgs/name`), or **repository** (`github.com/owner/repo`), a floating **“Intelligence dashboard →”** button appears (bottom-right), or use the **extension icon → Open dashboard**.

## Sharing with others

- **Code:** Push this repo to GitHub so anyone can clone and run or deploy their own stack.
- **Extension:** Others load the same `extension` folder and set **their** dashboard URL (your public Vercel URL if you host one instance for everyone).
- **No Chrome Web Store package** is included here; publishing to the store is optional and requires a developer account.
