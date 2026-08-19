# Web to Kindle - Chrome Reading Mode to Ebook Extension

A modern Manifest V3 Chrome extension that captures web articles in clean reader mode, packages them into Kindle-compatible EPUB 3 ebooks, and automatically delivers them to your Kindle email address (`@kindle.com`).

---

## ✨ Features

- 📖 **Reader Mode Extraction**: Automatically extracts clean, ad-free article text, headings, author bylines, and images using Mozilla Readability.
- 📚 **Standard Kindle EPUB 3 Format**: Compiles a standard EPUB 3 archive with navigation, metadata, cover styling, and e-ink optimized typography.
- ⚡ **1-Click Direct Delivery**: Dispatches directly to your Amazon Send-to-Kindle address (`yourname@kindle.com`).
- 🌐 **Flexible Email Delivery Options**:
  - **Resend** (Recommended — free tier with 3,000 emails/mo)
  - **SendGrid API**
  - **Brevo (Sendinblue)** (Free tier 300 emails/day)
  - **Mailgun API**
  - **Custom Homelab Webhook / Local Relay** (Self-hosted Node.js / Docker SMTP microservice)
- 💾 **Local EPUB Download**: Save `.epub` files directly to your hard drive with one click for offline reading or Calibre sync.
- 🖱️ **Context Menu & Shortcuts**: Right-click any webpage and choose **"Send Page to Kindle"** or press <kbd>Ctrl+Shift+K</kbd> (<kbd>Cmd+Shift+K</kbd> on macOS).
- 🎨 **Adaptive UI**: Polished interface with dark/light mode support, word count stats, estimated reading time, and interactive reader preview.

---

## 🚀 Installation

1. Clone or copy this folder to your machine:
   ```bash
   cd c:/Users/pasar/homelab/chrome-kindle-sender
   ```
2. Open Google Chrome (or any Chromium browser like Brave, Edge, Arc).
3. Navigate to `chrome://extensions`.
4. Enable **Developer mode** (toggle in the top right corner).
5. Click **Load unpacked** and select the `chrome-kindle-sender` folder.
6. The **Web to Kindle** icon will now appear in your browser toolbar!

---

## ⚙️ Configuration Guide

### 1. Amazon Send-to-Kindle Setup (Important!)

Amazon requires two settings to accept emailed ebooks:

1. **Find your Kindle Email Address**:
   - Go to [Amazon Manage Your Content and Devices](https://www.amazon.com/hz/mycd/myx#/home/settings/payment).
   - Select the **Preferences** tab.
   - Scroll down to **Personal Document Settings**.
   - Note your device's email address (e.g. `yourname_123@kindle.com`).

2. **Authorize your Sender Email Address**:
   - Under the same **Personal Document Settings** page, scroll down to **Approved Personal Document E-mail List**.
   - Click **Add a new approved e-mail address**.
   - Add the exact sender email you will use in the extension settings (e.g., `you@yourdomain.com` or your Resend sender email).

---

### 2. Extension Options Setup

1. Click the **Web to Kindle** extension icon and click the ⚙️ **Settings** button (or right-click the icon and choose **Options**).
2. Enter your **Kindle Email** (`yourname@kindle.com`).
3. Enter your **Approved Sender Email**.
4. Choose your preferred delivery method:
   - **Resend** (Recommended): Enter your API key from [resend.com/api-keys](https://resend.com/api-keys).
   - **SendGrid**: Enter your SendGrid API key.
   - **Brevo**: Enter your Brevo API key.
   - **Mailgun**: Enter your API key, domain, and region (US/EU).
   - **Homelab Webhook**: Enter your local relay endpoint (e.g. `http://localhost:3080/send-kindle`).
5. Click **Save Settings**.
6. Click **Send Test Ebook** to verify that everything works and your Kindle library receives the test document.

---

## 🏠 Optional: Homelab Self-Hosted SMTP Relay

If you prefer not to use cloud email APIs and want to route through your homelab's SMTP server (Postfix, Mailcow, Proton Bridge, Gmail SMTP, etc.), a micro-relay is included in `relay-server/`.

### Running with Docker Compose:

1. Edit [`relay-server/docker-compose.yml`](file:///c:/Users/pasar/homelab/chrome-kindle-sender/relay-server/docker-compose.yml) with your SMTP credentials.
2. Start the relay:
   ```bash
   cd relay-server
   docker compose up -d
   ```
3. In extension options, choose **Custom Homelab Webhook** with URL `http://localhost:3080/send-kindle`.

---

## 📁 Project Structure

```
chrome-kindle-sender/
├── manifest.json                  # Manifest V3 configuration & permissions
├── popup/                         # Action popup interface
│   ├── popup.html                 # Main popup UI
│   ├── popup.css                  # UI styles
│   └── popup.js                   # Popup controller & event handlers
├── options/                       # Settings / Configuration interface
│   ├── options.html               # Settings UI
│   ├── options.css                # Settings styles
│   └── options.js                 # Settings storage & test delivery handler
├── lib/                           # Core client-side libraries
│   ├── readability.js             # Standalone Mozilla Readability parser
│   ├── jszip.min.js               # Client-side zip compression
│   ├── epub-generator.js          # Pure JS EPUB 3.0 ebook builder
│   └── email-service.js           # Multi-provider email dispatcher
├── background/                    # Service worker
│   └── service-worker.js          # Context menus & background dispatcher
├── content/                       # Content scripts
│   └── extractor.js               # Page DOM parsing & reader mode extractor
├── icons/                         # Extension icons (16, 32, 48, 128 px)
└── relay-server/                  # Optional self-hosted SMTP relay microservice
    ├── server.js
    ├── Dockerfile
    ├── docker-compose.yml
    └── package.json
```

---

## 🧪 Verification & Testing

To test the EPUB generator locally:
```bash
node test-epub.js
```
