import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';
import ScrollToTop from './components/ScrollToTop';
import { LoginPromptProvider } from './context/LoginPromptContext';
import LoginPromptModal from './components/LoginPromptModal';

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
import BecomeSeller from './pages/BecomeSeller';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminSellerApplications from './pages/admin/AdminSellerApplications';
import AdminSellerProducts from './pages/admin/AdminSellerProducts';

// Seller Pages
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerOrders from './pages/seller/SellerOrders';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <LoginPromptProvider>
            <CartProvider>
              <WishlistProvider>
              <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
                {/* Top Navigation */}
                <Navbar />

                {/* Global Login Prompt Modal */}
                <LoginPromptModal />

              {/* Main Content Area */}
              <main className="flex-grow">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Public checkout and tracking */}
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
                  <Route path="/order-tracking" element={<OrderTracking />} />
                  <Route path="/order-tracking/:id" element={<OrderTracking />} />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/become-seller"
                    element={
                      <ProtectedRoute>
                        <BecomeSeller />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Protected routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminProducts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminCategories />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/orders"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminOrders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/customers"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminCustomers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/seller-applications"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminSellerApplications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/seller-products"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminSellerProducts />
                      </ProtectedRoute>
                    }
                  />

                  {/* Seller Protected routes */}
                  <Route
                    path="/seller/dashboard"
                    element={
                      <ProtectedRoute sellerOnly={true}>
                        <SellerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/seller/orders"
                    element={
                      <ProtectedRoute sellerOnly={true}>
                        <SellerOrders />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
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
