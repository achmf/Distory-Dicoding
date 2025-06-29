import PushNotification from './push-notification'
import Swal from 'sweetalert2'

class NavigationManager {
  constructor() {
    this.isInitialized = false
  }

  init() {
    if (this.isInitialized) return
    
    this.setupLogoutHandlers()
    this.setupNotificationToggle()
    this.updateNavigationForAuth()
    
    // Listen for storage changes (e.g., login/logout from another tab)
    window.addEventListener('storage', () => {
      this.updateNavigationForAuth()
    })
    
    this.isInitialized = true
  }

  updateNavigationForAuth() {
    const isLoggedIn = !!localStorage.getItem('token')
    
    // Desktop navigation elements
    const loginLink = document.getElementById('login-link')
    const registerLink = document.getElementById('register-link')
    const logoutLink = document.getElementById('logout-link')
    const desktopNotificationToggle = document.getElementById('desktop-notification-toggle')
    
    // Drawer navigation elements
    const loginDrawerLink = document.getElementById('login-drawer-link')
    const registerDrawerLink = document.getElementById('register-drawer-link')
    const logoutDrawerLink = document.getElementById('logout-drawer-link')
    const notificationSettings = document.getElementById('notification-settings')

    if (isLoggedIn) {
      // Hide login/register links
      if (loginLink) loginLink.style.display = 'none'
      if (registerLink) registerLink.style.display = 'none'
      if (loginDrawerLink) loginDrawerLink.style.display = 'none'
      if (registerDrawerLink) registerDrawerLink.style.display = 'none'
      
      // Show logout links and notification settings
      if (logoutLink) logoutLink.style.display = 'block'
      if (logoutDrawerLink) logoutDrawerLink.style.display = 'block'
      if (notificationSettings) notificationSettings.style.display = 'block'
      if (desktopNotificationToggle) desktopNotificationToggle.style.display = 'flex'
      
      // Update notification toggle state
      this.updateNotificationToggle()
    } else {
      // Show login/register links
      if (loginLink) loginLink.style.display = 'block'
      if (registerLink) registerLink.style.display = 'block'
      if (loginDrawerLink) loginDrawerLink.style.display = 'block'
      if (registerDrawerLink) registerDrawerLink.style.display = 'block'
      
      // Hide logout links and notification settings
      if (logoutLink) logoutLink.style.display = 'none'
      if (logoutDrawerLink) logoutDrawerLink.style.display = 'none'
      if (notificationSettings) notificationSettings.style.display = 'none'
      if (desktopNotificationToggle) desktopNotificationToggle.style.display = 'none'
    }
  }

  setupLogoutHandlers() {
    const logoutLink = document.getElementById('logout-link')
    const logoutDrawerLink = document.getElementById('logout-drawer-link')

    const handleLogout = async (event) => {
      event.preventDefault()
      
      const result = await Swal.fire({
        title: 'Logout',
        text: 'Are you sure you want to logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, logout',
        cancelButtonText: 'Cancel',
        background: '#121212',
        color: '#e0e0e0',
        confirmButtonColor: '#5865f2',
        cancelButtonColor: '#f04747'
      })

      if (result.isConfirmed) {
        // Clear user data
        localStorage.removeItem('token')
        localStorage.removeItem('userName')
        
        // Update navigation
        this.updateNavigationForAuth()
        
        // Show success message
        await Swal.fire({
          title: 'Logged Out',
          text: 'You have successfully logged out.',
          icon: 'success',
          background: '#121212',
          color: '#e0e0e0',
          confirmButtonText: 'OK',
          confirmButtonColor: '#5865f2'
        })
        
        // Redirect to login page
        window.location.hash = '#/login'
      }
    }

    if (logoutLink) {
      logoutLink.addEventListener('click', handleLogout)
    }
    
    if (logoutDrawerLink) {
      logoutDrawerLink.addEventListener('click', handleLogout)
    }
  }

  async setupNotificationToggle() {
    // Mobile drawer toggle button
    const mobileToggleBtn = document.getElementById('toggle-notifications')
    
    // Desktop navigation toggle button
    const desktopToggleBtn = document.getElementById('desktop-toggle-notifications')

    const handleNotificationToggle = async () => {
      const isActive = await PushNotification.isNotificationActive()
      
      if (isActive) {
        // Unsubscribe from notifications
        const result = await Swal.fire({
          title: 'Disable Notifications?',
          text: 'You will no longer receive push notifications',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, disable',
          cancelButtonText: 'Cancel',
          background: '#121212',
          color: '#e0e0e0',
          confirmButtonColor: '#f04747',
          cancelButtonColor: '#5865f2'
        })

        if (result.isConfirmed) {
          try {
            const unsubscribeResult = await PushNotification.unsubscribe()
            if (unsubscribeResult.success) {
              await Swal.fire({
                title: 'Notifications Disabled',
                text: 'You have successfully unsubscribed from push notifications',
                icon: 'success',
                background: '#121212',
                color: '#e0e0e0',
                confirmButtonText: 'OK',
                confirmButtonColor: '#5865f2'
              })
              this.updateNotificationToggle()
            } else {
              throw new Error(unsubscribeResult.message)
            }
          } catch (error) {
            await Swal.fire({
              title: 'Error',
              text: `Failed to disable notifications: ${error.message}`,
              icon: 'error',
              background: '#121212',
              color: '#e0e0e0',
              confirmButtonText: 'OK',
              confirmButtonColor: '#f04747'
            })
          }
        }
      } else {
        // Subscribe to notifications
        try {
          const subscriptionResult = await PushNotification.subscribe()
          if (subscriptionResult.success) {
            await Swal.fire({
              title: 'Notifications Enabled',
              text: 'You will now receive push notifications',
              icon: 'success',
              background: '#121212',
              color: '#e0e0e0',
              confirmButtonText: 'OK',
              confirmButtonColor: '#5865f2'
            })
            this.updateNotificationToggle()
          } else {
            throw new Error(subscriptionResult.message)
          }
        } catch (error) {
          await Swal.fire({
            title: 'Error',
            text: `Failed to enable notifications: ${error.message}`,
            icon: 'error',
            background: '#121212',
            color: '#e0e0e0',
            confirmButtonText: 'OK',
            confirmButtonColor: '#f04747'
          })
        }
      }
    }

    // Add event listeners to both buttons
    if (mobileToggleBtn) {
      mobileToggleBtn.addEventListener('click', handleNotificationToggle)
    }
    
    if (desktopToggleBtn) {
      desktopToggleBtn.addEventListener('click', handleNotificationToggle)
    }
  }

  async updateNotificationToggle() {
    // Mobile drawer toggle
    const toggleBtn = document.getElementById('toggle-notifications')
    const statusSpan = document.getElementById('notification-status')
    
    // Desktop navigation toggle
    const desktopStatusSpan = document.getElementById('desktop-notification-status')

    try {
      const isActive = await PushNotification.isNotificationActive()
      
      // Update mobile toggle
      if (toggleBtn && statusSpan) {
        if (isActive) {
          statusSpan.textContent = 'Disable'
          toggleBtn.classList.add('unsubscribe')
          toggleBtn.classList.remove('subscribe')
        } else {
          statusSpan.textContent = 'Enable'
          toggleBtn.classList.add('subscribe')
          toggleBtn.classList.remove('unsubscribe')
        }
      }
      
      // Update desktop toggle
      if (desktopStatusSpan) {
        desktopStatusSpan.textContent = isActive ? 'Disable' : 'Enable'
      }
    } catch (error) {
      console.error('Error updating notification toggle:', error)
      if (statusSpan) statusSpan.textContent = 'Error'
      if (desktopStatusSpan) desktopStatusSpan.textContent = 'Error'
    }
  }

  // Call this method when user logs in
  onUserLogin() {
    this.updateNavigationForAuth()
  }

  // Call this method when user logs out
  onUserLogout() {
    this.updateNavigationForAuth()
  }
}

const navigationManager = new NavigationManager()
export default navigationManager
