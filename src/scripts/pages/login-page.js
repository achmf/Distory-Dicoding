import Swal from "sweetalert2";

export default class LoginPage {
  constructor() {
    this.presenter = null;
  }

  setPresenter(presenter) {
    this.presenter = presenter;
  }

  async render() {
    return `
      <main class="container" role="main">
        <h1>Login</h1>
        <form id="login-form" aria-labelledby="login-heading">
          <h2 id="login-heading" class="sr-only">Login Form</h2>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required aria-describedby="email-help" />
            <p id="email-help" class="help-text sr-only">Enter your registered email address</p>
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required aria-describedby="password-help" />
            <p id="password-help" class="help-text sr-only">Enter your password</p>
          </div>

          <div class="form-actions">
            <button type="submit" aria-label="Login to your account">Login</button>
          </div>
          
          <p class="form-footer">
            Don't have an account? <a href="#/register">Register here</a>
          </p>
        </form>
      </main>
    `;
  }

  async afterRender() {
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Show the loading overlay
      const loadingOverlay = document.getElementById("loading-overlay");
      if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
      }

      const result = await this.presenter.login(email, password);

      // Hide the loading overlay once login is complete
      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
      }

      if (result.success) {
        // SweetAlert2 Success with Dark Mode
        Swal.fire({
          title: "Login Successful!",
          text: "Redirecting to your stories...",
          icon: "success",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "Go to Stories",
          confirmButtonColor: "#5865f2",
          timer: 3000,
          willClose: () => {
            window.location.hash = "#/story";
          },
        });
      } else {
        // SweetAlert2 Error with Dark Mode
        Swal.fire({
          title: "Login Failed!",
          text: result.message || "Please check your credentials.",
          icon: "error",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "Try Again",
          confirmButtonColor: "#f04747",
        });
      }
    });
  }
}
