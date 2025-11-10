"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { authAPI, notificationAPI } from "@/lib/api";
import { toast } from "react-toastify";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  refreshUser: async () => {},
  getUserInitials: () => "U",
  getDisplayName: () => "User",
  formatLastLogin: () => null,
});

const SESSION_CONFIG = {
  DURATION: 4 * 60 * 60 * 1000,
  WARNING_TIME: 5 * 60 * 1000,
  CHECK_INTERVAL: 60 * 1000,
};

// Token management
const tokenManager = {
  get: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  },

  set: (token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  },

  remove: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("session_start");
      localStorage.removeItem("fcm_token");
    }
  },
};

// User data management
const userManager = {
  get: () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("auth_user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  set: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
  },

  remove: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("session_start");
      localStorage.removeItem("fcm_token");
    }
  },
};

// Session management
const sessionManager = {
  start: () => {
    if (typeof window !== "undefined") {
      const now = Date.now();
      localStorage.setItem("session_start", now.toString());
      sessionStorage.setItem("session_active", "true");
    }
  },

  getStartTime: () => {
    if (typeof window !== "undefined") {
      const startTime = localStorage.getItem("session_start");
      return startTime ? parseInt(startTime) : null;
    }
    return null;
  },

  isExpired: () => {
    const startTime = sessionManager.getStartTime();
    if (!startTime) return true;

    const elapsed = Date.now() - startTime;
    return elapsed >= SESSION_CONFIG.DURATION;
  },

  getTimeRemaining: () => {
    const startTime = sessionManager.getStartTime();
    if (!startTime) return 0;

    const elapsed = Date.now() - startTime;
    const remaining = SESSION_CONFIG.DURATION - elapsed;
    return Math.max(0, remaining);
  },

  shouldShowWarning: () => {
    const remaining = sessionManager.getTimeRemaining();
    return remaining > 0 && remaining <= SESSION_CONFIG.WARNING_TIME;
  },

  clear: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("session_start");
      sessionStorage.removeItem("session_active");
    }
  },

  isNewSession: () => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("session_active");
    }
    return false;
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const sessionCheckIntervalRef = useRef(null);
  const warningToastIdRef = useRef(null);

  const deleteFCMToken = async () => {
    try {
      const fcmToken = localStorage.getItem("fcm_token");
      if (fcmToken) {
        await notificationAPI.deleteFCMToken(fcmToken);
        localStorage.removeItem("fcm_token");
      }
    } catch (error) {
      console.error("Failed to delete FCM token:", error);
    }
  };

  // ⏰ Check session validity
  const checkSession = useCallback(async () => {
    if (!tokenManager.get()) return;

    if (sessionManager.isExpired()) {
      await deleteFCMToken();

      if (warningToastIdRef.current) {
        toast.dismiss(warningToastIdRef.current);
      }

      toast.error("Sesi Anda telah berakhir. Silakan login kembali.", {
        autoClose: 5000,
      });

      tokenManager.remove();
      userManager.remove();
      sessionManager.clear();
      setUser(null);
      setShowSessionWarning(false);

      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    } else if (sessionManager.shouldShowWarning() && !showSessionWarning) {
      setShowSessionWarning(true);
      const remaining = Math.ceil(sessionManager.getTimeRemaining() / 60000);

      if (warningToastIdRef.current) {
        toast.dismiss(warningToastIdRef.current);
      }

      warningToastIdRef.current = toast.warning(
        `Sesi Anda akan berakhir dalam ${remaining} menit. Simpan pekerjaan Anda.`,
        {
          autoClose: false,
          closeButton: true,
        }
      );
    }
  }, [showSessionWarning]);

  useEffect(() => {
    if (user && tokenManager.get()) {
      checkSession();

      sessionCheckIntervalRef.current = setInterval(
        checkSession,
        SESSION_CONFIG.CHECK_INTERVAL
      );

      return () => {
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
        }
      };
    }
  }, [user, checkSession]);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      const token = tokenManager.get();
      const savedUser = userManager.get();

      const isNewSession = sessionManager.isNewSession();

      if (isNewSession) {
        localStorage.removeItem("currentPage");
      }

      if (token && savedUser) {
        if (sessionManager.isExpired()) {
          await deleteFCMToken();
          tokenManager.remove();
          userManager.remove();
          sessionManager.clear();
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const response = await authAPI.me();
          setUser(response.data);
          userManager.set(response.data);

          sessionManager.start();
        } catch (error) {
          await deleteFCMToken();
          tokenManager.remove();
          userManager.remove();
          sessionManager.clear();
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);

      if (response.success && response.data) {
        const { token, user: userData } = response.data;

        tokenManager.set(token);
        userManager.set(userData);
        sessionManager.start();
        setUser(userData);
        localStorage.removeItem("currentPage");

        if (typeof window !== "undefined") {
          window.location.replace("/");
        }

        return response;
      }

      throw new Error(response.message || "Login failed");
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);

    if (warningToastIdRef.current) {
      toast.dismiss(warningToastIdRef.current);
    }

    try {
      await deleteFCMToken();

      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenManager.remove();
      userManager.remove();
      sessionManager.clear();
      setUser(null);
      setShowSessionWarning(false);
      setLoading(false);

      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }

      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (tokenManager.get()) {
      try {
        const response = await authAPI.me();
        if (response.success && response.data) {
          setUser(response.data);
          userManager.set(response.data);
          return response.data;
        }
      } catch (error) {
        console.error("User refresh failed:", error);
        await logout();
        throw error;
      }
    }
  }, [logout]);

  const getUserInitials = useCallback(() => {
    if (!user?.username) return "U";
    return user.username.substring(0, 2).toUpperCase();
  }, [user]);

  const getDisplayName = useCallback(() => {
    return user?.username || "User";
  }, [user]);

  const formatLastLogin = useCallback(() => {
    if (!user?.last_login_at) return null;

    const date = new Date(user.last_login_at);
    return date.toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [user]);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated:
      !!user && !!tokenManager.get() && !sessionManager.isExpired(),
    getUserInitials,
    getDisplayName,
    formatLastLogin,
    sessionExpiring: showSessionWarning,
    timeRemaining: sessionManager.getTimeRemaining(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default AuthContext;
