import React, { Component } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { COMPARE_STORAGE_KEY } from '../utils/compareSelection';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught a render error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Reset error state on navigation / key change
    if (this.state.hasError) {
      if (
        (this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) ||
        (this.props.location !== undefined && prevProps.location !== this.props.location)
      ) {
        this.setState({ hasError: false, error: null });
      }
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  handleResetCartAndGoHome = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clears ONLY the guest cart key and the compare selection key, never auth tokens
        window.localStorage.removeItem('guest_cart');
        window.localStorage.removeItem(COMPARE_STORAGE_KEY || 'cartex_compare_selection');
      }
    } catch (e) {
      console.error('Failed to clear cart/compare storage:', e);
    }
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-slate-950 text-slate-100">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Something went wrong</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                An unexpected error occurred while loading this page. You can reload the page or reset cart data and return home.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetCartAndGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Reset cart data and go home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
