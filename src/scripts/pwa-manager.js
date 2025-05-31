import { Workbox } from "workbox-window"

class PWAManager {
  constructor() {
    this.wb = null
    this.deferredPrompt = null
    this.updateAvailable = false
    this.init()
  }

  async init() {
    // Initialize Workbox
    if ("serviceWorker" in navigator) {
      this.wb = new Workbox("/Distory-Dicoding/sw.js")
      this.setupWorkboxListeners()
      await this.registerServiceWorker()
    }

    // Setup PWA install functionality
    this.setupInstallPrompt()
    this.setupUpdatePrompt()
  }

  setupWorkboxListeners() {
    // Service worker installed for the first time
    this.wb.addEventListener("installed", (event) => {
      console.log("Service Worker installed for the first time")
      if (event.isUpdate) {
        this.showUpdateBanner()
      }
    })

    // Service worker is controlling the page
    this.wb.addEventListener("controlling", (event) => {
      console.log("Service Worker is controlling the page")
      window.location.reload()
    })

    // New service worker waiting to activate
    this.wb.addEventListener("waiting", (event) => {
      console.log("New service worker is waiting")
      this.updateAvailable = true
      this.showUpdateBanner()
    })

    // Service worker activated
    this.wb.addEventListener("activated", (event) => {
      console.log("Service Worker activated")
    })

    // Handle offline/online events
    this.wb.addEventListener("redundant", (event) => {
      console.log("Service Worker became redundant")
    })
  }

  async registerServiceWorker() {
    try {
      await this.wb.register()
      console.log("Workbox service worker registered successfully")
    } catch (error) {
      console.error("Workbox service worker registration failed:", error)
    }
  }

  setupInstallPrompt() {
    const installBanner = document.getElementById("install-banner")
    const installBtn = document.getElementById("install-btn")
    const dismissInstallBtn = document.getElementById("dismiss-install")

    // Listen for beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("PWA install prompt available")
      e.preventDefault()
      this.deferredPrompt = e

      // Show install banner if user hasn't dismissed it
      if (!localStorage.getItem("pwa-install-dismissed")) {
        installBanner.style.display = "block"
      }
    })

    // Handle install button click
    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt()
          const { outcome } = await this.deferredPrompt.userChoice
          console.log(`User response to install prompt: ${outcome}`)
          this.deferredPrompt = null
          installBanner.style.display = "none"
        }
      })
    }

    // Handle dismiss button click
    if (dismissInstallBtn) {
      dismissInstallBtn.addEventListener("click", () => {
        installBanner.style.display = "none"
        localStorage.setItem("pwa-install-dismissed", "true")
      })
    }

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      console.log("PWA was installed")
      installBanner.style.display = "none"
      this.deferredPrompt = null
    })
  }

  setupUpdatePrompt() {
    const updateBanner = document.getElementById("update-banner")
    const updateBtn = document.getElementById("update-btn")
    const dismissUpdateBtn = document.getElementById("dismiss-update")

    // Handle update button click
    if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        if (this.updateAvailable && this.wb) {
          // Tell the waiting service worker to skip waiting and become active
          this.wb.messageSkipWaiting()
          updateBanner.style.display = "none"
        }
      })
    }

    // Handle dismiss update button click
    if (dismissUpdateBtn) {
      dismissUpdateBtn.addEventListener("click", () => {
        updateBanner.style.display = "none"
      })
    }
  }

  showUpdateBanner() {
    const updateBanner = document.getElementById("update-banner")
    if (updateBanner) {
      updateBanner.style.display = "block"
    }
  }

  // Background sync for offline stories
  async syncOfflineStories() {
    if (this.wb && "serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register("sync-stories")
        console.log("Background sync registered for stories")
      } catch (error) {
        console.error("Background sync registration failed:", error)
      }
    }
  }

  // Show notification
  async showNotification(title, options = {}) {
    if ("Notification" in window && Notification.permission === "granted") {
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

  // Request notification permission
  async requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      console.log("Notification permission:", permission)
      return permission === "granted"
    }
    return false
  }
}

// Create global PWA manager instance
const pwaManager = new PWAManager()

export default pwaManager
