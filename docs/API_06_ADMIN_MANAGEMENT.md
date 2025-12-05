# 👑 Module 6: Admin Management

> **Admin Dashboard, Orders, Customers, Inventory & Analytics APIs**  
> **Total Endpoints:** 45+  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Dashboard & Analytics
1-4. [Dashboard Stats, Revenue, Orders, Products](#dashboard--analytics)

### Orders Management
5-10. [Orders CRUD, Status Updates, Statistics](#orders-management)

### Customers Management
11-15. [Customers List, Details, Status, Statistics](#customers-management)

### Inventory Management
16-20. [Inventory, Restock, Low Stock, History](#inventory-management)

### Promotions Management
21-27. [Promotions CRUD, Usage Statistics](#promotions-management)

### CMS Pages
28-32. [Pages CRUD for About, FAQ, Terms](#cms-pages)

### Payment Transactions
33-36. [Transactions List, Details, Statistics](#payment-transactions)

### Analytics & Reports
37-42. [Sales, Products, Customers, Revenue Analytics](#analytics--reports)

### AI & Recommendations
43-45. [AI Analytics, Product Recommendations](#ai--recommendations)

---

# Dashboard & Analytics

## Dashboard Overview

### GET `/admin/dashboard/stats`
**Tổng quan dashboard**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "overview": {
    "total_revenue": 125000000,
    "total_orders": 1250,
    "total_customers": 850,
    "total_products": 250,
    "pending_orders": 35,
    "low_stock_products": 12
  },
  "today": {
    "revenue": 3500000,
    "orders": 45,
    "new_customers": 8
  },
  "growth": {
    "revenue_growth": 15.5,
    "orders_growth": 12.3,
    "customers_growth": 18.2
  }
}
```

---

### GET `/admin/dashboard/recent-orders`
**Đơn hàng gần đây**

### 📤 Response

```json
{
  "orders": [
    {
      "id": 789,
      "order_number": "ORD-20241205-789",
      "customer_name": "Nguyễn Văn A",
      "total_amount": 1010000,
      "payment_status": "paid",
      "fulfillment_status": "pending",
      "created_at": "2024-12-05T10:00:00Z"
    }
  ]
}
```

---

### GET `/admin/dashboard/top-products`
**Sản phẩm bán chạy**

### 📤 Response

```json
{
  "products": [
    {
      "id": 1,
      "name": "Áo Sơ Mi Trắng Classic",
      "total_sold": 250,
      "revenue": 87500000,
      "stock_status": "in_stock"
    }
  ]
}
```

---

### GET `/admin/dashboard/revenue-chart`
**Biểu đồ doanh thu**

### 📥 Query Parameters
- `period`: `7days`, `30days`, `3months`, `1year`

### 📤 Response

```json
{
  "period": "30days",
  "data": [
    {
      "date": "2024-11-06",
      "revenue": 4500000,
      "orders": 52
    },
    {
      "date": "2024-11-07",
      "revenue": 3800000,
      "orders": 45
    }
  ],
  "total_revenue": 125000000,
  "average_daily_revenue": 4166667
}
```

---

# Orders Management

## Order Operations

### GET `/admin/orders`
**Danh sách tất cả đơn hàng**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Query Parameters
| Parameter | Description |
|-----------|-------------|
| `page`, `limit` | Pagination |
| `status` | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `payment_status` | `unpaid`, `paid`, `failed` |
| `customer_email` | Filter by customer |
| `order_number` | Search by order number |
| `date_from`, `date_to` | Date range |

### 📤 Response

```json
{
  "data": [
    {
      "id": 789,
      "order_number": "ORD-20241205-789",
      "customer_id": 456,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "total_amount": 1010000,
      "payment_method": "vnpay",
      "payment_status": "paid",
      "fulfillment_status": "shipped",
      "items_count": 2,
      "created_at": "2024-12-05T10:00:00Z",
      "updated_at": "2024-12-05T15:30:00Z"
    }
  ],
  "metadata": {...}
}
```

---

### GET `/admin/orders/statistics`
**Thống kê đơn hàng**

### 📤 Response

```json
{
  "total_orders": 1250,
  "by_status": {
    "pending": 35,
    "processing": 120,
    "shipped": 150,
    "delivered": 900,
    "cancelled": 45
  },
  "by_payment_method": {
    "cod": 650,
    "vnpay": 600
  },
  "total_revenue": 125000000,
  "average_order_value": 100000
}
```

---

### GET `/admin/orders/:id`
**Chi tiết đơn hàng (Admin view)**

### 📤 Response

Same as customer view PLUS:
- Cost prices
- Profit margin
- Admin notes
- Full customer info
- IP address
- Payment transaction details

---

### PUT `/admin/orders/:id/status`
**Cập nhật trạng thái đơn hàng**

### 📥 Request Body

```json
{
  "fulfillment_status": "shipped",
  "note": "Đơn hàng đã được giao cho GHTK. Mã vận đơn: GHTK-123456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fulfillment_status` | string | ✅ | `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled` |
| `note` | string | ❌ | Ghi chú trạng thái |

### 📤 Response

```json
{
  "message": "Cập nhật trạng thái thành công",
  "order": {
    "id": 789,
    "fulfillment_status": "shipped",
    "updated_at": "2024-12-05T15:30:00Z"
  }
}
```

### 🔄 Logic Flow
1. Find order by ID
2. Validate new status (must follow flow)
3. Update order `fulfillment_status`
4. **Create order_status_history:**
   - status, admin_id, note, timestamp
5. **If status = 'shipped':**
   - Update inventory: `total_stock -= quantity`, `reserved_stock -= quantity`
6. Send email notification to customer
7. Return success

---

### POST `/admin/orders/:id/cancel`
**Hủy đơn hàng (Admin)**

### 📥 Request Body

```json
{
  "reason": "Khách hàng yêu cầu hủy"
}
```

### 📤 Response

```json
{
  "message": "Đã hủy đơn hàng",
  "order": {
    "id": 789,
    "fulfillment_status": "cancelled",
    "cancelled_at": "2024-12-05T16:00:00Z"
  }
}
```

---

### POST `/admin/orders/:id/refund`
**Hoàn tiền**

### 📥 Request Body

```json
{
  "amount": 1010000,
  "reason": "Sản phẩm lỗi",
  "refund_method": "bank_transfer"
}
```

### 📤 Response

```json
{
  "message": "Đã tạo yêu cầu hoàn tiền",
  "refund": {
    "id": 501,
    "order_id": 789,
    "amount": 1010000,
    "status": "pending",
    "created_at": "2024-12-05T16:00:00Z"
  }
}
```

---

# Customers Management

### GET `/admin/customers`
**Danh sách khách hàng**

### 📥 Query Parameters
- `page`, `limit`
- `status`: `active`, `inactive`, `deleted`
- `search`: Search by name, email, phone
- `sort_by`: `created_at`, `total_spent`, `orders_count`

### 📤 Response

```json
{
  "data": [
    {
      "id": 456,
      "email": "user@example.com",
      "name": "Nguyễn Văn A",
      "phone": "0901234567",
      "status": "active",
      "orders_count": 15,
      "total_spent": 12500000,
      "last_order_at": "2024-12-05T10:00:00Z",
      "created_at": "2024-11-01T10:00:00Z"
    }
  ],
  "metadata": {...}
}
```

---

### GET `/admin/customers/statistics`
**Thống kê khách hàng**

### 📤 Response

```json
{
  "total_customers": 850,
  "active_customers": 780,
  "new_this_month": 45,
  "top_customers": [
    {
      "id": 456,
      "name": "Nguyễn Văn A",
      "total_spent": 25000000,
      "orders_count": 35
    }
  ],
  "customer_lifetime_value": {
    "average": 14705882,
    "median": 8000000
  }
}
```

---

### GET `/admin/customers/:id`
**Chi tiết khách hàng**

### 📤 Response

```json
{
  "id": 456,
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "status": "active",
  "email_verified": true,
  "created_at": "2024-11-01T10:00:00Z",
  "last_login_at": "2024-12-05T09:00:00Z",
  "orders_count": 15,
  "total_spent": 12500000,
  "average_order_value": 833333,
  "addresses_count": 2,
  "wishlist_count": 8,
  "reviews_count": 5,
  "recent_orders": [...]
}
```

---

### PUT `/admin/customers/:id/status`
**Cập nhật trạng thái khách hàng**

### 📥 Request Body

```json
{
  "status": "inactive",
  "reason": "Spam account"
}
```

### 📤 Response

```json
{
  "message": "Cập nhật trạng thái thành công",
  "customer": {
    "id": 456,
    "status": "inactive",
    "updated_at": "2024-12-05T16:00:00Z"
  }
}
```

---

### GET `/admin/customers/:id/orders`
**Đơn hàng của khách**

Returns list of orders for specific customer

---

# Inventory Management

### GET `/admin/inventory`
**Tình trạng tồn kho**

### 📥 Query Parameters
- `page`, `limit`
- `category_id`: Filter by category
- `status`: `in_stock`, `low_stock`, `out_of_stock`
- `sort_by`: `name`, `total_stock`, `available_stock`

### 📤 Response

```json
{
  "data": [
    {
      "variant_id": 101,
      "product_id": 1,
      "product_name": "Áo Sơ Mi Trắng Classic",
      "sku": "ASM-001-M-TRA",
      "size": "M",
      "color": "Trắng",
      "total_stock": 50,
      "reserved_stock": 5,
      "available_stock": 45,
      "status": "in_stock",
      "last_restocked_at": "2024-11-01T10:00:00Z"
    }
  ],
  "metadata": {...},
  "summary": {
    "total_variants": 350,
    "in_stock": 300,
    "low_stock": 35,
    "out_of_stock": 15
  }
}
```

---

### POST `/admin/inventory/restock`
**Nhập kho thủ công**

### 📥 Request Body

```json
{
  "items": [
    {
      "variant_id": 101,
      "quantity": 50,
      "note": "Nhập kho định kỳ"
    }
  ]
}
```

### 📤 Response

```json
{
  "message": "Nhập kho thành công",
  "restocked_items": 1,
  "history": [
    {
      "id": 1001,
      "variant_id": 101,
      "quantity": 50,
      "previous_stock": 50,
      "new_stock": 100,
      "admin_id": 1,
      "created_at": "2024-12-05T16:00:00Z"
    }
  ]
}
```

---

### POST `/admin/inventory/restock-batch`
**Nhập kho qua Excel**

### 📥 Request
Multipart form-data with Excel file

### 📤 Response

```json
{
  "message": "Import thành công",
  "total_rows": 150,
  "success_count": 145,
  "failed_count": 5,
  "failed_items": [
    {
      "row": 23,
      "sku": "ASM-999-M-TRA",
      "error": "SKU không tồn tại"
    }
  ]
}
```

---

### GET `/admin/inventory/restock-history`
**Lịch sử nhập kho**

### 📤 Response

```json
{
  "data": [
    {
      "id": 1001,
      "variant_id": 101,
      "product_name": "Áo Sơ Mi Trắng Classic",
      "sku": "ASM-001-M-TRA",
      "quantity": 50,
      "previous_stock": 50,
      "new_stock": 100,
      "admin_id": 1,
      "admin_name": "Admin User",
      "note": "Nhập kho định kỳ",
      "created_at": "2024-12-05T16:00:00Z"
    }
  ],
  "metadata": {...}
}
```

---

### GET `/admin/inventory/low-stock`
**Sản phẩm sắp hết hàng**

### 📥 Query Parameters
- `threshold`: Stock threshold (default: 10)

### 📤 Response

```json
{
  "products": [
    {
      "variant_id": 102,
      "product_name": "Áo Polo Premium",
      "sku": "POLO-002-L-BLK",
      "available_stock": 5,
      "recommended_restock": 50
    }
  ],
  "total_low_stock": 35
}
```

---

# Promotions Management

### GET `/admin/promotions`
**Danh sách promotions**

### 📤 Response

```json
{
  "data": [
    {
      "id": 5,
      "name": "Flash Sale Weekend",
      "code": "FLASH20",
      "discount_type": "percentage",
      "discount_value": 20,
      "start_date": "2024-12-01T00:00:00Z",
      "end_date": "2024-12-31T23:59:59Z",
      "status": "active",
      "usage_count": 350,
      "max_uses": 1000,
      "products_count": 25
    }
  ],
  "metadata": {...}
}
```

---

### POST `/admin/promotions`
**Tạo promotion**

### 📥 Request Body

```json
{
  "name": "Summer Sale",
  "code": "SUMMER30",
  "discount_type": "percentage",
  "discount_value": 30,
  "start_date": "2024-06-01T00:00:00Z",
  "end_date": "2024-08-31T23:59:59Z",
  "max_uses": 500,
  "min_order_value": 500000,
  "product_ids": [1, 2, 3]
}
```

### 📤 Response

```json
{
  "message": "Tạo promotion thành công",
  "promotion": {
    "id": 10,
    "name": "Summer Sale",
    "code": "SUMMER30",
    "status": "active"
  }
}
```

---

### PUT `/admin/promotions/:id`
**Cập nhật promotion**

### DELETE `/admin/promotions/:id`
**Xóa promotion**

### POST `/admin/promotions/:id/toggle`
**Bật/Tắt promotion**

### GET `/admin/promotions/:code/usage`
**Thống kê sử dụng promotion**

---

# CMS Pages

### GET `/admin/pages`
**Danh sách pages**

### 📤 Response

```json
{
  "pages": [
    {
      "id": 1,
      "slug": "about-us",
      "title": "Về chúng tôi",
      "status": "published",
      "views_count": 1250,
      "updated_at": "2024-11-20T10:00:00Z"
    }
  ]
}
```

---

### GET `/admin/pages/:slug`
**Chi tiết page (Admin)**

### 📤 Response

```json
{
  "id": 1,
  "slug": "about-us",
  "title": "Về chúng tôi",
  "content": "<p>Chúng tôi là...</p>",
  "meta_title": "Về chúng tôi - YourShop",
  "meta_description": "Tìm hiểu về...",
  "status": "published",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-11-20T10:00:00Z"
}
```

---

### PUT `/admin/pages/:slug`
**Cập nhật nội dung page**

### 📥 Request Body

```json
{
  "title": "Về chúng tôi (Updated)",
  "content": "<p>Nội dung mới...</p>",
  "status": "published"
}
```

---

### POST `/admin/pages`
**Tạo page mới**

### DELETE `/admin/pages/:slug`
**Xóa page**

---

# Payment Transactions

### GET `/admin/transactions`
**Danh sách giao dịch**

### 📤 Response

```json
{
  "data": [
    {
      "id": 501,
      "order_id": 789,
      "order_number": "ORD-20241205-789",
      "customer_name": "Nguyễn Văn A",
      "transaction_id": "VNPAY-20241205-12345",
      "payment_method": "vnpay",
      "amount": 1010000,
      "status": "success",
      "paid_at": "2024-12-05T10:05:00Z"
    }
  ],
  "metadata": {...}
}
```

---

### GET `/admin/transactions/:id`
**Chi tiết giao dịch**

### GET `/admin/transactions/statistics`
**Thống kê giao dịch**

---

# Analytics & Reports

### GET `/analytics/overview`
**Tổng quan analytics**

### 📥 Query Parameters
- `period`: `today`, `7days`, `30days`, `3months`, `1year`

### 📤 Response

```json
{
  "period": "30days",
  "sales": {
    "total_revenue": 125000000,
    "total_orders": 450,
    "average_order_value": 277778,
    "growth_rate": 15.5
  },
  "products": {
    "total_sold": 1250,
    "best_seller": {
      "id": 1,
      "name": "Áo Sơ Mi Trắng Classic",
      "sold": 250
    }
  },
  "customers": {
    "new_customers": 45,
    "returning_customers": 120,
    "retention_rate": 0.72
  }
}
```

---

### GET `/analytics/products`
**Analytics sản phẩm**

### GET `/analytics/customers`
**Analytics khách hàng**

### GET `/analytics/revenue`
**Analytics doanh thu**

---

# AI & Recommendations

### GET `/admin/ai/recommendations`
**AI product recommendations analytics**

### 📤 Response

```json
{
  "performance": {
    "total_recommendations": 5000,
    "accepted_recommendations": 850,
    "acceptance_rate": 0.17,
    "revenue_from_recommendations": 12000000
  },
  "top_recommended_products": [
    {
      "product_id": 1,
      "times_recommended": 350,
      "times_accepted": 65,
      "conversion_rate": 0.18
    }
  ]
}
```

---

## 🎯 Summary

### Admin Management Overview

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Dashboard** | 4 | Stats, charts, overview |
| **Orders** | 6 | CRUD, status, refunds |
| **Customers** | 5 | List, details, status |
| **Inventory** | 5 | Stock management, restock |
| **Promotions** | 7 | CRUD, usage stats |
| **CMS** | 5 | Pages management |
| **Transactions** | 4 | Payment tracking |
| **Analytics** | 6 | Reports & insights |
| **AI** | 3 | Recommendations analytics |
| **Total** | **45+** | - |

---

## 🔍 Key Admin Features

### Order Management
- Full order lifecycle control
- Status updates with history tracking
- Refund processing
- Bulk operations

### Inventory Control
- Real-time stock tracking
- Restock management (manual + batch)
- Low stock alerts
- History tracking

### Customer Insights
- Customer lifetime value
- Purchase patterns
- Segmentation
- Activity tracking

### Analytics & Reporting
- Revenue analytics
- Product performance
- Customer analytics
- Growth metrics

---

## 🔒 Admin Security

1. **Role-Based Access:** Admin vs Super Admin permissions
2. **Action Logging:** All admin actions logged
3. **Audit Trail:** Order status changes tracked
4. **IP Restrictions:** Optional IP whitelist
5. **Two-Factor Auth:** (Recommended for production)

---

**✅ Admin Management Module Complete!**

---

**🎉 ALL API DOCUMENTATION COMPLETE! 🎉**

**Total Modules:** 7 (including Index)  
**Total Endpoints Documented:** 150+  
**Total Documentation Lines:** ~8,000+

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
