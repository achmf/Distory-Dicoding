import CONFIG from "../config"

class UserModel {
  async login(email, password) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        return null
      }

      return responseData
    } catch (error) {
      console.error("Error logging in:", error)
      return null
    }
  }

  async register(name, email, password) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        throw new Error("Failed to register")
      }

      return await response.json()
    } catch (error) {
      console.error("Error registering user:", error)
      return null
    }
  }

  saveUserData(token, name) {
    localStorage.setItem("token", token)
    localStorage.setItem("userName", name)
  }

  getUserData() {
    return {
      token: localStorage.getItem("token"),
      userName: localStorage.getItem("userName"),
    }
  }

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
  }

  isLoggedIn() {
    return !!localStorage.getItem("token")
  }
}

export default UserModel
