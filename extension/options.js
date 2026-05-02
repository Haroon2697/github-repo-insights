const baseInput = document.getElementById("base");
const saveBtn = document.getElementById("save");
const msg = document.getElementById("msg");

function defaultBase() {
  return "http://localhost:5173";
}

chrome.storage.sync.get({ dashboardBaseUrl: defaultBase() }, (cfg) => {
  baseInput.value = cfg.dashboardBaseUrl || defaultBase();
});

saveBtn.addEventListener("click", () => {
  let v = baseInput.value.trim().replace(/\/$/, "");
  if (!v) v = defaultBase();
  chrome.storage.sync.set({ dashboardBaseUrl: v }, () => {
    msg.hidden = false;
    setTimeout(() => {
      msg.hidden = true;
    }, 2000);
  });
});
