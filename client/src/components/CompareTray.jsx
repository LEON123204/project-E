import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ArrowLeftRight } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { shouldShowTray } from '../utils/compareSelection';

const CompareTray = () => {
  const { items, count, remove, clear } = useCompare();
  const location = useLocation();
  const navigate = useNavigate();

  const isVisible = shouldShowTray(location.pathname, count);
  if (!isVisible) return null;

  const handleCompareClick = () => {
    if (count < 2) return;
    const ids = items.map((it) => it._id).join(',');
    navigate(`/compare?ids=${ids}`);
  };

  return (
    <div
      role="region"
      aria-label="Product comparison tray"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-2.5 sm:px-6 py-2 shadow-2xl transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Selected Product Thumbnails */}
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto py-0.5 scrollbar-none flex-1 min-w-0">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0 pr-1">
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Compare:</span>
          </div>

          {items.map((prod) => (
            <div
              key={prod._id}
              className="group relative flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/90 rounded-xl p-1 pr-1.5 sm:pr-2 shrink-0 max-w-[130px] sm:max-w-[170px]"
            >
              <img
                src={prod.image || 'https://via.placeholder.com/80?text=No+Img'}
                alt={prod.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover bg-slate-900 shrink-0 border border-slate-800"
              />
              <span className="text-[11px] sm:text-xs font-medium text-slate-200 truncate min-w-0 flex-1">
                {prod.name}
              </span>
              <button
                type="button"
                onClick={() => remove(prod._id)}
                aria-label={`Remove ${prod.name} from comparison`}
                className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Placeholder slots for remaining */}
          {count < 3 && (
            <div className="hidden sm:flex items-center justify-center px-3 py-2 border border-dashed border-slate-850 rounded-xl text-[11px] text-slate-500 shrink-0">
              +{3 - count} more
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={clear}
            className="text-slate-400 hover:text-slate-100 text-xs sm:text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={count < 2}
            onClick={handleCompareClick}
            aria-disabled={count < 2}
            className="bg-[#6D2932] hover:bg-[#561C24] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all duration-200 shadow-md shadow-[#6D2932]/20 shrink-0 whitespace-nowrap active:scale-95 disabled:active:scale-100 cursor-pointer"
          >
            Compare ({count})
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareTray;
