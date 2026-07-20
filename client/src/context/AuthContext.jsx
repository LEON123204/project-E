import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setLocalAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check user session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Attempt silent refresh to get a fresh access token if refresh cookie is present
        const response = await api.post('/auth/refresh');
        const token = response.data.accessToken;
        setLocalAccessToken(token);
        
        // Fetch user profile info
        const profileResponse = await api.get('/auth/me');
        setUser(profileResponse.data.user);
      } catch (error) {
        // Session not active or expired, fail silently
        setUser(null);
        setLocalAccessToken(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, user: loggedUser } = response.data;
      
      setLocalAccessToken(accessToken);
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { accessToken, user: registeredUser } = response.data;
      
      setLocalAccessToken(accessToken);
      setUser(registeredUser);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error.message);
    } finally {
      setLocalAccessToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (name, email) => {
    try {
      const response = await api.put('/auth/profile', { name, email });
      setUser(prev => ({
        ...prev,
        name: response.data.user.name,
        email: response.data.user.email
      }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.put('/auth/profile/password', { currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      return { success: false, message };
    }
  };

  // Addresses handlers
  const addAddress = async (addressData) => {
    try {
      const response = await api.post('/auth/profile/addresses', addressData);
      setUser(prev => ({ ...prev, addresses: response.data.addresses }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add address';
      return { success: false, message };
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const response = await api.delete(`/auth/profile/addresses/${addressId}`);
      setUser(prev => ({ ...prev, addresses: response.data.addresses }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete address';
      return { success: false, message };
    }
  };

  const setDefaultAddress = async (addressId) => {
    try {
      const response = await api.put(`/auth/profile/addresses/${addressId}/default`);
      setUser(prev => ({ ...prev, addresses: response.data.addresses }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to set default address';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        addAddress,
        deleteAddress,
        setDefaultAddress,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
