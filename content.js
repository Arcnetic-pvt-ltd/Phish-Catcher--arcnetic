/**
 * Arcnetic Phish-Catcher — content.js (Detection Engine)
 */

(function () {
  'use strict';

  const BANNER_ID = 'arcnetic-phish-catcher-banner';
  const DEBOUNCE_MS = 800; // Slightly increased for Outlook's heavy load times

  const KNOWN_FREE_PROVIDERS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 
    'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com'
  ]);

  let settings = { protectedNames: [], trustedDomain: '', isEnabled: true };
  let debounceTimer = null;
  let lastBannerKey = null; 

  function normalise(str) {
    return String(str).toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['protectedNames', 'trustedDomain', 'isEnabled'], (result) => {
        settings.protectedNames = Array.isArray(result.protectedNames) ? result.protectedNames : [];
        settings.trustedDomain = (result.trustedDomain || '').toLowerCase().trim().replace(/^@/, '');
        settings.isEnabled = result.isEnabled !== false;
        resolve();
      });
    });
  }

function getPlatform() {
    const host = window.location.hostname;
    if (host.includes('mail.google.com')) return 'gmail';
    
    // Catch ALL Microsoft Outlook web domains
    if (
      host.includes('outlook.office.com') || 
      host.includes('outlook.live.com') || 
      host.includes('outlook.office365.com') || 
      host.includes('outlook.cloud.microsoft')
    ) {
      return 'outlook';
    }
    
    return null;
  }

  // ─── Gmail Selectors ───────────────────────────────────────────────────────
  function getGmailSenderInfo() {
    try {
      const senderEl = document.querySelector('.gD');
      if (senderEl) return { displayName: senderEl.getAttribute('name') || senderEl.textContent.trim(), email: senderEl.getAttribute('email') || '' };
    } catch (e) {}
    return null;
  }

  function getGmailEmailBody() {
    return document.querySelector('.a3s.aiL') || document.querySelector('.a3s');
  }

  // ─── Outlook Selectors (UPGRADED) ──────────────────────────────────────────
  function getOutlookSenderInfo() {
    try {
      // Find the main reading pane
      const readingPane = document.querySelector('[aria-label="Reading Pane"]') || document.querySelector('[role="main"]');
      if (!readingPane) return null;

      // Extract the first chunk of text to find the header info
      const headerText = readingPane.innerText.substring(0, 800); 
      
      // Look for: Name <email@domain.com> or Name<email@domain.com>
      const regex = /([^\n<]+?)\s*<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)>/;
      const match = headerText.match(regex);
      
      if (match) {
        return { displayName: match[1].trim(), email: match[2].trim() };
      }

      // Fallback for newer Outlook updates
      const testIdName = document.querySelector('[data-testid="senderName"]');
      const testIdEmail = document.querySelector('[data-testid="senderEmail"]');
      if (testIdName && testIdEmail) {
        return { displayName: testIdName.textContent.trim(), email: testIdEmail.textContent.trim().replace(/[<>]/g, '') };
      }
    } catch (e) {
      console.warn('[Phish-Catcher] Error parsing Outlook sender:', e);
    }
    return null;
  }

  function getOutlookEmailBody() {
    try {
      // We must find a stable container that React won't immediately overwrite
      const readingPane = document.querySelector('[aria-label="Reading Pane"]') || document.querySelector('[role="main"]');
      if (!readingPane) return null;

      // Prefer the actual message body wrapper
      const bodyWrapper = readingPane.querySelector('div[aria-label="Message body"], .BodyFragment, [data-testid="messageBody"]');
      if (bodyWrapper) return bodyWrapper;

      // If we can't find the inner body, inject at the top of the reading pane
      return readingPane;
    } catch (e) {
      return null;
    }
  }

  // ─── Detection Logic ───────────────────────────────────────────────────────
  function matchesProtectedName(displayName) {
    if (!displayName || settings.protectedNames.length === 0) return false;
    const normDisplay = normalise(displayName);
    return settings.protectedNames.some((protectedName) => {
      const normProtected = normalise(protectedName);
      return normProtected && (normDisplay.includes(normProtected) || normProtected.includes(normDisplay));
    });
  }

  function isFromTrustedDomain(email) {
    if (!settings.trustedDomain || !email) return false;
    const lowerEmail = email.toLowerCase();
    const domain = settings.trustedDomain.replace(/^@/, '');
    return lowerEmail.endsWith('@' + domain) || lowerEmail.endsWith('.' + domain);
  }

  // ─── Banner DOM Builder ────────────────────────────────────────────────────
  function el(tag, styles, text) {
    const node = document.createElement(tag);
    if (styles) Object.assign(node.style, styles);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function injectBanner(container, senderInfo) {
    const bannerKey = `${senderInfo.displayName}||${senderInfo.email}`;
    const existing = document.getElementById(BANNER_ID);
    if (existing && lastBannerKey === bannerKey) return;
    if (existing) existing.remove();

    lastBannerKey = bannerKey;
    
    const banner = el('div', {
      display: 'flex', alignItems: 'flex-start', gap: '14px',
      background: '#ffcccc', border: '2.5px solid #cc0000', borderLeft: '6px solid #cc0000',
      padding: '14px 18px', margin: '0 0 16px 0', borderRadius: '6px',
      fontFamily: 'sans-serif', fontSize: '13.5px', color: '#1a0000', zIndex: '2147483647', position: 'relative'
    });
    banner.id = BANNER_ID;

    const icon = el('div', { fontSize: '28px' }, '🚨');
    const textCol = el('div', { flex: '1' });
    
    textCol.appendChild(el('div', { fontSize: '14.5px', fontWeight: 'bold', color: '#b30000', marginBottom: '6px' }, 'Arcnetic Security Warning — Display Name Spoofing Detected'));
    textCol.appendChild(el('div', { fontWeight: '600', marginBottom: '8px' }, `Sender matched protected name "${senderInfo.displayName}", but email is external: ${senderInfo.email}`));
    
    banner.appendChild(icon);
    banner.appendChild(textCol);

    // Insert safely into the container
    container.insertBefore(banner, container.firstChild);
    console.log('[Phish-Catcher] Banner successfully injected!');
  }

  // ─── Main Routine with Diagnostics ─────────────────────────────────────────
  async function checkCurrentEmail() {
    await loadSettings();
    if (!settings.isEnabled || settings.protectedNames.length === 0) return;

    const platform = getPlatform();
    if (!platform) return;

    console.log(`\n--- [Phish-Catcher] Checking Email (${platform}) ---`);

    const senderInfo = platform === 'gmail' ? getGmailSenderInfo() : getOutlookSenderInfo();
    const emailBody = platform === 'gmail' ? getGmailEmailBody() : getOutlookEmailBody();

    console.log(`[Phish-Catcher] 1. Extracted Sender:`, senderInfo);
    console.log(`[Phish-Catcher] 2. Found Body Container:`, emailBody !== null);

    if (!senderInfo || !emailBody) {
      console.log(`[Phish-Catcher] Aborting: Missing sender info or body container.`);
      const existing = document.getElementById(BANNER_ID);
      if (existing) existing.remove();
      return;
    }

    const nameIsProtected = matchesProtectedName(senderInfo.displayName);
    const emailIsTrusted = isFromTrustedDomain(senderInfo.email);

    console.log(`[Phish-Catcher] 3. Logic Check -> Name Protected: ${nameIsProtected} | Email Trusted: ${emailIsTrusted}`);

    if (nameIsProtected && !emailIsTrusted) {
      console.log(`[Phish-Catcher] 4. THREAT DETECTED. Injecting banner...`);
      injectBanner(emailBody, senderInfo);
    } else {
      console.log(`[Phish-Catcher] 4. Email is safe. No banner required.`);
      const existing = document.getElementById(BANNER_ID);
      if (existing) existing.remove();
    }
  }

  // ─── Observers ─────────────────────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkCurrentEmail, DEBOUNCE_MS);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  checkCurrentEmail();

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') checkCurrentEmail();
  });
})();