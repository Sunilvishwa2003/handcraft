# Module Guide With Sample Items

This guide explains what each module in the project does and gives at least two sample items or example cases for it.

These samples are reference examples. They are **not automatically seeded into MongoDB** yet.

## Backend Modules

### 1. Auth Module
Files:
- `backend/src/routes/authRoutes.ts`
- `backend/src/models/User.ts`
- `backend/src/utils/generateToken.ts`
- `backend/src/middleware/authMiddleware.ts`

What it does:
- Registers users
- Logs users in
- Issues JWT tokens
- Protects user-only and admin-only APIs

Sample items:
1. Customer user:
   - name: `Aarav Kumar`
   - email: `aarav@example.com`
   - isAdmin: `false`
2. Admin user:
   - name: `Store Admin`
   - email: `admin@example.com`
   - isAdmin: `true`

### 2. Product Module
Files:
- `backend/src/routes/productRoutes.ts`
- `backend/src/models/Product.ts`

What it does:
- Stores product catalog data
- Supports filtering, sorting, semantic search, related items, and product detail lookup
- Handles product CRUD for admin

Sample items:
1. `Handwoven Cane Basket`
   - category: `Home Decor`
   - brand: `Handcrafts`
   - price: `1299`
   - tags: `eco-friendly, storage, woven`
2. `Brass Diya Set`
   - category: `Festival Decor`
   - brand: `Heritage Glow`
   - price: `899`
   - tags: `brass, pooja, festive`

### 3. Review Module
Files:
- `backend/src/models/Review.ts`
- `backend/src/routes/productRoutes.ts`

What it does:
- Saves one review per user per product
- Tracks rating, comment, and verified purchase flag
- Recalculates product rating and review count

Sample items:
1. Review for `Handwoven Cane Basket`
   - rating: `5`
   - comment: `Very sturdy and premium finish`
   - verifiedPurchase: `true`
2. Review for `Brass Diya Set`
   - rating: `4`
   - comment: `Good polish, slightly smaller than expected`
   - verifiedPurchase: `true`

### 4. Cart Module
Files:
- `backend/src/models/Cart.ts`
- `backend/src/routes/cartRoutes.ts`

What it does:
- Stores persistent cart for logged-in users
- Updates quantities
- Applies coupon codes
- Calculates subtotal and total

Sample items:
1. Cart item:
   - product: `Handwoven Cane Basket`
   - qty: `2`
   - price: `1299`
2. Cart item:
   - product: `Brass Diya Set`
   - qty: `1`
   - price: `899`

### 5. Coupon and Pricing Module
Files:
- `backend/src/models/Coupon.ts`
- `backend/src/utils/pricing.ts`
- `backend/src/routes/cartRoutes.ts`
- `backend/src/routes/adminRoutes.ts`

What it does:
- Stores discount rules
- Validates coupon usage
- Calculates discount, tax, shipping, and total

Sample items:
1. `WELCOME10`
   - type: `percentage`
   - value: `10`
   - minOrderAmount: `1000`
2. `FLAT200`
   - type: `fixed`
   - value: `200`
   - minOrderAmount: `1500`

### 6. Order Module
Files:
- `backend/src/models/Order.ts`
- `backend/src/routes/orderRoutes.ts`

What it does:
- Builds order summary
- Places orders
- Records payment
- Tracks shipping and delivery state
- Stores fraud score and tracking timeline

Sample items:
1. Order:
   - items: `Handwoven Cane Basket x2`
   - paymentMethod: `cod`
   - status: `confirmed`
2. Order:
   - items: `Brass Diya Set x1`
   - paymentMethod: `upi`
   - status: `shipped`

### 7. Tracking and Realtime Module
Files:
- `backend/src/routes/orderRoutes.ts`
- `backend/src/services/realtimeService.ts`

What it does:
- Emits live order status updates over Socket.IO
- Lets clients join order rooms and user rooms
- Streams order progress to tracking pages

Sample items:
1. Tracking event:
   - status: `packed`
   - message: `Items packed at Bengaluru warehouse`
2. Tracking event:
   - status: `out-for-delivery`
   - message: `Courier is on the way`

### 8. Notification Module
Files:
- `backend/src/models/Notification.ts`
- `backend/src/routes/notificationRoutes.ts`
- `backend/src/services/realtimeService.ts`

What it does:
- Stores user notifications
- Sends offer alerts and order alerts
- Pushes live notifications through sockets

Sample items:
1. Notification:
   - title: `Order update`
   - message: `Your order is now shipped`
   - type: `order`
2. Notification:
   - title: `Weekend offer`
   - message: `Use WELCOME10 for extra savings`
   - type: `offer`

### 9. Wishlist and Recently Viewed Module
Files:
- `backend/src/models/User.ts`
- `backend/src/routes/wishlistRoutes.ts`
- `backend/src/routes/productRoutes.ts`

What it does:
- Saves wishlist items
- Tracks recently viewed products
- Uses that behavior for personalization

Sample items:
1. Wishlist item:
   - `Marble Inlay Jewelry Box`
2. Wishlist item:
   - `Terracotta Wall Plate`

Recently viewed examples:
1. `Brass Diya Set`
2. `Handwoven Cane Basket`

### 10. Behavior Analytics Module
Files:
- `backend/src/models/BehaviorEvent.ts`
- `backend/src/services/mlService.ts`

What it does:
- Records views, searches, cart actions, purchases, and checkout attempts
- Feeds recommendations, semantic search signals, and fraud checks

Sample items:
1. Behavior event:
   - eventType: `search`
   - query: `eco friendly basket`
2. Behavior event:
   - eventType: `purchase`
   - product: `Brass Diya Set`

### 11. AI and ML Module
Files:
- `backend/src/routes/aiRoutes.ts`
- `backend/src/services/mlService.ts`

What it does:
- Provides semantic product search
- Generates recommendations
- Builds personalized homepage sections
- Detects suspicious checkout behavior
- Suggests dynamic pricing
- Powers the shopping chatbot

Sample items:
1. Semantic search example:
   - user query: `gift for festive home decor`
   - likely match: `Brass Diya Set`
2. Recommendation example:
   - user viewed: `Handwoven Cane Basket`
   - recommended: `Macrame Plant Hanger`

Fraud examples:
1. Normal:
   - totalPrice: `1899`
   - itemCount: `2`
   - result: `allow`
2. Risky:
   - totalPrice: `125000`
   - itemCount: `12`
   - repeated checkout attempts
   - result: `review`

### 11.1 Homepage Slider UX Improvements
Files:
- `frontend/src/app/page.tsx`

What it does:
- Adds a premium sliding highlight section to the homepage
- Maintains product category filtering and existing homepage flow
- Supports auto-play every 5 seconds with manual navigation controls
- Includes previous/next buttons, dot indicators, and accessible labels
- Uses responsive styling for mobile and desktop with theme-aware color tokens

Quality checklist:
- Homepage slider advances automatically every 5 seconds
- Manual arrow or dot interaction resets the autoplay timer
- Each slide has an accessible announcement via `aria-live`
- Prev/next buttons and dots have descriptive `aria-label`s
- Slider layout scales cleanly on small screens and wide displays

### 11.2 Homepage Ad Management
Files:
- `backend/src/models/Ad.ts`
- `backend/src/routes/adminRoutes.ts`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/page.tsx`

What it does:
- Lets admins upload ad assets and create homepage ad cards
- Stores ad metadata with image URL, target link, optional product association, active flag, and sort order
- Displays active homepage ads in the slider instead of static promotional slides
- Preserves the existing product filter behavior and product sections

Quality checklist:
- Admins can upload banner images and assign them to ad records
- Homepage slider reads active ads from the backend response
- Ads can be paused, reordered, edited, and deleted by admins
- Slider content remains responsive and accessible

### 12. Admin Module
Files:
- `backend/src/routes/adminRoutes.ts`
- `backend/src/routes/productRoutes.ts`
- `backend/src/routes/orderRoutes.ts`

What it does:
- Shows dashboard metrics
- Manages products
- Manages orders
- Uploads images and 3D models
- Manages inventory and coupons
- Exposes analytics

Sample items:
1. Admin action:
   - upload `basket.glb`
   - assign it to `Handwoven Cane Basket`
2. Admin action:
   - change order status from `confirmed` to `shipped`

### 13. Utility and Infrastructure Module
Files:
- `backend/src/config/db.ts`
- `backend/src/utils/asyncHandler.ts`
- `backend/src/middleware/errorMiddleware.ts`
- `backend/src/types/http.ts`
- `backend/src/types/vendor.d.ts`

What it does:
- Connects DB
- Wraps async routes
- Handles typed requests
- Standardizes error responses
- Provides missing TS declarations

Sample items:
1. Error response:
   - `Product not found`
   - HTTP `404`
2. Error response:
   - `Not authorized, token missing`
   - HTTP `401`

## Frontend Modules

### 1. App Shell Module
Files:
- `frontend/src/app/layout.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/Navbar.tsx`

What it does:
- Defines app layout
- Sets global styles
- Shows nav, search, cart, account, orders, admin, and notifications

Sample items:
1. Navbar search:
   - query: `festival decor`
2. Navbar link group:
   - `Orders`, `Admin`, `Cart`

### 2. Homepage Module
Files:
- `frontend/src/app/page.tsx`

What it does:
- Renders personalized homepage bands from AI endpoints
- Shows recommended, trending, best seller, and newest sections

Sample items:
1. Recommended section card:
   - `Macrame Plant Hanger`
2. Trending section card:
   - `Brass Diya Set`

### 3. Product Listing Module
Files:
- `frontend/src/app/products/page.tsx`
- `frontend/src/components/ProductCard.tsx`

What it does:
- Displays product list
- Supports filters and sorting
- Lets users add to cart and wishlist

Sample items:
1. Filter case:
   - category: `Home Decor`
   - minPrice: `500`
   - sort: `trending`
2. Filter case:
   - brand: `Heritage Glow`
   - rating: `4+`
   - availability: `in-stock`

### 4. Product Detail Module
Files:
- `frontend/src/app/products/[id]/page.tsx`
- `frontend/src/components/ProductDetailClient.tsx`
- `frontend/src/components/Product3DViewer.tsx`

What it does:
- Shows product details
- Displays image gallery
- Loads 3D model viewer if a GLB/GLTF is available
- Adds review, wishlist, and cart actions
- Shows related products

Sample items:
1. Product detail:
   - `Handwoven Cane Basket`
   - images: `front`, `side`, `lifestyle`
2. Product detail:
   - `Wooden Temple Lamp`
   - model3dUrl: `lamp.glb`

### 5. Cart Module
Files:
- `frontend/src/app/cart/page.tsx`
- `frontend/src/lib/api.ts`

What it does:
- Shows current cart
- Supports quantity change and remove actions
- Applies coupon code
- Handles guest cart and logged-in cart flows

Sample items:
1. Cart state:
   - `Handwoven Cane Basket x2`
2. Cart state:
   - `Brass Diya Set x1`

### 6. Checkout Module
Files:
- `frontend/src/app/checkout/page.tsx`

What it does:
- Collects shipping data
- Shows final totals
- Displays fraud summary
- Places order

Sample items:
1. Shipping form:
   - city: `Chennai`
   - paymentMethod: `cod`
2. Shipping form:
   - city: `Hyderabad`
   - paymentMethod: `upi`

### 7. Orders and Tracking Module
Files:
- `frontend/src/app/orders/page.tsx`
- `frontend/src/app/orders/[id]/page.tsx`
- `frontend/src/components/OrderTrackingClient.tsx`

What it does:
- Shows order history
- Opens single order page
- Displays live timeline updates

Sample items:
1. Order card:
   - total: `2598`
   - status: `confirmed`
2. Tracking timeline step:
   - `shipped`
   - `Departed from Bengaluru hub`

### 8. Account Module
Files:
- `frontend/src/app/account/page.tsx`

What it does:
- Registers user
- Logs user in
- Stores user session in local storage

Sample items:
1. Login:
   - email: `aarav@example.com`
2. Register:
   - name: `Meera Shah`
   - email: `meera@example.com`

### 9. Notification Module
Files:
- `frontend/src/components/NotificationBell.tsx`

What it does:
- Loads notifications from API
- Subscribes to live notification socket events
- Shows unread count

Sample items:
1. Notification bell item:
   - `Order update: packed`
2. Notification bell item:
   - `Weekend offer: use FLAT200`

### 10. Chatbot Module
Files:
- `frontend/src/components/Chatbot.tsx`

What it does:
- Sends user shopping questions to AI endpoint
- Shows AI answers
- Can guide search and order tracking

Sample items:
1. Chat query:
   - `Show me eco friendly storage baskets`
2. Chat query:
   - `Track order 661a8f3c2d90aa1122334455`

### 11. Admin UI Module
Files:
- `frontend/src/app/admin/page.tsx`

What it does:
- Shows dashboard metrics
- Creates products
- Uploads assets
- Updates order status
- Lists products and orders

Sample items:
1. Product create form:
   - `Terracotta Wall Plate`
   - category: `Wall Decor`
2. Order update:
   - status: `out-for-delivery`
   - message: `Courier reached local hub`

### 12. Shared Frontend Data Module
Files:
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`

What it does:
- Centralizes API calls
- Stores session user
- Stores guest cart
- Defines shared client-side types

Sample items:
1. API base:
   - `http://localhost:5000/api`
2. Guest cart sample:
   - product: `Brass Diya Set`
   - qty: `1`

## Suggested Next Step

The next useful upgrade is a real seed script that inserts demo users, products, reviews, coupons, orders, notifications, and behavior events into MongoDB so every module starts with live sample data.
