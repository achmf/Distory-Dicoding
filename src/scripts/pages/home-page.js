import Swal from "sweetalert2"

export default class HomePage {
  constructor() {
    this.presenter = null
  }

  setPresenter(presenter) {
    this.presenter = presenter
  }

  async render() {
    // Get user name from presenter
    const userName = this.presenter ? this.presenter.getUserName() : "Guest"

    return `
      <section class="homepage-container">
        <h1>Welcome, ${userName}!</h1>
        <p>This is your home page. Feel free to explore!</p>
        ${userName !== "Guest" ? '<button id="logout-btn">Logout</button>' : ""}
      </section>
    `
  }

  async afterRender() {
    const logoutButton = document.getElementById("logout-btn")
    if (logoutButton) {
      logoutButton.addEventListener("click", () => this.handleLogout())
    }
  }

  handleLogout() {
    // Use presenter to handle logout
    const result = this.presenter.logout()

    if (result.success) {
      // SweetAlert2 logout
      Swal.fire({
        title: "Logged Out",
        text: "You have successfully logged out.",
        icon: "success",
        background: "#121212",
        color: "#e0e0e0",
        confirmButtonText: "OK",
        confirmButtonColor: "#5865f2",
      }).then(() => {
        // Redirect to the login page after the alert is closed
        window.location.hash = "#/login"
      })
    }
  }
}
