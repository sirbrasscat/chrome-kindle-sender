/**
 * Automated Verification Script for EPUB Generation & Structure
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

// Polyfill DOMParser / XMLSerializer for Node testing if needed
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {}

if (typeof DOMParser === 'undefined') {
  global.DOMParser = class {
    parseFromString(str, type) {
      // Basic mock parser for Node testing
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

async function runTests() {
  console.log('--- Running Web to Kindle EPUB Generator Verification ---');

  const generator = new EpubGenerator({
    title: 'The Art of Reading: Clean Articles on Kindle',
    author: 'Ada Lovelace',
    content: '<h2>Introduction</h2><p>This is a test paragraph verifying Kindle EPUB 3 compliance.</p><p>Special characters: &amp;, &lt;, &gt;, &quot;, &apos;.</p>',
    url: 'https://example.com/test-article',
    siteName: 'Example Tech Blog',
    publishedTime: new Date().toISOString()
  });

  console.log('1. Generated safe filename:', generator.getSafeFilename());

  console.log('2. Generating Base64 EPUB payload...');
  const base64Data = await generator.generateBase64();
  if (!base64Data || base64Data.length < 100) {
    throw new Error('Base64 generation failed or returned too few bytes');
  }
  console.log(`✓ Base64 EPUB generated successfully (${base64Data.length} chars)`);

  console.log('3. Inspecting internal ZIP structure...');
  const zipBuffer = Buffer.from(base64Data, 'base64');
  const unzipped = await JSZip.loadAsync(zipBuffer);

  const files = Object.keys(unzipped.files);
  console.log('Zip file entries:', files);

  // Verification checks
  const requiredFiles = [
    'mimetype',
    'META-INF/container.xml',
    'OEBPS/content.opf',
    'OEBPS/toc.ncx',
    'OEBPS/nav.xhtml',
    'OEBPS/style.css',
    'OEBPS/article.xhtml'
  ];

  for (const reqFile of requiredFiles) {
    if (!unzipped.files[reqFile]) {
      throw new Error(`Missing expected EPUB file: ${reqFile}`);
    }
    console.log(`✓ Verified file: ${reqFile}`);
  }

  // Check mimetype content
  const mimetypeContent = await unzipped.file('mimetype').async('string');
  if (mimetypeContent !== 'application/epub+zip') {
    throw new Error(`Invalid mimetype content: "${mimetypeContent}"`);
  }
  console.log('✓ Verified mimetype: application/epub+zip');

  // Check container.xml
  const containerXml = await unzipped.file('META-INF/container.xml').async('string');
  if (!containerXml.includes('OEBPS/content.opf')) {
    throw new Error('container.xml does not reference OEBPS/content.opf');
  }
  console.log('✓ Verified container.xml rootfile link');

  // Check content.opf
  const opfContent = await unzipped.file('OEBPS/content.opf').async('string');
  if (!opfContent.includes('The Art of Reading') || !opfContent.includes('Ada Lovelace')) {
    throw new Error('content.opf missing title or author metadata');
  }
  console.log('✓ Verified content.opf metadata (Title & Creator)');

  // Check article.xhtml
  const articleContent = await unzipped.file('OEBPS/article.xhtml').async('string');
  if (!articleContent.includes('The Art of Reading')) {
    throw new Error('article.xhtml missing article content');
  }
  console.log('✓ Verified article.xhtml content');

  // Save sample file for inspection
  const outPath = path.join(__dirname, 'test_sample.epub');
  fs.writeFileSync(outPath, zipBuffer);
  console.log(`\n✓ Successfully saved sample EPUB to: ${outPath}`);
  console.log('--- ALL VERIFICATION TESTS PASSED ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
