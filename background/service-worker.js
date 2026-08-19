/**
 * Web to Kindle - Background Service Worker
 */

importScripts('../lib/jszip.min.js', '../lib/epub-generator.js', '../lib/email-service.js');

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

    // Show success badge
    updateBadge('OK', '#16a34a');
    setTimeout(() => updateBadge('', '#16a34a'), 4000);

  } catch (err) {
    console.error('[Web2Kindle Service Worker] Error:', err);
    updateBadge('ERR', '#dc2626');
    setTimeout(() => updateBadge('', '#dc2626'), 5000);
  }
}
