import CONFIG from "../config"
import PushNotification from "../../utils/push-notification"

class StoryModel {
  constructor() {
    this.baseUrl = CONFIG.BASE_URL
    this.token = localStorage.getItem("token")
  }

  async getAllStories(page = 1, size = 10, location = 0) {
    try {
      const url = new URL(`${this.baseUrl}/stories`)
      url.searchParams.append("page", page)
      url.searchParams.append("size", size)
      url.searchParams.append("location", location)

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication required. Please login first.")
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch stories")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message)
      }

      return data.listStory
    } catch (error) {
      console.error("Error fetching stories:", error)
      throw error
    }
  }

  async getStoryDetails(storyId) {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication required. Please login first.")
      }

      const response = await fetch(`${this.baseUrl}/stories/${storyId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to fetch story details")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.message)
      }

      return data.story
    } catch (error) {
      console.error("Error fetching story details:", error)
      throw error
    }
  }

  async addStory(storyData) {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Authentication required. Please login first.")
      }

      const response = await fetch(`${this.baseUrl}/stories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: storyData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add story")
      }

      const responseData = await response.json()

      // If the story was added successfully, show a notification
      if (!responseData.error) {
        // Create a story object with the data we have
        const storyObj = {
          id: responseData.id || "new-story",
          name: "Your Story", // Since it's the user's own story
          description: storyData.get("description"),
          photoUrl: null, // We don't have the URL yet
        }

        // Try to get the user's name from localStorage if available
        const userData = localStorage.getItem("user_data")
        if (userData) {
          try {
            const parsedUserData = JSON.parse(userData)
            if (parsedUserData.name) {
              storyObj.name = parsedUserData.name
            }
          } catch (e) {
            console.error("Error parsing user data:", e)
          }
        }

        // Show a notification for the new story
        this.notifyStoryPublished(storyObj)
      }

      return responseData
    } catch (error) {
      console.error("Error adding story:", error)
      throw error
    }
  }

  // Method to notify that a story has been published
  async notifyStoryPublished(storyData) {
    try {
      // First check if notifications are enabled
      const isNotificationActive = await PushNotification.isNotificationActive()

      if (isNotificationActive) {
        // Show a local notification
        await PushNotification.notifyNewStory(storyData)

        // If we have a server endpoint for sending push notifications to subscribers
        // we would call it here
        // await this.sendPushNotificationToSubscribers(storyData);
      }
    } catch (error) {
      console.error("Error sending story notification:", error)
      // Don't throw the error - notifications are non-critical
    }
  }

  // Method to send push notifications to subscribers (would be implemented on the server)
  async sendPushNotificationToSubscribers(storyData) {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        return // Silently fail if not logged in
      }

      // This would call your server endpoint that handles sending push notifications
      const response = await fetch(`${this.baseUrl}/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storyId: storyData.id,
          title: `New Story from ${storyData.name}`,
          body: storyData.description,
          imageUrl: storyData.photoUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error sending push notifications:", errorData)
      }
    } catch (error) {
      console.error("Error sending push notifications:", error)
    }
  }

  isLoggedIn() {
    return !!localStorage.getItem("token")
  }
}

export default StoryModel
