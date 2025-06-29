import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    // Make sure main content can receive focus for skip link functionality
    if (!this.#content.hasAttribute("tabindex")) {
      this.#content.setAttribute("tabindex", "-1");
    }

    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener("click", () => {
      this.#navigationDrawer.classList.toggle("open");
    });

    document.body.addEventListener("click", (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove("open");
      }

      this.#navigationDrawer.querySelectorAll("a").forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove("open");
        }
      });
    });
  }

  async renderPage() {
    console.log("📄 App.renderPage() called");
    const url = getActiveRoute();
    console.log("🔗 Active route:", url);
    const page = routes[url]; // Get the page based on the active URL
    console.log("📱 Page found:", page ? page.constructor.name : "null");

    // Clean up previous page if it exists and has a cleanup method
    if (this.#currentPage && typeof this.#currentPage.cleanup === "function") {
      console.log(
        "🧹 Cleaning up previous page:",
        this.#currentPage.constructor.name
      );
      this.#currentPage.cleanup();
    }

    // Set the new current page
    this.#currentPage = page;

    if (page) {
      try {
        console.log("🎬 Starting page render animation...");
        // Create a fade-out animation using the Animation API
        const fadeOutAnimation = this.#content.animate(
          [
            { opacity: 1 }, // Start at full opacity
            { opacity: 0 }, // Fade out to 0 opacity
          ],
          {
            duration: 500, // 0.5 seconds
            fill: "forwards", // Keep the final state (opacity: 0)
          }
        );
        await fadeOutAnimation.finished; // Wait until fade-out is complete

        console.log("🖼️ Calling page.render()...");
        const content = await page.render();
        console.log(
          "📝 Page content rendered:",
          content ? content.substring(0, 100) + "..." : "empty"
        );
        this.#content.innerHTML = content;

        // Create a fade-in animation using the Animation API
        const fadeInAnimation = this.#content.animate(
          [
            { opacity: 0 }, // Start at 0 opacity
            { opacity: 1 }, // Fade in to full opacity
          ],
          {
            duration: 500, // 0.5 seconds
            fill: "forwards", // Keep the final state (opacity: 1)
          }
        );
        await fadeInAnimation.finished; // Wait until fade-in is complete

        console.log("🎭 Calling page.afterRender()...");
        await page.afterRender();
        console.log("✅ Page render complete!");
      } catch (error) {
        console.error("❌ Error rendering page:", error);
        this.#content.innerHTML =
          '<div class="error-container"><h2>Error</h2><p>Failed to load the page. Please try again.</p></div>';
      }
    } else {
      console.log("❌ No page found for route:", url);
      this.#content.innerHTML = '<div class="error-container"><h2>404</h2><p>Page Not Found</p></div>';
    }
  }
}

export default App;
