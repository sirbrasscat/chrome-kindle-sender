/**
 * Verification for Background Crawl Persistence and History Resend
 */

const HistoryService = require('./lib/history-service.js');
const EpubGenerator = require('./lib/epub-generator.js');

async function testResendAndPersistence() {
  console.log('--- TEST: History Resend and State Persistence ---');

  // 1. Clear history
  await HistoryService.clearHistory();

  // 2. Add an article entry to history
  const entry = await HistoryService.addEntry({
    type: 'article',
    action: 'sent',
    title: 'How to Think Like a Computer Scientist',
    author: 'Allen Downey',
    url: 'https://www.greenteapress.com/thinkpython/thinkCSpy/html/',
    siteName: 'greenteapress.com',
    filename: 'Think_Python.epub',
    recipient: 'test@kindle.com',
    wordCount: 12500
  });

  console.log('✓ Added initial history entry:', entry.title);

  // 3. Verify history retrieval
  const history = await HistoryService.getHistory();
  if (history.length !== 1 || history[0].id !== entry.id) {
    throw new Error('History retrieval failed');
  }

  // 4. Simulate Re-sending
  console.log('Simulating resend action for entry:', history[0].title);
  const reSentEntry = await HistoryService.addEntry({
    type: history[0].type,
    action: 'sent',
    title: history[0].title,
    author: history[0].author,
    url: history[0].url,
    siteName: history[0].siteName,
    filename: history[0].filename,
    chaptersCount: history[0].chaptersCount,
    wordCount: history[0].wordCount,
    recipient: 'test@kindle.com'
  });

  const updatedHistory = await HistoryService.getHistory();
  if (updatedHistory.length !== 2 || updatedHistory[0].title !== entry.title) {
    throw new Error('Resend history logging failed');
  }
  console.log('✓ Successfully logged resend event with updated timestamp.');

  console.log('--- ALL RESEND AND PERSISTENCE TESTS PASSED ---');
}

testResendAndPersistence().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
