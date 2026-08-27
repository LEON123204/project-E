import React, { createContext, useContext, useState } from 'react';

const LoginPromptContext = createContext(null);

export const LoginPromptProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Sign in to continue',
    showGuestOption: false,
    onGuest: null,
    redirectUrl: '/',
  });

  const showPrompt = ({ title, showGuestOption = false, onGuest = null, redirectUrl = '/' }) => {
    setConfig({ title, showGuestOption, onGuest, redirectUrl });
    setIsOpen(true);
  };

  const closePrompt = () => {
    setIsOpen(false);
  };

  return (
    <LoginPromptContext.Provider value={{ isOpen, config, showPrompt, closePrompt }}>
      {children}
    </LoginPromptContext.Provider>
  );
};

export const useLoginPrompt = () => {
  const context = useContext(LoginPromptContext);
  if (!context) {
    throw new Error('useLoginPrompt must be used within a LoginPromptProvider');
  }
  return context;
};
