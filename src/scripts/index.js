import "../styles/styles.css"
import "../styles/coordinates-display.css"
import App from "./pages/app"
import PushNotification from "../utils/push-notification"
import pwaManager from "./pwa-manager"
import navigationManager from "../utils/navigation-manager"
import Swal from "sweetalert2"

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOMContentLoaded event fired")
  
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  })

  console.log("📱 App instance created", app)
  console.log("🎯 Main content element:", document.querySelector("#main-content"))

  // Initialize navigation manager
  navigationManager.init()
  console.log("🔗 Navigation manager initialized")

  // Register service worker for push notifications
  if (PushNotification.isSupported()) {
    try {
      await PushNotification.registerServiceWorker()
      console.log("Service worker registered for push notifications")

      // Check if user is logged in
      const token = localStorage.getItem("token")

      // Only proceed with push notification setup if user is logged in
      if (token) {
        // Check if notifications are already active (permission granted AND subscribed)
        const isNotificationActive = await PushNotification.isNotificationActive()

        // Only show the prompt if notifications are not already active
        if (!isNotificationActive) {
          // Add a slight delay to ensure the page is fully loaded
          setTimeout(() => {
            // Use a very non-intrusive toast notification
            Swal.fire({
              title: "Enable Notifications?",
              text: "Get notified when new stories are published",
              icon: "question",
              toast: true,
              position: "bottom-end",
              showConfirmButton: true,
              showCancelButton: true,
              confirmButtonText: "Enable",
              cancelButtonText: "Later",
              confirmButtonColor: "#5865f2",
              cancelButtonColor: "#6c757d",
              timer: 8000, // Auto-close after 8 seconds
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.addEventListener("mouseenter", Swal.stopTimer)
                toast.addEventListener("mouseleave", Swal.resumeTimer)
              },
            }).then((result) => {
              if (result.isConfirmed) {
                PushNotification.requestPermissionAndSubscribe().then((subscribeResult) => {
                  if (subscribeResult.success) {
                    // Mark that we've shown the prompt
                    PushNotification.setPromptShown()

                    Swal.fire({
                      title: "Notifications Enabled!",
                      text: "You'll be notified when new stories are published",
                      icon: "success",
                      toast: true,
                      position: "bottom-end",
                      showConfirmButton: false,
                      timer: 3000,
                      timerProgressBar: true,
                    })
                  } else {
                    // Show a more helpful error message
                    Swal.fire({
                      title: "Couldn't Enable Notifications",
                      text: subscribeResult.message,
                      icon: "error",
                      toast: true,
                      position: "bottom-end",
                      showConfirmButton: true,
                      timer: 5000,
                      timerProgressBar: true,
                    })
                  }
                })
              } else {
                // Mark that we've shown the prompt even if the user declined
                PushNotification.setPromptShown()
              }
            })
          }, 2500) // Slightly longer delay to ensure the page is loaded
        } else {
          console.log("Notifications are already active, not showing prompt")
        }
      }
    } catch (error) {
      // Just log the error but don't bother the user
      console.error("Failed to register service worker for push notifications", error)
    }
  }

  // Check if the enableNotificationsButton exists before adding event listener
  const enableNotificationsButton = document.getElementById("enableNotifications")
  if (enableNotificationsButton) {
    enableNotificationsButton.addEventListener("click", async () => {
      try {
        const result = await PushNotification.requestPermissionAndSubscribe()
        if (result.success) {
          Swal.fire({
            title: "Notifications Enabled!",
            text: "You'll be notified when new stories are published",
            icon: "success",
            toast: true,
            position: "bottom-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          })
        } else {
          Swal.fire({
            title: "Couldn't Enable Notifications",
            text: result.message,
            icon: "error",
            toast: true,
            position: "bottom-end",
            showConfirmButton: true,
            timer: 5000,
            timerProgressBar: true,
          })
        }
      } catch (error) {
        console.error("Error enabling notifications:", error)
        Swal.fire({
          title: "Something Went Wrong",
          text: "Please try again later",
          icon: "error",
          toast: true,
          position: "bottom-end",
          showConfirmButton: true,
          timer: 5000,
          timerProgressBar: true,
        })
      }
    })
  }

  const skipButton = document.getElementById("skip-to-content")

  // Make the "Skip to Content" button the first focusable element
  skipButton.setAttribute("tabindex", "1")

  // Set a lower tabindex on the brand link to ensure it comes after the skip button
  const brandLink = document.querySelector(".brand-name")
  brandLink.setAttribute("tabindex", "2")

  // Listen for the Tab key to show the button
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && !event.shiftKey && document.activeElement === document.body) {
      event.preventDefault() // Prevent default tab behavior
      skipButton.classList.remove("sr-only") // Show the button
      skipButton.focus() // Focus on the skip button
    }
  })

  // Hide the skip button when it loses focus (unless focus moves to main content)
  skipButton.addEventListener("blur", () => {
    // Only hide if not moving focus to main content
    if (document.activeElement.id !== "main-content") {
      skipButton.classList.add("sr-only")
    }
  })

  // When the button is clicked, focus on the main content
  skipButton.addEventListener("click", () => {
    document.getElementById("main-content").focus()
  })

  // Hide the skip to content button if the user uses the mouse
  document.addEventListener("mousedown", () => {
    skipButton.classList.add("sr-only")
  })

  // Function to update navigation visibility based on authentication status
  function updateNavigationVisibility(isAuthenticated) {
    const loginLink = document.querySelector('a[href="#/login"]')
    const registerLink = document.querySelector('a[href="#/register"]')
    const loginDrawerLink = document.querySelector('a[href="#/login"]')
    const registerDrawerLink = document.querySelector('a[href="#/register"]')
    const storiesLink = document.querySelector('a[href="#/story"]') // Select the Stories link

    if (isAuthenticated) {
      if (loginLink) loginLink.style.display = "none"
      if (registerLink) registerLink.style.display = "none"
      if (loginDrawerLink) loginDrawerLink.style.display = "none"
      if (registerDrawerLink) registerDrawerLink.style.display = "none"
      if (storiesLink) storiesLink.style.display = "block" // Show Stories if logged in
    } else {
      if (loginLink) loginLink.style.display = "block"
      if (registerLink) registerLink.style.display = "block"
      if (loginDrawerLink) loginDrawerLink.style.display = "block"
      if (registerDrawerLink) registerDrawerLink.style.display = "block"
      if (storiesLink) storiesLink.style.display = "none" // Hide Stories if not logged in
    }
  }

  // Function to check if current route is accessible without authentication
  function isPublicRoute() {
    return (
      window.location.hash === "#/login" ||
      window.location.hash === "#/register" ||
      window.location.hash === "#/add-story" ||
      window.location.hash === "#/"
    )
  }

  // Check if the user is authenticated before rendering the page
  const token = localStorage.getItem("token")
  console.log("🔑 Token from localStorage:", token ? "exists" : "not found")
  console.log("🌍 Current hash:", window.location.hash)
  console.log("🔓 Is public route:", isPublicRoute())

  // Initial navigation update and page rendering
  updateNavigationVisibility(!!token)

  // Allow guest access to HomePage, AddStoryPage, and other public pages
  if (!token && !isPublicRoute()) {
    console.log("🔄 Redirecting to login - no token and not public route")
    // Redirect to login page if the user is not authenticated and not accessing allowed pages
    window.location.hash = "#/login"
  } else {
    console.log("✅ Rendering page...")
    try {
      await app.renderPage()
      console.log("✅ Page rendered successfully")
    } catch (error) {
      console.error("❌ Error rendering page:", error)
    }
  }

  // Handle route changes
  window.addEventListener("hashchange", async () => {
    console.log("🔄 Hash changed to:", window.location.hash)
    const token = localStorage.getItem("token")

    // Update navigation visibility
    updateNavigationVisibility(!!token)

    // Check route access
    if (!token && !isPublicRoute()) {
      console.log("🔄 Redirecting to login on hash change - no token and not public route")
      // Redirect to login page if the user is not authenticated and not accessing allowed pages
      window.location.hash = "#/login"
    } else {
      console.log("✅ Rendering page on hash change...")
      try {
        await app.renderPage()
        console.log("✅ Page rendered successfully on hash change")
      } catch (error) {
        console.error("❌ Error rendering page on hash change:", error)
      }
    }
  })
})
