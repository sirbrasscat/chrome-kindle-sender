/**
 * Diagnostic tool to test chapter discovery against live URL
 */

const BookCrawler = require('./lib/book-crawler.js');

async function diagnoseUrl(targetUrl) {
  console.log(`Diagnosing: ${targetUrl}`);

  const res = await fetch(targetUrl);
  const html = await res.text();

  console.log(`Downloaded HTML: ${html.length} bytes`);

  // Let's create a regex-based parser or inspect DOM
  // Let's inspect the exact selectors in the HTML
  console.log('Contains class="toc-list"?', html.includes('toc-list'));
  console.log('Contains <ul class="toc-list"?', html.includes('class="toc-list"'));
  console.log('Contains <a href="01_Introduction.html"?', html.includes('01_Introduction.html'));

  // Test regex discovery
  const linkRegex = /<li[^>]*>(?:<span[^>]*class=["'](?:toc-num|number)[^"']*["']>([^<]+)<\/span>)?\s*<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let match;
  const regexMatches = [];
  while ((match = linkRegex.exec(html)) !== null) {
    regexMatches.push({
      num: match[1] ? match[1].trim() : '',
      href: match[2],
      text: match[3].trim()
    });
  }
  console.log(`Regex discovered ${regexMatches.length} chapters:`, regexMatches.slice(0, 5));
}

diagnoseUrl('https://thinkinginpython.com/').catch(console.error);
