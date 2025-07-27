# Store APIs Documentation

This document outlines all the APIs created for the store functionality in the poultry market application.

## API Endpoints

### 1. Get Store Details
**Endpoint:** `GET /api/stores/[slug]`
**Description:** Retrieves detailed information about a specific store including products, reviews, followers, and statistics.

**Parameters:**
- `slug` (path): Store identifier (can be dashboardSlug, customDomain, id, or name)

**Response:**
```json
{
  "id": "store_id",
  "name": "Store Name",
  "bio": "Store description",
  "avatar": "avatar_url",
  "role": "SELLER|COMPANY",
  "location": "Store location",
  "phone": "phone_number",
  "website": "website_url",
  "products": [...],
  "tags": [...],
  "followers": [...],
  "isFollowing": true|false,
  "stats": {
    "totalProducts": 10,
    "totalFollowers": 25,
    "totalReviews": 150,
    "averageRating": 4.5
  },
  "allProductReviews": [...]
}
```

### 2. Follow/Unfollow Store
**Endpoint:** `POST /api/stores/[storeId]/follow`
**Description:** Follow or unfollow a specific store.

**Authentication:** Required

**Response:**
```json
{
  "following": true|false,
  "message": "Successfully followed store"
}
```

### 3. Check Follow Status
**Endpoint:** `GET /api/stores/[storeId]/follow`
**Description:** Check if the current user is following a specific store.

**Authentication:** Optional

**Response:**
```json
{
  "following": true|false
}
```

### 4. Get Store Statistics
**Endpoint:** `GET /api/stores/[storeId]/stats`
**Description:** Get detailed statistics for a specific store.

**Response:**
```json
{
  "totalProducts": 10,
  "totalFollowers": 25,
  "totalReviews": 150,
  "averageRating": 4.5,
  "totalOrders": 500,
  "totalItemsSold": 1200,
  "monthlyStats": [...],
  "joinedAt": "2024-01-01T00:00:00.000Z"
}
```

### 5. List/Search Stores
**Endpoint:** `GET /api/stores`
**Description:** Get a paginated list of stores with optional filtering and searching.

**Query Parameters:**
- `search` (optional): Search term for store name, bio, or location
- `role` (optional): Filter by role (SELLER or COMPANY)
- `location` (optional): Filter by location
- `tag` (optional): Filter by tag
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)
- `sortBy` (optional): Sort field (name, followers, products, createdAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "stores": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalCount": 100,
    "totalPages": 9,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 6. Get Store Products
**Endpoint:** `GET /api/stores/[storeId]/products`
**Description:** Get paginated products for a specific store with filtering options.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 12)
- `search` (optional): Search term for product name or description
- `category` (optional): Filter by category
- `sortBy` (optional): Sort field (name, price, stock, rating, createdAt)
- `sortOrder` (optional): Sort order (asc, desc)
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter

**Response:**
```json
{
  "products": [...],
  "store": {
    "id": "store_id",
    "name": "Store Name",
    "avatar": "avatar_url",
    "role": "SELLER"
  },
  "pagination": {...}
}
```

### 7. Get Store Reviews
**Endpoint:** `GET /api/stores/[storeId]/reviews`
**Description:** Get paginated reviews for all products in a specific store.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `rating` (optional): Filter by specific rating (1-5)
- `sortBy` (optional): Sort field (rating, helpful, createdAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "reviews": [...],
  "store": {...},
  "statistics": {
    "totalReviews": 150,
    "averageRating": 4.5,
    "ratingDistribution": {
      "1": 5,
      "2": 10,
      "3": 25,
      "4": 50,
      "5": 60
    }
  },
  "pagination": {...}
}
```

## Integration with Frontend

The store page (`app/store/[slug]/page.tsx`) has been updated to:
1. Use the new `/api/stores/[slug]` endpoint for fetching store data
2. Handle follow/unfollow functionality with the `/api/stores/[storeId]/follow` endpoint
3. Display store statistics from the API response
4. Use Next.js Image component for optimized image loading

## Testing the APIs

You can test these APIs using the following curl commands:

```bash
# Get store details
curl -X GET "http://localhost:3000/api/stores/store-slug"

# Follow a store (requires authentication)
curl -X POST "http://localhost:3000/api/stores/store-id/follow" \
  -H "Authorization: Bearer your-jwt-token"

# Get store statistics
curl -X GET "http://localhost:3000/api/stores/store-id/stats"

# Search stores
curl -X GET "http://localhost:3000/api/stores?search=poultry&page=1&limit=10"

# Get store products
curl -X GET "http://localhost:3000/api/stores/store-id/products?page=1&limit=12"

# Get store reviews
curl -X GET "http://localhost:3000/api/stores/store-id/reviews?page=1&limit=10"
```

## Database Requirements

Make sure your Prisma schema includes:
- User model with role field (SELLER, COMPANY, CUSTOMER)
- Product model with seller relationship
- Review model with product relationship
- Follow model for user following functionality
- Proper indexes for efficient querying

## Notes

- All APIs include proper error handling and validation
- Authentication is handled using the `getCurrentUser` helper
- Pagination is implemented for all list endpoints
- Search functionality uses case-insensitive matching
- Image optimization is handled using Next.js Image component
- Follow notifications are sent to store owners when they gain new followers
