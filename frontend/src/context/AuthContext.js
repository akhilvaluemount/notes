import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import authApi from '../services/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  };

  // Load user from token on app start
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        return;
      }

      // Get fresh user data from server
      const response = await authApi.getProfile();
      if (response.success) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login function
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await authApi.login(email, password);

      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        return { success: true };
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    setError(null);
    try {
      const response = await authApi.register(name, email, password);

      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        return { success: true };
      }
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  };

  // Update user profile
  const updateProfile = async (name) => {
    try {
      const response = await authApi.updateProfile(name);
      if (response.success) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authApi.updatePassword(currentPassword, newPassword);
      return { success: response.success };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  // Check if user has premium access (admin or premium)
  const hasPremiumAccess = user?.role === 'admin' || user?.role === 'premium';

  // Check if user has exam access (admin, premium, or exam)
  const hasExamAccess = user?.role === 'admin' || user?.role === 'premium' || user?.role === 'exam';

  // Check if user is exam-only (can only access exams, not regular interviews)
  const isExamOnlyUser = user?.role === 'exam';

  // Get AI limit info
  const getAILimit = () => {
    if (!user) return { remaining: 0, limit: 0 };
    if (user.role === 'admin' || user.role === 'premium' || user.role === 'exam') {
      return { remaining: -1, limit: -1 }; // Unlimited
    }
    return user.aiLimit || { remaining: 20, limit: 20 };
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.success) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    isAuthenticated,
    hasRole,
    isAdmin,
    hasPremiumAccess,
    hasExamAccess,
    isExamOnlyUser,
    getAILimit,
    refreshUser,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
