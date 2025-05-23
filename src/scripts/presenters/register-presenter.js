class RegisterPresenter {
    constructor(view, model) {
      this.view = view
      this.model = model
      this.view.setPresenter(this)
    }
  
    async register(name, email, password) {
      try {
        const response = await this.model.register(name, email, password)
  
        if (response && !response.error) {
          return { success: true, data: response }
        } else {
          return { success: false, message: "Registration failed. Please try again." }
        }
      } catch (error) {
        console.error("Registration error:", error)
        return { success: false, message: error.message || "An error occurred during registration." }
      }
    }
  }
  
  export default RegisterPresenter
  