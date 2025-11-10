import { authAPI } from "./api";

export const tokenManager = {
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
    }
  },
};

export const userManager = {
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
      localStorage.removeItem("auth_user");
    }
  },
};

export const auth = {
  login: async (credentials) => {
    try {
      const response = await authAPI.login(credentials);

      if (response.success && response.data) {
        const { token, user } = response.data;

        tokenManager.set(token);
        userManager.set(user);

        return {
          success: true,
          data: response.data,
          message: response.message,
        };
      }

      throw new Error(response.message || "Login gagal");
    } catch (error) {
      throw {
        success: false,
        message: error.message || "Username atau password salah",
        errors: error.errors || null,
      };
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenManager.remove();
      userManager.remove();
    }
  },

  isAuthenticated: () => {
    return !!tokenManager.get();
  },

  getCurrentUser: () => {
    return userManager.get();
  },

  verifyToken: async () => {
    try {
      const response = await authAPI.me();
      if (response.success && response.data) {
        userManager.set(response.data);
        return response.data;
      }
      throw new Error("Token verification failed");
    } catch (error) {
      tokenManager.remove();
      userManager.remove();
      throw error;
    }
  },
};

export const authHelpers = {
  hasRole: (role) => {
    const user = userManager.get();
    return user?.role === role;
  },

  getUserInitials: () => {
    const user = userManager.get();
    if (!user?.username) return "U";
    return user.username.substring(0, 2).toUpperCase();
  },

  getDisplayName: () => {
    const user = userManager.get();
    return user?.username || "User";
  },

  formatLastLogin: () => {
    const user = userManager.get();
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
  },
};
