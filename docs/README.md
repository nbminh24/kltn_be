# 📚 API Documentation

> **Complete API Documentation for E-commerce Backend**  
> **Total Endpoints:** 150+  
> **Version:** 1.0  
> **Last Updated:** December 5, 2025

---

## 🎯 Overview

Tài liệu API đầy đủ cho hệ thống E-commerce Backend, được chia thành **7 modules** để dễ quản lý và tra cứu.

### 📊 Statistics

- **Total Modules:** 7
- **Total Endpoints:** 150+
- **Total Documentation Lines:** ~8,500+
- **Public APIs:** ~35 endpoints
- **Customer APIs:** ~55 endpoints
- **Admin APIs:** ~60 endpoints

---

## 📖 Module Structure

### [Module 0: Index & Overview](./API_00_INDEX.md)
**Tổng quan toàn bộ API**
- Quick start guide
- Authentication overview
- Common patterns
- Error handling
- Environment variables

---

### [Module 1: Authentication](./API_01_AUTHENTICATION.md)
**Customer & Admin Authentication** - **16 endpoints**

#### Customer Authentication
- ✅ Register với email verification
- ✅ Login (Email/Password + Google OAuth)
- ✅ Refresh Token (30 days)
- ✅ Password Reset Flow
- ✅ Logout

#### Admin Authentication
- ✅ Admin Login (8 hours token)
- ✅ Create Admin
- ✅ Reset Password (authenticated + public)

**Key Features:**
- JWT Bearer Token authentication
- Email verification required
- Google OAuth integration
- Refresh token rotation
- Security best practices

---

### [Module 2: Products & Catalog](./API_02_PRODUCTS_CATALOG.md)
**Product Management & Browsing** - **36 endpoints**

#### Public APIs
- ✅ Product listing (filter, search, sort, pagination)
- ✅ Product details (by slug/ID)
- ✅ New arrivals & Flash sales
- ✅ Product reviews & Related products
- ✅ Categories, Colors, Sizes

#### Admin APIs
- ✅ Products CRUD (Create, Read, Update, Delete)
- ✅ Variants management (size + color combinations)
- ✅ Images management
- ✅ Categories management
- ✅ Colors & Sizes management

**Key Concepts:**
- Product → Variants → Images hierarchy
- Stock management (total, reserved, available)
- SKU format: `{CATEGORY}-{ID}-{COLOR}-{SIZE}`
- Soft delete (products never hard deleted)

---

### [Module 3: Shopping](./API_03_SHOPPING.md)
**Cart, Checkout & Orders** - **15 endpoints**

#### Cart Management
- ✅ Add to cart với stock validation
- ✅ Update quantity & Remove items
- ✅ Cart merge (guest → customer)
- ✅ Coupon application

#### Checkout & Payment
- ✅ Create order (DATABASE TRANSACTION)
- ✅ VNPAY payment integration
- ✅ COD support

#### Orders
- ✅ Order history với filters
- ✅ Order details & Status timeline
- ✅ Cancel order (pending only)
- ✅ Order tracking (public - for chatbot)

**Key Features:**
- Transaction safety (all-or-nothing)
- Stock reservation on checkout
- Price snapshot (price_at_purchase)
- VNPAY callback handling
- Email notifications

---

### [Module 4: Customer Features](./API_04_CUSTOMER.md)
**Account, Profile, Addresses, Wishlist & Reviews** - **20 endpoints**

#### Account Management
- ✅ View & Update profile
- ✅ Change password
- ✅ Google account password setup

#### Address Management
- ✅ Multiple addresses per customer
- ✅ Default address for checkout
- ✅ Full CRUD operations

#### Wishlist
- ✅ Save favorite products
- ✅ Stock availability tracking
- ✅ Move to cart

#### Reviews
- ✅ Write reviews (purchase required)
- ✅ Update & Delete reviews
- ✅ Admin moderation (approve/reject)

**Key Rules:**
- Email is immutable (cannot change)
- One review per product per customer
- Reviews need admin approval
- Must purchase product to review

---

### [Module 5: Support & AI](./API_05_SUPPORT_AI.md)
**Support Tickets, Live Chat & AI Consultant** - **18 endpoints**

#### Customer Support
- ✅ Support tickets với categories
- ✅ Ticket replies & status tracking
- ✅ Live chat sessions
- ✅ Chatbot integration

#### AI Consultant (Public APIs)
- ✅ Sizing advice (based on height/weight)
- ✅ Styling recommendations
- ✅ Product comparison

#### Admin Support
- ✅ Ticket management
- ✅ Chat monitoring
- ✅ Chatbot analytics
- ✅ Unanswered conversations alert

**AI Features:**
- No login required for AI consultant
- Chatbot with human handoff
- Confidence score tracking
- Analytics for improvement

---

### [Module 6: Admin Management](./API_06_ADMIN_MANAGEMENT.md)
**Dashboard, Orders, Customers, Inventory & Analytics** - **45+ endpoints**

#### Dashboard & Analytics
- ✅ Real-time dashboard stats
- ✅ Revenue charts & trends
- ✅ Recent orders & top products

#### Orders Management
- ✅ Full order lifecycle control
- ✅ Status updates với history
- ✅ Refund processing
- ✅ Order statistics

#### Customers Management
- ✅ Customer list với filters
- ✅ Customer details & analytics
- ✅ Account status management
- ✅ Customer lifetime value

#### Inventory Management
- ✅ Real-time stock tracking
- ✅ Restock (manual + batch Excel)
- ✅ Low stock alerts
- ✅ Restock history

#### Promotions
- ✅ Create & manage promotions
- ✅ Coupon codes
- ✅ Usage statistics
- ✅ Flash sales

#### CMS & Content
- ✅ Pages management (About, FAQ, Terms)
- ✅ Content editor
- ✅ SEO meta tags

#### Analytics & Reports
- ✅ Sales analytics
- ✅ Product performance
- ✅ Customer insights
- ✅ Revenue reports

**Admin Capabilities:**
- Complete business operations control
- Real-time inventory management
- Customer relationship management
- Data-driven insights

---

## 🚀 Quick Start

### 1. Authentication Flow

```javascript
// Customer Registration
POST /api/v1/auth/register
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Activate account (click email link)
GET /api/v1/auth/activate?token=xxx

// Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
// Response: { access_token, refresh_token }
```

### 2. Shopping Flow

```javascript
// Browse products
GET /products?category_slug=ao-so-mi&page=1

// Add to cart
POST /cart/items
{
  "variant_id": 101,
  "quantity": 2
}
// Header: Authorization: Bearer <access_token>

// Checkout
POST /api/v1/checkout
{
  "customer_address_id": 5,
  "payment_method": "vnpay"
}

// Get VNPAY payment URL
POST /api/v1/checkout/create-payment-url
{
  "order_id": 789
}
// Redirect to paymentUrl
```

### 3. Admin Operations

```javascript
// Admin login
POST /api/v1/admin/auth/login
{
  "email": "admin@shop.com",
  "password": "Admin123"
}

// View dashboard
GET /admin/dashboard/stats
// Header: Authorization: Bearer <admin_token>

// Update order status
PUT /admin/orders/789/status
{
  "fulfillment_status": "shipped",
  "note": "Đã giao cho GHTK"
}

// Restock inventory
POST /admin/inventory/restock
{
  "items": [
    { "variant_id": 101, "quantity": 50 }
  ]
}
```

---

## 🔐 Authentication

### Access Levels

| Level | Token Type | Expiry | Refresh |
|-------|------------|--------|---------|
| **Public** | None | N/A | N/A |
| **Customer** | JWT Bearer | 15 min | 30 days |
| **Admin** | JWT Bearer | 8 hours | No |

### Authorization Header

```
Authorization: Bearer <access_token>
```

### Token Refresh (Customer only)

```javascript
POST /api/v1/auth/refresh
{
  "refresh_token": "<refresh_token>"
}
// Returns new access_token + refresh_token
```

---

## 📝 Common Patterns

### Pagination

```
GET /products?page=1&limit=20
```

**Response:**
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

### Filtering

```
GET /products?category_slug=ao-so-mi&colors=Trắng,Đen&sizes=M,L&min_price=100000
```

### Sorting

```
GET /products?sort_by=price_asc
GET /orders?sort_by=created_at&order=desc
```

### Searching

```
GET /products?search=áo+sơ+mi
GET /admin/customers?search=nguyen
```

---

## ⚠️ Error Handling

### Standard Error Format

```json
{
  "statusCode": 400,
  "message": "Validation error description",
  "error": "Bad Request"
}
```

### Validation Errors

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

- **200 OK** - Success
- **201 Created** - Resource created
- **400 Bad Request** - Validation error
- **401 Unauthorized** - Not authenticated
- **403 Forbidden** - No permission
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resource
- **500 Internal Server Error** - Server error

---

## 🔧 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname
DB_SSL=true

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

# Admin Reset
ADMIN_RESET_SECRET=your-admin-reset-secret
```

---

## 📊 API Endpoints Summary

| Module | Public | Customer | Admin | Total |
|--------|--------|----------|-------|-------|
| Authentication | 6 | 4 | 6 | 16 |
| Products & Catalog | 15 | 1 | 20 | 36 |
| Shopping | 1 | 11 | 3 | 15 |
| Customer Features | 0 | 16 | 4 | 20 |
| Support & AI | 3 | 8 | 7 | 18 |
| Admin Management | 0 | 0 | 45 | 45 |
| **TOTAL** | **25** | **40** | **85** | **150** |

---

## 🛠️ Testing Tools

### Recommended Tools

1. **Postman** - API testing
2. **Insomnia** - Alternative API client
3. **cURL** - Command line testing
4. **Browser DevTools** - Network inspection

### Example Postman Collection Structure

```
E-commerce API
├── 1. Authentication
│   ├── Customer Register
│   ├── Customer Login
│   ├── Admin Login
│   └── Refresh Token
├── 2. Products
│   ├── Get Products
│   ├── Get Product Details
│   └── Search Products
├── 3. Shopping
│   ├── Add to Cart
│   ├── Checkout
│   └── View Orders
└── 4. Admin
    ├── Dashboard Stats
    ├── Manage Orders
    └── Inventory Management
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies recommended)
3. **Implement rate limiting** on auth endpoints
4. **Validate all inputs** on both client and server
5. **Use environment variables** for secrets
6. **Enable CORS properly** (whitelist frontend domains)
7. **Log sensitive actions** for audit trail
8. **Keep dependencies updated**
9. **Use strong passwords** for admin accounts
10. **Set ADMIN_RESET_SECRET** in production

---

## 📞 Support & Contact

- **Technical Issues:** dev@yourshop.com
- **API Questions:** api@yourshop.com
- **Documentation Feedback:** docs@yourshop.com

---

## 📄 Related Resources

- **[Database Schema](../Database.md)** - Complete database structure
- **[API Technical Specification](../API_TECHNICAL_SPECIFICATION.md)** - Business logic details
- **[Seed Guide](../SEED_GUIDE.md)** - Sample data setup

---

## 🎉 Next Steps

1. **Review Module 0 (Index)** for quick reference
2. **Test Authentication** endpoints first
3. **Explore Public APIs** (no auth required)
4. **Build your frontend** with documented APIs
5. **Setup admin panel** with admin APIs
6. **Deploy to production** with proper security

---

## 📝 Changelog

### Version 1.0 (December 5, 2025)
- ✅ Initial complete documentation
- ✅ 150+ endpoints documented
- ✅ 7 modules created
- ✅ Examples for all endpoints
- ✅ Error handling documentation
- ✅ Security best practices

---

**Happy Coding! 🚀**

*Generated by Senior Backend Developer Audit - December 2025*
