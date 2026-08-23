/**
 * Web Article & Book Content Extractor
 * Uses Readability to extract clean reader mode content and discovers multi-chapter book structures.
 */

(function () {
  function getAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, window.location.href).href;
    } catch (e) {
      return url;
    }
  }

  function fixRelativeUrls(element) {
    if (!element) return;

    // Fix images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('src', getAbsoluteUrl(src));
      }
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        img.removeAttribute('srcset');
      }
    });

    // Fix links
    const links = element.querySelectorAll('a');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        a.setAttribute('href', getAbsoluteUrl(href));
      }
    });
  }

  function extractPageContent() {
    try {
      // 1. Clone document for Readability so we don't mutate the active page
      const documentClone = document.cloneNode(true);

      // Remove obvious non-content clutter before Readability
      const clutter = documentClone.querySelectorAll('header, footer, nav, aside, .cookie-banner, .modal, .popup, #comments, .comments, .ad, .advertisement, [aria-hidden="true"]');
      clutter.forEach(el => {
        if (!el.querySelector('article, main')) {
          el.remove();
        }
      });

      let article = null;

      if (typeof Readability !== 'undefined') {
        const reader = new Readability(documentClone, {
          charThreshold: 100,
          keepClasses: false
        });
        article = reader.parse();
      }

      // Fallback if Readability fails or isn't loaded
      if (!article || !article.content) {
        const bodyClone = document.body.cloneNode(true);
        fixRelativeUrls(bodyClone);
        const textContent = bodyClone.innerText || '';
        article = {
          title: document.title || 'Untitled Web Page',
          byline: '',
          dir: document.dir || 'ltr',
          lang: document.documentElement.lang || 'en',
          content: `<div>${bodyClone.innerHTML}</div>`,
          textContent: textContent,
          length: textContent.length,
          excerpt: textContent.substring(0, 160),
          siteName: window.location.hostname,
          publishedTime: new Date().toISOString()
        };
      } else {
        // Fix relative URLs in the extracted HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = article.content;
        fixRelativeUrls(tempDiv);
        article.content = tempDiv.innerHTML;
      }

      // Check for multi-chapter book / Table of Contents links
      let discoveredChapters = [];
      if (typeof BookCrawler !== 'undefined') {
        discoveredChapters = BookCrawler.discoverChapters(document, window.location.href);
      }

      // Discover prominent PDF download links on the page
      const pdfLinks = [];
      const pdfAnchors = document.querySelectorAll('a[href*=".pdf"], a[href*="/pdf/"], a[download*=".pdf"]');
      pdfAnchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href) {
          try {
            const abs = new URL(href, window.location.href).href;
            const linkText = a.textContent.replace(/\s+/g, ' ').trim() || 'PDF Document';
            if (!pdfLinks.some(p => p.url === abs)) {
              pdfLinks.push({ title: linkText, url: abs });
            }
          } catch (e) {}
        }
      });

      // Calculate statistics
      const text = article.textContent || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const readingTimeMinutes = Math.max(1, Math.ceil(words / 200)); // ~200 wpm

      return {
        success: true,
        article: {
          title: article.title || document.title || 'Untitled Article',
          byline: article.byline || '',
          content: article.content,
          textContent: article.textContent,
          excerpt: article.excerpt || '',
          siteName: article.siteName || window.location.hostname,
          publishedTime: article.publishedTime || new Date().toISOString(),
          language: article.lang || document.documentElement.lang || 'en',
          url: window.location.href,
          wordCount: words,
          readingTimeMinutes: readingTimeMinutes,
          chapters: discoveredChapters,
          pdfLinks: pdfLinks
        }
      };
    } catch (err) {
      console.error('[Web2Kindle Extractor] Error extracting article:', err);
      return {
        success: false,
        error: err.message || 'Failed to extract article content'
      };
    }
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractReaderContent') {
      const result = extractPageContent();
      sendResponse(result);
      return true;
    }
    if (request.action === 'discoverBookChapters') {
      let chapters = [];
      if (typeof BookCrawler !== 'undefined') {
        chapters = BookCrawler.discoverChapters(document, window.location.href);
      }
      sendResponse({ success: true, chapters });
      return true;
    }
  });
})();
