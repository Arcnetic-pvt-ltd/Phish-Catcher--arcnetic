/**
 * Arcnetic Phish-Catcher — background.js (Service Worker)
 * Minimal service worker. All detection logic lives in content.js.
 * This file handles install events and acts as a message relay if needed.
 */

'use strict';

// ─── Installation Event ────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Seed default storage structure on first install
    chrome.storage.local.set({
      protectedNames: [],
      trustedDomain: '',
      isEnabled: true
    });
    console.log('[Arcnetic Phish-Catcher] Extension installed. Storage initialized.');
  }

  if (details.reason === 'update') {
    console.log(`[Arcnetic Phish-Catcher] Updated to version ${chrome.runtime.getManifest().version}.`);
  }
});

// ─── Message Relay ─────────────────────────────────────────────────────────
// Relays messages from popup.js to active content scripts if needed.
// Currently used to push settings-changed notifications immediately.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // Broadcast to all matching tabs so content scripts re-evaluate instantly
    chrome.tabs.query(
      { url: ['*://mail.google.com/*', '*://outlook.office.com/*', '*://outlook.live.com/*', '*://outlook.cloud.microsoft/mail/*'] },
      (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {
            // Tab may not have the content script injected yet — safe to ignore
          });
        });
        sendResponse({ ok: true });
      }
    );
    return true; // Keep channel open for async sendResponse
  }
});
