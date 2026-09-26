import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, CreditCard, CheckCircle, Check, Zap, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    key: 'cart',
    label: 'Cart Review',
    shortLabel: 'Cart',
    path: '/cart',
    icon: ShoppingCart
  },
  {
    id: 2,
    key: 'shipping',
    label: 'Shipping & Payment',
    shortLabel: 'Payment',
    path: '/checkout',
    icon: CreditCard
  },
  {
    id: 3,
    key: 'confirmation',
    label: 'Confirmation',
    shortLabel: 'Confirmed',
    path: null,
    icon: CheckCircle
  }
];

const CheckoutProgressIndicator = ({ currentStep = 1, isBuyNow = false }) => {
  const navigate = useNavigate();

  // Find active step object
  const activeStepObj = STEPS.find(s => s.id === currentStep) || STEPS[0];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-850 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 shadow-xl backdrop-blur-md transition-all">
      {/* DESKTOP & TABLET VIEW (sm and up) */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between max-w-3xl mx-auto relative">
          
          {STEPS.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            const isUpcoming = step.id > currentStep;
            const Icon = step.icon;

            // Allow navigation back to previous completed steps (e.g. back to cart from checkout)
            const canNavigateBack = isCompleted && step.path && !(isBuyNow && step.id === 1);

            return (
              <React.Fragment key={step.id}>
                {/* Connector Line before step (except first step) */}
                {index > 0 && (
                  <div className="flex-1 h-0.5 mx-3 sm:mx-4 relative overflow-hidden bg-slate-850 rounded-full">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCompleted || isActive
                          ? 'bg-gradient-to-r from-[#6D2932] to-[#8C333F]'
                          : 'bg-transparent'
                      }`}
                      style={{
                        width: isCompleted ? '100%' : isActive ? '50%' : '0%'
                      }}
                    />
                  </div>
                )}

                {/* Step Node */}
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    onClick={() => canNavigateBack && navigate(step.path)}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      canNavigateBack ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                    } ${
                      isActive
                        ? 'bg-[#6D2932] border-2 border-[#e8a3ae] text-white shadow-lg shadow-[#6D2932]/50 ring-4 ring-[#6D2932]/20'
                        : isCompleted
                        ? 'bg-[#561C24] border border-[#6D2932] text-white shadow-md shadow-[#561C24]/30'
                        : 'bg-slate-950 border border-slate-800 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[3] text-emerald-400" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}

                    {/* Pulse effect on active node */}
                    {isActive && (
                      <span className="absolute -inset-0.5 rounded-full border border-[#e8a3ae]/40 animate-ping opacity-75 pointer-events-none"></span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={() => canNavigateBack && navigate(step.path)}
                        className={`text-xs sm:text-sm font-bold transition-colors ${
                          canNavigateBack ? 'cursor-pointer hover:text-[#e8a3ae]' : ''
                        } ${
                          isActive
                            ? 'text-slate-100 font-extrabold'
                            : isCompleted
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                      {isActive && isBuyNow && step.id === 2 && (
                        <span className="hidden lg:inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                          <Zap size={10} /> Express
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      {isActive ? 'Current Step' : isCompleted ? 'Completed' : `Step ${step.id}`}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

        </div>
      </div>

      {/* MOBILE VIEW (below sm: 640px) */}
      <div className="block sm:hidden space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#6D2932] border border-[#e8a3ae] text-white flex items-center justify-center font-bold text-xs shadow-md shadow-[#6D2932]/40">
              {currentStep}
            </div>
            <div>
              <p className="font-extrabold text-slate-100 text-xs flex items-center gap-1.5">
                <span>Step {currentStep} of 3:</span>
                <span className="text-[#e8a3ae]">{activeStepObj.label}</span>
              </p>
              {isBuyNow && currentStep === 2 && (
                <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Zap size={10} /> Express Buy Now Mode
                </span>
              )}
            </div>
          </div>

          <span className="text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {currentStep === 3 ? 'Done' : `Step ${currentStep}/3`}
          </span>
        </div>

        {/* 3-segment mobile progress bar */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;

            return (
              <div
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6D2932] to-[#8C333F] shadow-sm shadow-[#6D2932]/50'
                    : isCompleted
                    ? 'bg-[#561C24]'
                    : 'bg-slate-850'
                }`}
              />
            );
          })}
        </div>

        {/* Quick mobile step labels */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5 px-0.5">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            return (
              <span
                key={step.id}
                className={
                  isActive
                    ? 'text-slate-200 font-bold'
                    : isCompleted
                    ? 'text-slate-400 font-medium'
                    : 'text-slate-600'
                }
              >
                {step.shortLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CheckoutProgressIndicator;
