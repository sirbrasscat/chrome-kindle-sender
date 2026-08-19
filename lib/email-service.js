/**
 * Multi-Provider Email Dispatcher
 * Sends EPUB files to configured Kindle email addresses via various email APIs or custom relays.
 */

class EmailService {
  /**
   * Retrieves saved extension settings from chrome.storage.sync (or local fallback).
   */
  static async getSettings() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get({
          kindleEmail: '',
          senderEmail: '',
          provider: 'resend', // 'resend' | 'sendgrid' | 'brevo' | 'mailgun' | 'webhook'
          apiKey: '',
          mailgunDomain: '',
          mailgunRegion: 'us', // 'us' | 'eu'
          webhookUrl: 'http://localhost:3080/send-kindle',
          webhookToken: '',
          autoSend: false
        }, (items) => {
          resolve(items);
        });
      } else {
        // Fallback for tests / non-extension context
        resolve({
          kindleEmail: '',
          senderEmail: '',
          provider: 'resend',
          apiKey: '',
          mailgunDomain: '',
          mailgunRegion: 'us',
          webhookUrl: 'http://localhost:3080/send-kindle',
          webhookToken: '',
          autoSend: false
        });
      }
    });
  }

  /**
   * Validates settings before sending.
   */
  static validateSettings(settings) {
    if (!settings.kindleEmail || !settings.kindleEmail.includes('@')) {
      throw new Error('Please configure a valid Kindle email address in Settings.');
    }
    if (settings.provider !== 'webhook' && !settings.senderEmail) {
      throw new Error('Please configure an approved Sender Email address in Settings.');
    }
    if (['resend', 'sendgrid', 'brevo', 'mailgun'].includes(settings.provider) && !settings.apiKey) {
      throw new Error(`API key is required for ${settings.provider.toUpperCase()} provider.`);
    }
    if (settings.provider === 'mailgun' && !settings.mailgunDomain) {
      throw new Error('Mailgun domain is required in Settings.');
    }
    if (settings.provider === 'webhook' && !settings.webhookUrl) {
      throw new Error('Webhook endpoint URL is required in Settings.');
    }
    return true;
  }

  /**
   * Dispatches an EPUB file to the Kindle email using the configured provider.
   * @param {Object} params
   * @param {string} params.epubBase64 - Base64 encoded EPUB content
   * @param {Blob} [params.epubBlob] - Optional binary blob
   * @param {string} params.filename - Desired attachment filename (.epub)
   * @param {string} params.title - Article title
   * @param {string} [params.author] - Article author
   * @param {string} [params.url] - Original web URL
   */
  static async sendEpub(params) {
    const settings = await this.getSettings();
    this.validateSettings(settings);

    const filename = params.filename || 'article.epub';
    const subject = params.title ? `Kindle: ${params.title}` : 'Web Article for Kindle';
    const textBody = `Sending "${params.title || 'article'}" to Kindle.\n\nOriginal URL: ${params.url || 'N/A'}\nSent via Web to Kindle Chrome Extension.`;

    switch (settings.provider) {
      case 'resend':
        return await this.sendViaResend(settings, { ...params, filename, subject, textBody });
      case 'sendgrid':
        return await this.sendViaSendGrid(settings, { ...params, filename, subject, textBody });
      case 'brevo':
        return await this.sendViaBrevo(settings, { ...params, filename, subject, textBody });
      case 'mailgun':
        return await this.sendViaMailgun(settings, { ...params, filename, subject, textBody });
      case 'webhook':
        return await this.sendViaWebhook(settings, { ...params, filename, subject, textBody });
      default:
        throw new Error(`Unknown email provider: ${settings.provider}`);
    }
  }

  /**
   * Resend API provider
   */
  static async sendViaResend(settings, params) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: settings.senderEmail.trim(),
        to: [settings.kindleEmail.trim()],
        subject: params.subject,
        text: params.textBody,
        attachments: [
          {
            filename: params.filename,
            content: params.epubBase64
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.message || data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Resend Error: ${errMsg}`);
    }

    return { success: true, id: data.id, provider: 'resend' };
  }

  /**
   * SendGrid API provider
   */
  static async sendViaSendGrid(settings, params) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: settings.kindleEmail.trim() }]
          }
        ],
        from: {
          email: settings.senderEmail.trim(),
          name: 'Web to Kindle'
        },
        subject: params.subject,
        content: [
          {
            type: 'text/plain',
            value: params.textBody
          }
        ],
        attachments: [
          {
            content: params.epubBase64,
            type: 'application/epub+zip',
            filename: params.filename,
            disposition: 'attachment'
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      try {
        const json = JSON.parse(text);
        if (json.errors && json.errors.length) {
          msg = json.errors.map(e => e.message).join(', ');
        }
      } catch (e) {}
      throw new Error(`SendGrid Error (${response.status}): ${msg}`);
    }

    return { success: true, provider: 'sendgrid' };
  }

  /**
   * Brevo (formerly Sendinblue) API provider
   */
  static async sendViaBrevo(settings, params) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': settings.apiKey.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Web to Kindle',
          email: settings.senderEmail.trim()
        },
        to: [
          { email: settings.kindleEmail.trim() }
        ],
        subject: params.subject,
        textContent: params.textBody,
        attachment: [
          {
            name: params.filename,
            content: params.epubBase64
          }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Brevo Error: ${errMsg}`);
    }

    return { success: true, messageId: data.messageId, provider: 'brevo' };
  }

  /**
   * Mailgun API provider
   */
  static async sendViaMailgun(settings, params) {
    const host = settings.mailgunRegion === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net';
    const domain = encodeURIComponent(settings.mailgunDomain.trim());
    const endpoint = `https://${host}/v3/${domain}/messages`;

    // Convert base64 back to Blob for multipart/form-data upload
    const byteCharacters = atob(params.epubBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/epub+zip' });

    const formData = new FormData();
    formData.append('from', settings.senderEmail.trim());
    formData.append('to', settings.kindleEmail.trim());
    formData.append('subject', params.subject);
    formData.append('text', params.textBody);
    formData.append('attachment', blob, params.filename);

    const auth = btoa(`api:${settings.apiKey.trim()}`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Mailgun Error: ${errMsg}`);
    }

    return { success: true, id: data.id, provider: 'mailgun' };
  }

  /**
   * Custom Webhook / Homelab Relay provider
   */
  static async sendViaWebhook(settings, params) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (settings.webhookToken) {
      headers['Authorization'] = `Bearer ${settings.webhookToken.trim()}`;
      headers['X-API-Key'] = settings.webhookToken.trim();
    }

    const response = await fetch(settings.webhookUrl.trim(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: settings.kindleEmail.trim(),
        from: settings.senderEmail ? settings.senderEmail.trim() : undefined,
        subject: params.subject,
        filename: params.filename,
        epubBase64: params.epubBase64,
        metadata: {
          title: params.title,
          author: params.author,
          url: params.url,
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Webhook Relay Error: ${errMsg}`);
    }

    return { success: true, data, provider: 'webhook' };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailService;
}
if (typeof window !== 'undefined') {
  window.EmailService = EmailService;
}
if (typeof globalThis !== 'undefined') {
  globalThis.EmailService = EmailService;
}
