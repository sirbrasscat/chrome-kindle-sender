/**
 * Web to Kindle Extension - Popup Controller
 * Supports Single Article, Multi-Chapter Online Book conversion, and Action History tracking.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation / Tabs
  const tabArticle = document.getElementById('tab-article');
  const tabBook = document.getElementById('tab-book');
  const tabHistory = document.getElementById('tab-history');
  const badgeBookChapters = document.getElementById('badge-book-chapters');
  const badgeHistoryCount = document.getElementById('badge-history-count');

  const viewArticle = document.getElementById('view-article');
  const viewBook = document.getElementById('view-book');
  const viewHistory = document.getElementById('view-history');

  // Banners & Views
  const stateLoading = document.getElementById('state-loading');
  const stateError = document.getElementById('state-error');
  const unconfiguredBanner = document.getElementById('unconfigured-banner');
  const bookDetectedBanner = document.getElementById('book-detected-banner');
  const txtDetectedSummary = document.getElementById('txt-detected-summary');
  const btnSwitchBook = document.getElementById('btn-switch-book');
  const errorMessage = document.getElementById('error-message');

  // Single Article View Elements
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

  // Book View Elements
  const bookTitleInput = document.getElementById('book-title');
  const bookAuthorInput = document.getElementById('book-author');
  const badgeChaptersCount = document.getElementById('badge-chapters-count');
  const badgeBookStats = document.getElementById('badge-book-stats');
  const chaptersListContainer = document.getElementById('chapters-list-container');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnDeselectAll = document.getElementById('btn-deselect-all');
  const crawlProgressBox = document.getElementById('crawl-progress-box');
  const txtProgressLabel = document.getElementById('txt-progress-label');
  const txtProgressPercent = document.getElementById('txt-progress-percent');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const btnCancelCrawl = document.getElementById('btn-cancel-crawl');
  const bookActionStatus = document.getElementById('book-action-status');
  const bookStatusSpinner = document.getElementById('book-status-spinner');
  const bookStatusText = document.getElementById('book-status-text');
  const bookInitialActions = document.getElementById('book-initial-actions');
  const bookCompletedActions = document.getElementById('book-completed-actions');
  const btnStartCrawl = document.getElementById('btn-start-crawl');
  const btnSendBookKindle = document.getElementById('btn-send-book-kindle');
  const btnDownloadBookEpub = document.getElementById('btn-download-book-epub');

  // History View Elements
  const inputHistorySearch = document.getElementById('input-history-search');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const historyEmpty = document.getElementById('history-empty');
  const historyItemsContainer = document.getElementById('history-items-container');

  // General Controls
  const btnSettings = document.getElementById('btn-settings');
  const btnOpenConfig = document.getElementById('btn-open-config');
  const linkOptions = document.getElementById('link-options');
  const btnRetry = document.getElementById('btn-retry');

  // State Variables
  let currentArticle = null;
  let currentSettings = null;
  let detectedChapters = [];
  let crawledChaptersData = null;
  let activeAbortController = null;
  let isArticleSent = false;
  let isBookSent = false;
  let cachedHistory = [];

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

  // Tab Switcher
  function switchTab(mode) {
    tabArticle.classList.toggle('active', mode === 'article');
    tabBook.classList.toggle('active', mode === 'book');
    tabHistory.classList.toggle('active', mode === 'history');

    viewArticle.classList.toggle('hidden', mode !== 'article');
    viewBook.classList.toggle('hidden', mode !== 'book');
    viewHistory.classList.toggle('hidden', mode !== 'history');

    if (mode === 'history') {
      renderHistory();
    }
  }

  tabArticle.addEventListener('click', () => switchTab('article'));
  tabBook.addEventListener('click', () => switchTab('book'));
  tabHistory.addEventListener('click', () => switchTab('history'));
  btnSwitchBook.addEventListener('click', () => switchTab('book'));

  // Button Sent States
  function setArticleSentState(sent) {
    isArticleSent = sent;
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

  function setBookSentState(sent) {
    isBookSent = sent;
    if (sent) {
      btnSendBookKindle.classList.add('btn-sent');
      btnSendBookKindle.disabled = true;
      btnSendBookKindle.innerHTML = sentButtonHtml;
      btnSendBookKindle.title = 'This book has already been sent to your Kindle.';
    } else {
      btnSendBookKindle.classList.remove('btn-sent');
      btnSendBookKindle.disabled = false;
      btnSendBookKindle.innerHTML = defaultSendButtonHtml;
      btnSendBookKindle.title = '';
    }
  }

  // Re-enable send buttons when inputs change
  titleInput.addEventListener('input', () => { if (isArticleSent) setArticleSentState(false); });
  authorInput.addEventListener('input', () => { if (isArticleSent) setArticleSentState(false); });
  bookTitleInput.addEventListener('input', () => { if (isBookSent) setBookSentState(false); });
  bookAuthorInput.addEventListener('input', () => { if (isBookSent) setBookSentState(false); });

  // Open Settings
  const openSettings = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  };

  btnSettings.addEventListener('click', openSettings);
  btnOpenConfig?.addEventListener('click', openSettings);
  linkOptions?.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
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

  // History Management & Rendering
  async function loadHistoryBadge() {
    cachedHistory = await HistoryService.getHistory();
    if (cachedHistory.length > 0) {
      badgeHistoryCount.textContent = cachedHistory.length;
      badgeHistoryCount.classList.remove('hidden');
    } else {
      badgeHistoryCount.classList.add('hidden');
    }
  }

  async function renderHistory() {
    cachedHistory = await HistoryService.getHistory();
    loadHistoryBadge();

    const query = inputHistorySearch.value.trim().toLowerCase();
    const filtered = query ? cachedHistory.filter(item => {
      return (item.title && item.title.toLowerCase().includes(query)) ||
             (item.author && item.author.toLowerCase().includes(query)) ||
             (item.siteName && item.siteName.toLowerCase().includes(query));
    }) : cachedHistory;

    historyItemsContainer.innerHTML = '';

    if (filtered.length === 0) {
      historyEmpty.classList.remove('hidden');
      return;
    }

    historyEmpty.classList.add('hidden');

    filtered.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';

      const isSent = item.action === 'sent';
      const actionBadge = isSent ?
        `<span class="history-badge history-badge-sent">📤 Sent</span>` :
        `<span class="history-badge history-badge-downloaded">💾 Saved</span>`;

      const typeBadge = item.type === 'book' ?
        `<span class="history-badge history-badge-type">📚 Book (${item.chaptersCount || 1} ch)</span>` :
        `<span class="history-badge history-badge-type">📄 Article</span>`;

      const formattedTime = HistoryService.formatTime(item.timestamp);
      const wordsText = item.wordCount ? `${(item.wordCount).toLocaleString()} words` : '';

      el.innerHTML = `
        <div class="history-item-top">
          <div class="history-badges">
            ${actionBadge}
            ${typeBadge}
          </div>
          <button class="btn-delete-item" data-id="${item.id}" title="Remove from history">✕</button>
        </div>
        <a href="${item.url || '#'}" target="_blank" rel="noopener" class="history-title">${item.title || 'Untitled'}</a>
        <div class="history-meta">
          ${item.author ? `<span>By ${item.author}</span><span>·</span>` : ''}
          ${item.siteName ? `<span>${item.siteName}</span><span>·</span>` : ''}
          ${wordsText ? `<span>${wordsText}</span><span>·</span>` : ''}
          <span>${formattedTime}</span>
        </div>
      `;

      // Delete single item handler
      el.querySelector('.btn-delete-item').addEventListener('click', async (e) => {
        e.stopPropagation();
        await HistoryService.deleteEntry(item.id);
        renderHistory();
      });

      historyItemsContainer.appendChild(el);
    });
  }

  inputHistorySearch.addEventListener('input', () => renderHistory());

  btnClearHistory.addEventListener('click', async () => {
    if (confirm('Clear all action history?')) {
      await HistoryService.clearHistory();
      renderHistory();
    }
  });

  // Extract Content from Active Tab
  async function extractActiveTab() {
    stateLoading.classList.remove('hidden');
    stateError.classList.add('hidden');
    viewArticle.classList.add('hidden');
    viewBook.classList.add('hidden');
    viewHistory.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        throw new Error('Cannot extract reader content from browser internal pages.');
      }

      // Inject Readability, BookCrawler and extractor script into tab
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['lib/readability.js', 'lib/book-crawler.js', 'content/extractor.js']
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

      // Check for book chapters on current page
      detectedChapters = currentArticle.chapters || [];

      // If no chapters found on current page, check if parent index contains a Table of Contents (e.g. user is on chap01.html)
      if (detectedChapters.length <= 1) {
        try {
          const currentUrl = new URL(currentArticle.url);
          const parentDirUrl = new URL('.', currentUrl.href).href;
          const indexUrl = new URL('index.html', parentDirUrl).href;

          if (indexUrl !== currentArticle.url) {
            const indexResp = await fetch(indexUrl, { headers: { 'Accept': 'text/html' } });
            if (indexResp.ok) {
              const indexHtml = await indexResp.text();
              const parser = new DOMParser();
              const indexDoc = parser.parseFromString(indexHtml, 'text/html');
              const parentChapters = BookCrawler.discoverChapters(indexDoc, indexUrl);
              if (parentChapters && parentChapters.length > 1) {
                detectedChapters = parentChapters;
              }
            }
          }
        } catch (e) {
          console.warn('Could not auto-fetch parent TOC:', e);
        }
      }

      if (detectedChapters.length > 1) {
        setupBookMode(currentArticle, detectedChapters);
      } else {
        badgeBookChapters.classList.add('hidden');
        bookDetectedBanner.classList.add('hidden');
      }

      stateLoading.classList.add('hidden');
      switchTab('article');

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
    setArticleSentState(false);
  }

  function setupBookMode(article, chapters) {
    badgeBookChapters.textContent = chapters.length;
    badgeBookChapters.classList.remove('hidden');

    txtDetectedSummary.textContent = `Found Table of Contents with ${chapters.length} chapters.`;
    bookDetectedBanner.classList.remove('hidden');

    // Default book metadata
    let cleanBookTitle = article.siteName || article.title;
    if (article.title.includes(' — ') || article.title.includes(' - ')) {
      cleanBookTitle = article.title.split(/ [—-]/)[0].trim();
    }
    bookTitleInput.value = cleanBookTitle;
    bookAuthorInput.value = article.byline || '';
    badgeChaptersCount.textContent = `${chapters.length} Chapters`;
    badgeBookStats.textContent = 'Ready to compile';

    // Render Chapters Checklist
    chaptersListContainer.innerHTML = '';
    chapters.forEach(chap => {
      const item = document.createElement('label');
      item.className = 'chapter-item';
      item.innerHTML = `
        <input type="checkbox" class="chapter-checkbox" data-url="${encodeURIComponent(chap.url)}" data-title="${encodeURIComponent(chap.title)}" checked />
        <div class="chapter-info">
          <span class="chapter-name">${chap.title}</span>
          <span class="chapter-url">${chap.url}</span>
        </div>
      `;
      chaptersListContainer.appendChild(item);
    });

    // Reset book states
    crawledChaptersData = null;
    bookInitialActions.classList.remove('hidden');
    bookCompletedActions.classList.add('hidden');
    setBookSentState(false);
  }

  // Select / Deselect All Chapters
  btnSelectAll?.addEventListener('click', () => {
    chaptersListContainer.querySelectorAll('.chapter-checkbox').forEach(cb => { cb.checked = true; });
  });
  btnDeselectAll?.addEventListener('click', () => {
    chaptersListContainer.querySelectorAll('.chapter-checkbox').forEach(cb => { cb.checked = false; });
  });

  // Status Helpers
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
  }

  function setBookStatus(type, message) {
    bookActionStatus.className = 'action-status';
    bookActionStatus.classList.remove('hidden');
    if (type === 'loading') {
      bookActionStatus.classList.add('status-loading');
      bookStatusSpinner.classList.remove('hidden');
    } else if (type === 'success') {
      bookActionStatus.classList.add('status-success');
      bookStatusSpinner.classList.add('hidden');
    } else if (type === 'error') {
      bookActionStatus.classList.add('status-error');
      bookStatusSpinner.classList.add('hidden');
    }
    bookStatusText.textContent = message;
  }

  // Single Article: Download EPUB
  btnDownloadEpub.addEventListener('click', async () => {
    if (!currentArticle) return;
    try {
      btnDownloadEpub.disabled = true;
      setStatus('loading', 'Generating EPUB...');

      const generator = new EpubGenerator({
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        content: currentArticle.content,
        url: currentArticle.url,
        siteName: currentArticle.siteName,
        publishedTime: currentArticle.publishedTime,
        language: currentArticle.language || 'en'
      });

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

      // Save to History
      await HistoryService.addEntry({
        type: 'article',
        action: 'downloaded',
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        url: currentArticle.url,
        siteName: currentArticle.siteName,
        filename: filename,
        wordCount: currentArticle.wordCount || 0
      });
      loadHistoryBadge();

      setStatus('success', `Saved ${filename}`);
      setTimeout(clearStatus, 4000);
    } catch (err) {
      console.error('Download error:', err);
      setStatus('error', `Download failed: ${err.message}`);
    } finally {
      btnDownloadEpub.disabled = false;
    }
  });

  // Single Article: Send to Kindle
  btnSendKindle.addEventListener('click', async () => {
    if (!currentArticle || isArticleSent) return;

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

      const generator = new EpubGenerator({
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        content: currentArticle.content,
        url: currentArticle.url,
        siteName: currentArticle.siteName,
        publishedTime: currentArticle.publishedTime,
        language: currentArticle.language || 'en'
      });

      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      setStatus('loading', `Sending to ${currentSettings.kindleEmail}...`);

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        url: currentArticle.url
      });

      // Save to History
      await HistoryService.addEntry({
        type: 'article',
        action: 'sent',
        title: titleInput.value.trim() || currentArticle.title,
        author: authorInput.value.trim() || currentArticle.byline,
        url: currentArticle.url,
        siteName: currentArticle.siteName,
        filename: filename,
        wordCount: currentArticle.wordCount || 0,
        recipient: currentSettings.kindleEmail
      });
      loadHistoryBadge();

      setStatus('success', `Sent to Kindle! (${currentSettings.kindleEmail})`);
      setArticleSentState(true);

    } catch (err) {
      console.error('Send error:', err);
      setStatus('error', err.message || 'Failed to send to Kindle.');
      setArticleSentState(false);
    } finally {
      if (!isArticleSent) {
        btnSendKindle.disabled = false;
      }
      btnDownloadEpub.disabled = false;
    }
  });

  // Book Mode: Start Recursive Crawl
  btnStartCrawl.addEventListener('click', async () => {
    const checkedBoxes = Array.from(chaptersListContainer.querySelectorAll('.chapter-checkbox:checked'));
    if (checkedBoxes.length === 0) {
      setBookStatus('error', 'Please select at least one chapter to build.');
      return;
    }

    const selectedChapters = checkedBoxes.map((cb, idx) => ({
      id: `chapter_${idx + 1}`,
      title: decodeURIComponent(cb.dataset.title),
      url: decodeURIComponent(cb.dataset.url)
    }));

    activeAbortController = new AbortController();
    crawlProgressBox.classList.remove('hidden');
    bookInitialActions.classList.add('hidden');
    bookActionStatus.classList.add('hidden');
    progressBarFill.style.width = '0%';
    txtProgressPercent.textContent = '0%';
    txtProgressLabel.textContent = `Starting crawl for ${selectedChapters.length} chapters...`;

    try {
      crawledChaptersData = await BookCrawler.crawlChapters(selectedChapters, {
        signal: activeAbortController.signal,
        onProgress: (p) => {
          txtProgressLabel.textContent = `Fetching ${p.current}/${p.total}: ${p.chapterTitle}`;
          txtProgressPercent.textContent = `${p.percent}%`;
          progressBarFill.style.width = `${p.percent}%`;
        }
      });

      // Calculate stats
      const totalWords = crawledChaptersData.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
      const estHours = (totalWords / 12000).toFixed(1);

      badgeBookStats.textContent = `${totalWords.toLocaleString()} words (~${estHours} hrs)`;
      crawlProgressBox.classList.add('hidden');
      bookCompletedActions.classList.remove('hidden');
      setBookStatus('success', `✓ Successfully compiled ${crawledChaptersData.length} chapters!`);
      setBookSentState(false);

    } catch (err) {
      console.error('Crawl error:', err);
      crawlProgressBox.classList.add('hidden');
      bookInitialActions.classList.remove('hidden');
      setBookStatus('error', `Crawl stopped: ${err.message}`);
    } finally {
      activeAbortController = null;
    }
  });

  // Cancel Crawl
  btnCancelCrawl.addEventListener('click', () => {
    if (activeAbortController) {
      activeAbortController.abort();
    }
  });

  // Book Mode: Download Complete Book EPUB
  btnDownloadBookEpub.addEventListener('click', async () => {
    if (!crawledChaptersData || crawledChaptersData.length === 0) return;

    try {
      btnDownloadBookEpub.disabled = true;
      setBookStatus('loading', 'Generating complete Book EPUB...');

      const generator = new EpubGenerator({
        title: bookTitleInput.value.trim() || 'Online Book',
        author: bookAuthorInput.value.trim() || 'Author',
        siteName: currentArticle?.siteName || '',
        publishedTime: new Date().toISOString(),
        language: currentArticle?.language || 'en',
        chapters: crawledChaptersData
      });

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

      const totalWords = crawledChaptersData.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

      // Save to History
      await HistoryService.addEntry({
        type: 'book',
        action: 'downloaded',
        title: bookTitleInput.value.trim() || 'Online Book',
        author: bookAuthorInput.value.trim() || 'Author',
        url: currentArticle?.url,
        siteName: currentArticle?.siteName,
        filename: filename,
        chaptersCount: crawledChaptersData.length,
        wordCount: totalWords
      });
      loadHistoryBadge();

      setBookStatus('success', `✓ Saved ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      setBookStatus('error', `Download failed: ${err.message}`);
    } finally {
      btnDownloadBookEpub.disabled = false;
    }
  });

  // Book Mode: Send Book to Kindle
  btnSendBookKindle.addEventListener('click', async () => {
    if (!crawledChaptersData || crawledChaptersData.length === 0 || isBookSent) return;

    try {
      await loadSettings();
      if (!currentSettings.kindleEmail) {
        setBookStatus('error', 'Please configure your Kindle email first.');
        openSettings();
        return;
      }

      btnSendBookKindle.disabled = true;
      btnDownloadBookEpub.disabled = true;
      setBookStatus('loading', 'Packaging complete book EPUB for Kindle...');

      const generator = new EpubGenerator({
        title: bookTitleInput.value.trim() || 'Online Book',
        author: bookAuthorInput.value.trim() || 'Author',
        siteName: currentArticle?.siteName || '',
        publishedTime: new Date().toISOString(),
        language: currentArticle?.language || 'en',
        chapters: crawledChaptersData
      });

      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      setBookStatus('loading', `Sending book to ${currentSettings.kindleEmail}...`);

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: bookTitleInput.value.trim() || 'Online Book',
        author: bookAuthorInput.value.trim() || 'Author',
        url: currentArticle?.url
      });

      const totalWords = crawledChaptersData.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

      // Save to History
      await HistoryService.addEntry({
        type: 'book',
        action: 'sent',
        title: bookTitleInput.value.trim() || 'Online Book',
        author: bookAuthorInput.value.trim() || 'Author',
        url: currentArticle?.url,
        siteName: currentArticle?.siteName,
        filename: filename,
        chaptersCount: crawledChaptersData.length,
        wordCount: totalWords,
        recipient: currentSettings.kindleEmail
      });
      loadHistoryBadge();

      setBookStatus('success', `✓ Book sent to Kindle! (${currentSettings.kindleEmail})`);
      setBookSentState(true);

    } catch (err) {
      console.error('Send book error:', err);
      setBookStatus('error', err.message || 'Failed to send book to Kindle.');
      setBookSentState(false);
    } finally {
      if (!isBookSent) {
        btnSendBookKindle.disabled = false;
      }
      btnDownloadBookEpub.disabled = false;
    }
  });

  async function init() {
    await loadSettings();
    await loadHistoryBadge();
    await extractActiveTab();
  }

  init();
});
