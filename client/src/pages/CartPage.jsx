import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react';

const CartPage = () => {
  const { cartItems, loading, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  const shippingCost = cartTotal > 1000 || cartTotal === 0 ? 0 : 99.00;
  const estimatedTax = cartTotal * 0.08; // 8% tax rate
  const finalTotal = cartTotal + shippingCost + estimatedTax;

  const hasInsufficientStock = cartItems.some(
    item => item.quantity > (item.product?.stock || 0)
  );

  const handleQtyChange = async (productId, currentQty, stockLimit, type) => {
    if (type === 'inc') {
      if (currentQty < stockLimit) {
        await updateQuantity(productId, currentQty + 1);
      }
    } else {
      if (currentQty > 1) {
        await updateQuantity(productId, currentQty - 1);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 mb-6 sm:mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-6">
            <ShoppingBag size={48} className="mx-auto text-slate-650" />
            <h2 className="text-xl font-bold text-slate-200">Your cart is empty</h2>
            <p className="text-slate-450 text-sm leading-relaxed">
              Looks like you haven't added any products to your cart yet. Head over to our catalog and find the perfect upgrades for your setup!
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2.5 px-6 rounded-full transition-smooth shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              Start Shopping
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Panel: Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.product?._id}
                  className="bg-slate-900/50 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 p-4 sm:p-6 rounded-2xl flex flex-col gap-4 transition-smooth"
                >
                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-20 h-20 bg-slate-950 rounded-xl overflow-hidden shrink-0 border border-slate-850">
                      <img
                        src={item.product?.images[0] || 'https://via.placeholder.com/100?text=No+Image'}
                        alt={item.product?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <Link
                        to={`/product/${item.product?._id}`}
                        className="font-bold text-slate-200 hover:text-indigo-400 transition-smooth text-sm sm:text-base line-clamp-1"
                      >
                        {item.product?.name}
                      </Link>
                      <div className="text-xs text-slate-500 font-medium">
                        Unit Price: ₹{item.product?.price?.toFixed(2)}
                      </div>
                      <div className="text-xs font-semibold">
                        {item.product?.stock === 0 ? (
                          <span className="text-rose-450">Out of Stock</span>
                        ) : item.quantity > item.product?.stock ? (
                          <span className="text-amber-450">Insufficient Stock (Only {item.product.stock} available)</span>
                        ) : (
                          <span className="text-emerald-400">In Stock (Limit {item.product.stock})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Pricing — always in a row, wraps if needed */}
                  <div className="flex items-center justify-between gap-3 w-full border-t border-slate-900/70 pt-3 sm:pt-0 sm:border-none sm:w-auto sm:justify-end">
                    
                    {/* Quantity controls — 44px tall touch targets */}
                    <div className="flex items-center border border-slate-800 bg-slate-950 rounded-lg min-h-[44px] px-1">
                      <button
                        onClick={() => handleQtyChange(item.product?._id, item.quantity, item.product?.stock, 'dec')}
                        disabled={item.quantity <= 1}
                        className="flex items-center justify-center min-w-[36px] min-h-[44px] hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 disabled:text-slate-700 transition-smooth"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-semibold text-slate-200 w-6 text-center select-none">{item.quantity}</span>
                      <button
                        onClick={() => handleQtyChange(item.product?._id, item.quantity, item.product?.stock, 'inc')}
                        disabled={item.quantity >= item.product?.stock}
                        className="flex items-center justify-center min-w-[36px] min-h-[44px] hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 disabled:text-slate-700 transition-smooth"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Subtotal price for item */}
                    <div className="text-sm font-extrabold text-slate-100 text-right flex-1">
                      ₹{((item.product?.price || 0) * item.quantity).toFixed(2)}
                    </div>

                    {/* Trash remove item */}
                    <button
                      onClick={() => removeFromCart(item.product?._id)}
                      className="p-2.5 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-smooth cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Panel: Order Summary */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl h-fit space-y-6">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-slate-200 font-semibold">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Shipping Fee</span>
                  <span className="text-slate-200 font-semibold">
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Tax</span>
                  <span className="text-slate-200 font-semibold">₹{estimatedTax.toFixed(2)}</span>
                </div>
                {shippingCost > 0 && (
                  <p className="text-[10px] text-indigo-400 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                    💡 Spend ₹{(1000 - cartTotal).toFixed(2)} more to qualify for FREE shipping!
                  </p>
                )}
              </div>

              <hr className="border-slate-850" />

              <div className="flex justify-between text-base font-extrabold text-slate-100">
                <span>Total</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>

              {hasInsufficientStock && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex gap-2 leading-relaxed animate-fadeIn">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>Some items in your cart have insufficient stock. Please adjust quantities before proceeding.</span>
                </div>
              )}

              <button
                onClick={() => !hasInsufficientStock && navigate('/checkout')}
                disabled={hasInsufficientStock}
                className="w-full bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-3 rounded-xl transition-smooth shadow-lg shadow-indigo-600/20 disabled:shadow-none flex items-center justify-center gap-2 group cursor-pointer"
              >
                Proceed to Checkout
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="text-center">
                <Link to="/shop" className="text-xs text-slate-500 hover:text-indigo-400 transition-smooth">
                  Continue Shopping
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
