import Swal from "sweetalert2";
import PushNotification from "../../utils/push-notification";
import {
  saveStoryToDB,
  getAllStoriesFromDB,
  deleteStoryFromDB,
} from "../../utils/indexedDB";

export default class AddStoryPage {
  constructor() {
    this.presenter = null;
    this.capturedImage = null;
    this.currentStream = null;
    this.imageSource = null; // 'camera' or 'upload'
    this.notificationEnabled = false; // Track if notifications are enabled
    this.offlineStories = []; // Track offline stories
    this.deviceId = this.getOrCreateDeviceId(); // Get or create a unique device ID
  }

  // Get or create a unique device ID to identify stories created on this device
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      // Create a unique ID if one doesn't exist
      deviceId =
        "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  }

  setPresenter(presenter) {
    this.presenter = presenter;
  }

  async render() {
    // Check if push notifications are supported
    const notificationsSupported = PushNotification.isSupported();
    const isSubscribed = await PushNotification.isSubscribed();
    this.notificationEnabled = isSubscribed;

    // Get offline stories from IndexedDB - only those created on this device
    try {
      const allStories = await getAllStoriesFromDB();
      // Filter stories to only include those created on this device
      this.offlineStories = allStories.filter(
        (story) => story.deviceId === this.deviceId
      );
      console.log(
        `Found ${this.offlineStories.length} offline stories for this device`
      );
    } catch (error) {
      console.error("Failed to fetch offline stories:", error);
      this.offlineStories = [];
    }

    // Offline stories section
    const offlineStoriesSection =
      this.offlineStories.length > 0
        ? `
    <section class="offline-stories-section">
      <h2>Your Offline Stories</h2>
      <p>These stories will be uploaded when you're back online.</p>
      <div class="offline-stories-list">
        ${this.offlineStories
          .map(
            (story, index) => `
          <div class="offline-story-item" data-id="${story.id}">
            <div class="offline-story-content">
              <p class="offline-story-text">${story.description}</p>
              <div class="offline-story-meta">
                <span class="offline-story-location">Location: ${story.lat.toFixed(
                  4
                )}, ${story.lon.toFixed(4)}</span>
                ${
                  story.photoPreview
                    ? `<div class="offline-story-image"><img src="${story.photoPreview}" alt="Story Image" /></div>`
                    : ""
                }
              </div>
            </div>
            <div class="offline-story-actions">
              <button type="button" class="sync-story-btn primary-btn" data-id="${
                story.id
              }">
                <i class="fas fa-sync"></i> Sync
              </button>
              <button type="button" class="delete-story-btn secondary-btn" data-id="${
                story.id
              }">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </section>
  `
        : "";

    return `
      <section class="container">
        <h1>Share Your Story</h1>
        
        ${offlineStoriesSection}
        
<div class="network-status-banner ${navigator.onLine ? "online" : "offline"}">
  <span class="status-icon">
    <i class="fas ${
      navigator.onLine ? "fa-wifi" : "fa-exclamation-triangle"
    }"></i>
  </span>
  <span class="status-text">
    ${
      navigator.onLine
        ? "You are online. Stories will be published immediately."
        : "You are offline. Stories will be saved locally and published when you are back online."
    }
  </span>
</div>


        <form id="story-form">
          <label for="story-text">Story Content:</label>
          <textarea id="story-text" name="story-text" rows="4" required></textarea>

          <!-- Image Selection Section -->
          <div class="image-selection">
            <label>Choose Image Source:</label>
            <div class="image-source-buttons">
              <button type="button" id="camera-btn" class="source-btn">
                <i class="fas fa-camera"></i> Take Photo
              </button>
              <button type="button" id="upload-btn" class="source-btn">
                <i class="fas fa-upload"></i> Upload Image
              </button>
            </div>
          </div>

          <!-- Image Preview Section -->
          <div id="image-preview-container" style="display: none;">
            <h3>Image Preview</h3>
            <div id="image-preview"></div>
            <div class="image-preview-controls">
              <button type="button" id="retake-photo-btn" class="secondary-btn">Retake Photo</button>
              <button type="button" id="change-image-btn" class="secondary-btn">Change Image</button>
            </div>
          </div>

          <!-- Camera Section -->
          <div id="camera-section" style="display: none;">
            <div class="camera-container">
              <video id="camera-stream" autoplay playsinline></video>
              <div class="camera-controls">
                <button type="button" id="take-photo-btn" class="primary-btn">Capture Photo</button>
                <button type="button" id="cancel-camera-btn" class="secondary-btn">Cancel</button>
              </div>
            </div>
          </div>

          <!-- File Upload Section -->
          <div id="upload-section" style="display: none;">
            <label for="story-image">Select an Image:</label>
            <input type="file" id="story-image" name="story-image" accept="image/*">
          </div>

          <label for="story-location">Story Location:</label>
          <p class="help-text">Click on the map to set your story's location</p>
          
          <!-- Coordinates Display -->
          <div id="coordinates-display" class="coordinates-display" aria-live="polite">
            <p>No location selected yet. Click on the map to set a location.</p>
          </div>
          
          <div id="story-location" class="map-container"></div>

          <!-- Hidden fields for latitude and longitude -->
          <input type="hidden" id="lat" name="lat" />
          <input type="hidden" id="lon" name="lon" />

          <div class="form-actions">
            <!-- No notification toggle, will prompt automatically -->
            
            <button type="submit" id="submit-btn" class="primary-btn">Submit Story</button>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this.initializeMap(); // Initialize Google Map
    this.setupEventListeners(); // Set up event listeners
    this.setupNetworkListeners(); // Set up network status listeners

    // Set up offline stories sync and delete buttons
    const syncButtons = document.querySelectorAll(".sync-story-btn");
    syncButtons.forEach((button) => {
      button.addEventListener("click", (e) => this.handleSyncStory(e));
    });

    const deleteButtons = document.querySelectorAll(".delete-story-btn");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => this.handleDeleteOfflineStory(e));
    });

    // Add event listener for page navigation
    window.addEventListener("hashchange", this.cleanup.bind(this));
  }

  // Setup network status listeners
  setupNetworkListeners() {
    window.addEventListener("online", () => {
      this.updateNetworkStatusUI(true);
      this.checkAndSyncOfflineStories();
    });

    window.addEventListener("offline", () => {
      this.updateNetworkStatusUI(false);
    });
  }

  // Update the network status UI
  updateNetworkStatusUI(isOnline) {
    const statusBanner = document.querySelector(".network-status-banner");
    if (statusBanner) {
      statusBanner.className = `network-status-banner ${
        isOnline ? "online" : "offline"
      }`;

      const statusIcon = statusBanner.querySelector(".status-icon i");
      if (statusIcon) {
        statusIcon.className = `fas ${
          isOnline ? "fa-wifi" : "fa-exclamation-triangle"
        }`;
      }

      const statusText = statusBanner.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = isOnline
          ? "You are online. Stories will be published immediately."
          : "You are offline. Stories will be saved locally and published when you are back online.";
      }
    }
  }

  // Check and sync offline stories when back online
  async checkAndSyncOfflineStories() {
    // Only check stories for this device
    const deviceStories = this.offlineStories.filter(
      (story) => story.deviceId === this.deviceId
    );

    if (navigator.onLine && deviceStories.length > 0) {
      Swal.fire({
        title: "You're Back Online!",
        text: `You have ${deviceStories.length} stories saved offline. Would you like to upload them now?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, upload now",
        cancelButtonText: "Later",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonColor: "#5865f2",
      }).then((result) => {
        if (result.isConfirmed) {
          this.syncAllOfflineStories();
        }
      });
    }
  }

  // Sync all offline stories
  async syncAllOfflineStories() {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
    }

    let successCount = 0;
    let failCount = 0;

    // Only sync stories from this device
    const deviceStories = this.offlineStories.filter(
      (story) => story.deviceId === this.deviceId
    );

    for (const story of deviceStories) {
      try {
        const result = await this.syncStory(story);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error("Error syncing story:", error);
        failCount++;
      }
    }

    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
    }

    // Show results
    Swal.fire({
      title: "Sync Complete",
      text: `Successfully uploaded ${successCount} stories. Failed to upload ${failCount} stories.`,
      icon: successCount > 0 ? "success" : "warning",
      background: "#121212",
      color: "#e0e0e0",
      confirmButtonText: "OK",
      confirmButtonColor: "#5865f2",
    }).then(() => {
      // Refresh the page to update the UI
      window.location.reload();
    });
  }

  // Handle sync button click for a specific story
  async handleSyncStory(event) {
    const storyId = Number.parseInt(event.currentTarget.dataset.id);
    const story = this.offlineStories.find((s) => s.id === storyId);

    if (!story) {
      Swal.fire({
        title: "Error!",
        text: "Story not found",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    // Verify this is a story from the current device
    if (story.deviceId !== this.deviceId) {
      Swal.fire({
        title: "Error!",
        text: "This story was not created on this device and cannot be synced.",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
    }

    try {
      const result = await this.syncStory(story);

      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
      }

      if (result.success) {
        Swal.fire({
          title: "Success!",
          text: "Story uploaded successfully",
          icon: "success",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "OK",
          confirmButtonColor: "#5865f2",
        }).then(() => {
          // Remove the synced story from the UI
          const storyElement = document.querySelector(
            `.offline-story-item[data-id="${storyId}"]`
          );
          if (storyElement) {
            storyElement.remove();
          }

          // If no more offline stories, hide the section
          const storyItems = document.querySelectorAll(".offline-story-item");
          if (storyItems.length === 0) {
            const section = document.querySelector(".offline-stories-section");
            if (section) {
              section.style.display = "none";
            }
          }
        });
      } else {
        Swal.fire({
          title: "Error!",
          text: result.message || "Failed to upload story",
          icon: "error",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "OK",
          confirmButtonColor: "#f04747",
        });
      }
    } catch (error) {
      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
      }

      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to upload story",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
    }
  }

  // Sync a single story from IndexedDB to the API
  async syncStory(story) {
    if (!navigator.onLine) {
      return {
        success: false,
        message:
          "You are offline. Please try again when you have internet connection.",
      };
    }

    // Verify this is a story from the current device
    if (story.deviceId !== this.deviceId) {
      return {
        success: false,
        message:
          "This story was not created on this device and cannot be synced.",
      };
    }

    try {
      // Create FormData from the stored story
      const formData = new FormData();
      formData.append("description", story.description);
      formData.append("lat", story.lat);
      formData.append("lon", story.lon);

      // Convert base64 image back to a file if it exists
      if (story.photoBase64) {
        const imageFile = await this.base64ToFile(
          story.photoBase64,
          "story-image.jpg"
        );
        formData.append("photo", imageFile);
      }

      // Submit to API
      const result = await this.presenter.addStory({
        description: story.description,
        photo: imageFile,
        lat: story.lat,
        lon: story.lon
      });

      if (result.success) {
        // Delete from IndexedDB
        await deleteStoryFromDB(story.id);
        // Remove from local array
        this.offlineStories = this.offlineStories.filter(
          (s) => s.id !== story.id
        );
        return { success: true };
      } else {
        return {
          success: false,
          message: result.message || "Failed to upload story",
        };
      }
    } catch (error) {
      console.error("Error syncing story:", error);
      return {
        success: false,
        message: error.message || "Failed to upload story",
      };
    }
  }

  // Handle delete button click for an offline story
  async handleDeleteOfflineStory(event) {
    const storyId = Number.parseInt(event.currentTarget.dataset.id);
    const story = this.offlineStories.find((s) => s.id === storyId);

    // Verify this is a story from the current device
    if (story && story.deviceId !== this.deviceId) {
      Swal.fire({
        title: "Error!",
        text: "This story was not created on this device and cannot be deleted.",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "This story will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      background: "#121212",
      color: "#e0e0e0",
      confirmButtonColor: "#f04747",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Delete from IndexedDB
          await deleteStoryFromDB(storyId);

          // Remove from local array
          this.offlineStories = this.offlineStories.filter(
            (s) => s.id !== storyId
          );

          // Remove from UI
          const storyElement = document.querySelector(
            `.offline-story-item[data-id="${storyId}"]`
          );
          if (storyElement) {
            storyElement.remove();
          }

          // If no more offline stories, hide the section
          const storyItems = document.querySelectorAll(".offline-story-item");
          if (storyItems.length === 0) {
            const section = document.querySelector(".offline-stories-section");
            if (section) {
              section.style.display = "none";
            }
          }

          Swal.fire({
            title: "Deleted!",
            text: "Your story has been deleted.",
            icon: "success",
            background: "#121212",
            color: "#e0e0e0",
            confirmButtonText: "OK",
            confirmButtonColor: "#5865f2",
          });
        } catch (error) {
          console.error("Error deleting story:", error);
          Swal.fire({
            title: "Error!",
            text: "Failed to delete story. Please try again.",
            icon: "error",
            background: "#121212",
            color: "#e0e0e0",
            confirmButtonText: "OK",
            confirmButtonColor: "#f04747",
          });
        }
      }
    });
  }

  // Cleanup method to stop camera and release resources
  cleanup() {
    console.log("AddStoryPage cleanup: Stopping camera stream");
    this.stopCameraStream();

    // Remove the hashchange event listener to prevent memory leaks
    window.removeEventListener("hashchange", this.cleanup.bind(this));
  }

  initializeMap() {
    const mapContainer = document.getElementById("story-location");
    const coordinatesDisplay = document.getElementById("coordinates-display");

    if (mapContainer) {
      // Initialize Leaflet map
      const map = L.map(mapContainer).setView([-6.2, 106.816666], 13); // Default location (Jakarta)

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Create a marker
      let marker = L.marker([-6.2, 106.816666]).addTo(map);

      // Add click event listener to the map
      map.on('click', (event) => {
        const lat = event.latlng.lat;
        const lon = event.latlng.lng;
        
        // Remove existing marker and add new one
        map.removeLayer(marker);
        marker = L.marker([lat, lon]).addTo(map);
        
        // Update form fields
        document.getElementById("lat").value = lat;
        document.getElementById("lon").value = lon;

        // Update the coordinates display with formatted values
        this.updateCoordinatesDisplay(lat, lon);
      });
    }
  }

  // New method to update the coordinates display
  updateCoordinatesDisplay(lat, lon) {
    const coordinatesDisplay = document.getElementById("coordinates-display");

    if (coordinatesDisplay) {
      // Format coordinates to 6 decimal places for precision
      const formattedLat = lat.toFixed(6);
      const formattedLon = lon.toFixed(6);

      // Convert decimal coordinates to degrees, minutes, seconds format
      const latDMS = this.decimalToDMS(lat, "lat");
      const lonDMS = this.decimalToDMS(lon, "lon");

      coordinatesDisplay.innerHTML = `
        <div class="coordinates-info">
          <h4>Selected Location:</h4>
          <p><strong>Decimal:</strong> ${formattedLat}, ${formattedLon}</p>
          <p><strong>DMS:</strong> ${latDMS}, ${lonDMS}</p>
        </div>
      `;

      // Add a visual indicator that the location has been selected
      coordinatesDisplay.classList.add("location-selected");
    }
  }

  // Helper method to convert decimal coordinates to degrees, minutes, seconds format
  decimalToDMS(coordinate, type) {
    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    const direction =
      type === "lat"
        ? coordinate >= 0
          ? "N"
          : "S"
        : coordinate >= 0
        ? "E"
        : "W";

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  }

  setupEventListeners() {
    document
      .getElementById("camera-btn")
      .addEventListener("click", () => this.activateCamera());
    document
      .getElementById("upload-btn")
      .addEventListener("click", () => this.activateFileUpload());
    document
      .getElementById("take-photo-btn")
      .addEventListener("click", () => this.takePhoto());
    document
      .getElementById("cancel-camera-btn")
      .addEventListener("click", () => this.cancelCamera());
    document
      .getElementById("retake-photo-btn")
      .addEventListener("click", () => this.retakePhoto());
    document
      .getElementById("change-image-btn")
      .addEventListener("click", () => this.resetImageSelection());
    const fileInput = document.getElementById("story-image");
    fileInput.addEventListener("change", (event) =>
      this.handleFileSelected(event)
    );
    const form = document.getElementById("story-form");
    form.addEventListener("submit", (event) => this.handleSubmit(event));
  }

  activateCamera() {
    const cameraSection = document.getElementById("camera-section");
    const uploadSection = document.getElementById("upload-section");
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );

    uploadSection.style.display = "none";
    imagePreviewContainer.style.display = "none";
    cameraSection.style.display = "block";

    this.imageSource = "camera";

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((stream) => {
        const cameraStream = document.getElementById("camera-stream");
        cameraStream.srcObject = stream;
        this.currentStream = stream;
      })
      .catch((err) => {
        Swal.fire({
          title: "Camera Error!",
          text: `Could not access the camera: ${err}`,
          icon: "error",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "OK",
          confirmButtonColor: "#f04747",
        });
        this.resetImageSelection();
      });
  }

  activateFileUpload() {
    const cameraSection = document.getElementById("camera-section");
    const uploadSection = document.getElementById("upload-section");
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );

    this.stopCameraStream();

    cameraSection.style.display = "none";
    imagePreviewContainer.style.display = "none";
    uploadSection.style.display = "block";

    this.imageSource = "upload";

    document.getElementById("story-image").value = "";
  }

  takePhoto() {
    const cameraStream = document.getElementById("camera-stream");

    const canvas = document.createElement("canvas");
    canvas.width = cameraStream.videoWidth;
    canvas.height = cameraStream.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

    this.capturedImage = canvas.toDataURL("image/jpeg", 0.9);

    this.stopCameraStream();

    this.showImagePreview(this.capturedImage);
  }

  retakePhoto() {
    if (this.imageSource === "camera") {
      document.getElementById("image-preview-container").style.display = "none";
      this.activateCamera();
    } else {
      this.resetImageSelection();
    }
  }

  cancelCamera() {
    this.stopCameraStream();
    this.resetImageSelection();
  }

  stopCameraStream() {
    if (this.currentStream) {
      console.log("Stopping camera stream");
      const tracks = this.currentStream.getTracks();
      tracks.forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  handleFileSelected(event) {
    const file = event.target.files[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      this.showImagePreview(imageUrl);
    }
  }

  showImagePreview(imageUrl) {
    const cameraSection = document.getElementById("camera-section");
    const uploadSection = document.getElementById("upload-section");
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );
    const imagePreview = document.getElementById("image-preview");
    const retakePhotoBtn = document.getElementById("retake-photo-btn");

    cameraSection.style.display = "none";
    uploadSection.style.display = "none";

    imagePreview.innerHTML = "";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "Selected Image";
    img.className = "preview-image";

    imagePreview.appendChild(img);

    if (this.imageSource === "camera") {
      retakePhotoBtn.style.display = "block";
    } else {
      retakePhotoBtn.style.display = "none";
    }

    imagePreviewContainer.style.display = "block";
  }

  resetImageSelection() {
    const cameraSection = document.getElementById("camera-section");
    const uploadSection = document.getElementById("upload-section");
    const imagePreviewContainer = document.getElementById(
      "image-preview-container"
    );

    this.stopCameraStream();

    cameraSection.style.display = "none";
    uploadSection.style.display = "none";
    imagePreviewContainer.style.display = "none";

    this.capturedImage = null;
    this.imageSource = null;

    document.querySelector(".image-selection").style.display = "block";
  }

  async handleSubmit(event) {
    event.preventDefault();

    // Collect form data
    const description = document.getElementById("story-text").value;
    const lat = Number.parseFloat(document.getElementById("lat").value);
    const lon = Number.parseFloat(document.getElementById("lon").value);

    if (isNaN(lat) || isNaN(lon)) {
      Swal.fire({
        title: "Error!",
        text: "Please select a location on the map.",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    // Initialize the image variables
    let imageFile = null;
    let imageBase64 = null;

    // Handle image source appropriately based on the selected method
    if (this.imageSource === "upload") {
      const fileInput = document.getElementById("story-image");
      imageFile = fileInput.files[0];
      
      if (!imageFile) {
        Swal.fire({
          title: "Error!",
          text: "Please select an image file.",
          icon: "error",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "OK",
          confirmButtonColor: "#f04747",
        });
        return;
      }
      // Convert the file to base64 for offline storage
      imageBase64 = await this.fileToBase64(imageFile);
      
    } else if (this.imageSource === "camera" && this.capturedImage) {
      // Convert base64 camera image to File object
      imageFile = await this.base64ToFile(
        this.capturedImage,
        "camera-photo.jpg"
      );
      imageBase64 = this.capturedImage;
      
    } else {
      Swal.fire({
        title: "Error!",
        text: "Please select an image or take a photo.",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    // Validate the image file
    if (!imageFile) {
      Swal.fire({
        title: "Error!",
        text: "Failed to process the image. Please try again.",
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#f04747",
      });
      return;
    }

    // Show the loading overlay
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
    }

    const submitBtn = document.getElementById("submit-btn");
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";
    submitBtn.disabled = true;

    try {
      // Check if we're online or offline
      if (navigator.onLine) {
        // We're online, submit to API through the presenter
        // Send data as object, not FormData
        const result = await this.presenter.addStory({
          description: description,
          photo: imageFile, // Pass the File object directly
          lat: lat,
          lon: lon
        });

        if (result.success) {
          Swal.fire({
            title: "Success!",
            text: "Your story has been added!",
            icon: "success",
            background: "#121212",
            color: "#e0e0e0",
            confirmButtonText: "OK",
            confirmButtonColor: "#5865f2",
          }).then(() => {
            // Reset the form
            document.getElementById("story-form").reset();
            this.resetImageSelection();
          });

          // Always show notification prompt if notifications are not already enabled
          if (!this.notificationEnabled && PushNotification.isSupported()) {
            // Mark that we've shown the prompt
            PushNotification.setPromptShown();

            setTimeout(() => {
              Swal.fire({
                title: "Enable Notifications?",
                text: "Would you like to receive notifications when your story is published?",
                icon: "question",
                background: "#121212",
                color: "#e0e0e0",
                showCancelButton: true,
                confirmButtonText: "Yes, enable",
                cancelButtonText: "No, thanks",
                confirmButtonColor: "#5865f2",
                cancelButtonColor: "#f04747",
              }).then((result) => {
                if (result.isConfirmed) {
                  PushNotification.requestPermissionAndSubscribe().then(
                    (subscribeResult) => {
                      if (subscribeResult.success) {
                        PushNotification.setNotificationPreference(true);
                        this.notificationEnabled = true;
                      } else {
                        PushNotification.setNotificationPreference(false);
                      }
                    }
                  );
                } else {
                  // User declined notifications
                  PushNotification.setNotificationPreference(false);
                }
              });
            }, 1000);
          }
        } else {
          throw new Error(result.message || "Failed to add story");
        }
      } else {
        // We're offline, save to IndexedDB
        const timestamp = new Date().toISOString();
        const userName = localStorage.getItem("userName") || "User";

        // Create a small preview image for the UI
        const previewImage = imageBase64
          ? await this.resizeBase64Image(imageBase64, 200)
          : null;

        const offlineStory = {
          description,
          lat,
          lon,
          photoBase64: imageBase64,
          photoPreview: previewImage,
          timestamp,
          status: "pending",
          deviceId: this.deviceId, // Add device ID to identify stories created on this device
          name: userName, // Add user name for display
          createdAt: timestamp, // Add creation timestamp
        };

        // Save to IndexedDB
        await saveStoryToDB(offlineStory);

        Swal.fire({
          title: "Saved Offline!",
          text: "Your story has been saved locally and will be uploaded when you're back online.",
          icon: "success",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "OK",
          confirmButtonColor: "#5865f2",
        }).then(() => {
          // Reset the form
          document.getElementById("story-form").reset();
          this.resetImageSelection();
          // Refresh the page to show the new offline story
          window.location.reload();
        });
      }
    } catch (error) {
      console.error("Error adding story:", error);
      Swal.fire({
        title: "Error!",
        text: `Failed to add story: ${error.message}`,
        icon: "error",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "Try Again",
        confirmButtonColor: "#f04747",
      });
    } finally {
      // Hide the loading overlay and reset button text
      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
      }
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  }

  async base64ToFile(base64String, filename) {
    // Check if the string is already properly formatted with data URL
    const parts = base64String.includes(";base64,") 
      ? base64String.split(";base64,")
      : [null, base64String];
    
    // Get content type or default to JPEG
    const contentType = parts[0] ? parts[0].split(":")[1] : "image/jpeg";
    
    // Get the base64 data
    const base64Data = parts[1] || parts[0];
    
    try {
      const raw = window.atob(base64Data);
      const rawLength = raw.length;

      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }

      const blob = new Blob([uInt8Array], { type: contentType });
      return new File([blob], filename, { type: contentType });
    } catch (error) {
      console.error("Failed to convert base64 to File:", error);
      throw new Error("Failed to process the image");
    }
  }

  // Convert a file to base64 for storing in IndexedDB
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // Resize a base64 image to a smaller size for preview
  async resizeBase64Image(base64, maxDimension) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });
  }
}

// Fix for undeclared google variable
if (typeof google === "undefined") {
  window.google = {
    maps: {
      Map: function () {
        this.addListener = () => {};
      },
      Marker: () => {},
      event: {
        addListener: () => {},
      },
    },
  };
}