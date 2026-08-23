/**
 * Web to Kindle Extension - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const stateLoading = document.getElementById('state-loading');
  const stateError = document.getElementById('state-error');
  const stateReady = document.getElementById('state-ready');
  const unconfiguredBanner = document.getElementById('unconfigured-banner');
  const errorMessage = document.getElementById('error-message');

  const titleInput = document.getElementById('article-title');
  const authorInput = document.getElementById('article-author');
  const txtSource = document.getElementById('txt-source');
  const txtReadtime = document.getElementById('txt-readtime');
  const txtWords = document.getElementById('txt-words');
  const destEmail = document.getElementById('dest-email');

  const btnTogglePreview = document.getElementById('btn-toggle-preview');
  const previewContent = document.getElementById('preview-content');
  const previewBody = document.getElementById('preview-body');

  const actionStatus = document.getElementById('action-status');
  const statusSpinner = document.getElementById('status-spinner');
  const statusText = document.getElementById('status-text');

  const btnSendKindle = document.getElementById('btn-send-kindle');
  const btnDownloadEpub = document.getElementById('btn-download-epub');
  const btnSettings = document.getElementById('btn-settings');
  const btnOpenConfig = document.getElementById('btn-open-config');
  const linkOptions = document.getElementById('link-options');
  const btnRetry = document.getElementById('btn-retry');

  let currentArticle = null;
  let currentSettings = null;
  let isPageSent = false;

  const defaultSendButtonHtml = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
    <span>Send to Kindle</span>
  `;

  const sentButtonHtml = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Sent to Kindle</span>
  `;

  function setButtonSentState(sent) {
    isPageSent = sent;
    if (sent) {
      btnSendKindle.classList.add('btn-sent');
      btnSendKindle.disabled = true;
      btnSendKindle.innerHTML = sentButtonHtml;
      btnSendKindle.title = 'This article has already been sent to your Kindle.';
    } else {
      btnSendKindle.classList.remove('btn-sent');
      btnSendKindle.disabled = false;
      btnSendKindle.innerHTML = defaultSendButtonHtml;
      btnSendKindle.title = '';
    }
  }

  // Re-enable send button if user modifies title or author
  titleInput.addEventListener('input', () => {
    if (isPageSent) setButtonSentState(false);
  });
  authorInput.addEventListener('input', () => {
    if (isPageSent) setButtonSentState(false);
  });

  // Navigation / Settings buttons
  const openSettings = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  };

  btnSettings.addEventListener('click', openSettings);
  btnOpenConfig?.addEventListener('click', openSettings);
  linkOptions?.addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
  });
  btnRetry?.addEventListener('click', () => init());

  // Toggle Reader Preview
  btnTogglePreview.addEventListener('click', () => {
    const isExpanded = btnTogglePreview.getAttribute('aria-expanded') === 'true';
    btnTogglePreview.setAttribute('aria-expanded', !isExpanded);
    previewContent.classList.toggle('hidden', isExpanded);
  });

  // Load Settings
  async function loadSettings() {
    currentSettings = await EmailService.getSettings();
    if (!currentSettings.kindleEmail) {
      unconfiguredBanner.classList.remove('hidden');
      destEmail.textContent = 'Not configured';
      destEmail.style.color = 'var(--error-text)';
    } else {
      unconfiguredBanner.classList.add('hidden');
      destEmail.textContent = currentSettings.kindleEmail;
      destEmail.style.color = '';
    }
  }

  // Extract Content from Active Tab
  async function extractActiveTab() {
    stateLoading.classList.remove('hidden');
    stateError.classList.add('hidden');
    stateReady.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Cannot extract reader content from browser internal pages.');
      }

      // Inject Readability and extractor script into tab
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['lib/readability.js', 'content/extractor.js']
        });
      } catch (injectionError) {
        console.warn('Script injection notice:', injectionError);
      }

      // Request extraction
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractReaderContent' });
      if (!response || !response.success || !response.article) {
        throw new Error(response?.error || 'Could not extract reader article from this page.');
      }

      currentArticle = response.article;
      renderArticle(currentArticle);

      stateLoading.classList.add('hidden');
      stateReady.classList.remove('hidden');

    } catch (err) {
      console.error('Extraction failed:', err);
      errorMessage.textContent = err.message || 'Failed to extract content.';
      stateLoading.classList.add('hidden');
      stateError.classList.remove('hidden');
    }
  }

  function renderArticle(article) {
    titleInput.value = article.title || 'Untitled Article';
    authorInput.value = article.byline || '';
    txtSource.textContent = article.siteName || 'Web Page';
    txtReadtime.textContent = `${article.readingTimeMinutes || 1} min read`;
    txtWords.textContent = `${(article.wordCount || 0).toLocaleString()} words`;
    previewBody.innerHTML = article.content || '<p>No content preview available.</p>';
    setButtonSentState(false);
  }

  function setStatus(type, message) {
    actionStatus.className = 'action-status';
    actionStatus.classList.remove('hidden');

    if (type === 'loading') {
      actionStatus.classList.add('status-loading');
      statusSpinner.classList.remove('hidden');
    } else if (type === 'success') {
      actionStatus.classList.add('status-success');
      statusSpinner.classList.add('hidden');
    } else if (type === 'error') {
      actionStatus.classList.add('status-error');
      statusSpinner.classList.add('hidden');
    }
    statusText.textContent = message;
  }

  function clearStatus() {
    actionStatus.classList.add('hidden');
    actionStatus.className = 'action-status hidden';
  }

  // Generate EPUB Helper
  function getPreparedEpubGenerator() {
    if (!currentArticle) return null;

    return new EpubGenerator({
      title: titleInput.value.trim() || currentArticle.title,
      author: authorInput.value.trim() || currentArticle.byline,
      content: currentArticle.content,
      url: currentArticle.url,
      siteName: currentArticle.siteName,
      publishedTime: currentArticle.publishedTime,
      language: currentArticle.language || 'en'
    });
  }

  // Handle Download EPUB
  btnDownloadEpub.addEventListener('click', async () => {
    if (!currentArticle) return;

    try {
      btnDownloadEpub.disabled = true;
      setStatus('loading', 'Generating EPUB...');

      const generator = getPreparedEpubGenerator();
      const blob = await generator.generateBlob();
      const filename = generator.getSafeFilename();

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

      setStatus('success', `Saved ${filename}`);
      setTimeout(clearStatus, 4000);
    } catch (err) {
      console.error('Download error:', err);
      setStatus('error', `Download failed: ${err.message}`);
    } finally {
      btnDownloadEpub.disabled = false;
    }
  });

  // Handle Send to Kindle
  btnSendKindle.addEventListener('click', async () => {
    if (!currentArticle || isPageSent) return;

    try {
      await loadSettings();
      if (!currentSettings.kindleEmail) {
        setStatus('error', 'Please configure your Kindle email first.');
        openSettings();
        return;
      }

      btnSendKindle.disabled = true;
      btnDownloadEpub.disabled = true;
      setStatus('loading', 'Packaging Kindle EPUB...');

      const generator = getPreparedEpubGenerator();
      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      setStatus('loading', `Sending to ${currentSettings.kindleEmail}...`);

      const result = await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        url: currentArticle.url
      });

      setStatus('success', `Sent to Kindle! (${currentSettings.kindleEmail})`);
      setButtonSentState(true);

    } catch (err) {
      console.error('Send error:', err);
      setStatus('error', err.message || 'Failed to send to Kindle.');
      setButtonSentState(false);
    } finally {
      if (!isPageSent) {
        btnSendKindle.disabled = false;
      }
      btnDownloadEpub.disabled = false;
    }
  });

  async function init() {
    await loadSettings();
    await extractActiveTab();
  }

  init();
});
