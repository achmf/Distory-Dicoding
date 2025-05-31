class StoryPresenter {
  constructor(view, model) {
    this.view = view;
    this.model = model;
    this.view.setPresenter(this);
  }

  async getAllStories(page = 1, size = 10, location = 0) {
    try {
      const stories = await this.model.getAllStories(page, size, location);
      return stories;
    } catch (error) {
      console.error("Error in presenter getting stories:", error);
      return { error: true, message: error.message };
    }
  }

  async getStoryDetails(storyId) {
    try {
      const story = await this.model.getStoryDetails(storyId);
      return story;
    } catch (error) {
      console.error("Error in presenter getting story details:", error);
      return { error: true, message: error.message };
    }
  }

  async bookmarkStory(story) {
    try {
      return await this.model.bookmarkStory(story);
    } catch (error) {
      console.error("Error in presenter bookmarking story:", error);
      return { error: true, message: error.message };
    }
  }
  
  async removeBookmark(storyId) {
    try {
      return await this.model.removeBookmark(storyId);
    } catch (error) {
      console.error("Error in presenter removing bookmark:", error);
      return { error: true, message: error.message };
    }
  }
  
  async isBookmarked(storyId) {
    try {
      return await this.model.isBookmarked(storyId);
    } catch (error) {
      console.error("Error in presenter checking bookmark status:", error);
      return false;
    }
  }

  isLoggedIn() {
    return this.model.isLoggedIn();
  }
}

export default StoryPresenter;