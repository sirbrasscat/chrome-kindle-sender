/**
 * History Service for Web to Kindle
 * Tracks and manages history of articles and books sent to Kindle or downloaded as EPUB.
 */

class HistoryService {
  static STORAGE_KEY = 'web2kindle_history';
  static MAX_ENTRIES = 150;

  static _memoryFallback = [];

  /**
   * Retrieves all history items, sorted newest first.
   * @returns {Promise<Array<Object>>}
   */
  static async getHistory() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ [this.STORAGE_KEY]: [] }, (result) => {
          const items = result[this.STORAGE_KEY] || [];
          resolve(items);
        });
      } else if (typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem(this.STORAGE_KEY);
          resolve(stored ? JSON.parse(stored) : []);
        } catch (e) {
          resolve(this._memoryFallback || []);
        }
      } else {
        resolve(this._memoryFallback || []);
      }
    });
  }

  /**
   * Adds a new history entry.
   * @param {Object} entry
   * @param {'article' | 'book'} entry.type
   * @param {'sent' | 'downloaded'} entry.action
   * @param {string} entry.title
   * @param {string} [entry.author]
   * @param {string} [entry.url]
   * @param {string} [entry.siteName]
   * @param {string} [entry.filename]
   * @param {number} [entry.chaptersCount]
   * @param {number} [entry.wordCount]
   * @param {string} [entry.recipient]
   * @returns {Promise<Object>}
   */
  static async addEntry(entry) {
    const history = await this.getHistory();
    const newEntry = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: entry.type || 'article',
      action: entry.action || 'sent', // 'sent' | 'downloaded'
      title: entry.title || 'Untitled',
      author: entry.author || '',
      url: entry.url || '',
      siteName: entry.siteName || (entry.url ? new URL(entry.url).hostname : ''),
      filename: entry.filename || '',
      chaptersCount: entry.chaptersCount || 1,
      wordCount: entry.wordCount || 0,
      recipient: entry.recipient || '',
      timestamp: new Date().toISOString()
    };

    // Prepend newest first and cap at MAX_ENTRIES
    history.unshift(newEntry);
    if (history.length > this.MAX_ENTRIES) {
      history.length = this.MAX_ENTRIES;
    }

    await this.saveHistory(history);
    return newEntry;
  }

  /**
   * Deletes a single history entry by ID.
   * @param {string} id
   */
  static async deleteEntry(id) {
    const history = await this.getHistory();
    const filtered = history.filter(item => item.id !== id);
    await this.saveHistory(filtered);
    return filtered;
  }

  /**
   * Clears the entire action history.
   */
  static async clearHistory() {
    await this.saveHistory([]);
    return [];
  }

  /**
   * Helper to persist history to storage.
   */
  static async saveHistory(history) {
    this._memoryFallback = history;
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.STORAGE_KEY]: history }, () => {
          resolve(true);
        });
      } else if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
          resolve(true);
        } catch (e) {
          resolve(true);
        }
      } else {
        resolve(true);
      }
    });
  }

  /**
   * Formats an ISO timestamp into a human-friendly relative or local time.
   * @param {string} isoString
   * @returns {string}
   */
  static formatTime(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return isoString;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HistoryService;
}
if (typeof window !== 'undefined') {
  window.HistoryService = HistoryService;
}
if (typeof globalThis !== 'undefined') {
  globalThis.HistoryService = HistoryService;
}
