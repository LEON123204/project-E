import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  Settings, 
  Lock, 
  AlertCircle, 
  Check, 
  Truck, 
  X,
  CreditCard
} from 'lucide-react';

const ProfilePage = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    addAddress, 
    deleteAddress, 
    setDefaultAddress 
  } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'orders';

  // State Management
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Address Form States
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [addrError, setAddrError] = useState('');
  const [addrSuccess, setAddrSuccess] = useState('');

  // Fetch Order History
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders/my-orders');
        setOrders(response.data.orders);
      } catch (err) {
        console.error('Failed to fetch orders', err.message);
      } finally {
        setOrdersLoading(false);
      }
    };
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Sync profile details if user model changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleTabChange = (tabName) => {
    setSearchParams({ tab: tabName });
    setIsAddingAddr(false);
    setProfileSuccess('');
    setProfileError('');
    setPwSuccess('');
    setPwError('');
    setAddrError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    const res = await updateProfile(name, email);
    setProfileLoading(false);
    if (res.success) {
      setProfileSuccess('Profile details updated successfully');
    } else {
      setProfileError(res.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setPwLoading(true);
    setPwSuccess('');
    setPwError('');

    const res = await changePassword(currentPassword, newPassword);
    setPwLoading(false);
    if (res.success) {
      setPwSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwError(res.message);
    }
  };

  const handleAddAddressSubmit = async (e) => {
    e.preventDefault();
    setAddrError('');
    setAddrSuccess('');

    const res = await addAddress({ street, city, state, zipCode, country });
    if (res.success) {
      setAddrSuccess('Address added successfully');
      setIsAddingAddr(false);
      setStreet('');
      setCity('');
      setState('');
      setZipCode('');
      setCountry('');
    } else {
      setAddrError(res.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
      case 'shipped': return 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400';
      case 'delivered': return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
      case 'cancelled': return 'bg-rose-500/10 border border-rose-500/30 text-rose-400';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  const steps = ['pending', 'shipped', 'delivered'];
  const getStepIndex = (status) => steps.indexOf(status);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Tabs Selector */}
        <div className="bg-slate-900 border border-slate-850 p-4 sm:p-6 rounded-2xl h-fit flex flex-col gap-4 md:gap-0 md:space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-650 flex items-center justify-center font-bold text-lg text-white shrink-0">
              {user?.name?.[0]}
            </div>
            <div>
              <h2 className="font-bold text-slate-200 text-sm leading-tight">{user?.name}</h2>
              <span className="text-[10px] text-slate-500 font-mono capitalize">{user?.role}</span>
            </div>
          </div>

          <hr className="hidden md:block border-slate-850" />

          <nav className="flex flex-row md:flex-col gap-1.5 text-sm overflow-x-auto pb-2 md:pb-0 scrollbar-none shrink-0 -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => handleTabChange('orders')}
              className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-left cursor-pointer transition-smooth shrink-0 whitespace-nowrap ${
                activeTab === 'orders' ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              <ShoppingBag size={18} />
              My Orders
            </button>
            <button
              onClick={() => handleTabChange('addresses')}
              className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-left cursor-pointer transition-smooth shrink-0 whitespace-nowrap ${
                activeTab === 'addresses' ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              <MapPin size={18} />
              Shipping Addresses
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-left cursor-pointer transition-smooth shrink-0 whitespace-nowrap ${
                activeTab === 'settings' ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              <Settings size={18} />
              Account Settings
            </button>
          </nav>
        </div>

        {/* Core Content Box */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl min-h-[30rem]">
          
          {/* TAB 1: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 border-b border-slate-850 pb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-indigo-400" />
                Order History
              </h2>

              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-xs">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-6">You haven't placed any orders yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-slate-950/40 border border-slate-850 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-400 font-mono">
                          ID: #{order._id.substring(12).toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500">
                          Placed: {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm font-bold text-slate-350 mt-1">
                          Total: ₹{order.totalAmount.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] uppercase font-bold py-1 px-3.5 rounded-full ${getStatusBadgeClass(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-bold py-1.5 px-4 rounded-xl text-xs transition-smooth cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                  <MapPin size={20} className="text-indigo-400" />
                  Shipping Addresses
                </h2>
                {!isAddingAddr && (
                  <button
                    onClick={() => setIsAddingAddr(true)}
                    className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-1.5 px-4 rounded-xl text-xs transition-smooth cursor-pointer"
                  >
                    Add Address
                  </button>
                )}
              </div>

              {addrSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2">
                  <Check size={16} />
                  <span>{addrSuccess}</span>
                </div>
              )}

              {isAddingAddr ? (
                <form onSubmit={handleAddAddressSubmit} className="space-y-4 max-w-xl">
                  <h3 className="font-semibold text-slate-350 text-sm">Add Shipping Address</h3>

                  {addrError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
                      <AlertCircle size={16} />
                      <span>{addrError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Street Address</label>
                    <input
                      type="text"
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
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">State / Region</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Zip / Postal Code</label>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-smooth"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAddr(false)}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-850 hover:border-slate-800 text-slate-350 py-2 px-4 rounded-xl text-xs transition-smooth cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-smooth cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              ) : (
                // Saved Addresses Display
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user?.addresses?.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No addresses saved. Add one using the button above.</p>
                  ) : (
                    user?.addresses?.map((addr) => (
                      <div
                        key={addr._id}
                        className="bg-slate-950/45 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Address</span>
                            {addr.isDefault && (
                              <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 py-0.5 px-2 rounded-full font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300 mt-2 font-medium">{addr.street}</p>
                          <p className="text-xs text-slate-450">{addr.city}, {addr.state} {addr.zipCode}</p>
                          <p className="text-xs text-slate-450">{addr.country}</p>
                        </div>

                        <div className="flex items-center gap-3 mt-5 pt-3 border-t border-slate-900">
                          {!addr.isDefault && (
                            <button
                              onClick={() => setDefaultAddress(addr._id)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-smooth cursor-pointer"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => deleteAddress(addr._id)}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-350 ml-auto transition-smooth cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-10">
              
              {/* Profile details */}
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
                  <User size={18} className="text-indigo-400" />
                  Personal Information
                </h2>

                {profileSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 animate-fadeIn">
                    <Check size={16} />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
                    <AlertCircle size={16} />
                    <span>{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-smooth cursor-pointer"
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </form>
              </div>

              {/* Password change */}
              <div className="space-y-4 max-w-xl">
                <h2 className="text-lg font-bold text-slate-200 border-b border-slate-850 pb-3 flex items-center gap-2">
                  <Lock size={18} className="text-indigo-400" />
                  Security Configuration
                </h2>

                {pwSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2">
                    <Check size={16} />
                    <span>{pwSuccess}</span>
                  </div>
                )}

                {pwError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2">
                    <AlertCircle size={16} />
                    <span>{pwError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3 text-sm text-slate-100 outline-none transition-smooth"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="bg-indigo-650 hover:bg-indigo-550 text-white font-semibold py-2 px-6 rounded-xl text-xs transition-smooth cursor-pointer"
                  >
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-slate-200 text-sm sm:text-base">Order Details</h3>
                <span className="text-[9px] sm:text-[10px] font-mono text-slate-500">ID: #{selectedOrder._id}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded-lg text-slate-450 hover:text-slate-200 transition-smooth cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-grow">
              
              {/* Order Tracker steps */}
              {selectedOrder.orderStatus !== 'cancelled' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    <span>Order Placed</span>
                    <span>Shipped Out</span>
                    <span>Delivered</span>
                  </div>
                  {/* Visual Line */}
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 right-0 h-1 bg-slate-800 -z-10"></div>
                    <div
                      className="absolute left-0 h-1 bg-indigo-500 -z-10 transition-smooth"
                      style={{
                        width: selectedOrder.orderStatus === 'pending' ? '0%' : selectedOrder.orderStatus === 'shipped' ? '50%' : '100%'
                      }}
                    ></div>
                    {steps.map((st, i) => (
                      <div
                        key={st}
                        className={`h-5 w-5 rounded-full flex items-center justify-center border-2 transition-smooth ${
                          getStepIndex(selectedOrder.orderStatus) >= i
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-880 text-slate-600'
                        }`}
                      >
                        <Check size={10} className="stroke-[3]" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 p-4 rounded-xl text-center text-xs flex items-center justify-center gap-2">
                  <AlertCircle size={16} />
                  <span>This order has been cancelled and items returned to store stock.</span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items Summary</h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden divide-y divide-slate-850">
                  {selectedOrder.items.map((item) => (
                    <div key={item._id} className="flex justify-between items-center p-3 sm:p-3.5 text-xs bg-slate-950/20">
                      <div className="space-y-0.5 max-w-[70%]">
                        <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                        <div className="text-slate-550 text-[11px]">
                          Price: ₹{item.price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>
                      <div className="font-bold text-slate-100 text-right">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address and status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed bg-slate-950/10 border border-slate-850/50 p-4 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-350 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck size={14} className="text-indigo-400" />
                    Delivery Destination
                  </h4>
                  <p>{selectedOrder.shippingAddress.street}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                  <p>{selectedOrder.shippingAddress.country}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-350 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-indigo-400" />
                    Billing Status
                  </h4>
                  <p>
                    Payment Status:{' '}
                    <span className={`font-bold capitalize ${selectedOrder.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </p>
                  {selectedOrder.paymentIntentId && (
                    <p className="font-mono text-[10px] text-slate-500 mt-2 truncate">Ref: {selectedOrder.paymentIntentId}</p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-t border-slate-800 bg-slate-950/20 text-xs shrink-0">
              <span className="text-slate-400 font-medium">Grand Total</span>
              <span className="text-base font-extrabold text-slate-100">₹{selectedOrder.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
