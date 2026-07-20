import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Loader, KeyRound, Mail } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both email and password');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (!res.success) {
      setFormError(res.message);
    }
  };

  return (
    <div className="bg-slate-950 min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-850 p-8 sm:p-10 rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Welcome Back</h2>
          <p className="text-slate-450 text-xs">Sign in to your Cartex account to resume shopping</p>
        </div>

        {formError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2.5 items-start">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 pl-10 text-sm text-slate-100 outline-none transition-smooth"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Password</label>
                <span className="text-[10px] text-slate-550 hover:text-indigo-400 cursor-pointer transition-smooth">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">
                  <KeyRound size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 pl-10 pr-10 text-sm text-slate-100 outline-none transition-smooth"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-350 outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-600 text-white font-bold py-3 rounded-xl transition-smooth shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          New to Cartex?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-smooth">
            Create an Account
          </Link>
        </div>

        {/* Demo credentials box */}
        <div className="border border-slate-850 bg-slate-950/40 p-4 rounded-xl text-[11px] leading-relaxed text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">💡 College Demo Accounts:</p>
          <p>• <span className="font-medium text-slate-450">Customer:</span> customer@ecommerce.com / customerpassword</p>
          <p>• <span className="font-medium text-slate-450">Admin:</span> admin@ecommerce.com / adminpassword</p>
        </div>

      </div>
    </div>
  );
};

export default Login;
