/**
 * PDF Processing & Reflow Unit Tests
 */

global.JSZip = require('./lib/jszip.min.js');
const PdfProcessor = require('./lib/pdf-processor.js');
const EpubGenerator = require('./lib/epub-generator.js');
const fs = require('fs');

async function runPdfTests() {
  console.log('--- Testing PdfProcessor Logic ---');

  // Test 1: Clean lines extraction
  const mockTextContent = {
    items: [
      { str: 'How to Think Like a Computer Scientist', transform: [1, 0, 0, 1, 50, 750] },
      { str: 'Chapter 1', transform: [1, 0, 0, 1, 50, 700] },
      { str: 'The way of the program', transform: [1, 0, 0, 1, 50, 680] },
      { str: 'The goal of this book is to teach you to think like a', transform: [1, 0, 0, 1, 50, 640] },
      { str: 'computer scientist. This way of thinking combines some of the best features', transform: [1, 0, 0, 1, 50, 620] },
      { str: 'of mathematics, engineering, and natural science.', transform: [1, 0, 0, 1, 50, 600] },
      { str: '12', transform: [1, 0, 0, 1, 250, 50] } // Bottom page number
    ]
  };

  const cleanLines = PdfProcessor.extractCleanLines(mockTextContent);
  console.log('Cleaned lines:', cleanLines);

  // Verify bottom page number "12" was stripped
  if (cleanLines.includes('12')) {
    throw new Error('Failed to filter isolated bottom page number');
  }
  console.log('✓ Verified isolated page number filtering.');

  // Test 2: Semantic HTML paragraph and heading generation
  const html = PdfProcessor.formatHtmlContent(cleanLines);
  console.log('Formatted HTML:\n', html);

  if (!html.includes('<h2>') || !html.includes('<p>')) {
    throw new Error('Failed to generate semantic headings or paragraphs from PDF lines');
  }
  console.log('✓ Verified semantic heading and paragraph reconstruction.');

  // Test 3: Multi-chapter structuring
  const chapters = PdfProcessor.structureIntoChapters({
    title: 'Think Python',
    author: 'Allen Downey',
    outline: null,
    pagesText: [
      {
        pageNum: 1,
        lines: cleanLines,
        text: cleanLines.join('\n')
      }
    ],
    numPages: 1
  });

  if (chapters.length === 0 || !chapters[0].content) {
    throw new Error('Failed to structure pages into chapters');
  }
  console.log(`✓ Verified chapter structuring: ${chapters.length} chapter(s) created.`);

  // Test 4: EPUB generation from structured PDF chapters
  const epub = new EpubGenerator({
    title: 'Think Python (PDF Reflow)',
    author: 'Allen Downey',
    siteName: 'PDF Document',
    chapters
  });

  const blob = await epub.generateBlob();
  if (blob.size < 500) {
    throw new Error('Generated EPUB blob from PDF was unexpectedly small');
  }
  console.log(`✓ Verified PDF-to-EPUB conversion: Generated ${blob.size} bytes EPUB.`);

  console.log('--- ALL PDF PROCESSOR TESTS PASSED ---');
}

runPdfTests().catch(err => {
  console.error('PDF Test Error:', err);
  process.exit(1);
});
