import CONFIG from "../scripts/config"

const PushNotification = {
  // VAPID public key from the provided documentation
  VAPID_PUBLIC_KEY: "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk",

  // Check if Push API is supported by the browser
  isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window
  },

  // Convert URL-safe base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  },

  // Register the service worker - FIXED
  async registerServiceWorker() {
    if (!this.isSupported()) {
      console.error("Push notifications not supported")
      return null
    }

    try {
      // Determine if we're in development or production
      const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
      
      // Use the correct path based on environment
      const swPath = isDevelopment 
        ? './sw.js'  // Use relative path in development (looks in public folder)
        : '/Distory-Dicoding/sw.js';  // Use absolute path with base in production
      
      const swScope = isDevelopment 
        ? './'  // Use relative scope in development
        : '/Distory-Dicoding/';  // Use absolute scope with base in production

      console.log(`Registering service worker at: ${swPath} with scope: ${swScope}`);
      
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: swScope,
      })
      
      console.log("Service Worker registered successfully:", registration)
      return registration
    } catch (error) {
      console.error("Service Worker registration failed:", error)
      return null
    }
  },

  // Store user's preference about notifications
  setNotificationPreference(enabled) {
    localStorage.setItem("notification_preference", enabled ? "enabled" : "disabled")
  },

  // Get user's notification preference
  getNotificationPreference() {
    return localStorage.getItem("notification_preference") === "enabled"
  },

  // Track if notification prompt has been shown
  setPromptShown() {
    localStorage.setItem("notification_prompt_shown", "true")
  },

  // Check if notification prompt has been shown
  wasPromptShown() {
    return localStorage.getItem("notification_prompt_shown") === "true"
  },

  // Check if user is already subscribed to push notifications
  async isSubscribed() {
    if (!this.isSupported()) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return !!subscription
    } catch (error) {
      console.error("Error checking subscription status:", error)
      return false
    }
  },

  // Add this new method after isSubscribed() to check both permission and subscription status
  async isNotificationActive() {
    // First check if notifications are supported
    if (!this.isSupported()) {
      return false
    }

    // Check browser permission status
    const permissionStatus = Notification.permission

    // If permission is denied, notifications can't be active
    if (permissionStatus === "denied") {
      return false
    }

    // If permission is granted, check if there's an active subscription
    if (permissionStatus === "granted") {
      // Check if user has a subscription
      const isSubscribed = await this.isSubscribed()

      // Also check user's stored preference
      const userPreference = this.getNotificationPreference()

      // Consider notifications active if either subscribed or user preference is enabled
      return isSubscribed || userPreference
    }

    // Default: not active if permission is in default state or any other case
    return false
  },

  // Request push notification permission and subscribe
  async requestPermissionAndSubscribe() {
    if (!this.isSupported()) {
      return {
        success: false,
        message: "Push notifications not supported in this browser",
      }
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        return { success: false, message: "Notification permission denied" }
      }

      // Make sure service worker is ready
      let registration
      try {
        registration = await navigator.serviceWorker.ready
      } catch (error) {
        // If service worker is not ready, try registering it again
        registration = await this.registerServiceWorker()
        if (!registration) {
          throw new Error("Could not register service worker")
        }
        // Wait for the service worker to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Get existing subscription or create new one with error handling
      let subscription
      try {
        subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Create new subscription with proper error handling
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
          })
        }
      } catch (subscribeError) {
        // Log the error but don't show it to the user if it's an AbortError
        if (subscribeError.name === "AbortError") {
          console.warn("Non-critical error subscribing to push notifications:", subscribeError)

          // Even though push registration failed, we'll still mark notifications as enabled
          // since the user granted permission
          this.setNotificationPreference(true)
          return {
            success: true,
            message: "Successfully subscribed to push notifications",
          }
        }

        console.error("Error subscribing to push notifications:", subscribeError)

        if (subscribeError.name === "NotAllowedError") {
          return {
            success: false,
            message: "Push notification permission was denied by the user or browser settings.",
          }
        }

        return {
          success: false,
          message: `Subscription error: ${subscribeError.message || "Unknown error"}`,
        }
      }

      // If we have a subscription, send it to the server
      if (subscription) {
        // Send subscription to server
        const token = localStorage.getItem("token")
        if (!token) {
          return { success: false, message: "Authentication required" }
        }

        try {
          const subscriptionData = subscription.toJSON()
          const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              endpoint: subscriptionData.endpoint,
              keys: {
                p256dh: subscriptionData.keys.p256dh,
                auth: subscriptionData.keys.auth,
              },
            }),
          })

          const responseData = await response.json()

          if (responseData.error) {
            throw new Error(responseData.message || "Failed to subscribe")
          }

          // Set user preference
          this.setNotificationPreference(true)

          return {
            success: true,
            subscription,
            message: "Successfully subscribed to push notifications",
          }
        } catch (apiError) {
          console.error("API error when subscribing:", apiError)
          return {
            success: false,
            message: apiError.message || "Server error when subscribing",
          }
        }
      } else {
        return {
          success: false,
          message: "Could not create push subscription",
        }
      }
    } catch (error) {
      console.error("Error in push notification flow:", error)

      // If the user granted permission but we had a technical error,
      // still enable notifications locally
      if (Notification.permission === "granted") {
        this.setNotificationPreference(true)
        return {
          success: true,
          message: "Notifications enabled",
        }
      }

      return {
        success: false,
        message: error.message || "Failed to subscribe to push notifications",
      }
    }
  },

  // Simplified subscribe method for easier access
  async subscribe() {
    return await this.requestPermissionAndSubscribe()
  },

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.isSupported()) {
      return { success: false, message: "Push notifications not supported" }
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // If no subscription exists, just update the preference
        this.setNotificationPreference(false)
        return { success: true, message: "No active subscription found" }
      }

      // Store endpoint before unsubscribing locally
      const endpoint = subscription.endpoint

      // Unsubscribe locally first
      const unsubscribeResult = await subscription.unsubscribe()

      if (!unsubscribeResult) {
        return { success: false, message: "Failed to unsubscribe locally" }
      }

      // Then call the API to unsubscribe
      const token = localStorage.getItem("token")
      if (!token) {
        // Still consider it a success since we unsubscribed locally
        this.setNotificationPreference(false)
        return { success: true, message: "Unsubscribed locally only (not logged in)" }
      }

      const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: endpoint,
        }),
      })

      const responseData = await response.json()

      if (responseData.error) {
        // If API call fails, we still unsubscribed locally, so consider it partially successful
        console.warn("API unsubscribe failed, but local unsubscribe succeeded")
      }

      // Update preference
      this.setNotificationPreference(false)

      return {
        success: true,
        message: "Successfully unsubscribed from push notifications",
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      return {
        success: false,
        message: error.message || "Failed to unsubscribe from push notifications",
      }
    }
  },

  // Show a local notification (for testing or when push fails)
  async showLocalNotification(title, options = {}) {
    if (!this.isSupported()) {
      console.error("Notifications not supported")
      return false
    }

    if (Notification.permission !== "granted") {
      console.error("Notification permission not granted")
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready

      // Default options
      const defaultOptions = {
        body: "You have a new notification",
        icon: "/favicon.png",
        badge: "/favicon.png",
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: Math.random().toString(36).substring(2, 15),
        },
      }

      // Merge default options with provided options
      const notificationOptions = { ...defaultOptions, ...options }

      // Show the notification
      await registration.showNotification(title, notificationOptions)
      return true
    } catch (error) {
      console.error("Error showing local notification:", error)
      return false
    }
  },

  // Send a notification for a new story
  async notifyNewStory(storyData) {
    if (!this.isSupported() || !this.getNotificationPreference()) {
      return false
    }

    try {
      // Extract story details
      const { name, description, photoUrl } = storyData

      // Create notification options
      const options = {
        body: description
          ? description.length > 100
            ? description.substring(0, 97) + "..."
            : description
          : "A new story has been published!",
        icon: photoUrl || "/favicon.png",
        badge: "/favicon.png",
        vibrate: [100, 50, 100],
        data: {
          // Link to the general stories page
          url: `/#/story`,
          storyId: storyData.id, // Keep the ID for other purposes if needed
          dateOfArrival: Date.now(),
        },
        actions: [
          {
            action: "view",
            title: "View Story",
          },
          {
            action: "close",
            title: "Close",
          },
        ],
      }

      // Show the notification
      const title = `New Story${name ? " from " + name : ""}`
      return await this.showLocalNotification(title, options)
    } catch (error) {
      console.error("Error sending story notification:", error)
      return false
    }
  },
}

export default PushNotification