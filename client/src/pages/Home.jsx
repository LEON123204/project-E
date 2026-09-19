import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { Heart, ShoppingCart, Star, ArrowRight, Truck } from "lucide-react";
import { ProductCardSkeleton } from "../components/SkeletonLoader";
import useScrollReveal from "../hooks/useScrollReveal";
import { motion } from "framer-motion";

// Custom Count-Up Counter component using IntersectionObserver
const AnimatedCounter = ({ target, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let start = 0;
    const end = parseInt(target, 10);
    if (isNaN(end) || start === end) return;

    const totalMiliseconds = duration;
    // Calculate increment steps to reach target within total time
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);

    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [hasStarted, target, duration]);

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <span ref={elementRef}>
      {formatNumber(count)}
      {suffix}
    </span>
  );
};

const Home = () => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [heroProducts, setHeroProducts] = useState([
    {
      _id: "default-1",
      name: "Nomad Portable Power Bank",
      price: 1499.0,
      images: [
        "https://res.cloudinary.com/c9trtuqh/image/upload/v1785080244/nomad_power_bank_kzz5d5.jpg",
      ],
    },
    {
      _id: "default-2",
      name: "Minimalist Leather Wallet",
      price: 1499.0,
      images: [
        "https://res.cloudinary.com/c9trtuqh/image/upload/v1785080005/leather_wallet_itvez3.jpg",
      ],
    },
    {
      _id: "default-3",
      name: "Urban Tech Organizer Pouch",
      price: 1899.0,
      images: [
        "https://res.cloudinary.com/c9trtuqh/image/upload/v1785079967/tech_organizer_t5jpfi.jpg",
      ],
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [totalProductsCount, setTotalProductsCount] = useState(48);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  // Scroll reveal observers
  const [categoriesRef, categoriesVisible] = useScrollReveal({
    threshold: 0.1,
    triggerOnce: true,
  });
  const [statsRef, statsVisible] = useScrollReveal({
    threshold: 0.15,
    triggerOnce: true,
  });
  const [productsRef, productsVisible] = useScrollReveal({
    threshold: 0.05,
    triggerOnce: true,
  });

  useEffect(() => {
    const fetchTrendingProducts = async () => {
      try {
        const response = await api.get("/products?limit=12&sort=newest");
        const allProducts = response.data.products;
        setProducts(allProducts.slice(0, 4));
        if (response.data && typeof response.data.totalProducts === "number") {
          setTotalProductsCount(response.data.totalProducts);
        }

        // Find products that have Cloudinary images
        const cloudinaryProducts = allProducts.filter(
          (p) =>
            p.images && p.images[0] && p.images[0].includes("cloudinary.com"),
        );
        if (cloudinaryProducts.length >= 3) {
          setHeroProducts(cloudinaryProducts.slice(0, 3));
        } else if (allProducts.length >= 3) {
          setHeroProducts(allProducts.slice(0, 3));
        }
      } catch (err) {
        console.error("Error loading trending products:", err);
        setError("Could not load trending products");
      } finally {
        setLoading(false);
      }
    };
    fetchTrendingProducts();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentlyViewed");
      if (stored) {
        setRecentlyViewed(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading recently viewed:", err);
    }
  }, []);

  const handleAddToCart = async (product) => {
    setAddingToCartId(product._id);
    const res = await addToCart(product, 1);
    setAddingToCartId(null);
    if (!res.success) {
      alert(res.message);
    }
  };

  const categories = [
    {
      name: "Electronics",
      slug: "electronics",
      desc: "Noise cancelling gear, mechanical keyboards, smart watches",
      img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60",
    },
    {
      name: "Fashion & Apparel",
      slug: "fashion-apparel",
      desc: "Premium leather, denim, backpacks, and knitwear",
      img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=60",
    },
    {
      name: "Home & Living",
      slug: "home-living",
      desc: "Diffusers, iron skillets, linens, and desk chairs",
      img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=60",
    },
    {
      name: "Fitness & Outdoors",
      slug: "fitness-outdoors",
      desc: "Hydration flasks, yoga mats, kettlebells, and tents",
      img: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&auto=format&fit=crop&q=60",
    },
    {
      name: "Books & Stationery",
      slug: "books-stationery",
      desc: "Dotted journals, fineliners, organizers, and fountain pens",
      img: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&auto=format&fit=crop&q=60",
    },
    {
      name: "Accessories",
      slug: "accessories",
      desc: "Premium wallets, polarized sunglasses, and silk ties",
      img: "https://res.cloudinary.com/c9trtuqh/image/upload/v1785080005/leather_wallet_itvez3.jpg",
    },
    {
      name: "Skincare",
      slug: "skincare",
      desc: "Hyaluronic serums, organic face wash, and body creams",
      img: "https://res.cloudinary.com/c9trtuqh/image/upload/v1785080010/hyaluronic_serum_tzncnp.jpg",
    },
    {
      name: "Car & Bike Accessories",
      slug: "car-bike-accessories",
      desc: "Phone mounts, steering covers, U-locks, and bike lights",
      img: "https://res.cloudinary.com/c9trtuqh/image/upload/v1785079962/car_phone_mount_aangqi.jpg",
    },
  ];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen pb-16 overflow-x-hidden w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 py-6 sm:py-14 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.1),transparent_60%)] -z-10 blur-3xl"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left antialiased">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-400 font-sans mb-3 sm:mb-6"
            >
              <Truck size={12} className="text-indigo-400" />
              Free Shipping on Orders Over ₹1,000
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[1.6rem] leading-[1.2] xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 mb-3 sm:mb-8"
            >
              Elevate Your Daily{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent inline-block pb-1">
                Workspace & Lifestyle
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-lg leading-[1.65] text-slate-400 max-w-lg mb-4 sm:mb-10 font-normal"
            >
              Discover a curated collection of premium accessories, apparel, and
              gadgets designed to optimize your workflow and comfort.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-row gap-3 w-full sm:w-auto justify-start"
            >
              <Link
                to="/shop"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 sm:py-3 sm:px-8 rounded-full shadow-lg shadow-indigo-600/30 transition-smooth flex items-center justify-center gap-2 group text-sm sm:text-base"
              >
                Browse Shop
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <a
                href="#categories"
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 font-semibold py-2.5 px-5 sm:py-3 sm:px-8 rounded-full transition-smooth flex items-center justify-center text-sm sm:text-base"
              >
                Categories
              </a>
            </motion.div>
          </div>

          {/* Right Collage Column — Mobile: single centered card; sm+: full stacked collage */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            {/* ── MOBILE LAYOUT: single card, full width, aspect ratio ── */}
            <div className="flex sm:hidden w-full gap-3 px-2">
              {heroProducts[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex-1 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 group aspect-[3/4] max-h-[220px]"
                >
                  <Link
                    to={
                      heroProducts[0]._id.startsWith("default-")
                        ? "/shop"
                        : `/product/${heroProducts[0]._id}`
                    }
                    className="block w-full h-full relative"
                  >
                    <img
                      src={heroProducts[0].images[0]}
                      alt={heroProducts[0].name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] font-bold text-slate-100 truncate">
                        {heroProducts[0].name}
                      </p>
                      <p className="text-[10px] font-semibold text-indigo-400">
                        ₹{heroProducts[0].price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )}
              {heroProducts[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                  className="flex-1 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 group aspect-[3/4] max-h-[220px]"
                >
                  <Link
                    to={
                      heroProducts[1]._id.startsWith("default-")
                        ? "/shop"
                        : `/product/${heroProducts[1]._id}`
                    }
                    className="block w-full h-full relative"
                  >
                    <img
                      src={heroProducts[1].images[0]}
                      alt={heroProducts[1].name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] font-bold text-slate-100 truncate">
                        {heroProducts[1].name}
                      </p>
                      <p className="text-[10px] font-semibold text-indigo-400">
                        ₹{heroProducts[1].price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>

            {/* ── SM+ LAYOUT: overlapping collage ── */}
            <div className="hidden sm:block relative w-full max-w-[280px] md:max-w-[360px] h-[300px] md:h-[400px]">
              {/* Back Card (Top Right) */}
              {heroProducts[1] && (
                <motion.div
                  initial={{ opacity: 0, x: 60, y: -30, rotate: 0 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 8 }}
                  transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
                  className="absolute top-[5%] right-[-5%] lg:right-[-10%] w-[150px] h-[200px] md:w-[190px] md:h-[250px] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 z-10 group"
                >
                  <Link
                    to={
                      heroProducts[1]._id.startsWith("default-")
                        ? "/shop"
                        : `/product/${heroProducts[1]._id}`
                    }
                    className="block w-full h-full relative"
                  >
                    <img
                      src={heroProducts[1].images[0]}
                      alt={heroProducts[1].name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition-smooth"></div>
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 z-20">
                      <p className="text-[9px] font-bold text-slate-100 truncate">
                        {heroProducts[1].name}
                      </p>
                      <p className="text-[9px] font-semibold text-indigo-400">
                        ₹{heroProducts[1].price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Main Center Card */}
              {heroProducts[0] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                  className="absolute top-[15%] left-[10%] w-[180px] h-[240px] md:w-[220px] md:h-[300px] rounded-2xl overflow-hidden border border-slate-750/90 shadow-2xl bg-slate-900 z-20 group"
                >
                  <Link
                    to={
                      heroProducts[0]._id.startsWith("default-")
                        ? "/shop"
                        : `/product/${heroProducts[0]._id}`
                    }
                    className="block w-full h-full relative"
                  >
                    <img
                      src={heroProducts[0].images[0]}
                      alt={heroProducts[0].name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-slate-950/15 group-hover:bg-slate-950/0 transition-smooth"></div>
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-xl p-2.5 z-20">
                      <p className="text-[10px] font-bold text-slate-100 truncate">
                        {heroProducts[0].name}
                      </p>
                      <p className="text-[10px] font-semibold text-indigo-400">
                        ₹{heroProducts[0].price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Front Card (Bottom Left) */}
              {heroProducts[2] && (
                <motion.div
                  initial={{ opacity: 0, x: -60, y: 30, rotate: 0 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: -8 }}
                  transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
                  className="absolute bottom-[5%] left-[-10%] lg:left-[-15%] w-[140px] h-[190px] md:w-[170px] md:h-[230px] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 z-30 group"
                >
                  <Link
                    to={
                      heroProducts[2]._id.startsWith("default-")
                        ? "/shop"
                        : `/product/${heroProducts[2]._id}`
                    }
                    className="block w-full h-full relative"
                  >
                    <img
                      src={heroProducts[2].images[0]}
                      alt={heroProducts[2].name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/0 transition-smooth"></div>
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl p-2 z-20">
                      <p className="text-[9px] font-bold text-slate-100 truncate">
                        {heroProducts[2].name}
                      </p>
                      <p className="text-[9px] font-semibold text-indigo-400">
                        ₹{heroProducts[2].price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section
        ref={categoriesRef}
        id="categories"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-16"
      >
        <div
          className={`transition-all duration-1000 ease-out transform ${categoriesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <div className="text-center md:text-left mb-10 flex flex-col md:flex-row items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
                Shop by Category
              </h2>
              <p className="text-slate-500 mt-2">
                Find exactly what you need to upgrade your style and
                surroundings.
              </p>
            </div>
            <Link
              to="/shop"
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 text-sm transition-smooth group"
            >
              Browse all categories
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, index) => (
              <Link
                key={cat.slug}
                to={`/shop?category=${cat.slug}`}
                style={{
                  transitionDelay: categoriesVisible
                    ? `${index * 75}ms`
                    : "0ms",
                }}
                className={`group relative h-80 rounded-2xl overflow-hidden border border-slate-900 shadow-2xl flex flex-col justify-end p-6 hover:border-indigo-500/30 transition-all duration-700 transform ${
                  categoriesVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-12"
                } hover:-translate-y-2 hover:shadow-indigo-950/60`}
              >
                {/* Overlay background */}
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-smooth z-10"></div>
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                {/* Content */}
                <div className="z-20 space-y-2">
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-smooth">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        ref={statsRef}
        className="bg-slate-900/20 border-y border-slate-900/60 py-16 my-8"
      >
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out transform ${statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-indigo-400">
                <AnimatedCounter target={10000} suffix="+" />
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Happy Customers
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-purple-400">
                <AnimatedCounter target={totalProductsCount} suffix="+" />
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Premium Products
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-pink-400">
                <AnimatedCounter target={25} suffix="+" />
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Stores Nationwide
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-400">
                24/7
              </p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Expert Support
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section
        ref={productsRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div
          className={`transition-all duration-1000 ease-out transform ${productsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <div className="text-center md:text-left mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-sans">
              New Arrivals
            </h2>
            <p className="text-slate-500 mt-2">
              Explore the freshest additions to our inventory, hot off the
              shelves.
            </p>
          </div>

          {error && <p className="text-rose-400 text-center">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product, index) => (
                <div
                  key={product._id}
                  style={{
                    transitionDelay: productsVisible
                      ? `${index * 100}ms`
                      : "0ms",
                  }}
                  className={`group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between h-[20rem] sm:h-[25rem] transition-all duration-700 transform ${
                    productsVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-12"
                  } hover:-translate-y-2 hover:shadow-indigo-950/50`}
                >
                  {/* Image and Wishlist button */}
                  <div className="relative h-36 sm:h-48 bg-slate-950 overflow-hidden">
                    <Link to={`/product/${product._id}`}>
                      <img
                        src={
                          product.images[0] ||
                          "https://via.placeholder.com/300x200?text=No+Image"
                        }
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                    </Link>
                    <button
                      onClick={() => toggleWishlist(product._id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 border border-slate-850 hover:bg-slate-900 text-slate-300 hover:text-red-400 transition-smooth z-20"
                    >
                      <Heart
                        size={16}
                        className={
                          isInWishlist(product._id)
                            ? "fill-red-500 text-red-500"
                            : ""
                        }
                      />
                    </button>
                    {product.stock <= 5 && product.stock > 0 && (
                      <span className="absolute bottom-3 left-3 text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 py-0.5 px-2 rounded-full font-semibold">
                        Only {product.stock} left!
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute bottom-3 left-3 text-[10px] bg-red-500/20 border border-red-500/40 text-red-400 py-0.5 px-2 rounded-full font-semibold">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Info & Add-to-cart */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {product.category?.name || "Category"}
                      </span>
                      <Link to={`/product/${product._id}`} className="block">
                        <h3 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 transition-smooth text-sm">
                          {product.name}
                        </h3>
                      </Link>
                      {/* Star Rating summary */}
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Star
                          size={12}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span className="font-semibold text-slate-200">
                          {product.ratingsAvg.toFixed(1)}
                        </span>
                        <span className="text-slate-500">
                          ({product.reviewsCount})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-base font-extrabold text-slate-100">
                        ₹{product.price.toFixed(2)}
                      </span>
                      <button
                        disabled={
                          product.stock === 0 || addingToCartId === product._id
                        }
                        onClick={() => handleAddToCart(product)}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2.5 rounded-full transition-smooth shadow-lg shadow-indigo-600/10 disabled:shadow-none cursor-pointer"
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-900/60 mt-8">
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-6 sm:mb-8">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {recentlyViewed.map((item) => (
              <Link
                key={item._id}
                to={`/product/${item._id}`}
                className="group bg-slate-900/30 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 rounded-xl overflow-hidden p-3 shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-2.5"
              >
                <div className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden">
                  <img
                    src={
                      item.images[0] ||
                      "https://via.placeholder.com/300x200?text=No+Image"
                    }
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-200 line-clamp-1 group-hover:text-indigo-400 text-xs transition-smooth">
                    {item.name}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-100">
                      ₹{item.price.toLocaleString("en-IN")}
                    </span>
                    {item.ratingsAvg > 0 && (
                      <div className="flex items-center gap-0.5 text-slate-400 text-[10px]">
                        <Star
                          size={8}
                          className="fill-amber-400 text-amber-400"
                        />
                        <span className="font-semibold text-slate-300">
                          {item.ratingsAvg.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
