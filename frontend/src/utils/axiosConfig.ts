import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

// Create axios instance with dynamic baseURL
// We'll update the baseURL in the request interceptor to ensure it's always current
const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(), // Use getter function for initial value
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const normalizeUrlPath = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      return parsed.pathname || '';
    } catch {
      return '';
    }
  }
  return url.startsWith('/') ? url : `/${url}`;
};

const isRetryableError = (error: any) => {
  if (error?.code === 'ECONNABORTED') return true;
  if (!error?.response) return true;
  return RETRYABLE_STATUS_CODES.has(error.response.status);
};

// Request interceptor to add auth token and ensure correct baseURL
axiosInstance.interceptors.request.use(
  (config) => {
    // Update baseURL dynamically to ensure it's always correct
    const currentApiUrl = getApiBaseUrl();
    if (config.baseURL !== currentApiUrl) {
      config.baseURL = currentApiUrl;
    }
    
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Adding auth token to request:', config.url, 'Token exists:', !!token);
    } else {
      console.warn('⚠️ No access token found in localStorage for request:', config.url);
    }

    // Automatically extend timeouts for heavier endpoints (e.g., notes CRUD) if not explicitly set
    if (config.timeout === undefined || config.timeout === null) {
      const method = (config.method || 'get').toLowerCase();
      const path = normalizeUrlPath(config.url);
      const isNotesEndpoint = path.startsWith('/notes');

      if (isNotesEndpoint) {
        const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
        config.timeout = isMutation ? 20000 : 15000;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network fallback: if request failed without response (timeout/DNS), try alternate base URLs once
    if (!error.response && !originalRequest._networkRetry) {
      try {
        originalRequest._networkRetry = true;
        const currentApiUrl = getApiBaseUrl();
        const alternates = [
          // Use current API URL first, then fallbacks
          currentApiUrl,
          (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000/api` : null),
          'http://127.0.0.1:8000/api',
          'http://localhost:8000/api'
        ].filter(Boolean) as string[];

        for (const alt of alternates) {
          try {
            const newInstance = axios.create({ baseURL: alt });
            // mirror headers (esp. Authorization)
            newInstance.defaults.headers.common = { ...(axiosInstance.defaults.headers.common || {}) };
            const token = localStorage.getItem('accessToken');
            if (token) newInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const res = await newInstance({ ...originalRequest, baseURL: alt });
            return res;
          } catch (e) {
            // try next
          }
        }
      } catch (_) {
        // ignore and proceed to normal handler
      }
    }

    const method = (originalRequest?.method || 'get').toLowerCase();

    if (originalRequest && isRetryableError(error)) {
      const defaultMaxRetries = method === 'get' ? 2 : 0;
      const maxRetries = typeof originalRequest._maxRetries === 'number'
        ? originalRequest._maxRetries
        : defaultMaxRetries;

      originalRequest._retryCount = originalRequest._retryCount || 0;

      if (originalRequest._retryCount < maxRetries) {
        originalRequest._retryCount += 1;
        const backoffDelay = Math.min(4000, 500 * (originalRequest._retryCount ** 2));
        await delay(backoffDelay);

        const currentTimeout = typeof originalRequest.timeout === 'number'
          ? originalRequest.timeout
          : axiosInstance.defaults.timeout;
        const extendedTimeout = Math.max(currentTimeout || 0, 10000 + 5000 * originalRequest._retryCount);
        originalRequest.timeout = extendedTimeout;

        return axiosInstance(originalRequest);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const currentApiUrl = getApiBaseUrl();
        const response = await axios.post(`${currentApiUrl}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Process queued requests
        processQueue(null, access);
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh token is invalid, redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

