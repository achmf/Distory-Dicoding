const DB_NAME = 'distoryDB';
const STORE_NAMES = {
  STORIES: 'stories',
  BOOKMARKS: 'bookmarks',
  OFFLINE_STORIES: 'offlineStories'
};

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Increment version to trigger upgrade
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create or ensure all required stores exist
      if (!db.objectStoreNames.contains(STORE_NAMES.STORIES)) {
        db.createObjectStore(STORE_NAMES.STORIES, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORE_NAMES.BOOKMARKS)) {
        db.createObjectStore(STORE_NAMES.BOOKMARKS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORE_NAMES.OFFLINE_STORIES)) {
        db.createObjectStore(STORE_NAMES.OFFLINE_STORIES, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
};

// Legacy functions for backward compatibility

// Save a new story to IndexedDB (legacy)
export const saveStoryToDB = async (storyData) => {
  return saveOfflineStory(storyData);
};

// Get all stories from IndexedDB (legacy)
export const getAllStoriesFromDB = async () => {
  return getOfflineStories();
};

// Delete a story by ID from IndexedDB (legacy)
export const deleteStoryFromDB = async (id) => {
  return deleteOfflineStory(id);
};

// New functions

// User-driven: Bookmark a story
export const bookmarkStory = async (story) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.BOOKMARKS, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.BOOKMARKS);
  
  // Add timestamp for sorting
  story.bookmarkedAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const request = store.put(story);
    request.onsuccess = () => resolve(story);
    request.onerror = () => reject('Failed to bookmark story');
  });
};

// Remove a bookmark
export const removeBookmark = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.BOOKMARKS, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.BOOKMARKS);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject('Failed to remove bookmark');
  });
};

// Check if a story is bookmarked
export const isBookmarked = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.BOOKMARKS, 'readonly');
  const store = transaction.objectStore(STORE_NAMES.BOOKMARKS);
  
  return new Promise((resolve) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => resolve(false);
  });
};

// Get all bookmarked stories
export const getBookmarkedStories = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.BOOKMARKS, 'readonly');
  const store = transaction.objectStore(STORE_NAMES.BOOKMARKS);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      // Sort by bookmark timestamp, newest first
      const stories = request.result.sort((a, b) => 
        new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
      );
      resolve(stories);
    };
    request.onerror = () => reject('Failed to fetch bookmarked stories');
  });
};

// Save story for offline posting (user created when offline)
export const saveOfflineStory = async (storyData) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.OFFLINE_STORIES, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.OFFLINE_STORIES);
  
  // Add metadata
  storyData.createdAt = storyData.createdAt || new Date().toISOString();
  storyData.deviceId = storyData.deviceId || localStorage.getItem('device_id') || 'unknown';
  
  return new Promise((resolve, reject) => {
    const request = store.add(storyData);
    request.onsuccess = (event) => resolve({...storyData, id: event.target.result});
    request.onerror = () => reject('Failed to save offline story');
  });
};

// Get all offline stories
export const getOfflineStories = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.OFFLINE_STORIES, 'readonly');
  const store = transaction.objectStore(STORE_NAMES.OFFLINE_STORIES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Failed to fetch offline stories');
  });
};

// Delete an offline story
export const deleteOfflineStory = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.OFFLINE_STORIES, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.OFFLINE_STORIES);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject('Failed to delete offline story');
  });
};

// Cache stories from API for offline browsing
export const cacheStories = async (stories) => {
  if (!Array.isArray(stories) || stories.length === 0) return;
  
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.STORIES, 'readwrite');
  const store = transaction.objectStore(STORE_NAMES.STORIES);
  
  // Add cached timestamp
  const storiesWithTimestamp = stories.map(story => ({
    ...story,
    cachedAt: new Date().toISOString()
  }));
  
  const promises = storiesWithTimestamp.map(story => {
    return new Promise((resolve, reject) => {
      const request = store.put(story);
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  });
  
  return Promise.all(promises);
};

// Get cached stories
export const getCachedStories = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAMES.STORIES, 'readonly');
  const store = transaction.objectStore(STORE_NAMES.STORIES);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      // Sort by createdAt, newest first
      const stories = request.result.sort((a, b) => 
        new Date(b.createdAt || b.cachedAt) - new Date(a.createdAt || a.cachedAt)
      );
      resolve(stories);
    };
    request.onerror = () => reject('Failed to fetch cached stories');
  });
};

export default {
  bookmarkStory,
  removeBookmark,
  isBookmarked,
  getBookmarkedStories,
  saveOfflineStory,
  getOfflineStories,
  deleteOfflineStory,
  cacheStories,
  getCachedStories,
  // Include legacy functions in default export
  saveStoryToDB,
  getAllStoriesFromDB,
  deleteStoryFromDB
};