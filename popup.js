/**
 * Arcnetic Phish-Catcher — popup.js
 * Handles all UI logic for the popup control panel.
 * Reads/writes exclusively to chrome.storage.local. No external requests.
 */

'use strict';

// ─── DOM References ──────────────────────────────────────────────────────────
const nameInput    = document.getElementById('nameInput');
const addNameBtn   = document.getElementById('addNameBtn');
const namesList    = document.getElementById('namesList');
const emptyHint    = document.getElementById('emptyHint');
const domainInput  = document.getElementById('domainInput');
const enableToggle = document.getElementById('enableToggle');
const enableLabel  = document.getElementById('enableLabel');
const statusDot    = document.getElementById('statusDot');
const statusText   = document.getElementById('statusText');
const saveIndicator = document.getElementById('saveIndicator');

// ─── State ────────────────────────────────────────────────────────────────────
let protectedNames = [];
let saveTimer      = null;

// ─── Utility: Sanitise input ──────────────────────────────────────────────────
function sanitiseName(str) {
  return String(str).trim().replace(/\s+/g, ' ').slice(0, 80);
}
function sanitiseDomain(str) {
  return String(str).trim().toLowerCase().replace(/^[@\s]+/, '').split('/')[0].slice(0, 100);
}

// ─── Save Indicator Flash ────────────────────────────────────────────────────
function flashSaved() {
  saveIndicator.classList.add('show');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveIndicator.classList.remove('show'), 2000);
}

// ─── Notify Content Scripts ───────────────────────────────────────────────────
function notifyContentScripts() {
  chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {
    // Background may not be ready — content scripts will pick up via storage listener
  });
}

// ─── Persist to chrome.storage.local ─────────────────────────────────────────
function saveAll() {
  const domain = sanitiseDomain(domainInput.value);
  const isEnabled = enableToggle.checked;

  chrome.storage.local.set(
    { protectedNames, trustedDomain: domain, isEnabled },
    () => {
      if (chrome.runtime.lastError) {
        console.error('[Phish-Catcher] Save error:', chrome.runtime.lastError.message);
        return;
      }
      flashSaved();
      notifyContentScripts();
    }
  );
}

// ─── Render the Names List ────────────────────────────────────────────────────
function renderNames() {
  // Clear list (keep the emptyHint element in DOM, just hide/show)
  Array.from(namesList.querySelectorAll('.name-pill')).forEach(el => el.remove());

  if (protectedNames.length === 0) {
    emptyHint.style.display = '';
  } else {
    emptyHint.style.display = 'none';
    protectedNames.forEach((name, index) => {
      const pill = document.createElement('span');
      pill.className = 'name-pill';
      pill.innerHTML = `
        <span>${escapeHtml(name)}</span>
        <button class="remove-btn" data-index="${index}" title="Remove ${escapeHtml(name)}">×</button>
      `;
      namesList.appendChild(pill);
    });
  }
}

// ─── Add a Name ───────────────────────────────────────────────────────────────
function addName() {
  const raw = sanitiseName(nameInput.value);
  if (!raw) return;

  // Prevent duplicates (case-insensitive)
  const already = protectedNames.some(n => n.toLowerCase() === raw.toLowerCase());
  if (already) {
    nameInput.style.borderColor = '#e84545';
    setTimeout(() => { nameInput.style.borderColor = ''; }, 1200);
    return;
  }

  protectedNames.push(raw);
  nameInput.value = '';
  renderNames();
  saveAll();
}

// ─── Remove a Name ────────────────────────────────────────────────────────────
function removeName(index) {
  if (index < 0 || index >= protectedNames.length) return;
  protectedNames.splice(index, 1);
  renderNames();
  saveAll();
}

// ─── Update Status UI ─────────────────────────────────────────────────────────
function updateStatusUI(isEnabled) {
  if (isEnabled) {
    statusDot.classList.remove('off');
    statusText.textContent = 'Protection active — monitoring Gmail & Outlook';
    enableLabel.textContent = 'ON';
  } else {
    statusDot.classList.add('off');
    statusText.textContent = 'Protection paused — click toggle to re-enable';
    enableLabel.textContent = 'OFF';
  }
}

// ─── HTML Escape (safe output) ────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

// Add button click
addNameBtn.addEventListener('click', addName);

// Enter key in name input
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addName();
  }
});

// Remove name via delegated click on names list
namesList.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-btn');
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  if (!isNaN(index)) removeName(index);
});

// Domain input: save on blur or Enter
domainInput.addEventListener('blur', saveAll);
domainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); domainInput.blur(); }
});

// Enable/disable toggle
enableToggle.addEventListener('change', () => {
  updateStatusUI(enableToggle.checked);
  saveAll();
});

// ─── Load Settings on Popup Open ─────────────────────────────────────────────
chrome.storage.local.get(['protectedNames', 'trustedDomain', 'isEnabled'], (result) => {
  if (chrome.runtime.lastError) {
    console.error('[Phish-Catcher] Load error:', chrome.runtime.lastError.message);
    return;
  }

  protectedNames = Array.isArray(result.protectedNames) ? result.protectedNames : [];
  domainInput.value = result.trustedDomain || '';
  const isEnabled = result.isEnabled !== false; // default true
  enableToggle.checked = isEnabled;

  updateStatusUI(isEnabled);
  renderNames();
});
