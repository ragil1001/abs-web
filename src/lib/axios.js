// src/lib/axios.js
import axios from 'axios';

// 🚀 Simple in-memory cache with smart invalidation
const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced from 3)

// Track last data change timestamp
let lastDataChangeTimestamp = Date.now();

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 100000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 🚀 Check cache for GET requests (only for master data)
    if (config.method === 'get' && shouldCache(config.url)) {
      const cacheKey = generateCacheKey(config);
      const cached = cache.get(cacheKey);
      
      // Check if cache is still valid and no data changes occurred
      if (cached && 
          Date.now() - cached.timestamp < CACHE_DURATION &&
          cached.timestamp > lastDataChangeTimestamp) {
        config.adapter = () => {
          return Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (Cached)',
            headers: config.headers,
            config: config,
            request: {}
          });
        };
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // 🚀 Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
    if (['post', 'put', 'patch', 'delete'].includes(response.config.method)) {
      lastDataChangeTimestamp = Date.now();
      clearRelatedCache(response.config.url);
    }

    // 🚀 Cache successful GET responses for master data
    if (response.config.method === 'get' && shouldCache(response.config.url)) {
      const cacheKey = generateCacheKey(response.config);
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
    }

    return response;
  },
  (error) => {
    // Handle 401 unauthorized errors
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('currentPage');
        window.location.href = '/';
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        message: 'Koneksi ke server bermasalah. Silakan coba lagi.',
        type: 'network_error'
      });
    }

    // Handle validation errors (422)
    if (error.response.status === 422) {
      return Promise.reject({
        message: 'Data yang dimasukkan tidak valid.',
        errors: error.response.data.errors,
        type: 'validation_error'
      });
    }

    // Handle server errors (5xx)
    if (error.response.status >= 500) {
      return Promise.reject({
        message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
        type: 'server_error'
      });
    }

    return Promise.reject(error.response.data || error);
  }
);

// Helper functions
function shouldCache(url) {
  // Only cache master data endpoints
  const cacheableEndpoints = ['/divisis', '/jabatans'];
  return cacheableEndpoints.some(endpoint => url?.includes(endpoint));
}

function generateCacheKey(config) {
  return `${config.method}_${config.url}_${JSON.stringify(config.params || {})}`;
}

// Clear related cache based on URL
function clearRelatedCache(url) {
  if (!url) return;
  
  // Extract base endpoint
  const baseEndpoint = url.split('/').slice(0, 2).join('/');
  
  for (const [key] of cache.entries()) {
    if (key.includes(baseEndpoint)) {
      cache.delete(key);
    }
  }
  
  console.log('🗑️ Cache cleared for:', baseEndpoint);
}

// 🚀 Clear cache function
export function clearApiCache(url = null) {
  lastDataChangeTimestamp = Date.now();
  
  if (url) {
    clearRelatedCache(url);
  } else {
    cache.clear();
  }
  
  console.log('🗑️ API cache cleared:', url || 'all');
}

// 🚀 Force data refresh (invalidates all cache)
export function forceDataRefresh() {
  lastDataChangeTimestamp = Date.now();
  cache.clear();
  console.log('🔄 Forced data refresh - all cache invalidated');
}

// Clear expired cache entries
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION || value.timestamp < lastDataChangeTimestamp) {
      cache.delete(key);
    }
  }
}

// Auto-clear expired cache every minute
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCache, 60000);
}

export default api;