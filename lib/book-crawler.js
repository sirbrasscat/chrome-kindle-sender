/**
 * Book Crawler & Multi-Chapter Extractor
 * Recursively discovers, crawls, and extracts multi-chapter online books (e.g., Thinking in Python, GitBooks, Docusaurus, Sphinx, mdBook).
 */

class BookCrawler {
  /**
   * Discovers Table of Contents / Chapter links from a DOM document or HTML string.
   * @param {Document} doc - DOM document of the book index or chapter page.
   * @param {string} baseUrl - Base URL of the current page.
   * @returns {Array<{ title: string, url: string, order: number }>}
   */
  static discoverChapters(doc, baseUrl) {
    const chapters = [];
    const seenUrls = new Set();
    const currentOrigin = new URL(baseUrl).origin;
    const currentBasePath = new URL(baseUrl).pathname.replace(/\/[^/]*$/, '/');

    function resolveUrl(href) {
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        return null;
      }
      try {
        const u = new URL(href, baseUrl);
        // Strip hashes for page-level chapters
        u.hash = '';
        return u.href;
      } catch (e) {
        return null;
      }
    }

    function isSameOriginAndSubdir(urlStr) {
      try {
        const u = new URL(urlStr);
        if (u.origin !== currentOrigin) return false;
        // Ignore static assets
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot)$/i.test(u.pathname)) {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }

    // 1. Check prominent Table of Contents selectors
    const tocSelectors = [
      '.toc-list a',
      '.toc a',
      '#toc a',
      'nav.toc a',
      '.table-of-contents a',
      '.book-toc a',
      '.summary a',            // GitBook
      '.sidebar a',            // Docusaurus / VuePress
      '.nav-chapters a',
      'ul.chapters a',
      'ol.chapters a',
      '.chapter-list a',
      '.menu-list a',
      'nav[aria-label*="toc" i] a',
      'nav[aria-label*="table" i] a',
      'nav[aria-label*="contents" i] a',
      'nav[aria-label*="navigation" i] a',
      '.wy-menu a'             // Sphinx ReadTheDocs
    ];

    let foundElements = [];
    for (const selector of tocSelectors) {
      const els = doc.querySelectorAll(selector);
      if (els && els.length > 1) {
        foundElements = Array.from(els);
        break;
      }
    }

    // 2. If no specific TOC selector matched, look for lists of links in main / nav / body
    if (foundElements.length === 0) {
      const genericLists = doc.querySelectorAll('nav a, ol a, ul a, main a');
      const candidateLinks = [];
      genericLists.forEach(a => {
        const href = a.getAttribute('href');
        const abs = resolveUrl(href);
        if (abs && isSameOriginAndSubdir(abs) && abs !== baseUrl) {
          candidateLinks.push(a);
        }
      });
      // If we found a group of links with similar paths, use them
      if (candidateLinks.length >= 2) {
        foundElements = candidateLinks;
      }
    }

    // Process matched elements
    let order = 1;
    foundElements.forEach(el => {
      const href = el.getAttribute('href');
      const absUrl = resolveUrl(href);
      if (!absUrl || !isSameOriginAndSubdir(absUrl)) return;
      if (seenUrls.has(absUrl)) return;

      // Extract clean title
      let title = el.textContent.replace(/\s+/g, ' ').trim();
      if (!title || title.length < 2) {
        // Try getting title from child elements
        title = el.getAttribute('title') || `Chapter ${order}`;
      }

      // Check if preceded by a chapter number or label
      const parentLi = el.closest('li');
      if (parentLi) {
        const numSpan = parentLi.querySelector('.toc-num, .chapter-number, .number');
        if (numSpan && !title.includes(numSpan.textContent.trim())) {
          title = `${numSpan.textContent.trim()} ${title}`;
        }
      }

      seenUrls.add(absUrl);
      chapters.push({
        id: `chapter_${order}`,
        order: order++,
        title: title,
        url: absUrl
      });
    });

    return chapters;
  }

  /**
   * Crawls and extracts reader content for a list of chapter URLs.
   * @param {Array<{ title: string, url: string, id: string }>} chapters
   * @param {Object} options
   * @param {Function} [options.onProgress] - Callback ({ current, total, chapterTitle, percent })
   * @param {AbortSignal} [options.signal] - Abort signal to cancel crawling
   * @returns {Promise<Array<{ id: string, title: string, content: string, url: string, wordCount: number }>>}
   */
  static async crawlChapters(chapters, options = {}) {
    const results = [];
    const total = chapters.length;

    for (let i = 0; i < total; i++) {
      if (options.signal && options.signal.aborted) {
        throw new Error('Book crawling was canceled by user.');
      }

      const chap = chapters[i];
      if (options.onProgress) {
        options.onProgress({
          current: i + 1,
          total: total,
          chapterTitle: chap.title,
          percent: Math.round(((i + 1) / total) * 100)
        });
      }

      try {
        const response = await fetch(chap.url, {
          signal: options.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Fix relative URLs
        const baseHref = chap.url;
        doc.querySelectorAll('img').forEach(img => {
          const src = img.getAttribute('src');
          if (src) {
            try { img.setAttribute('src', new URL(src, baseHref).href); } catch (e) {}
          }
        });
        doc.querySelectorAll('a').forEach(a => {
          const href = a.getAttribute('href');
          if (href) {
            try { a.setAttribute('href', new URL(href, baseHref).href); } catch (e) {}
          }
        });

        let chapterContent = '';
        let chapterText = '';

        if (typeof Readability !== 'undefined') {
          const reader = new Readability(doc, { charThreshold: 60 });
          const parsed = reader.parse();
          if (parsed && parsed.content) {
            chapterContent = parsed.content;
            chapterText = parsed.textContent || '';
            if (parsed.title && (!chap.title || chap.title.startsWith('Chapter '))) {
              chap.title = parsed.title;
            }
          }
        }

        // Fallback if Readability fails
        if (!chapterContent) {
          const main = doc.querySelector('main, article, .content, .page, #content, body');
          if (main) {
            chapterContent = `<div>${main.innerHTML}</div>`;
            chapterText = main.textContent || '';
          } else {
            chapterContent = `<p>Chapter content from ${chap.url}</p>`;
          }
        }

        const words = chapterText.trim().split(/\s+/).filter(Boolean).length;

        results.push({
          id: chap.id || `chapter_${i + 1}`,
          order: i + 1,
          title: chap.title,
          content: chapterContent,
          url: chap.url,
          wordCount: words
        });

        // Slight gentle delay between fetches (150ms) to avoid hammering servers
        await new Promise(r => setTimeout(r, 150));

      } catch (err) {
        console.warn(`[BookCrawler] Error fetching chapter ${chap.title} (${chap.url}):`, err);
        results.push({
          id: chap.id || `chapter_${i + 1}`,
          order: i + 1,
          title: chap.title,
          content: `<div class="chapter-error"><p><em>(Could not fetch chapter content: ${err.message})</em></p><p><a href="${chap.url}">Original URL: ${chap.url}</a></p></div>`,
          url: chap.url,
          wordCount: 0
        });
      }
    }

    return results;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BookCrawler;
}
if (typeof window !== 'undefined') {
  window.BookCrawler = BookCrawler;
}
if (typeof globalThis !== 'undefined') {
  globalThis.BookCrawler = BookCrawler;
}
