const createAxiosInstance = () => {
  // If Vite's dev server proxy is active, we can use relative paths.
  // Otherwise fall back to VITE_API_URL
  const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    failedQueue = [];
  };

  // We will dynamically fetch the active access token. Since we store it in 
  // memory inside AuthContext, we can assign a helper function to retrieve it.
  let getAccessTokenFn = () => null;
  let setAccessTokenFn = () => null;

  const instance = {
    // expose configuration helpers
    registerTokenHandlers: (getHandler, setHandler) => {
      getAccessTokenFn = getHandler;
      setAccessTokenFn = setHandler;
    }
  };

  // Create standard axios wrapper
  const axiosObj = {
    get: (url, config) => makeRequest('get', url, null, config),
    post: (url, data, config) => makeRequest('post', url, data, config),
    put: (url, data, config) => makeRequest('put', url, data, config),
    delete: (url, config) => makeRequest('delete', url, null, config),
    axiosInstance: null
  };

  // Delay actual imports to make sure axios is parsed
  return { axiosObj, instance };
};

// Simple custom fetch-like axios wrapper to avoid import sequence races
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // Crucial for cookie transmission
  headers: {
    'Content-Type': 'application/json'
  }
});

let activeToken = null;
let tokenRefreshPromise = null;

export const setLocalAccessToken = (token) => {
  activeToken = token;
};

export const getLocalAccessToken = () => activeToken;

// Request Interceptor: Attach token if exists
api.interceptors.request.use(
  (config) => {
    if (activeToken) {
      config.headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401, not already retried, and is not a login request
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      // Handle multiple simultaneous 401s by queuing/sharing the refresh promise
      if (!tokenRefreshPromise) {
        tokenRefreshPromise = api.post('/auth/refresh')
          .then(res => {
            const token = res.data.accessToken;
            setLocalAccessToken(token);
            tokenRefreshPromise = null;
            return token;
          })
          .catch(err => {
            setLocalAccessToken(null);
            tokenRefreshPromise = null;
            return Promise.reject(err);
          });
      }

      try {
        const token = await tokenRefreshPromise;
        // Update auth header and retry request
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, let context handle redirecting to login
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
