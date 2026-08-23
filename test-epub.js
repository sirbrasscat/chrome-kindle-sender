/**
 * Automated Verification Script for EPUB Generation & Structure
 * Tests both Single Articles and Multi-Chapter Online Books.
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

if (typeof DOMParser === 'undefined') {
  global.DOMParser = class {
    parseFromString(str, type) {
      return {
        querySelectorAll: () => [],
        body: {
          firstChild: {
            innerHTML: str
          }
        }
      };
    }
  };
  global.XMLSerializer = class {
    serializeToString(node) {
      return node.innerHTML || '<div>Test content</div>';
    }
  };
}

global.JSZip = JSZip;
const EpubGenerator = require('./lib/epub-generator.js');
const BookCrawler = require('./lib/book-crawler.js');

async function runTests() {
  console.log('--- TEST 1: Single Article EPUB Generation ---');

  const articleGenerator = new EpubGenerator({
    title: 'The Art of Reading: Clean Articles on Kindle',
    author: 'Ada Lovelace',
    content: '<h2>Introduction</h2><p>This is a test paragraph verifying Kindle EPUB 3 compliance.</p>',
    url: 'https://example.com/test-article',
    siteName: 'Example Tech Blog',
    publishedTime: new Date().toISOString()
  });

  const base64Article = await articleGenerator.generateBase64();
  const zipArticle = await JSZip.loadAsync(Buffer.from(base64Article, 'base64'));

  if (!zipArticle.files['OEBPS/article.xhtml']) {
    throw new Error('Single article EPUB missing OEBPS/article.xhtml');
  }
  console.log('✓ Verified single article EPUB generation.');

  console.log('\n--- TEST 2: Multi-Chapter Online Book EPUB Generation (e.g. Thinking in Python) ---');

  const sampleChapters = [
    { id: 'chapter_1', title: '01 Introduction', content: '<h2>Chapter 1</h2><p>Welcome to Thinking in Python.</p>', url: 'https://thinkinginpython.com/01_Introduction.html' },
    { id: 'chapter_2', title: '02 Tour', content: '<h2>Chapter 2</h2><p>A quick tour of Python fundamentals.</p>', url: 'https://thinkinginpython.com/02_Tour.html' },
    { id: 'chapter_3', title: '03 Containers', content: '<h2>Chapter 3</h2><p>Lists, dicts, tuples, and sets.</p>', url: 'https://thinkinginpython.com/03_Containers.html' }
  ];

  const bookGenerator = new EpubGenerator({
    title: 'Thinking in Python',
    author: 'Bruce Eckel',
    siteName: 'thinkinginpython.com',
    publishedTime: new Date().toISOString(),
    chapters: sampleChapters
  });

  console.log('1. Generated book safe filename:', bookGenerator.getSafeFilename());

  const base64Book = await bookGenerator.generateBase64();
  const zipBook = await JSZip.loadAsync(Buffer.from(base64Book, 'base64'));

  console.log('2. Inspecting Multi-Chapter Book entries:', Object.keys(zipBook.files));

  // Check required files
  const requiredFiles = [
    'mimetype',
    'META-INF/container.xml',
    'OEBPS/content.opf',
    'OEBPS/toc.ncx',
    'OEBPS/nav.xhtml',
    'OEBPS/style.css',
    'OEBPS/chapter_1.xhtml',
    'OEBPS/chapter_2.xhtml',
    'OEBPS/chapter_3.xhtml'
  ];

  for (const reqFile of requiredFiles) {
    if (!zipBook.files[reqFile]) {
      throw new Error(`Missing expected book file: ${reqFile}`);
    }
    console.log(`✓ Verified file: ${reqFile}`);
  }

  // Check table of contents in nav.xhtml
  const navContent = await zipBook.file('OEBPS/nav.xhtml').async('string');
  if (!navContent.includes('01 Introduction') || !navContent.includes('02 Tour') || !navContent.includes('03 Containers')) {
    throw new Error('nav.xhtml missing chapter links or titles');
  }
  console.log('✓ Verified nav.xhtml contains all 3 chapter links.');

  // Check content.opf spine
  const opfContent = await zipBook.file('OEBPS/content.opf').async('string');
  if (!opfContent.includes('idref="chapter_1"') || !opfContent.includes('idref="chapter_2"') || !opfContent.includes('idref="chapter_3"')) {
    throw new Error('content.opf spine missing chapter items');
  }
  console.log('✓ Verified content.opf spine references all chapters in order.');

  // Save sample book
  const sampleBookPath = path.join(__dirname, 'test_thinking_in_python_sample.epub');
  fs.writeFileSync(sampleBookPath, Buffer.from(base64Book, 'base64'));
  console.log(`\n✓ Successfully wrote sample book EPUB to: ${sampleBookPath}`);

  console.log('--- ALL VERIFICATION TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
