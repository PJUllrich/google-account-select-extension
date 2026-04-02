/* Google Account Switcher — popup script */

const SERVICE_LABELS = {
  business: "Business", calendar: "Calendar", chat: "Chat", "cloud-console": "Cloud Console",
  contacts: "Contacts", docs: "Docs", drive: "Drive", groups: "Groups",
  keep: "Keep", mail: "Gmail", maps: "Maps", meet: "Meet", photos: "Photos",
  sheets: "Sheets", slides: "Slides"
};

const $ = (id) => document.getElementById(id);
const accountsList = $("accounts-list");
const importBtn = $("import-btn");
const importError = $("import-error");
const defaultSelect = $("default-select");
const overridesList = $("overrides-list");
const serviceSelect = $("override-service");
const enabledToggle = $("enabled-toggle");

let accounts = [];
let defaultAccount = null;
let overrides = {};
let enabled = true;

// --- Storage ---

function save() {
  browser.storage.local.set({ accounts, defaultAccount, overrides, enabled }).then(() =>
    browser.runtime.sendMessage({ type: "configUpdated" })
  );
}

function load() {
  browser.storage.local.get(["accounts", "defaultAccount", "overrides", "enabled"]).then((d) => {
    accounts = d.accounts || [];
    defaultAccount = d.defaultAccount ?? null;
    overrides = d.overrides || {};
    enabled = d.enabled !== false;
    render();
  });
}

// --- Render ---

function render() {
  enabledToggle.checked = enabled;
  renderAccounts();
  renderSelect(defaultSelect, defaultAccount, "None");
  renderOverrides();
  renderServiceDropdown();
}

function renderAccounts() {
  accountsList.textContent = "";
  for (const acc of accounts) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = acc.index + ". " + acc.email;
    li.appendChild(span);
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => { removeAccount(acc.email); };
    li.appendChild(btn);
    accountsList.appendChild(li);
  }
}

function renderSelect(select, selected, placeholder) {
  select.textContent = "";
  const def = document.createElement("option");
  def.value = "";
  def.textContent = placeholder;
  select.appendChild(def);
  for (const acc of accounts) {
    const opt = document.createElement("option");
    opt.value = acc.email;
    opt.textContent = acc.email;
    opt.selected = acc.email === selected;
    select.appendChild(opt);
  }
}

function renderOverrides() {
  overridesList.textContent = "";
  for (const [service, email] of Object.entries(overrides)) {
    const row = document.createElement("div");
    row.className = "override-row";

    const label = document.createElement("span");
    label.className = "service-name";
    label.textContent = SERVICE_LABELS[service] || service;

    const select = document.createElement("select");
    for (const acc of accounts) {
      const opt = document.createElement("option");
      opt.value = acc.email;
      opt.textContent = acc.email;
      opt.selected = acc.email === email;
      select.appendChild(opt);
    }
    select.onchange = () => { overrides[service] = select.value; save(); };

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => { delete overrides[service]; save(); render(); };

    row.append(label, select, btn);
    overridesList.appendChild(row);
  }
}

function renderServiceDropdown() {
  for (const opt of serviceSelect.options) {
    if (opt.value) opt.hidden = opt.value in overrides;
  }
  serviceSelect.value = "";
}

// --- Actions ---

function importAccounts() {
  importBtn.disabled = true;
  importBtn.textContent = "Importing…";
  importError.hidden = true;

  browser.runtime.sendMessage({ type: "fetchAccounts" }).then((result) => {
    importBtn.disabled = false;
    importBtn.textContent = "Import from Google";

    if (result.error) {
      importError.textContent = result.error;
      importError.hidden = false;
      return;
    }

    accounts = result.accounts;
    const valid = new Set(accounts.map((a) => a.email));
    if (defaultAccount && !valid.has(defaultAccount)) defaultAccount = null;
    for (const k of Object.keys(overrides)) {
      if (!valid.has(overrides[k])) delete overrides[k];
    }
    save();
    render();
  });
}

function removeAccount(email) {
  accounts = accounts.filter((a) => a.email !== email);
  if (defaultAccount === email) defaultAccount = null;
  for (const k of Object.keys(overrides)) {
    if (overrides[k] === email) delete overrides[k];
  }
  save();
  render();
}

// --- Events ---

enabledToggle.onchange = () => { enabled = enabledToggle.checked; save(); };
importBtn.onclick = importAccounts;
defaultSelect.onchange = () => { defaultAccount = defaultSelect.value || null; save(); };
serviceSelect.onchange = () => {
  const svc = serviceSelect.value;
  if (!svc || svc in overrides) return;
  overrides[svc] = defaultAccount || (accounts[0] && accounts[0].email) || "";
  if (!overrides[svc]) return;
  save();
  render();
};
$("reset-btn").onclick = () => {
  if (!confirm("Clear all accounts, defaults, and overrides?")) return;
  accounts = [];
  defaultAccount = null;
  overrides = {};
  browser.storage.local.clear().then(() => {
    browser.runtime.sendMessage({ type: "configUpdated" });
    render();
  });
};

load();
