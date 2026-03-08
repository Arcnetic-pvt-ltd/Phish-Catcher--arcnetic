# 🎣 Arcnetic Phish-Catcher

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Manifest](https://img.shields.io/badge/Manifest-V3-success.svg)]()

**A free, open-source Chrome Extension that detects CEO Fraud and Display Name Spoofing in Gmail and Outlook Web.**

Built by [Arcnetic](https://arcnetic.com) · 100% Local Processing · Zero Telemetry

---

## 🔒 The Privacy Mandate

Corporate email security tools shouldn't be a privacy nightmare. This extension was built with an unwavering privacy-first architecture:

- ✅ All processing happens **locally in the browser DOM only**.
- ✅ **Zero** email content, sender data, or names are transmitted anywhere.
- ✅ Settings are stored exclusively in your browser's `chrome.storage.local`.
- ✅ No external API calls of any kind.
- ✅ No analytics, no tracking, no telemetry.

---

## 🚀 Installation 

Since this is the open-source repository, you can load the extension directly into your browser via Developer Mode:

1. Download or clone this repository:
   ```bash
   git clone https://github.com/arcnetic/arcnetic-phish-catcher.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer Mode** (toggle in the top-right corner).

4. Click **"Load unpacked"** and select the `arcnetic-phish-catcher/` directory.

5. Pin the extension icon to your toolbar for easy access.

---

## ⚙️ Configuration

Click the Arcnetic icon in your toolbar to open the control panel:

- **Protected Executive Names**: Add the full names of your executives, VIPs, or frequently spoofed targets (e.g., Jane Doe). These are stored locally.
- **Corporate Domain**: Set your company's email domain (e.g., acme.com). Emails originating from this domain will never trigger a warning. Leave this blank to flag all external senders matching a protected name.
- **Enable/Disable Toggle**: Pause protection at any time without losing your saved settings.

---

## 🔬 How Detection Works

The extension uses a lightweight `MutationObserver` to watch the DOM for newly rendered emails in Single Page Applications (SPAs) like Gmail and Outlook.

- **Extraction**: It aggressively parses the DOM (using specific class selectors for Gmail and Regex-based structural heuristics for Outlook's React DOM) to separate the Display Name from the actual Email Address.
- **Evaluation**: It checks if the parsed Display Name fuzzy-matches (substring + token overlap ≥ 60%) any name in your Protected Names list.
- **Domain Verification**: It verifies if the underlying email address matches your Trusted Corporate Domain.
- **Action**: If the name is protected but the domain is external, it injects a pure-DOM (Trusted Types safe) red warning banner directly into the email reading pane.

---

## 📁 Architecture & File Structure

```text
arcnetic-phish-catcher/
├── manifest.json      # MV3 manifest — permissions, host rules, content scripts
├── background.js      # Minimal service worker — install events + message relay
├── content.js         # Core detection engine — DOM monitoring, spoofing logic
├── popup.html         # Extension popup UI — dark mode control panel
├── popup.js           # Popup logic — settings management
└── icons/             # Standard extension assets
```

---

## 🔮 Roadmap (Version 2.0)

We are actively developing advanced features for enterprise deployment:

- 🌐 **Domain Age Verification**: Privacy-safe WHOIS lookups to flag newly registered domains (e.g., domains < 30 days old).
- 🧠 **NLP Urgency Scoring**: Lightweight, local language processing to flag social engineering tactics ("urgent", "wire transfer").
- 📋 **Regex Custom Rules**: Allow IT admins to configure custom regex triggers for subjects and sender domains.
- 🏢 **Enterprise Policy Deployment**: Support for `chrome.storage.managed` to push configurations company-wide via Google Workspace or Microsoft Intune.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are highly encouraged!

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the Apache License 2.0. See LICENSE for more information.

Built with ❤️ by Arcnetic — Protecting businesses from cyber threats.