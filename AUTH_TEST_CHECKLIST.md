# Authentication & Authorization Test Checklist

## ✅ Test Credentials

### Admin User
```
Email: admin@skyzonebd.com
Password: 11admin22
Role: admin
Access: Full admin dashboard + all user features
```

### Demo Customer
```
Email: demo@skyzonebd.com
Password: demo123
Role: buyer
Access: Standard user features (no admin dashboard)
```

---

## 🧪 Login & Logout Tests

### Test 1: Admin Login
- [ ] Go to `/auth/login`
- [ ] Enter admin credentials
- [ ] Click "Sign in"
- [ ] **Expected**: Redirect to homepage
- [ ] **Expected**: User icon appears in header with "Admin User"
- [ ] **Expected**: "Dashboard" link visible in user dropdown

### Test 2: Customer Login
- [ ] Go to `/auth/login`
- [ ] Enter demo customer credentials
- [ ] Click "Sign in"
- [ ] **Expected**: Redirect to homepage
- [ ] **Expected**: User icon appears in header with "Demo User"
- [ ] **Expected**: NO "Dashboard" link in user dropdown

### Test 3: Invalid Credentials
- [ ] Go to `/auth/login`
- [ ] Enter wrong email/password
- [ ] Click "Sign in"
- [ ] **Expected**: Error toast message
- [ ] **Expected**: Stay on login page

### Test 4: Logout
- [ ] Login with any account
- [ ] Click user icon in header
- [ ] Click "Logout"
- [ ] **Expected**: Toast message "Logged out successfully"
- [ ] **Expected**: Redirect shows login/register links
- [ ] **Expected**: User icon disappears

### Test 5: Already Logged In
- [ ] Login with any account
- [ ] Try to navigate to `/auth/login`
- [ ] **Expected**: Automatically redirect to homepage

---

## 🔒 Protected Routes Tests

### Test 6: Profile Page (Requires Auth)
- [ ] **When NOT logged in:**
  - Navigate to `/profile`
  - **Expected**: Redirect to `/auth/login`
  
- [ ] **When logged in:**
  - Navigate to `/profile`
  - **Expected**: Show profile page with user info

### Test 7: Orders Page (Requires Auth)
- [ ] **When NOT logged in:**
  - Navigate to `/orders`
  - **Expected**: Redirect to `/auth/login`
  
- [ ] **When logged in:**
  - Navigate to `/orders`
  - **Expected**: Show orders list

### Test 8: Admin Dashboard (Admin Only)
- [ ] **When NOT logged in:**
  - Navigate to `/dashboard`
  - **Expected**: Redirect to `/auth/login`
  
- [ ] **When logged in as Customer:**
  - Navigate to `/dashboard`
  - **Expected**: Redirect to homepage OR show "Access Denied"
  
- [ ] **When logged in as Admin:**
  - Navigate to `/dashboard`
  - **Expected**: Show admin dashboard with stats

---

## 🛍️ Guest Access Tests

### Test 9: Guest Shopping (No Auth Required)
- [ ] **When NOT logged in:**
  - Browse `/products`
  - **Expected**: Can view products
  
  - Click on a product
  - **Expected**: Can view product details
  
  - Add to cart
  - **Expected**: Product added to cart
  
  - View `/cart`
  - **Expected**: Can view cart items
  
  - Click "Proceed to Checkout"
  - **Expected**: Can checkout as guest (no redirect to login)

### Test 10: Wishlist (Requires Auth)
- [ ] **When NOT logged in:**
  - Try to add to wishlist
  - **Expected**: May need auth (depends on implementation)
  
- [ ] **When logged in:**
  - Add product to wishlist
  - Navigate to `/wishlist`
  - **Expected**: See wishlist items

---

## 🔄 Session Persistence Tests

### Test 11: Page Refresh
- [ ] Login with any account
- [ ] Refresh the page (F5)
- [ ] **Expected**: User stays logged in
- [ ] **Expected**: User info still visible in header

### Test 12: New Tab
- [ ] Login with any account
- [ ] Open new tab
- [ ] Navigate to the site
- [ ] **Expected**: User still logged in in new tab

### Test 13: Browser Close/Reopen
- [ ] Login with any account
- [ ] Close browser completely
- [ ] Reopen browser and navigate to site
- [ ] **Expected**: User still logged in (localStorage persists)

---

## 🎯 Role-Based Access Tests

### Test 14: Admin Features
- [ ] Login as **Admin**
- [ ] Check header dropdown
- [ ] **Expected**: See "🏠 Dashboard" option
- [ ] Click "Dashboard"
- [ ] **Expected**: See admin dashboard with:
  - Total Products stat
  - Total Orders stat
  - Total Users stat
  - Pending Orders stat
  - Management links (Products, Orders, Users, Categories)

### Test 15: Customer Features
- [ ] Login as **Customer**
- [ ] Check header dropdown
- [ ] **Expected**: NO "Dashboard" option
- [ ] **Expected**: See only:
  - Profile
  - My Orders
  - Logout

### Test 16: Direct URL Access
- [ ] Login as **Customer**
- [ ] Manually type `/dashboard` in URL
- [ ] **Expected**: Redirect to homepage OR "Access Denied" page

---

## 🐛 Edge Cases & Error Handling

### Test 17: Empty Form Submission
- [ ] Go to `/auth/login`
- [ ] Click "Sign in" without entering credentials
- [ ] **Expected**: Browser validation error (HTML5 required)

### Test 18: Corrupted LocalStorage
- [ ] Open browser DevTools → Application → LocalStorage
- [ ] Set `user` to `"undefined"` (string)
- [ ] Refresh page
- [ ] **Expected**: No error, app cleans up corrupted data
- [ ] **Expected**: User is logged out

### Test 19: Token Expiry (Future)
- [ ] Login with any account
- [ ] Wait for token to expire (7 days by default)
- [ ] Try to access protected route
- [ ] **Expected**: Redirect to login

---

## 📱 Header Navigation Tests

### Test 20: Guest User Header
- [ ] **When NOT logged in:**
- [ ] Check header
- [ ] **Expected**: See:
  - SkyzoneBD logo
  - Products link
  - Compare link
  - Wishlist icon
  - Cart icon
  - Login button
  - Register button

### Test 21: Logged In User Header
- [ ] **When logged in:**
- [ ] Check header
- [ ] **Expected**: See:
  - SkyzoneBD logo
  - Products link
  - Compare link
  - Wishlist icon (with count if items exist)
  - Cart icon (with count if items exist)
  - User avatar with first letter of name
  - Dropdown with: Profile, My Orders, Logout (+ Dashboard if admin)

---

## 🔍 Registration Tests

### Test 22: New User Registration
- [ ] Go to `/auth/register`
- [ ] Fill in all fields:
  - Name
  - Email
  - Password
  - Confirm Password
  - Company Name
  - Phone
  - Select Role (buyer/seller)
- [ ] Click "Register"
- [ ] **Expected**: Success message
- [ ] **Expected**: Redirect to homepage
- [ ] **Expected**: User logged in automatically

### Test 23: Password Mismatch
- [ ] Go to `/auth/register`
- [ ] Enter different passwords in password fields
- [ ] Click "Register"
- [ ] **Expected**: Error message about password mismatch

### Test 24: Already Registered User
- [ ] Try to register with existing email (admin@skyzonebd.com)
- [ ] **Expected**: Error message "User already exists"

---

## ✅ Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Proper redirects
- ✅ Clear error messages
- ✅ Correct role-based access
- ✅ Session persistence
- ✅ Clean localStorage handling
- ✅ Responsive UI feedback (loading states, toasts)

---

## 🚨 Known Issues to Fix

### Fixed Issues:
- ✅ Admin credentials updated to: admin@skyzonebd.com / 11admin22
- ✅ LocalStorage corruption handling
- ✅ Role-based dashboard access
- ✅ Redirect logged-in users from login/register pages
- ✅ Enhanced ProtectedRoute with role checking

### To Monitor:
- [ ] JWT token expiry handling
- [ ] Refresh token implementation (if needed)
- [ ] API error handling consistency
- [ ] Loading states on all async operations

---

## 🔧 Quick Debugging Commands

### Check LocalStorage
```javascript
// In browser console
console.log('User:', localStorage.getItem('user'));
console.log('Token:', localStorage.getItem('token'));
```

### Clear All Auth Data
```javascript
// In browser console
localStorage.removeItem('user');
localStorage.removeItem('token');
location.reload();
```

### Check Current User
```javascript
// In React component
const { user, isAuthenticated } = useAuth();
console.log('Current user:', user);
console.log('Is authenticated:', isAuthenticated);
```

---

## 📊 Test Results Log

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Admin Login | ⏳ | |
| 2 | Customer Login | ⏳ | |
| 3 | Invalid Creds | ⏳ | |
| 4 | Logout | ⏳ | |
| 5 | Already Logged In | ⏳ | |
| 6 | Profile Page Auth | ⏳ | |
| 7 | Orders Page Auth | ⏳ | |
| 8 | Admin Dashboard | ⏳ | |
| ... | ... | ⏳ | |

**Legend:**
- ⏳ Not Tested
- ✅ Passed
- ❌ Failed
- ⚠️ Needs Attention
