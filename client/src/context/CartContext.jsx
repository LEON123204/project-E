import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';
import {
  isValid24HexId,
  sanitizeCartItem,
  sanitizeCartItems,
  parseGuestCart
} from '../utils/cartSanitize';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch or initialize cart
  useEffect(() => {
    const syncCart = async () => {
      setLoading(true);
      if (isAuthenticated) {
        try {
          // If transitioning from guest to logged in, merge local storage cart
          const localCartStr = localStorage.getItem('guest_cart');
          const localCart = parseGuestCart(localCartStr);

          if (localCart.length > 0) {
            const response = await api.post('/cart', { guestItems: localCart });
            setCartItems(response.data.cart.items);
            localStorage.removeItem('guest_cart');
          } else {
            const response = await api.get('/cart');
            setCartItems(response.data.cart.items);
          }
        } catch (error) {
          console.error('Failed to sync database cart:', error.message);
        }
      } else {
        // Load guest cart from local storage safely
        const localCartStr = localStorage.getItem('guest_cart');
        const sanitized = parseGuestCart(localCartStr);
        setCartItems(sanitized);
        // Self-heal storage if it held malformed JSON or invalid items
        if (localCartStr) {
          localStorage.setItem('guest_cart', JSON.stringify(sanitized));
        }
      }
      setLoading(false);
    };

    // Trigger sync whenever authentication status changes or on mount
    syncCart();
  }, [isAuthenticated]);

  // Save guest cart changes to localStorage
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const sanitized = sanitizeCartItems(cartItems);
      localStorage.setItem('guest_cart', JSON.stringify(sanitized));
    }
  }, [cartItems, isAuthenticated, loading]);

  const addToCart = async (product, quantity = 1) => {
    if (!product || typeof product !== 'object') {
      return { success: false, message: 'Invalid product' };
    }

    const prodId = product._id || product.id;
    if (!isValid24HexId(prodId)) {
      return { success: false, message: 'Valid Product ID is required' };
    }

    // If the logged-in user is the owning seller, reject immediately and never call the API
    const sellerId = product.sellerId?._id || product.sellerId;
    if (product.isOwnListing || (user && sellerId && sellerId.toString() === user._id.toString())) {
      return { success: false, message: 'You cannot purchase your own product' };
    }

    if (isAuthenticated) {
      try {
        const response = await api.post('/cart', {
          productId: prodId,
          quantity
        });
        setCartItems(response.data.cart.items);
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to add to database cart';
        return { success: false, message };
      }
    } else {
      // Local storage cart addition
      const sanitized = sanitizeCartItem({ product, quantity });
      if (!sanitized) {
        return { success: false, message: 'Invalid product data' };
      }

      if (sanitized.product.stock === 0) {
        return { success: false, message: 'Item is out of stock' };
      }

      const existingItemIndex = cartItems.findIndex(
        item => item.product?._id === sanitized.product._id
      );

      let updatedItems = [...cartItems];
      if (existingItemIndex > -1) {
        const currentQty = updatedItems[existingItemIndex].quantity;
        const newQty = currentQty + sanitized.quantity;
        if (newQty > sanitized.product.stock) {
          return { success: false, message: `Only ${sanitized.product.stock} items are in stock.` };
        }
        updatedItems[existingItemIndex].quantity = newQty;
      } else {
        updatedItems.push(sanitized);
      }
      const finalItems = sanitizeCartItems(updatedItems);
      setCartItems(finalItems);
      return { success: true };
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) return;

    if (isAuthenticated) {
      try {
        const response = await api.put(`/cart/${productId}`, { quantity });
        setCartItems(response.data.cart.items);
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to update quantity';
        return { success: false, message };
      }
    } else {
      // Local cart update
      const updatedItems = cartItems.map(item => {
        if (item.product?._id === productId) {
          const maxStock = item.product?.stock ?? 99;
          if (quantity > maxStock) {
            return item; // Don't change if stock exceeded
          }
          return { ...item, quantity };
        }
        return item;
      });
      setCartItems(sanitizeCartItems(updatedItems));
      return { success: true };
    }
  };

  const removeFromCart = async (productId) => {
    if (isAuthenticated) {
      try {
        const response = await api.delete(`/cart/${productId}`);
        setCartItems(response.data.cart.items);
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to remove from cart';
        return { success: false, message };
      }
    } else {
      // Local cart remove
      const updatedItems = cartItems.filter(item => item.product?._id !== productId);
      setCartItems(sanitizeCartItems(updatedItems));
      return { success: true };
    }
  };

  const clearCart = () => {
    setCartItems([]);
    if (!isAuthenticated) {
      localStorage.removeItem('guest_cart');
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (Number(item.product?.price) || 0) * (Number(item.quantity) || 0), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
