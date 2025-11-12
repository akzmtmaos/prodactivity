// API Configuration
// This file provides the base API URL for all API calls

const resolveDefaultBaseUrl = (): string => {
  if (process.env.REACT_APP_API_URL) {
    console.log('🌐 Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined') {
    // Use window.location properties directly - they preserve the actual IP address
    const protocol = window.location.protocol;
    const hostname = window.location.hostname; // This preserves IP addresses like 192.168.254.102
    const port = window.location.port;
    
    console.log('🌐 Inside resolveDefaultBaseUrl:');
    console.log('  - protocol:', protocol);
    console.log('  - hostname:', hostname);
    console.log('  - port:', port);
    
    // When running the React dev server (usually port 3000), target the Django port (8000).
    // Otherwise reuse the current port.
    const targetPort = port === '3000' || port === '' ? '8000' : port;
    
    const apiUrl = `${protocol}//${hostname}${targetPort ? `:${targetPort}` : ''}/api`;
    console.log('  - Resolved API URL:', apiUrl);
    
    return apiUrl;
  }

  console.log('🌐 No window object, using localhost fallback');
  return 'http://localhost:8000/api';
};

// Make it a getter function so it's evaluated fresh each time
export const getApiBaseUrl = () => resolveDefaultBaseUrl();

// For backward compatibility, export as constant (but it will be evaluated at module load)
export const API_BASE_URL = resolveDefaultBaseUrl();
export const API_URL = API_BASE_URL;

// Log the resolved API URL for debugging
if (typeof window !== 'undefined') {
  console.log('🌐 API_BASE_URL resolved to:', API_BASE_URL);
  console.log('🌐 Current window.location.href:', window.location.href);
  console.log('🌐 window.location.hostname:', window.location.hostname);
  console.log('🌐 window.location.host:', window.location.host);
  console.log('🌐 window.location.origin:', window.location.origin);
}

// For backward compatibility
export default API_URL;

