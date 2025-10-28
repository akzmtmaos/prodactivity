// API Configuration
// This file provides the base API URL for all API calls

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
export const API_URL = API_BASE_URL;

// For backward compatibility
export default API_URL;

