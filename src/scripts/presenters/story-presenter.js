class StoryPresenter {
    constructor(view, model) {
      this.view = view
      this.model = model
      this.view.setPresenter(this)
    }
  
    async getAllStories(page = 1, size = 10, location = 0) {
      try {
        const stories = await this.model.getAllStories(page, size, location)
        return { success: true, data: stories }
      } catch (error) {
        console.error("Error in presenter getting stories:", error)
        return { success: false, message: error.message || "Failed to load stories" }
      }
    }
  
    async getStoryDetails(storyId) {
      try {
        const storyDetails = await this.model.getStoryDetails(storyId)
        return { success: true, data: storyDetails }
      } catch (error) {
        console.error("Error in presenter getting story details:", error)
        return { success: false, message: error.message || "Failed to load story details" }
      }
    }
  
    isLoggedIn() {
      return this.model.isLoggedIn()
    }
  }
  
  export default StoryPresenter
  