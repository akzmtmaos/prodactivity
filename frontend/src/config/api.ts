// API Configuration
// This file provides the base API URL for all API calls

export const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://192.168.68.162:8000';
export const API_URL = `${API_BASE_URL}/api`;

// For backward compatibility
export default API_URL;

