import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';

// Stripe imports
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, Check, CreditCard, MapPin, Plus, Loader, Zap } from 'lucide-react';

// Initialize Stripe outside components to avoid recreating
const isStripeActive = () => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  return key && !key.startsWith('pk_test_placeholder');
};

let stripePromise = null;
if (isStripeActive()) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
}

// Internal Stripe Checkout Form Component
const StripeCheckoutForm = ({ shippingAddress, guestInfo, onPaymentSuccess, totalAmount, items, isBuyNow }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Create order on backend to get order ID and clientSecret
      const orderRes = await api.post('/orders', {
        items: items.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        shippingAddress,
        guestEmail: guestInfo?.email,
        guestName: guestInfo?.name,
        isBuyNow
      });

      const { order, clientSecret } = orderRes.data;

      // 2. Confirm card payment with Stripe
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: shippingAddress.name || guestInfo?.name || 'Customer'
          }
        }
      });

      if (result.error) {
        setErrorMessage(result.error.message);
        setLoading(false);
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          // 3. Confirm payment on backend
          await onPaymentSuccess(order._id, result.paymentIntent.id);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs text-slate-400 uppercase font-semibold">Card Details (Stripe Test Mode)</label>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '14px',
                  color: '#f8fafc',
                  fontFamily: 'Inter, sans-serif',
                  '::placeholder': {
                    color: '#64748b',
                  },
                },
                invalid: {
                  color: '#f87171',
                },
              },
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl transition-smooth shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader size={18} className="animate-spin" />
            Processing Stripe Payment...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Pay & Place Order (₹{totalAmount.toFixed(2)})
          </>
        )}
      </button>
      <p className="text-[10px] text-slate-500 text-center">
        🔒 Encrypted, secure Stripe checkout. Use card 4242 4242 4242 4242 for testing.
      </p>
    </form>
  );
};

// Internal Mock Checkout Component
const MockCheckoutForm = ({ shippingAddress, guestInfo, onPaymentSuccess, totalAmount, items, isBuyNow }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleMockCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Create order on backend
      const orderRes = await api.post('/orders', {
        items: items.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        shippingAddress,
        guestEmail: guestInfo?.email,
        guestName: guestInfo?.name,
        isBuyNow
      });

      const { order } = orderRes.data;

      // 2. Immediately confirm payment with mock reference
      const mockPI = 'mock_pi_' + Date.now();
      await onPaymentSuccess(order._id, mockPI);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs space-y-1">
        <p className="font-semibold">⚠️ Stripe Sandbox Keys Not Configured</p>
        <p className="leading-relaxed">The server is running in test fallback. You can place a mock order below without actual Stripe validation.</p>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        onClick={handleMockCheckout}
        disabled={loading}
        className="w-full bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl transition-smooth shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader size={18} className="animate-spin" />
            Creating Order...
          </>
        ) : (
          <>
            <Check size={18} />
            Place Order - Mock Payment (₹{totalAmount.toFixed(2)})
          </>
        )}
      </button>
    </div>
  );
};

// Main CheckoutPage Component
const CheckoutPage = () => {
  const { user, addAddress, isAuthenticated } = useAuth();
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const isBuyNow = new URLSearchParams(location.search).get('mode') === 'buynow';

  const [buyNowData] = useState(() => {
    try {
      const stored = sessionStorage.getItem('buyNowItem');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  // Effective items & totals depending on mode
  const checkoutItems = (isBuyNow && buyNowData)
    ? [{ product: buyNowData.product, quantity: buyNowData.quantity }]
    : cartItems;

  const checkoutSubtotal = (isBuyNow && buyNowData)
    ? ((buyNowData.product?.price || 0) * buyNowData.quantity)
    : cartTotal;

  // Guest State
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [readyForPayment, setReadyForPayment] = useState(false);

  // Address States
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  
  // Address Form Fields
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');

  // Cart pricing totals
  const shippingCost = checkoutSubtotal > 1000 ? 0 : 99.00;
  const estimatedTax = checkoutSubtotal * 0.08;
  const finalTotal = checkoutSubtotal + shippingCost + estimatedTax;

  useEffect(() => {
    if (isBuyNow) {
      if (!buyNowData) {
        navigate('/shop');
      }
    } else {
      if (cartItems.length === 0) {
        navigate('/cart');
      }
    }
  }, [isBuyNow, buyNowData, cartItems, navigate]);

  // Set default address pre-selected if available
  useEffect(() => {
    if (user?.addresses?.length > 0) {
      const defaultIdx = user.addresses.findIndex(addr => addr.isDefault);
      if (defaultIdx > -1) {
        setSelectedAddressIndex(defaultIdx);
      } else {
        setSelectedAddressIndex(0);
      }
    }
  }, [user]);

  const handleAddNewAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError('');

    const res = await addAddress({ street, city, state, zipCode, country });
    if (res.success) {
      setIsAddingAddress(false);
      setStreet('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('');
    } else {
      setAddressError(res.message);
    }
  };

  const handlePaymentSuccess = async (orderId, paymentIntentId) => {
    try {
      const response = await api.post('/orders/confirm-payment', {
        orderId,
        paymentIntentId
      });
      if (response.data.success) {
        if (isBuyNow) {
          sessionStorage.removeItem('buyNowItem');
        } else {
          clearCart();
        }
        navigate(`/order-confirmation/${orderId}`, {
          state: { order: response.data.order, guestEmail }
        });
      }
    } catch (err) {
      alert('Order placed, but payment verification failed. Please contact support.');
    }
  };

  const isGuestFormValid = () => {
    return guestEmail.trim() !== '' &&
           guestName.trim() !== '' &&
           street.trim() !== '' &&
           city.trim() !== '' &&
           state.trim() !== '' &&
           zipCode.trim() !== '' &&
           country.trim() !== '';
  };

  const selectedAddress = user?.addresses[selectedAddressIndex];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Checkout</h1>
          {isBuyNow && (
            <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              <Zap size={14} className="fill-indigo-400" />
              <span>Express Buy Now</span>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="bg-slate-900 border border-indigo-500/10 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 animate-fadeIn">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-200">Checking out as a Guest</p>
              <p className="text-xs text-slate-400">Have an account? Logging in speeds up checkout and tracks orders automatically.</p>
            </div>
            <button
              onClick={() => navigate('/login', { state: { from: { pathname: '/checkout' } } })}
              className="shrink-0 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2 px-5 rounded-xl text-xs transition-smooth cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              Log In
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Address Selector & Shipping Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Address Selection Block */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <MapPin size={20} className="text-indigo-400" />
                  {isAuthenticated ? 'Shipping Address' : 'Guest Shipping Details'}
                </h2>
                {isAuthenticated && !isAddingAddress && user?.addresses?.length > 0 && (
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Address
                  </button>
                )}
              </div>

              {!isAuthenticated ? (
                // Guest Checkout Form
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Email Address (for order tracking)</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Street Address</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Apt 4"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                      disabled={readyForPayment}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">City</label>
                      <input
                        type="text"
                        placeholder="Los Angeles"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">State / Region</label>
                      <input
                        type="text"
                        placeholder="CA"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Zip / Postal Code</label>
                      <input
                        type="text"
                        placeholder="90001"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Country</label>
                      <input
                        type="text"
                        placeholder="United States"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        disabled={readyForPayment}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    {readyForPayment ? (
                      <button
                        type="button"
                        onClick={() => setReadyForPayment(false)}
                        className="w-full sm:w-auto bg-slate-950 border border-slate-800 hover:bg-slate-900 text-indigo-400 hover:text-indigo-300 font-semibold min-h-[44px] px-6 rounded-xl text-sm transition-smooth cursor-pointer"
                      >
                        Edit Information
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            guestName.trim() &&
                            guestEmail.trim() &&
                            street.trim() &&
                            city.trim() &&
                            state.trim() &&
                            zipCode.trim() &&
                            country.trim()
                          ) {
                            setReadyForPayment(true);
                          } else {
                            alert('Please fill out all required details before proceeding.');
                          }
                        }}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold min-h-[44px] px-6 rounded-xl text-sm transition-smooth cursor-pointer"
                      >
                        Save & Continue to Payment
                      </button>
                    )}
                  </div>
                </div>
              ) : isAddingAddress || !user?.addresses || user.addresses.length === 0 ? (
                // Add Address Form
                <form onSubmit={handleAddNewAddressSubmit} className="space-y-4">
                  <h3 className="font-semibold text-slate-350 text-sm">Add Shipping Address</h3>
                  
                  {addressError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
                      <AlertCircle size={16} />
                      <span>{addressError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Street Address</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Apt 4"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">City</label>
                      <input
                        type="text"
                        placeholder="Los Angeles"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">State / Region</label>
                      <input
                        type="text"
                        placeholder="CA"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Zip / Postal Code</label>
                      <input
                        type="text"
                        placeholder="90001"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Country</label>
                      <input
                        type="text"
                        placeholder="United States"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    {user?.addresses?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="bg-slate-950 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-350 py-2 px-4 rounded-xl text-xs transition-smooth"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-smooth"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              ) : (
                // List of saved addresses
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.addresses.map((addr, idx) => (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddressIndex(idx)}
                      className={`border rounded-xl p-4 cursor-pointer transition-smooth flex flex-col justify-between ${
                        selectedAddressIndex === idx
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-300">
                            Address #{idx + 1}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 py-0.5 px-2 rounded-full font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">{addr.street}</p>
                        <p className="text-xs text-slate-400">
                          {addr.city}, {addr.state} {addr.zipCode}
                        </p>
                        <p className="text-xs text-slate-400">{addr.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Panel */}
            {!isAddingAddress && (isAuthenticated ? selectedAddress : (readyForPayment && isGuestFormValid())) && (
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6 animate-slideDown">
                <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-indigo-400" />
                  Secure Payment Method
                </h2>

                {isStripeActive() ? (
                  <Elements stripe={stripePromise}>
                    <StripeCheckoutForm
                      shippingAddress={isAuthenticated ? selectedAddress : { street, city, state, zipCode, country }}
                      guestInfo={isAuthenticated ? null : { email: guestEmail, name: guestName }}
                      onPaymentSuccess={handlePaymentSuccess}
                      totalAmount={finalTotal}
                      items={checkoutItems}
                      isBuyNow={isBuyNow}
                    />
                  </Elements>
                ) : (
                  <MockCheckoutForm
                    shippingAddress={isAuthenticated ? selectedAddress : { street, city, state, zipCode, country }}
                    guestInfo={isAuthenticated ? null : { email: guestEmail, name: guestName }}
                    onPaymentSuccess={handlePaymentSuccess}
                    totalAmount={finalTotal}
                    items={checkoutItems}
                    isBuyNow={isBuyNow}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right panel: Summary of items */}
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl h-fit space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-4">Items Summary</h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {checkoutItems.map((item) => (
                <div key={item.product?._id} className="flex justify-between items-center gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-lg overflow-hidden shrink-0">
                      <img src={item.product?.images[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-300 line-clamp-1 max-w-full sm:max-w-36">{item.product?.name}</div>
                      <div className="text-slate-500">Qty: {item.quantity}</div>
                    </div>
                  </div>
                  <div className="font-bold text-slate-200 text-right">
                    ₹{((item.product?.price || 0) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-slate-850" />

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-slate-200 font-semibold">₹{checkoutSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-slate-200 font-semibold">
                  {shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (8%)</span>
                <span className="text-slate-200 font-semibold">₹{estimatedTax.toFixed(2)}</span>
              </div>
            </div>

            <hr className="border-slate-850" />

            <div className="flex justify-between text-base font-extrabold text-slate-100">
              <span>Total Price</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
