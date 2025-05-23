// This file is kept for backward compatibility
// All API calls should now go through the Model classes

import CONFIG from "../config"

const ENDPOINTS = {
  STORIES: `${CONFIG.BASE_URL}/stories`, // Endpoint for fetching stories
  ADD_STORY: `${CONFIG.BASE_URL}/stories/add`, // Endpoint for adding a new story
}

// Fetch all stories with optional pagination and location filter
export async function getAllStories(page = 1, size = 10, location = 0) {
  try {
    const url = new URL(ENDPOINTS.STORIES)
    url.searchParams.append("page", page) // Add page parameter
    url.searchParams.append("size", size) // Add size parameter
    url.searchParams.append("location", location) // Add location filter (1 or 0)

    const token = localStorage.getItem("token") // Get token directly from localStorage
    console.log("Using token:", token) // Log the token for debugging

    if (!token) {
      throw new Error("Authentication required. Please login first.")
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Use token from localStorage
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

    return data.listStory // Return the list of stories
  } catch (error) {
    console.error("Error fetching stories:", error)
    throw error // Rethrow the error to be handled by the caller
  }
}

// Fetch single story details by ID
export async function getStoryDetails(storyId, token) {
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/stories/${storyId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`, // Include token for authenticated requests
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

    return data.story // Return the story details
  } catch (error) {
    console.error("Error fetching story details:", error)
    throw error // Rethrow the error to be handled by the caller
  }
}

// Add a new story to the API
export async function addStory(storyData) {
  try {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("Authentication required. Please login first.")
    }

    const response = await fetch(ENDPOINTS.STORIES, {
      // Use the correct endpoint
      method: "POST", // Add new story with a POST request
      headers: {
        Authorization: `Bearer ${token}`, // Use token from localStorage
      },
      body: storyData, // Send the FormData directly (don't stringify)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to add story")
    }

    return await response.json() // Return the response from the API
  } catch (error) {
    console.error("Error adding story:", error)
    throw error // Rethrow the error to be handled by the caller
  }
}
