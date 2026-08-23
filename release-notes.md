# 🚀 Web to Kindle v1.0.0

A privacy-focused Manifest V3 Chrome Extension that extracts web articles, multi-chapter online books, and PDF documents into clean, Kindle-supported EPUB 3 or native PDF files and sends them directly to your Kindle.

---

### ✨ Key Features

- 📄 **Single Article Reader Mode**: Extracts clean article content (stripping ads, popups, and sidebars) using Mozilla Readability and packages it into a Kindle-compatible EPUB 3 ebook.
- 📚 **Recursive Online Book Converter**: Automatically discovers Table of Contents on sites like *Thinking in Python*, *Think Python*, GitBook, Sphinx/ReadTheDocs, Docusaurus, and mdBook, crawling all chapters and compiling a unified multi-chapter ebook with a native Kindle TOC.
- 📑 **PDF Support (Dual Delivery)**:
  - **Send as PDF**: Delivers the original, lossless PDF directly to Kindle.
  - **Convert & Reflow to EPUB**: Extracts embedded text, cleans running headers/footers, and creates a reflowable EPUB for customized Bookerly font sizes on e-ink Kindles.
  - **Drag-and-Drop Dropzone**: Upload any local PDF from your computer directly inside the popup.
- 📤 **Multi-Provider Email Dispatcher**: Direct REST API delivery via **Resend**, **SendGrid**, **Brevo (Sendinblue)**, **Mailgun**, or a self-hosted **Homelab Webhook Relay**.
- 🕒 **Action History**: Local tracking of sent and saved books/articles with instant search and one-click access.
- 🔒 **100% Client-Side & Private**: All extraction, EPUB generation, and PDF parsing occur locally in your browser.

---

### 📦 Installation Guide

1. Download **`web-to-kindle-v1.0.0.zip`** from the release assets below.
2. Unzip the downloaded folder.
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the unzipped `web-to-kindle-v1.0.0` folder.
6. Open the extension settings to enter your `@kindle.com` email and approved sender address.
