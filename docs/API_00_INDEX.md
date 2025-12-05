# 📚 API Documentation Index

> **Complete API Reference - E-commerce Backend**  
> **Version:** 1.0  
> **Last Updated:** December 5, 2025  
> **Base URL:** `https://api.yourshop.com` (Production) | `http://localhost:3000` (Development)

---

## 📖 Documentation Structure

This documentation is organized into **7 modules** for easy navigation:

### 1️⃣ [Authentication](./API_01_AUTHENTICATION.md)
**Customer & Admin Authentication**
- Customer Registration & Login (Email/Password, Google OAuth)
- Account Activation & Email Verification
- Password Reset & Forgot Password
- Refresh Token Management
- Admin Login & Management
- Admin Password Reset

**Endpoints:** 16 APIs

---

### 2️⃣ [Products & Catalog](./API_02_PRODUCTS_CATALOG.md)
**Product Browsing & Management**
- Product Listing (Filter, Search, Sort)
- Product Details (by slug/ID)
- New Arrivals & Flash Sale Products
- Product Reviews & Related Products
- Categories Management (Public + Admin)
- Colors & Sizes Management

**Endpoints:** 35+ APIs

---

### 3️⃣ [Shopping Flow](./API_03_SHOPPING.md)
**Cart, Checkout & Orders**
- Shopping Cart Management (Add, Update, Delete)
- Cart Merge (Guest → Customer)
- Checkout & Order Creation
- VNPAY Payment Integration
- Order History & Tracking
- Order Cancellation

**Endpoints:** 15+ APIs

---

### 4️⃣ [Customer Features](./API_04_CUSTOMER.md)
**Customer Account & Profile**
- Profile Management
- Password Change
- Address Book Management
- Wishlist Management
- Product Reviews (Create, Update, Delete)

**Endpoints:** 20+ APIs

---

### 5️⃣ [Support & AI](./API_05_SUPPORT_AI.md)
**Customer Support & AI Features**
- Support Tickets (Create, Reply, Track)
- Live Chat Sessions
- AI Consultant (Sizing Advice, Styling, Product Comparison)
- Chatbot Integration
- Admin Support Management

**Endpoints:** 18+ APIs

---

### 6️⃣ [Admin Management](./API_06_ADMIN_MANAGEMENT.md)
**Admin Panel & Business Operations**
- Dashboard & Analytics
- Order Management (Status, Fulfillment)
- Customer Management
- Inventory Management (Restock, Low Stock Alerts)
- Promotions & Coupons Management
- CMS Pages Management
- Payment Transactions
- Chatbot Analytics

**Endpoints:** 45+ APIs

---

## 🔐 Authentication Overview

### Access Levels
| Level | Description | Token Type | Expiry |
|-------|-------------|------------|--------|
| **Public** | No authentication | None | N/A |
| **Customer** | Logged-in customer | JWT Bearer Token | 15 min (Access) + 30 days (Refresh) |
| **Admin** | Admin user | JWT Bearer Token | 8 hours (no refresh) |
| **Internal** | System-to-system | API Key | N/A |

### Authorization Header Format
```
Authorization: Bearer <access_token>
```

---

## 📊 API Statistics

### By Authentication Type
- **Public APIs:** ~35 endpoints (no authentication)
- **Customer APIs:** ~40 endpoints (JWT required)
- **Admin APIs:** ~45 endpoints (JWT + Admin role)
- **Internal APIs:** ~3 endpoints (API key)

### By HTTP Method
- **GET:** ~60 endpoints (Read operations)
- **POST:** ~35 endpoints (Create operations)
- **PUT/PATCH:** ~20 endpoints (Update operations)
- **DELETE:** ~8 endpoints (Delete operations)

### Total Endpoints: **120+**

---

## 🚀 Quick Start

### 1. Customer Flow Example
```javascript
// 1. Register
POST /api/v1/auth/register
{ "email": "user@example.com", "password": "pass123" }

// 2. Activate account (click email link)
GET /api/v1/auth/activate?token=xxx

// 3. Login
POST /api/v1/auth/login
{ "email": "user@example.com", "password": "pass123" }
// Response: { access_token, refresh_token }

// 4. Browse products
GET /products?category_slug=ao-so-mi&page=1

// 5. Add to cart
POST /cart/items
{ "variant_id": 101, "quantity": 2 }
// Header: Authorization: Bearer <access_token>

// 6. Checkout
POST /api/v1/checkout
{ "customer_address_id": 5, "payment_method": "vnpay" }

// 7. Get payment URL
POST /api/v1/checkout/create-payment-url
{ "order_id": 789 }
```

### 2. Admin Flow Example
```javascript
// 1. Admin login
POST /api/v1/admin/auth/login
{ "email": "admin@shop.com", "password": "admin123" }

// 2. View dashboard
GET /admin/dashboard/stats
// Header: Authorization: Bearer <admin_access_token>

// 3. Manage orders
GET /admin/orders?status=pending
PUT /admin/orders/789/status
{ "status": "processing" }

// 4. Update inventory
POST /admin/inventory/restock
{ "items": [{ "variant_id": 101, "quantity": 50 }] }
```

---

## 🛠️ Common Patterns

### Pagination
Most list endpoints support pagination:
```
GET /products?page=1&limit=20
```

Response includes metadata:
```json
{
  "data": [...],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Or for validation errors:
```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 6 characters"
  ],
  "error": "Bad Request"
}
```

### Common HTTP Status Codes
- **200 OK** - Success (GET, PUT, DELETE)
- **201 Created** - Resource created (POST)
- **400 Bad Request** - Validation error or invalid request
- **401 Unauthorized** - Not authenticated or invalid token
- **403 Forbidden** - Authenticated but no permission
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resource (e.g., email exists)
- **500 Internal Server Error** - Server error

---

## 🔍 Search & Filter Capabilities

### Products Search
```
GET /products?search=áo+sơ+mi&category_slug=ao-so-mi&colors=1,2&sizes=M,L&min_price=100000&max_price=500000&sort_by=price_asc
```

### Orders Filter (Admin)
```
GET /admin/orders?status=pending&customer_email=user@example.com&page=1
```

### Date Range Filter
```
GET /admin/transactions?start_date=2024-01-01&end_date=2024-12-31
```

---

## 📝 Data Formats

### Date/Time
ISO 8601 format: `2024-11-26T10:00:00Z` (UTC)

### Currency
Vietnamese Dong (VND) - Integer format (no decimals)
- Example: `350000` = 350,000 VND

### Phone Numbers
Vietnamese format: `0912345678` (10 digits)

### Email
Standard email format: `user@example.com`

---

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies or secure storage)
3. **Implement rate limiting** on login/register endpoints
4. **Validate all inputs** on client side before API calls
5. **Handle token expiry** gracefully (use refresh token)
6. **Never log sensitive data** (passwords, tokens)
7. **Use CORS properly** (whitelist frontend domains)

---

## 🌐 Environment Variables

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# Frontend
FRONTEND_URL=https://yourshop.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# VNPAY
VNPAY_TMN_CODE=your-tmn-code
VNPAY_HASH_SECRET=your-hash-secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://yourshop.com/payment/vnpay-return

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 📞 Support & Contact

- **Technical Issues:** dev@yourshop.com
- **API Questions:** api@yourshop.com
- **Documentation Feedback:** docs@yourshop.com

---

## 📄 Related Resources

- **[Database Schema](../Database.md)** - Complete database structure
- **[Technical Specification](../API_TECHNICAL_SPECIFICATION.md)** - Business logic & architecture
- **[Postman Collection](#)** - Import ready collection (coming soon)
- **[OpenAPI Spec](#)** - Swagger/OpenAPI 3.0 spec (coming soon)

---

**Happy Coding! 🚀**

*Generated by Senior Backend Developer Audit - December 2025*
