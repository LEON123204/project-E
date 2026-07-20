import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { 
  ShoppingBag, 
  Heart, 
  User, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const activeLink = (path) => {
    return location.pathname === path
      ? 'text-indigo-400 font-semibold'
      : 'text-slate-300 hover:text-indigo-400 transition-smooth';
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/favicon.svg" alt="Cartex Logo" className="h-6 w-auto group-hover:scale-110 transition-transform duration-200" />
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cartex
              </span>
            </Link>
            {/* Desktop Menu */}
            <div className="hidden md:flex ml-10 space-x-8">
              <Link to="/" className={activeLink('/')}>Home</Link>
              <Link to="/shop" className={activeLink('/shop')}>Shop</Link>
              <Link to="/order-tracking" className={activeLink('/order-tracking')}>Track Order</Link>
            </div>
          </div>

          {/* Search bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-full py-1.5 pl-4 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition-smooth"
              />
              <button type="submit" className="absolute right-3 top-2 text-slate-500 hover:text-indigo-400">
                <Search size={18} />
              </button>
            </form>
          </div>

          {/* Action icons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Wishlist */}
            <Link to="/wishlist" className="relative p-2 text-slate-300 hover:text-red-400 transition-smooth">
              <Heart size={20} />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-slate-300 hover:text-indigo-400 transition-smooth">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Account / Dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition-smooth outline-none py-1"
                >
                  <User size={20} />
                  <span className="text-sm font-medium">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-400 hover:bg-slate-850 hover:text-indigo-300 transition-smooth"
                      >
                        <LayoutDashboard size={16} />
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-850 hover:text-indigo-400 transition-smooth"
                    >
                      <User size={16} />
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-slate-850 hover:text-rose-350 transition-smooth"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-smooth shadow-lg shadow-indigo-600/20"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden gap-3">
            {/* Search - Mobile Toggle (Takes to shop) */}
            <Link to="/shop" className="text-slate-300 hover:text-indigo-400 p-1">
              <Search size={20} />
            </Link>

            {/* Cart - Mobile */}
            <Link to="/cart" className="relative text-slate-300 hover:text-indigo-400 p-1">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-indigo-400 focus:outline-none p-1"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-900 py-4 px-4 space-y-3 animate-slideDown">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-indigo-400 text-base font-medium py-1.5 border-b border-slate-900"
          >
            Home
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-indigo-400 text-base font-medium py-1.5 border-b border-slate-900"
          >
            Shop
          </Link>
          <Link
            to="/order-tracking"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-indigo-400 text-base font-medium py-1.5 border-b border-slate-900"
          >
            Track Order
          </Link>
          <Link
            to="/wishlist"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-indigo-400 text-base font-medium py-1.5 border-b border-slate-900"
          >
            Wishlist ({wishlist.length})
          </Link>
          
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-indigo-400 hover:text-indigo-300 text-base font-medium py-1.5 border-b border-slate-900"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-300 hover:text-indigo-400 text-base font-medium py-1.5 border-b border-slate-900"
              >
                My Profile / Orders
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left text-rose-400 hover:text-rose-350 text-base font-medium py-1.5"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-sm font-medium transition-smooth"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
