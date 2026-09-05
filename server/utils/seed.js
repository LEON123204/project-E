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
        stock: 12,
        discountPercent: 15
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
        stock: 3, // Low stock item
        discountPercent: 20
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
        stock: 30,
        discountPercent: 25
      },
      {
        name: 'Orbit Wireless Ergonomic Mouse',
        description: 'Vertical ergonomic mouse designed to reduce wrist strain. Features silent clicks, adjustable DPI (800-2400), and dual Bluetooth/USB-receiver connectivity.',
        price: 1299.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60'],
        stock: 18
      },
      // Newly added Electronics items for coverage and search capability
      {
        name: 'AeroWire Bass Earphones',
        description: 'Wired in-ear earphones with deep bass, tangle-free cable, inline microphone, and 3.5mm gold-plated jack.',
        price: 399.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=60'],
        stock: 45
      },
      {
        name: 'TuneFit Wired Earbuds',
        description: 'Ergonomic wired earbuds featuring high-fidelity sound, noise-isolating design, and one-button remote control.',
        price: 699.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'SonicPulse True Wireless Earbuds',
        description: 'Bluetooth 5.3 wireless earbuds with touch controls, IPX5 water resistance, and 24-hour playback with case.',
        price: 1499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=60'],
        stock: 25,
        discountPercent: 10
      },
      {
        name: 'AuraBuds Pro Active ANC Earbuds',
        description: 'Premium wireless earbuds with Hybrid Active Noise Cancellation, transparency mode, wireless charging, and ultra-low latency.',
        price: 3499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 15
      },
      {
        name: 'VividView 22-inch Office Monitor',
        description: 'Full HD (1920x1080) office monitor with 75Hz refresh rate, ultra-slim bezel, HDMI/VGA inputs, and eye-care technology.',
        price: 6499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'HorizonSync 24-inch IPS Monitor',
        description: '24-inch borderless IPS display with 100Hz refresh rate, AMD FreeSync, built-in speakers, and height-adjustable stand.',
        price: 9999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=800&auto=format&fit=crop&q=60'],
        stock: 8,
        discountPercent: 5
      },
      {
        name: 'ApexGlide 27-inch 165Hz Gaming Monitor',
        description: '27-inch curved QHD gaming monitor, 1ms response time, HDR10 support, and dynamic G-Sync compatibility for smooth gameplay.',
        price: 14499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=800&auto=format&fit=crop&q=60'],
        stock: 6
      },
      {
        name: 'UltraSharp 34-inch Curved 4K Monitor',
        description: '34-inch ultrawide curved monitor with 4K resolution, 99% sRGB color gamut, USB-C Power Delivery, and multi-device hub functionality.',
        price: 29999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&auto=format&fit=crop&q=60'],
        stock: 4,
        discountPercent: 10
      },
      {
        name: 'AspireBook 14 Student Laptop',
        description: 'Lightweight student laptop with Intel Core i3, 8GB RAM, 256GB SSD, 14-inch Full HD display, and long 10-hour battery life.',
        price: 27999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=60'],
        stock: 5
      },
      {
        name: 'AeroBook Slim Ultra Thin Laptop',
        description: 'Premium thin & light laptop, AMD Ryzen 5, 16GB LPDDR4X, 512GB NVMe SSD, backlit keyboard, and fingerprint scanner.',
        price: 45999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60'],
        stock: 7,
        discountPercent: 8
      },
      {
        name: 'TitanForge 15 RTX Gaming Laptop',
        description: 'High-performance gaming beast with Intel Core i7, NVIDIA RTX 4060, 16GB DDR5 RAM, 1TB SSD, and 144Hz display.',
        price: 74999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=60'],
        stock: 3
      },
      {
        name: 'ErgoLift Aluminum Laptop Stand',
        description: 'Adjustable, ergonomic laptop stand made of premium aluminum. Features non-slip silicone pads and heat-dissipating open design.',
        price: 999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Nomad Protective Laptop Sleeve',
        description: 'Water-resistant, padded laptop bag with soft fleece lining, front storage pocket for charger/mouse, and corner armor protection.',
        price: 799.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=60'],
        stock: 50
      },
      {
        name: 'StreamPro 1080p Basic Webcam',
        description: 'Full HD 1080p webcam with auto-light correction, built-in noise-reducing microphone, and universal mounting clip.',
        price: 999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=60'],
        stock: 20
      },
      {
        name: 'AeroFocus 4K Pro UltraHD Webcam',
        description: 'Professional 4K streaming webcam with 5x digital zoom, dual noise-cancelling mics, autofocus, and adjustable tripod mount.',
        price: 3499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&auto=format&fit=crop&q=60'],
        stock: 12,
        discountPercent: 15
      },
      {
        name: 'ConnectX 4-in-1 USB Hub',
        description: 'Compact USB hub converting one USB-A/C port into four USB 3.0 ports with transfer speeds up to 5Gbps.',
        price: 499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: 'MultiPort 7-in-1 USB-C Hub',
        description: 'Versatile USB-C hub with 4K HDMI, USB-C Power Delivery, SD/TF card readers, and 3 USB 3.0 data ports.',
        price: 1499.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'LinkStation Dual-Monitor Docking Station',
        description: 'Premium universal docking station supporting dual 4K monitor outputs, 100W PD laptop charging, Gigabit Ethernet, and multiple USB ports.',
        price: 4999.00,
        category: electronics._id,
        images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 12
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
      {
        name: 'Classic Solid Cotton T-Shirts (Pack of 3)',
        description: 'Everyday crewneck t-shirts made from 100% pre-shrunk soft cotton. Regular fit pack containing black, navy, and heather grey.',
        price: 499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&auto=format&fit=crop&q=60'],
        stock: 100
      },
      {
        name: 'Premium Organic Cotton Graphic Tee',
        description: 'Slightly oversized heavy-weight cotton t-shirt with a vintage graphic print on the front. Relaxed style, durable print.',
        price: 899.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=60'],
        stock: 50
      },
      {
        name: 'Designer Minimalist Logo Tee',
        description: 'Luxury streetwear t-shirt crafted from premium long-staple cotton, featuring a subtle embroidered designer logo on the chest.',
        price: 1999.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=60'],
        stock: 20,
        discountPercent: 10
      },
      {
        name: 'Classic Relaxed-Fit Blue Denim Jeans',
        description: 'Comfortable relaxed-leg denim jeans for daily rugged use. Sturdy stitching and traditional 5-pocket design.',
        price: 799.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: 'Selvedge Slim-Fit Designer Jeans',
        description: 'Premium raw indigo selvedge denim, crafted with precision. Ages beautifully to create unique personalized fades.',
        price: 3499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800&auto=format&fit=crop&q=60'],
        stock: 15
      },
      {
        name: 'Lightweight Hooded Windbreaker Jacket',
        description: 'Water-resistant, packable windproof jacket. Features adjustable drawstrings, hood, and zippered pockets for active outdoor wear.',
        price: 999.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1551854838-212c50b4c184?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Classic Denim Trucker Jacket',
        description: 'Timeless light-wash denim jacket with button closures, chest flap pockets, and adjustable waist tabs. Perfect layering piece.',
        price: 1999.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=60'],
        stock: 25,
        discountPercent: 15
      },
      {
        name: 'Casual Canvas Slip-On Shoes',
        description: 'Lightweight and breathable canvas slip-ons with a flexible rubber sole. Perfect for effortless casual daily wear.',
        price: 599.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop&q=60'],
        stock: 80
      },
      {
        name: 'Trail Running & Hiking Shoes',
        description: 'Durable off-road running shoes featuring a deep-lug rubber sole for traction, toe protection cap, and breathable mesh upper.',
        price: 2499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Handcrafted Oxford Leather Dress Shoes',
        description: 'Formal cap-toe oxfords made of premium full-grain Italian leather. Goodyear welted structure for lifetime durability and class.',
        price: 4499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=60'],
        stock: 12,
        discountPercent: 10
      },
      {
        name: 'Casual Linen Button-Down Shirt',
        description: 'Lightweight and breathable linen-cotton blend shirt. Short sleeves and relaxed fit make it perfect for warm summer days.',
        price: 899.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=60'],
        stock: 45
      },
      {
        name: 'Tailored Cotton Chino Trousers',
        description: 'Flat-front slim-fit chinos crafted from stretch cotton twill. Professional enough for office and casual enough for weekends.',
        price: 1499.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'Premium Wool-Blend Slim Blazer',
        description: 'Exquisitely tailored wool-blend blazer jacket with structured shoulders, notch lapels, and fully lined interior for formal occasions.',
        price: 4999.00,
        category: fashion._id,
        images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=60'],
        stock: 10
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
      // Newly added Home & Living items for coverage and search capability
      {
        name: 'Sturdy Metal Single Bed Frame',
        description: 'Heavy-duty steel bed frame with wooden slats, offering strong support without needing a box spring. Easy assembly.',
        price: 5999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop&q=60'],
        stock: 8
      },
      {
        name: 'Solid Pine Wood Queen Bed Frame',
        description: 'Beautiful, minimalist queen bed frame crafted from sustainably sourced pine wood. Elegant natural finish.',
        price: 12999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&auto=format&fit=crop&q=60'],
        stock: 5
      },
      {
        name: 'Royal King-Size Velvet Bed Frame',
        description: 'Luxurious king-size bed frame featuring a tufted wingback headboard upholstered in premium velvet fabric.',
        price: 24999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=60'],
        stock: 3,
        discountPercent: 10
      },
      {
        name: 'Nordic Cozy 1-Seater Lounge Armchair',
        description: 'Comfortable mid-century modern accent chair with high-density foam padding and sturdy solid oak wood legs.',
        price: 4999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Urban Fabric 3-Seater Sofa',
        description: 'Stylish 3-seater living room sofa upholstered in durable linen-blend fabric with pocket-sprung seats for extra support.',
        price: 14499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=60'],
        stock: 6
      },
      {
        name: 'Haven Velvet L-Shaped Sectional Sofa',
        description: 'Spacious L-shaped sectional sofa with reversible chaise, upholstered in plush performance velvet with brass accent feet.',
        price: 32999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=60'],
        stock: 2,
        discountPercent: 5
      },
      {
        name: 'Scandi Round Wooden Coffee Table',
        description: 'Minimalist round coffee table with solid wood tripod legs, perfect for cozy spaces or modern apartment settings.',
        price: 1999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&auto=format&fit=crop&q=60'],
        stock: 20
      },
      {
        name: 'Sleek Wood and Metal Coffee Table',
        description: 'Industrial style rectangular coffee table with a rustic oak-veneered top and a sturdy black steel grid storage shelf.',
        price: 3499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&auto=format&fit=crop&q=60'],
        stock: 15
      },
      {
        name: 'Minimalist Nesting Coffee Tables (Set of 2)',
        description: 'Space-saving set of two nesting side tables with marble-patterned tops and gold-finished metal frames.',
        price: 5499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=60'],
        stock: 12
      },
      {
        name: 'Aura Tripod Wooden Floor Lamp',
        description: 'Classic floor lamp with three solid ash wood legs and a textured cream linen drum shade. Fits standard E27 bulb.',
        price: 1899.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=800&auto=format&fit=crop&q=60'],
        stock: 25
      },
      {
        name: 'Nova LED Smart Corner Floor Lamp',
        description: 'Modern, space-saving corner lamp with app control, customizable RGB color modes, and music synchronization.',
        price: 2499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Luna Minimalist Arc Floor Lamp',
        description: 'Elegant arched floor lamp with a heavy black marble base and adjustable brushed chrome dome shade.',
        price: 4999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60'],
        stock: 10,
        discountPercent: 15
      },
      {
        name: 'Runner Geometric Entryway Rug (2x6 ft)',
        description: 'Durable flatweave runner rug with a modern geometric pattern. Ideal for hallways, kitchens, or entryways.',
        price: 799.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Boho Cotton Flatweave Rug (4x6 ft)',
        description: 'Handwoven fringe rug made of 100% natural cotton, featuring a bohemian style pattern. Washable and eco-friendly.',
        price: 1999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&auto=format&fit=crop&q=60'],
        stock: 25
      },
      {
        name: 'UltraSoft Shaggy Area Rug (5x7 ft)',
        description: 'Plush shaggy carpet with high-density microfiber pile and non-slip backing. Luxuriously soft underfoot.',
        price: 4499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1575414003591-ece8d0416c7a?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 12
      },
      {
        name: 'Persian Vintage Medallion Rug (8x10 ft)',
        description: 'Large, distressed-look traditional Persian style rug. Stain-resistant, non-shedding, and perfect for high-traffic rooms.',
        price: 9999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&auto=format&fit=crop&q=60'],
        stock: 8
      },
      {
        name: 'Slim 3-Tier Utility Rolling Cart',
        description: 'Multi-purpose organization cart on durable rolling wheels. Perfect storage solution for kitchen, bath, or laundry room.',
        price: 999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1493962853295-0fd70327578a?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'Classic Oak 4-Shelf Bookshelf',
        description: 'Solid display bookcase with three adjustable shelves and a warm oak finish. Sturdy back panel for extra stability.',
        price: 2499.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&auto=format&fit=crop&q=60'],
        stock: 18
      },
      {
        name: 'Industrial Metal 5-Tier Shelving Unit',
        description: 'Heavy-duty steel garage shelving with adjustable MDF wood boards. Capable of supporting up to 150kg per shelf.',
        price: 3999.00,
        category: home._id,
        images: ['https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&auto=format&fit=crop&q=60'],
        stock: 15
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
      {
        name: 'Basic EVA Non-Slip Exercise Mat',
        description: 'Affordable 4mm EVA foam mat for yoga, pilates, and home stretching workouts. Includes carrying strap.',
        price: 299.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=60'],
        stock: 80
      },
      {
        name: 'Professional Natural Rubber Yoga Mat',
        description: '5mm thick dense natural rubber base with polyurethane top layer for ultimate dry and wet grip. Alignment guide lines engraved.',
        price: 2499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 12
      },
      {
        name: 'Resistance Loop Bands (Set of 5)',
        description: 'Natural latex loop bands with varying resistance levels (light to XX-heavy) for strength training, physical therapy, and warmups.',
        price: 249.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop&q=60'],
        stock: 100
      },
      {
        name: 'Heavy-Duty Resistance Tubes Set with Handles',
        description: 'Includes 5 stackable resistance tubes (up to 150 lbs total), cushioned foam handles, ankle straps, door anchor, and carry pouch.',
        price: 799.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Premium Fabric Resistance Booty Bands',
        description: 'Anti-slip fabric resistance bands that won\'t roll or slide. High durability thick cotton-elastic blend for lower body workouts.',
        price: 1499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=60'],
        stock: 25,
        discountPercent: 10
      },
      {
        name: 'Gym Shaker Bottle with Steel Ball',
        description: 'BPA-free plastic protein shaker bottle with wire whisk mixing ball. Leak-proof flip cap and textured grip.',
        price: 249.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&auto=format&fit=crop&q=60'],
        stock: 120
      },
      {
        name: 'Smart Self-Cleaning UV Water Bottle',
        description: 'Insulated stainless steel bottle with a built-in UV-C LED light in the cap that purifies water and cleans the inner bottle surface.',
        price: 2999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&auto=format&fit=crop&q=60'],
        stock: 12
      },
      {
        name: 'Neoprene Coated Dumbbell Pair (2kg)',
        description: 'Comfortable neoprene-coated hand weights for cardio, strength training, and toning. Hexagonal shape prevents rolling.',
        price: 499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop&q=60'],
        stock: 50
      },
      {
        name: 'Adjustable Dumbbells Set (20kg Pair)',
        description: 'Heavy-duty steel plates with a connecting bar to convert dumbbells into a barbell. Includes spinlock collars for safety.',
        price: 2499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60'],
        stock: 20
      },
      {
        name: 'Quick-Adjust Dial Dumbbell (Single, 24kg)',
        description: 'Premium single dumbbell adjustable from 2.5kg to 24kg with a simple dial turn. Replaces 15 individual weights. Solid steel plates.',
        price: 12499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop&q=60'],
        stock: 8,
        discountPercent: 8
      },
      {
        name: 'Ultralight Inflatable Camping Pillow',
        description: 'Pocket-sized travel blow-up pillow with a soft slip-resistant cover. Inflates in 5 breaths for a comfortable camp sleep.',
        price: 399.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: 'Compact Backpacking Sleeping Bag',
        description: '3-season lightweight envelope sleeping bag rated for comfort down to 10°C. Water-resistant polyester lining.',
        price: 1499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1589782182703-2aaa69037b5b?w=800&auto=format&fit=crop&q=60'],
        stock: 22
      },
      {
        name: 'Portable Camping Gas Stove & Cookware Set',
        description: 'Foldable piezo-ignition camp stove with nesting anodized aluminum pots, pans, and bowls in a compact mesh bag.',
        price: 2499.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 15
      },
      {
        name: 'Breathable Knit Running Shoes',
        description: 'Lightweight road running shoes with an elastic slip-on collar, soft EVA outsole, and breathable mesh fabric.',
        price: 999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=60'],
        stock: 50
      },
      {
        name: 'Comfort Cushion Road Running Shoes',
        description: 'Everyday running shoes featuring a high-rebound cushioning midsole, durable rubber outsole, and supportive mesh upper.',
        price: 2999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Carbon-Plated Elite Marathon Shoes',
        description: 'Professional-grade racing shoes with a full-length carbon fiber plate, nitrogen-infused superfoam, and ultra-thin engineered mesh.',
        price: 8999.00,
        category: fitness._id,
        images: ['https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop&q=60'],
        stock: 10,
        discountPercent: 5
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
      {
        name: 'A5 Spiral Craft Notebook (Set of 3)',
        description: 'Eco-friendly spiral-bound notebooks with brown kraft paper covers and lined white pages. Ideal for study or quick note-taking.',
        price: 199.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: 'Luxury Leather-Bound Notebook',
        description: 'Handmade leather cover with premium unlined deckle-edge vintage cotton paper. Features a wrap-around leather strap tie.',
        price: 1499.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Smooth Gel Pen Set (Pack of 10)',
        description: 'Retractable gel ink pens with comfortable rubber grip and fine 0.5mm tip. Assorted pack with black, blue, and red ink.',
        price: 149.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=800&auto=format&fit=crop&q=60'],
        stock: 100
      },
      {
        name: 'Executive Gold-Plated Rollerball Pen',
        description: 'Weighted brass body with 18k gold-plated accents. Writes with liquid ink for an ultra-smooth signature experience. Gift box included.',
        price: 2499.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=800&auto=format&fit=crop&q=60'],
        stock: 8,
        discountPercent: 10
      },
      {
        name: 'Pocket Calendar & Planner',
        description: 'Slim, pocket-sized monthly planner with a flexible cover. Perfect for tracking key dates and reminders on the go.',
        price: 129.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&auto=format&fit=crop&q=60'],
        stock: 80
      },
      {
        name: 'Undated Daily Productivity Planner',
        description: 'Deluxe productivity planner featuring goal-setting frameworks, weekly reflections, hourly schedules, and thick bleed-proof pages.',
        price: 1199.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&auto=format&fit=crop&q=60'],
        stock: 18,
        discountPercent: 12
      },
      {
        name: 'Mesh Metal Pen & Pencil Cup Holder',
        description: 'Simple, durable black wire mesh cup organizer to keep pens, highlighters, and scissors neat on your desk.',
        price: 99.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=60'],
        stock: 150
      },
      {
        name: 'Solid Walnut Wood Desk Organizer',
        description: 'Hand-sanded solid American walnut wood desk organizer with dedicated slots for smartphone, tablet, letters, business cards, and pens.',
        price: 2999.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Think and Grow Rich (Paperback)',
        description: 'The classic personal development book by Napoleon Hill, exploring the secrets of success and wealth building.',
        price: 149.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&auto=format&fit=crop&q=60'],
        stock: 120
      },
      {
        name: 'Project Hail Mary (Paperback)',
        description: 'The thrilling, best-selling sci-fi novel by Andy Weir, author of The Martian. A lone astronaut must save Earth from extinction.',
        price: 499.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800&auto=format&fit=crop&q=60'],
        stock: 40,
        discountPercent: 15
      },
      {
        name: 'Classic Sci-Fi & Fantasy Hardcover Box Set',
        description: 'A beautifully designed collector\'s slipcase containing leather-bound editions of three timeless speculative fiction masterpieces.',
        price: 3499.00,
        category: books._id,
        images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60'],
        stock: 6
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
      {
        name: 'Luxury Chronograph Men\'s Watch',
        description: 'Sophisticated analog watch with a stainless steel case, sapphire crystal glass, and Japanese quartz movement.',
        price: 4999.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1788160501/luxury-chronograph-watch_ewbzz9.jpg'],
        stock: 15,
        discountPercent: 10
      },
      {
        name: 'Classic Minimalist Unisex Watch',
        description: 'Ultra-thin silver casing, genuine brown leather strap, and a clean white dial face. Water-resistant up to 30m.',
        price: 1899.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1788160483/classic-minimalist-watch_xug2pa.jpg'],
        stock: 25
      },
      {
        name: 'Sporty Digital Watch',
        description: 'Rugged digital sports watch with alarm, stopwatch, LED backlight, and 50m water resistance. Ideal for daily fitness.',
        price: 499.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1788160716/sporty-digital-watch_x2fbfg.jpg'],
        stock: 40
      },
      {
        name: 'Slim Canvas Card Holder',
        description: 'Ultra-thin card sleeve wallet made from durable canvas and synthetic leather. Fits up to 5 cards and folded bills.',
        price: 299.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1788160684/slim-canvas-card-holder_mnmzpk.jpg'],
        stock: 50
      },
      {
        name: 'Premium Full-Grain Leather Zipper Wallet',
        description: 'Handcrafted premium leather wallet with a secure wrap-around zipper, multiple card slots, coin pocket, and bill compartment.',
        price: 2199.00,
        category: accessories._id,
        images: ['https://res.cloudinary.com/c9trtuqh/image/upload/v1788160520/premium-zipper-wallet_qmlyjx.jpg'],
        stock: 12,
        discountPercent: 15
      },
      {
        name: 'Aviation-Style Gold Polarized Sunglasses',
        description: 'Premium metal frame aviators with gold finish, impact-resistant polarized lenses, and complete UV400 protection.',
        price: 2499.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=60'],
        stock: 8
      },
      {
        name: 'Classic Wayfarer Black Sunglasses',
        description: 'Lightweight plastic frame sunglasses with dark lenses, offering standard UV protection for daily wear.',
        price: 299.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Lightweight Drawstring Sports Bag',
        description: 'Water-resistant nylon drawstring cinch bag with front zip pocket. Perfect for gym, travel, or school essentials.',
        price: 249.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: 'Urban Commuter Anti-Theft Backpack',
        description: 'Sleek daily backpack with hidden zippers, integrated USB charging port, and padded compartments for a 15-inch laptop.',
        price: 1899.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1577733966973-d680bffd2e80?w=800&auto=format&fit=crop&q=60'],
        stock: 20,
        discountPercent: 10
      },
      {
        name: 'Heritage Leather Messenger Bag',
        description: 'Distressed vintage-style leather satchel with antique brass hardware, adjustable shoulder strap, and multiple internal organizing pockets.',
        price: 3999.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=60'],
        stock: 10
      },
      {
        name: 'Casual Woven Canvas Belt',
        description: 'Durable woven fabric belt with a matte black double-D ring buckle. Fully adjustable fit for daily wear.',
        price: 299.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800&auto=format&fit=crop&q=60'],
        stock: 45
      },
      {
        name: 'Reversible Leather Belt',
        description: 'High-quality reversible leather belt switching between black and dark brown. Features a sleek rotatable metal buckle.',
        price: 799.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Premium Full-Grain Leather Dress Belt',
        description: 'Italian full-grain calfskin leather belt with a polished chrome buckle. Elegant stitching details for formal business wear.',
        price: 1999.00,
        category: accessories._id,
        images: ['https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 5
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
      {
        name: 'Salicylic Acid Acne Control Face Wash',
        description: 'Gentle exfoliating face wash with 2% salicylic acid and tea tree oil. Deeply cleanses pores and reduces breakouts.',
        price: 199.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=60'],
        stock: 80
      },
      {
        name: 'Luxury Botanical Exfoliating Cleanser',
        description: 'Premium gel-to-milk cleanser infused with fruit enzymes, jojoba beads, and white tea extract. Gently polishes and brightens skin.',
        price: 1499.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=60'],
        stock: 15,
        discountPercent: 10
      },
      {
        name: 'Pure Soothing Aloe Vera Gel',
        description: 'Multi-purpose soothing gel made with 99% organic cold-pressed aloe vera. Lightweight hydration for face, body, and sunburn recovery.',
        price: 149.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=60'],
        stock: 100
      },
      {
        name: 'Ceramide Barrier Repair Cream',
        description: 'Rich daily facial moisturizer formulated with 3 essential ceramides, hyaluronic acid, and niacinamide to restore skin barrier.',
        price: 599.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Anti-Aging Retinol Night Cream',
        description: 'Advanced overnight treatment with 1% pure retinol, peptides, and organic argan oil to visibly smooth wrinkles and firm skin.',
        price: 1899.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=60'],
        stock: 20,
        discountPercent: 15
      },
      {
        name: 'Matte Gel SPF 50 Sunscreen',
        description: 'High protection SPF 50 sunscreen with a gel texture that absorbs instantly. Oil-free, water-resistant, and sweat-proof.',
        price: 299.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=60'],
        stock: 90
      },
      {
        name: 'Ultralight Fluid SPF 50+ PA++++ Sunscreen',
        description: 'Premium daily sunscreen fluid. Hydrates with hyaluronic acid, leaves zero white cast or stickiness, and is perfect under makeup.',
        price: 1299.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=800&auto=format&fit=crop&q=60'],
        stock: 25
      },
      {
        name: '10% Niacinamide Clarifying Serum',
        description: 'Effective budget serum targeting blemishes, enlarged pores, and uneven skin tone. Infused with 1% Zinc PCA.',
        price: 349.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&auto=format&fit=crop&q=60'],
        stock: 70
      },
      {
        name: '20% Vitamin C Glow Serum',
        description: 'Premium brightening serum containing 20% L-Ascorbic Acid, Vitamin E, and Ferulic Acid. Fades dark spots and boosts collagen.',
        price: 1199.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1617897903246-719242758050?w=800&auto=format&fit=crop&q=60'],
        stock: 18,
        discountPercent: 12
      },
      {
        name: 'Hydrating Herbal Lip Balm',
        description: 'Nourishing lip balm made with beeswax, peppermint oil, and vitamin E. Heals chapped lips and locks in moisture.',
        price: 99.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&auto=format&fit=crop&q=60'],
        stock: 150
      },
      {
        name: 'Intensive Berry Lip Sleeping Mask',
        description: 'Overnight lip treatment that gently melts dead skin cells, leaving lips feeling soft, smooth, and deeply moisturized.',
        price: 399.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop&q=60'],
        stock: 45
      },
      {
        name: 'Luxury Tinted Lip Butter',
        description: 'Indulgent creamy lip butter with organic rose oil, shea butter, and a sheer natural pink tint. Plumps and softens.',
        price: 899.00,
        category: skincare._id,
        images: ['https://images.unsplash.com/photo-1617897903246-719242758050?w=800&auto=format&fit=crop&q=60'],
        stock: 30,
        discountPercent: 5
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
        stock: 15,
        discountPercent: 10
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
      },
      {
        name: 'Dashboard Magnetic Car Phone Mount',
        description: 'Simple dashboard stick-on magnetic phone mount with adjustable swivel ball head. Easy one-hand operation.',
        price: 299.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1623174891354-afea5ddadcad?w=800&auto=format&fit=crop&q=60'],
        stock: 60
      },
      {
        name: '15W Fast Wireless Charging Auto-Clamping Car Mount',
        description: 'Smart vent mount that automatically clamps when phone is placed. Built-in Qi fast wireless charging with safety protection.',
        price: 2199.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1591290619618-904f6dd935e3?w=800&auto=format&fit=crop&q=60'],
        stock: 20,
        discountPercent: 10
      },
      {
        name: 'Water-Resistant Sweat Guard Car Seat Cover',
        description: 'Single slip-on neoprene seat protector. Waterproof and sweat-proof, ideal for gym-goers, runners, or beach trips.',
        price: 499.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1611251953880-611e66e904e9?w=800&auto=format&fit=crop&q=60'],
        stock: 35
      },
      {
        name: 'Breathable Mesh Car Seat Covers (Front Pair)',
        description: 'Durable and breathable mesh fabric front seat covers. Universal fit, protects against stains, spills, and wear.',
        price: 1299.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1602794351477-4b0a974fd386?w=800&auto=format&fit=crop&q=60'],
        stock: 25
      },
      {
        name: 'Luxury Faux Leather Car Seat Covers Set',
        description: 'Complete set of premium leatherette seat covers for front and rear seats. Breathable padded design for ultimate luxury and comfort.',
        price: 4999.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1652860316277-370ca5b1b1df?w=800&auto=format&fit=crop&q=60'],
        stock: 10,
        discountPercent: 15
      },
      {
        name: 'Classic Half-Face Motorcycle Helmet',
        description: 'Lightweight open-face helmet with a quick-release buckle, impact-resistant ABS shell, and scratch-proof clear visor.',
        price: 999.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1623038868323-7d39ec58eefe?w=800&auto=format&fit=crop&q=60'],
        stock: 30
      },
      {
        name: 'Full-Face Aerodynamic Motorcycle Helmet',
        description: 'DOT-approved full-face helmet with dual visor (clear visor + inner sun shield), multiple air vents, and removable washable liner.',
        price: 2499.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1627530980937-b8721b91506a?w=800&auto=format&fit=crop&q=60'],
        stock: 15
      },
      {
        name: 'Carbon-Fiber Professional Road Bike Helmet',
        description: 'Ultra-lightweight aerodynamic cycling helmet with integrated MIPS protection, 18 ventilation channels, and precision fit adjustment dial.',
        price: 5999.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1494030575520-dd03dd6aeb04?w=800&auto=format&fit=crop&q=60'],
        stock: 8,
        discountPercent: 5
      },
      {
        name: 'Coiled Steel Cable Bike Lock',
        description: 'Flexible coiled steel cable lock with key entry and protective vinyl coating. Lightweight and easy to carry for basic security.',
        price: 299.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1610305947387-9dd3b77faef9?w=800&auto=format&fit=crop&q=60'],
        stock: 80
      },
      {
        name: 'Heavy-Duty Hardened Steel Chain Bike Lock',
        description: '10mm thick hardened manganese steel chains resistant to bolt cutters, encased in a protective nylon sleeve. Disc-style cylinder key.',
        price: 2199.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1775209601094-d2e9045652db?w=800&auto=format&fit=crop&q=60'],
        stock: 12
      },
      {
        name: 'Dual Port Fast Car Charger (36W)',
        description: 'Compact metal car charger adapter with dual Quick Charge 3.0 ports. Safely charges two devices at high speeds.',
        price: 299.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1627886107121-b7daaede3974?w=800&auto=format&fit=crop&q=60'],
        stock: 100
      },
      {
        name: '95W Triple-Port USB-C Laptop Car Charger',
        description: 'Ultra-high-power charger featuring one 65W USB-C Power Delivery port (for laptops) and two fast charging ports for phones/tablets.',
        price: 1299.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1557767382-97b28f5488e7?w=800&auto=format&fit=crop&q=60'],
        stock: 40
      },
      {
        name: 'Microfiber Car Wash Mitt & Towels Set',
        description: 'Lint-free, scratch-free detailing set containing one extra-plush wash mitt and two high-density microfiber drying towels.',
        price: 199.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1608506375591-b90e1f955e4b?w=800&auto=format&fit=crop&q=60'], // soapy foam wash — close match
        stock: 120
      },
      {
        name: '10-Piece Professional Car Detailing Wash Kit',
        description: 'Includes car wash shampoo, wheel brush, tire brush, wash mitt, window squeegee, dust brush, and towels in a portable storage bag.',
        price: 1499.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1708805282683-50a060eba80f?w=800&auto=format&fit=crop&q=60'], // person cleaning tire with brush — good fit
        stock: 25,
        discountPercent: 10
      },
      {
        name: 'Professional Ceramic Coating Paint Protection Kit',
        description: '9H hardness nanoceramic coating kit. Protects car paint from scratches, UV rays, dirt, and water spots, yielding a high-gloss finish.',
        price: 3999.00,
        category: carBike._id,
        images: ['https://images.unsplash.com/photo-1632823469850-2f77dd9c7f93?w=800&auto=format&fit=crop&q=60'], // man waxing car hood — good fit for ceramic/paint protection
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

    const reviewDocs = [];
    for (const prod of seededProducts) {
      const reviewCount = Math.floor(Math.random() * 3) + 2;
      const shuffledReviewers = [...reviewers].sort(() => 0.5 - Math.random());
      const poolKey = getPoolKey(prod.category);
      const comments = commentPool[poolKey] || commentPool.general;

      for (let i = 0; i < reviewCount; i++) {
        const reviewer = shuffledReviewers[i];
        const rating = Math.floor(Math.random() * 3) + 3;
        const comment = comments[Math.floor(Math.random() * comments.length)];
        reviewDocs.push({ user: reviewer._id, product: prod._id, rating, comment });
      }
    }
    await Review.insertMany(reviewDocs);

    console.log('Updating average ratings and review counts for all products...');
    for (const prod of seededProducts) {
      await Review.calculateAverageRating(prod._id);
    }


    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
