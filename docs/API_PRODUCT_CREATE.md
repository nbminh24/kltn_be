# API Documentation: Create Product

## Endpoint
```
POST /api/v1/admin/products
```

## Authentication
- **Required:** YES
- **Type:** Bearer Token (Admin JWT)
- **Header:** `Authorization: Bearer {admin_token}`

---

## Request Payload Structure

### ✅ CORRECT Format (Following Database Schema)

```json
{
  "name": "iPhone 15 Pro Max",
  "sku": "IP15PM-256",
  "description": "Flagship smartphone from Apple",
  "full_description": "iPhone 15 Pro Max with A17 Pro chip, titanium design...",
  "category_id": 1,
  "cost_price": 25000000,
  "selling_price": 34990000,
  "status": "active",
  "selected_size_ids": [1, 2, 3],
  "selected_color_ids": [1, 2],
  "variants": [
    {
      "sku": "IP15PM-256-BLK",
      "size_id": 1,
      "color_id": 1,
      "stock": 50,
      "status": "active"
    },
    {
      "sku": "IP15PM-256-WHT",
      "size_id": 1,
      "color_id": 2,
      "stock": 30,
      "status": "active"
    }
  ],
  "images": [
    {
      "image_url": "https://cdn.example.com/iphone15-black-1.jpg",
      "is_primary": true,
      "display_order": 0
    },
    {
      "image_url": "https://cdn.example.com/iphone15-black-2.jpg",
      "is_primary": false,
      "display_order": 1
    }
  ]
}
```

---

## Field Specifications

### **Product Level Fields**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ YES | Product name | `"iPhone 15 Pro Max"` |
| `sku` | string | ✅ YES | Product SKU (unique) | `"IP15PM-256"` |
| `description` | string | ❌ NO | Short description | `"Flagship smartphone"` |
| `full_description` | string | ❌ NO | Full description | `"iPhone 15 Pro Max with..."` |
| `category_id` | number | ❌ NO | Category foreign key | `1` |
| `cost_price` | number | ❌ NO | Cost price (VND) | `25000000` |
| `selling_price` | number | ✅ YES | Selling price (VND) | `34990000` |
| `price` | number | ❌ NO | Alias for selling_price | `34990000` |
| `original_price` | number | ❌ NO | Original price if on sale | `39990000` |
| `status` | string | ❌ NO | Product status | `"active"` or `"inactive"` |
| `selected_size_ids` | number[] | ❌ NO | Array of size IDs | `[1, 2, 3]` |
| `selected_color_ids` | number[] | ❌ NO | Array of color IDs | `[1, 2]` |
| `variants` | object[] | ❌ NO | Array of variants | See below ⬇️ |
| `images` | object[] | ❌ NO | Array of images | See below ⬇️ |

### **Variant Object Structure**

| Field | Type | Required | Description | Database Column |
|-------|------|----------|-------------|-----------------|
| `sku` | string | ✅ YES | Variant SKU (unique) | `sku` |
| `size_id` | **number** | ✅ YES | **Foreign Key to sizes table** | `size_id` |
| `color_id` | **number** | ✅ YES | **Foreign Key to colors table** | `color_id` |
| `stock` | number | ✅ YES | Initial stock quantity | `total_stock` |
| `status` | string | ❌ NO | Variant status (default: "active") | `status` |

### **Image Object Structure**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image_url` | string | ✅ YES | Full URL to image |
| `is_primary` | boolean | ❌ NO | Is primary image (default: false) |
| `display_order` | number | ❌ NO | Display order (default: 0) |

---

## ⚠️ IMPORTANT: Validation Rules

### **DO NOT USE String Size/Color**
```json
// ❌ WRONG - Will cause validation error
{
  "variants": [
    {
      "size": "M",           // ❌ String not accepted
      "color": "Red",        // ❌ String not accepted
      "sku": "PROD-M-RED",
      "stock": 100
    }
  ]
}
```

### **✅ CORRECT - Use IDs (Numbers)**
```json
// ✅ CORRECT - Matches database schema
{
  "variants": [
    {
      "size_id": 1,          // ✅ Number (FK to sizes table)
      "color_id": 2,         // ✅ Number (FK to colors table)
      "sku": "PROD-M-RED",
      "stock": 100
    }
  ]
}
```

---

## Response Examples

### **Success Response (201 Created)**
```json
{
  "id": 123
}
```

### **Validation Error (400 Bad Request)**
```json
{
  "statusCode": 400,
  "message": [
    "variants.0.size_id must be a number conforming to the specified constraints",
    "variants.0.color_id must be a number conforming to the specified constraints"
  ],
  "error": "Bad Request"
}
```

### **SKU Conflict Error (409 Conflict)**
```json
{
  "statusCode": 409,
  "message": "SKU đã tồn tại",
  "error": "Conflict"
}
```

---

## Database Schema Reference

### **products table**
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  description TEXT,
  full_description TEXT,
  cost_price NUMERIC,
  selling_price NUMERIC NOT NULL,
  category_id BIGINT REFERENCES categories(id),
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **product_variants table**
```sql
CREATE TABLE product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  size_id BIGINT REFERENCES sizes(id),      -- ✅ Foreign Key
  color_id BIGINT REFERENCES colors(id),    -- ✅ Foreign Key
  sku VARCHAR UNIQUE NOT NULL,
  total_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'active'
);
```

### **sizes table**
```sql
CREATE TABLE sizes (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,           -- e.g., "S", "M", "L", "XL"
  display_order INTEGER DEFAULT 0
);
```

### **colors table**
```sql
CREATE TABLE colors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,           -- e.g., "Red", "Blue", "Black"
  hex_code VARCHAR,                -- e.g., "#FF0000"
  display_order INTEGER DEFAULT 0
);
```

---

## How to Get Size/Color IDs

### **Get Available Sizes**
```http
GET /api/v1/sizes
```

**Response:**
```json
[
  { "id": 1, "name": "S", "display_order": 0 },
  { "id": 2, "name": "M", "display_order": 1 },
  { "id": 3, "name": "L", "display_order": 2 },
  { "id": 4, "name": "XL", "display_order": 3 }
]
```

### **Get Available Colors**
```http
GET /api/v1/colors
```

**Response:**
```json
[
  { "id": 1, "name": "Black", "hex_code": "#000000", "display_order": 0 },
  { "id": 2, "name": "White", "hex_code": "#FFFFFF", "display_order": 1 },
  { "id": 3, "name": "Red", "hex_code": "#FF0000", "display_order": 2 }
]
```

---

## Complete Example Request

```http
POST /api/v1/admin/products HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Basic Cotton T-Shirt",
  "sku": "TEE-BASIC-001",
  "description": "Comfortable cotton t-shirt for everyday wear",
  "full_description": "100% cotton, pre-shrunk, machine washable. Available in multiple sizes and colors.",
  "category_id": 5,
  "cost_price": 50000,
  "selling_price": 99000,
  "status": "active",
  "selected_size_ids": [1, 2, 3, 4],
  "selected_color_ids": [1, 2, 3],
  "variants": [
    { "sku": "TEE-BASIC-001-S-BLK", "size_id": 1, "color_id": 1, "stock": 100 },
    { "sku": "TEE-BASIC-001-M-BLK", "size_id": 2, "color_id": 1, "stock": 150 },
    { "sku": "TEE-BASIC-001-L-BLK", "size_id": 3, "color_id": 1, "stock": 100 },
    { "sku": "TEE-BASIC-001-XL-BLK", "size_id": 4, "color_id": 1, "stock": 50 },
    { "sku": "TEE-BASIC-001-S-WHT", "size_id": 1, "color_id": 2, "stock": 80 },
    { "sku": "TEE-BASIC-001-M-WHT", "size_id": 2, "color_id": 2, "stock": 120 },
    { "sku": "TEE-BASIC-001-L-WHT", "size_id": 3, "color_id": 2, "stock": 80 },
    { "sku": "TEE-BASIC-001-XL-WHT", "size_id": 4, "color_id": 2, "stock": 40 }
  ],
  "images": [
    {
      "image_url": "https://cdn.example.com/tee-black-front.jpg",
      "is_primary": true,
      "display_order": 0
    },
    {
      "image_url": "https://cdn.example.com/tee-black-back.jpg",
      "is_primary": false,
      "display_order": 1
    },
    {
      "image_url": "https://cdn.example.com/tee-white-front.jpg",
      "is_primary": false,
      "display_order": 2
    }
  ]
}
```

---

## Notes for Frontend Developers

1. **Always use `size_id` and `color_id` as numbers (integers)**
   - These are foreign keys to `sizes` and `colors` tables
   - Do NOT send string values like `"M"` or `"Red"`

2. **Fetch size/color master data first**
   - Call `/api/v1/sizes` and `/api/v1/colors` to get valid IDs
   - Cache these for dropdowns/selection UI

3. **SKU must be unique across all products and variants**
   - Backend will reject duplicate SKUs with 409 Conflict

4. **Stock is saved to `total_stock` column**
   - Field name in DTO: `stock`
   - Database column: `total_stock`

5. **Images are optional**
   - If not provided, product will have no images
   - Can be added later via image management endpoints

6. **Slug is auto-generated**
   - Backend generates unique slug from product name
   - No need to send `slug` in payload

---

## Testing Checklist

- [ ] Test with valid payload → Should return 201 with product ID
- [ ] Test with string size/color → Should return 400 validation error
- [ ] Test with duplicate SKU → Should return 409 conflict error
- [ ] Test with missing required fields → Should return 400 with clear message
- [ ] Test with invalid size_id/color_id → Should return error
- [ ] Test with empty variants array → Should create product without variants
- [ ] Test without variants field → Should create product without variants

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-05  
**Maintained By:** Backend Team
