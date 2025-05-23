class AddStoryPresenter {
    constructor(view, model) {
      this.view = view
      this.model = model
      this.view.setPresenter(this)
    }
  
    async addStory(storyData) {
      try {
        const response = await this.model.addStory(storyData)
        return { success: true, data: response }
      } catch (error) {
        console.error("Error in presenter adding story:", error)
        return { success: false, message: error.message || "Failed to add story" }
      }
    }
  
    isLoggedIn() {
      return this.model.isLoggedIn()
    }
  }
  
  export default AddStoryPresenter
  