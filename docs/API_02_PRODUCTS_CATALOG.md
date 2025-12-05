# 📦 Module 2: Products & Catalog

> **Product Management & Catalog APIs**  
> **Total Endpoints:** 35+  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Public Products APIs
1. [GET /products](#1-get-products) - Danh sách sản phẩm (filter & search)
2. [GET /products/new-arrivals](#2-get-productsnew-arrivals) - Sản phẩm mới
3. [GET /products/on-sale](#3-get-productson-sale) - Sản phẩm sale
4. [GET /products/featured](#4-get-productsfeatured) - Sản phẩm nổi bật
5. [GET /products/filters](#5-get-productsfilters) - Filter options
6. [GET /products/:slug](#6-get-productsslug) - Chi tiết sản phẩm (slug)
7. [GET /products/id/:id](#7-get-productsidid) - Chi tiết sản phẩm (ID)
8. [GET /products/:productId/reviews](#8-get-productsproductidreviews) - Reviews
9. [GET /products/:productId/related](#9-get-productsproductidrelated) - Sản phẩm liên quan
10. [GET /products/availability](#10-get-productsavailability) - Check stock
11. [POST /products/id/:id/notify](#11-post-productsididnotify) - Subscribe notification

### Categories
12. [GET /categories](#12-get-categories) - Danh sách danh mục
13. [GET /categories/:slug](#13-get-categoriesslug) - Chi tiết danh mục

### Colors & Sizes
14. [GET /colors](#14-get-colors) - Danh sách màu
15. [GET /sizes](#15-get-sizes) - Danh sách sizes

### Admin - Products Management
16. [GET /admin/products](#16-get-adminproducts) - Danh sách sản phẩm (Admin)
17. [GET /admin/products/:id](#17-get-adminproductsid) - Chi tiết (Admin)
18. [POST /admin/products](#18-post-adminproducts) - Tạo sản phẩm
19. [PUT /admin/products/:id](#19-put-adminproductsid) - Cập nhật sản phẩm
20. [DELETE /admin/products/:id](#20-delete-adminproductsid) - Xóa sản phẩm

### Admin - Variants Management
21. [POST /admin/products/:productId/variants](#21-post-adminproductsproductidvariants) - Tạo variant
22. [PUT /admin/products/:productId/variants/:id](#22-put-adminproductsproductidvariantsid) - Cập nhật variant
23. [DELETE /admin/products/:productId/variants/:id](#23-delete-adminproductsproductidvariantsid) - Xóa variant

### Admin - Images Management
24. [POST /admin/products/:productId/images](#24-post-adminproductsproductidimages) - Thêm ảnh
25. [PUT /admin/products/:productId/images/:id](#25-put-adminproductsproductidimagesid) - Cập nhật ảnh
26. [DELETE /admin/products/:productId/images/:id](#26-delete-adminproductsproductidimagesid) - Xóa ảnh

### Admin - Categories Management
27. [GET /admin/categories](#27-get-admincategories) - Danh sách (Admin)
28. [POST /admin/categories](#28-post-admincategories) - Tạo danh mục
29. [PUT /admin/categories/:id](#29-put-admincategoriesid) - Cập nhật danh mục
30. [DELETE /admin/categories/:id](#30-delete-admincategoriesid) - Xóa danh mục

### Admin - Colors & Sizes Management
31-35. [Colors & Sizes CRUD](#admin-colors--sizes-management) - Full CRUD operations

---

# Public Products APIs

## 1. GET `/products`
**Danh sách sản phẩm với filter, search và sort**

### 📋 Overview
API chính để browse sản phẩm. Support filter theo category, colors, sizes, price range, search và nhiều sort options.

### 🔓 Authentication
**Public** - Không cần authentication

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | number | ❌ | Trang hiện tại (default: 1) | `1` |
| `limit` | number | ❌ | Số sản phẩm/trang (default: 20) | `20` |
| `category_slug` | string | ❌ | Filter theo danh mục | `ao-so-mi` |
| `colors` | string | ❌ | Filter theo màu (IDs hoặc tên, comma-separated) | `1,2` hoặc `Đỏ,Xanh` |
| `sizes` | string | ❌ | Filter theo size (IDs hoặc tên, comma-separated) | `M,L,XL` |
| `min_price` | number | ❌ | Giá tối thiểu | `100000` |
| `max_price` | number | ❌ | Giá tối đa | `500000` |
| `search` | string | ❌ | Tìm kiếm theo tên hoặc mô tả | `áo sơ mi` |
| `sort_by` | string | ❌ | Sắp xếp: `newest`, `price_asc`, `price_desc`, `rating` | `newest` |

#### Request Example
```
GET /products?page=1&limit=20&category_slug=ao-so-mi&colors=Trắng,Xanh&sizes=M,L&min_price=200000&max_price=500000&search=nam&sort_by=price_asc
```

### 📤 Response

#### Success (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Trắng Classic",
      "slug": "ao-so-mi-trang-classic",
      "description": "Áo sơ mi nam cao cấp, chất liệu cotton 100%",
      "thumbnail_url": "https://storage.googleapis.com/products/asm-001.jpg",
      "selling_price": 350000,
      "original_price": 350000,
      "flash_sale_price": null,
      "discount_percentage": 0,
      "average_rating": 4.5,
      "total_reviews": 120,
      "available_colors": ["Trắng", "Xanh Navy", "Đen"],
      "available_sizes": ["S", "M", "L", "XL", "XXL"],
      "is_on_sale": false,
      "is_new_arrival": true,
      "category": {
        "id": 2,
        "name": "Áo Sơ Mi",
        "slug": "ao-so-mi"
      },
      "created_at": "2024-11-15T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Áo Polo Premium",
      "slug": "ao-polo-premium",
      "description": "Áo polo nam cao cấp",
      "thumbnail_url": "https://storage.googleapis.com/products/polo-001.jpg",
      "selling_price": 280000,
      "original_price": 400000,
      "flash_sale_price": 280000,
      "discount_percentage": 30,
      "average_rating": 4.8,
      "total_reviews": 85,
      "available_colors": ["Đen", "Xám", "Navy"],
      "available_sizes": ["M", "L", "XL"],
      "is_on_sale": true,
      "is_new_arrival": false,
      "category": {
        "id": 3,
        "name": "Áo Polo",
        "slug": "ao-polo"
      },
      "created_at": "2024-10-20T10:00:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 🔄 Logic Flow
1. **Parse query parameters**
2. **Build database query:**
   - Base: `SELECT * FROM products WHERE status = 'active'`
   - Add filters: category, colors, sizes, price range
   - Add search: `name ILIKE '%search%' OR description ILIKE '%search%'`
3. **Join với variants** để check available colors/sizes
4. **Apply sorting:**
   - `newest`: ORDER BY created_at DESC
   - `price_asc`: ORDER BY selling_price ASC
   - `price_desc`: ORDER BY selling_price DESC
   - `rating`: ORDER BY average_rating DESC
5. **Paginate results**
6. **Calculate metadata:** total items, total pages
7. **Return response**

### 📝 Implementation Notes
- Colors/sizes filter: Accepts both IDs and names
- Search: Case-insensitive, searches in name + description
- `is_new_arrival`: Products created within last 30 days
- `is_on_sale`: Products with active promotions
- `flash_sale_price`: Calculated from original_price and promotion discount

### 🧪 cURL Example
```bash
curl -X GET "https://api.yourshop.com/products?page=1&limit=20&category_slug=ao-so-mi&sort_by=price_asc"
```

### 💻 JavaScript Example
```javascript
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  category_slug: 'ao-so-mi',
  colors: 'Trắng,Xanh',
  sizes: 'M,L',
  min_price: 200000,
  max_price: 500000,
  sort_by: 'price_asc'
});

const response = await fetch(`https://api.yourshop.com/products?${params}`);
const data = await response.json();

console.log('Products:', data.data);
console.log('Total pages:', data.metadata.totalPages);
```

---

## 2. GET `/products/new-arrivals`
**Sản phẩm mới (30 ngày gần đây)**

### 📋 Overview
Lấy sản phẩm mới được tạo trong vòng 30 ngày qua, sắp xếp theo ngày tạo mới nhất.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | ❌ | Trang hiện tại (default: 1) |
| `limit` | number | ❌ | Số sản phẩm/trang (default: 12) |

### 📤 Response
Same structure as `/products`, filtered by `created_at > NOW() - INTERVAL '30 days'`

### 📝 Implementation Notes
- Automatically sorts by `created_at DESC`
- Only shows products with `status = 'active'`

---

## 3. GET `/products/on-sale`
**Sản phẩm đang khuyến mãi (Flash Sale)**

### 📋 Overview
Lấy sản phẩm đang có promotion active, hiển thị giá gốc và giá sale.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
Same as `/products` (page, limit)

### 📤 Response
Same structure as `/products`, filtered by:
- Has active promotion (promotion.start_date <= NOW() AND promotion.end_date >= NOW())
- `flash_sale_price` is calculated and included

### 🔄 Logic Flow
1. Join with `promotion_products` table
2. Filter by promotion status = 'active' AND within date range
3. Calculate `flash_sale_price` based on discount_type:
   - `percentage`: `original_price * (1 - discount_value/100)`
   - `fixed`: `original_price - discount_value`
4. Sort by discount percentage DESC (biggest discounts first)

---

## 4. GET `/products/featured`
**Sản phẩm nổi bật (Featured Products)**

### 📋 Overview
Lấy sản phẩm nổi bật cho homepage: rating cao, bán chạy.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | ❌ | Số sản phẩm (default: 10) |

### 📤 Response
```json
{
  "featured_products": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Premium",
      "slug": "ao-so-mi-premium",
      "thumbnail_url": "https://...",
      "selling_price": 350000,
      "average_rating": 4.8,
      "total_reviews": 200,
      "total_sold": 500
    }
  ]
}
```

### 🔄 Logic Flow
1. Calculate score: `(average_rating * 0.7) + (total_sold / 1000 * 0.3)`
2. Order by score DESC
3. Limit results

---

## 5. GET `/products/filters`
**Lấy filter options cho UI**

### 📋 Overview
API để lấy danh sách colors, sizes có sẵn và price range cho bộ lọc sản phẩm.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category_id` | number | ❌ | Lọc options theo category |

### 📤 Response

#### Success (200 OK)
```json
{
  "colors": [
    {
      "id": 1,
      "name": "Đen",
      "hex_code": "#000000",
      "product_count": 50
    },
    {
      "id": 2,
      "name": "Trắng",
      "hex_code": "#FFFFFF",
      "product_count": 45
    }
  ],
  "sizes": [
    {
      "id": 1,
      "name": "S",
      "product_count": 30
    },
    {
      "id": 2,
      "name": "M",
      "product_count": 120
    },
    {
      "id": 3,
      "name": "L",
      "product_count": 115
    }
  ],
  "price_range": {
    "min": 100000,
    "max": 1500000
  }
}
```

### 🔄 Logic Flow
1. Query colors với product count: `COUNT(DISTINCT product_variants.product_id)`
2. Query sizes với product count
3. Calculate price range: `MIN(selling_price)`, `MAX(selling_price)`
4. If category_id provided: Filter by category
5. Return aggregated data

---

## 6. GET `/products/:slug`
**Chi tiết sản phẩm theo slug**

### 📋 Overview
Lấy thông tin đầy đủ của sản phẩm bao gồm: variants, images, promotion, related products.

### 🔓 Authentication
**Public**

### 📥 Request

#### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | ✅ | Product slug |

#### Request Example
```
GET /products/ao-so-mi-trang-classic
```

### 📤 Response

#### Success (200 OK)
```json
{
  "id": 1,
  "name": "Áo Sơ Mi Trắng Classic",
  "slug": "ao-so-mi-trang-classic",
  "description": "Áo sơ mi nam cao cấp",
  "full_description": "<p>Áo sơ mi nam cao cấp, chất liệu cotton 100%...</p>",
  "selling_price": 350000,
  "cost_price": 200000,
  "thumbnail_url": "https://storage.googleapis.com/products/asm-001.jpg",
  "average_rating": 4.5,
  "total_reviews": 120,
  "status": "active",
  "category": {
    "id": 2,
    "name": "Áo Sơ Mi",
    "slug": "ao-so-mi"
  },
  "variants": [
    {
      "id": 101,
      "sku": "ASM-001-M-TRA",
      "name": "Áo Sơ Mi Trắng Classic - Trắng - M",
      "size": {
        "id": 3,
        "name": "M",
        "description": "Size M: Chiều cao 160-170cm"
      },
      "color": {
        "id": 1,
        "name": "Trắng",
        "hex_code": "#FFFFFF"
      },
      "total_stock": 50,
      "reserved_stock": 5,
      "available_stock": 45,
      "status": "active",
      "images": [
        {
          "id": 201,
          "image_url": "https://storage.googleapis.com/products/asm-001-white-1.jpg",
          "is_main": true,
          "display_order": 1
        },
        {
          "id": 202,
          "image_url": "https://storage.googleapis.com/products/asm-001-white-2.jpg",
          "is_main": false,
          "display_order": 2
        }
      ]
    },
    {
      "id": 102,
      "sku": "ASM-001-L-TRA",
      "name": "Áo Sơ Mi Trắng Classic - Trắng - L",
      "size": { "id": 4, "name": "L" },
      "color": { "id": 1, "name": "Trắng", "hex_code": "#FFFFFF" },
      "total_stock": 60,
      "reserved_stock": 10,
      "available_stock": 50,
      "status": "active",
      "images": [...]
    }
  ],
  "available_options": {
    "colors": [
      {
        "id": 1,
        "name": "Trắng",
        "hex_code": "#FFFFFF",
        "in_stock": true
      },
      {
        "id": 2,
        "name": "Xanh Navy",
        "hex_code": "#000080",
        "in_stock": true
      },
      {
        "id": 3,
        "name": "Đen",
        "hex_code": "#000000",
        "in_stock": false
      }
    ],
    "sizes": [
      { "id": 1, "name": "S", "in_stock": false },
      { "id": 2, "name": "M", "in_stock": true },
      { "id": 3, "name": "L", "in_stock": true },
      { "id": 4, "name": "XL", "in_stock": true },
      { "id": 5, "name": "XXL", "in_stock": false }
    ]
  },
  "promotion": {
    "id": 5,
    "name": "Flash Sale Weekend",
    "description": "Giảm giá cuối tuần",
    "discount_value": 20,
    "discount_type": "percentage",
    "flash_sale_price": 280000,
    "start_date": "2024-12-01T00:00:00Z",
    "end_date": "2024-12-31T23:59:59Z"
  },
  "related_products": [
    {
      "id": 10,
      "name": "Áo Sơ Mi Xanh Navy",
      "slug": "ao-so-mi-xanh-navy",
      "thumbnail_url": "https://...",
      "selling_price": 380000,
      "average_rating": 4.6
    }
  ],
  "attributes": {
    "material": "Cotton 100%",
    "origin": "Vietnam",
    "care_instructions": "Giặt máy ở nhiệt độ thấp"
  },
  "created_at": "2024-11-15T10:00:00Z",
  "updated_at": "2024-12-01T15:30:00Z"
}
```

#### Error Responses

**404 Not Found - Sản phẩm không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sản phẩm",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
1. Find product by slug
2. If not found OR status != 'active' → 404
3. Load variants with JOIN:
   - sizes
   - colors
   - images (sorted by display_order)
4. Calculate `available_stock` per variant: `total_stock - reserved_stock`
5. Build `available_options`:
   - Unique colors from variants
   - Unique sizes from variants
   - Mark as `in_stock` if ANY variant with that color/size has available_stock > 0
6. Load active promotion (if any)
7. Load related products (same category, limit 8)
8. Return complete product data

### 📝 Implementation Notes
- `cost_price` is sensitive data (only for admin)
- `available_stock` = `total_stock - reserved_stock` (stock đã order nhưng chưa ship)
- Related products: Same category, random order, limit 8

---

## 7. GET `/products/id/:id`
**Chi tiết sản phẩm theo ID**

### 📋 Overview
Tương tự GET by slug nhưng query theo ID. Dùng khi có productId từ các API khác.

### 🔓 Authentication
**Public**

### 📥 Request
```
GET /products/id/123
```

### 📤 Response
Same structure as GET `/products/:slug`

---

## 8. GET `/products/:productId/reviews`
**Lấy reviews của sản phẩm**

### 📋 Overview
Danh sách reviews đã được duyệt (approved) của sản phẩm với phân trang.

### 🔓 Authentication
**Public**

### 📥 Request

#### URL Parameters
| Parameter | Type | Required |
|-----------|------|----------|
| `productId` | number | ✅ |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Trang hiện tại |
| `limit` | number | 10 | Số reviews/trang |
| `sort` | string | `created_at` | Sort by: `created_at` hoặc `rating` |
| `order` | string | `desc` | Order: `asc` hoặc `desc` |

### 📤 Response

```json
{
  "data": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Sản phẩm rất tốt! Chất lượng cao, giao hàng nhanh.",
      "customer_name": "Nguyễn Văn A",
      "customer_avatar": "https://...",
      "created_at": "2024-11-20T10:00:00Z",
      "verified_purchase": true
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12
  },
  "summary": {
    "average_rating": 4.5,
    "total_reviews": 120,
    "rating_distribution": {
      "5": 80,
      "4": 25,
      "3": 10,
      "2": 3,
      "1": 2
    }
  }
}
```

---

## 9. GET `/products/:productId/related`
**Sản phẩm liên quan**

### 📋 Overview
Lấy sản phẩm cùng danh mục để gợi ý cho customer.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
| Parameter | Type | Default |
|-----------|------|---------|
| `limit` | number | 8 |

### 📤 Response
```json
{
  "related_products": [
    {
      "id": 10,
      "name": "Áo Sơ Mi Xanh Navy",
      "slug": "ao-so-mi-xanh-navy",
      "thumbnail_url": "https://...",
      "selling_price": 380000,
      "average_rating": 4.6,
      "total_reviews": 85
    }
  ]
}
```

---

## 10. GET `/products/availability`
**Kiểm tra tồn kho sản phẩm (Chatbot)**

### 📋 Overview
API cho chatbot để check stock availability theo tên sản phẩm, size, màu.

### 🔓 Authentication
**Public**

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | ✅ | Tên sản phẩm (tìm gần đúng) |
| `size` | string | ❌ | Size (S, M, L, XL...) |
| `color` | string | ❌ | Màu sắc |

#### Request Example
```
GET /products/availability?name=áo+sơ+mi+trắng&size=L&color=white
```

### 📤 Response

```json
{
  "found": true,
  "product": {
    "id": 1,
    "name": "Áo Sơ Mi Trắng Classic",
    "slug": "ao-so-mi-trang-classic"
  },
  "availability": [
    {
      "variant_id": 102,
      "size": "L",
      "color": "Trắng",
      "available_stock": 50,
      "status": "in_stock"
    }
  ],
  "message": "Sản phẩm 'Áo Sơ Mi Trắng Classic' size L màu Trắng còn 50 sản phẩm."
}
```

---

## 11. POST `/products/id/:id/notify`
**Đăng ký nhận thông báo sản phẩm**

### 📋 Overview
Customer đăng ký nhận thông báo khi sản phẩm có hàng hoặc giá giảm.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Request Body
```json
{
  "variant_id": 101,
  "notification_type": "restock"
}
```

| Field | Type | Required | Enum | Description |
|-------|------|----------|------|-------------|
| `variant_id` | number | ❌ | - | ID variant cụ thể (optional) |
| `notification_type` | string | ✅ | `restock`, `price_drop` | Loại thông báo |

### 📤 Response

```json
{
  "message": "Đăng ký thành công! Chúng tôi sẽ thông báo khi sản phẩm có hàng.",
  "notification": {
    "id": 1,
    "product_id": 1,
    "variant_id": 101,
    "notification_type": "restock",
    "status": "pending"
  }
}
```

---

# Categories

## 12. GET `/categories`
**Danh sách danh mục (Public)**

### 🔓 Authentication
**Public**

### 📤 Response

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Áo",
      "slug": "ao",
      "description": "Áo thời trang nam",
      "image_url": "https://...",
      "product_count": 150,
      "display_order": 1,
      "is_active": true
    },
    {
      "id": 2,
      "name": "Áo Sơ Mi",
      "slug": "ao-so-mi",
      "parent_id": 1,
      "description": "Áo sơ mi nam",
      "image_url": "https://...",
      "product_count": 50,
      "display_order": 1,
      "is_active": true
    }
  ]
}
```

### 📝 Implementation Notes
- Hỗ trợ hierarchical categories (parent-child)
- Chỉ trả về categories `is_active = true`
- `product_count`: Số sản phẩm active trong category

---

## 13. GET `/categories/:slug`
**Chi tiết danh mục**

### 🔓 Authentication
**Public**

### 📤 Response

```json
{
  "id": 2,
  "name": "Áo Sơ Mi",
  "slug": "ao-so-mi",
  "description": "Áo sơ mi nam cao cấp",
  "image_url": "https://...",
  "parent": {
    "id": 1,
    "name": "Áo",
    "slug": "ao"
  },
  "children": [],
  "product_count": 50,
  "display_order": 1,
  "is_active": true
}
```

---

# Colors & Sizes

## 14. GET `/colors`
**Danh sách màu sắc**

### 🔓 Authentication
**Public**

### 📤 Response

```json
{
  "colors": [
    {
      "id": 1,
      "name": "Đen",
      "hex_code": "#000000",
      "display_order": 1
    },
    {
      "id": 2,
      "name": "Trắng",
      "hex_code": "#FFFFFF",
      "display_order": 2
    }
  ]
}
```

---

## 15. GET `/sizes`
**Danh sách sizes**

### 🔓 Authentication
**Public**

### 📤 Response

```json
{
  "sizes": [
    {
      "id": 1,
      "name": "S",
      "description": "Chiều cao 155-165cm, Cân nặng 45-55kg",
      "display_order": 1
    },
    {
      "id": 2,
      "name": "M",
      "description": "Chiều cao 165-170cm, Cân nặng 55-65kg",
      "display_order": 2
    }
  ]
}
```

---

# Admin - Products Management

## 16. GET `/admin/products`
**Danh sách sản phẩm (Admin)**

### 📋 Overview
Lấy TẤT CẢ sản phẩm (kể cả inactive/deleted) với filter và search.

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Trang hiện tại |
| `limit` | number | Số sản phẩm/trang (default: 20) |
| `search` | string | Tìm theo tên hoặc SKU |
| `category_id` | number | Filter theo danh mục |
| `status` | string | Filter: `active`, `inactive`, `deleted` |

### 📤 Response

```json
{
  "data": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Trắng Classic",
      "slug": "ao-so-mi-trang-classic",
      "selling_price": 350000,
      "cost_price": 200000,
      "status": "active",
      "category_name": "Áo Sơ Mi",
      "total_variants": 15,
      "total_stock": 750,
      "total_sold": 120,
      "created_at": "2024-11-15T10:00:00Z",
      "updated_at": "2024-12-01T15:30:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "totalPages": 13
  }
}
```

---

## 17. GET `/admin/products/:id`
**Chi tiết sản phẩm (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

Same as public product details BUT includes:
- `cost_price` (giá vốn)
- `total_sold` (tổng đã bán)
- `profit_margin` (lợi nhuận %)
- Inactive/deleted variants

---

## 18. POST `/admin/products`
**Tạo sản phẩm mới**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "name": "Áo Polo Premium Mới",
  "category_id": 3,
  "description": "Áo polo nam cao cấp",
  "full_description": "<p>Mô tả chi tiết...</p>",
  "selling_price": 380000,
  "cost_price": 220000,
  "thumbnail_url": "https://...",
  "status": "active",
  "attributes": {
    "material": "Cotton 100%",
    "origin": "Vietnam"
  }
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | Min 3 chars |
| `category_id` | number | ✅ | Valid category ID |
| `description` | string | ✅ | Min 10 chars |
| `full_description` | string | ❌ | HTML allowed |
| `selling_price` | number | ✅ | > 0 |
| `cost_price` | number | ❌ | > 0 |
| `thumbnail_url` | string | ❌ | Valid URL |
| `status` | string | ❌ | Enum: `active`, `inactive` |
| `attributes` | object | ❌ | JSON object |

### 📤 Response

```json
{
  "message": "Tạo sản phẩm thành công",
  "product": {
    "id": 151,
    "name": "Áo Polo Premium Mới",
    "slug": "ao-polo-premium-moi",
    "selling_price": 380000,
    "status": "active",
    "created_at": "2024-12-05T10:00:00Z"
  }
}
```

### 🔄 Logic Flow
1. Validate input
2. Check category exists
3. Generate slug from name (unique)
4. Create product record
5. Return created product

---

## 19. PUT `/admin/products/:id`
**Cập nhật sản phẩm**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

Same fields as POST, all fields optional (partial update)

### 📤 Response

```json
{
  "message": "Cập nhật sản phẩm thành công",
  "product": {
    "id": 1,
    "name": "Áo Sơ Mi Trắng Classic (Updated)",
    "updated_at": "2024-12-05T10:30:00Z"
  }
}
```

### 🔄 Logic Flow
1. Find product by ID
2. Validate changed fields
3. Update only provided fields
4. If name changed → regenerate slug
5. Set `updated_at = NOW()`
6. Return updated product

---

## 20. DELETE `/admin/products/:id`
**Xóa sản phẩm (Soft delete)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Xóa sản phẩm thành công"
}
```

### 🔄 Logic Flow
1. Find product by ID
2. Set `status = 'deleted'`
3. Set `deleted_at = NOW()`
4. Also soft delete all variants
5. Return success

### 📝 Implementation Notes
- **Soft delete:** Không xóa khỏi database
- Product vẫn hiển thị trong order history
- Có thể restore sau này

---

# Admin - Variants Management

## 21. POST `/admin/products/:productId/variants`
**Tạo variant mới**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "size_id": 3,
  "color_id": 1,
  "sku": "ASM-001-M-TRA",
  "name": "Áo Sơ Mi Trắng - M - Trắng",
  "total_stock": 100,
  "status": "active"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `size_id` | number | ✅ | Valid size ID |
| `color_id` | number | ✅ | Valid color ID |
| `sku` | string | ✅ | Unique SKU |
| `name` | string | ❌ | Auto-generated if empty |
| `total_stock` | number | ✅ | >= 0 |
| `status` | string | ❌ | Default: `active` |

### 📤 Response

```json
{
  "message": "Tạo variant thành công",
  "variant": {
    "id": 201,
    "sku": "ASM-001-M-TRA",
    "size": "M",
    "color": "Trắng",
    "total_stock": 100,
    "available_stock": 100
  }
}
```

### 🔄 Logic Flow
1. Validate product exists
2. Validate size and color exist
3. Check SKU unique
4. If name empty: auto-generate from product + size + color
5. Create variant
6. Return created variant

---

## 22. PUT `/admin/products/:productId/variants/:id`
**Cập nhật variant**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "total_stock": 150,
  "status": "active"
}
```

Fields có thể update:
- `total_stock`
- `status` (`active`, `inactive`)
- SKU, size_id, color_id **KHÔNG** thể thay đổi

### 📤 Response

```json
{
  "message": "Cập nhật variant thành công",
  "variant": {
    "id": 201,
    "sku": "ASM-001-M-TRA",
    "total_stock": 150,
    "available_stock": 145
  }
}
```

---

## 23. DELETE `/admin/products/:productId/variants/:id`
**Xóa variant**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Xóa variant thành công"
}
```

### 🔄 Logic Flow
1. Check variant không có order pending
2. If has orders → Set `status = 'inactive'` instead
3. Else → Soft delete (set deleted_at)

---

# Admin - Images Management

## 24. POST `/admin/products/:productId/images`
**Thêm ảnh cho sản phẩm**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "variant_id": 101,
  "image_url": "https://storage.googleapis.com/products/asm-001-3.jpg",
  "is_main": false,
  "display_order": 3
}
```

### 📤 Response

```json
{
  "message": "Thêm ảnh thành công",
  "image": {
    "id": 301,
    "image_url": "https://...",
    "variant_id": 101,
    "is_main": false,
    "display_order": 3
  }
}
```

---

## 25. PUT `/admin/products/:productId/images/:id`
**Cập nhật ảnh**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "is_main": true,
  "display_order": 1
}
```

### 📤 Response

```json
{
  "message": "Cập nhật ảnh thành công"
}
```

### 🔄 Logic Flow
1. If `is_main = true` → Set other images of same variant to `is_main = false`
2. Update image
3. Return success

---

## 26. DELETE `/admin/products/:productId/images/:id`
**Xóa ảnh**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Xóa ảnh thành công"
}
```

---

# Admin - Categories Management

## 27. GET `/admin/categories`
**Danh sách danh mục (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

Includes inactive categories and additional stats:

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Áo",
      "slug": "ao",
      "is_active": true,
      "product_count": 150,
      "total_revenue": 45000000,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 28. POST `/admin/categories`
**Tạo danh mục**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "name": "Quần Short",
  "parent_id": null,
  "description": "Quần short nam",
  "image_url": "https://...",
  "display_order": 5,
  "is_active": true
}
```

### 📤 Response

```json
{
  "message": "Tạo danh mục thành công",
  "category": {
    "id": 10,
    "name": "Quần Short",
    "slug": "quan-short",
    "is_active": true
  }
}
```

---

## 29. PUT `/admin/categories/:id`
**Cập nhật danh mục**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

Same as POST, all fields optional

### 📤 Response

```json
{
  "message": "Cập nhật danh mục thành công"
}
```

---

## 30. DELETE `/admin/categories/:id`
**Xóa danh mục**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Xóa danh mục thành công"
}
```

### 🔄 Logic Flow
1. Check category has no products
2. If has products → 400 Error: "Cannot delete category with products"
3. Else → Soft delete

---

# Admin - Colors & Sizes Management

## Colors Management

### POST `/admin/colors`
**Tạo màu mới**

```json
{
  "name": "Xanh Lá",
  "hex_code": "#00FF00",
  "display_order": 10
}
```

### PUT `/admin/colors/:id`
**Cập nhật màu**

### DELETE `/admin/colors/:id`
**Xóa màu**

Logic: Check no variants using this color

---

## Sizes Management

### POST `/admin/sizes`
**Tạo size mới**

```json
{
  "name": "3XL",
  "description": "Chiều cao >185cm",
  "display_order": 6
}
```

### PUT `/admin/sizes/:id`
**Cập nhật size**

### DELETE `/admin/sizes/:id`
**Xóa size**

Logic: Check no variants using this size

---

## 🎯 Summary

### API Endpoints by Category

| Category | Count | Auth Level |
|----------|-------|-----------|
| **Public Products** | 11 | Public |
| **Public Categories** | 2 | Public |
| **Public Colors/Sizes** | 2 | Public |
| **Admin Products** | 5 | Admin |
| **Admin Variants** | 3 | Admin |
| **Admin Images** | 3 | Admin |
| **Admin Categories** | 4 | Admin |
| **Admin Colors** | 3 | Admin |
| **Admin Sizes** | 3 | Admin |
| **Total** | **36** | - |

---

## 🔍 Key Concepts

### Product Structure
```
Product (Áo Sơ Mi)
├── Category (Áo Sơ Mi)
├── Variants (15 variants = 5 sizes × 3 colors)
│   ├── Variant 1: Size M, Color Trắng, SKU: ASM-001-M-TRA
│   │   ├── total_stock: 50
│   │   ├── reserved_stock: 5
│   │   └── available_stock: 45
│   └── Images (3 images per variant)
└── Promotion (Flash Sale: -20%)
```

### Stock Management
- **total_stock:** Tổng tồn kho vật lý
- **reserved_stock:** Đã order nhưng chưa ship
- **available_stock:** `total_stock - reserved_stock` (có thể bán)

### Variant SKU Format
```
{CATEGORY_CODE}-{PRODUCT_ID}-{COLOR_CODE}-{SIZE}
Example: ASM-001-TRA-M
```

---

## 📊 Database Relationships

```sql
products
├── belongs_to: categories
├── has_many: product_variants
├── has_many: product_images (through variants)
└── has_one: promotion (through promotion_products)

product_variants
├── belongs_to: products
├── belongs_to: sizes
├── belongs_to: colors
└── has_many: product_images
```

---

## 🔒 Security Notes

1. **Cost Price:** Only visible to admin
2. **Soft Delete:** Products/Variants never hard deleted
3. **SKU Uniqueness:** Enforced at database level
4. **Stock Reservation:** Critical for order consistency

---

**✅ Products & Catalog Module Complete!**

**Next Module:** [Shopping (Cart, Checkout, Orders) →](./API_03_SHOPPING.md)

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
