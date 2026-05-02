const statusEl = document.getElementById("status");
const openBtn = document.getElementById("open");
const hintEl = document.getElementById("hint");
const optsLink = document.getElementById("opts");

function defaultBase() {
  return "http://localhost:5173";
}

optsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

chrome.storage.sync.get({ dashboardBaseUrl: defaultBase() }, (cfg) => {
  let base = (cfg.dashboardBaseUrl || "").replace(/\/$/, "");
  if (!base) base = defaultBase();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url || !tab.url.includes("github.com")) {
      statusEl.textContent = "Open a GitHub tab (profile or repository), then click this icon again.";
      hintEl.textContent = `Dashboard will open at ${base}`;
      return;
    }

    let url;
    try {
      url = new URL(tab.url);
    } catch {
      statusEl.textContent = "Could not read this tab URL.";
      return;
    }

    if (url.hostname !== "github.com") {
      statusEl.textContent = "Not a github.com page.";
      return;
    }

    const target = parseGithubPath(url.pathname);
    if (!target) {
      statusEl.textContent =
        "This page is not a user profile, org, or repo root. Go to e.g. github.com/octocat or github.com/org/repo.";
      hintEl.textContent = `Or open ${base}/?username=YOUR_LOGIN manually.`;
      return;
    }

    const dash = `${base}/?username=${encodeURIComponent(target.login)}`;
    statusEl.textContent = `Ready for @${target.login}`;
    hintEl.textContent = "Opens your dashboard with this login (uses your deployed API).";
    openBtn.hidden = false;
    openBtn.onclick = () => {
      chrome.tabs.create({ url: dash });
    };
  });
});

/** @returns {{ login: string } | null} */
function parseGithubPath(pathname) {
  const RESERVED = new Set([
    "settings",
    "login",
    "signup",
    "pricing",
    "features",
    "explore",
    "marketplace",
    "apps",
    "topics",
    "collections",
    "sponsors",
    "enterprise",
    "team",
    "readme",
    "issues",
    "pulls",
    "notifications",
    "new",
    "organizations",
    "orgs",
    "users",
    "search",
    "codespaces",
    "copilot",
    "account",
    "sessions",
    "dashboard",
    "gist",
  ]);

  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] === "orgs" && parts.length >= 2) {
    return { login: parts[1] };
  }
  if (parts.length === 1 && !RESERVED.has(parts[0].toLowerCase())) {
    return { login: parts[0] };
  }
  if (parts.length >= 2 && !RESERVED.has(parts[0].toLowerCase())) {
    return { login: parts[0] };
  }
  return null;
}
