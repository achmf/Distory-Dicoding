import Swal from "sweetalert2";

export default class RegisterPage {
  constructor() {
    this.presenter = null;
  }

  setPresenter(presenter) {
    this.presenter = presenter;
  }

  async render() {
    return `
      <main class="container" role="main">
        <h1>Register</h1>
        <form id="register-form" aria-labelledby="register-heading">
          <h2 id="register-heading" class="sr-only">Registration Form</h2>
          
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required aria-describedby="name-help" />
            <p id="name-help" class="help-text sr-only">Enter your full name</p>
          </div>

          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required aria-describedby="email-help" />
            <p id="email-help" class="help-text sr-only">Enter a valid email address</p>
          </div>

          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required minlength="8" aria-describedby="password-help" />
            <p id="password-help" class="help-text">Password must be at least 8 characters long</p>
          </div>

          <div class="form-actions">
            <button type="submit" aria-label="Create your account">Register</button>
          </div>
          
          <p class="form-footer">
            Already have an account? <a href="#/login">Login here</a>
          </p>
        </form>
      </main>
    `;
  }

  async afterRender() {
    const form = document.getElementById("register-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Show the loading overlay
      const loadingOverlay = document.getElementById("loading-overlay");
      if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
      }

      // Change button text to show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = "Registering...";
      submitBtn.disabled = true;

      // Create a status message for screen readers
      this.createStatusMessage("Attempting to register. Please wait...");

      const result = await this.presenter.register(name, email, password);

      // Hide the loading overlay once registration is complete
      if (loadingOverlay) {
        loadingOverlay.style.display = "none";
      }

      if (result.success) {
        // Update status for screen readers
        this.createStatusMessage("Registration successful! Redirecting to login page...");

        // Dark Mode SweetAlert2 Success
        Swal.fire({
          title: "Registration Successful!",
          text: "You can now log in.",
          icon: "success",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "Go to Login",
          confirmButtonColor: "#5865f2",
          timer: 3000,
          willClose: () => {
            window.location.hash = "#/login";
          },
        });
      } else {
        // Update status for screen readers
        this.createStatusMessage("Registration failed. Please try again.");

        // Dark Mode SweetAlert2 Error
        Swal.fire({
          title: "Registration Failed!",
          text: result.message || "Please try again later.",
          icon: "error",
          background: "#121212",
          color: "#e0e0e0",
          confirmButtonText: "Retry",
          confirmButtonColor: "#f04747",
        });

        // Reset button state
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // Helper method to create status messages for screen readers
  createStatusMessage(message) {
    const statusElement = document.getElementById("register-status");

    if (statusElement) {
      statusElement.textContent = message;
    } else {
      const newStatusElement = document.createElement("div");
      newStatusElement.id = "register-status";
      newStatusElement.className = "sr-only";
      newStatusElement.setAttribute("aria-live", "polite");
      newStatusElement.textContent = message;
      document.body.appendChild(newStatusElement);
    }
  }
}
