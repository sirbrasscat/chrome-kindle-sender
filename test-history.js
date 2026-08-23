/**
 * History Service Unit Tests
 */

const HistoryService = require('./lib/history-service.js');

async function runHistoryTests() {
  console.log('--- Testing HistoryService ---');

  // Clear first
  await HistoryService.clearHistory();
  let history = await HistoryService.getHistory();
  if (history.length !== 0) throw new Error('Clear history failed');
  console.log('✓ Initialized empty history.');

  // Add an article entry
  const entry1 = await HistoryService.addEntry({
    type: 'article',
    action: 'sent',
    title: 'Clean Code in JavaScript',
    author: 'Robert C. Martin',
    url: 'https://example.com/clean-code',
    siteName: 'example.com',
    recipient: 'test@kindle.com',
    wordCount: 1500
  });

  history = await HistoryService.getHistory();
  if (history.length !== 1 || history[0].title !== 'Clean Code in JavaScript') {
    throw new Error('Failed to add article history entry');
  }
  console.log('✓ Added single article history entry.');

  // Add a book entry
  const entry2 = await HistoryService.addEntry({
    type: 'book',
    action: 'downloaded',
    title: 'Thinking in Python',
    author: 'Bruce Eckel',
    url: 'https://thinkinginpython.com/',
    siteName: 'thinkinginpython.com',
    chaptersCount: 19,
    wordCount: 45000
  });

  history = await HistoryService.getHistory();
  if (history.length !== 2 || history[0].title !== 'Thinking in Python') {
    throw new Error('Failed to add book history entry with newest first');
  }
  console.log('✓ Added book history entry and verified newest-first ordering.');

  // Test Time Formatter
  const formattedJustNow = HistoryService.formatTime(new Date().toISOString());
  console.log('✓ Relative time check:', formattedJustNow);

  // Test Deleting an entry
  await HistoryService.deleteEntry(entry1.id);
  history = await HistoryService.getHistory();
  if (history.length !== 1 || history[0].id !== entry2.id) {
    throw new Error('Failed to delete specific history entry');
  }
  console.log('✓ Successfully deleted specific history entry.');

  // Test Clear all
  await HistoryService.clearHistory();
  history = await HistoryService.getHistory();
  if (history.length !== 0) throw new Error('Clear all history failed');
  console.log('✓ Successfully cleared all history.');

  console.log('--- ALL HISTORY TESTS PASSED ---');
}

runHistoryTests().catch(err => {
  console.error('History test error:', err);
  process.exit(1);
});
