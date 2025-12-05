# 🐛 Bug Report: Admin Product Detail - Missing Data

**Date:** December 5, 2025  
**Reporter:** Frontend Team  
**Priority:** 🔴 HIGH  
**Module:** Admin Product Management

---

## 📋 Summary

Admin Product Detail page (`GET /admin/products/:id`) không trả về đủ thông tin cần thiết, đặc biệt là **variants array rỗng** và **thiếu analytics data**.

---

## 🔍 Issue #1: Variants Array Empty

### **Endpoint:**
```
GET /api/v1/admin/products/:id
```

### **Current Behavior:**
Response trả về `variants: []` (empty array)

```json
{
  "id": "6",
  "name": "Áo Khoác Kaki Nam Sage Moss Sundaze Rush Form Loose",
  "description": "...",
  "full_description": "...",
  "cost_price": "269400",
  "selling_price": "437486",
  "category_id": "1",
  "status": "active",
  "thumbnail_url": "https://...",
  "selected_color_ids": ["1", "3", "4"],
  "selected_size_ids": ["2", "3", "4", "5", "6"],
  "variants": [],  // ❌ EMPTY - This is the problem
  "total_sold": 0,
  "total_reviews": 0,
  "average_rating": 0
}
```

### **Expected Behavior:**
Response phải bao gồm **full variants data với relationships**:

```json
{
  "id": "6",
  "name": "Áo Khoác Kaki Nam...",
  "variants": [
    {
      "id": 101,
      "product_id": 6,
      "sku": "AKK-001-M-BLK",
      "size_id": 3,
      "color_id": 1,
      "total_stock": 50,
      "reserved_stock": 5,
      "reorder_point": 10,
      "status": "active",
      "version": 1,
      "created_at": "2024-12-01T00:00:00Z",
      "size": {
        "id": 3,
        "name": "M",
        "sort_order": 2
      },
      "color": {
        "id": 1,
        "name": "Black",
        "hex_code": "#000000"
      },
      "images": [
        {
          "id": 501,
          "variant_id": 101,
          "image_url": "https://...",
          "is_main": true
        }
      ]
    }
  ]
}
```

### **Database Schema Reference:**
```sql
-- product_variants table
CREATE TABLE product_variants (
  id bigint PRIMARY KEY,
  product_id bigint NOT NULL,
  size_id bigint,
  color_id bigint,
  sku varchar NOT NULL UNIQUE,
  total_stock integer DEFAULT 0,
  reserved_stock integer DEFAULT 0,
  reorder_point integer DEFAULT 0,
  status varchar DEFAULT 'active',
  version integer DEFAULT 1,
  deleted_at timestamp
);

-- product_images table
CREATE TABLE product_images (
  id bigint PRIMARY KEY,
  variant_id bigint NOT NULL,
  image_url text NOT NULL,
  is_main boolean DEFAULT false
);
```

### **Required Joins:**
```sql
SELECT 
  pv.*,
  s.id as size_id, s.name as size_name, s.sort_order,
  c.id as color_id, c.name as color_name, c.hex_code,
  pi.id as image_id, pi.image_url, pi.is_main
FROM product_variants pv
LEFT JOIN sizes s ON pv.size_id = s.id
LEFT JOIN colors c ON pv.color_id = c.id
LEFT JOIN product_images pi ON pi.variant_id = pv.id
WHERE pv.product_id = ? 
  AND pv.deleted_at IS NULL
ORDER BY s.sort_order, c.name, pi.is_main DESC;
```

### **Why This Matters:**
1. ❌ Admin không thể xem variants của sản phẩm
2. ❌ Không thể quản lý stock cho từng variant
3. ❌ Không thể xem images của variants
4. ❌ Variants tab hiển thị "No variants found"

---

## 🔍 Issue #2: Missing Analytics Data

### **Problem:**
Frontend cần hiển thị **Product Analytics** với 4 sub-tabs nhưng backend không có APIs.

### **Current Situation:**
Frontend đang phải dùng **mock data** cho toàn bộ analytics tab:

#### 📊 **Sales Trend (Tab 1)**
- ❌ Không có API để lấy sales trend theo thời gian
- Need: Daily/weekly/monthly sales data của product này

#### 📦 **Top Selling Variants (Tab 2)**
- ❌ Không có API để lấy variants sales distribution
- Need: Số lượng bán được của từng variant

#### ⭐ **Rating Distribution (Tab 3)**
- ❌ Không có API để lấy rating breakdown
- Need: Phân bố rating 1-5 sao

#### 💬 **Customer Reviews (Tab 4)**
- ✅ Có API: `GET /products/:productId/reviews` (public)
- ⚠️ Nhưng cần thêm admin version với filters

---

## 🎯 Required APIs

### **1. Product Analytics Overview**
```
GET /api/v1/admin/products/:id/analytics

Response:
{
  "sales": {
    "total_revenue": 125000000,
    "total_units_sold": 1234,
    "total_orders": 856,
    "average_order_value": 146000,
    "growth_rate": 12.5
  },
  "inventory": {
    "total_stock": 450,
    "available_stock": 390,
    "reserved_stock": 60,
    "variants_count": 15,
    "low_stock_variants": 3,
    "out_of_stock_variants": 0
  },
  "ratings": {
    "average_rating": 4.7,
    "total_reviews": 156,
    "rating_distribution": {
      "5": { "count": 98, "percentage": 63 },
      "4": { "count": 42, "percentage": 27 },
      "3": { "count": 12, "percentage": 8 },
      "2": { "count": 3, "percentage": 2 },
      "1": { "count": 1, "percentage": 1 }
    }
  }
}
```

### **2. Product Sales Trend**
```
GET /api/v1/admin/products/:id/analytics/sales
Query: ?period=7days|30days|3months|1year

Response:
{
  "period": "30days",
  "data": [
    {
      "date": "2024-11-06",
      "revenue": 4500000,
      "units_sold": 52,
      "orders": 45
    },
    {
      "date": "2024-11-07",
      "revenue": 3800000,
      "units_sold": 45,
      "orders": 38
    }
  ],
  "total_revenue": 125000000,
  "total_units_sold": 1234
}
```

### **3. Variants Sales Analytics**
```
GET /api/v1/admin/products/:id/analytics/variants

Response:
{
  "variants": [
    {
      "variant_id": 101,
      "sku": "AKK-001-L-BLK",
      "size": "L",
      "color": "Black",
      "total_sold": 340,
      "revenue": 28500000,
      "percentage": 28,
      "current_stock": 45
    },
    {
      "variant_id": 102,
      "sku": "AKK-001-M-BLK",
      "size": "M",
      "color": "Black",
      "total_sold": 298,
      "revenue": 24500000,
      "percentage": 24,
      "current_stock": 60
    }
  ],
  "total_sold": 1234
}
```

### **4. Product Reviews (Admin View)**
```
GET /api/v1/admin/products/:id/reviews
Query: 
  ?page=1
  &limit=10
  &rating=5|4|3|2|1|all
  &status=approved|pending|rejected|all
  &sort=created_at|rating
  &order=asc|desc

Response:
{
  "reviews": [
    {
      "id": 1001,
      "customer_id": 456,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "order_id": 789,
      "order_number": "ORD-20241205-789",
      "variant_id": 101,
      "variant_sku": "AKK-001-M-BLK",
      "rating": 5,
      "comment": "Sản phẩm rất tốt...",
      "status": "approved",
      "created_at": "2024-12-05T10:00:00Z",
      "reviewed_at": "2024-12-05T11:00:00Z",
      "admin_id": 1,
      "admin_name": "Admin User"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "total_pages": 16
  },
  "summary": {
    "total_approved": 150,
    "total_pending": 5,
    "total_rejected": 1,
    "average_rating": 4.7
  }
}
```

---

## 🔧 Suggested Implementation (Backend)

### **For Issue #1 (Variants):**

```typescript
// backend/services/admin/productService.ts
async getProductById(id: number) {
  const product = await db.query(`
    SELECT p.*,
           c.name as category_name,
           c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id]);

  // Fetch variants with relationships
  const variants = await db.query(`
    SELECT 
      pv.*,
      s.id as size_id, s.name as size_name, s.sort_order,
      c.id as color_id, c.name as color_name, c.hex_code
    FROM product_variants pv
    LEFT JOIN sizes s ON pv.size_id = s.id
    LEFT JOIN colors c ON pv.color_id = c.id
    WHERE pv.product_id = $1 AND pv.deleted_at IS NULL
    ORDER BY s.sort_order, c.name
  `, [id]);

  // Fetch images for each variant
  for (const variant of variants) {
    variant.images = await db.query(`
      SELECT id, image_url, is_main
      FROM product_images
      WHERE variant_id = $1
      ORDER BY is_main DESC, id ASC
    `, [variant.id]);
  }

  return {
    ...product,
    variants: variants.map(v => ({
      id: v.id,
      sku: v.sku,
      total_stock: v.total_stock,
      reserved_stock: v.reserved_stock,
      reorder_point: v.reorder_point,
      status: v.status,
      size: {
        id: v.size_id,
        name: v.size_name,
        sort_order: v.sort_order
      },
      color: {
        id: v.color_id,
        name: v.color_name,
        hex_code: v.hex_code
      },
      images: v.images
    }))
  };
}
```

### **For Issue #2 (Analytics):**

```typescript
// backend/services/admin/analyticsService.ts

// 1. Product analytics overview
async getProductAnalytics(productId: number) {
  // Sales data
  const sales = await db.query(`
    SELECT 
      SUM(oi.quantity * oi.price_at_purchase) as total_revenue,
      SUM(oi.quantity) as total_units_sold,
      COUNT(DISTINCT oi.order_id) as total_orders,
      AVG(oi.price_at_purchase) as average_order_value
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN product_variants pv ON oi.variant_id = pv.id
    WHERE pv.product_id = $1 
      AND o.fulfillment_status = 'delivered'
  `, [productId]);

  // Inventory
  const inventory = await db.query(`
    SELECT 
      SUM(total_stock) as total_stock,
      SUM(total_stock - reserved_stock) as available_stock,
      SUM(reserved_stock) as reserved_stock,
      COUNT(*) as variants_count,
      COUNT(CASE WHEN total_stock <= reorder_point THEN 1 END) as low_stock_variants,
      COUNT(CASE WHEN total_stock = 0 THEN 1 END) as out_of_stock_variants
    FROM product_variants
    WHERE product_id = $1 AND deleted_at IS NULL
  `, [productId]);

  // Ratings
  const ratings = await db.query(`
    SELECT 
      AVG(rating) as average_rating,
      COUNT(*) as total_reviews,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1
    FROM product_reviews pr
    JOIN product_variants pv ON pr.variant_id = pv.id
    WHERE pv.product_id = $1 AND pr.status = 'approved'
  `, [productId]);

  return { sales, inventory, ratings };
}

// 2. Sales trend
async getProductSalesTrend(productId: number, period: string) {
  const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
  
  return db.query(`
    SELECT 
      DATE(o.created_at) as date,
      SUM(oi.quantity * oi.price_at_purchase) as revenue,
      SUM(oi.quantity) as units_sold,
      COUNT(DISTINCT o.id) as orders
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN product_variants pv ON oi.variant_id = pv.id
    WHERE pv.product_id = $1 
      AND o.created_at >= NOW() - INTERVAL '${days} days'
      AND o.fulfillment_status = 'delivered'
    GROUP BY DATE(o.created_at)
    ORDER BY date ASC
  `, [productId]);
}

// 3. Variants analytics
async getVariantsAnalytics(productId: number) {
  return db.query(`
    SELECT 
      pv.id as variant_id,
      pv.sku,
      s.name as size,
      c.name as color,
      COALESCE(SUM(oi.quantity), 0) as total_sold,
      COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) as revenue,
      pv.total_stock as current_stock
    FROM product_variants pv
    LEFT JOIN sizes s ON pv.size_id = s.id
    LEFT JOIN colors c ON pv.color_id = c.id
    LEFT JOIN order_items oi ON oi.variant_id = pv.id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.fulfillment_status = 'delivered'
    WHERE pv.product_id = $1 AND pv.deleted_at IS NULL
    GROUP BY pv.id, pv.sku, s.name, c.name, pv.total_stock
    ORDER BY total_sold DESC
  `, [productId]);
}
```

---

## ✅ Test Cases

### **Issue #1 - Variants:**
1. GET `/admin/products/6` → Should return variants array with size, color, images
2. Verify each variant has: sku, total_stock, size object, color object, images array
3. Verify color has hex_code field
4. Verify images are sorted by is_main DESC

### **Issue #2 - Analytics:**
1. GET `/admin/products/6/analytics` → Should return sales, inventory, ratings
2. GET `/admin/products/6/analytics/sales?period=30days` → Should return daily data
3. GET `/admin/products/6/analytics/variants` → Should return top selling variants
4. GET `/admin/products/6/reviews?status=approved` → Should return admin view of reviews

---

## 🚨 Impact

### **Current State:**
- ❌ Admin product detail page không sử dụng được
- ❌ Không thể quản lý variants
- ❌ Không có analytics insights
- ❌ Frontend phải dùng mock data

### **After Fix:**
- ✅ Admin có thể xem đầy đủ variants với stock levels
- ✅ Admin có thể xem sales trends và performance
- ✅ Admin có insights để quyết định restock
- ✅ Admin có thể moderate reviews hiệu quả

---

## 📌 Related Files

**Frontend:**
- `app/admin/products/[id]/page.tsx` - Admin product detail page
- `lib/services/admin/productService.ts` - Service calls

**Backend (Need to update):**
- `backend/services/admin/productService.ts`
- `backend/services/admin/analyticsService.ts`
- `backend/controllers/admin/productController.ts`

---

**Priority:** 🔴 **HIGH** - Blocking admin product management functionality

**Estimated Effort:** 
- Issue #1 (Variants): 2-3 hours
- Issue #2 (Analytics): 4-6 hours

**Next Steps:**
1. Backend team implement variants joining logic
2. Backend team create analytics endpoints
3. Frontend team test with real data
4. Frontend team remove mock data

---

*Report generated: December 5, 2025*  
*Frontend Team - Admin Integration*
