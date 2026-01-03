# Android App Update - December 24-25, 2025

## What Changed?
Added **Unit Management System** - Products now show prices with measurement units (e.g., "৳500/kg" instead of just "৳500")

---

## Implementation Steps

### 1. Update Product Model
Add `unit` field to your Product data class:

```kotlin
data class Product(
    // ... existing fields
    val unit: String = "piece"  // NEW: kg, liter, piece, box, etc.
)
```

**When parsing JSON:**
```kotlin
unit = jsonObject.optString("unit", "piece")
```

---

### 2. Update API Call
Products API now returns more items:

```kotlin
// Change limit from 12 to 100
GET /api/products?page=1&limit=100
```

---

### 3. Update Price Display (CRITICAL)
Change ALL price displays to include unit:

**Product Cards:**
```kotlin
// Old: "৳500"
priceText.text = "৳${product.price}/${product.unit}"
// New: "৳500/kg"
```

**Product Detail:**
```kotlin
priceText.text = "৳${product.price.formatWithComma()}/${product.unit}"
// Example: "৳2,500/kg"
```

**Cart Items:**
```kotlin
itemPriceText.text = "৳${item.price}/${item.unit}"
```

**Wishlist:**
```kotlin
priceText.text = "৳${product.price}/${product.unit}"
```

**Search Results:**
```kotlin
priceText.text = "৳${product.price}/${product.unit}"
```

---

## Testing
1. Fetch products - verify `unit` field exists
2. Check all screens show prices with units
3. Verify default "piece" is used if unit is missing

---

## API Response Example
```json
{
  "id": "123",
  "name": "Rice",
  "price": 120,
  "unit": "kg",  // NEW FIELD
  "imageUrl": "..."
}
```

That's it! Just add the unit field and update price displays everywhere.
```kotlin
// Old:
unitPrice.text = "৳${item.product.price}"

// New:
unitPrice.text = "৳${item.product.price}/${item.product.unit}"
// Show calculation: "৳500/kg × 10kg = ৳5,000"
```

#### Wishlist Items:
```kotlin
// New:
priceText.text = "৳${product.price}/${product.unit}"
```

#### Order Items/History:
```kotlin
// New:
itemPrice.text = "৳${item.price}/${item.unit} × ${item.quantity}${item.unit}"
// Example: "৳500/kg × 10kg"
```

**WHY**: Users need to know what unit the price is for (per piece, per kg, etc.)

---

### 4. New API Endpoint - Units Management

**CHANGE**: New endpoint to fetch available units

**NEW ENDPOINT:**
```kotlin
GET /api/units?active=true

Response:
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "name": "Kilogram",
      "symbol": "kg",
      "description": "Weight measurement",
      "isActive": true
    },
    {
      "id": "yyy",
      "name": "Piece",
      "symbol": "piece",
      "description": "Individual unit",
      "isActive": true
    }
    // ... more units
  ]
}
```

**WHEN TO USE**: If you have product creation/editing in your app

---

### 5. Cart & Order Models - Add Unit Field

**UPDATE OrderItem MODEL:**
```kotlin
data class OrderItem(
    val productId: String,
    val productName: String,
    val quantity: Int,
    val price: Double,
    val unit: String  // 🆕 ADD THIS
)
```

**UPDATE CartItem DISPLAY:**
```kotlin
// Show unit in cart calculations
val itemTotal = item.quantity * item.product.price
val displayText = "৳${item.product.price}/${item.product.unit} × " +
                  "${item.quantity}${item.product.unit} = " +
                  "৳${itemTotal.formatWithComma()}"
// Example: "৳500/kg × 10kg = ৳5,000"
```

---

## IMPLEMENTATION CHECKLIST

### Immediate Actions Required:

- [ ] **Step 1**: Add `unit: String` field to Product model
- [ ] **Step 2**: Update API limit from 12 to 100 in products list call
- [ ] **Step 3**: Update ALL price TextViews to show unit
  - [ ] Product list/grid items
  - [ ] Product detail screen
  - [ ] Cart item rows
  - [ ] Wishlist items
  - [ ] Order history items
  - [ ] Checkout summary
- [ ] **Step 4**: Add unit to OrderItem model
- [ ] **Step 5**: Update cart calculations to show unit
- [ ] **Step 6**: Test with existing products (they should have units now)
- [ ] **Step 7**: Handle null/missing units gracefully (fallback to empty string)

---

## HELPER EXTENSION FUNCTIONS

Add these to your utils:

```kotlin
// Format price with unit
fun Double.formatPriceWithUnit(unit: String): String {
    return "৳${this.formatWithComma()}${if (unit.isNotEmpty()) "/$unit" else ""}"
}

// Format number with commas
fun Double.formatWithComma(): String {
    return String.format("%,.0f", this)
}

// Display cart item with unit
fun CartItem.getDisplayString(): String {
    val unitPrice = product.price
    val total = unitPrice * quantity
    return "৳${unitPrice}/${product.unit} × $quantity${product.unit} = ৳${total.formatWithComma()}"
}
```

**USAGE:**
```kotlin
// Simple price display
priceText.text = product.price.formatPriceWithUnit(product.unit)

// Cart item display
itemText.text = cartItem.getDisplayString()
```

---

## TESTING SCENARIOS

After implementing, test these:

1. **Product List**: Verify all products show "৳[price]/[unit]"
2. **Product Detail**: Check main price displays unit
3. **Cart**: Ensure unit shows in item rows
4. **Cart Total**: Calculation should work with any unit
5. **Checkout**: Order summary shows units
6. **Order History**: Past orders display units correctly
7. **Null Units**: App doesn't crash if unit is null/empty

---

## BACKWARD COMPATIBILITY

**If your app has cached products without unit field:**

```kotlin
// Add default value in model
data class Product(
    // ... other fields
    val unit: String = "piece"  // Default fallback
)

// Or handle in UI
val displayUnit = product.unit.ifEmpty { "piece" }
priceText.text = "৳${product.price}/$displayUnit"
```

---

## EXAMPLE: COMPLETE PRODUCT CARD UPDATE

**Before:**
```kotlin
holder.apply {
    nameText.text = product.name
    priceText.text = "৳${product.price}"
    // ...
}
```

**After:**
```kotlin
holder.apply {
    nameText.text = product.name
    priceText.text = "৳${product.price}/${product.unit}"  // ✅ Added unit
    // ...
}
```

---

## SUMMARY OF CHANGES

| Component | Change | Priority |
|-----------|--------|----------|
| Product Model | Add `unit` field | 🔴 Critical |
| API Calls | Change limit 12→100 | 🟡 Medium |
| Price Displays | Show unit everywhere | 🔴 Critical |
| Cart Display | Show unit calculations | 🔴 Critical |
| OrderItem Model | Add `unit` field | 🟡 Medium |

---

## QUICK UPDATE COMMAND

Use this prompt with AI assistant:

"Update my Android app for SkyzoneBD with these changes:
1. Add 'unit: String' field to Product model
2. Update all price displays to show unit format: ৳500/kg
3. Change products API limit from 12 to 100
4. Add unit to cart item displays showing: ৳500/kg × 10kg = ৳5,000
5. Add unit field to OrderItem model
6. Update product list, detail, cart, wishlist, and order screens to display units"

---

## NEED HELP?

**API Base URL**: https://skyzonebd.vercel.app/api

**Test the changes**:
```bash
# Get products with units
curl https://skyzonebd.vercel.app/api/products?limit=5

# Get available units
curl https://skyzonebd.vercel.app/api/units?active=true
```

**Questions?** All products in the database now have units assigned.

---

## DAY 1: Core Setup & Essential Features

### 1. Project Setup & Architecture (2 hours)
```
Create a native Android app for SkyzoneBD e-commerce platform with the following setup:

PROJECT DETAILS:
- App Name: SkyzoneBD
- Package: com.skyzonebd.app
- Minimum SDK: 24 (Android 7.0)
- Target SDK: 34 (Android 14)
- Language: Kotlin
- Architecture: MVVM with Clean Architecture

DEPENDENCIES REQUIRED:
- Retrofit for API calls
- Gson for JSON parsing
- Coroutines for async operations
- Hilt for dependency injection
- Room for local database
- Glide/Coil for image loading
- DataStore for preferences
- Navigation Component
- Material Design 3

BASE API URL: https://skyzonebd.vercel.app/api

Create the project structure with:
- data/ (models, repositories, data sources)
- domain/ (use cases, entities)
- presentation/ (viewmodels, fragments, activities)
- di/ (dependency injection modules)
- utils/ (helpers, constants, extensions)
```

### 2. API Integration Layer (3 hours)
```
Implement API integration for SkyzoneBD with these endpoints:

AUTHENTICATION:
POST /auth/register - Register new user
POST /auth/login - Login user
GET /auth/profile - Get user profile
PUT /auth/profile - Update profile

PRODUCTS:
GET /products?page=1&limit=100 - Get all products
GET /products/:id - Get product details
GET /products?search=query - Search products
GET /products?category=slug - Filter by category
GET /products?featured=true - Get featured products

CATEGORIES:
GET /categories - Get all categories

UNITS:
GET /units?active=true - Get active units

CART (requires auth):
GET /cart - Get cart items
POST /cart/add - Add to cart
PUT /cart/update - Update quantity
DELETE /cart/remove/:productId - Remove from cart

ORDERS (requires auth):
POST /orders - Create order
GET /orders - Get user orders
GET /orders/:id - Get order details

Create:
1. ApiService interface with all endpoints
2. NetworkModule for Retrofit setup
3. AuthInterceptor for JWT token handling
4. Repository pattern for data access
5. NetworkResult sealed class for API responses
6. Error handling with proper messages

IMPORTANT: 
- Store JWT token in DataStore
- Add "Bearer {token}" to Authorization header
- Handle network errors gracefully
- Implement offline caching with Room
```

### 3. Authentication Flow (2 hours)
```
Implement complete authentication system:

SCREENS:
1. Splash Screen - Check if user logged in
2. Login Screen - Email & password login
3. Register Screen - User registration with:
   - Name, Email, Phone, Password
   - User Type selection (RETAIL/WHOLESALE)
   - Business info for B2B users

FEATURES:
- Form validation
- Error messages display
- Loading states
- Remember me functionality
- Auto-login on app start
- Logout functionality

DATA MODELS:
User {
  id, email, name, phone, role, userType, isVerified
}

LoginRequest {
  email, password
}

RegisterRequest {
  name, email, phone, password, userType, companyName (optional)
}

STORAGE:
- Save user object in DataStore
- Save JWT token securely
- Clear on logout
```

### 4. Product Listing & Search (3 hours)
```
Create comprehensive product browsing experience:

HOME SCREEN:
- Hero slider with featured products
- Category grid (8 categories with icons)
- Featured products horizontal scroll
- Search bar at top
- Bottom navigation

PRODUCTS LIST SCREEN:
- Grid layout (2 columns)
- Product card showing:
  * Product image
  * Name
  * Price with UNIT (৳500/kg format)
  * Rating
  * Stock status badge
  * Add to cart button
- Pull to refresh
- Infinite scroll pagination
- Filter by category
- Sort options (name, price, rating, newest)
- Search functionality

PRODUCT CARD DATA:
Product {
  id, name, price, unit, imageUrl, description,
  category, brand, stockQuantity, availability,
  rating, minOrderQuantity, isFeatured
}

IMPORTANT:
- Display unit with every price (piece, kg, liter, box, etc.)
- Show minimum order quantity
- Handle out of stock products
- Implement shimmer loading
```

---

## DAY 2: Advanced Features & Polish

### 5. Product Detail Screen (2 hours)
```
Create detailed product view with:

LAYOUT:
- Image gallery with swipe (ViewPager2)
- Product name and brand
- Price with unit in large text (৳2,500/kg)
- Rating and reviews count
- Stock availability badge
- Description expandable section
- Specifications table
- Quantity selector (respect minOrderQuantity)
- Wholesale tier pricing table (if applicable)
- Add to cart button (sticky at bottom)
- Related products section

B2B FEATURES:
- Show wholesale tiers if user is WHOLESALE type
- Display bulk discounts clearly
- Show MOQ (Minimum Order Quantity)

WHOLESALE TIER DISPLAY:
Quantity | Price | Discount
50-99    | ৳2,200/kg | 12%
100-499  | ৳2,000/kg | 20%
500+     | ৳1,800/kg | 28%

ACTIONS:
- Add to cart with quantity
- Add to wishlist
- Share product
- View similar products
```

### 6. Shopping Cart & Checkout (3 hours)
```
Implement complete cart and checkout flow:

CART SCREEN:
- List of cart items with:
  * Product image
  * Name
  * Unit price (৳500/kg)
  * Quantity stepper
  * Subtotal
  * Remove button
- Order summary section:
  * Subtotal
  * Shipping (if applicable)
  * Tax
  * Total
- Continue shopping button
- Proceed to checkout button
- Empty cart state with illustration

CHECKOUT SCREEN:
1. Delivery Address Section
   - Select from saved addresses
   - Add new address
   - Default address selection

2. Payment Method Section
   - Cash on Delivery
   - Mobile Payment (bKash, Nagad, Rocket)
   - Bank Transfer
   - Card Payment (optional)

3. Order Summary
   - List all items with quantity and unit
   - Show unit prices (৳500/kg × 10kg = ৳5,000)
   - Final total

4. Place Order Button

ORDER CREATION:
OrderRequest {
  items: [{ productId, quantity }],
  shippingAddress: { street, city, state, postalCode, country },
  paymentMethod: string,
  specialInstructions: string (optional)
}

SUCCESS FLOW:
- Show order confirmation screen
- Display order number
- Show estimated delivery
- Option to track order
- Return to home
```

### 7. User Profile & Orders (2 hours)
```
Create user account management:

PROFILE SCREEN:
- User info section (name, email, phone)
- Edit profile option
- Order history
- Addresses management
- Logout button

MY ORDERS SCREEN:
- List of orders with:
  * Order number
  * Date
  * Total amount
  * Status badge (pending, confirmed, shipped, delivered)
  * Items count
- Tap to view order details

ORDER DETAILS SCREEN:
- Order number and date
- Status timeline
- Items list with unit prices
- Delivery address
- Payment method
- Order total breakdown
- Track order button (if shipped)
- Reorder button
- Contact support button

B2B USER EXTRAS:
- Business verification status
- Wholesale purchase history
- RFQ (Request for Quote) section
```

### 8. Additional Features & Polish (1 hour)
```
Implement these essential features:

WISHLIST:
- Add/remove products from wishlist
- Heart icon on product cards
- Dedicated wishlist screen
- Move to cart option

CATEGORIES:
- Category listing screen
- Filter products by category
- Category icons/images

SEARCH:
- Search bar in toolbar
- Recent searches
- Search suggestions
- Filter search results

NOTIFICATIONS:
- Order status updates
- Promotional notifications
- Firebase Cloud Messaging integration

OFFLINE MODE:
- Cache products locally with Room
- Show cached data when offline
- Sync when connection restored

ERROR HANDLING:
- Network error messages
- Empty states with illustrations
- Retry mechanisms
- Toast messages for user actions
```

### 9. UI/UX Requirements
```
Apply these design principles:

THEME:
- Primary Color: #3B82F6 (Blue)
- Secondary Color: #10B981 (Green)
- Error Color: #EF4444 (Red)
- Background: #F9FAFB (Light Gray)

COMPONENTS:
- Material Design 3 components
- Rounded corners (8dp)
- Card elevation (2dp)
- Bottom sheet for filters
- Snackbar for notifications
- Progress indicators for loading

TYPOGRAPHY:
- Headings: Bold, 20sp
- Body: Regular, 14sp
- Captions: Regular, 12sp
- Prices: Bold, 18sp

IMAGES:
- Glide/Coil for image loading
- Placeholder images
- Error images
- Circular progress while loading

IMPORTANT:
- Always show unit with price (৳500/kg)
- Use Bangla taka symbol (৳)
- Format numbers with commas (৳1,000)
- Show loading states
- Handle errors gracefully
```

---

## API AUTHENTICATION FLOW

```
1. LOGIN:
POST /api/auth/login
Body: { email, password }
Response: { success: true, token: "jwt_token", user: {...} }

2. STORE TOKEN:
Save token in DataStore: "auth_token"

3. AUTHENTICATED REQUESTS:
Add header: Authorization: Bearer {token}

4. TOKEN VALIDATION:
- If 401 response, token expired
- Clear token and redirect to login

5. LOGOUT:
- Clear DataStore
- Navigate to login screen
```

---

## KEY DATA MODELS

```kotlin
data class Product(
    val id: String,
    val name: String,
    val price: Double,
    val unit: String,  // IMPORTANT: "kg", "piece", "liter", etc.
    val imageUrl: String, 
    val imageUrls: List<String>,
    val description: String?,
    val category: String,
    val brand: String?,
    val stockQuantity: Int,
    val availability: String,
    val rating: Double?,
    val minOrderQuantity: Int,
    val wholesaleEnabled: Boolean,
    val wholesaleMOQ: Int?,
    val wholesaleTiers: List<WholesaleTier>,
    val isFeatured: Boolean
)

data class WholesaleTier(
    val minQuantity: Int,
    val maxQuantity: Int?,
    val price: Double,
    val discount: Double
)

data class CartItem(
    val product: Product,
    val quantity: Int
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val phone: String?,
    val role: String,
    val userType: String,  // "RETAIL" or "WHOLESALE"
    val isVerified: Boolean
)

data class Order(
    val id: String,
    val orderNumber: String,
    val userId: String,
    val items: List<OrderItem>,
    val total: Double,
    val status: String,
    val shippingAddress: Address,
    val paymentMethod: String,
    val createdAt: String
)

data class OrderItem(
    val productId: String,
    val productName: String,
    val quantity: Int,
    val price: Double,
    val unit: String  // IMPORTANT
)

data class Category(
    val id: String,
    val name: String,
    val slug: String,
    val imageUrl: String?,
    val count: Int
)
```

---

## TESTING CREDENTIALS

```
Admin:
Email: admin@skyzonebd.com
Password: 11admin22

Retail Customer:
Email: customer@example.com
Password: 11admin22

Wholesale Customer:
Email: wholesale@example.com
Password: 11admin22
```

---

## PRIORITY FEATURES FOR 2-DAY TIMELINE

### MUST HAVE (Day 1):
✅ Authentication (login/register)
✅ Product listing with unit display
✅ Product details
✅ Add to cart
✅ Basic navigation

### SHOULD HAVE (Day 2):
✅ Cart management
✅ Checkout & order placement
✅ Order history
✅ Profile management
✅ Search functionality

### NICE TO HAVE (if time permits):
⭐ Wishlist
⭐ Categories filter
⭐ Offline mode
⭐ Push notifications
⭐ Wholesale tier display for B2B users

---

## FINAL CHECKLIST

Before deployment, ensure:
- [ ] All prices show units (৳500/kg format)
- [ ] Minimum order quantities are enforced
- [ ] JWT token authentication works
- [ ] Cart persists across app restarts
- [ ] Error messages are user-friendly
- [ ] Loading states are implemented
- [ ] Images load with placeholders
- [ ] App works offline (cached data)
- [ ] B2B users see wholesale pricing
- [ ] Order placement works end-to-end
- [ ] App doesn't crash on errors
- [ ] Navigation is intuitive
- [ ] Form validation works
- [ ] Search returns results
- [ ] App follows Material Design

---

## QUICK START COMMAND

Use this prompt to start development:

"Create a native Android e-commerce app in Kotlin for SkyzoneBD with MVVM architecture. 
Include: Authentication, Product browsing with unit-based pricing (৳500/kg format), 
Shopping cart, Checkout flow, Order history, User profile. 
API base: https://skyzonebd.vercel.app/api. 
Use Retrofit, Coroutines, Hilt, Room, Navigation Component, Material Design 3. 
Support both B2C (retail) and B2B (wholesale) users with tiered pricing."

---

## IMPORTANT NOTES

1. **UNIT DISPLAY**: Every price MUST show the unit (piece, kg, liter, etc.)
   - Product cards: "৳500/kg"
   - Cart items: "৳500/kg × 10kg = ৳5,000"
   - Order summary: Show unit for each item

2. **MINIMUM ORDER QUANTITY**: Respect minOrderQuantity for each product
   - Don't allow quantity less than MOQ
   - Show MOQ clearly on product page

3. **B2B/B2C DIFFERENCE**:
   - Check user.userType
   - Show wholesale tiers only for WHOLESALE users
   - Display bulk discounts prominently

4. **ERROR HANDLING**:
   - Network timeouts
   - Invalid responses
   - Authentication failures
   - Out of stock items

5. **PERFORMANCE**:
   - Lazy load images 
   - Paginate product lists
   - Cache frequently accessed data
   - Optimize API calls

Good luck with your 2-day Android app development! 🚀
