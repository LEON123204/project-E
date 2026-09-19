import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';
import { LoginPromptProvider } from './context/LoginPromptContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import ScrollToTop from './components/ScrollToTop';
import LoginPromptModal from './components/LoginPromptModal';
import AnimatedPage from './components/AnimatedPage';

// Customer Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import Login from './pages/Login';
import Register from './pages/Register';
import OrderTracking from './pages/OrderTracking';
import OrderConfirmation from './pages/OrderConfirmation';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
        <Route path="/shop" element={<AnimatedPage><Shop /></AnimatedPage>} />
        <Route path="/product/:id" element={<AnimatedPage><ProductDetail /></AnimatedPage>} />
        <Route path="/cart" element={<AnimatedPage><CartPage /></AnimatedPage>} />
        <Route path="/wishlist" element={<AnimatedPage><WishlistPage /></AnimatedPage>} />
        <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
        <Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />

        {/* Public checkout and tracking */}
        <Route path="/checkout" element={<AnimatedPage><CheckoutPage /></AnimatedPage>} />
        <Route path="/order-confirmation/:id" element={<AnimatedPage><OrderConfirmation /></AnimatedPage>} />
        <Route path="/order-tracking" element={<AnimatedPage><OrderTracking /></AnimatedPage>} />
        <Route path="/order-tracking/:id" element={<AnimatedPage><OrderTracking /></AnimatedPage>} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AnimatedPage><ProfilePage /></AnimatedPage>
            </ProtectedRoute>
          }
        />

        {/* Admin Protected routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnimatedPage><AdminDashboard /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnimatedPage><AdminProducts /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnimatedPage><AdminCategories /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnimatedPage><AdminOrders /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute adminOnly={true}>
              <AnimatedPage><AdminCustomers /></AnimatedPage>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <LoginPromptProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
                  {/* Top Navigation */}
                  <Navbar />

                  {/* Global Login Prompt Modal */}
                  <LoginPromptModal />

                  {/* Main Content Area */}
                  <main className="flex-grow flex flex-col">
                    <AnimatedRoutes />
                  </main>

                  {/* Bottom Navigation */}
                  <Footer />

                  {/* Floating AI Chat Assistant */}
                  <ChatWidget />
                </div>
              </WishlistProvider>
            </CartProvider>
          </LoginPromptProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
