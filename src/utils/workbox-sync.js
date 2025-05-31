// Background sync utilities for Workbox
export class WorkboxSync {
  constructor() {
    this.syncQueue = []
  }

  // Add story to sync queue
  addStoryToSync(storyData) {
    const syncItem = {
      id: Date.now(),
      type: "ADD_STORY",
      data: storyData,
      timestamp: new Date().toISOString(),
    }

    this.syncQueue.push(syncItem)
    this.saveQueueToStorage()

    // Register background sync
    this.registerBackgroundSync("sync-stories")
  }

  // Save queue to localStorage
  saveQueueToStorage() {
    localStorage.setItem("workbox-sync-queue", JSON.stringify(this.syncQueue))
  }

  // Load queue from localStorage
  loadQueueFromStorage() {
    const stored = localStorage.getItem("workbox-sync-queue")
    if (stored) {
      this.syncQueue = JSON.parse(stored)
    }
  }

  // Register background sync
  async registerBackgroundSync(tag) {
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register(tag)
        console.log(`Background sync registered: ${tag}`)
      } catch (error) {
        console.error("Background sync registration failed:", error)
      }
    }
  }

  // Process sync queue (called by service worker)
  async processSyncQueue() {
    this.loadQueueFromStorage()

    for (const item of this.syncQueue) {
      try {
        if (item.type === "ADD_STORY") {
          await this.syncStory(item.data)
          // Remove from queue after successful sync
          this.syncQueue = this.syncQueue.filter((queueItem) => queueItem.id !== item.id)
        }
      } catch (error) {
        console.error("Failed to sync item:", item, error)
      }
    }

    this.saveQueueToStorage()
  }

  // Sync individual story
  async syncStory(storyData) {
    const response = await fetch("https://dicoding-story-api.vercel.app/v1/stories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${storyData.token}`,
      },
      body: JSON.stringify({
        description: storyData.description,
        lat: storyData.lat,
        lon: storyData.lon,
        photo: storyData.photo,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Get pending sync count
  getPendingSyncCount() {
    this.loadQueueFromStorage()
    return this.syncQueue.length
  }

  // Clear sync queue
  clearSyncQueue() {
    this.syncQueue = []
    this.saveQueueToStorage()
  }
}

export default new WorkboxSync()
