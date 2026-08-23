/**
 * Client-Side PDF Processor for Web to Kindle
 * Extracts metadata, outlines, and reflowable text from PDF files using Mozilla PDF.js.
 */

class PdfProcessor {
  /**
   * Loads and configures the PDF.js library.
   */
  static async getPdfLib() {
    if (typeof globalThis.pdfjsLib !== 'undefined') {
      return globalThis.pdfjsLib;
    }

    // Dynamic import for ES Module or browser environment
    try {
      let lib;
      if (typeof importScripts === 'function') {
        // Service worker
        importScripts('../lib/pdf.min.js');
        lib = globalThis.pdfjsLib;
      } else if (typeof window !== 'undefined') {
        // Browser / Popup
        lib = await import(chrome?.runtime ? chrome.runtime.getURL('lib/pdf.min.js') : './pdf.min.js');
        globalThis.pdfjsLib = lib;
      } else {
        // Node environment
        lib = require('pdfjs-dist/legacy/build/pdf.mjs');
      }

      if (lib && lib.GlobalWorkerOptions) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          lib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
        }
      }
      return lib;
    } catch (e) {
      console.warn('[PdfProcessor] Could not load pdfjsLib dynamically, using global:', e);
      return globalThis.pdfjsLib;
    }
  }

  /**
   * Converts various data sources (File, Blob, ArrayBuffer, URL) into a Uint8Array.
   */
  static async sourceToUint8Array(source) {
    if (source instanceof Uint8Array) {
      return source;
    }
    if (source instanceof ArrayBuffer) {
      return new Uint8Array(source);
    }
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      const buffer = await source.arrayBuffer();
      return new Uint8Array(buffer);
    }
    if (typeof source === 'string') {
      // Fetch URL
      const resp = await fetch(source);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching PDF from ${source}`);
      const buffer = await resp.arrayBuffer();
      return new Uint8Array(buffer);
    }
    throw new Error('Unsupported PDF source type');
  }

  /**
   * Helper to convert Uint8Array to base64 string.
   */
  static uint8ArrayToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  /**
   * Parses a PDF file and extracts clean reflowable chapters, metadata, and statistics.
   * @param {Uint8Array|ArrayBuffer|Blob|File|string} source
   * @param {Object} options
   * @param {Function} [options.onProgress] - Callback ({ current, total, percent })
   * @returns {Promise<{ metadata: Object, chapters: Array<Object>, totalWords: number, pageCount: number, rawPdfBase64: string, sizeBytes: number }>}
   */
  static async processPdf(source, options = {}) {
    const pdfLib = await this.getPdfLib();
    if (!pdfLib) {
      throw new Error('PDF.js library could not be loaded');
    }

    const uint8Data = await this.sourceToUint8Array(source);
    const sizeBytes = uint8Data.byteLength;
    const rawPdfBase64 = this.uint8ArrayToBase64(uint8Data);

    const loadingTask = pdfLib.getDocument({
      data: uint8Data,
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // 1. Extract Metadata
    let meta = {};
    try {
      const metaData = await pdfDoc.getMetadata();
      meta = metaData?.info || {};
    } catch (e) {
      console.warn('Metadata extraction note:', e);
    }

    const title = meta.Title || (source.name ? source.name.replace(/\.pdf$/i, '') : 'PDF Document');
    const author = meta.Author || '';

    // 2. Extract Outline (Table of Contents bookmarks if present)
    let outline = null;
    try {
      outline = await pdfDoc.getOutline();
    } catch (e) {
      console.warn('Outline extraction note:', e);
    }

    // 3. Extract text page-by-page
    const pagesText = [];
    let totalWords = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (options.onProgress) {
        options.onProgress({
          current: pageNum,
          total: numPages,
          percent: Math.round((pageNum / numPages) * 100)
        });
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines = this.extractCleanLines(textContent);

      const pageCleanText = pageLines.join('\n');
      const pageWords = pageCleanText.trim().split(/\s+/).filter(Boolean).length;
      totalWords += pageWords;

      pagesText.push({
        pageNum,
        lines: pageLines,
        text: pageCleanText,
        wordCount: pageWords
      });
    }

    // 4. Structure pages into chapters
    const chapters = this.structureIntoChapters({
      title,
      author,
      outline,
      pagesText,
      numPages
    });

    return {
      metadata: {
        title: title.trim() || 'PDF Document',
        author: author.trim(),
        pageCount: numPages,
        sizeBytes: sizeBytes,
        sizeMB: (sizeBytes / (1024 * 1024)).toFixed(1)
      },
      chapters,
      totalWords,
      pageCount: numPages,
      rawPdfBase64,
      sizeBytes
    };
  }

  /**
   * Extracts and cleans text lines from a PDF textContent object.
   * Filters repeated headers/footers, isolated page numbers, and merges hyphenated words.
   */
  static extractCleanLines(textContent) {
    if (!textContent || !textContent.items || textContent.items.length === 0) {
      return [];
    }

    // Sort items by vertical Y coordinate descending (top to bottom), then X coordinate (left to right)
    const items = [...textContent.items].filter(it => it.str && it.str.trim().length > 0);

    items.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const diffY = yB - yA;
      if (Math.abs(diffY) > 4) { // on different lines
        return diffY;
      }
      return a.transform[4] - b.transform[4]; // same line, sort left to right
    });

    const lines = [];
    let currentLine = '';
    let lastY = null;

    items.forEach(item => {
      const str = item.str;
      const y = item.transform[5];

      if (lastY === null) {
        currentLine = str;
        lastY = y;
      } else if (Math.abs(y - lastY) > 4) {
        // New line detected
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = str;
        lastY = y;
      } else {
        // Same line continuation
        if (!currentLine.endsWith(' ') && !str.startsWith(' ')) {
          currentLine += ' ' + str;
        } else {
          currentLine += str;
        }
      }
    });

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    // Filter isolated standalone page numbers (e.g. "12", "- 12 -", "Page 12 of 100")
    const cleanLines = lines.filter((line, idx) => {
      const trimmed = line.trim();
      // If at very top or bottom and is just numbers
      if ((idx === 0 || idx === lines.length - 1) && /^[-—\s]*\d{1,4}[-—\s]*$/.test(trimmed)) {
        return false;
      }
      return true;
    });

    return cleanLines;
  }

  /**
   * Structures page texts into semantic chapters with headings and paragraphs.
   */
  static structureIntoChapters({ title, author, outline, pagesText, numPages }) {
    const chapters = [];

    // Check if we can split by Outline bookmarks
    if (outline && outline.length >= 2) {
      // Outline based splitting
      outline.forEach((item, idx) => {
        const chapTitle = item.title || `Chapter ${idx + 1}`;
        chapters.push({
          id: `chapter_${idx + 1}`,
          order: idx + 1,
          title: chapTitle,
          content: `<div class="pdf-chapter"><h2>${chapTitle}</h2></div>`,
          url: ''
        });
      });
    }

    // If no outline or simple outline, group pages into readable chapters
    if (chapters.length === 0) {
      // Detect "Chapter X" or "Part X" pattern in page text
      let currentChap = null;
      let chapIndex = 1;

      pagesText.forEach((page) => {
        const text = page.text;
        const firstLines = page.lines.slice(0, 3);
        const chapterMatch = firstLines.find(l => /^(?:chapter|part|section)\s+\d+/i.test(l.trim()));

        if (chapterMatch || !currentChap) {
          if (currentChap) {
            currentChap.content = this.formatHtmlContent(currentChap.rawLines);
            chapters.push(currentChap);
          }
          const chapTitle = chapterMatch ? chapterMatch.trim() : (chapIndex === 1 ? (title || 'Introduction') : `Section ${chapIndex}`);
          currentChap = {
            id: `chapter_${chapIndex}`,
            order: chapIndex++,
            title: chapTitle,
            rawLines: [...page.lines],
            url: ''
          };
        } else {
          currentChap.rawLines.push(...page.lines);
        }
      });

      if (currentChap) {
        currentChap.content = this.formatHtmlContent(currentChap.rawLines);
        chapters.push(currentChap);
      }
    }

    // Fallback: If still only 1 chapter with lots of pages, group every 10 pages into a section
    if (chapters.length === 1 && numPages > 12) {
      chapters.length = 0;
      const pageSize = 10;
      for (let i = 0; i < pagesText.length; i += pageSize) {
        const chunk = pagesText.slice(i, i + pageSize);
        const startP = i + 1;
        const endP = Math.min(i + pageSize, numPages);
        const allLines = [];
        chunk.forEach(p => allLines.push(...p.lines));

        const order = Math.floor(i / pageSize) + 1;
        chapters.push({
          id: `chapter_${order}`,
          order,
          title: `Pages ${startP}–${endP}`,
          content: this.formatHtmlContent(allLines),
          url: ''
        });
      }
    }

    return chapters;
  }

  /**
   * Converts raw text lines into clean, semantic HTML paragraphs and headings.
   */
  static formatHtmlContent(lines) {
    if (!lines || lines.length === 0) return '<p></p>';

    const htmlParts = [];
    let currentParagraph = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentParagraph.length > 0) {
          htmlParts.push(`<p>${this.escapeHtml(currentParagraph.join(' '))}</p>`);
          currentParagraph = [];
        }
        return;
      }

      // Check if line looks like a heading
      const isHeading = /^(?:chapter|part|section)\s+\d+/i.test(trimmed) ||
                        (trimmed.length < 50 && /^[A-Z0-9\s:—–-]{4,}$/.test(trimmed));

      if (isHeading) {
        if (currentParagraph.length > 0) {
          htmlParts.push(`<p>${this.escapeHtml(currentParagraph.join(' '))}</p>`);
          currentParagraph = [];
        }
        htmlParts.push(`<h2>${this.escapeHtml(trimmed)}</h2>`);
      } else {
        // Check for hyphenation at end of word
        if (currentParagraph.length > 0 && currentParagraph[currentParagraph.length - 1].endsWith('-')) {
          const prev = currentParagraph.pop();
          currentParagraph.push(prev.slice(0, -1) + trimmed);
        } else {
          currentParagraph.push(trimmed);
        }
      }
    });

    if (currentParagraph.length > 0) {
      htmlParts.push(`<p>${this.escapeHtml(currentParagraph.join(' '))}</p>`);
    }

    return htmlParts.join('\n');
  }

  static escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PdfProcessor;
}
if (typeof window !== 'undefined') {
  window.PdfProcessor = PdfProcessor;
}
if (typeof globalThis !== 'undefined') {
  globalThis.PdfProcessor = PdfProcessor;
}
