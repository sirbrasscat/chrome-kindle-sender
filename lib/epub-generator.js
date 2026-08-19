/**
 * Kindle-Compatible EPUB Generator
 * Creates standard EPUB files that work with Amazon Kindle (Send-to-Kindle) and standard ebook readers.
 */

class EpubGenerator {
  constructor(options = {}) {
    this.title = options.title || 'Untitled Article';
    this.author = options.author || options.byline || 'Unknown Author';
    this.content = options.content || '';
    this.url = options.url || '';
    this.siteName = options.siteName || '';
    this.publishedTime = options.publishedTime || new Date().toISOString();
    this.language = options.language || 'en';
    this.uuid = 'urn:uuid:' + this.generateUUID();
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  sanitizeHtmlForXhtml(html) {
    if (!html) return '<p></p>';

    // Parse into DOM to clean and ensure valid XHTML closing tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

    // Remove scripts, styles, iframes, and unwanted elements
    const unwanted = doc.querySelectorAll('script, style, iframe, object, embed, noscript, svg, form, input, button');
    unwanted.forEach(el => el.remove());

    // Fix self-closing elements and images
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      // Ensure alt exists
      if (!img.getAttribute('alt')) {
        img.setAttribute('alt', '');
      }
      // Remove loading lazy or data-src issues
      if (img.dataset && img.dataset.src && !img.getAttribute('src')) {
        img.setAttribute('src', img.dataset.src);
      }
    });

    // Fix links to be safe
    const links = doc.querySelectorAll('a');
    links.forEach(a => {
      a.removeAttribute('target');
      a.removeAttribute('onclick');
    });

    // Convert DOM back to valid XHTML string
    const serializer = new XMLSerializer();
    let xhtml = serializer.serializeToString(doc.body.firstChild);

    // Ensure self-closing tags are XHTML compliant
    // XMLSerializer handles most, but we strip the outer wrapper div
    if (xhtml.startsWith('<div') && xhtml.endsWith('</div>')) {
      xhtml = xhtml.substring(xhtml.indexOf('>') + 1, xhtml.lastIndexOf('</div>'));
    }

    return xhtml;
  }

  buildContainerXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  buildContentOpf() {
    const isoDate = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${this.uuid}</dc:identifier>
    <dc:title>${this.escapeXml(this.title)}</dc:title>
    <dc:creator>${this.escapeXml(this.author)}</dc:creator>
    <dc:language>${this.escapeXml(this.language)}</dc:language>
    <dc:publisher>${this.escapeXml(this.siteName || 'Web Reader')}</dc:publisher>
    <dc:date>${this.escapeXml(this.publishedTime)}</dc:date>
    <meta property="dcterms:modified">${isoDate.substring(0, 19)}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="article" href="article.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="article"/>
  </spine>
</package>`;
  }

  buildTocNcx() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${this.uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${this.escapeXml(this.title)}</text>
  </docTitle>
  <docAuthor>
    <text>${this.escapeXml(this.author)}</text>
  </docAuthor>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel>
        <text>${this.escapeXml(this.title)}</text>
      </navLabel>
      <content src="article.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  }

  buildNavXhtml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${this.escapeXml(this.language)}">
<head>
  <title>Table of Contents</title>
  <meta charset="utf-8" />
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="article.xhtml">${this.escapeXml(this.title)}</a></li>
    </ol>
  </nav>
</body>
</html>`;
  }

  buildStyleCss() {
    return `@charset "UTF-8";
body {
  font-family: "Bookerly", "Georgia", "Palatino Linotype", "Times New Roman", serif;
  line-height: 1.6;
  margin: 5% 5% 5% 5%;
  color: #111111;
  background-color: #ffffff;
}

h1.article-title {
  font-size: 1.8em;
  line-height: 1.25;
  margin-top: 0;
  margin-bottom: 0.4em;
  font-weight: 700;
  text-align: left;
}

.article-meta {
  font-size: 0.9em;
  color: #555555;
  margin-bottom: 1.8em;
  padding-bottom: 0.8em;
  border-bottom: 1px solid #cccccc;
  font-style: italic;
}

.article-meta span {
  display: inline-block;
  margin-right: 12px;
}

.article-body {
  text-align: justify;
  text-justify: inter-word;
}

p {
  margin-top: 0;
  margin-bottom: 1.2em;
  text-indent: 0;
}

h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  page-break-after: avoid;
  break-after: avoid;
}

h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
h4 { font-size: 1.1em; }

blockquote {
  margin: 1em 1.5em;
  padding-left: 1em;
  border-left: 3px solid #888888;
  font-style: italic;
  color: #333333;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

pre, code {
  font-family: monospace;
  font-size: 0.9em;
  background-color: #f4f4f4;
}

pre {
  padding: 0.8em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

a {
  color: #004080;
  text-decoration: underline;
}

ul, ol {
  margin-bottom: 1.2em;
  padding-left: 1.8em;
}

li {
  margin-bottom: 0.4em;
}

hr {
  border: none;
  border-top: 1px solid #dddddd;
  margin: 2em 0;
}

.article-footer {
  margin-top: 3em;
  padding-top: 1em;
  border-top: 1px solid #eeeeee;
  font-size: 0.8em;
  color: #777777;
  font-family: sans-serif;
}
`;
  }

  buildArticleXhtml() {
    const cleanBody = this.sanitizeHtmlForXhtml(this.content);
    const dateFormatted = this.publishedTime ? new Date(this.publishedTime).toLocaleDateString() : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${this.escapeXml(this.language)}">
<head>
  <title>${this.escapeXml(this.title)}</title>
  <meta charset="utf-8" />
  <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
  <article>
    <header>
      <h1 class="article-title">${this.escapeXml(this.title)}</h1>
      <div class="article-meta">
        ${this.author ? `<span><strong>By:</strong> ${this.escapeXml(this.author)}</span>` : ''}
        ${this.siteName ? `<span><strong>Source:</strong> ${this.escapeXml(this.siteName)}</span>` : ''}
        ${dateFormatted ? `<span><strong>Date:</strong> ${this.escapeXml(dateFormatted)}</span>` : ''}
      </div>
    </header>
    <div class="article-body">
      ${cleanBody}
    </div>
    <footer class="article-footer">
      ${this.url ? `<p>Saved from: <a href="${this.escapeXml(this.url)}">${this.escapeXml(this.url)}</a></p>` : ''}
      <p>Formatted for Kindle with Web to Kindle Extension on ${new Date().toLocaleDateString()}</p>
    </footer>
  </article>
</body>
</html>`;
  }

  async generateBlob() {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required to generate EPUB');
    }

    const zip = new JSZip();

    // 1. Mimetype MUST be the first file and uncompressed
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. Container
    zip.folder('META-INF').file('container.xml', this.buildContainerXml());

    // 3. OEBPS contents
    const oebps = zip.folder('OEBPS');
    oebps.file('content.opf', this.buildContentOpf());
    oebps.file('toc.ncx', this.buildTocNcx());
    oebps.file('nav.xhtml', this.buildNavXhtml());
    oebps.file('style.css', this.buildStyleCss());
    oebps.file('article.xhtml', this.buildArticleXhtml());

    // Generate binary blob
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    return blob;
  }

  async generateBase64() {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required to generate EPUB');
    }

    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.folder('META-INF').file('container.xml', this.buildContainerXml());

    const oebps = zip.folder('OEBPS');
    oebps.file('content.opf', this.buildContentOpf());
    oebps.file('toc.ncx', this.buildTocNcx());
    oebps.file('nav.xhtml', this.buildNavXhtml());
    oebps.file('style.css', this.buildStyleCss());
    oebps.file('article.xhtml', this.buildArticleXhtml());

    const base64 = await zip.generateAsync({
      type: 'base64',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    return base64;
  }

  getSafeFilename() {
    let clean = (this.title || 'article')
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    if (clean.length > 60) {
      clean = clean.substring(0, 60);
    }
    return `${clean || 'article'}.epub`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EpubGenerator;
}
if (typeof window !== 'undefined') {
  window.EpubGenerator = EpubGenerator;
}
if (typeof globalThis !== 'undefined') {
  globalThis.EpubGenerator = EpubGenerator;
}
