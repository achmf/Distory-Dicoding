class LoginPresenter {
    constructor(view, model) {
      this.view = view
      this.model = model
      this.view.setPresenter(this)
    }
  
    async login(email, password) {
      try {
        const response = await this.model.login(email, password)
  
        if (response && !response.error) {
          // Save user data to localStorage
          this.model.saveUserData(response.loginResult.token, response.loginResult.name)
          return { success: true, data: response.loginResult }
        } else {
          return { success: false, message: "Login failed. Please check your credentials." }
        }
      } catch (error) {
        console.error("Login error:", error)
        return { success: false, message: error.message || "An error occurred during login." }
      }
    }
  }
  
  export default LoginPresenter
  