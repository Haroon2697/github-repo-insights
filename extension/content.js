const FLOAT_ID = "gh-intelligence-dashboard-fab";

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

function parseGithubPath(pathname) {
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

function removeFab() {
  document.getElementById(FLOAT_ID)?.remove();
}

function injectFab() {
  removeFab();
  const target = parseGithubPath(window.location.pathname);
  if (!target) return;

  chrome.storage.sync.get({ dashboardBaseUrl: "http://localhost:5173" }, (cfg) => {
    let base = (cfg.dashboardBaseUrl || "").replace(/\/$/, "");
    if (!base) base = "http://localhost:5173";
    const href = `${base}/?username=${encodeURIComponent(target.login)}`;

    const wrap = document.createElement("div");
    wrap.id = FLOAT_ID;
    wrap.setAttribute(
      "style",
      [
        "position:fixed",
        "bottom:20px",
        "right:20px",
        "z-index:2147483646",
        "font-family:system-ui,sans-serif",
        "font-size:13px",
      ].join(";")
    );

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "Intelligence dashboard →";
    a.title = `Open rankings for ${target.login} in a new tab`;
    a.setAttribute(
      "style",
      [
        "display:inline-block",
        "padding:10px 14px",
        "background:#24292f",
        "color:#fff",
        "border-radius:999px",
        "text-decoration:none",
        "box-shadow:0 4px 12px rgba(0,0,0,.25)",
      ].join(";")
    );

    wrap.appendChild(a);
    document.documentElement.appendChild(wrap);
  });
}

injectFab();
document.addEventListener("turbo:load", injectFab);
document.addEventListener("pjax:end", injectFab);
