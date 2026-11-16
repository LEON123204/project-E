import React from 'react';
import { Package, Truck, CheckCircle, Clock, XCircle, Check } from 'lucide-react';

/**
 * Shared component to display per-seller shipments on customer order pages.
 * Supports:
 * - Single or multiple packages with separate tracking statuses
 * - Stepper for pending/shipped/delivered, and special red banner for cancelled
 * - COD cash collection state (amount due vs payment received)
 * - Defensive rendering against missing/malformed fields
 */
const ShipmentCards = ({ shipments, paymentMethod, className = '' }) => {
  if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
    return null;
  }

  const isCod = (paymentMethod || '').toLowerCase() === 'cod';

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Processing';
      case 'shipped': return 'On the way';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
      case 'shipped': return 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400';
      case 'delivered': return 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
      case 'cancelled': return 'bg-rose-500/10 border border-rose-500/30 text-rose-400';
      default: return 'bg-slate-850 border border-slate-750 text-slate-400';
    }
  };

  const steps = [
    { key: 'pending', label: 'Order placed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getStepProgress = (status) => {
    if (status === 'pending') return 0;
    if (status === 'shipped') return 1;
    if (status === 'delivered') return 2;
    return -1;
  };

  return (
    <div className={`space-y-4 w-full max-w-full overflow-hidden ${className}`}>
      {/* Explainer line for multi-shipment orders */}
      {shipments.length > 1 && (
        <div className="bg-slate-900/90 border border-indigo-500/25 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-300 shadow-md">
          <Truck size={16} className="shrink-0 text-amber-400" />
          <p className="leading-relaxed">
            Your order ships in <span className="font-bold text-slate-100">{shipments.length}</span> separate packages from different sellers; each has its own tracking status.
          </p>
        </div>
      )}

      {/* Shipment Cards Grid / Stack */}
      <div className="space-y-4">
        {shipments.map((shipment, index) => {
          if (!shipment) return null;
          const currentStepIdx = getStepProgress(shipment.status);
          const isCancelled = shipment.status === 'cancelled';
          const items = Array.isArray(shipment.items) ? shipment.items : [];

          const sellerDisplayName = shipment.isMarketplaceSeller
            ? `Sold by ${shipment.sellerName || 'Seller'}`
            : 'Shipped by Cartex';

          return (
            <div
              key={shipment.shipmentId || index}
              className="bg-slate-900 border border-slate-850 p-4 sm:p-6 rounded-3xl shadow-xl space-y-5 overflow-hidden break-words"
            >
              {/* Header: Seller Name & Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-850 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
                    <Package size={16} className="text-amber-400" />
                  </div>
                  <h4 className="font-bold text-slate-100 text-sm leading-tight">
                    {sellerDisplayName}
                  </h4>
                  {shipment.isMarketplaceSeller ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full shrink-0">
                      Marketplace seller
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                      Shipped by Cartex
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full ${getStatusBadgeClass(shipment.status)}`}>
                    {getStatusLabel(shipment.status)}
                  </span>
                </div>
              </div>

              {/* Status Stepper / Cancelled Banner */}
              {isCancelled ? (
                <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
                  <XCircle size={20} className="shrink-0" />
                  <div>
                    <p className="font-bold text-rose-300">Package Cancelled</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This package has been cancelled. Any applicable refunds or stock adjustments are processed automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-slate-850/80 p-4 rounded-2xl space-y-2">
                  {/* Step labels */}
                  <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                    {steps.map((st, i) => (
                      <span
                        key={st.key}
                        className={`${
                          currentStepIdx >= i ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {st.label}
                      </span>
                    ))}
                  </div>

                  {/* Stepper bar */}
                  <div className="relative flex items-center justify-between pt-1">
                    <div className="absolute left-2 right-2 h-1 bg-slate-800 -z-0"></div>
                    <div
                      className="absolute left-2 h-1 bg-gradient-to-r from-amber-500 to-indigo-500 -z-0 transition-all duration-300"
                      style={{
                        width: currentStepIdx <= 0 ? '0%' : currentStepIdx === 1 ? '50%' : 'calc(100% - 16px)'
                      }}
                    ></div>
                    {steps.map((st, i) => {
                      const isComplete = currentStepIdx > i;
                      const isCurrent = currentStepIdx === i;
                      return (
                        <div
                          key={st.key}
                          className={`z-10 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-smooth ${
                            isComplete
                              ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                              : isCurrent
                              ? 'bg-indigo-600 border-amber-400 text-white font-bold ring-2 ring-amber-400/30'
                              : 'bg-slate-900 border-slate-750 text-slate-600'
                          }`}
                        >
                          {isComplete ? (
                            <Check size={12} className="stroke-[3]" />
                          ) : (
                            <span className="text-[10px]">{i + 1}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items List in this Shipment */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Items in this Package ({items.length})
                </span>

                <div className="divide-y divide-slate-850/80 bg-slate-950/40 border border-slate-850/80 rounded-2xl p-3 sm:p-4 space-y-2.5">
                  {items.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No items details available.</p>
                  ) : (
                    items.map((item, itmIdx) => (
                      <div
                        key={itmIdx}
                        className="flex items-center justify-between text-xs pt-2.5 first:pt-0 gap-3"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-slate-200 truncate">{item.name || 'Purchased Item'}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Qty: {item.quantity || 1} × ₹{(item.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-slate-100 shrink-0 text-sm">
                          ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal */}
                {shipment.subtotal != null && (
                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1.5 px-2 font-medium">
                    <span>Package Subtotal</span>
                    <span className="font-bold text-slate-200 text-sm">₹{shipment.subtotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* COD Payment Section */}
              {isCod && (
                <div className="p-3.5 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border bg-slate-950/70 border-slate-850">
                  <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                    Package Payment:
                  </span>
                  {shipment.codCollected ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <CheckCircle size={15} />
                      Cash payment received
                    </span>
                  ) : (
                    <span className="font-bold text-amber-400 text-xs">
                      Pay INR {(shipment.amountDue != null ? shipment.amountDue : 0).toFixed(2)} in cash on delivery
                    </span>
                  )}
                </div>
              )}

              {/* Footer: Last Updated Timestamp */}
              {shipment.updatedAt && !isNaN(new Date(shipment.updatedAt).getTime()) && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-850/50">
                  <Clock size={12} className="text-slate-500 shrink-0" />
                  <span>Last updated: {new Date(shipment.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShipmentCards;

