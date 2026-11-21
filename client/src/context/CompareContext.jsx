import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from './ToastContext';
import {
  loadSelection,
  saveSelection,
  toggleItem,
  removeItem,
  clearItems,
  hasItem
} from '../utils/compareSelection';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const { showToast } = useToast() || {};
  const [items, setItems] = useState(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return loadSelection(window.sessionStorage);
    }
    return [];
  });

  // Sync to sessionStorage on update
  const persistItems = useCallback((nextItems) => {
    setItems(nextItems);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      saveSelection(nextItems, window.sessionStorage);
    }
  }, []);

  const toggle = useCallback((product) => {
    setItems((current) => {
      const result = toggleItem(current, product);
      if (result.limitReached) {
        if (showToast) {
          showToast('You can compare up to 3 products', 'info');
        }
        return current;
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        saveSelection(result.items, window.sessionStorage);
      }
      return result.items;
    });
  }, [showToast]);

  const remove = useCallback((id) => {
    setItems((current) => {
      const next = removeItem(current, id);
      if (typeof window !== 'undefined' && window.sessionStorage) {
        saveSelection(next, window.sessionStorage);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      saveSelection([], window.sessionStorage);
    }
  }, []);

  const has = useCallback((id) => {
    return hasItem(items, id);
  }, [items]);

  const value = {
    items,
    count: items.length,
    toggle,
    remove,
    clear,
    has
  };

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    return {
      items: [],
      count: 0,
      toggle: () => {},
      remove: () => {},
      clear: () => {},
      has: () => false
    };
  }
  return context;
};

export default CompareContext;
