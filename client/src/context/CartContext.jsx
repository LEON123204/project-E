import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CartContext = createContext(null);

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
          const localCart = localCartStr ? JSON.parse(localCartStr) : [];

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
        // Load guest cart from local storage
        const localCartStr = localStorage.getItem('guest_cart');
        setCartItems(localCartStr ? JSON.parse(localCartStr) : []);
      }
      setLoading(false);
    };

    // Trigger sync whenever authentication status changes or on mount
    syncCart();
  }, [isAuthenticated]);

  // Save guest cart changes to localStorage
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      localStorage.setItem('guest_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isAuthenticated, loading]);

  const addToCart = async (product, quantity = 1) => {
    if (isAuthenticated) {
      try {
        const response = await api.post('/cart', {
          productId: product._id,
          quantity
        });
        setCartItems(response.data.cart.items);
        return { success: true };
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to add to database cart';
        return { success: false, message };
      }
    } else {
      // Local storage cart addition
      const existingItemIndex = cartItems.findIndex(
        item => item.product._id === product._id
      );

      let updatedItems = [...cartItems];
      if (existingItemIndex > -1) {
        const newQty = updatedItems[existingItemIndex].quantity + quantity;
        if (newQty > product.stock) {
          return { success: false, message: `Only ${product.stock} items are in stock.` };
        }
        updatedItems[existingItemIndex].quantity = newQty;
      } else {
        if (product.stock === 0) {
          return { success: false, message: 'Item is out of stock' };
        }
        updatedItems.push({
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            images: product.images,
            stock: product.stock
          },
          quantity: Math.min(quantity, product.stock)
        });
      }
      setCartItems(updatedItems);
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
        const message = error.response?.data?.message || 'Failed to update quantity';
        return { success: false, message };
      }
    } else {
      // Local cart update
      const updatedItems = cartItems.map(item => {
        if (item.product._id === productId) {
          if (quantity > item.product.stock) {
            return item; // Don't change if stock exceeded
          }
          return { ...item, quantity };
        }
        return item;
      });
      setCartItems(updatedItems);
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
        const message = error.response?.data?.message || 'Failed to remove from cart';
        return { success: false, message };
      }
    } else {
      // Local cart remove
      const updatedItems = cartItems.filter(item => item.product._id !== productId);
      setCartItems(updatedItems);
      return { success: true };
    }
  };

  const clearCart = () => {
    setCartItems([]);
    if (!isAuthenticated) {
      localStorage.removeItem('guest_cart');
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);

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
