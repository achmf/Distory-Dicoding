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
        <p>This is your home page. Feel free to explore the amazing stories!</p>
        ${userName !== "Guest" ? '<p>Check out the <a href="#/story">Stories</a> section or <a href="#/add-story">Add a New Story</a>!</p>' : '<p>Please <a href="#/login">login</a> to access all features.</p>'}
      </section>
    `
  }

  async afterRender() {
    // No need for logout handling here since it's now in the navigation
  }
}
