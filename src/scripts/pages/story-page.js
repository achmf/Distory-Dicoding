import {
  bookmarkStory,
  removeBookmark,
  isBookmarked,
  getBookmarkedStories,
  getCachedStories,
  cacheStories,
} from "../../utils/indexedDB";

export default class StoryPage {
  constructor() {
    this.presenter = null;
    this.handleModalKeydown = null;
    this.isOfflineMode = !navigator.onLine;
    this.currentView = "all"; // 'all' or 'bookmarks'
    this.needsRefresh = false;
    this.currentMap = null; // Track current map instance
  }

  setPresenter(presenter) {
    this.presenter = presenter;
  }

  async render() {
    // Check if user is logged in through presenter
    const isLoggedIn = this.presenter ? this.presenter.isLoggedIn() : false;
    const userName = isLoggedIn
      ? localStorage.getItem("userName") || "User"
      : "Guest";

    if (!isLoggedIn) {
      return `
        <main class="container" role="main">
          <h1>Authentication Required</h1>
          <p>You need to be logged in to view stories.</p>
          <a href="#/login" class="btn">Login</a>
        </main>
      `;
    }

    // Check if we're online or offline
    const networkStatus = navigator.onLine
      ? `<div class="network-status online">
          <span class="status-icon">📶</span>
          <span class="status-text">Online - Showing latest stories</span>
        </div>`
      : `<div class="network-status offline">
          <span class="status-icon">⚠️</span>
          <span class="status-text">Offline - Showing cached stories</span>
        </div>`;

    return `
      <main class="container" role="main">
        <h1>Stories</h1>
        <p>Welcome, ${userName}!</p>
        
        ${networkStatus}
        
        <!-- View toggle buttons -->
        <div class="view-toggle">
          <button id="view-all-stories" class="view-btn ${
            this.currentView === "all" ? "active" : ""
          }">
            All Stories
          </button>
          <button id="view-bookmarks" class="view-btn ${
            this.currentView === "bookmarks" ? "active" : ""
          }">
            My Bookmarks
          </button>
        </div>
        
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
            <!-- Bookmark button in modal -->
            <button id="modal-bookmark-btn" class="bookmark-btn">
              <span id="bookmark-icon">☆</span> <span id="bookmark-text">Bookmark</span>
            </button>
            <div id="modal-map" class="modal-map-container" style="display: none;" role="application" aria-label="Story location map"></div>
          </div>
        </div>
      </main>
    `;
  }

  async afterRender() {
    if (!this.presenter || !this.presenter.isLoggedIn()) return;

    const storiesContainer = document.getElementById("stories-container");
    const loadingIndicator = document.getElementById("loading-indicator");
    const viewAllBtn = document.getElementById("view-all-stories");
    const viewBookmarksBtn = document.getElementById("view-bookmarks");

    // Set up view toggle buttons
    viewAllBtn?.addEventListener("click", () => {
      this.currentView = "all";
      this.loadStories();

      // Update active button
      viewAllBtn.classList.add("active");
      viewBookmarksBtn.classList.remove("active");
    });

    viewBookmarksBtn?.addEventListener("click", () => {
      this.currentView = "bookmarks";
      this.loadBookmarkedStories();

      // Update active button
      viewBookmarksBtn.classList.add("active");
      viewAllBtn.classList.remove("active");
    });

    // Set up network status listeners
    window.addEventListener("online", () => this.handleNetworkChange(true));
    window.addEventListener("offline", () => this.handleNetworkChange(false));

    // Initial load based on current view
    if (this.currentView === "bookmarks") {
      this.loadBookmarkedStories();
    } else {
      this.loadStories();
    }
  }

  async loadStories() {
    const storiesContainer = document.getElementById("stories-container");
    const loadingIndicator = document.getElementById("loading-indicator");

    try {
      let stories = [];
      let source = "api";

      // Check if we're online or offline
      if (navigator.onLine) {
        // Online: Get stories from API
        const result = await this.presenter.getAllStories();
        if (result && result.listStory) {
          stories = result.listStory;

          // Cache stories for offline use
          try {
            await cacheStories(stories);
          } catch (cacheError) {
            console.error("Failed to cache stories:", cacheError);
          }
        }
      } else {
        // Offline: Get cached stories from IndexedDB
        stories = await getCachedStories();
        source = "cache";
      }

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      // Update ARIA attributes to indicate loading is complete
      storiesContainer.setAttribute("aria-busy", "false");

      if (stories.length === 0) {
        storiesContainer.innerHTML = `
          <div class="no-stories">
            <p>No stories available. ${
              navigator.onLine ? "" : "Please check your internet connection."
            }</p>
          </div>
        `;
        return;
      }

      // Update the network status indicator
      this.updateNetworkStatus(navigator.onLine, source);

      // Render the stories
      await this.renderStories(stories, source);
    } catch (error) {
      console.error("Error loading stories:", error);

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      storiesContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load stories: ${error.message || "Unknown error"}</p>
          <button class="btn" onclick="window.location.reload()">Try Again</button>
        </div>
      `;
    }
  }

  async loadBookmarkedStories() {
    const storiesContainer = document.getElementById("stories-container");
    const loadingIndicator = document.getElementById("loading-indicator");

    if (loadingIndicator) {
      loadingIndicator.style.display = "block";
    }

    try {
      // Get bookmarked stories from IndexedDB
      const bookmarks = await getBookmarkedStories();

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      // Update ARIA attributes
      storiesContainer.setAttribute("aria-busy", "false");

      if (bookmarks.length === 0) {
        storiesContainer.innerHTML = `
          <div class="no-stories">
            <p>You haven't bookmarked any stories yet.</p>
            <p>Click on a story and use the bookmark button to save it for later.</p>
          </div>
        `;
        return;
      }

      // Render bookmarked stories
      await this.renderStories(bookmarks, "bookmark");
    } catch (error) {
      console.error("Error loading bookmarked stories:", error);

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      storiesContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to load bookmarks: ${error.message || "Unknown error"}</p>
          <button class="btn" onclick="window.location.reload()">Try Again</button>
        </div>
      `;
    }
  }

  async renderStories(stories, source) {
    const storiesContainer = document.getElementById("stories-container");

    // For each story, check if it's bookmarked to show the correct bookmark status
    const storiesWithBookmarkStatus = await Promise.all(
      stories.map(async (story) => {
        const isStoryBookmarked = await isBookmarked(story.id);
        return { ...story, isBookmarked: isStoryBookmarked };
      })
    );

    storiesContainer.innerHTML = storiesWithBookmarkStatus
      .map(
        (story, index) => `
          <article class="story-card ${
            source === "cache" ? "cached-story" : ""
          } ${source === "bookmark" ? "bookmarked-story" : ""}" 
                  data-story-id="${story.id}" 
                  data-source="${source}"
                  tabindex="0" 
                  role="article" 
                  aria-labelledby="story-title-${index}" 
                  aria-describedby="story-desc-${index}">
            ${
              source === "cache" ? '<div class="cached-badge">Cached</div>' : ""
            }
            ${
              source === "bookmark"
                ? '<div class="bookmark-badge">Bookmarked</div>'
                : ""
            }
            <img src="${story.photoUrl}" alt="Image for story: ${
          story.name
        }" class="story-image" loading="lazy" />
            <div class="story-content">
              <h2 id="story-title-${index}" class="story-title">${
          story.name
        }</h2>
              <p id="story-desc-${index}" class="story-description">${
          story.description
        }</p>
              ${
                story.lat && story.lon
                  ? `<p class="story-location">📍 Location: ${story.lat.toFixed(
                      6
                    )}, ${story.lon.toFixed(6)}</p>`
                  : ""
              }
              ${
                source === "cache"
                  ? `<p class="cached-info">Cached on: ${new Date(
                      story.cachedAt
                    ).toLocaleString()}</p>`
                  : ""
              }
              ${
                source === "bookmark"
                  ? `<p class="bookmark-info">Bookmarked on: ${new Date(
                      story.bookmarkedAt
                    ).toLocaleString()}</p>`
                  : ""
              }
            </div>
            <button class="bookmark-toggle ${
              story.isBookmarked ? "bookmarked" : ""
            }" 
                    data-story-id="${story.id}" 
                    aria-label="${
                      story.isBookmarked ? "Remove bookmark" : "Bookmark this story"
                    }">
              ${story.isBookmarked ? "★" : "☆"}
            </button>
          </article>
        `
      )
      .join("");

    // Add click event listener to all story cards
    const storyCards = document.querySelectorAll(".story-card");
    storyCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        // Don't trigger if clicking the bookmark button
        if (!event.target.closest(".bookmark-toggle")) {
          const storyId = card.dataset.storyId;
          const source = card.dataset.source;
          this.showStoryDetails(storyId, source);
        }
      });

      // Add keyboard handling for accessibility
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          const storyId = card.dataset.storyId;
          const source = card.dataset.source;
          this.showStoryDetails(storyId, source);
        }
      });
    });

    // Add click event listener to bookmark toggle buttons
    const bookmarkToggles = document.querySelectorAll(".bookmark-toggle");
    bookmarkToggles.forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.stopPropagation(); // Don't trigger card click
        const storyId = btn.dataset.storyId;
        await this.toggleBookmark(storyId, btn);
      });
    });
  }

  // New method to update card bookmark status when changed from modal
  updateCardBookmarkStatus(storyId, isBookmarked) {
    // Find the bookmark button for the story card with this ID
    const cardButton = document.querySelector(
      `.story-card[data-story-id="${storyId}"] .bookmark-toggle`
    );

    if (cardButton) {
      // Update the button state
      if (isBookmarked) {
        cardButton.classList.add("bookmarked");
        cardButton.innerHTML = "★";
        cardButton.setAttribute("aria-label", "Remove bookmark");
      } else {
        cardButton.classList.remove("bookmarked");
        cardButton.innerHTML = "☆";
        cardButton.setAttribute("aria-label", "Bookmark this story");
      }
    }
  }

  // New method to update modal bookmark status when changed from card
  updateModalBookmarkStatus(storyId, isBookmarked) {
    const modal = document.getElementById("story-modal");

    // Only update if the modal is visible
    if (modal && modal.style.display === "block") {
      const modalBookmarkBtn = document.getElementById("modal-bookmark-btn");
      const bookmarkIcon = document.getElementById("bookmark-icon");
      const bookmarkText = document.getElementById("bookmark-text");

      // Check if this is the same story that's currently in the modal
      const currentStoryIdInModal = modalBookmarkBtn?.dataset.storyId;

      if (currentStoryIdInModal === storyId && modalBookmarkBtn) {
        if (isBookmarked) {
          modalBookmarkBtn.classList.add("bookmarked");
          bookmarkIcon.textContent = "★";
          bookmarkText.textContent = "Remove Bookmark";
        } else {
          modalBookmarkBtn.classList.remove("bookmarked");
          bookmarkIcon.textContent = "☆";
          bookmarkText.textContent = "Bookmark";
        }
      }
    }
  }

  async toggleBookmark(storyId, buttonElement) {
    try {
      // Add animation class
      buttonElement.classList.add("toggling");

      // Remove the animation class after animation completes
      setTimeout(() => buttonElement.classList.remove("toggling"), 500);

      const isCurrentlyBookmarked =
        buttonElement.classList.contains("bookmarked");

      if (isCurrentlyBookmarked) {
        // Remove bookmark
        await removeBookmark(storyId);
        buttonElement.classList.remove("bookmarked");
        buttonElement.innerHTML = "☆"; // Empty star
        buttonElement.setAttribute("aria-label", "Bookmark this story");

        // Show a brief confirmation message
        this.showToast("Bookmark removed");
        
        // Update modal if it's open for this story
        this.updateModalBookmarkStatus(storyId, false);

        // If we're in bookmarks view, refresh the view
        if (this.currentView === "bookmarks") {
          this.loadBookmarkedStories();
        }
      } else {
        // Get the full story details to bookmark
        let storyToBookmark;

        if (navigator.onLine) {
          const result = await this.presenter.getStoryDetails(storyId);
          if (result && result.story) {
            storyToBookmark = result.story;
          } else {
            throw new Error("Failed to get story details");
          }
        } else {
          // Try to get from cached stories
          const cachedStories = await getCachedStories();
          storyToBookmark = cachedStories.find((story) => story.id === storyId);

          if (!storyToBookmark) {
            throw new Error("Story details not available offline");
          }
        }

        // Add bookmark
        await bookmarkStory(storyToBookmark);
        buttonElement.classList.add("bookmarked");
        buttonElement.innerHTML = "★"; // Filled star
        buttonElement.setAttribute("aria-label", "Remove bookmark");

        // Show a brief confirmation message
        this.showToast("Story bookmarked");
        
        // Update modal if it's open for this story
        this.updateModalBookmarkStatus(storyId, true);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);

      // Show error message
      this.showToast(
        isCurrentlyBookmarked
          ? "Failed to remove bookmark"
          : "Failed to bookmark story",
        "error"
      );
    }
  }

  showToast(message, type = "success") {
    // Create toast element if it doesn't exist
    let toast = document.getElementById("toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }

    // Set toast content and class
    toast.textContent = message;
    toast.className = `toast ${type}`;

    // Show toast
    toast.classList.add("show");

    // Hide toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // Handle network status change
  handleNetworkChange(isOnline) {
    this.updateNetworkStatus(isOnline);

    // Reload stories if going back online and viewing all stories
    if (isOnline && this.currentView === "all") {
      this.loadStories();
    }
  }

  // Update network status indicator
  updateNetworkStatus(isOnline, source = "") {
    const statusElement = document.querySelector(".network-status");

    if (statusElement) {
      if (isOnline) {
        statusElement.className = "network-status online";
        statusElement.innerHTML = `
          <span class="status-icon">📶</span>
          <span class="status-text">${
            source === "cache"
              ? "Online - Showing cached stories"
              : "Online - Showing latest stories"
          }</span>
        `;
      } else {
        statusElement.className = "network-status offline";
        statusElement.innerHTML = `
          <span class="status-icon">⚠️</span>
          <span class="status-text">Offline - Showing cached stories</span>
        `;
      }
    }
  }

  async showStoryDetails(storyId, source = "api") {
    const modal = document.getElementById("story-modal");
    const modalBookmarkBtn = document.getElementById("modal-bookmark-btn");
    const bookmarkIcon = document.getElementById("bookmark-icon");
    const bookmarkText = document.getElementById("bookmark-text");

    // Clean up any existing map before showing new story
    this.cleanupMap();

    // Show loading state in modal
    modal.style.display = "block";
    document.getElementById("modal-title").textContent =
      "Loading story details...";
    document.getElementById("modal-description").textContent = "";
    document.getElementById("modal-createdAt").textContent = "";
    document.getElementById("modal-location").textContent = "";
    document.getElementById("modal-image-container").innerHTML = "";
    document.getElementById("modal-map").style.display = "none";

    // Set ARIA attributes for the modal
    modal.setAttribute("aria-hidden", "false");

    try {
      let story;

      if (source === "api" && navigator.onLine) {
        // Online: Get from API
        const result = await this.presenter.getStoryDetails(storyId);
        if (result && result.story) {
          story = result.story;
        } else {
          throw new Error(
            result?.message || "Failed to retrieve story details"
          );
        }
      } else if (source === "bookmark") {
        // Get from bookmarks
        const bookmarks = await getBookmarkedStories();
        story = bookmarks.find((s) => s.id === storyId);
        if (!story) throw new Error("Bookmarked story not found");
      } else {
        // Get from cache
        const cachedStories = await getCachedStories();
        story = cachedStories.find((s) => s.id === storyId);
        if (!story) throw new Error("Story not found in cache");
      }

      document.getElementById("modal-title").textContent = story.name;
      document.getElementById("modal-description").textContent =
        story.description;

      // Format the date
      const date = new Date(story.createdAt);
      const formattedDate = date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      document.getElementById(
        "modal-createdAt"
      ).textContent = `Posted on: ${formattedDate}`;

      // Add image with lazy loading
      const modalImageContainer = document.getElementById(
        "modal-image-container"
      );
      modalImageContainer.innerHTML = `
        <img id="modal-image" src="${story.photoUrl}" alt="Story image by ${
        story.name
      }" loading="lazy" />
        ${
          source === "cache"
            ? '<div class="cached-indicator">Cached Image</div>'
            : ""
        }
      `;

      // Show location if available
      const modalLocation = document.getElementById("modal-location");
      const modalMap = document.getElementById("modal-map");

      if (story.lat && story.lon) {
        modalLocation.textContent = `Location: ${story.lat.toFixed(
          6
        )}, ${story.lon.toFixed(6)}`;

        // Show map if online, otherwise show unavailable message
        if (navigator.onLine && typeof L !== "undefined") {
          modalMap.style.display = "block";
          this.initMap(story.lat, story.lon);
        } else {
          modalMap.style.display = "block";
          modalMap.innerHTML = `
            <div class="map-unavailable">
              <p>${
                source === "cache"
                  ? "Map not available in cached mode."
                  : "You are offline. Map cannot be displayed."
              }</p>
            </div>
          `;
        }
      } else {
        modalLocation.textContent = "No location information available";
        modalMap.style.display = "none";
      }

      // Update bookmark button
      const isStoryBookmarked = await isBookmarked(storyId);
      if (modalBookmarkBtn) {
        modalBookmarkBtn.dataset.storyId = storyId; // Store story ID on the button
        modalBookmarkBtn.classList.toggle("bookmarked", isStoryBookmarked);
        bookmarkIcon.textContent = isStoryBookmarked ? "★" : "☆";
        bookmarkText.textContent = isStoryBookmarked
          ? "Remove Bookmark"
          : "Bookmark";

        // Set up bookmark button click handler
        modalBookmarkBtn.onclick = async () => {
          modalBookmarkBtn.classList.add("toggling"); // Add animation
          setTimeout(() => modalBookmarkBtn.classList.remove("toggling"), 500);

          const isBookmarked =
            modalBookmarkBtn.classList.contains("bookmarked");

          try {
            if (isBookmarked) {
              await removeBookmark(storyId);
              modalBookmarkBtn.classList.remove("bookmarked");
              bookmarkIcon.textContent = "☆";
              bookmarkText.textContent = "Bookmark";
              this.showToast("Bookmark removed");
              
              // Update the corresponding card's bookmark button
              this.updateCardBookmarkStatus(storyId, false);

              // If we're in bookmarks view, refresh the view when modal is closed
              if (this.currentView === "bookmarks") {
                this.needsRefresh = true;
              }
            } else {
              await bookmarkStory(story);
              modalBookmarkBtn.classList.add("bookmarked");
              bookmarkIcon.textContent = "★";
              bookmarkText.textContent = "Remove Bookmark";
              this.showToast("Story bookmarked");
              
              // Update the corresponding card's bookmark button
              this.updateCardBookmarkStatus(storyId, true);
            }
          } catch (error) {
            console.error("Error toggling bookmark in modal:", error);
            this.showToast(
              isBookmarked
                ? "Failed to remove bookmark"
                : "Failed to bookmark story",
              "error"
            );
          }
        };
      }

      // Setup modal close button
      const closeButton = document.getElementById("close-modal");
      closeButton.onclick = () => {
        this.closeModal();

        // If a refresh is needed (bookmarks were modified in bookmark view)
        if (this.needsRefresh && this.currentView === "bookmarks") {
          this.loadBookmarkedStories();
          this.needsRefresh = false;
        }
      };

      // Add keyboard support for Escape key
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "block") {
          this.closeModal();

          if (this.needsRefresh && this.currentView === "bookmarks") {
            this.loadBookmarkedStories();
            this.needsRefresh = false;
          }
        }
      });
    } catch (error) {
      console.error("Error showing story details:", error);

      document.getElementById("modal-title").textContent = "Error";
      document.getElementById(
        "modal-description"
      ).textContent = `Failed to load story details: ${
        error.message || "Unknown error"
      }`;
    }
  }

  closeModal() {
    const modal = document.getElementById("story-modal");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");

    // Clean up the map instance
    this.cleanupMap();

    // Clean up any event listeners
    document.removeEventListener("keydown", this.handleModalKeydown);
  }

  cleanupMap() {
    if (this.currentMap) {
      try {
        // Remove the map instance properly
        this.currentMap.remove();
        this.currentMap = null;
      } catch (error) {
        console.warn("Error cleaning up map:", error);
        this.currentMap = null;
      }
    }
  }

  initMap(lat, lng) {
    try {
      // Check if Leaflet is available
      if (typeof L === "undefined") {
        console.error("Leaflet library not loaded");
        return;
      }

      const mapDiv = document.getElementById("modal-map");
      
      // Clean up any existing map instance first
      this.cleanupMap();
      
      // Clear the map container content
      mapDiv.innerHTML = '';
      
      // Remove any existing Leaflet classes that might interfere
      mapDiv.className = 'modal-map-container';
      
      // Create a new Leaflet map instance
      this.currentMap = L.map(mapDiv).setView([parseFloat(lat), parseFloat(lng)], 15);

      // Add OpenStreetMap tiles (same as AddStoryPage)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.currentMap);

      // Add a marker to the map
      L.marker([parseFloat(lat), parseFloat(lng)])
        .addTo(this.currentMap)
        .bindPopup('Story location')
        .openPopup();
        
    } catch (error) {
      console.error("Error initializing map:", error);

      const mapDiv = document.getElementById("modal-map");
      mapDiv.innerHTML = `
        <div class="map-error">
          <p>Failed to load map: ${error.message || "Unknown error"}</p>
        </div>
      `;
    }
  }
}