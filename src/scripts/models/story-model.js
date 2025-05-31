import CONFIG from "../config";
import {
  cacheStories,
  bookmarkStory,
  removeBookmark,
  isBookmarked
} from "../../utils/indexedDB";

class StoryModel {
  constructor() {
    this.baseUrl = CONFIG.BASE_URL;
  }

  async getAllStories(page = 1, size = 10, location = 0) {
    try {
      const token = CONFIG.TOKEN;
      
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      const url = new URL(`${this.baseUrl}/stories`);
      
      // Add query parameters
      if (page) url.searchParams.append("page", page);
      if (size) url.searchParams.append("size", size);
      if (location) url.searchParams.append("location", 1);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      // Cache stories for offline access
      if (responseJson.listStory && responseJson.listStory.length > 0) {
        try {
          await cacheStories(responseJson.listStory);
        } catch (cacheError) {
          console.error("Failed to cache stories:", cacheError);
        }
      }
      
      return responseJson;
    } catch (error) {
      console.error("Error fetching stories:", error);
      throw error;
    }
  }

  async getStoryDetails(storyId) {
    try {
      const token = CONFIG.TOKEN;
      
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      const response = await fetch(`${this.baseUrl}/stories/${storyId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error("Error fetching story details:", error);
      throw error;
    }
  }

  async addStory(storyData) {
    try {
      const token = CONFIG.TOKEN;
      
      if (!token) {
        throw new Error("No authentication token available");
      }
      
      // Create FormData object
      const formData = new FormData();
      formData.append("description", storyData.description);
      
      // Check if photo exists and handle it safely
      if (!storyData.photo) {
        throw new Error("Photo is required for submitting a story");
      }
      
      // Convert base64 to File if photo is base64
      if (typeof storyData.photo === 'string' && storyData.photo.startsWith('data:')) {
        const byteString = atob(storyData.photo.split(',')[1]);
        const mimeString = storyData.photo.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
        formData.append("photo", file);
      } else if (storyData.photo instanceof File) {
        formData.append("photo", storyData.photo);
      } else {
        throw new Error("Invalid photo format. Must be a File object or base64 string.");
      }
      
      // Add location if available
      if (storyData.lat && storyData.lon) {
        formData.append("lat", storyData.lat);
        formData.append("lon", storyData.lon);
      }
      
      const response = await fetch(`${this.baseUrl}/stories`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error("Error adding story:", error);
      throw error;
    }
  }

  // Bookmark related methods
  async bookmarkStory(story) {
    try {
      return await bookmarkStory(story);
    } catch (error) {
      console.error("Error bookmarking story:", error);
      throw error;
    }
  }
  
  async removeBookmark(storyId) {
    try {
      return await removeBookmark(storyId);
    } catch (error) {
      console.error("Error removing bookmark:", error);
      throw error;
    }
  }
  
  async isBookmarked(storyId) {
    try {
      return await isBookmarked(storyId);
    } catch (error) {
      console.error("Error checking bookmark status:", error);
      return false;
    }
  }

  isLoggedIn() {
    return !!CONFIG.TOKEN;
  }
}

export default StoryModel;