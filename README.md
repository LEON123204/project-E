# Cartex - MERN Stack E-Commerce Platform (Phase 1)

A clean, high-performance, and responsive full-stack e-commerce web application built using the MERN stack (MongoDB, Express.js, React, Node.js). 

This project incorporates user authentication (JWT with silent rotation), a database-synced cart (with localStorage fallback for guests), billing address configuration, checkout flow featuring Stripe test elements (with automatic mock payment fallback if secrets are not supplied), and an administrative back-office analytics suite.

---

## Technical Stack

- **Frontend**: React 19 (Vite), React Router v6, Tailwind CSS v3, Recharts, Lucide Icons, Stripe React SDK.
- **Backend**: Node.js, Express.js, Mongoose (MongoDB ODM), JWT, Bcrypt.
- **Database**: MongoDB Atlas or Local MongoDB.
- **Payments**: Stripe Test API.
- **Validation**: express-validator (Backend), custom form limits (Frontend).
- **Security**: Rate limiting on authentication routes, express-mongo-sanitize input cleaning.

---

## Folder Structure

```text
project-E/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable layout and status modules (Navbar, Footer, Skeletons)
│   │   ├── context/        # Cart, Auth, and Wishlist context providers
│   │   ├── hooks/          # useDebounce search hook
│   │   ├── pages/          # Catalog browser, checkout, and admin dashboard panels
│   │   └── services/       # api.js axios wrapper with token refresh interceptors
│   └── vite.config.js      # Vite proxy routes & parent directory env reading
├── server/                 # Express API backend
│   ├── config/             # DB connection configuration
│   ├── controllers/        # REST route handler logics (auth, orders, products)
│   ├── middleware/         # file uploads (multer), validators, error handlers
│   ├── models/             # Mongoose Schemas (User, Category, Product, Order, Review, Cart)
│   ├── routes/             # Versioned (/api/v1/) API routes
│   └── server.js           # Server initializer and listener
├── .env.example            # Template for key values
└── package.json            # Workspace script manager
```

---

## Environment Configuration

A single `.env` file should be created at the **root** of the workspace (`project-E/`). In production, this can be managed via deployment providers.

Create `project-E/.env` and configure the following parameters:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cartex?retryWrites=true&w=majority
JWT_SECRET=super_secret_access_key_for_jwt_token_generation_2026
JWT_REFRESH_SECRET=super_secret_refresh_key_for_jwt_token_generation_2026

# Stripe API Keys (Test Mode)
# Leave placeholders as-is to use the Mock Payment checkout fallback
STRIPE_SECRET_KEY=sk_test_placeholder_for_phase1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder_for_phase1

# Frontend Configuration
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Installation & Setup

Follow these steps from a terminal at the project root directory:

### 1. Install All Dependencies
Installs workspace managers at the root, backend servers, and frontend packages:
```bash
npm run install-all
```

### 2. Seed the Database
Populates the MongoDB database with ~25 sample products across 5 categories, creating a customer account and a store administrator account:
```bash
npm run seed
```

### 3. Start Development Server
Starts the Express API server (on port `5000`) and the Vite React server (on port `5173`) concurrently:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Accounts (Seeded)

The seed script creates two pre-configured profiles for testing/demonstration purposes:

### 👤 Store Customer Account
- **Email**: `customer@ecommerce.com`
- **Password**: `customerpassword`
- *Capabilities*: Browse catalog, save wishlists, manage default shipping addresses, check out, track order deliveries, write product reviews.

### 🔑 Store Administrator Account
- **Email**: `admin@ecommerce.com`
- **Password**: `adminpassword`
- *Capabilities*: View key metrics charts (revenue breakdown/category share), manage catalog items (CRUD with file uploads), add categories, cancel/ship orders, review registered accounts.

---

## Phase 1 Feature Highlights

### 🛡️ Secure Auth & JWT Silent Rotation
Tokens are kept short-lived (15 minutes) for security. When the access token expires, Axios interceptors detect the `401` error, request a new token from the backend refresh route using HTTP-Only cookies, and automatically retry the original endpoint request.

### 💳 Stripe Checkout & Fallback Sandbox
If real Stripe secrets (`sk_test_...` and `pk_test_...`) are not configured, the checkout form detects the placeholder and automatically switches to **Mock Checkout mode**. This lets you complete the entire address-selection, payment confirmation, and stock depletion flow successfully without requiring active Stripe accounts.
