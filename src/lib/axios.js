import axios from "axios";

const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000;

let lastDataChangeTimestamp = Date.now();

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 100000,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.method === "get" && shouldCache(config.url)) {
      const cacheKey = generateCacheKey(config);
      const cached = cache.get(cacheKey);

      if (
        cached &&
        Date.now() - cached.timestamp < CACHE_DURATION &&
        cached.timestamp > lastDataChangeTimestamp
      ) {
        config.adapter = () => {
          return Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: "OK (Cached)",
            headers: config.headers,
            config: config,
            request: {},
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

api.interceptors.response.use(
  (response) => {
    if (["post", "put", "patch", "delete"].includes(response.config.method)) {
      lastDataChangeTimestamp = Date.now();
      clearRelatedCache(response.config.url);
    }

    if (response.config.method === "get" && shouldCache(response.config.url)) {
      const cacheKey = generateCacheKey(response.config);
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        localStorage.removeItem("currentPage");
        window.location.href = "/";
      }
    }

    if (!error.response) {
      console.error("Network Error:", error.message);
      return Promise.reject({
        message: "Koneksi ke server bermasalah. Silakan coba lagi.",
        type: "network_error",
      });
    }

    if (error.response.status === 422) {
      return Promise.reject({
        message: "Data yang dimasukkan tidak valid.",
        errors: error.response.data.errors,
        type: "validation_error",
      });
    }

    if (error.response.status >= 500) {
      return Promise.reject({
        message: "Terjadi kesalahan pada server. Silakan coba lagi.",
        type: "server_error",
      });
    }

    return Promise.reject(error.response.data || error);
  }
);

function shouldCache(url) {
  const cacheableEndpoints = ["/divisis", "/jabatans"];
  return cacheableEndpoints.some((endpoint) => url?.includes(endpoint));
}

function generateCacheKey(config) {
  return `${config.method}_${config.url}_${JSON.stringify(
    config.params || {}
  )}`;
}

// Clear related cache based on URL
function clearRelatedCache(url) {
  if (!url) return;

  const baseEndpoint = url.split("/").slice(0, 2).join("/");

  for (const [key] of cache.entries()) {
    if (key.includes(baseEndpoint)) {
      cache.delete(key);
    }
  }
}

// Clear cache function
export function clearApiCache(url = null) {
  lastDataChangeTimestamp = Date.now();

  if (url) {
    clearRelatedCache(url);
  } else {
    cache.clear();
  }
}

// Force data refresh (invalidates all cache)
export function forceDataRefresh() {
  lastDataChangeTimestamp = Date.now();
  cache.clear();
  console.log("🔄 Forced data refresh - all cache invalidated");
}

// Clear expired cache entries
export function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (
      now - value.timestamp > CACHE_DURATION ||
      value.timestamp < lastDataChangeTimestamp
    ) {
      cache.delete(key);
    }
  }
}

// Auto-clear expired cache every minute
if (typeof window !== "undefined") {
  setInterval(clearExpiredCache, 60000);
}

export default api;
