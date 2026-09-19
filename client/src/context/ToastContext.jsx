import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border font-sans ${
                toast.type === 'error'
                  ? 'bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                  : toast.type === 'info'
                  ? 'bg-slate-900/95 border-amber-500/40 text-amber-300 shadow-amber-950/40'
                  : 'bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'error' ? (
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                ) : toast.type === 'info' ? (
                  <Info className="h-5 w-5 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-semibold leading-tight text-slate-100">
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
