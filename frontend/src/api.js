import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized — clear session and redirect to login
// EXCEPT for auth endpoints (signin/signup) where 401 means bad credentials, not expired session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/signin') || url.includes('/auth/signup');
      if (!isAuthEndpoint) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Standardized error message extractor for backend responses
 */
export const getErrorMessage = (err, fallback = 'An unexpected error occurred. Please try again.') => {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  
  const data = err.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && data.errors[firstKey]) return data.errors[firstKey];
    }
    if (data.error && typeof data.error === 'string') return data.error;
  }

  if (err.message && typeof err.message === 'string' && !err.message.includes('Network Error')) {
    return err.message;
  }

  return fallback;
};

export default api;
