import { getAllStoriesFromDB, saveStoryToDB } from "../../utils/indexedDB"

export default class StoryPage {
  constructor() {
    this.presenter = null
    this.handleModalKeydown = null
    this.isOfflineMode = !navigator.onLine
  }

  setPresenter(presenter) {
    this.presenter = presenter
  }

  async render() {
    // Check if user is logged in through presenter
    const isLoggedIn = this.presenter ? this.presenter.isLoggedIn() : false
    const userName = isLoggedIn ? localStorage.getItem("userName") : null

    if (!isLoggedIn) {
      return `
        <main class="container" role="main">
          <h1>Authentication Required</h1>
          <p>You need to be logged in to view stories.</p>
          <a href="#/login" class="btn">Login</a>
        </main>
      `
    }

    // Check if we're online or offline
    const networkStatus = navigator.onLine
      ? `<div class="network-status online">
          <span class="status-icon"><i class="fas fa-wifi"></i></span>
          <span class="status-text">Online - Showing latest stories</span>
        </div>`
      : `<div class="network-status offline">
          <span class="status-icon"><i class="fas fa-exclamation-triangle"></i></span>
          <span class="status-text">Offline - Showing cached stories</span>
        </div>`

    return `
      <main class="container" role="main">
        <h1>All Stories</h1>
        <p>Welcome, ${userName || "User"}!</p>
        
        ${networkStatus}
        
        <div id="loading-indicator" aria-live="polite">Loading stories...</div>
        <div id="stories-container" class="story-feed" role="feed" aria-busy="true" aria-label="Stories feed"></div>
        
        <!-- Story Details Modal -->
        <div id="story-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-hidden="true">
          <div class="modal-content">
            <button id="close-modal" class="close-button" aria-label="Close story details">&times;</button>
            <h2 id="modal-title"></h2>
            <div id="modal-image-container">
              <!-- Image will be inserted here -->
            </div>
            <p id="modal-description"></p>
            <p id="modal-createdAt"></p>
            <p id="modal-location"></p>
            <div id="modal-map" class="modal-map-container" style="display: none;" role="application" aria-label="Story location map"></div>
          </div>
        </div>
      </main>
    `
  }

  async afterRender() {
    if (!this.presenter || !this.presenter.isLoggedIn()) return

    const storiesContainer = document.getElementById("stories-container")
    const loadingIndicator = document.getElementById("loading-indicator")

    // Set up network status listeners
    window.addEventListener("online", () => this.handleNetworkChange(true))
    window.addEventListener("offline", () => this.handleNetworkChange(false))

    try {
      let stories = []
      let source = "api"

      // Check if we're online or offline
      if (navigator.onLine) {
        // We're online, fetch from API
        const page = 1
        const size = 10
        const location = 0

        const result = await this.presenter.getAllStories(page, size, location)

        if (result.success && result.data && result.data.length > 0) {
          stories = result.data

          // Store stories in IndexedDB for offline use
          try {
            // Clear existing stories first to avoid duplicates
            const existingStories = await getAllStoriesFromDB()
            for (const story of existingStories) {
              if (story.type === "api-story") {
                await this.deleteStoryFromDB(story.id)
              }
            }

            // Save new stories
            for (const story of stories) {
              await saveStoryToDB({
                ...story,
                type: "api-story", // Mark as coming from API
                cachedAt: new Date().toISOString(),
              })
            }
            console.log("Stories cached successfully")
          } catch (dbError) {
            console.error("Failed to cache stories:", dbError)
          }
        } else {
          // API fetch failed, try to get from IndexedDB
          try {
            const dbStories = await getAllStoriesFromDB()
            stories = dbStories.filter((story) => story.type === "api-story")
            source = "cache"
          } catch (dbError) {
            console.error("Failed to fetch stories from IndexedDB:", dbError)
          }
        }
      } else {
        // We're offline, fetch from IndexedDB
        try {
          const dbStories = await getAllStoriesFromDB()
          stories = dbStories.filter((story) => story.type === "api-story")
          source = "cache"
        } catch (dbError) {
          console.error("Failed to fetch stories from IndexedDB:", dbError)
          stories = []
        }
      }

      if (loadingIndicator) {
        loadingIndicator.style.display = "none"
      }

      // Update ARIA attributes to indicate loading is complete
      storiesContainer.setAttribute("aria-busy", "false")

      if (stories.length === 0) {
        storiesContainer.innerHTML = `
          <div class="no-stories">
            <p>No stories found.</p>
            ${
              source === "cache"
                ? `<p>You are currently viewing cached data. Connect to the internet to see the latest stories.</p>`
                : `<p>Try refreshing the page or check back later.</p>`
            }
          </div>
        `
        return
      }

      // Update the network status indicator
      this.updateNetworkStatus(navigator.onLine, source)

      // Render the stories
      storiesContainer.innerHTML = stories
        .map(
          (story, index) => `
            <article class="story-card ${source === "cache" ? "cached-story" : ""}" 
                    data-story-id="${story.id}" 
                    data-source="${source}"
                    tabindex="0" 
                    role="article" 
                    aria-labelledby="story-title-${index}" 
                    aria-describedby="story-desc-${index}">
              ${source === "cache" ? '<div class="cached-badge">Cached</div>' : ""}
              <img src="${story.photoUrl}" alt="Image for story: ${story.name}" class="story-image" />
              <div class="story-content">
                <h2 id="story-title-${index}" class="story-title">${story.name}</h2>
                <p id="story-desc-${index}" class="story-description">${story.description}</p>
                ${
                  story.lat && story.lon
                    ? `<p class="story-location">Location: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}</p>`
                    : ""
                }
                ${
                  source === "cache"
                    ? `<p class="cached-info">Cached on: ${new Date(story.cachedAt).toLocaleString()}</p>`
                    : ""
                }
              </div>
            </article>
          `,
        )
        .join("")

      // Add click event listener to all story cards
      const storyCards = document.querySelectorAll(".story-card")
      storyCards.forEach((card) => {
        card.addEventListener("click", async (e) => {
          const storyId = e.currentTarget.getAttribute("data-story-id")
          const source = e.currentTarget.getAttribute("data-source")
          await this.showStoryDetails(storyId, source)
        })

        // Add keyboard support
        card.addEventListener("keydown", async (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            const storyId = e.currentTarget.getAttribute("data-story-id")
            const source = e.currentTarget.getAttribute("data-source")
            await this.showStoryDetails(storyId, source)
          }
        })
      })
    } catch (error) {
      console.error("Error loading stories:", error)

      // Try to load from IndexedDB if API fetch fails
      try {
        if (loadingIndicator) {
          loadingIndicator.textContent = "Trying to load cached stories..."
        }

        const dbStories = await getAllStoriesFromDB()
        const stories = dbStories.filter((story) => story.type === "api-story")

        if (stories.length > 0) {
          this.renderCachedStories(stories)
          return
        }
      } catch (dbError) {
        console.error("Failed to fetch stories from IndexedDB:", dbError)
      }

      if (loadingIndicator) {
        loadingIndicator.style.display = "none"
      }

      storiesContainer.innerHTML = `
        <div class="error-message" role="alert">
          <p>${error.message || "Failed to load stories"}</p>
          <p>No cached stories available.</p>
          <a href="#/login" class="btn">Login again</a>
        </div>
      `
    }
  }

  // Render stories from cache
  renderCachedStories(stories) {
    const storiesContainer = document.getElementById("stories-container")
    const loadingIndicator = document.getElementById("loading-indicator")

    if (loadingIndicator) {
      loadingIndicator.style.display = "none"
    }

    // Update ARIA attributes to indicate loading is complete
    storiesContainer.setAttribute("aria-busy", "false")

    // Update the network status indicator
    this.updateNetworkStatus(false, "cache")

    // Render the stories
    storiesContainer.innerHTML = stories
      .map(
        (story, index) => `
          <article class="story-card cached-story" 
                  data-story-id="${story.id}" 
                  data-source="cache"
                  tabindex="0" 
                  role="article" 
                  aria-labelledby="story-title-${index}" 
                  aria-describedby="story-desc-${index}">
            <div class="cached-badge">Cached</div>
            <img src="${story.photoUrl}" alt="Image for story: ${story.name}" class="story-image" />
            <div class="story-content">
              <h2 id="story-title-${index}" class="story-title">${story.name}</h2>
              <p id="story-desc-${index}" class="story-description">${story.description}</p>
              ${
                story.lat && story.lon
                  ? `<p class="story-location">Location: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}</p>`
                  : ""
              }
              <p class="cached-info">Cached on: ${new Date(story.cachedAt).toLocaleString()}</p>
            </div>
          </article>
        `,
      )
      .join("")

    // Add click event listener to all story cards
    const storyCards = document.querySelectorAll(".story-card")
    storyCards.forEach((card) => {
      card.addEventListener("click", async (e) => {
        const storyId = e.currentTarget.getAttribute("data-story-id")
        await this.showStoryDetails(storyId, "cache")
      })

      // Add keyboard support
      card.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          const storyId = e.currentTarget.getAttribute("data-story-id")
          await this.showStoryDetails(storyId, "cache")
        }
      })
    })
  }

  // Handle network status change
  handleNetworkChange(isOnline) {
    const networkStatus = document.querySelector(".network-status")
    if (networkStatus) {
      if (isOnline) {
        networkStatus.className = "network-status online"
        networkStatus.innerHTML = `
          <span class="status-icon"><i class="fas fa-wifi"></i></span>
          <span class="status-text">Online - Refreshing stories...</span>
        `
        // Refresh the page to get the latest stories
        window.location.reload()
      } else {
        networkStatus.className = "network-status offline"
        networkStatus.innerHTML = `
          <span class="status-icon"><i class="fas fa-exclamation-triangle"></i></span>
          <span class="status-text">Offline - Showing cached stories</span>
        `
      }
    }
  }

  // Update network status indicator
  updateNetworkStatus(isOnline, source) {
    const networkStatus = document.querySelector(".network-status")
    if (networkStatus) {
      if (isOnline && source === "api") {
        networkStatus.className = "network-status online"
        networkStatus.innerHTML = `
          <span class="status-icon"><i class="fas fa-wifi"></i></span>
          <span class="status-text">Online - Showing latest stories</span>
        `
      } else if (isOnline && source === "cache") {
        networkStatus.className = "network-status online warning"
        networkStatus.innerHTML = `
          <span class="status-icon"><i class="fas fa-exclamation-circle"></i></span>
          <span class="status-text">Online - Showing cached stories (API unavailable)</span>
        `
      } else {
        networkStatus.className = "network-status offline"
        networkStatus.innerHTML = `
          <span class="status-icon"><i class="fas fa-exclamation-triangle"></i></span>
          <span class="status-text">Offline - Showing cached stories</span>
        `
      }
    }
  }

  // Show Story Details in the Modal
  async showStoryDetails(storyId, source = "api") {
    const modal = document.getElementById("story-modal")

    // Show loading state in modal
    modal.style.display = "block"
    document.getElementById("modal-title").textContent = "Loading story details..."
    document.getElementById("modal-description").textContent = ""
    document.getElementById("modal-createdAt").textContent = ""
    document.getElementById("modal-location").textContent = ""
    document.getElementById("modal-image-container").innerHTML = ""
    document.getElementById("modal-map").style.display = "none"

    // Set ARIA attributes for the modal
    modal.setAttribute("aria-hidden", "false")

    try {
      let storyDetails = null

      if (source === "api" && navigator.onLine) {
        // Fetch from API if online and source is API
        const result = await this.presenter.getStoryDetails(storyId)

        if (result.success) {
          storyDetails = result.data
        } else {
          throw new Error(result.message || "Failed to load story details")
        }
      } else {
        // Fetch from IndexedDB
        try {
          const dbStories = await getAllStoriesFromDB()
          storyDetails = dbStories.find((story) => story.id === storyId)

          if (!storyDetails) {
            throw new Error("Story not found in cache")
          }
        } catch (dbError) {
          console.error("Failed to fetch story from IndexedDB:", dbError)
          throw new Error("Failed to load story details from cache")
        }
      }

      // Update modal content with the fetched details
      document.getElementById("modal-title").textContent = storyDetails.name

      // Create image with proper alt text
      const imageContainer = document.getElementById("modal-image-container")
      imageContainer.innerHTML = ""
      const img = document.createElement("img")
      img.src = storyDetails.photoUrl
      img.alt = `Image for story: ${storyDetails.name}`
      img.id = "modal-image"
      imageContainer.appendChild(img)

      // Add cached indicator if from cache
      if (source === "cache") {
        const cachedIndicator = document.createElement("div")
        cachedIndicator.className = "cached-indicator"
        cachedIndicator.textContent = "Cached Content"
        imageContainer.appendChild(cachedIndicator)
      }

      document.getElementById("modal-description").textContent = storyDetails.description
      document.getElementById("modal-createdAt").textContent = `Created At: ${new Date(
        storyDetails.createdAt,
      ).toLocaleString()}`

      // Handle location data
      if (storyDetails.lat && storyDetails.lon) {
        // If location exists, show location and Google Map
        document.getElementById("modal-location").textContent = `Location: ${storyDetails.lat.toFixed(
          6,
        )}, ${storyDetails.lon.toFixed(6)}`

        // Only show map if online
        if (navigator.onLine) {
          document.getElementById("modal-map").style.display = "block"

          // Check if google maps is loaded
          if (typeof google !== "undefined") {
            this.initMap(storyDetails.lat, storyDetails.lon)
          } else {
            document.getElementById("modal-map").innerHTML = `
              <div class="map-unavailable">
                <p>Map is unavailable offline</p>
              </div>
            `
          }
        } else {
          document.getElementById("modal-map").style.display = "block"
          document.getElementById("modal-map").innerHTML = `
            <div class="map-unavailable">
              <p>Map is unavailable offline</p>
            </div>
          `
        }
      } else {
        // If no location, show the "Location not available" message
        document.getElementById("modal-location").textContent = "Location not available"
        document.getElementById("modal-map").style.display = "none" // Hide map
      }

      // Close modal when the user clicks on the close button
      document.getElementById("close-modal").addEventListener("click", () => {
        this.closeModal()
      })

      // Add keyboard support for closing the modal with Escape key
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "block") {
          this.closeModal()
        }
      })

      // Trap focus within the modal
      this.trapFocusInModal()
    } catch (error) {
      console.error("Error fetching story details:", error)
      document.getElementById("modal-title").textContent = "Error"
      document.getElementById("modal-description").textContent = error.message || "Failed to load story details"
      document.getElementById("modal-image-container").innerHTML = ""
    }
  }

  // Close the modal and reset ARIA attributes
  closeModal() {
    const modal = document.getElementById("story-modal")
    modal.style.display = "none"
    modal.setAttribute("aria-hidden", "true")

    // Remove event listeners
    document.removeEventListener("keydown", this.handleModalKeydown)
  }

  // Trap focus within the modal for keyboard users
  trapFocusInModal() {
    const modal = document.getElementById("story-modal")
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the first element
    firstElement.focus()

    // Handle tab key to trap focus
    this.handleModalKeydown = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener("keydown", this.handleModalKeydown)
  }

  // Initialize Google Map inside the modal
  initMap(lat, lon) {
    const mapContainer = document.getElementById("modal-map")

    // Check if google maps is loaded
    if (typeof google === "undefined") {
      console.error("Google Maps API not loaded. Ensure it is included in your HTML.")
      return
    }

    const map = new google.maps.Map(mapContainer, {
      center: { lat: lat, lng: lon },
      zoom: 14,
    })

    const marker = new google.maps.Marker({
      position: { lat: lat, lng: lon },
      map: map,
      title: "Story Location",
    })

    // Add a descriptive label for screen readers
    const mapLabel = document.createElement("p")
    mapLabel.classList.add("sr-only")
    mapLabel.textContent = `Map showing location at latitude ${lat.toFixed(6)} and longitude ${lon.toFixed(6)}`
    mapContainer.appendChild(mapLabel)
  }

  // Helper method to delete a story from IndexedDB
  async deleteStoryFromDB(id) {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    store.delete(id)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(id)
      transaction.onerror = () => reject("Failed to delete story")
    })
  }
}

// Helper function to open the IndexedDB database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("distoryDB", 1)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains("stories")) {
        db.createObjectStore("stories", { keyPath: "id", autoIncrement: true })
      }
    }

    request.onerror = (event) => reject(event.target.error)
    request.onsuccess = (event) => resolve(event.target.result)
  })
}

const STORE_NAME = "stories"
