import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { ChevronLeft, ChevronRight, Heart, ShoppingCart, Star, Sparkles } from "lucide-react";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

const TrendingCarousel = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [addingToCartId, setAddingToCartId] = useState(null);

  // Configure Embla Carousel with WheelGesturesPlugin for laptop trackpad horizontal swipe
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
      skipSnaps: false,
      duration: 25,
      watchDrag: true,
    },
    [WheelGesturesPlugin()]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Trackpad two-finger horizontal swipe wheel listener
  useEffect(() => {
    if (!emblaApi) return;
    const viewport = emblaRef.current;
    if (!viewport) return;

    let accumulatedDeltaX = 0;
    let scrollTimeout = null;

    const handleWheel = (e) => {
      // Check horizontal scroll intent (two-finger horizontal swipe deltaX or Shift + deltaY)
      const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;

      if (isHorizontalScroll && Math.abs(delta) > 4) {
        // Prevent default browser back/forward swipe history navigation
        e.preventDefault();
        accumulatedDeltaX += delta;

        if (!scrollTimeout) {
          scrollTimeout = setTimeout(() => {
            if (accumulatedDeltaX > 18) {
              emblaApi.scrollNext();
            } else if (accumulatedDeltaX < -18) {
              emblaApi.scrollPrev();
            }
            accumulatedDeltaX = 0;
            scrollTimeout = null;
          }, 50);
        }
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [emblaApi, emblaRef]);

  // Fetch 6-8 trending/popular products from database
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        // Request products sorted by popularity
        const response = await api.get("/products?limit=8&sort=popularity");
        if (response.data && response.data.products) {
          let fetched = response.data.products;
          // Fallback to newest if fewer than 5 returned
          if (fetched.length < 5) {
            const fallbackRes = await api.get("/products?limit=8&sort=newest");
            fetched = fallbackRes.data?.products || [];
          }
          setProducts(fetched);
        }
      } catch (err) {
        console.error("Failed to load featured products for carousel:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Card click handler: distinguishes between drag gesture and tap click
  const handleCardClick = (e, index, productId) => {
    // If user dragged the carousel, prevent click navigation
    if (emblaApi && !emblaApi.clickAllowed()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (index !== selectedIndex) {
      scrollTo(index);
    } else {
      navigate(`/product/${productId}`);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    e.preventDefault();
    if (emblaApi && !emblaApi.clickAllowed()) return;
    setAddingToCartId(product._id);
    const res = await addToCart(product, 1);
    setAddingToCartId(null);
    if (!res.success) {
      alert(res.message);
    }
  };

  const handleToggleWishlist = (e, productId) => {
    e.stopPropagation();
    e.preventDefault();
    if (emblaApi && !emblaApi.clickAllowed()) return;
    toggleWishlist(productId);
  };

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  // Determine badge tag strictly based on REAL product data fields
  const getBadge = (product) => {
    if (!product) return null;

    // 1. On Sale (discountPercent > 0)
    if (product.discountPercent && product.discountPercent > 0) {
      return {
        label: `${product.discountPercent}% OFF`,
        style: "bg-rose-950/90 text-rose-300 border-rose-600/50 shadow-rose-950/50",
      };
    }

    // 2. Best Seller (ratingsAvg >= 4.5 & reviewsCount >= 5)
    if (product.ratingsAvg >= 4.5 && product.reviewsCount >= 5) {
      return {
        label: "Best Seller",
        style: "bg-[#561C24]/90 text-[#e8a3ae] border-[#6D2932] shadow-[#6D2932]/50",
      };
    }

    // 3. Popular (reviewsCount >= 8)
    if (product.reviewsCount >= 8) {
      return {
        label: "Popular",
        style: "bg-amber-950/90 text-amber-300 border-amber-600/50 shadow-amber-950/50",
      };
    }

    // 4. Trending (ratingsAvg >= 4.0)
    if (product.ratingsAvg >= 4.0) {
      return {
        label: "Trending",
        style: "bg-indigo-950/90 text-indigo-300 border-indigo-600/50 shadow-indigo-950/50",
      };
    }

    // 5. New (added within last 90 days)
    if (product.createdAt) {
      const createdDate = new Date(product.createdAt);
      const daysOld = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
      if (daysOld <= 90) {
        return {
          label: "New",
          style: "bg-emerald-950/90 text-emerald-300 border-emerald-600/50 shadow-emerald-950/50",
        };
      }
    }

    return null;
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8 animate-pulse">
          <div className="h-4 w-32 bg-slate-850 mx-auto rounded mb-2"></div>
          <div className="h-8 w-64 bg-slate-800 mx-auto rounded"></div>
        </div>
        <div className="flex justify-center gap-6 overflow-hidden py-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[280px] sm:w-[320px] h-[380px] bg-slate-900/60 rounded-3xl border border-slate-850 animate-pulse shrink-0"
            ></div>
          ))}
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-12 sm:py-16 bg-slate-950/60 border-b border-slate-900/80 select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#6D2932]/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8 sm:mb-12">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#e8a3ae] mb-2 font-sans">
          <Sparkles size={14} className="text-[#e8a3ae]" />
          Our Collection
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          Featured Products
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mt-2">
          Explore our most popular items loved by customers, curated for performance & style.
        </p>
      </div>

      {/* Carousel Outer Container */}
      <div className="relative w-full py-4 sm:py-8 min-h-[420px] sm:min-h-[480px]">
        {/* Left Navigation Arrow */}
        <button
          onClick={scrollPrev}
          aria-label="Previous Slide"
          className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 hover:bg-[#6D2932] text-slate-200 hover:text-white border border-slate-800 hover:border-[#e8a3ae]/50 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Right Navigation Arrow */}
        <button
          onClick={scrollNext}
          aria-label="Next Slide"
          className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/90 hover:bg-[#6D2932] text-slate-200 hover:text-white border border-slate-800 hover:border-[#e8a3ae]/50 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Embla Viewport - cursor-grab, touch-pan-y, select-none to enable smooth swipe/drag */}
        <div
          className="overflow-hidden w-full cursor-grab active:cursor-grabbing select-none touch-pan-y"
          ref={emblaRef}
        >
          {/* Embla Container track */}
          <div className="flex touch-pan-y items-center py-6 sm:py-10 -ml-2 sm:-ml-3">
            {products.map((product, index) => {
              const isCenter = index === selectedIndex;
              const badge = getBadge(product);

              return (
                <div
                  key={product._id}
                  onClick={(e) => handleCardClick(e, index, product._id)}
                  className="flex-[0_0_260px] sm:flex-[0_0_290px] md:flex-[0_0_320px] pl-2 sm:pl-3 shrink-0 min-w-0"
                >
                  {/* Inner Card */}
                  <div
                    className={`group relative rounded-3xl overflow-hidden bg-slate-900/90 border transition-all duration-300 ease-out transform flex flex-col justify-between h-[360px] sm:h-[410px] ${
                      isCenter
                        ? "scale-105 sm:scale-108 z-20 opacity-100 -translate-y-2 sm:-translate-y-3 border-[#6D2932] shadow-[0_20px_50px_rgba(109,41,50,0.35)] ring-1 ring-[#e8a3ae]/30"
                        : "scale-92 sm:scale-95 z-10 opacity-60 hover:opacity-85 border-slate-800 shadow-xl cursor-pointer"
                    }`}
                  >
                    {/* Card Top Header: Badge & Wishlist */}
                    <div className="relative p-3 sm:p-4 flex items-center justify-between z-10">
                      <div>
                        {badge ? (
                          <span
                            className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm ${badge.style}`}
                          >
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-0.5">
                            {product.category?.name || "Product"}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleToggleWishlist(e, product._id)}
                        className={`p-2 rounded-full border transition-all duration-300 ${
                          isInWishlist(product._id)
                            ? "bg-red-500/20 border-red-500/50 text-red-500"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-red-400 hover:border-slate-700"
                        }`}
                      >
                        <Heart
                          size={16}
                          className={isInWishlist(product._id) ? "fill-red-500" : ""}
                        />
                      </button>
                    </div>

                    {/* Product Image Container (draggable={false} so image drag doesn't interfere with carousel swipe) */}
                    <div className="relative flex-1 flex items-center justify-center p-3 sm:p-4 overflow-hidden group/img">
                      <img
                        src={
                          product.images && product.images[0]
                            ? product.images[0]
                            : "https://via.placeholder.com/300x300?text=No+Image"
                        }
                        alt={product.name}
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        className={`max-h-[160px] sm:max-h-[200px] w-auto object-contain transition-transform duration-700 ease-out select-none pointer-events-none ${
                          isCenter ? "group-hover/img:scale-110" : ""
                        }`}
                      />
                    </div>

                    {/* Card Bottom Details */}
                    <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-850/80 space-y-3">
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm sm:text-base line-clamp-1 group-hover:text-[#e8a3ae] transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {product.description || "High quality premium product"}
                        </p>
                      </div>

                      {/* Rating & Review */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-200">
                          {product.ratingsAvg ? product.ratingsAvg.toFixed(1) : "4.5"}
                        </span>
                        <span className="text-slate-500 font-medium">
                          ({product.reviewsCount || 0})
                        </span>
                      </div>

                      {/* Price and Add to Cart */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-base sm:text-lg font-extrabold text-slate-100">
                            ₹{product.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <button
                          disabled={product.stock === 0 || addingToCartId === product._id}
                          onClick={(e) => handleAddToCart(e, product)}
                          className={`flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 shadow-md cursor-pointer ${
                            isCenter
                              ? "px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#6D2932] via-[#561C24] to-[#6D2932] hover:brightness-125 text-white shadow-[#6D2932]/40"
                              : "p-2.5 bg-slate-850 hover:bg-[#6D2932] text-slate-200 hover:text-white"
                          }`}
                        >
                          <ShoppingCart size={16} />
                          {isCenter && (
                            <span className="hidden xs:inline">
                              {addingToCartId === product._id ? "Adding..." : "Add to Cart"}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dot Pagination Indicators */}
      <div className="flex items-center justify-center gap-2 mt-2 sm:mt-4">
        {scrollSnaps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === selectedIndex
                ? "w-8 h-2.5 bg-gradient-to-r from-[#6D2932] to-[#e8a3ae] shadow-lg shadow-[#6D2932]/40"
                : "w-2.5 h-2.5 bg-slate-800 hover:bg-slate-600"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default TrendingCarousel;
