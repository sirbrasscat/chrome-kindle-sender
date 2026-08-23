/**
 * Book Crawler & Multi-Chapter Extractor
 * Recursively discovers, crawls, and extracts multi-chapter online books
 * (e.g., Green Tea Press Think Python, Thinking in Python, GitBooks, Docusaurus, Sphinx, mdBook, etc.)
 */

class BookCrawler {
  /**
   * Discovers Table of Contents / Chapter links from a DOM document or HTML string.
   * @param {Document} doc - DOM document of the book index or chapter page.
   * @param {string} baseUrl - Base URL of the current page.
   * @returns {Array<{ title: string, url: string, order: number }>}
   */
  static discoverChapters(doc, baseUrl) {
    if (!doc) return [];

    const chapters = [];
    const seenUrls = new Set();
    const currentOrigin = new URL(baseUrl).origin;
    const currentPath = new URL(baseUrl).pathname;
    const currentBasePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

    function resolveUrl(href) {
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        return null;
      }
      try {
        const u = new URL(href, baseUrl);
        u.hash = ''; // Strip hash anchor
        return u.href;
      } catch (e) {
        return null;
      }
    }

    function isSameOriginAndSubdir(urlStr) {
      try {
        const u = new URL(urlStr);
        if (u.origin !== currentOrigin) return false;
        // Ignore static non-HTML assets
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot)$/i.test(u.pathname)) {
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }

    function cleanTitle(el, defaultOrder) {
      if (!el) return `Chapter ${defaultOrder}`;
      let text = el.textContent.replace(/\s+/g, ' ').trim();
      // If the link text is an image with alt tag
      if (!text || text.length < 2) {
        const img = el.querySelector('img');
        if (img && img.getAttribute('alt')) {
          text = img.getAttribute('alt').trim();
        }
      }
      if (!text || text.length < 2) {
        text = el.getAttribute('title') || `Chapter ${defaultOrder}`;
      }

      // Check for preceding chapter numbers in table rows or list items
      const parentRow = el.closest('tr, li, p, div');
      if (parentRow) {
        const numSpan = parentRow.querySelector('.toc-num, .chapter-number, .number, .num');
        if (numSpan && !text.includes(numSpan.textContent.trim())) {
          text = `${numSpan.textContent.trim()} ${text}`;
        }
      }

      return text;
    }

    // --- STRATEGY 1: Dedicated TOC Class / ID / Semantic Selectors ---
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
      '.wy-menu a',            // Sphinx ReadTheDocs
      'nav[aria-label*="toc" i] a',
      'nav[aria-label*="table" i] a',
      'nav[aria-label*="contents" i] a',
      'nav[aria-label*="navigation" i] a'
    ];

    for (const selector of tocSelectors) {
      const els = Array.from(doc.querySelectorAll(selector));
      if (els && els.length >= 2) {
        let matched = [];
        els.forEach(el => {
          const abs = resolveUrl(el.getAttribute('href'));
          if (abs && isSameOriginAndSubdir(abs)) {
            matched.push({ el, url: abs });
          }
        });
        if (matched.length >= 2) {
          matched.forEach(({ el, url }, idx) => {
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              chapters.push({
                id: `chapter_${chapters.length + 1}`,
                order: chapters.length + 1,
                title: cleanTitle(el, chapters.length + 1),
                url: url
              });
            }
          });
          if (chapters.length >= 2) return chapters;
        }
      }
    }

    // --- STRATEGY 2: Table-based Table of Contents (Classic web books like Green Tea Press Think Python) ---
    const tables = Array.from(doc.querySelectorAll('table'));
    for (const table of tables) {
      // Check if table contains header or text indicating Table of Contents
      const tableText = table.textContent.toLowerCase();
      const isTocTable = tableText.includes('table of contents') || 
                         tableText.includes('contents') || 
                         tableText.includes('chapter') || 
                         table.querySelectorAll('tr').length >= 3;

      if (isTocTable) {
        const links = Array.from(table.querySelectorAll('a[href]'));
        const candidateLinks = [];
        links.forEach(a => {
          const abs = resolveUrl(a.getAttribute('href'));
          if (abs && isSameOriginAndSubdir(abs) && abs !== baseUrl) {
            // Ignore trivial navigation buttons in table headers
            const linkText = a.textContent.toLowerCase().trim();
            if (['previous', 'next', 'up', 'index'].includes(linkText)) return;
            candidateLinks.push({ el: a, url: abs });
          }
        });

        if (candidateLinks.length >= 2) {
          candidateLinks.forEach(({ el, url }) => {
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              chapters.push({
                id: `chapter_${chapters.length + 1}`,
                order: chapters.length + 1,
                title: cleanTitle(el, chapters.length + 1),
                url: url
              });
            }
          });
          if (chapters.length >= 2) return chapters;
        }
      }
    }

    // --- STRATEGY 3: Generic Link Pattern & Subpath Clustering ---
    // Scans all links on the page and identifies groups of links matching book chapter patterns
    const allLinks = Array.from(doc.querySelectorAll('a[href]'));
    const chapterUrlPattern = /(?:chap(?:ter)?[\d_-]|sec(?:tion)?[\d_-]|part[\d_-]|\b\d{1,3}[_.-]|foreword|preface|contrib|intro|index|app(?:endix)?[\d_-])/i;

    const matchedLinks = [];
    allLinks.forEach(a => {
      const href = a.getAttribute('href');
      const abs = resolveUrl(href);
      if (!abs || !isSameOriginAndSubdir(abs)) return;
      if (seenUrls.has(abs)) return;

      const pathPart = new URL(abs).pathname;
      const text = a.textContent.trim();

      // Check if URL or link text matches chapter patterns
      const isChapterName = chapterUrlPattern.test(pathPart) ||
                            /^(?:chapter|part|section|appendix|\d+[\.:\s])/i.test(text) ||
                            ['foreword', 'preface', 'introduction', 'conclusion', 'acknowledgements'].includes(text.toLowerCase());

      if (isChapterName && text.length > 1) {
        matchedLinks.push({ el: a, url: abs, title: cleanTitle(a, matchedLinks.length + 1) });
      }
    });

    if (matchedLinks.length >= 2) {
      matchedLinks.forEach(({ el, url, title }) => {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          chapters.push({
            id: `chapter_${chapters.length + 1}`,
            order: chapters.length + 1,
            title: title,
            url: url
          });
        }
      });
      if (chapters.length >= 2) return chapters;
    }

    // --- STRATEGY 4: Sequential HTML Document links in current directory ---
    // If there is a list/container of links pointing to sibling .html files
    const siblingHtmlLinks = [];
    allLinks.forEach(a => {
      const abs = resolveUrl(a.getAttribute('href'));
      if (!abs || !isSameOriginAndSubdir(abs)) return;
      if (abs === baseUrl) return;
      if (seenUrls.has(abs)) return;

      const path = new URL(abs).pathname;
      if (path.endsWith('.html') || path.endsWith('.htm') || path.endsWith('/')) {
        const text = a.textContent.trim();
        if (text.length > 2 && !['next', 'previous', 'prev', 'up', 'home', 'top', 'search'].includes(text.toLowerCase())) {
          siblingHtmlLinks.push({ el: a, url: abs, title: cleanTitle(a, siblingHtmlLinks.length + 1) });
        }
      }
    });

    if (siblingHtmlLinks.length >= 3) {
      siblingHtmlLinks.forEach(({ el, url, title }) => {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          chapters.push({
            id: `chapter_${chapters.length + 1}`,
            order: chapters.length + 1,
            title: title,
            url: url
          });
        }
      });
    }

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
          const reader = new Readability(doc, { charThreshold: 40 });
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
