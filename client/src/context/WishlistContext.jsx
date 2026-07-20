import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!isAuthenticated) {
        setWishlist([]);
        return;
      }
      setLoading(true);
      try {
        const response = await api.get('/wishlist');
        setWishlist(response.data.wishlist);
      } catch (error) {
        console.error('Failed to fetch wishlist:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [isAuthenticated]);

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) {
      return { success: false, message: 'Please log in to save items to your wishlist' };
    }

    try {
      const response = await api.post(`/wishlist/${productId}`);
      const added = response.data.added;

      if (added) {
        // Fetch detailed product or optimistic add
        const productRes = await api.get(`/products/${productId}`);
        setWishlist(prev => [...prev, productRes.data.product]);
      } else {
        setWishlist(prev => prev.filter(item => item._id !== productId));
      }

      return { success: true, added };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to toggle wishlist';
      return { success: false, message };
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some(item => item._id === productId);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        toggleWishlist,
        isInWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
