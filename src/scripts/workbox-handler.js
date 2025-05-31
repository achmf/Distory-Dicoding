// Clean Workbox event handler - NO CONFLICTS
export class WorkboxHandler {
  constructor() {
    this.updateAvailable = false
    this.init()
  }

  async init() {
    if ("serviceWorker" in navigator) {
      try {
        await this.setupServiceWorkerEvents()
      } catch (error) {
        console.error("Failed to initialize service worker:", error)
      }
    }
  }

  async setupServiceWorkerEvents() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing

          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                this.updateAvailable = true
                this.showUpdateBanner()
              }
            })
          }
        })
      })

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "SKIP_WAITING") {
          window.location.reload()
        }
      })

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload()
      })
    }
  }

  showUpdateBanner() {
    if (window.distoryApp && typeof window.distoryApp.showUpdateBanner === "function") {
      window.distoryApp.showUpdateBanner()
    }
  }

  async skipWaiting() {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" })
      }
    }
  }

  async triggerSync(tag) {
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

  async showNotification(title, options = {}) {
    if ("serviceWorker" in navigator && "Notification" in window && Notification.permission === "granted") {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, {
          icon: "/Distory-Dicoding/book.png",
          badge: "/Distory-Dicoding/book.png",
          tag: "distory-notification",
          ...options,
        })
      } catch (error) {
        console.error("Failed to show notification:", error)
      }
    }
  }
}

export default new WorkboxHandler()
