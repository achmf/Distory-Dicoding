class HomePresenter {
    constructor(view, model) {
      this.view = view
      this.model = model
      this.view.setPresenter(this)
    }
  
    getUserName() {
      const userData = this.model.getUserData()
      return userData.userName || "Guest"
    }
  
    logout() {
      this.model.logout()
      return { success: true }
    }
  }
  
  export default HomePresenter
  