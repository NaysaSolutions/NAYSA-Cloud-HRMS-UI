// src/utils/axiosConfig.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Assuming your Laravel API is under /api
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add a response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response:', error.response);
      
      if (error.response.status === 401) {
        // Handle unauthorized access
      }
      
      if (error.response.status === 404) {
        // Handle not found
      }
      
      if (error.response.status >= 500) {
        // Handle server errors
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;