/**
 * Web to Kindle Extension - Options Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const kindleEmailInput = document.getElementById('kindle-email');
  const senderEmailInput = document.getElementById('sender-email');
  const providerSelect = document.getElementById('provider-select');
  const apiKeyInput = document.getElementById('api-key');
  const labelApiKey = document.getElementById('label-api-key');
  const helpApiKey = document.getElementById('help-api-key');
  const fieldsApiKey = document.getElementById('fields-api-key');
  const fieldsMailgun = document.getElementById('fields-mailgun');
  const mailgunDomainInput = document.getElementById('mailgun-domain');
  const mailgunRegionSelect = document.getElementById('mailgun-region');
  const fieldsWebhook = document.getElementById('fields-webhook');
  const webhookUrlInput = document.getElementById('webhook-url');
  const webhookTokenInput = document.getElementById('webhook-token');

  const btnSave = document.getElementById('btn-save');
  const btnTest = document.getElementById('btn-test');
  const statusBox = document.getElementById('status-box');

  function showStatus(type, message) {
    statusBox.className = 'status-box';
    statusBox.classList.remove('hidden');

    if (type === 'success') {
      statusBox.classList.add('status-success');
    } else if (type === 'error') {
      statusBox.classList.add('status-error');
    } else if (type === 'loading') {
      statusBox.classList.add('status-loading');
    }
    statusBox.innerHTML = message;
  }

  function hideStatus() {
    statusBox.classList.add('hidden');
    statusBox.className = 'status-box hidden';
  }

  // Update visible fields based on provider selection
  function updateProviderFields(provider) {
    fieldsApiKey.classList.remove('hidden');
    fieldsMailgun.classList.add('hidden');
    fieldsWebhook.classList.add('hidden');

    if (provider === 'resend') {
      labelApiKey.textContent = 'Resend API Key';
      apiKeyInput.placeholder = 're_123456789...';
      helpApiKey.innerHTML = 'Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener">resend.com/api-keys</a>.';
    } else if (provider === 'sendgrid') {
      labelApiKey.textContent = 'SendGrid API Key';
      apiKeyInput.placeholder = 'SG.xxxxxxxxxxxx...';
      helpApiKey.innerHTML = 'Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener">SendGrid API Keys</a>.';
    } else if (provider === 'brevo') {
      labelApiKey.textContent = 'Brevo API Key';
      apiKeyInput.placeholder = 'xkeysib-xxxxxxxx...';
      helpApiKey.innerHTML = 'Get your API key from <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener">Brevo API Keys</a>.';
    } else if (provider === 'mailgun') {
      labelApiKey.textContent = 'Mailgun API Key';
      apiKeyInput.placeholder = 'key-xxxxxxxxxxxx...';
      helpApiKey.innerHTML = 'Get your API key from Mailgun Dashboard &gt; API Security.';
      fieldsMailgun.classList.remove('hidden');
    } else if (provider === 'webhook') {
      fieldsApiKey.classList.add('hidden');
      fieldsWebhook.classList.remove('hidden');
    }
  }

  providerSelect.addEventListener('change', (e) => {
    updateProviderFields(e.target.value);
  });

  // Load saved settings
  async function loadSettings() {
    const settings = await EmailService.getSettings();
    kindleEmailInput.value = settings.kindleEmail || '';
    senderEmailInput.value = settings.senderEmail || '';
    providerSelect.value = settings.provider || 'resend';
    apiKeyInput.value = settings.apiKey || '';
    mailgunDomainInput.value = settings.mailgunDomain || '';
    mailgunRegionSelect.value = settings.mailgunRegion || 'us';
    webhookUrlInput.value = settings.webhookUrl || 'http://localhost:3080/send-kindle';
    webhookTokenInput.value = settings.webhookToken || '';

    updateProviderFields(providerSelect.value);
  }

  // Save settings
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newSettings = {
      kindleEmail: kindleEmailInput.value.trim(),
      senderEmail: senderEmailInput.value.trim(),
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      mailgunDomain: mailgunDomainInput.value.trim(),
      mailgunRegion: mailgunRegionSelect.value,
      webhookUrl: webhookUrlInput.value.trim(),
      webhookToken: webhookTokenInput.value.trim()
    };

    try {
      EmailService.validateSettings(newSettings);
    } catch (err) {
      showStatus('error', err.message);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set(newSettings, () => {
        showStatus('success', '✓ Settings saved successfully!');
        setTimeout(hideStatus, 4000);
      });
    } else {
      showStatus('success', '✓ Settings saved (local).');
      setTimeout(hideStatus, 4000);
    }
  });

  // Send Test Ebook
  btnTest.addEventListener('click', async () => {
    const testSettings = {
      kindleEmail: kindleEmailInput.value.trim(),
      senderEmail: senderEmailInput.value.trim(),
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      mailgunDomain: mailgunDomainInput.value.trim(),
      mailgunRegion: mailgunRegionSelect.value,
      webhookUrl: webhookUrlInput.value.trim(),
      webhookToken: webhookTokenInput.value.trim()
    };

    try {
      EmailService.validateSettings(testSettings);
    } catch (err) {
      showStatus('error', err.message);
      return;
    }

    // Save first
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise(r => chrome.storage.sync.set(testSettings, r));
    }

    btnTest.disabled = true;
    btnSave.disabled = true;
    showStatus('loading', 'Generating test EPUB and dispatching email...');

    try {
      const generator = new EpubGenerator({
        title: 'Kindle Test Ebook - Web to Kindle',
        author: 'Web to Kindle Extension',
        content: `<h2>Success!</h2><p>Your Web to Kindle Chrome Extension is properly configured and connected.</p><p>This test verification ebook was delivered on <strong>${new Date().toLocaleString()}</strong>.</p><p>You can now click the extension icon on any web page to send clean, formatted articles directly to your Kindle reader.</p>`,
        url: 'https://github.com',
        siteName: 'Web to Kindle',
        publishedTime: new Date().toISOString()
      });

      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: 'Kindle Test Ebook - Web to Kindle',
        author: 'Web to Kindle Extension',
        url: 'https://github.com'
      });

      showStatus('success', `✓ Test email sent successfully to <strong>${testSettings.kindleEmail}</strong>! Check your Kindle library in 1–2 minutes.`);

    } catch (err) {
      console.error('Test error:', err);
      showStatus('error', `<strong>Test Failed:</strong> ${err.message}<br/><small>Make sure your sender email is authorized in Amazon Approved E-mail List.</small>`);
    } finally {
      btnTest.disabled = false;
      btnSave.disabled = false;
    }
  });

  await loadSettings();
});
