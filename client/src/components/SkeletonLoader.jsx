import React from 'react';

// Shimmering card grid item
export const ProductCardSkeleton = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 flex flex-col justify-between h-96 shimmer-wrapper">
      <div className="w-full h-48 bg-slate-800 rounded-xl mb-4"></div>
      <div className="flex flex-col gap-2">
        <div className="w-1/3 h-4 bg-slate-800 rounded"></div>
        <div className="w-3/4 h-5 bg-slate-800 rounded"></div>
        <div className="w-1/2 h-4 bg-slate-800 rounded"></div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="w-1/4 h-6 bg-slate-800 rounded"></div>
        <div className="w-8 h-8 bg-slate-800 rounded-full"></div>
      </div>
    </div>
  );
};

// Shimmering detailed view
export const ProductDetailSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 shimmer-wrapper">
      {/* Gallery skeleton */}
      <div className="flex flex-col gap-4">
        <div className="w-full aspect-square bg-slate-900 border border-slate-800 rounded-2xl"></div>
        <div className="grid grid-cols-4 gap-2">
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-xl"></div>
          <div className="aspect-square bg-slate-900 border border-slate-800 rounded-xl"></div>
        </div>
      </div>
      
      {/* Detail info skeleton */}
      <div className="flex flex-col justify-start py-2">
        <div className="w-1/4 h-6 bg-slate-800 rounded mb-4"></div>
        <div className="w-3/4 h-10 bg-slate-800 rounded mb-4"></div>
        <div className="w-1/3 h-5 bg-slate-800 rounded mb-6"></div>
        <div className="w-1/4 h-8 bg-slate-800 rounded mb-6"></div>
        
        <hr className="border-slate-800 my-6" />
        
        <div className="w-full h-24 bg-slate-900 border border-slate-800 rounded-xl mb-6"></div>
        
        <div className="flex items-center gap-4">
          <div className="w-1/3 h-12 bg-slate-850 border border-slate-800 rounded-xl"></div>
          <div className="w-2/3 h-12 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
};

// Shimmering dashboard skeleton
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 shimmer-wrapper">
      {/* Key metric cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-32 flex flex-col justify-between">
            <div className="w-1/3 h-4 bg-slate-800 rounded"></div>
            <div className="w-1/2 h-8 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-96">
          <div className="w-1/4 h-5 bg-slate-800 rounded mb-4"></div>
          <div className="w-full h-72 bg-slate-850 rounded"></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-96">
          <div className="w-1/3 h-5 bg-slate-800 rounded mb-4"></div>
          <div className="w-full h-72 bg-slate-850 rounded-full aspect-square max-h-64 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};
