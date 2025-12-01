import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001'
);

// Create axios instance with auth interceptor
const authAxios = axios.create({
  baseURL: API_BASE_URL
});

// Add token to all requests
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses (auto logout)
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const authApi = {
  // Register new user
  register: async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await authAxios.get('/api/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get profile' };
    }
  },

  // Update password
  updatePassword: async (currentPassword, newPassword) => {
    try {
      const response = await authAxios.put('/api/auth/password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update password' };
    }
  },

  // Update profile
  updateProfile: async (name) => {
    try {
      const response = await authAxios.put('/api/auth/profile', { name });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  // Admin: Get all users
  getUsers: async (page = 1, limit = 20, search = '', role = '') => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (role) params.append('role', role);

      const response = await authAxios.get(`/api/users?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get users' };
    }
  },

  // Admin: Get user stats
  getUserStats: async () => {
    try {
      const response = await authAxios.get('/api/users/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user stats' };
    }
  },

  // Admin: Get user by ID
  getUser: async (userId) => {
    try {
      const response = await authAxios.get(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user' };
    }
  },

  // Admin: Update user role
  updateUserRole: async (userId, role) => {
    try {
      const response = await authAxios.put(`/api/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update user role' };
    }
  },

  // Admin: Delete user
  deleteUser: async (userId) => {
    try {
      const response = await authAxios.delete(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete user' };
    }
  },

  // Admin: Create user
  createUser: async (name, email, password, role) => {
    try {
      const response = await authAxios.post('/api/users', {
        name,
        email,
        password,
        role
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create user' };
    }
  }
};

// Export the authenticated axios instance for use in other services
export { authAxios };
export default authApi;
