import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

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

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
              {/* Top Navigation */}
              <Navbar />

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
                </Routes>
              </main>

              {/* Bottom Navigation */}
              <Footer />
            </div>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
