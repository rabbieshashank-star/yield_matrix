const CONFIG = {
    // Dynamic backend URL based on host environment
    API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:5000'
        : 'https://roger95.pythonanywhere.com',
    // Gemini calls go through the Flask backend — no key needed here
    GEMINI_API_KEY: '',
    // Plant.ID is called directly from the browser (move to backend to fully hide it)
    PLANT_ID_API_KEY: '',
    WEATHER_API_KEY: '',
    DEFAULT_LOCATION: 'Mysore,IN',
    LANG: 'kn' // Default to Kannada
};