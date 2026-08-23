/**
 * Test script to verify chapter discovery on Green Tea Press Think Python and Thinking in Python
 */

const BookCrawler = require('./lib/book-crawler.js');

async function testDiscovery() {
  console.log('--- TEST 1: Green Tea Press Think Python ---');
  const url1 = 'https://www.greenteapress.com/thinkpython/thinkCSpy/html/';
  const res1 = await fetch(url1);
  const html1 = await res1.text();

  // Simple DOM simulation
  const parser = new (require('jsdom').JSDOM)(html1);
  const doc1 = parser.window.document;

  const chapters1 = BookCrawler.discoverChapters(doc1, url1);
  console.log(`Discovered ${chapters1.length} chapters from Green Tea Press Think Python:`);
  chapters1.slice(0, 10).forEach(c => console.log(`  [${c.order}] ${c.title} -> ${c.url}`));

  if (chapters1.length < 15) {
    console.error('FAILED to discover all chapters on Think Python!');
  } else {
    console.log('✓ Successfully discovered Think Python chapters!');
  }

  console.log('\n--- TEST 2: Thinking in Python ---');
  const url2 = 'https://thinkinginpython.com/';
  const res2 = await fetch(url2);
  const html2 = await res2.text();

  const parser2 = new (require('jsdom').JSDOM)(html2);
  const doc2 = parser2.window.document;

  const chapters2 = BookCrawler.discoverChapters(doc2, url2);
  console.log(`Discovered ${chapters2.length} chapters from Thinking in Python:`);
  chapters2.slice(0, 10).forEach(c => console.log(`  [${c.order}] ${c.title} -> ${c.url}`));

  if (chapters2.length < 15) {
    console.error('FAILED to discover chapters on Thinking in Python!');
  } else {
    console.log('✓ Successfully discovered Thinking in Python chapters!');
  }
}

testDiscovery().catch(console.error);
