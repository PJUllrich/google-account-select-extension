# Google Account Switcher — Firefox Extension

A Firefox extension that automatically sets the `authuser` URL parameter on Google services so you always land on the correct account.

## Why?

Google defaults to your first signed-in account whenever you visit a Google service. This extension intercepts requests to Google domains and injects the right `authuser=N` parameter based on your preferences — globally or per-service.

If you manually switch accounts on a page, the extension won't interfere — it only acts on URLs that don't already specify an account.

## Install

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json`.

> Temporary add-ons are removed when Firefox closes. For persistent installation, the extension must be signed via [addons.mozilla.org](https://addons.mozilla.org).

## Setup

### 1. Import accounts

Click the extension icon and use **Import from Google** to detect all signed-in accounts and their current indices. This fetches from Google's `ListAccounts` endpoint using your session cookies — nothing leaves your browser.

> Account indices are based on sign-in order and can shift if you log in or out. The extension identifies accounts by email, so your preferences survive index changes. Click **Import from Google** again to refresh indices.

### 2. Set a default account

Use the **Default Account** dropdown to pick which account is used across all Google services.

### 3. Per-service overrides (optional)

Use **Add service…** to override specific services. For example, set Gmail to your work account and Maps to your personal account.

Supported services: Calendar, Chat, Contacts, Docs, Drive, Groups, Keep, Gmail, Maps, Meet, Photos, Sheets, Slides.

## Permissions

- **`webRequest` / `webRequestBlocking`** — intercept and redirect requests before they reach Google.
- **`storage`** — persist account list, default, and overrides locally.
- **`activeTab`** — inject a script into a Google tab to fetch the signed-in accounts list.
- **Host permission `*.google.com`** — the only domain the extension operates on. No data is collected or sent anywhere.
