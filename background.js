/* Google Account Switcher — background script
 *
 * Storage: { accounts: [{ email, index }], defaultAccount: email|null, overrides: { service: email } }
 *
 * On every main-frame navigation to *.google.com, if the URL has no account
 * indicator (no ?authuser and no /u/N/), inject ?authuser=N based on the
 * user's per-service override or default account preference.
 */

const SERVICES = new Set([
  "calendar", "chat", "contacts", "docs", "drive", "groups",
  "keep", "mail", "maps", "meet", "photos", "sheets", "slides"
]);

const IGNORED_HOSTS = ["apis.", "oauth2.", "accounts.", "fonts.", "lh3.", "encrypted-tbn"];
const IGNORED_PATHS = ["/recaptcha", "/_/", "/js/", "/css/", "/images/", "/xjs/",
  "/gen_204", "/client_204", "/complete/search", "/sorry/"];

let config = { accounts: [], defaultAccount: null, overrides: {} };

function loadConfig() {
  browser.storage.local.get(["accounts", "defaultAccount", "overrides"]).then((d) => {
    config.accounts = d.accounts || [];
    config.defaultAccount = d.defaultAccount ?? null;
    config.overrides = d.overrides || {};
  });
}

loadConfig();
browser.storage.onChanged.addListener(loadConfig);

// --- Message handling (popup) ---

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "configUpdated") loadConfig();
  if (msg.type === "fetchAccounts") return fetchAccounts();
});

async function fetchAccounts() {
  try {
    const tabs = await browser.tabs.query({ url: "*://*.google.com/*" });
    let tab = tabs[0];
    let created = false;

    if (!tab) {
      tab = await browser.tabs.create({ url: "https://www.google.com", active: false });
      created = true;
      await new Promise((resolve) => {
        const onUpdate = (id, info) => {
          if (id === tab.id && info.status === "complete") {
            browser.tabs.onUpdated.removeListener(onUpdate);
            resolve();
          }
        };
        browser.tabs.onUpdated.addListener(onUpdate);
      });
    }

    const [data] = await browser.tabs.executeScript(tab.id, {
      code: `
        fetch("https://accounts.google.com/ListAccounts?listPages=0&origin=https://www.google.com",
              { credentials: "include" })
          .then(r => r.text())
          .then(text => {
            var m = text.match(/postMessage\\('(.*?)',\\s*'/);
            if (!m) return { error: "Unexpected response format." };
            var json = m[1].replace(/\\\\x([0-9a-fA-F]{2})/g,
              function(_, h) { return String.fromCharCode(parseInt(h, 16)); });
            return JSON.parse(json);
          });
      `
    });

    if (created) browser.tabs.remove(tab.id);
    if (data && data.error) return data;

    const raw = data && data[1];
    if (!Array.isArray(raw) || raw.length === 0) {
      return { error: "No signed-in accounts found." };
    }

    return {
      accounts: raw.map((entry, i) => ({
        email: (Array.isArray(entry) ? entry : []).find((f) => typeof f === "string" && f.includes("@")) || "",
        index: i
      }))
    };
  } catch (e) {
    return { error: "Failed to fetch accounts: " + e.message };
  }
}

// --- Request interception ---

function detectService(url) {
  const sub = url.hostname.split(".")[0];
  if (sub !== "www" && SERVICES.has(sub)) return sub;

  const seg = url.pathname.split("/")[1];
  if (seg && SERVICES.has(seg)) return seg;

  return null;
}

function handleRequest(details) {
  if (!config.defaultAccount && Object.keys(config.overrides).length === 0) return {};

  const url = new URL(details.url);

  // Skip API calls, auth flows, static assets.
  if (IGNORED_HOSTS.some((h) => url.hostname.startsWith(h))) return {};
  if (IGNORED_PATHS.some((p) => url.pathname.startsWith(p))) return {};

  // If the URL already specifies an account, don't override — the user or
  // Google already made a choice (e.g. manual account switch).
  if (url.searchParams.has("authuser") || /\/u\/\d+/.test(url.pathname)) return {};

  const service = detectService(url);
  const email = (service && config.overrides[service]) || config.defaultAccount;
  if (!email) return {};

  const acc = config.accounts.find((a) => a.email === email);
  if (!acc) return {};

  url.searchParams.set("authuser", acc.index);
  const newUrl = url.toString();
  if (newUrl === details.url) return {};

  return { redirectUrl: newUrl };
}

browser.webRequest.onBeforeRequest.addListener(
  handleRequest,
  { urls: ["*://*.google.com/*"], types: ["main_frame"] },
  ["blocking"]
);
