import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Info */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <img src="/favicon.svg" alt="Cartex Logo" className="h-5 w-auto group-hover:scale-110 transition-transform duration-200" />
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Cartex
              </span>
            </Link>
            <p className="text-slate-500 leading-relaxed">
              Premium hardware, lifestyle accessories, and apparel for technology enthusiasts and creators.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4 tracking-wider uppercase text-xs">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-indigo-400 transition-smooth">Home Page</Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-indigo-400 transition-smooth">Browse Shop</Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-indigo-400 transition-smooth">My Cart</Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:text-indigo-400 transition-smooth">My Wishlist</Link>
              </li>
            </ul>
          </div>

          {/* Categories Shortcuts */}
          <div>
            <h3 className="text-slate-100 font-semibold mb-4 tracking-wider uppercase text-xs">Featured Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shop?category=electronics" className="hover:text-indigo-400 transition-smooth">Electronics</Link>
              </li>
              <li>
                <Link to="/shop?category=fashion-apparel" className="hover:text-indigo-400 transition-smooth">Fashion & Apparel</Link>
              </li>
              <li>
                <Link to="/shop?category=accessories" className="hover:text-indigo-400 transition-smooth">Accessories</Link>
              </li>
              <li>
                <Link to="/shop?category=skincare" className="hover:text-indigo-400 transition-smooth">Skincare</Link>
              </li>
              <li>
                <Link to="/shop?category=car-bike-accessories" className="hover:text-indigo-400 transition-smooth">Car & Bike Accessories</Link>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-slate-900 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <p>© {currentYear} Cartex. All rights reserved. Built for quality and performance.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400">Privacy Policy</span>
            <span className="hover:text-slate-400">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
