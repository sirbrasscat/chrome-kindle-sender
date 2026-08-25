/**
 * Web to Kindle - Background Service Worker
 * Manages background crawling, offline EPUB compilation, Kindle email dispatch, and Action Resends.
 */

importScripts(
  '../lib/jszip.min.js',
  '../lib/readability.js',
  '../lib/book-crawler.js',
  '../lib/epub-generator.js',
  '../lib/email-service.js',
  '../lib/history-service.js'
);

let activeCrawlAbortController = null;

// Setup Context Menus on Installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-page-to-kindle',
    title: 'Send Page to Kindle',
    contexts: ['page', 'selection']
  });
});

// Update Badge Status Helper
function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) {
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'send-page-to-kindle' && tab && tab.id) {
    await handleSendTabToKindle(tab);
  }
});

// Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'send-to-kindle') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await handleSendTabToKindle(tab);
    }
  }
});

// Handle Runtime Messages from Popup / Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startBackgroundCrawl') {
    handleBackgroundCrawl(request.payload)
      .then(res => sendResponse({ success: true, ...res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'cancelBackgroundJob') {
    if (activeCrawlAbortController) {
      activeCrawlAbortController.abort();
      activeCrawlAbortController = null;
    }
    chrome.storage.local.remove(['activeJob', 'compiledBookData'], () => {
      updateBadge('', '#0284c7');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'resendHistoryItem') {
    handleResendHistoryItem(request.item)
      .then(res => sendResponse({ success: true, ...res }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'clearActiveJob') {
    chrome.storage.local.remove(['activeJob', 'compiledBookData'], () => {
      updateBadge('', '#0284c7');
      sendResponse({ success: true });
    });
    return true;
  }
});

/**
 * Executes a persistent background book crawl even when the popup is closed.
 */
async function handleBackgroundCrawl({ bookTitle, bookAuthor, selectedChapters, autoSendKindle, sourceUrl, siteName }) {
  if (!selectedChapters || selectedChapters.length === 0) {
    throw new Error('No chapters provided for background crawl.');
  }

  activeCrawlAbortController = new AbortController();
  const total = selectedChapters.length;

  const jobState = {
    id: Date.now(),
    type: 'book_crawl',
    status: 'crawling',
    bookTitle: bookTitle || 'Online Book',
    bookAuthor: bookAuthor || '',
    sourceUrl: sourceUrl || '',
    siteName: siteName || '',
    current: 0,
    total: total,
    percent: 0,
    chapterTitle: 'Starting crawl...',
    autoSendKindle: !!autoSendKindle,
    startTime: Date.now()
  };

  await chrome.storage.local.set({ activeJob: jobState });
  updateBadge('0%', '#0284c7');

  try {
    const crawledChapters = await BookCrawler.crawlChapters(selectedChapters, {
      signal: activeCrawlAbortController.signal,
      onProgress: async (p) => {
        jobState.current = p.current;
        jobState.percent = p.percent;
        jobState.chapterTitle = p.chapterTitle;

        updateBadge(`${p.percent}%`, '#0284c7');
        await chrome.storage.local.set({ activeJob: jobState });

        // Broadcast to open popup if any
        chrome.runtime.sendMessage({ action: 'jobProgress', job: jobState }).catch(() => {});
      }
    });

    const totalWords = crawledChapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);

    // Save compiled chapters to local storage so popup can retrieve them
    await chrome.storage.local.set({
      compiledBookData: crawledChapters,
      activeJob: {
        ...jobState,
        status: autoSendKindle ? 'sending' : 'compiled',
        totalWords: totalWords,
        chaptersCount: crawledChapters.length,
        percent: 100
      }
    });

    if (autoSendKindle) {
      updateBadge('...', '#0284c7');
      const settings = await EmailService.getSettings();
      if (!settings.kindleEmail) {
        throw new Error('Please configure your Kindle email in Settings.');
      }

      const generator = new EpubGenerator({
        title: bookTitle || 'Online Book',
        author: bookAuthor || 'Author',
        siteName: siteName || '',
        publishedTime: new Date().toISOString(),
        language: 'en',
        chapters: crawledChapters
      });

      const epubBase64 = await generator.generateBase64();
      const filename = generator.getSafeFilename();

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: bookTitle || 'Online Book',
        author: bookAuthor || 'Author',
        url: sourceUrl || ''
      });

      await HistoryService.addEntry({
        type: 'book',
        action: 'sent',
        title: bookTitle || 'Online Book',
        author: bookAuthor || 'Author',
        url: sourceUrl || '',
        siteName: siteName || 'Online Book',
        filename: filename,
        chaptersCount: crawledChapters.length,
        wordCount: totalWords,
        recipient: settings.kindleEmail
      });

      jobState.status = 'sent';
      await chrome.storage.local.set({ activeJob: jobState });

      updateBadge('OK', '#16a34a');
      setTimeout(() => updateBadge('', '#16a34a'), 5000);
    } else {
      updateBadge('DONE', '#16a34a');
    }

    return { chapters: crawledChapters, totalWords };

  } catch (err) {
    console.error('[Web2Kindle Service Worker] Crawl error:', err);
    jobState.status = 'error';
    jobState.error = err.message;
    await chrome.storage.local.set({ activeJob: jobState });

    updateBadge('ERR', '#dc2626');
    setTimeout(() => updateBadge('', '#dc2626'), 5000);
    throw err;
  } finally {
    activeCrawlAbortController = null;
  }
}

/**
 * Handles Re-sending a book or article from the History tab.
 */
async function handleResendHistoryItem(item) {
  if (!item) throw new Error('No history item provided.');

  const settings = await EmailService.getSettings();
  if (!settings.kindleEmail) {
    throw new Error('Please configure your Kindle email in Settings first.');
  }

  updateBadge('...', '#0284c7');

  try {
    // 1. If it's a PDF document with URL
    if (item.type === 'pdf' && item.url) {
      const resp = await fetch(item.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching PDF`);
      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i += 8192) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)));
      }
      const base64 = btoa(binary);

      await EmailService.sendFile({
        fileBase64: base64,
        filename: item.filename || 'document.pdf',
        title: item.title,
        author: item.author,
        url: item.url
      });
    }
    // 2. If it's an article or book with URL
    else if (item.url) {
      const resp = await fetch(item.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching URL`);
      const html = await resp.text();

      // Clean HTML
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const cleanHtml = bodyMatch ? bodyMatch[1] : html;

      const generator = new EpubGenerator({
        title: item.title || 'Untitled',
        author: item.author || '',
        content: `<div>${cleanHtml}</div>`,
        url: item.url,
        siteName: item.siteName || '',
        publishedTime: new Date().toISOString(),
        language: 'en'
      });

      const epubBase64 = await generator.generateBase64();
      const filename = item.filename || generator.getSafeFilename();

      await EmailService.sendEpub({
        epubBase64: epubBase64,
        filename: filename,
        title: item.title,
        author: item.author,
        url: item.url
      });
    } else {
      throw new Error('Original URL not available to reconstruct document.');
    }

    // Update History entry timestamp
    await HistoryService.addEntry({
      type: item.type || 'article',
      action: 'sent',
      title: item.title,
      author: item.author,
      url: item.url,
      siteName: item.siteName,
      filename: item.filename,
      chaptersCount: item.chaptersCount || 1,
      wordCount: item.wordCount || 0,
      recipient: settings.kindleEmail
    });

    updateBadge('OK', '#16a34a');
    setTimeout(() => updateBadge('', '#16a34a'), 4000);

    return { success: true };

  } catch (err) {
    console.error('[Web2Kindle Service Worker] Resend error:', err);
    updateBadge('ERR', '#dc2626');
    setTimeout(() => updateBadge('', '#dc2626'), 5000);
    throw err;
  }
}

/**
 * Handles single tab extraction and dispatch for context menu / shortcut.
 */
async function handleSendTabToKindle(tab) {
  try {
    updateBadge('...', '#0284c7');

    const settings = await EmailService.getSettings();
    if (!settings.kindleEmail) {
      updateBadge('!', '#dc2626');
      chrome.runtime.openOptionsPage();
      return;
    }

    // Inject scripts
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['lib/readability.js', 'content/extractor.js']
    });

    // Request extraction
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractReaderContent' });
    if (!response || !response.success || !response.article) {
      throw new Error(response?.error || 'Could not extract article');
    }

    const article = response.article;

    // Generate EPUB
    const generator = new EpubGenerator({
      title: article.title,
      author: article.byline,
      content: article.content,
      url: article.url,
      siteName: article.siteName,
      publishedTime: article.publishedTime,
      language: article.language || 'en'
    });

    const epubBase64 = await generator.generateBase64();
    const filename = generator.getSafeFilename();

    // Send
    await EmailService.sendEpub({
      epubBase64: epubBase64,
      filename: filename,
      title: article.title,
      author: article.byline,
      url: article.url
    });

    // Log to history
    await HistoryService.addEntry({
      type: 'article',
      action: 'sent',
      title: article.title,
      author: article.byline,
      url: article.url,
      siteName: article.siteName,
      filename: filename,
      wordCount: article.wordCount || 0,
      recipient: settings.kindleEmail
    });

    // Show success badge
    updateBadge('OK', '#16a34a');
    setTimeout(() => updateBadge('', '#16a34a'), 4000);

  } catch (err) {
    console.error('[Web2Kindle Service Worker] Error:', err);
    updateBadge('ERR', '#dc2626');
    setTimeout(() => updateBadge('', '#dc2626'), 5000);
  }
}
