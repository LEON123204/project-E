import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginPrompt } from '../context/LoginPromptContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus } from 'lucide-react';

const LoginPromptModal = () => {
  const { isOpen, config, closePrompt } = useLoginPrompt();
  const navigate = useNavigate();

  const handleSignIn = () => {
    closePrompt();
    navigate('/login', { state: { from: { pathname: config.redirectUrl } } });
  };

  const handleCreateAccount = () => {
    closePrompt();
    navigate('/register', { state: { from: { pathname: config.redirectUrl } } });
  };

  const handleGuest = () => {
    closePrompt();
    if (config.onGuest) {
      config.onGuest();
    } else {
      navigate(config.redirectUrl);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePrompt}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Close Button */}
            <button
              onClick={closePrompt}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-450 hover:text-slate-200 hover:bg-slate-800/50 transition-all outline-none"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div className="text-center space-y-4 mt-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <LogIn size={22} className="text-indigo-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-100 tracking-tight leading-none">
                  {config.title}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Join or sign in to save your wishlist items, manage orders, and unlock full checkout benefits.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleSignIn}
                className="w-full py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <LogIn size={16} />
                Sign In
              </button>

              <button
                onClick={handleCreateAccount}
                className="w-full py-3 font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-750 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <UserPlus size={16} />
                Create Account
              </button>

              {config.showGuestOption && (
                <button
                  onClick={handleGuest}
                  className="w-full py-2 font-semibold text-xs text-slate-500 hover:text-slate-350 transition-colors mt-1 hover:underline cursor-pointer"
                >
                  Continue as Guest
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginPromptModal;
