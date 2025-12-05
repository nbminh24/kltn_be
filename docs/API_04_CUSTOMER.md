# 👤 Module 4: Customer Features

> **Account, Profile, Addresses, Wishlist & Reviews APIs**  
> **Total Endpoints:** 20  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Account Management
1. [GET /account/profile](#1-get-accountprofile) - Xem profile
2. [PUT /account/profile](#2-put-accountprofile) - Cập nhật profile
3. [POST /account/change-password](#3-post-accountchange-password) - Đổi mật khẩu

### Address Management
4. [GET /account/addresses](#4-get-accountaddresses) - Danh sách địa chỉ
5. [POST /account/addresses](#5-post-accountaddresses) - Thêm địa chỉ
6. [PUT /account/addresses/:id](#6-put-accountaddressesid) - Cập nhật địa chỉ
7. [DELETE /account/addresses/:id](#7-delete-accountaddressesid) - Xóa địa chỉ
8. [POST /account/addresses/:id/set-default](#8-post-accountaddressesidset-default) - Đặt địa chỉ mặc định

### Wishlist
9. [GET /wishlist](#9-get-wishlist) - Xem wishlist
10. [POST /wishlist](#10-post-wishlist) - Thêm vào wishlist
11. [DELETE /wishlist/:variantId](#11-delete-wishlistvariantid) - Xóa khỏi wishlist
12. [DELETE /wishlist/clear](#12-delete-wishlistclear) - Xóa toàn bộ wishlist

### Reviews
13. [POST /reviews](#13-post-reviews) - Tạo review
14. [GET /reviews/my-reviews](#14-get-reviewsmy-reviews) - Reviews của tôi
15. [PUT /reviews/:id](#15-put-reviewsid) - Cập nhật review
16. [DELETE /reviews/:id](#16-delete-reviewsid) - Xóa review

### Admin - Reviews Management
17. [GET /admin/reviews](#17-get-adminreviews) - Danh sách reviews (Admin)
18. [PUT /admin/reviews/:id/approve](#18-put-adminreviewsidapprove) - Duyệt review
19. [PUT /admin/reviews/:id/reject](#19-put-adminreviewsidreject) - Từ chối review
20. [DELETE /admin/reviews/:id](#20-delete-adminreviewsid) - Xóa review

---

# Account Management

## 1. GET `/account/profile`
**Xem thông tin profile**

### 📋 Overview
Lấy thông tin đầy đủ của customer đang đăng nhập.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

#### Success (200 OK)
```json
{
  "id": 456,
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "phone": "0901234567",
  "status": "active",
  "email_verified": true,
  "google_id": null,
  "created_at": "2024-11-01T10:00:00Z",
  "updated_at": "2024-12-05T09:00:00Z",
  "last_login_at": "2024-12-05T09:00:00Z",
  "orders_count": 15,
  "total_spent": 12500000,
  "wishlist_count": 8,
  "default_address": {
    "id": 5,
    "full_address": "123 Nguyễn Trãi, Phường 1, Quận 5, TP. Hồ Chí Minh",
    "phone": "0901234567"
  }
}
```

---

## 2. PUT `/account/profile`
**Cập nhật thông tin profile**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "name": "Nguyễn Văn B",
  "phone": "0912345678"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `name` | string | ❌ | Min 2 chars | Tên hiển thị |
| `phone` | string | ❌ | 10 digits | Số điện thoại |

**Note:** Email KHÔNG thể thay đổi (immutable)

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Cập nhật profile thành công",
  "customer": {
    "id": 456,
    "email": "user@example.com",
    "name": "Nguyễn Văn B",
    "phone": "0912345678",
    "updated_at": "2024-12-05T10:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request - Phone đã được sử dụng**
```json
{
  "statusCode": 400,
  "message": "Số điện thoại đã được sử dụng bởi tài khoản khác",
  "error": "Bad Request"
}
```

---

## 3. POST `/account/change-password`
**Đổi mật khẩu**

### 📋 Overview
Customer đổi mật khẩu. Phải cung cấp mật khẩu cũ để verify.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "current_password": "OldPassword123",
  "new_password": "NewSecurePassword456"
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `current_password` | string | ✅ | - | Mật khẩu hiện tại |
| `new_password` | string | ✅ | Min 6 chars | Mật khẩu mới |

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."
}
```

#### Error Responses

**401 Unauthorized - Sai mật khẩu hiện tại**
```json
{
  "statusCode": 401,
  "message": "Mật khẩu hiện tại không chính xác",
  "error": "Unauthorized"
}
```

**400 Bad Request - Google account**
```json
{
  "statusCode": 400,
  "message": "Tài khoản Google không có mật khẩu. Vui lòng đặt mật khẩu trước.",
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Find customer
3. **Check if Google account:**
   - If `google_id` exists AND `password_hash` is null → 400
4. Verify current_password with bcrypt
5. If incorrect → 401
6. Hash new_password
7. Update password_hash
8. **Invalidate all refresh tokens** (force re-login on all devices)
9. Return success

### 📝 Implementation Notes
- Google users phải set password trước khi có thể đổi
- Sau khi đổi password, tất cả devices phải login lại

---

# Address Management

## 4. GET `/account/addresses`
**Danh sách địa chỉ**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

#### Success (200 OK)
```json
{
  "addresses": [
    {
      "id": 5,
      "customer_id": 456,
      "recipient_name": "Nguyễn Văn A",
      "phone": "0901234567",
      "address": "123 Nguyễn Trãi",
      "ward": "Phường 1",
      "district": "Quận 5",
      "city": "TP. Hồ Chí Minh",
      "full_address": "123 Nguyễn Trãi, Phường 1, Quận 5, TP. Hồ Chí Minh",
      "is_default": true,
      "created_at": "2024-11-01T10:00:00Z"
    },
    {
      "id": 6,
      "customer_id": 456,
      "recipient_name": "Nguyễn Văn A (Văn phòng)",
      "phone": "0901234567",
      "address": "456 Điện Biên Phủ",
      "ward": "Phường 25",
      "district": "Quận Bình Thạnh",
      "city": "TP. Hồ Chí Minh",
      "full_address": "456 Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh",
      "is_default": false,
      "created_at": "2024-11-15T14:00:00Z"
    }
  ]
}
```

---

## 5. POST `/account/addresses`
**Thêm địa chỉ mới**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "recipient_name": "Nguyễn Văn A",
  "phone": "0901234567",
  "address": "123 Nguyễn Trãi",
  "ward": "Phường 1",
  "district": "Quận 5",
  "city": "TP. Hồ Chí Minh",
  "is_default": false
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `recipient_name` | string | ✅ | Min 2 chars | Tên người nhận |
| `phone` | string | ✅ | 10 digits | Số điện thoại nhận hàng |
| `address` | string | ✅ | Min 5 chars | Số nhà, tên đường |
| `ward` | string | ✅ | - | Phường/Xã |
| `district` | string | ✅ | - | Quận/Huyện |
| `city` | string | ✅ | - | Tỉnh/Thành phố |
| `is_default` | boolean | ❌ | Default: false | Đặt làm địa chỉ mặc định |

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Thêm địa chỉ thành công",
  "address": {
    "id": 7,
    "recipient_name": "Nguyễn Văn A",
    "phone": "0901234567",
    "address": "123 Nguyễn Trãi",
    "ward": "Phường 1",
    "district": "Quận 5",
    "city": "TP. Hồ Chí Minh",
    "full_address": "123 Nguyễn Trãi, Phường 1, Quận 5, TP. Hồ Chí Minh",
    "is_default": false
  }
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Validate input
3. **If is_default = true:**
   - Set all other addresses of customer to `is_default = false`
4. **If this is first address:**
   - Automatically set `is_default = true`
5. Create address
6. Build `full_address` from components
7. Return created address

---

## 6. PUT `/account/addresses/:id`
**Cập nhật địa chỉ**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

Same fields as POST, all optional (partial update)

### 📤 Response

```json
{
  "message": "Cập nhật địa chỉ thành công",
  "address": {
    "id": 5,
    "recipient_name": "Nguyễn Văn A (Updated)",
    "updated_at": "2024-12-05T10:30:00Z"
  }
}
```

### 🔄 Logic Flow
1. Find address by ID AND customer_id (security check)
2. If not found → 404
3. Update provided fields
4. If `is_default = true` → Set others to false
5. Rebuild `full_address`
6. Return updated address

---

## 7. DELETE `/account/addresses/:id`
**Xóa địa chỉ**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

#### Success (200 OK)
```json
{
  "message": "Xóa địa chỉ thành công"
}
```

#### Error Responses

**400 Bad Request - Cannot delete default address**
```json
{
  "statusCode": 400,
  "message": "Không thể xóa địa chỉ mặc định. Vui lòng đặt địa chỉ khác làm mặc định trước.",
  "error": "Bad Request"
}
```

### 🔄 Logic Flow
1. Find address by ID AND customer_id
2. Check if `is_default = true` → 400 if yes
3. Delete address
4. Return success

---

## 8. POST `/account/addresses/:id/set-default`
**Đặt địa chỉ mặc định**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "message": "Đã đặt địa chỉ mặc định",
  "address": {
    "id": 6,
    "is_default": true
  }
}
```

### 🔄 Logic Flow
1. Find address by ID AND customer_id
2. Set all customer's addresses to `is_default = false`
3. Set this address to `is_default = true`
4. Return success

---

# Wishlist

## 9. GET `/wishlist`
**Xem danh sách yêu thích**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

#### Success (200 OK)
```json
{
  "wishlist": [
    {
      "id": 101,
      "customer_id": 456,
      "variant_id": 501,
      "product": {
        "id": 1,
        "name": "Áo Sơ Mi Trắng Classic",
        "slug": "ao-so-mi-trang-classic",
        "thumbnail_url": "https://...",
        "selling_price": 350000,
        "average_rating": 4.5
      },
      "variant": {
        "id": 501,
        "sku": "ASM-001-M-TRA",
        "size": "M",
        "color": "Trắng",
        "available_stock": 45,
        "in_stock": true
      },
      "added_at": "2024-11-20T10:00:00Z"
    }
  ],
  "total_items": 8
}
```

### 📝 Implementation Notes
- Sorted by `added_at DESC` (newest first)
- Includes stock availability for each item
- Out-of-stock items still shown but marked as `in_stock: false`

---

## 10. POST `/wishlist`
**Thêm vào wishlist**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "variant_id": 501
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variant_id` | number | ✅ | ID variant cần thêm |

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Đã thêm vào danh sách yêu thích",
  "wishlist_item": {
    "id": 101,
    "variant_id": 501,
    "product_name": "Áo Sơ Mi Trắng Classic",
    "added_at": "2024-12-05T10:00:00Z"
  }
}
```

#### Error Responses

**409 Conflict - Already in wishlist**
```json
{
  "statusCode": 409,
  "message": "Sản phẩm đã có trong danh sách yêu thích",
  "error": "Conflict"
}
```

**404 Not Found - Variant không tồn tại**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sản phẩm",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. Check variant exists
3. Check if already in wishlist → 409 if yes
4. Create wishlist_item
5. Return created item

---

## 11. DELETE `/wishlist/:variantId`
**Xóa khỏi wishlist**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request
```
DELETE /wishlist/501
```

### 📤 Response

```json
{
  "message": "Đã xóa khỏi danh sách yêu thích"
}
```

---

## 12. DELETE `/wishlist/clear`
**Xóa toàn bộ wishlist**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "message": "Đã xóa toàn bộ danh sách yêu thích",
  "deleted_count": 8
}
```

---

# Reviews

## 13. POST `/reviews`
**Tạo review sản phẩm**

### 📋 Overview
Customer viết review cho sản phẩm đã mua. Chỉ customer đã mua và nhận hàng mới có thể review.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "product_id": 1,
  "rating": 5,
  "comment": "Sản phẩm rất tốt! Chất lượng cao, giao hàng nhanh."
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `product_id` | number | ✅ | Valid product ID | ID sản phẩm |
| `rating` | number | ✅ | Min: 1, Max: 5 | Đánh giá (1-5 sao) |
| `comment` | string | ❌ | Max 1000 chars | Nội dung review |

### 📤 Response

#### Success (201 Created)
```json
{
  "message": "Review của bạn đã được gửi và đang chờ duyệt",
  "review": {
    "id": 1001,
    "product_id": 1,
    "customer_id": 456,
    "rating": 5,
    "comment": "Sản phẩm rất tốt! Chất lượng cao, giao hàng nhanh.",
    "status": "pending",
    "created_at": "2024-12-05T10:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request - Chưa mua sản phẩm**
```json
{
  "statusCode": 400,
  "message": "Bạn cần mua và nhận sản phẩm trước khi có thể đánh giá",
  "error": "Bad Request"
}
```

**409 Conflict - Đã review rồi**
```json
{
  "statusCode": 409,
  "message": "Bạn đã đánh giá sản phẩm này rồi",
  "error": "Conflict"
}
```

### 🔄 Logic Flow
1. Extract customer_id from JWT
2. **Check if customer bought this product:**
   - Query orders: `customer_id = ? AND product_id IN order_items`
   - At least 1 order with `fulfillment_status = 'delivered'`
   - If not → 400
3. **Check if already reviewed:**
   - Query reviews: `customer_id = ? AND product_id = ?`
   - If exists → 409
4. Create review with `status = 'pending'` (cần admin duyệt)
5. Return created review

### 📝 Implementation Notes
- Review status: `pending` → `approved` or `rejected`
- Only `approved` reviews hiển thị public
- Customer chỉ review được 1 lần cho mỗi sản phẩm
- Must have purchased and received product

---

## 14. GET `/reviews/my-reviews`
**Reviews của tôi**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Query Parameters
- `page`, `limit` (pagination)
- `status`: `pending`, `approved`, `rejected`

### 📤 Response

```json
{
  "data": [
    {
      "id": 1001,
      "product_id": 1,
      "product_name": "Áo Sơ Mi Trắng Classic",
      "product_slug": "ao-so-mi-trang-classic",
      "product_thumbnail": "https://...",
      "rating": 5,
      "comment": "Sản phẩm rất tốt!",
      "status": "approved",
      "created_at": "2024-12-05T10:00:00Z",
      "reviewed_at": "2024-12-05T11:00:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

## 15. PUT `/reviews/:id`
**Cập nhật review**

### 📋 Overview
Customer có thể sửa review khi status = 'pending' hoặc 'approved'.

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "rating": 4,
  "comment": "Sản phẩm tốt nhưng giao hàng hơi chậm."
}
```

### 📤 Response

```json
{
  "message": "Cập nhật review thành công",
  "review": {
    "id": 1001,
    "rating": 4,
    "comment": "Sản phẩm tốt nhưng giao hàng hơi chậm.",
    "updated_at": "2024-12-05T15:00:00Z"
  }
}
```

#### Error Responses

**404 Not Found - Review không tồn tại hoặc không thuộc customer**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy review",
  "error": "Not Found"
}
```

### 🔄 Logic Flow
1. Find review by ID AND customer_id (security)
2. Update rating and/or comment
3. If status = 'approved' → Set back to 'pending' (cần duyệt lại)
4. Return updated review

---

## 16. DELETE `/reviews/:id`
**Xóa review**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "message": "Xóa review thành công"
}
```

### 🔄 Logic Flow
1. Find review by ID AND customer_id
2. Delete review
3. **Update product statistics:**
   - Recalculate `average_rating`
   - Decrease `total_reviews`
4. Return success

---

# Admin - Reviews Management

## 17. GET `/admin/reviews`
**Danh sách tất cả reviews (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Query Parameters
- `page`, `limit`
- `status`: `pending`, `approved`, `rejected`
- `product_id`: Filter theo sản phẩm

### 📤 Response

```json
{
  "data": [
    {
      "id": 1001,
      "product_id": 1,
      "product_name": "Áo Sơ Mi Trắng Classic",
      "customer_id": 456,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "rating": 5,
      "comment": "Sản phẩm rất tốt!",
      "status": "pending",
      "created_at": "2024-12-05T10:00:00Z"
    }
  ],
  "metadata": {...}
}
```

---

## 18. PUT `/admin/reviews/:id/approve`
**Duyệt review**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Duyệt review thành công",
  "review": {
    "id": 1001,
    "status": "approved",
    "reviewed_at": "2024-12-05T11:00:00Z"
  }
}
```

### 🔄 Logic Flow
1. Find review by ID
2. Update `status = 'approved'`, `reviewed_at = NOW()`
3. **Update product statistics:**
   - Recalculate `average_rating`
   - Increase `total_reviews`
4. Send email notification to customer
5. Return success

---

## 19. PUT `/admin/reviews/:id/reject`
**Từ chối review**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body (Optional)

```json
{
  "reason": "Nội dung không phù hợp"
}
```

### 📤 Response

```json
{
  "message": "Đã từ chối review",
  "review": {
    "id": 1001,
    "status": "rejected",
    "rejection_reason": "Nội dung không phù hợp"
  }
}
```

---

## 20. DELETE `/admin/reviews/:id`
**Xóa review (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "message": "Xóa review thành công"
}
```

### 🔄 Logic Flow
1. Find review
2. Delete review
3. Update product statistics
4. Return success

---

## 🎯 Summary

### Customer Features Overview

| Feature | Endpoints | Auth Required |
|---------|-----------|---------------|
| **Account** | 3 | Customer |
| **Addresses** | 5 | Customer |
| **Wishlist** | 4 | Customer |
| **Reviews** | 4 | Customer |
| **Admin Reviews** | 4 | Admin |
| **Total** | **20** | - |

---

## 🔍 Key Concepts

### Profile Management
- Email is immutable (cannot be changed)
- Phone must be unique across accounts
- Google accounts can set password later

### Address System
- Multiple addresses per customer
- One default address for checkout
- Cannot delete default address (must set another as default first)
- Full address auto-generated from components

### Wishlist Features
- Stores variants (not products)
- Shows stock availability
- Persists across sessions
- Can add out-of-stock items (for notifications)

### Review System
```
Flow:
Customer buys product
  ↓
Order delivered
  ↓
Customer writes review (status: pending)
  ↓
Admin approves/rejects
  ↓
If approved: Shows publicly + updates product rating
If rejected: Hidden, customer can edit and resubmit
```

### Review Rules
- **One review per product per customer**
- Must have purchased and received product
- Pending reviews need admin approval
- Editing approved review → back to pending
- Deleting review updates product statistics

---

## 🔒 Security Notes

1. **Profile Updates:** Check uniqueness for phone
2. **Address Management:** Always verify customer_id matches
3. **Wishlist:** Prevent duplicate items
4. **Reviews:** Verify purchase before allowing review
5. **Admin Actions:** Only admins can approve/reject reviews

---

**✅ Customer Features Module Complete!**

**Next Module:** [Support & AI →](./API_05_SUPPORT_AI.md)

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
