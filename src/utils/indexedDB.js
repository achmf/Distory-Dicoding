const DB_NAME = 'distoryDB';
const STORE_NAME = 'stories';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
};

// Save a new story to IndexedDB
export const saveStoryToDB = async (storyData) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.add(storyData);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(storyData);
    transaction.onerror = () => reject('Failed to save story');
  });
};

// Get all stories from IndexedDB
export const getAllStoriesFromDB = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Failed to fetch stories');
  });
};

// Delete a story by ID from IndexedDB
export const deleteStoryFromDB = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(id);
    transaction.onerror = () => reject('Failed to delete story');
  });
};
