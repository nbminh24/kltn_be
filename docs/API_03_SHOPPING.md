# 🛒 Module 3: Shopping

> **Cart, Checkout & Orders APIs**  
> **Total Endpoints:** 15  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Cart Management
1. [GET /cart](#1-get-cart) - Xem giỏ hàng
2. [POST /cart/items](#2-post-cartitems) - Thêm vào giỏ
3. [PUT /cart/items/:id](#3-put-cartitemsid) - Cập nhật số lượng
4. [DELETE /cart/items/:id](#4-delete-cartitemsid) - Xóa khỏi giỏ
5. [DELETE /cart/clear](#5-delete-cartclear) - Xóa toàn bộ giỏ
6. [POST /cart/apply-coupon](#6-post-cartapply-coupon) - Áp dụng mã giảm giá
7. [POST /cart/merge](#7-post-cartmerge) - Merge guest cart

### Checkout
8. [POST /api/v1/checkout](#8-post-apiv1checkout) - Tạo đơn hàng
9. [POST /api/v1/checkout/create-payment-url](#9-post-apiv1checkoutcreate-payment-url) - Tạo VNPAY URL

### Orders
10. [GET /orders](#10-get-orders) - Lịch sử đơn hàng
11. [GET /orders/:id](#11-get-ordersid) - Chi tiết đơn hàng
12. [GET /orders/:id/status-history](#12-get-ordersidstatus-history) - Timeline trạng thái
13. [POST /orders/:id/cancel](#13-post-ordersidcancel) - Hủy đơn hàng
14. [GET /orders/track](#14-get-orderstrack) - Tracking (Public)

### Payment Callbacks
15. [GET /api/v1/payment/vnpay-return](#15-get-apiv1paymentvnpay-return) - VNPAY callback

---

# Cart Management

## 1. GET `/cart`
**Xem giỏ hàng**

### 📋 Overview
Lấy tất cả items trong giỏ hàng của customer với thông tin sản phẩm, variant, giá và tổng tiền.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Headers
```
Authorization: Bearer <access_token>
```

### 📤 Response

#### Success (200 OK)
```json
{
  "cart_id": 123,
  "customer_id": 456,
  "items": [
    {
      "id": 789,
      "cart_id": 123,
      "variant_id": 101,
      "quantity": 2,
      "product": {
        "id": 1,
        "name": "Áo Sơ Mi Trắng Classic",
        "slug": "ao-so-mi-trang-classic",
        "thumbnail_url": "https://storage.googleapis.com/products/asm-001.jpg"
      },
      "variant": {
        "id": 101,
        "sku": "ASM-001-M-TRA",
        "size": "M",
        "color": "Trắng",
        "color_hex": "#FFFFFF",
        "price": 350000,
        "available_stock": 45,
        "status": "active",
        "image_url": "https://storage.googleapis.com/products/asm-001-white.jpg"
      },
      "subtotal": 700000,
      "is_available": true,
      "stock_message": null
    },
    {
      "id": 790,
      "cart_id": 123,
      "variant_id": 102,
      "quantity": 1,
      "product": {
        "id": 2,
        "name": "Áo Polo Premium",
        "slug": "ao-polo-premium",
        "thumbnail_url": "https://..."
      },
      "variant": {
        "id": 102,
        "sku": "POLO-002-L-BLK",
        "size": "L",
        "color": "Đen",
        "color_hex": "#000000",
        "price": 280000,
        "available_stock": 0,
        "status": "active",
        "image_url": "https://..."
      },
      "subtotal": 280000,
      "is_available": false,
      "stock_message": "Sản phẩm tạm hết hàng"
    }
  ],
  "summary": {
    "items_count": 3,
    "subtotal": 980000,
    "shipping_fee": 30000,
    "discount": 0,
    "total": 1010000
  },
  "unavailable_items": 1,
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-05T09:30:00Z"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Get or create cart for customer
3. Load all cart_items với JOIN:
   - products (basic info)
   - product_variants (size, color, price, stock)
4. For each item:
   - Calculate `subtotal = price * quantity`
   - Check `is_available = available_stock >= quantity`
   - Add stock_message if out of stock
5. Calculate summary:
   - `subtotal` = sum of all item subtotals
   - `shipping_fee` = 30000 (default)
   - `total` = subtotal + shipping_fee - discount
6. Return cart with items

### 📝 Implementation Notes
- Cart is automatically created on first item add
- `is_available` helps frontend show out-of-stock items differently
- `shipping_fee` is static 30,000 VND (can be dynamic based on location)
- Cart persists across sessions

---

## 2. POST `/cart/items`
**Thêm sản phẩm vào giỏ hàng**

### 📋 Overview
Thêm variant vào giỏ. Nếu variant đã tồn tại trong giỏ → cộng dồn số lượng.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Request Body
```json
{
  "variant_id": 101,
  "quantity": 2
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `variant_id` | number | ✅ | Valid variant ID | ID của variant (size + color) |
| `quantity` | number | ❌ | Min: 1, Default: 1 | Số lượng |

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Thêm vào giỏ hàng thành công",
  "cart_item": {
    "id": 789,
    "cart_id": 123,
    "variant_id": 101,
    "quantity": 2,
    "product_name": "Áo Sơ Mi Trắng Classic",
    "variant_name": "M - Trắng",
    "price": 350000,
    "subtotal": 700000
  }
}
```

#### Error Responses

**404 Not Found - Variant không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sản phẩm",
  "error": "Not Found"
}
```

**400 Bad Request - Không đủ hàng**
```json
{
  "statusCode": 400,
  "message": "Sản phẩm chỉ còn 5 trong kho. Vui lòng giảm số lượng.",
  "error": "Bad Request",
  "available_stock": 5
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Find variant by ID
3. **Check variant exists and active:**
   - If not found OR status != 'active' → 404
4. **Check stock availability:**
   - Calculate `available_stock = total_stock - reserved_stock`
   - If `available_stock < quantity` → 400 with available_stock
5. **Get or create cart** for customer
6. **Check if variant already in cart:**
   - **Exists:** Update quantity (add to existing)
     - `new_quantity = old_quantity + quantity`
     - Check if `new_quantity <= available_stock`
   - **Not exists:** Create new cart_item
7. Return created/updated cart_item

### 📝 Implementation Notes
- Automatically creates cart if not exists
- Quantities are additive (not replace)
- Stock check includes reserved_stock from pending orders

### 🧪 cURL Example
```bash
curl -X POST https://api.yourshop.com/cart/items \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": 101,
    "quantity": 2
  }'
```

### 💻 JavaScript Example
```javascript
const response = await fetch('https://api.yourshop.com/cart/items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    variant_id: 101,
    quantity: 2
  })
});

const data = await response.json();

if (response.ok) {
  alert('Đã thêm vào giỏ hàng!');
  // Refresh cart count
  updateCartBadge();
} else {
  alert(data.message);
}
```

---

## 3. PUT `/cart/items/:id`
**Cập nhật số lượng trong giỏ**

### 📋 Overview
Thay đổi số lượng của một cart item. Frontend dùng để increase/decrease quantity.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### URL Parameters
```
PUT /cart/items/789
```

#### Request Body
```json
{
  "quantity": 3
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `quantity` | number | ✅ | Min: 1 |

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Cập nhật số lượng thành công",
  "cart_item": {
    "id": 789,
    "variant_id": 101,
    "quantity": 3,
    "subtotal": 1050000
  }
}
```

#### Error Responses

**404 Not Found - Cart item không tồn tại hoặc không thuộc customer**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sản phẩm trong giỏ hàng",
  "error": "Not Found"
}
```

**400 Bad Request - Không đủ hàng**
```json
{
  "statusCode": 400,
  "message": "Sản phẩm chỉ còn 2 trong kho",
  "error": "Bad Request",
  "available_stock": 2
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Find cart_item by ID AND customer_id (security check)
3. If not found → 404
4. Load variant and check stock:
   - `available_stock >= new_quantity` → OK
   - Else → 400 with available_stock
5. Update quantity
6. Return updated cart_item

### 📝 Implementation Notes
- Setting `quantity = 0` does NOT delete item (use DELETE endpoint)
- Minimum quantity is 1
- Frontend should show stock availability before allowing increase

---

## 4. DELETE `/cart/items/:id`
**Xóa sản phẩm khỏi giỏ hàng**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request
```
DELETE /cart/items/789
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đã xóa sản phẩm khỏi giỏ hàng"
}
```

### 🔄 Logic Flow
1. Find cart_item by ID AND customer_id
2. If not found → 404
3. Delete cart_item
4. Return success

---

## 5. DELETE `/cart/clear`
**Xóa toàn bộ giỏ hàng**

### 📋 Overview
Xóa tất cả items trong giỏ hàng. Dùng sau khi checkout hoặc khi customer muốn bắt đầu lại.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đã xóa toàn bộ giỏ hàng",
  "deleted_count": 5
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Delete all cart_items WHERE cart.customer_id = customer_id
3. Return deleted_count

---

## 6. POST `/cart/apply-coupon`
**Áp dụng mã giảm giá**

### 📋 Overview
Kiểm tra và áp dụng coupon cho giỏ hàng. (Feature đang phát triển)

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body
```json
{
  "code": "SUMMER2024"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Áp dụng mã giảm giá thành công",
  "coupon": {
    "code": "SUMMER2024",
    "discount_type": "percentage",
    "discount_value": 20,
    "discount_amount": 196000
  },
  "cart_summary": {
    "subtotal": 980000,
    "discount": 196000,
    "shipping_fee": 30000,
    "total": 814000
  }
}
```

#### Error Responses

**400 Bad Request - Mã không hợp lệ**
```json
{
  "statusCode": 400,
  "message": "Mã giảm giá không hợp lệ hoặc đã hết hạn",
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. Find promotion by code
2. Check validity:
   - Status = 'active'
   - start_date <= NOW() AND end_date >= NOW()
   - usage_count < max_uses (if limited)
3. Check minimum order value (if applicable)
4. Calculate discount based on type:
   - `percentage`: `subtotal * (discount_value/100)`
   - `fixed`: `discount_value`
5. Update cart with coupon_id
6. Return discount and new total

---

## 7. POST `/cart/merge`
**Merge guest cart → customer cart**

### 📋 Overview
Sau khi login, gộp giỏ hàng guest (session) vào giỏ hàng customer.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body
```json
{
  "session_id": "guest-session-uuid-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | ✅ | Guest cart session ID (from localStorage) |

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Merge cart thành công",
  "merged_items": 3,
  "cart": {
    "items_count": 5,
    "total": 1350000
  }
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Find guest cart by session_id
3. Get customer cart (or create if not exists)
4. **For each guest cart item:**
   - Check if variant exists in customer cart:
     - **Exists:** Add quantities together
     - **Not exists:** Copy item to customer cart
   - Validate stock availability
5. Delete guest cart
6. Return merged cart summary

### 📝 Implementation Notes
- Frontend should call this immediately after login
- Guest session_id is stored in localStorage/cookies
- Stock validation ensures merged quantities don't exceed available stock

### 💻 Frontend Example
```javascript
// After successful login
const guestSessionId = localStorage.getItem('guest_cart_session');

if (guestSessionId) {
  await fetch('https://api.yourshop.com/cart/merge', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id: guestSessionId })
  });
  
  // Clear guest session
  localStorage.removeItem('guest_cart_session');
  
  // Refresh cart
  await loadCart();
}
```

---

# Checkout

## 8. POST `/api/v1/checkout`
**Tạo đơn hàng từ giỏ hàng**

### 📋 Overview
API quan trọng nhất trong shopping flow. Tạo order từ cart với TRANSACTION để đảm bảo data consistency.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Request Body
```json
{
  "customer_address_id": 5,
  "payment_method": "vnpay",
  "shipping_fee": 30000,
  "note": "Giao giờ hành chính"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `customer_address_id` | number | ✅ | Positive integer | ID địa chỉ giao hàng đã lưu |
| `payment_method` | string | ✅ | Enum: `cod`, `vnpay` | Phương thức thanh toán |
| `shipping_fee` | number | ❌ | Integer, Default: 30000 | Phí vận chuyển (VND) |
| `note` | string | ❌ | Max 500 chars | Ghi chú cho đơn hàng |

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Tạo đơn hàng thành công",
  "order": {
    "id": 789,
    "order_number": "ORD-20241205-789",
    "customer_id": 456,
    "customer_email": "user@example.com",
    "shipping_address": "123 Nguyễn Trãi, Phường 1, Quận 5",
    "shipping_phone": "0901234567",
    "shipping_city": "TP. Hồ Chí Minh",
    "payment_method": "vnpay",
    "payment_status": "unpaid",
    "fulfillment_status": "pending",
    "subtotal": 980000,
    "shipping_fee": 30000,
    "discount": 0,
    "total_amount": 1010000,
    "note": "Giao giờ hành chính",
    "created_at": "2024-12-05T10:00:00Z",
    "items": [
      {
        "id": 1001,
        "variant_id": 101,
        "product_name": "Áo Sơ Mi Trắng Classic",
        "variant_sku": "ASM-001-M-TRA",
        "size": "M",
        "color": "Trắng",
        "quantity": 2,
        "price_at_purchase": 350000,
        "subtotal": 700000
      },
      {
        "id": 1002,
        "variant_id": 102,
        "product_name": "Áo Polo Premium",
        "variant_sku": "POLO-002-L-BLK",
        "size": "L",
        "color": "Đen",
        "quantity": 1,
        "price_at_purchase": 280000,
        "subtotal": 280000
      }
    ]
  },
  "next_step": {
    "action": "payment",
    "message": "Vui lòng gọi API create-payment-url để lấy link thanh toán VNPAY",
    "endpoint": "POST /api/v1/checkout/create-payment-url"
  }
}
```

#### Error Responses

**400 Bad Request - Giỏ hàng trống**
```json
{
  "statusCode": 400,
  "message": "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.",
  "error": "Bad Request"
}
```

**400 Bad Request - Không đủ hàng**
```json
{
  "statusCode": 400,
  "message": "Một số sản phẩm không đủ hàng",
  "error": "Bad Request",
  "out_of_stock_items": [
    {
      "product_name": "Áo Polo Premium",
      "variant_sku": "POLO-002-L-BLK",
      "requested_quantity": 5,
      "available_stock": 2
    }
  ]
}
```

**404 Not Found - Địa chỉ không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy địa chỉ giao hàng",
  "error": "Not Found"
}
```

### 🔄 Logic Flow (DATABASE TRANSACTION)

```
BEGIN TRANSACTION

1. Get all cart_items for customer
2. Validate cart not empty → 400 if empty
3. Get customer_address by ID → 404 if not found
4. Validate address belongs to customer → 403 if not

5. FOR EACH cart_item:
   a. Load variant with product info
   b. Check variant status = 'active' → 400 if inactive
   c. Calculate available_stock = total_stock - reserved_stock
   d. Check available_stock >= quantity → 400 if insufficient
   e. Store price as price_at_purchase (snapshot)

6. Calculate totals:
   - subtotal = SUM(price_at_purchase * quantity)
   - total_amount = subtotal + shipping_fee - discount

7. Create ORDER record:
   - order_number = generate unique (ORD-YYYYMMDD-ID)
   - customer_id, customer_email
   - shipping info from address
   - payment_method
   - payment_status = 'unpaid' (or 'paid' if COD)
   - fulfillment_status = 'pending'
   - subtotal, shipping_fee, discount, total_amount

8. FOR EACH cart_item:
   - Create ORDER_ITEM with price_at_purchase
   - UPDATE variant: reserved_stock += quantity

9. Create ORDER_STATUS_HISTORY:
   - status = 'pending'
   - note = "Đơn hàng đã được tạo"

10. Delete all cart_items

11. IF payment_method = 'cod':
    - Set payment_status = 'paid'
    - Send order confirmation email

COMMIT TRANSACTION

12. Return order details
```

### 📝 Implementation Notes
- **Transaction:** All or nothing - nếu 1 step fail → rollback everything
- **Price Snapshot:** `price_at_purchase` stores price at order time (không thay đổi nếu giá sản phẩm sau này đổi)
- **Stock Reservation:** `reserved_stock` increases immediately to prevent overselling
- **Order Number Format:** `ORD-YYYYMMDD-{order_id}`
- **COD Payment:** Automatically marked as 'paid' (chỉ fulfill là xong)
- **VNPAY Payment:** Marked as 'unpaid', cần gọi create-payment-url

### ⚠️ Edge Cases
- If cart contains deleted/inactive products → Excluded from order
- If address deleted during checkout → 404 error
- If concurrent orders exhaust stock → First come first served (transaction lock)

---

## 9. POST `/api/v1/checkout/create-payment-url`
**Tạo link thanh toán VNPAY**

### 📋 Overview
Sau khi tạo order với payment_method='vnpay', gọi API này để lấy payment URL. Redirect customer đến VNPAY để thanh toán.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body
```json
{
  "order_id": 789
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | number | ✅ | ID đơn hàng vừa tạo |

### 📤 Response

#### Success (200 OK)
```json
{
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=101000000&vnp_Command=pay&vnp_CreateDate=20241205100000&vnp_CurrCode=VND&vnp_IpAddr=192.168.1.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20241205-789&vnp_OrderType=other&vnp_ReturnUrl=https://yourshop.com/payment/vnpay-return&vnp_TmnCode=YOUR_TMN_CODE&vnp_TxnRef=789&vnp_Version=2.1.0&vnp_SecureHash=abc123..."
}
```

#### Error Responses

**404 Not Found - Order không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng",
  "error": "Not Found"
}
```

**400 Bad Request - Order đã thanh toán**
```json
{
  "statusCode": 400,
  "message": "Đơn hàng đã được thanh toán",
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. Find order by ID AND customer_id (security check)
2. Validate order exists → 404 if not
3. Validate payment_status = 'unpaid' → 400 if already paid
4. **Build VNPAY parameters:**
   - `vnp_Amount`: total_amount * 100 (VNPAY yêu cầu đơn vị: VND cent)
   - `vnp_TxnRef`: order_id
   - `vnp_OrderInfo`: "Thanh toán đơn hàng ORD-..."
   - `vnp_ReturnUrl`: Frontend callback URL
   - `vnp_IpAddr`: Customer IP
   - `vnp_CreateDate`: YYYYMMDDHHmmss
5. **Sign parameters:**
   - Sort params alphabetically
   - Create query string
   - Hash with HMAC SHA512 using VNPAY secret
   - Add `vnp_SecureHash` to params
6. **Build payment URL:**
   - `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?{params}`
7. Return payment URL

### 📝 Implementation Notes
- **Amount:** Must multiply by 100 (1,010,000 VND → 101,000,000)
- **Sandbox URL:** `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- **Production URL:** `https://vnpayment.vn/paymentv2/vpcpay.html`
- **Return URL:** Where VNPAY redirects after payment
- Frontend should immediately redirect user to `paymentUrl`

### 💻 Frontend Example
```javascript
// After creating order with VNPAY
const orderResponse = await fetch('/api/v1/checkout', {
  method: 'POST',
  body: JSON.stringify({
    customer_address_id: 5,
    payment_method: 'vnpay',
    shipping_fee: 30000
  })
});

const { order } = await orderResponse.json();

// Get payment URL
const paymentResponse = await fetch('/api/v1/checkout/create-payment-url', {
  method: 'POST',
  body: JSON.stringify({ order_id: order.id })
});

const { paymentUrl } = await paymentResponse.json();

// Redirect to VNPAY
window.location.href = paymentUrl;
```

---

# Orders

## 10. GET `/orders`
**Lịch sử đơn hàng của customer**

### 📋 Overview
Danh sách tất cả đơn hàng của customer với filter theo trạng thái và phân trang.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | ❌ | Trang hiện tại (default: 1) |
| `limit` | number | ❌ | Số đơn/trang (default: 10) |
| `status` | string | ❌ | Filter: `pending`, `processing`, `shipped`, `delivered`, `cancelled` |

### 📤 Response

#### Success (200 OK)
```json
{
  "data": [
    {
      "id": 789,
      "order_number": "ORD-20241205-789",
      "total_amount": 1010000,
      "payment_method": "vnpay",
      "payment_status": "paid",
      "fulfillment_status": "shipped",
      "items_count": 2,
      "created_at": "2024-12-05T10:00:00Z",
      "updated_at": "2024-12-05T15:30:00Z"
    },
    {
      "id": 788,
      "order_number": "ORD-20241204-788",
      "total_amount": 650000,
      "payment_method": "cod",
      "payment_status": "paid",
      "fulfillment_status": "delivered",
      "items_count": 1,
      "created_at": "2024-12-04T09:00:00Z",
      "updated_at": "2024-12-05T14:00:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Query orders WHERE customer_id = ? AND status filter
3. Order by created_at DESC
4. Paginate results
5. Return orders with metadata

---

## 11. GET `/orders/:id`
**Chi tiết đơn hàng**

### 📋 Overview
Thông tin đầy đủ của đơn hàng bao gồm items, địa chỉ giao hàng, payment info.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request
```
GET /orders/789
```

### 📤 Response

#### Success (200 OK)
```json
{
  "id": 789,
  "order_number": "ORD-20241205-789",
  "customer_id": 456,
  "customer_email": "user@example.com",
  "customer_name": "Nguyễn Văn A",
  "customer_phone": "0901234567",
  "shipping_address": "123 Nguyễn Trãi, Phường 1, Quận 5",
  "shipping_phone": "0901234567",
  "shipping_city": "TP. Hồ Chí Minh",
  "shipping_district": "Quận 5",
  "shipping_ward": "Phường 1",
  "payment_method": "vnpay",
  "payment_status": "paid",
  "fulfillment_status": "shipped",
  "subtotal": 980000,
  "shipping_fee": 30000,
  "discount": 0,
  "total_amount": 1010000,
  "note": "Giao giờ hành chính",
  "created_at": "2024-12-05T10:00:00Z",
  "updated_at": "2024-12-05T15:30:00Z",
  "paid_at": "2024-12-05T10:05:00Z",
  "shipped_at": "2024-12-05T15:30:00Z",
  "items": [
    {
      "id": 1001,
      "order_id": 789,
      "variant_id": 101,
      "product_id": 1,
      "product_name": "Áo Sơ Mi Trắng Classic",
      "product_slug": "ao-so-mi-trang-classic",
      "variant_sku": "ASM-001-M-TRA",
      "size": "M",
      "color": "Trắng",
      "thumbnail_url": "https://storage.googleapis.com/products/asm-001.jpg",
      "quantity": 2,
      "price_at_purchase": 350000,
      "subtotal": 700000
    },
    {
      "id": 1002,
      "order_id": 789,
      "variant_id": 102,
      "product_id": 2,
      "product_name": "Áo Polo Premium",
      "product_slug": "ao-polo-premium",
      "variant_sku": "POLO-002-L-BLK",
      "size": "L",
      "color": "Đen",
      "thumbnail_url": "https://...",
      "quantity": 1,
      "price_at_purchase": 280000,
      "subtotal": 280000
    }
  ],
  "payment_transaction": {
    "id": 501,
    "transaction_id": "VNPAY-20241205-12345",
    "amount": 1010000,
    "status": "success",
    "paid_at": "2024-12-05T10:05:00Z"
  },
  "can_cancel": false,
  "can_review": true
}
```

#### Error Responses

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Find order by ID AND customer_id (security)
3. If not found → 404
4. Load order_items with product/variant info
5. Load payment transaction (if exists)
6. Calculate flags:
   - `can_cancel`: true if status = 'pending'
   - `can_review`: true if status = 'delivered'
7. Return complete order data

---

## 12. GET `/orders/:id/status-history`
**Timeline trạng thái đơn hàng**

### 📋 Overview
Lịch sử các trạng thái của đơn hàng theo thời gian.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "order_id": 789,
  "order_number": "ORD-20241205-789",
  "current_status": "shipped",
  "history": [
    {
      "id": 1,
      "status": "pending",
      "note": "Đơn hàng đã được tạo",
      "admin_id": null,
      "admin_name": null,
      "created_at": "2024-12-05T10:00:00Z"
    },
    {
      "id": 2,
      "status": "confirmed",
      "note": "Đơn hàng đã được xác nhận",
      "admin_id": 1,
      "admin_name": "Admin User",
      "created_at": "2024-12-05T11:00:00Z"
    },
    {
      "id": 3,
      "status": "processing",
      "note": "Đang chuẩn bị hàng",
      "admin_id": 1,
      "admin_name": "Admin User",
      "created_at": "2024-12-05T14:00:00Z"
    },
    {
      "id": 4,
      "status": "shipped",
      "note": "Đơn hàng đã được giao cho đơn vị vận chuyển. Mã vận đơn: GHTK-123456",
      "admin_id": 1,
      "admin_name": "Admin User",
      "created_at": "2024-12-05T15:30:00Z"
    }
  ]
}
```

---

## 13. POST `/orders/:id/cancel`
**Hủy đơn hàng**

### 📋 Overview
Customer hủy đơn hàng khi đơn đang ở trạng thái `pending`. Kho sẽ được hoàn lại.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Request Body (Optional)
```json
{
  "reason": "Đặt nhầm sản phẩm"
}
```

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Hủy đơn hàng thành công. Kho đã được hoàn lại.",
  "order": {
    "id": 789,
    "order_number": "ORD-20241205-789",
    "fulfillment_status": "cancelled",
    "cancelled_at": "2024-12-05T16:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request - Không thể hủy**
```json
{
  "statusCode": 400,
  "message": "Không thể hủy đơn hàng ở trạng thái hiện tại. Vui lòng liên hệ hỗ trợ.",
  "error": "Bad Request",
  "current_status": "shipped"
}
```

### 🔄 Logic Flow
1. Find order by ID AND customer_id
2. Check status = 'pending' → 400 if not
3. **Update order:**
   - `fulfillment_status = 'cancelled'`
   - `cancelled_at = NOW()`
4. **Restore inventory:**
   - FOR EACH order_item:
     - `variant.reserved_stock -= quantity`
5. **Create status history:**
   - status = 'cancelled'
   - note = reason or "Khách hàng hủy đơn"
6. Send cancellation email
7. Return success

### 📝 Implementation Notes
- Only `pending` orders can be cancelled by customer
- Orders in `confirmed`, `processing`, `shipped` statuses require admin action
- Inventory is restored immediately (`reserved_stock` decreased)

---

## 14. GET `/orders/track`
**Tracking đơn hàng (Public - No auth)**

### 📋 Overview
API public để tracking đơn hàng bằng order_id hoặc phone+email. Dùng cho chatbot.

### 🔓 Authentication
**Public** - No authentication required

### 📥 Request

#### Query Parameters (Option 1: By Order ID)
```
GET /orders/track?order_id=789
```

#### Query Parameters (Option 2: By Phone + Email)
```
GET /orders/track?phone=0901234567&email=user@example.com
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order_id` | number | ❌ | Order ID |
| `phone` | string | ❌ | Số điện thoại đặt hàng |
| `email` | string | ❌ | Email đặt hàng |

**Note:** Phải cung cấp `order_id` HOẶC cả `phone` và `email`

### 📤 Response

#### Success (200 OK)
```json
{
  "order": {
    "id": 789,
    "order_number": "ORD-20241205-789",
    "total_amount": 1010000,
    "payment_status": "paid",
    "fulfillment_status": "shipped",
    "created_at": "2024-12-05T10:00:00Z",
    "items_count": 2
  },
  "status_timeline": [
    {
      "status": "pending",
      "timestamp": "2024-12-05T10:00:00Z",
      "completed": true
    },
    {
      "status": "confirmed",
      "timestamp": "2024-12-05T11:00:00Z",
      "completed": true
    },
    {
      "status": "processing",
      "timestamp": "2024-12-05T14:00:00Z",
      "completed": true
    },
    {
      "status": "shipped",
      "timestamp": "2024-12-05T15:30:00Z",
      "completed": true
    },
    {
      "status": "delivered",
      "timestamp": null,
      "completed": false
    }
  ],
  "tracking_message": "Đơn hàng đã được giao cho đơn vị vận chuyển và đang trên đường đến bạn."
}
```

#### Error Responses

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng với thông tin này",
  "error": "Not Found"
}
```

---

# Payment Callbacks

## 15. GET `/api/v1/payment/vnpay-return`
**VNPAY Return URL (Callback)**

### 📋 Overview
VNPAY redirect customer về URL này sau khi thanh toán. Backend verify signature và update order status.

### 🔓 Authentication
**Public** - No authentication (VNPAY callback)

### 📥 Request

#### Query Parameters (từ VNPAY)
```
GET /api/v1/payment/vnpay-return?vnp_Amount=101000000&vnp_BankCode=NCB&vnp_BankTranNo=VNP123&vnp_CardType=ATM&vnp_OrderInfo=Thanh+toan+don+hang+789&vnp_PayDate=20241205100500&vnp_ResponseCode=00&vnp_TmnCode=YOUR_TMN&vnp_TransactionNo=14234567&vnp_TxnRef=789&vnp_SecureHash=abc123...
```

**Key Parameters:**
- `vnp_TxnRef`: Order ID
- `vnp_Amount`: Amount (VND cent)
- `vnp_ResponseCode`: Result code (`00` = success)
- `vnp_SecureHash`: Signature từ VNPAY
- `vnp_TransactionNo`: VNPAY transaction ID

### 📤 Response

#### Success - Redirect to Frontend
```
302 Redirect to: https://yourshop.com/payment/success?order_id=789&amount=1010000
```

#### Failed - Redirect to Frontend
```
302 Redirect to: https://yourshop.com/payment/failed?order_id=789&message=Giao+dịch+thất+bại
```

### 🔄 Logic Flow
1. **Verify VNPAY signature:**
   - Remove `vnp_SecureHash` from params
   - Sort remaining params
   - Hash with HMAC SHA512
   - Compare with received `vnp_SecureHash` → 400 if mismatch
2. **Find order by vnp_TxnRef:**
   - If not found → 404
3. **Check response code:**
   - `00` = Success
   - Other codes = Failed
4. **If Success:**
   - Update order: `payment_status = 'paid'`, `paid_at = NOW()`
   - Create payment_transaction record
   - Send order confirmation email
   - Redirect to success page
5. **If Failed:**
   - Update order: `payment_status = 'failed'`
   - Restore inventory (decrease reserved_stock)
   - Delete order (or mark as failed)
   - Redirect to failed page

### 📝 VNPAY Response Codes
- `00`: Thành công
- `07`: Trừ tiền thành công, giao dịch nghi ngờ
- `09`: Thẻ chưa đăng ký Internet Banking
- `10`: Xác thực thông tin thẻ sai quá số lần
- `11`: Hết hạn chờ thanh toán
- `12`: Thẻ bị khóa
- `24`: Customer hủy giao dịch
- Other: Lỗi khác

---

## 🎯 Summary

### Shopping Flow
```
1. Browse Products
2. Add to Cart (POST /cart/items)
3. View Cart (GET /cart)
4. Checkout (POST /api/v1/checkout)
   ├─ COD: Order complete → Email sent
   └─ VNPAY: Get payment URL → Redirect to VNPAY
5. Payment (VNPAY)
6. Return to website (VNPAY callback)
7. View Order (GET /orders/:id)
```

### Order States
```
pending → confirmed → processing → shipped → delivered
   └─────→ cancelled (any time before shipped)
```

### Payment States
```
unpaid → paid
   └─→ failed (VNPAY failure)
```

---

## 🔍 Key Concepts

### Stock Management
```
Product Variant:
├── total_stock: 100 (vật lý trong kho)
├── reserved_stock: 15 (đã order chưa ship)
└── available_stock: 85 (có thể bán = total - reserved)

When order created:
  reserved_stock += quantity

When order shipped:
  total_stock -= quantity
  reserved_stock -= quantity

When order cancelled:
  reserved_stock -= quantity
```

### Price Snapshot
- `price_at_purchase` trong order_items lưu giá tại thời điểm mua
- Không thay đổi nếu giá sản phẩm thay đổi sau này
- Đảm bảo revenue tracking chính xác

### Transaction Safety
- Checkout API uses database transaction
- All-or-nothing: Nếu 1 step fail → rollback everything
- Prevents inventory inconsistency

---

## 🔒 Security Notes

1. **Order Ownership:** Always check `customer_id` matches JWT
2. **Payment Verification:** Must verify VNPAY signature
3. **Stock Race Condition:** Handled by transaction locks
4. **Price Manipulation:** Use server-side prices, not client input

---

**✅ Shopping Module Complete!**

**Next Module:** [Customer Features →](./API_04_CUSTOMER.md)

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
