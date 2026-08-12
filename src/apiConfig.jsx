// src/apiConfig.js
// const API_BASE_URL = "https://api.nemarph.com:81/api"; // Base URL for the API
const API_BASE_URL = "http://localhost:86/api"; // Base URL for the API
// This URL should be updated based on the environment (development, production, etc.)   

const API_ENDPOINTS = {
    //AUTHENTICATION
    login: `${API_BASE_URL}/dashBoard`,
    dashBoard: `${API_BASE_URL}/dashBoard`,

};

export default API_ENDPOINTS;
