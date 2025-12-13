# 📡 PUBLIC API ENDPOINTS - Frontend Integration

> **Base URL:** `http://localhost:3001`  
> **Version:** v1  
> **Date:** 13/12/2025

---

## 🎨 FILTERS & METADATA

### 1. Get All Categories
```
GET /api/v1/categories/all
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Áo Sơ Mi",
    "slug": "ao-so-mi",
    "status": "active"
  }
]
```

### 2. Get All Colors
```
GET /api/v1/colors/all
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "Trắng",
    "hex_code": "#FFFFFF"
  }
]
```

### 3. Get All Sizes
```
GET /api/v1/sizes/all
```
**Response:**
```json
[
  {
    "id": 1,
    "name": "S",
    "sort_order": 1
  }
]
```

---

## 📦 PRODUCTS

### 1. Get Products List (with filters)
```
GET /api/v1/products
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | number | ❌ | Trang hiện tại (default: 1) | `1` |
| `limit` | number | ❌ | Số sản phẩm/trang (default: 20) | `20` |
| `category_slug` | string | ❌ | Filter theo danh mục | `ao-so-mi` |
| `colors` | string | ❌ | Filter theo màu (IDs, comma-separated) | `1,2` |
| `sizes` | string | ❌ | Filter theo size (IDs, comma-separated) | `1,2,3` |
| `min_price` | number | ❌ | Giá tối thiểu | `100000` |
| `max_price` | number | ❌ | Giá tối đa | `500000` |
| `min_rating` | number | ❌ | Rating tối thiểu (0-5) | `4` |
| `search` | string | ❌ | Tìm kiếm theo tên hoặc mô tả | `áo sơ mi` |
| `sort_by` | string | ❌ | Sắp xếp: `newest`, `price_asc`, `price_desc`, `rating` | `newest` |

**Example Request:**
```
GET /api/v1/products?page=1&limit=20&category_slug=ao-so-mi&min_rating=4
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Premium",
      "slug": "ao-so-mi-premium",
      "description": "Áo sơ mi cao cấp",
      "selling_price": 299000,
      "thumbnail_url": "https://...",
      "average_rating": 4.5,
      "total_reviews": 120,
      "flash_sale_price": 249000,
      "promotion": {
        "id": 1,
        "name": "Flash Sale 12/12",
        "discount_percentage": 20
      }
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2. Get Product Detail (by slug)
```
GET /api/v1/products/:slug
```

**Example:**
```
GET /api/v1/products/ao-so-mi-premium
```

**Response:**
```json
{
  "product": {
    "id": 1,
    "name": "Áo Sơ Mi Premium",
    "slug": "ao-so-mi-premium",
    "description": "...",
    "full_description": "...",
    "selling_price": 299000,
    "average_rating": 4.5,
    "total_reviews": 120,
    "flash_sale_price": 249000,
    "promotion": {...},
    "variants": [
      {
        "id": 1,
        "sku": "ASM-001-S-WHITE",
        "size": { "id": 1, "name": "S" },
        "color": { "id": 1, "name": "Trắng", "hex_code": "#FFFFFF" },
        "available_stock": 10,
        "images": [...]
      }
    ],
    "available_options": {
      "colors": [...],
      "sizes": [...]
    }
  },
  "related_products": [...],
  "reviews": [...]
}
```

### 3. Get Product Detail (by ID)
```
GET /api/v1/products/id/:id
```

**Example:**
```
GET /api/v1/products/id/1
```
**Response:** Same as by slug

### 4. New Arrivals
```
GET /api/v1/products/new-arrivals
```
**Query:** `page`, `limit`

### 5. On Sale (Flash Sale)
```
GET /api/v1/products/on-sale
```
**Query:** `page`, `limit`

### 6. Featured Products
```
GET /api/v1/products/featured
```
**Query:** `limit` (default: 10)

### 7. Product Availability Check
```
GET /api/v1/products/availability
```
**Query:**
- `name` (required): Tên sản phẩm
- `size` (optional): Kích cỡ
- `color` (optional): Màu sắc

### 8. Get Product Reviews
```
GET /api/v1/products/:productId/reviews
```
**Query:**
- `page` (default: 1)
- `limit` (default: 10)
- `sort`: `created_at` | `rating`
- `order`: `asc` | `desc`

### 9. Get Related Products
```
GET /api/v1/products/:productId/related
```
**Query:** `limit` (default: 8)

---

## 💬 CHAT

### 1. Create/Get Session
```
POST /api/v1/chat/session
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>  (optional - nếu user đã login)
```

**Body:**
```json
{
  "visitor_id": "uuid-v4-string"  (required nếu chưa login)
}
```

**Response:**
```json
{
  "session": {
    "id": "1",
    "visitor_id": "uuid-v4-string",
    "customer_id": 1,
    "created_at": "2025-12-13T04:45:49.362Z",
    "updated_at": "2025-12-13T09:01:08.365Z"
  },
  "is_new": false
}
```

### 2. Send Message
```
POST /api/v1/chat/message
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>  (optional)
```

**Body:**
```json
{
  "session_id": 1,
  "message": "Tôi muốn tìm áo sơ mi màu trắng"
}
```

**Response:**
```json
{
  "customer_message": {
    "id": 1,
    "session_id": 1,
    "sender": "customer",
    "message": "Tôi muốn tìm áo sơ mi màu trắng",
    "created_at": "..."
  },
  "bot_responses": [
    {
      "id": 2,
      "session_id": 1,
      "sender": "bot",
      "message": "Chúng tôi có nhiều mẫu áo sơ mi trắng...",
      "created_at": "..."
    }
  ]
}
```

### 3. Get Chat History
```
GET /api/v1/chat/history
```

**Query:**
- `session_id` (required)
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "session": {...},
  "messages": [...],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

## 🛒 CART (Authenticated)

### 1. Get Cart
```
GET /api/v1/cart
```
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

### 2. Add to Cart
```
POST /api/v1/cart/add
```
**Body:**
```json
{
  "variant_id": 1,
  "quantity": 2
}
```

### 3. Update Cart Item
```
PATCH /api/v1/cart/update/:itemId
```
**Body:**
```json
{
  "quantity": 3
}
```

### 4. Remove from Cart
```
DELETE /api/v1/cart/remove/:itemId
```

### 5. Clear Cart
```
DELETE /api/v1/cart/clear
```

---

## 👤 AUTH

### 1. Login
```
POST /api/v1/auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "customer": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nguyễn Văn A"
  }
}
```

### 2. Register
```
POST /api/v1/auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "Nguyễn Văn A",
  "phone": "0123456789"
}
```

---

## 🎯 IMPORTANT NOTES

### Response Format
- **Success:** Trả về data trực tiếp hoặc object `{ data, metadata }`
- **Error:** Status code 4xx/5xx với message

### Authentication
- **Public endpoints:** Không cần JWT
- **Protected endpoints:** Cần header `Authorization: Bearer <token>`
- **Optional auth:** Có token → customer_id, không → visitor_id

### Pagination
- Default: `page=1`, `limit=20`
- Response có `metadata: { page, limit, total, totalPages }`

### Filter Arrays
- Colors/Sizes: Gửi dưới dạng comma-separated IDs
- Example: `colors=1,2,3` hoặc `sizes=1,2`

### Flash Sale Price
- Nếu có promotion active → `flash_sale_price` không null
- Frontend hiển thị cả `selling_price` (gạch ngang) và `flash_sale_price`

### Rating Filter (NEW)
- Parameter `min_rating`: số từ 0-5
- Filter sản phẩm có `average_rating >= min_rating`
- Example: `min_rating=4` → chỉ sản phẩm 4⭐ trở lên
