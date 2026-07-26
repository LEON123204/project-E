const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing existing collections...');
    await User.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Review.deleteMany();
    await Cart.deleteMany();
    await Wishlist.deleteMany();

    const categories = await Category.insertMany([
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Fashion & Apparel', slug: 'fashion-apparel' },
      { name: 'Home & Living', slug: 'home-living' },
      { name: 'Fitness & Outdoors', slug: 'fitness-outdoors' },
      { name: 'Books & Stationery', slug: 'books-stationery' },
      { name: 'Accessories', slug: 'accessories' },
      { name: 'Skincare', slug: 'skincare' },
      { name: 'Car & Bike Accessories', slug: 'car-bike-accessories' }
    ]);

    const [electronics, fashion, home, fitness, books, accessories, skincare, carBike] = categories;

    console.log('Seeding users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@ecommerce.com',
      password: 'adminpassword',
      role: 'admin',
      addresses: [
        {
          street: '101 Admin Lane',
          city: 'Tech City',
          state: 'CA',
          zipCode: '90001',
          country: 'United States',
          isDefault: true
        }
      ]
    });

    const customerUser = await User.create({
      name: 'John Doe',
      email: 'customer@ecommerce.com',
      password: 'customerpassword',
      role: 'customer',
      addresses: [
        {
          street: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62704',
          country: 'United States',
          isDefault: true
        }
      ]
    });

    const customerUser2 = await User.create({
      name: 'Aarav Mehta',
      email: 'aarav@ecommerce.com',
      password: 'customerpassword',
      role: 'customer'
    });
    const customerUser3 = await User.create({
      name: 'Diya Sen',
      email: 'diya@ecommerce.com',
      password: 'customerpassword',
      role: 'customer'
    });
    const customerUser4 = await User.create({
      name: 'Kabir Singh',
      email: 'kabir@ecommerce.com',
      password: 'customerpassword',
      role: 'customer'
    });

    // Create Carts & Wishlists for seeded users
    await Cart.create({ user: adminUser._id, items: [] });
    await Cart.create({ user: customerUser._id, items: [] });
    await Cart.create({ user: customerUser2._id, items: [] });
    await Cart.create({ user: customerUser3._id, items: [] });
    await Cart.create({ user: customerUser4._id, items: [] });
    await Wishlist.create({ user: adminUser._id, products: [] });
    await Wishlist.create({ user: customerUser._id, products: [] });
    await Wishlist.create({ user: customerUser2._id, products: [] });
    await Wishlist.create({ user: customerUser3._id, products: [] });
    await Wishlist.create({ user: customerUser4._id, products: [] });

    console.log('Seeding products...');
    const productsData = [
      // Electronics
      {
        name: 'Quantum Wireless Headphones',
        description: 'Experience studio-quality audio with advanced active noise cancellation (ANC), 40-hour battery life, and plush memory foam earcups.',
        price: 3499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60'],
        stock: 12
      },
      {
        name: 'Apex Mechanical Keyboard',
        description: 'Tactile blue switches, dynamic RGB backlighting, custom macro keys, and solid aircraft-grade aluminum frame.',
        price: 2499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60'],
        stock: 15
      },
      {
        name: 'Horizon Smart Watch V4',
        description: 'Track your heart rate, sleep quality, daily steps, and receive call notifications directly on a beautiful 1.4-inch AMOLED display.',
        price: 3999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60'],
        stock: 3 // Low stock item
      },
      {
        name: 'Nomad Portable Power Bank',
        description: '20,000mAh external battery packs with high-speed USB-C Power Delivery charging. Charges up to 3 devices simultaneously.',
        price: 1499.00,
        category: electronics._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080244/nomad_power_bank_kzz5d5.jpg'],
        stock: 50
      },
      {
        name: 'Vivid LED Ring Light',
        description: 'Perfect for content creators, stream, or makeup setup. Features 10 brightness levels and 3 color temperature settings.',
        price: 899.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&auto=format&fit=crop&q=60'],
        stock: 2 // Low stock item
      },
      {
        name: 'Nova Soundbar X300',
        description: 'Cinematic audio with dual subwoofers, Bluetooth 5.2, optical/HDMI connections, and custom equalizer settings for room-filling sound.',
        price: 4499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'AeroFocus HD Webcam',
        description: '1080p 60fps streaming webcam with autofocus, dual stereo microphones, privacy cover, and flexible mounting clip.',
        price: 1899.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1623949556303-b0d17d198863?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8d2ViY2FtfGVufDB8fDB8fHww'],
        stock: 25
      },
      {
        name: 'Lumina RGB Desk Mat',
        description: 'Extra-large gaming mouse pad featuring 12 dynamic RGB lighting modes, water-resistant micro-texture cloth surface, and non-slip rubber base.',
        price: 799.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Orbit Wireless Ergonomic Mouse',
        description: 'Vertical ergonomic mouse designed to reduce wrist strain. Features silent clicks, adjustable DPI (800-2400), and dual Bluetooth/USB-receiver connectivity.',
        price: 1299.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60'],
        stock: 18
      },

      // Fashion & Apparel
      {
        name: 'Classic Leather Jacket',
        description: 'Crafted from 100% premium full-grain lambskin leather. Tailored modern fit with durable gunmetal zippers.',
        price: 4999.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=60'],
        stock: 8
      },
      {
        name: 'Minimalist Canvas Backpack',
        description: 'Water-resistant wax-coated canvas with genuine leather trim. Includes padded sleeve for up to 15.6-inch laptop.',
        price: 1499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=60'],
        stock: 20
      },
      {
        name: 'Comfort-Fit Denim Jeans',
        description: 'Classic straight-leg style made with soft organic cotton blend denim. Subtle stretch for day-long comfort.',
        price: 1299.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=60'],
        stock: 25
      },
      {
        name: 'Urban Knit Sneakers',
        description: 'Breathable flyknit upper with ultra-responsive cushioned midsole. Designed for street wear and lightweight runs.',
        price: 1899.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=60'],
        stock: 4 // Low stock item
      },
      {
        name: 'Cozy Woolen Scarf',
        description: 'Luxurious merino wool scarf in a neutral gray color palette. Lightweight yet exceptionally warm for chilly winter months.',
        price: 599.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=60'],
        stock: 14
      },

      // Home & Living
      {
        name: 'Aromatic Oil Diffuser',
        description: 'Ultrasonic cool mist essential oil diffuser with 7 rotating LED color lights, auto-shutoff protection and quiet whisper technology.',
        price: 799.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Chef Prime Cast Iron Skillet',
        description: 'Pre-seasoned 12-inch heavy-duty cast iron pan. Perfect for searing, baking, broiling, frying, or grilling on gas, electric, or induction stovetops.',
        price: 1299.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Boho Linen Throw Pillows (Set of 2)',
        description: 'Premium textured linen pillow covers with invisible zipper closure. Enhances any modern farmhouse or bohemian decor.',
        price: 599.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Ergonomic Desk Chair',
        description: 'High-back mesh office chair featuring adjustable lumbar support, 3D armrests, and dynamic reclining mechanism.',
        price: 4999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800&auto=format&fit=crop&q=60'],
        stock: 5 // Low stock item
      },
      {
        name: 'Ceramic Pour-Over Coffee Maker',
        description: 'Brew clean, full-bodied coffee directly at home. Made of double-walled heat insulating ceramic material.',
        price: 799.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=60'],
        stock: 18
      },

      // Fitness & Outdoors
      {
        name: 'Titanium Hydro Flask (32oz)',
        description: 'Double-wall vacuum-insulated stainless steel water bottle. Keeps drinks icy cold for 24 hours or hot for 12.',
        price: 999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'Eco-Friendly TPE Yoga Mat',
        description: 'Non-slip textured surface provides optimum grip, 6mm thickness offers cushion, and organic TPE is free of toxic PVC.',
        price: 799.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800&auto=format&fit=crop&q=60'],
        stock: 22
      },
      {
        name: 'Iron Grip Kettlebell (15 lbs)',
        description: 'Solid cast iron construction with powder-coated finish for secure, textured grip. Flat base prevents rolling during workouts.',
        price: 1299.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&auto=format&fit=crop&q=60'],
        stock: 15
      },
      {
        name: 'Outlander 2-Person Camping Tent',
        description: 'Waterproof PU coating, mesh windows for ventilation, lightweight aluminum poles, and easy 5-minute setup design.',
        price: 2999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop&q=60'],
        stock: 6
      },
      {
        name: 'Hydration Running Belt',
        description: 'Adjustable elastic waistband with zip compartment for keys/phones, and two dedicated slots for mini water bottles.',
        price: 499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=60'],
        stock: 1 // Low stock item
      },

      // Books & Stationery
      {
        name: 'Aesthetic Leather Dotted Journal',
        description: 'Hardcover journal with 160 pages of thick 120gsm paper. Includes pen loop, pocket divider, and elegant ribbon bookmarks.',
        price: 499.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&auto=format&fit=crop&q=60'],
        stock: 45
      },
      {
        name: 'Fineliner Color Pen Set (24 colors)',
        description: '0.4mm metal-clad tip fine liners for bullet journaling, sketching, manga drawing, note-taking, or coloring.',
        price: 399.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=60'],
        stock: 19
      },
      {
        name: 'Atomic Habits (Hardcover)',
        description: 'An easy and proven way to build good habits and break bad ones. Written by James Clear, this bestseller has sold millions worldwide.',
        price: 399.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=60'],
        stock: 50
      },
      {
        name: 'Zen Bamboo Desk Organizer',
        description: 'Multi-compartment storage system crafted from sustainable natural bamboo. Tidies up pens, notes, clips, and letters.',
        price: 699.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Sleek Fountain Pen (Matte Black)',
        description: 'Precision fine nib, converter included for bottled ink. Comes in a gorgeous velvet padded presentation case.',
        price: 799.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=60'],
        stock: 4 // Low stock item
      },
      // Accessories
      {
        name: 'Minimalist Leather Wallet',
        description: 'Slim, bi-fold pocket wallet crafted from genuine full-grain leather. Features RFID-blocking technology and 6 card slots.',
        price: 999.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080005/leather_wallet_itvez3.jpg'],
        stock: 25
      },
      {
        name: 'Polarized Retro Sunglasses',
        description: 'Classic horn-rimmed frame style with UV400 polarized lenses that reduce glare and protect your eyes in style.',
        price: 699.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079843/polarized_sunglasses_qmwa3m.jpg'],
        stock: 15
      },
      {
        name: 'Braided Leather Wristband',
        description: 'Handcrafted braided genuine leather bracelet with a magnetic stainless steel clasp. Sleek everyday accessory.',
        price: 399.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080236/leather_wristband_js05e0.jpg'],
        stock: 30
      },
      {
        name: 'Urban Tech Organizer Pouch',
        description: 'Water-repellent travel case for cables, chargers, memory cards, and external hard drives. Compact and durable.',
        price: 799.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079967/tech_organizer_t5jpfi.jpg'],
        stock: 20
      },
      {
        name: 'Classic Silk Necktie',
        description: 'Woven from 100% pure premium silk. Modern width and subtle micro-pattern design perfect for formal or business settings.',
        price: 699.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079846/silk_tie_sol0rx.jpg'],
        stock: 12
      },
      // Skincare
      {
        name: 'Hydrating Hyaluronic Acid Serum',
        description: 'Intense moisture booster formulated with pure hyaluronic acid and Vitamin B5. Plumps skin and smooths fine lines.',
        price: 699.00,
        category: skincare._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080010/hyaluronic_serum_tzncnp.jpg'],
        stock: 30
      },
      {
        name: 'Organic Rosewater Facial Toner',
        description: '100% pure distilled rose petals. Alcohol-free mist that hydrates, balances, and refreshes all skin types.',
        price: 399.00,
        category: skincare._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079848/rosewater_toner_cberhe.jpg'],
        stock: 40
      },
      {
        name: 'Whipped Shea Butter Body Cream',
        description: 'Deeply moisturizing body butter infused with organic cocoa butter, sweet almond oil, and cold-pressed coconut oil.',
        price: 499.00,
        category: skincare._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079953/shea_body_cream_ssytwg.jpg'],
        stock: 25
      },
      {
        name: 'Gentle Foaming Cleanser',
        description: 'pH-balanced daily face wash with calming chamomile and green tea extract. Cleanses without stripping moisture.',
        price: 399.00,
        category: skincare._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080018/foaming_cleanser_zudtmd.jpg'],
        stock: 35
      },
      {
        name: 'Mineral SPF 30 Sunscreen',
        description: 'Broad-spectrum zinc oxide protection. Lightweight, non-greasy formula that leaves a clean, natural matte finish.',
        price: 599.00,
        category: skincare._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080236/mineral_sunscreen_e994bk.jpg'],
        stock: 20
      },
      // Car & Bike Accessories
      {
        name: 'Carbon Fiber Steering Wheel Cover',
        description: 'Premium non-slip carbon fiber texture steering wheel cover. Fits most standard 15-inch steering wheels, providing sporty looks and excellent grip.',
        price: 799.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079878/steering_wheel_cover_eyqzm7.jpg'],
        stock: 25
      },
      {
        name: 'Ultra-Bright LED Bike Light Set',
        description: 'High-intensity rechargeable LED headlight and taillight set. Waterproof design with multiple light modes for safer night riding.',
        price: 699.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080231/led_bike_light_fpcxun.jpg'],
        stock: 40
      },
      {
        name: 'Heavy-Duty U-Lock Bike Lock',
        description: 'Hardened steel shackles resist cutting and leverage attacks. Features a dust cover and dual keys for ultimate bicycle security.',
        price: 1299.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079870/u_lock_bike_lock_llvu4g.jpg'],
        stock: 15
      },
      {
        name: 'Premium Car Seat Back Organizer',
        description: 'Multi-pocket storage organizer featuring a touchscreen tablet holder, water bottle mesh pockets, and durable oxford cloth backing.',
        price: 899.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080020/car_seat_organizer_pyokrw.jpg'],
        stock: 30
      },
      {
        name: 'MagSafe Car Vent Phone Mount',
        description: 'Ultra-strong N52 neodymium magnets securely hold your iPhone/Android phone on bumpy roads. Fits most standard horizontal/vertical car vents.',
        price: 599.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079962/car_phone_mount_aangqi.jpg'],
        stock: 50
      },
      {
        name: 'Portable Digital Tire Inflator',
        description: 'Smart cordless air compressor with digital pressure gauge, auto-stop function, and LED flashlight. Fills car, bike, and sports ball tires in minutes.',
        price: 1499.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079868/tire_inflator_jqfyjt.jpg'],
        stock: 20
      },
      {
        name: 'Premium Foam Car Wash Cannon',
        description: 'High-pressure adjustable foam lance with 1-liter bottle. Attaches to pressure washer for thick snow foam cleaning of vehicles.',
        price: 999.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079975/foam_cannon_aihuzu.jpg'],
        stock: 15
      },
      {
        name: 'Waterproof Bike Frame Bag',
        description: 'Touchscreen-friendly top tube bag with sun visor, headphone hole, and large capacity storage for keys, wallet, and cycling accessories.',
        price: 699.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785079984/bike_frame_bag_eouqug.jpg'],
        stock: 25
      },
      {
        name: 'Anti-Theft GPS Vehicle Tracker',
        description: 'Real-time mini magnetic GPS tracking device for cars, motorcycles, and bikes. Supports mobile app geofencing alerts and historical route recording.',
        price: 1899.00,
        category: carBike._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1785080008/gps_tracker_fsrapt.jpg'],
        stock: 10
      }
    ];

    const seededProducts = await Product.insertMany(productsData);

    console.log('Seeding reviews...');
    const reviewers = [customerUser, customerUser2, customerUser3, customerUser4];
    const commentPool = {
      electronics: [
        'Absolutely hands down the best gadget I have owned! Extremely high build quality.',
        'Decent performance, but pricing could be slightly lower. Fits my desk setup perfectly.',
        'Super fast shipping and great customer experience. Highly recommend!',
        'Works exactly as advertised. Clean packaging and easy to use.',
        'Good battery life and durable materials. Worth the buy.'
      ],
      fashion: [
        'Very comfortable fit and the fabric feels premium. Will buy in other colors.',
        'Looks exactly like the product photos. Sizing is true to fit.',
        'Solid value for money, stitching is very clean.',
        'Nice styling, perfect for casual wear. Highly recommended!',
        'Very soft material and holds up well after multiple washes.'
      ],
      home: [
        'Really enhances the room atmosphere. Quiet and operates beautifully.',
        'Heavy-duty quality and easy to clean. Exceeded my expectations.',
        'Perfect addition to my modern home decor. Guests always compliment it.',
        'Functional and elegant. Definitely worth the price.',
        'Great packaging, fast delivery, and premium finish.'
      ],
      fitness: [
        'Optimum grip and high-durability material. Does not slip during intense workouts.',
        'Excellent insulation, keeps drinks cold all day.',
        'Solid weight and clean finish. Flat base is very convenient.',
        'Easy to set up and very lightweight to carry. Perfect for weekend trips.',
        'Comfortable fit and very convenient. Ideal for runs.'
      ],
      books: [
        'High-quality thick paper and beautiful hardcover. Pen loop is a great touch.',
        'Excellent selection of colors and fine tips. Perfect for detailing and sketches.',
        'Life-changing read, very practical insights. Recommended to all my friends.',
        'Sustainable material and keeps my desk clean and organized. Very sturdy.',
        'Writes extremely smoothly and has a comfortable grip. Beautiful presentation.'
      ],
      accessories: [
        'Sleek design, fits easily in pockets. RFID block works perfectly.',
        'Reduces glare nicely and looks retro and cool. Sturdy frame.',
        'Handcrafted leather with a secure magnetic clasp. Great everyday look.',
        'Fits all my cables, chargers, and SD cards securely. High-quality zip.',
        'Pure premium silk. Pattern looks rich and pairs well with dark suits.'
      ],
      skincare: [
        'Deeply hydrating and leaves skin feeling plump and refreshed.',
        'Balanced, alcohol-free toner that refreshes instantly. Amazing fragrance.',
        'Deeply moisturizing and non-greasy. Works wonders for dry skin.',
        'Calming daily face wash that cleanses cleanly without stripping.',
        'Lightweight, matte finish mineral sunscreen with zero white cast.'
      ],
      carBike: [
        'Premium non-slip texture. Adds a sporty aesthetic and feels great.',
        'Very bright headlight and taillight. Safer night rides guaranteed.',
        'Heavy-Duty steel shackle, very secure. Highly protective.',
        'Holds tablet and water bottles neatly. Keeps back seat organized.',
        'Ultra-strong magnets, keeps phone secure even on bumpy roads.',
        'Smart cordless air compressor. Auto-stops accurately. A lifesaver!',
        'Produces rich snow foam. Easy to connect and adjust.',
        'Waterproof bike frame bag. Touchscreen works perfectly through the visor.',
        'Easy setup, magnetic base, and accurate GPS tracking.'
      ],
      general: [
        'Solid product. Met all my expectations.',
        'Quality is decent, gets the job done.',
        'Very happy with the purchase, would buy again!',
        'Very fast delivery and secure packaging.',
        'Great customer support and high-quality build.'
      ]
    };

    const getPoolKey = (categoryOid) => {
      const idStr = categoryOid.toString();
      if (idStr === electronics._id.toString()) return 'electronics';
      if (idStr === fashion._id.toString()) return 'fashion';
      if (idStr === home._id.toString()) return 'home';
      if (idStr === fitness._id.toString()) return 'fitness';
      if (idStr === books._id.toString()) return 'books';
      if (idStr === accessories._id.toString()) return 'accessories';
      if (idStr === skincare._id.toString()) return 'skincare';
      if (idStr === carBike._id.toString()) return 'carBike';
      return 'general';
    };

    for (const prod of seededProducts) {
      const reviewCount = Math.floor(Math.random() * 3) + 2; 
      const shuffledReviewers = [...reviewers].sort(() => 0.5 - Math.random());
      const poolKey = getPoolKey(prod.category);
      const comments = commentPool[poolKey] || commentPool.general;

      for (let i = 0; i < reviewCount; i++) {
        const reviewer = shuffledReviewers[i];
        const rating = Math.floor(Math.random() * 3) + 3; 
        const comment = comments[Math.floor(Math.random() * comments.length)];
        
        await Review.create({
          user: reviewer._id,
          product: prod._id,
          rating,
          comment
        });
      }
    }

    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
