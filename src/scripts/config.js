const CONFIG = {
  BASE_URL: 'https://story-api.dicoding.dev/v1',  // The correct API URL
  get TOKEN() {
    // Retrieve token from localStorage, if available
    const token = localStorage.getItem('token');
    console.log("Retrieved token:", token);  // Log token for debugging
    return token;
  },
};

export default CONFIG;
