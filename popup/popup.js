/**
 * Web to Kindle Extension - Popup Controller
 * Supports Single Article, Persistent Background Book Crawling, PDF Documents, and Action History with Resend.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation / Tabs
  const tabArticle = document.getElementById('tab-article');
  const tabBook = document.getElementById('tab-book');
  const tabPdf = document.getElementById('tab-pdf');
  const tabHistory = document.getElementById('tab-history');

  const badgeBookChapters = document.getElementById('badge-book-chapters');
  const badgePdfDetected = document.getElementById('badge-pdf-detected');
  const badgeHistoryCount = document.getElementById('badge-history-count');

  const viewArticle = document.getElementById('view-article');
  const viewBook = document.getElementById('view-book');
  const viewPdf = document.getElementById('view-pdf');
  const viewHistory = document.getElementById('view-history');

  // Banners & Views
  const stateLoading = document.getElementById('state-loading');
  const stateError = document.getElementById('state-error');
  const unconfiguredBanner = document.getElementById('unconfigured-banner');
  const bookDetectedBanner = document.getElementById('book-detected-banner');
  const pdfDetectedBanner = document.getElementById('pdf-detected-banner');
  const txtDetectedSummary = document.getElementById('txt-detected-summary');
  const txtPdfDetectedSummary = document.getElementById('txt-pdf-detected-summary');
  const btnSwitchBook = document.getElementById('btn-switch-book');
  const btnSwitchPdf = document.getElementById('btn-switch-pdf');
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

  // PDF View Elements
  const pdfDropZone = document.getElementById('pdf-drop-zone');
  const inputPdfFile = document.getElementById('input-pdf-file');
  const pdfInfoCard = document.getElementById('pdf-info-card');
  const pdfTitleInput = document.getElementById('pdf-title');
  const pdfAuthorInput = document.getElementById('pdf-author');
  const badgePdfPages = document.getElementById('badge-pdf-pages');
  const badgePdfSize = document.getElementById('badge-pdf-size');
  const badgePdfStatus = document.getElementById('badge-pdf-status');
  const pdfSizeWarning = document.getElementById('pdf-size-warning');
  const pdfProgressBox = document.getElementById('pdf-progress-box');
  const txtPdfProgressLabel = document.getElementById('txt-pdf-progress-label');
  const txtPdfProgressPercent = document.getElementById('txt-pdf-progress-percent');
  const pdfProgressBarFill = document.getElementById('pdf-progress-bar-fill');
  const pdfActionStatus = document.getElementById('pdf-action-status');
  const pdfStatusSpinner = document.getElementById('pdf-status-spinner');
  const pdfStatusText = document.getElementById('pdf-status-text');
  const pdfActions = document.getElementById('pdf-actions');
  const btnSendRawPdf = document.getElementById('btn-send-raw-pdf');
  const btnConvertSendEpub = document.getElementById('btn-convert-send-epub');
  const btnDownloadPdfEpub = document.getElementById('btn-download-pdf-epub');
  const txtDropTitle = document.getElementById('txt-drop-title');

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
  let loadedPdfData = null;
  let isArticleSent = false;
  let isBookSent = false;
  let isPdfSent = false;
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
    tabPdf.classList.toggle('active', mode === 'pdf');
    tabHistory.classList.toggle('active', mode === 'history');

    viewArticle.classList.toggle('hidden', mode !== 'article');
    viewBook.classList.toggle('hidden', mode !== 'book');
    viewPdf.classList.toggle('hidden', mode !== 'pdf');
    viewHistory.classList.toggle('hidden', mode !== 'history');

    if (mode === 'history') {
      renderHistory();
    }
  }

  tabArticle.addEventListener('click', () => switchTab('article'));
  tabBook.addEventListener('click', () => switchTab('book'));
  tabPdf.addEventListener('click', () => switchTab('pdf'));
  tabHistory.addEventListener('click', () => switchTab('history'));
  btnSwitchBook.addEventListener('click', () => switchTab('book'));
  btnSwitchPdf.addEventListener('click', () => switchTab('pdf'));

  // Button Sent States
  function setArticleSentState(sent) {
    isArticleSent = sent;
    if (sent) {
      btnSendKindle.classList.add('btn-sent');
      btnSendKindle.disabled = true;
      btnSendKindle.innerHTML = sentButtonHtml;
    } else {
      btnSendKindle.classList.remove('btn-sent');
      btnSendKindle.disabled = false;
      btnSendKindle.innerHTML = defaultSendButtonHtml;
    }
  }

  function setBookSentState(sent) {
    isBookSent = sent;
    if (sent) {
      btnSendBookKindle.classList.add('btn-sent');
      btnSendBookKindle.disabled = true;
      btnSendBookKindle.innerHTML = sentButtonHtml;
    } else {
      btnSendBookKindle.classList.remove('btn-sent');
      btnSendBookKindle.disabled = false;
      btnSendBookKindle.innerHTML = defaultSendButtonHtml;
    }
  }

  function setPdfSentState(sent, buttonEl) {
    isPdfSent = sent;
    if (buttonEl) {
      if (sent) {
        buttonEl.classList.add('btn-sent');
        buttonEl.disabled = true;
        buttonEl.innerHTML = sentButtonHtml;
      } else {
        buttonEl.classList.remove('btn-sent');
        buttonEl.disabled = false;
      }
    }
  }

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

  // History Management & Rendering with RESEND Button
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

      let typeBadge = `<span class="history-badge history-badge-type">📄 Article</span>`;
      if (item.type === 'book') {
        typeBadge = `<span class="history-badge history-badge-type">📚 Book (${item.chaptersCount || 1} ch)</span>`;
      } else if (item.type === 'pdf') {
        typeBadge = `<span class="history-badge history-badge-type">📑 PDF</span>`;
      }

      const formattedTime = HistoryService.formatTime(item.timestamp);
      const wordsText = item.wordCount ? `${(item.wordCount).toLocaleString()} words` : '';

      el.innerHTML = `
        <div class="history-item-top">
          <div class="history-badges">
            ${actionBadge}
            ${typeBadge}
          </div>
          <div class="history-item-actions">
            <button class="btn-resend-item" data-id="${item.id}" title="Resend to Kindle (${currentSettings?.kindleEmail || 'Kindle'})">🔄 Resend</button>
            <button class="btn-delete-item" data-id="${item.id}" title="Remove from history">✕</button>
          </div>
        </div>
        <a href="${item.url || '#'}" target="_blank" rel="noopener" class="history-title">${item.title || 'Untitled'}</a>
        <div class="history-meta">
          ${item.author ? `<span>By ${item.author}</span><span>·</span>` : ''}
          ${item.siteName ? `<span>${item.siteName}</span><span>·</span>` : ''}
          ${wordsText ? `<span>${wordsText}</span><span>·</span>` : ''}
          <span>${formattedTime}</span>
        </div>
      `;

      // Resend Item Handler
      const resendBtn = el.querySelector('.btn-resend-item');
      resendBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        resendBtn.disabled = true;
        resendBtn.classList.add('resending');
        resendBtn.textContent = '⏳ Sending...';

        try {
          const resp = await chrome.runtime.sendMessage({ action: 'resendHistoryItem', item });
          if (!resp || !resp.success) {
            throw new Error(resp?.error || 'Failed to resend item to Kindle.');
          }
          resendBtn.classList.remove('resending');
          resendBtn.classList.add('resent');
          resendBtn.textContent = '✓ Sent';
          setTimeout(() => renderHistory(), 2500);
        } catch (err) {
          console.error('Resend error:', err);
          alert(`Failed to resend to Kindle: ${err.message}`);
          resendBtn.disabled = false;
          resendBtn.classList.remove('resending');
          resendBtn.textContent = '🔄 Resend';
        }
      });

      // Delete Item Handler
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

  // Listen for Background Job Progress Updates (Persistent crawling)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'jobProgress' && message.job) {
      updateCrawlProgressUI(message.job);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.activeJob) {
      const job = changes.activeJob.newValue;
      if (job) {
        updateCrawlProgressUI(job);
      }
    }
  });

  function updateCrawlProgressUI(job) {
    if (job.status === 'crawling') {
      crawlProgressBox.classList.remove('hidden');
      bookInitialActions.classList.add('hidden');
      bookCompletedActions.classList.add('hidden');
      bookActionStatus.classList.add('hidden');

      txtProgressLabel.textContent = `Fetching ${job.current}/${job.total}: ${job.chapterTitle || 'Crawling...'}`;
      txtProgressPercent.textContent = `${job.percent}%`;
      progressBarFill.style.width = `${job.percent}%`;
    } else if (job.status === 'compiled') {
      crawlProgressBox.classList.add('hidden');
      bookInitialActions.classList.add('hidden');
      bookCompletedActions.classList.remove('hidden');
      badgeBookStats.textContent = `${(job.totalWords || 0).toLocaleString()} words (~${((job.totalWords || 0)/12000).toFixed(1)} hrs)`;
      setBookStatus('success', `✓ Successfully compiled ${job.chaptersCount || job.total} chapters!`);
      setBookSentState(false);
    } else if (job.status === 'sent') {
      crawlProgressBox.classList.add('hidden');
      bookInitialActions.classList.add('hidden');
      bookCompletedActions.classList.remove('hidden');
      setBookStatus('success', `✓ Book sent to Kindle! (${currentSettings?.kindleEmail || ''})`);
      setBookSentState(true);
    } else if (job.status === 'error') {
      crawlProgressBox.classList.add('hidden');
      bookInitialActions.classList.remove('hidden');
      setBookStatus('error', `Crawl stopped: ${job.error || 'Unknown error'}`);
    }
  }

  // Restore Background Job State on Popup Open
  async function checkAndRestoreActiveJob() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['activeJob', 'compiledBookData'], (res) => {
        const job = res.activeJob;
        if (job) {
          if (res.compiledBookData) {
            crawledChaptersData = res.compiledBookData;
          }
          if (job.bookTitle) bookTitleInput.value = job.bookTitle;
          if (job.bookAuthor) bookAuthorInput.value = job.bookAuthor;

          if (job.status === 'crawling' || job.status === 'compiled' || job.status === 'sent') {
            updateCrawlProgressUI(job);
            switchTab('book');
            resolve(true);
            return;
          }
        }
        resolve(false);
      });
    });
  }

  // Extract Content from Active Tab
  async function extractActiveTab() {
    // First check if an active background job was already in progress
    const restoredJob = await checkAndRestoreActiveJob();

    stateLoading.classList.remove('hidden');
    stateError.classList.add('hidden');
    viewArticle.classList.add('hidden');
    viewBook.classList.add('hidden');
    viewPdf.classList.add('hidden');
    viewHistory.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active browser tab found.');
      }

      // Check if tab is directly viewing a PDF file
      const urlLower = (tab.url || '').toLowerCase();
      const titleLower = (tab.title || '').toLowerCase();
      const isDirectPdf = urlLower.endsWith('.pdf') ||
                          urlLower.includes('.pdf?') ||
                          urlLower.includes('.pdf#') ||
                          urlLower.includes('/pdf/') ||
                          urlLower.endsWith('/pdf') ||
                          urlLower.includes('format=pdf') ||
                          urlLower.includes('application/pdf') ||
                          urlLower.startsWith('chrome-extension://') && urlLower.includes('pdf') ||
                          titleLower.endsWith('.pdf') ||
                          titleLower.endsWith('.pdf - google chrome');

      if (isDirectPdf) {
        handlePdfUrlDetected(tab.url, tab.title);
        stateLoading.classList.add('hidden');
        if (!restoredJob) switchTab('pdf');
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        if (!restoredJob) {
          throw new Error('Cannot extract reader content from browser internal pages.');
        }
        stateLoading.classList.add('hidden');
        return;
      }

      // Inject scripts into tab
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
        if (!restoredJob) {
          throw new Error(response?.error || 'Could not extract reader article from this page.');
        }
        stateLoading.classList.add('hidden');
        return;
      }

      currentArticle = response.article;
      renderArticle(currentArticle);

      // Check for book chapters on current page
      detectedChapters = currentArticle.chapters || [];

      // If no chapters found on current page, check if parent index contains a Table of Contents
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

      // Check for PDF links discovered on the webpage
      if (currentArticle.pdfLinks && currentArticle.pdfLinks.length > 0) {
        const firstPdf = currentArticle.pdfLinks[0];
        badgePdfDetected.classList.remove('hidden');
        txtPdfDetectedSummary.textContent = `Found PDF document: ${firstPdf.title}`;
        pdfDetectedBanner.classList.remove('hidden');
        btnSwitchPdf.onclick = () => {
          loadPdfFromSource(firstPdf.url, firstPdf.title);
          switchTab('pdf');
        };
      } else {
        badgePdfDetected.classList.add('hidden');
        pdfDetectedBanner.classList.add('hidden');
      }

      stateLoading.classList.add('hidden');
      if (!restoredJob) {
        switchTab('article');
      }

    } catch (err) {
      console.error('Extraction error:', err);
      if (!restoredJob) {
        errorMessage.textContent = err.message || 'Failed to extract content.';
        stateLoading.classList.add('hidden');
        stateError.classList.remove('hidden');
      } else {
        stateLoading.classList.add('hidden');
      }
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

    let cleanBookTitle = article.siteName || article.title;
    if (article.title.includes(' — ') || article.title.includes(' - ')) {
      cleanBookTitle = article.title.split(/ [—-]/)[0].trim();
    }
    if (!bookTitleInput.value) bookTitleInput.value = cleanBookTitle;
    if (!bookAuthorInput.value) bookAuthorInput.value = article.byline || '';
    badgeChaptersCount.textContent = `${chapters.length} Chapters`;
    badgeBookStats.textContent = 'Ready to compile';

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

    if (!crawledChaptersData) {
      bookInitialActions.classList.remove('hidden');
      bookCompletedActions.classList.add('hidden');
      setBookSentState(false);
    }
  }

  // PDF Handling Logic
  function handlePdfUrlDetected(pdfUrl, defaultTitle) {
    badgePdfDetected.classList.remove('hidden');
    txtPdfDetectedSummary.textContent = `Active page is a PDF: ${defaultTitle || 'PDF Document'}`;
    pdfDetectedBanner.classList.remove('hidden');

    loadPdfFromSource(pdfUrl, defaultTitle);
  }

  pdfDropZone.addEventListener('click', () => inputPdfFile.click());
  pdfDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropZone.classList.add('drag-over');
  });
  pdfDropZone.addEventListener('dragleave', () => pdfDropZone.classList.remove('drag-over'));
  pdfDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        loadPdfFromSource(file, file.name.replace(/\.pdf$/i, ''));
      } else {
        setPdfStatus('error', 'Please drop a valid .pdf file.');
      }
    }
  });

  inputPdfFile.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      loadPdfFromSource(file, file.name.replace(/\.pdf$/i, ''));
    }
  });

  async function loadPdfFromSource(source, fallbackTitle) {
    setPdfStatus('loading', 'Loading PDF document...');
    pdfProgressBox.classList.remove('hidden');
    txtPdfProgressLabel.textContent = 'Reading PDF binary data...';
    txtPdfProgressPercent.textContent = '0%';
    pdfProgressBarFill.style.width = '0%';

    try {
      const result = await PdfProcessor.processPdf(source, {
        onProgress: (p) => {
          txtPdfProgressLabel.textContent = `Extracting page ${p.current} of ${p.total}...`;
          txtPdfProgressPercent.textContent = `${p.percent}%`;
          pdfProgressBarFill.style.width = `${p.percent}%`;
        }
      });

      loadedPdfData = {
        source,
        result
      };

      pdfTitleInput.value = result.metadata.title || fallbackTitle || 'PDF Document';
      pdfAuthorInput.value = result.metadata.author || '';
      badgePdfPages.textContent = `${result.pageCount} Pages`;
      badgePdfSize.textContent = `${result.metadata.sizeMB} MB`;
      badgePdfStatus.textContent = `${(result.totalWords).toLocaleString()} words`;

      const isOver25MB = (result.sizeBytes / (1024 * 1024)) > 25;
      pdfSizeWarning.classList.toggle('hidden', !isOver25MB);

      pdfInfoCard.classList.remove('hidden');
      pdfActions.classList.remove('hidden');
      pdfProgressBox.classList.add('hidden');
      setPdfStatus('success', '✓ PDF loaded and parsed successfully!');

    } catch (err) {
      console.error('PDF parsing error:', err);
      pdfProgressBox.classList.add('hidden');
      setPdfStatus('error', `Failed to load PDF: ${err.message}`);
    }
  }

  function setPdfStatus(type, message) {
    pdfActionStatus.className = 'action-status';
    pdfActionStatus.classList.remove('hidden');
    if (type === 'loading') {
      pdfActionStatus.classList.add('status-loading');
      pdfStatusSpinner.classList.remove('hidden');
    } else if (type === 'success') {
      pdfActionStatus.classList.add('status-success');
      pdfStatusSpinner.classList.add('hidden');
    } else if (type === 'error') {
      pdfActionStatus.classList.add('status-error');
      pdfStatusSpinner.classList.add('hidden');
    }
    pdfStatusText.textContent = message;
  }

  // PDF Action 1: Send Raw PDF to Kindle
  btnSendRawPdf.addEventListener('click', async () => {
    if (!loadedPdfData || !loadedPdfData.result) return;

    try {
      await loadSettings();
      if (!currentSettings.kindleEmail) {
        setPdfStatus('error', 'Please configure your Kindle email in Settings first.');
        openSettings();
        return;
      }

      btnSendRawPdf.disabled = true;
      btnConvertSendEpub.disabled = true;
      setPdfStatus('loading', `Sending original PDF to ${currentSettings.kindleEmail}...`);

      const cleanTitle = (pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title || 'document').replace(/[/\\?%*:|"<>]/g, '_');
      const filename = `${cleanTitle}.pdf`;

      await EmailService.sendFile({
        fileBase64: loadedPdfData.result.rawPdfBase64,
        filename: filename,
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title,
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author,
        url: typeof loadedPdfData.source === 'string' ? loadedPdfData.source : ''
      });

      await HistoryService.addEntry({
        type: 'pdf',
        action: 'sent',
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title,
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author,
        url: typeof loadedPdfData.source === 'string' ? loadedPdfData.source : '',
        siteName: 'PDF Document',
        filename: filename,
        wordCount: loadedPdfData.result.totalWords,
        recipient: currentSettings.kindleEmail
      });
      loadHistoryBadge();

      setPdfStatus('success', `✓ Original PDF sent to Kindle! (${currentSettings.kindleEmail})`);
      setPdfSentState(true, btnSendRawPdf);

    } catch (err) {
      console.error('Send PDF error:', err);
      setPdfStatus('error', err.message || 'Failed to send PDF to Kindle.');
    } finally {
      btnSendRawPdf.disabled = isPdfSent;
      btnConvertSendEpub.disabled = false;
    }
  });

  // PDF Action 2: Convert & Send Reflowable EPUB to Kindle
  btnConvertSendEpub.addEventListener('click', async () => {
    if (!loadedPdfData || !loadedPdfData.result) return;

    try {
      await loadSettings();
      if (!currentSettings.kindleEmail) {
        setPdfStatus('error', 'Please configure your Kindle email in Settings first.');
        openSettings();
        return;
      }

      btnConvertSendEpub.disabled = true;
      btnSendRawPdf.disabled = true;
      setPdfStatus('loading', 'Generating reflowable EPUB ebook...');

      const generator = new EpubGenerator({
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title || 'PDF Ebook',
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author || 'Author',
        siteName: 'PDF Ebook',
        publishedTime: new Date().toISOString(),
        chapters: loadedPdfData.result.chapters
      });

      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      setPdfStatus('loading', `Sending reflowed EPUB to ${currentSettings.kindleEmail}...`);

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title,
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author,
        url: typeof loadedPdfData.source === 'string' ? loadedPdfData.source : ''
      });

      await HistoryService.addEntry({
        type: 'book',
        action: 'sent',
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title,
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author,
        url: typeof loadedPdfData.source === 'string' ? loadedPdfData.source : '',
        siteName: 'PDF Document',
        filename: filename,
        chaptersCount: loadedPdfData.result.chapters.length,
        wordCount: loadedPdfData.result.totalWords,
        recipient: currentSettings.kindleEmail
      });
      loadHistoryBadge();

      setPdfStatus('success', `✓ Reflowed EPUB sent to Kindle! (${currentSettings.kindleEmail})`);
      setPdfSentState(true, btnConvertSendEpub);

    } catch (err) {
      console.error('Convert & send error:', err);
      setPdfStatus('error', err.message || 'Failed to convert and send EPUB.');
    } finally {
      btnConvertSendEpub.disabled = isPdfSent;
      btnSendRawPdf.disabled = false;
    }
  });

  // PDF Action 3: Download Reflowed EPUB
  btnDownloadPdfEpub.addEventListener('click', async () => {
    if (!loadedPdfData || !loadedPdfData.result) return;

    try {
      btnDownloadPdfEpub.disabled = true;
      setPdfStatus('loading', 'Packaging EPUB for download...');

      const generator = new EpubGenerator({
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title || 'PDF Ebook',
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author || 'Author',
        siteName: 'PDF Ebook',
        publishedTime: new Date().toISOString(),
        chapters: loadedPdfData.result.chapters
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

      await HistoryService.addEntry({
        type: 'book',
        action: 'downloaded',
        title: pdfTitleInput.value.trim() || loadedPdfData.result.metadata.title,
        author: pdfAuthorInput.value.trim() || loadedPdfData.result.metadata.author,
        url: typeof loadedPdfData.source === 'string' ? loadedPdfData.source : '',
        siteName: 'PDF Document',
        filename: filename,
        chaptersCount: loadedPdfData.result.chapters.length,
        wordCount: loadedPdfData.result.totalWords
      });
      loadHistoryBadge();

      setPdfStatus('success', `✓ Downloaded ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      setPdfStatus('error', `Download failed: ${err.message}`);
    } finally {
      btnDownloadPdfEpub.disabled = false;
    }
  });

  // Select / Deselect All Book Chapters
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

  // Book Mode: Start Background Crawl (Persistent)
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

    crawlProgressBox.classList.remove('hidden');
    bookInitialActions.classList.add('hidden');
    bookActionStatus.classList.add('hidden');
    progressBarFill.style.width = '0%';
    txtProgressPercent.textContent = '0%';
    txtProgressLabel.textContent = `Starting crawl for ${selectedChapters.length} chapters...`;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startBackgroundCrawl',
        payload: {
          bookTitle: bookTitleInput.value.trim() || 'Online Book',
          bookAuthor: bookAuthorInput.value.trim() || '',
          selectedChapters: selectedChapters,
          autoSendKindle: false,
          sourceUrl: currentArticle?.url || '',
          siteName: currentArticle?.siteName || ''
        }
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to start background crawl');
      }

      if (response.chapters) {
        crawledChaptersData = response.chapters;
      }

    } catch (err) {
      console.error('Crawl trigger error:', err);
      crawlProgressBox.classList.add('hidden');
      bookInitialActions.classList.remove('hidden');
      setBookStatus('error', `Crawl failed: ${err.message}`);
    }
  });

  // Cancel Crawl
  btnCancelCrawl.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: 'cancelBackgroundJob' });
    crawlProgressBox.classList.add('hidden');
    bookInitialActions.classList.remove('hidden');
    setBookStatus('error', 'Crawl canceled.');
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
