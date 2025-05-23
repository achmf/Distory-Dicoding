import HomePage from "../pages/home-page"
import AddStoryPage from "../pages/add-story-page"
import StoryPage from "../pages/story-page"
import RegisterPage from "../pages/register-page"
import LoginPage from "../pages/login-page"

// Import models
import UserModel from "../models/user-model"
import StoryModel from "../models/story-model"

// Import presenters
import HomePresenter from "../presenters/home-presenter"
import AddStoryPresenter from "../presenters/add-story-presenter"
import StoryPresenter from "../presenters/story-presenter"
import RegisterPresenter from "../presenters/register-presenter"
import LoginPresenter from "../presenters/login-presenter"

// Create model instances
const userModel = new UserModel()
const storyModel = new StoryModel()

// Create view instances
const homePage = new HomePage()
const addStoryPage = new AddStoryPage()
const storyPage = new StoryPage()
const registerPage = new RegisterPage()
const loginPage = new LoginPage()

// Create presenter instances and connect them with views and models
const homePresenter = new HomePresenter(homePage, userModel)
const addStoryPresenter = new AddStoryPresenter(addStoryPage, storyModel)
const storyPresenter = new StoryPresenter(storyPage, storyModel)
const registerPresenter = new RegisterPresenter(registerPage, userModel)
const loginPresenter = new LoginPresenter(loginPage, userModel)

// Define routes after presenters are initialized
const routes = {
  "/": homePage,
  "/add-story": addStoryPage,
  "/story": storyPage,
  "/register": registerPage,
  "/login": loginPage,
}

export default routes
