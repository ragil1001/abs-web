// src/lib/auth.js
import { authAPI } from './api';

// Token management
export const tokenManager = {
  get: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },
  
  set: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  },
  
  remove: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }
};

// User data management
export const userManager = {
  get: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
  
  set: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  },
  
  remove: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
    }
  }
};

// Authentication functions
export const auth = {
  // Login function
  login: async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.success && response.data) {
        const { token, user } = response.data;
        
        // Store token and user data
        tokenManager.set(token);
        userManager.set(user);
        
        return {
          success: true,
          data: response.data,
          message: response.message
        };
      }
      
      throw new Error(response.message || 'Login gagal');
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Username atau password salah',
        errors: error.errors || null
      };
    }
  },
  
  // Logout function
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local data
      tokenManager.remove();
      userManager.remove();
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!tokenManager.get();
  },
  
  // Get current user
  getCurrentUser: () => {
    return userManager.get();
  },
  
  // Verify token with server
  verifyToken: async () => {
    try {
      const response = await authAPI.me();
      if (response.success && response.data) {
        userManager.set(response.data);
        return response.data;
      }
      throw new Error('Token verification failed');
    } catch (error) {
      tokenManager.remove();
      userManager.remove();
      throw error;
    }
  }
};

// Auth helpers
export const authHelpers = {
  // Check if user has specific role (for future use)
  hasRole: (role) => {
    const user = userManager.get();
    return user?.role === role;
  },
  
  // Get user initials for avatar
  getUserInitials: () => {
    const user = userManager.get();
    if (!user?.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  },
  
  // Get display name
  getDisplayName: () => {
    const user = userManager.get();
    return user?.username || 'User';
  },
  
  // Format last login time
  formatLastLogin: () => {
    const user = userManager.get();
    if (!user?.last_login_at) return null;
    
    const date = new Date(user.last_login_at);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};