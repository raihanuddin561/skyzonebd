# Product Review and Rating System - Complete Implementation

## Overview
Complete implementation of a product review and rating system with verified purchaser checks, moderation workflow, and rating aggregation.

## Database Schema

### Review Model
```prisma
model Review {
  id                 String       @id @default(cuid())
  productId          String
  userId             String
  orderId            String
  rating             Int          // 1-5 stars
  title              String?      // Optional review title
  comment            String       @db.Text
  images             String[]     // Array of image URLs
  isVerifiedPurchase Boolean      @default(true)
  purchaseDate       DateTime?
  status             ReviewStatus @default(PENDING)
  moderatedBy        String?
  moderatedAt        DateTime?
  moderationNote     String?      @db.Text
  helpfulCount       Int          @default(0)
  notHelpfulCount    Int          @default(0)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  
  product            Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  user               User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  order              Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  moderator          User?        @relation("ModeratedReviews", fields: [moderatedBy], references: [id], onDelete: SetNull)
  
  @@unique([userId, productId, orderId])
  @@index([productId])
  @@index([userId])
  @@index([status])
  @@index([rating])
  @@index([createdAt])
}

enum ReviewStatus {
  PENDING
  APPROVED
  HIDDEN
  REJECTED
}
```

### Related Model Updates
- **Product**: Added `rating` (Float?), `reviewCount` (Int) fields
- **User**: Added `reviews` (Review[]) relation
- **Order**: Added `reviews` (Review[]) relation

## API Endpoints

### 1. Submit Review (POST /api/reviews)
**Authentication**: Required (User)

**Request Body**:
```json
{
  "productId": "string",
  "orderId": "string",
  "rating": 1-5,
  "title": "string (optional)",
  "comment": "string (required)",
  "images": ["url1", "url2"] // optional
}
```

**Validation**:
- User must be authenticated
- Product must exist
- Order must exist and belong to user
- Order status must be DELIVERED
- Product must be in the order
- User cannot submit duplicate review for same product in same order

**Response**:
```json
{
  "success": true,
  "message": "Review submitted successfully. It will be visible after moderation.",
  "review": { /* review object */ }
}
```

**Status**: Creates review with `PENDING` status (requires moderation)

---

### 2. Get Product Reviews (GET /api/reviews/product/:id)
**Authentication**: Not required

**Query Parameters**:
- `status`: PENDING | APPROVED | HIDDEN | REJECTED (default: APPROVED)
- `ratingFilter`: 1-5 (filter by rating)
- `sortBy`: createdAt | rating | helpful (default: createdAt)
- `sortOrder`: asc | desc (default: desc)
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response**:
```json
{
  "reviews": [
    {
      "id": "string",
      "rating": 5,
      "title": "string",
      "comment": "string",
      "images": ["url"],
      "isVerifiedPurchase": true,
      "createdAt": "ISO date",
      "user": {
        "name": "string"
      },
      "helpfulCount": 0,
      "notHelpfulCount": 0
    }
  ],
  "aggregation": {
    "averageRating": 4.5,
    "totalReviews": 100,
    "ratingDistribution": {
      "5": 50,
      "4": 30,
      "3": 15,
      "2": 3,
      "1": 2
    },
    "ratingPercentages": {
      "5": 50,
      "4": 30,
      "3": 15,
      "2": 3,
      "1": 2
    }
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "totalCount": 100
  }
}
```

---

### 3. Admin - Get Review Moderation Queue (GET /api/admin/reviews)
**Authentication**: Required (Admin)

**Query Parameters**:
- `status`: PENDING | APPROVED | HIDDEN | REJECTED (filter by status)
- `productId`: string (filter by product)
- `userId`: string (filter by user)
- `rating`: 1-5 (filter by rating)
- `sortBy`: createdAt | rating (default: createdAt)
- `sortOrder`: asc | desc (default: desc)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response**:
```json
{
  "reviews": [
    {
      "id": "string",
      "rating": 5,
      "title": "string",
      "comment": "string",
      "images": ["url"],
      "isVerifiedPurchase": true,
      "status": "PENDING",
      "createdAt": "ISO date",
      "user": {
        "name": "string",
        "email": "string"
      },
      "product": {
        "id": "string",
        "name": "string",
        "imageUrl": "string"
      },
      "order": {
        "id": "string"
      }
    }
  ],
  "summary": {
    "total": 100,
    "pending": 20,
    "approved": 70,
    "hidden": 5,
    "rejected": 5
  },
  "pagination": { /* pagination object */ }
}
```

---

### 4. Admin - Moderate Review (PATCH /api/admin/reviews/:id)
**Authentication**: Required (Admin)

**Request Body**:
```json
{
  "status": "APPROVED | HIDDEN | REJECTED",
  "moderationNote": "string (optional)"
}
```

**Process**:
1. Updates review status
2. Sets moderatedBy (admin ID) and moderatedAt (timestamp)
3. Saves moderation note if provided
4. **Automatically recalculates product rating** when status changes to/from APPROVED

**Response**:
```json
{
  "success": true,
  "message": "Review status updated to APPROVED",
  "review": { /* updated review */ }
}
```

---

### 5. Admin - Delete Review (DELETE /api/admin/reviews/:id)
**Authentication**: Required (Admin)

**Process**:
1. Permanently deletes review from database
2. **Automatically recalculates product rating** if review was APPROVED
3. Cannot be undone

**Response**:
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

### 6. Partner - View Product Reviews (GET /api/partner/reviews)
**Authentication**: Required (Partner)

**Query Parameters**:
- `status`: PENDING | APPROVED | HIDDEN | REJECTED (default: APPROVED)
- `productId`: string (filter by specific product)
- `rating`: 1-5 (filter by rating)
- `sortBy`: createdAt | rating (default: createdAt)
- `sortOrder`: asc | desc (default: desc)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Scope**: Only returns reviews for products where `sellerId` matches partner's ID

**Response**:
```json
{
  "reviews": [ /* array of reviews */ ],
  "summary": {
    "total": 50,
    "averageRating": 4.2,
    "byRating": {
      "5": 20,
      "4": 15,
      "3": 10,
      "2": 3,
      "1": 2
    }
  },
  "pagination": { /* pagination object */ }
}
```

---

## UI Components

### 1. StarRating Component
**Location**: `src/components/reviews/StarRating.tsx`

**Props**:
- `rating`: number (0-5)
- `maxRating`: number (default: 5)
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `showNumber`: boolean (default: true)
- `interactive`: boolean (default: false)
- `onChange`: (rating: number) => void

**Features**:
- Display-only or interactive mode
- Half-star support for averages
- Customizable size
- Click to select rating (interactive mode)

---

### 2. ReviewCard Component
**Location**: `src/components/reviews/ReviewCard.tsx`

**Props**:
- `review`: Review object
- `showProduct`: boolean (default: false)
- `onHelpful`: (reviewId: string) => void
- `onNotHelpful`: (reviewId: string) => void

**Features**:
- Display review with rating, title, comment
- Show verified purchase badge
- Display review images (expandable)
- Helpful/Not helpful buttons
- Optional product information

---

### 3. ReviewForm Component
**Location**: `src/components/reviews/ReviewForm.tsx`

**Props**:
- `productId`: string
- `productName`: string
- `orderId`: string
- `onSuccess`: () => void
- `onCancel`: () => void

**Features**:
- Star rating input (required)
- Optional title (max 100 chars)
- Comment textarea (max 1000 chars, required)
- Image upload placeholder (coming soon)
- Review guidelines
- Character counters
- Form validation

---

### 4. ReviewList Component
**Location**: `src/components/reviews/ReviewList.tsx`

**Props**:
- `productId`: string
- `showFilters`: boolean (default: true)

**Features**:
- Rating summary card with distribution
- Filter by star rating
- Sort options (recent, rating, helpful)
- Pagination controls
- Empty state handling
- Loading states

---

## Pages

### 1. Admin Review Moderation Page
**Location**: `src/app/admin/reviews/page.tsx`

**Features**:
- Status summary cards (Total, Pending, Approved, Hidden, Rejected)
- Filter by status (clickable cards)
- Review list with full details
- Inline moderation actions (Approve, Hide, Reject, Delete)
- Moderation note input
- User and product information
- Verified purchase indicator
- Pagination

**Moderation Workflow**:
1. Reviews default to PENDING status
2. Admin can Approve (visible to public)
3. Admin can Hide (invisible but not deleted)
4. Admin can Reject (marked as rejected)
5. Admin can Delete (permanently remove)
6. All actions tracked with admin ID and timestamp

---

### 2. Partner Reviews Page
**Location**: `src/app/partner/reviews/page.tsx`

**Features**:
- Summary dashboard (total, average rating, distribution)
- Filter by status and rating
- View all reviews for partner's products
- Product thumbnail with each review
- Sort and pagination
- Read-only view (no moderation)

---

## Rating Aggregation System

### Automatic Updates
Product ratings are automatically updated when:
- Review is approved
- Review is hidden/rejected (removes from average)
- Review is deleted

### Calculation Logic
```typescript
async function updateProductRating(productId: string) {
  // Get all approved reviews
  const approvedReviews = await prisma.review.findMany({
    where: { productId, status: 'APPROVED' }
  });
  
  if (approvedReviews.length === 0) {
    // No reviews - clear rating
    await prisma.product.update({
      where: { id: productId },
      data: { rating: null, reviewCount: 0 }
    });
  } else {
    // Calculate average
    const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / approvedReviews.length;
    
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: averageRating,
        reviewCount: approvedReviews.length
      }
    });
  }
}
```

### Caching
- Product.rating and Product.reviewCount are cached in database
- Recalculated automatically on review status changes
- Public API returns cached values for performance

---

## Verified Purchaser System

### Verification Rules
A user can review a product only if:
1. ✅ User is authenticated
2. ✅ Product exists in database
3. ✅ User has an order containing the product
4. ✅ Order belongs to the user
5. ✅ Order status is DELIVERED (not PENDING, PROCESSING, or SHIPPED)
6. ✅ Product was actually in the order (via OrderItem)
7. ✅ User hasn't already reviewed this product for this order

### Unique Constraint
```prisma
@@unique([userId, productId, orderId])
```
Prevents duplicate reviews for same product in same order.

### Badge Display
- Reviews marked with `isVerifiedPurchase: true`
- Green badge displayed: "✓ Verified Purchase"
- Shown on all review displays

---

## Implementation Checklist

### Database ✅
- [x] Review model created
- [x] ReviewStatus enum defined
- [x] Product.rating and reviewCount fields added
- [x] User.reviews relation added
- [x] Order.reviews relation added
- [x] Unique constraint on userId_productId_orderId
- [x] Indexes on productId, userId, status, rating, createdAt

### API Endpoints ✅
- [x] POST /api/reviews (submit review)
- [x] GET /api/reviews/product/:id (public reviews)
- [x] GET /api/admin/reviews (moderation queue)
- [x] PATCH /api/admin/reviews/:id (moderate)
- [x] DELETE /api/admin/reviews/:id (delete)
- [x] GET /api/partner/reviews (partner view)

### UI Components ✅
- [x] StarRating component
- [x] ReviewCard component
- [x] ReviewForm component
- [x] ReviewList component

### Pages ✅
- [x] Admin review moderation page
- [x] Partner reviews page

### Features ✅
- [x] Verified purchaser validation
- [x] Rating aggregation
- [x] Moderation workflow
- [x] Status tracking (PENDING → APPROVED/HIDDEN/REJECTED)
- [x] Admin moderation interface
- [x] Partner view interface
- [x] Pagination
- [x] Filtering and sorting
- [x] Image support (URLs)

---

## Usage Examples

### Customer Submitting Review
```typescript
// After order is delivered
const response = await fetch('/api/reviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'prod_123',
    orderId: 'order_456',
    rating: 5,
    title: 'Excellent product!',
    comment: 'This product exceeded my expectations...',
    images: ['https://example.com/image1.jpg']
  })
});
```

### Displaying Reviews on Product Page
```tsx
import ReviewList from '@/components/reviews/ReviewList';

<ReviewList productId={product.id} />
```

### Admin Approving Review
```typescript
const response = await fetch(`/api/admin/reviews/${reviewId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'APPROVED',
    moderationNote: 'Review meets guidelines'
  })
});
```

---

## Future Enhancements

### Not Yet Implemented
1. **Review Helpfulness Voting**
   - Add endpoints to vote helpful/not helpful
   - Track votes per user (prevent duplicate votes)
   - Sort by helpfulness

2. **Seller Responses**
   - Allow partners to respond to reviews
   - Display responses below reviews
   - Track response dates

3. **Image Upload**
   - Implement file upload for review images
   - Image compression and optimization
   - Cloud storage integration (S3/Cloudinary)

4. **Review Analytics**
   - Sentiment analysis
   - Common keywords/themes
   - Review trends over time

5. **Email Notifications**
   - Notify users when review approved/rejected
   - Notify partners of new reviews
   - Request reviews after delivery

6. **Bulk Moderation**
   - Select multiple reviews
   - Bulk approve/hide/reject
   - Export reviews to CSV

---

## Migration Guide

### Required Migration
```bash
# Run Prisma migration
npx prisma migrate dev --name add_review_system

# Or reset database (development only)
npx prisma migrate reset
```

### Seed Data (Optional)
```typescript
// Add sample reviews for testing
const reviews = await prisma.review.createMany({
  data: [
    {
      productId: 'existing_product_id',
      userId: 'existing_user_id',
      orderId: 'existing_delivered_order_id',
      rating: 5,
      comment: 'Great product!',
      status: 'APPROVED',
      isVerifiedPurchase: true
    }
  ]
});
```

---

## Troubleshooting

### Review Submission Fails
- **Error**: "Product not found in order"
  - Ensure product exists in OrderItem for the specified order
  - Check order belongs to authenticated user

- **Error**: "Order is not delivered yet"
  - Order must have status DELIVERED
  - Only delivered orders allow reviews

- **Error**: "You have already reviewed this product"
  - Unique constraint prevents duplicate reviews
  - One review per product per order per user

### Rating Not Updating
- Check review status is APPROVED
- Verify updateProductRating() is called after moderation
- Confirm no database errors in logs

### Reviews Not Visible
- Default status is PENDING (not public)
- Admin must approve reviews first
- Check status filter in API calls

---

## Security Considerations

1. **Authentication**: All write operations require authentication
2. **Authorization**: Users can only review own orders, admins moderate, partners view own products
3. **Verified Purchases**: Strict validation prevents fake reviews
4. **Moderation**: All reviews pending by default
5. **Rate Limiting**: Consider adding to prevent abuse
6. **Content Validation**: Max lengths enforced (title: 100, comment: 1000)

---

## Performance Optimization

1. **Caching**: Product rating cached in Product model
2. **Indexes**: Strategic indexes on frequently queried fields
3. **Pagination**: All lists support pagination (default 10-20 items)
4. **Aggregation**: Efficient groupBy for rating distribution
5. **Lazy Loading**: Images loaded on demand

---

## Testing Checklist

- [ ] Submit review with all fields
- [ ] Submit review with minimum fields (rating + comment)
- [ ] Try submitting without delivered order
- [ ] Try submitting duplicate review
- [ ] Test admin approval workflow
- [ ] Test admin hide/reject actions
- [ ] Test admin delete review
- [ ] Verify rating updates automatically
- [ ] Test pagination on all pages
- [ ] Test filtering by rating
- [ ] Test partner view (only sees own products)
- [ ] Test verified badge display
- [ ] Test responsive design on mobile

---

## Deployment Notes

1. **Database Migration**: Run Prisma migration on production
2. **Environment Variables**: Ensure auth secrets configured
3. **Permissions**: Verify admin and partner roles exist
4. **Image URLs**: Configure image hosting if using uploads
5. **Monitoring**: Track review submission rate
6. **Moderation Queue**: Set up admin alerts for pending reviews

---

**Implementation Complete** ✅

All APIs, UI components, and database changes have been implemented. System is ready for testing and deployment.
