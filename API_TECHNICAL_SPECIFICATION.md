# 📋 API Technical Specification - LeCas E-commerce Backend

**Version:** 2.0  
**Last Updated:** December 2, 2024  
**Database:** PostgreSQL 14+ with JSONB support  
**Framework:** NestJS + TypeORM

---

## 📑 Table of Contents

1. [Module Chatbot & Consultant](#1-module-chatbot--consultant)
2. [Module Payment (VNPAY)](#2-module-payment-vnpay)
3. [Module Product & Search](#3-module-product--search)
4. [Module Order & Promotion](#4-module-order--promotion)
5. [Module Admin Management](#5-module-admin-management)
6. [Common Error Codes](#6-common-error-codes)

---

# 1. Module Chatbot & Consultant

## 1.1. POST /api/v1/chat/session

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/chat/session`
- **Auth Required:** No (Public)
- **Purpose:** Tạo hoặc lấy chat session cho visitor hoặc customer

### Description
API này dùng để khởi tạo phiên chat. Nếu là khách vãng lai (chưa login), sử dụng `visitor_id` (UUID từ Frontend). Nếu đã login, sử dụng `customer_id`. Hệ thống sẽ tìm session cũ hoặc tạo mới.

### Request

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token> (Optional - nếu customer đã login)
```

**Body Payload:**
```json
{
  "visitor_id": "uuid-v4-string",  // Bắt buộc nếu chưa login
  "customer_id": 123               // Optional - lấy từ JWT nếu đã login
}
```

**Validation Rules:**
- Phải có ít nhất 1 trong 2: `visitor_id` HOẶC `customer_id`
- `visitor_id`: String UUID format
- `customer_id`: Integer > 0

### Backend Logic (Step-by-step)

**Step 1: Parse Request**
```typescript
const { visitor_id } = body;
const customer_id = user?.customerId || null; // Từ JWT nếu có
```

**Step 2: Build Query Condition**
```sql
-- Nếu có customer_id (đã login):
SELECT * FROM chat_sessions 
WHERE customer_id = $1 
ORDER BY updated_at DESC 
LIMIT 1;

-- Nếu chưa login (visitor):
SELECT * FROM chat_sessions 
WHERE visitor_id = $1 
ORDER BY updated_at DESC 
LIMIT 1;
```

**Step 3: Create Session if not exists**
```sql
INSERT INTO chat_sessions (customer_id, visitor_id, created_at, updated_at)
VALUES ($1, $2, NOW(), NOW())
RETURNING *;
```

**Step 4: Return Session Data**

### Response

**Success (200 OK):**
```json
{
  "session": {
    "id": 123,
    "customer_id": 456,      // null nếu visitor
    "visitor_id": "uuid...", // null nếu customer
    "created_at": "2024-12-01T10:00:00Z",
    "updated_at": "2024-12-01T10:05:00Z"
  },
  "is_new": false
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Phải cung cấp visitor_id hoặc customer_id",
  "error": "Bad Request"
}
```

---

## 1.2. GET /api/v1/chat/history

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/chat/history`
- **Auth Required:** No (Public)

### Description
Lấy lịch sử chat messages của một session với phân trang.

### Request

**Headers:**
```
Content-Type: application/json
```

**Query Params:**
```
?session_id=123&limit=50&offset=0
```

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| session_id | integer | Yes | - | ID của chat session |
| limit | integer | No | 50 | Số tin nhắn mỗi page |
| offset | integer | No | 0 | Vị trí bắt đầu |

### Backend Logic

**Step 1: Validate Params**
```typescript
if (!session_id || session_id <= 0) {
  throw new BadRequestException('session_id không hợp lệ');
}
```

**Step 2: Check Session Exists**
```sql
SELECT id FROM chat_sessions WHERE id = $1;
```
→ Nếu không tồn tại → 404 Not Found

**Step 3: Fetch Messages**
```sql
SELECT 
  id, 
  session_id, 
  sender,        -- 'customer' | 'bot' | 'admin'
  message, 
  is_read, 
  created_at
FROM chat_messages
WHERE session_id = $1
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;
```

**Step 4: Count Total Messages**
```sql
SELECT COUNT(*) as total 
FROM chat_messages 
WHERE session_id = $1;
```

### Response

**Success (200 OK):**
```json
{
  "messages": [
    {
      "id": 1,
      "session_id": 123,
      "sender": "customer",
      "message": "Xin chào",
      "is_read": true,
      "created_at": "2024-12-01T10:00:00Z"
    },
    {
      "id": 2,
      "session_id": 123,
      "sender": "bot",
      "message": "Chào bạn! Em có thể giúp gì?",
      "is_read": false,
      "created_at": "2024-12-01T10:00:05Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Error (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy chat session",
  "error": "Not Found"
}
```

---

## 1.3. POST /api/v1/chat/send

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/chat/send`
- **Auth Required:** No (Public)

### Description
Gửi tin nhắn từ customer → Lưu DB → Gọi Rasa Server → Nhận response → Lưu bot message → Trả về.

### Request

**Body Payload:**
```json
{
  "session_id": 123,
  "message": "Tôi muốn mua áo sơ mi size L"
}
```

**Validation:**
- `session_id`: Required, integer > 0
- `message`: Required, string, min 1 char, max 2000 chars

### Backend Logic

**Step 1: Validate Session**
```sql
SELECT * FROM chat_sessions WHERE id = $1;
```

**Step 2: Save Customer Message**
```sql
INSERT INTO chat_messages (session_id, sender, message, is_read, created_at)
VALUES ($1, 'customer', $2, false, NOW())
RETURNING *;
```

**Step 3: Call Rasa Server**
```typescript
const rasaUrl = process.env.RASA_SERVER_URL; // http://localhost:5005
const response = await axios.post(`${rasaUrl}/webhooks/rest/webhook`, {
  sender: `session_${session_id}`,
  message: message,
});

// Response từ Rasa:
// [{ "text": "Dạ vâng, shop có áo sơ mi..." }]
```

**Step 4: Save Bot Response(s)**
```sql
-- Rasa có thể trả về nhiều messages
INSERT INTO chat_messages (session_id, sender, message, is_read, created_at)
VALUES ($1, 'bot', $2, false, NOW());
```

**Step 5: Update Session Timestamp**
```sql
UPDATE chat_sessions 
SET updated_at = NOW() 
WHERE id = $1;
```

**Error Handling:**
- Nếu Rasa server down → Trả về message mặc định: "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau."
- Timeout Rasa: 10 seconds
- Fallback message luôn được lưu vào DB

### Response

**Success (201 Created):**
```json
{
  "customer_message": {
    "id": 10,
    "session_id": 123,
    "sender": "customer",
    "message": "Tôi muốn mua áo sơ mi size L",
    "created_at": "2024-12-01T10:10:00Z"
  },
  "bot_responses": [
    {
      "id": 11,
      "session_id": 123,
      "sender": "bot",
      "message": "Dạ vâng, shop có áo sơ mi size L. Anh muốn xem mẫu nào ạ?",
      "created_at": "2024-12-01T10:10:05Z"
    }
  ]
}
```

**Error (500 Internal Server Error):**
```json
{
  "statusCode": 500,
  "message": "Lỗi kết nối đến chatbot server",
  "error": "Internal Server Error"
}
```

---

## 1.4. PUT /api/v1/chat/merge

### Endpoint Info
- **Method:** PUT
- **URL:** `/api/v1/chat/merge`
- **Auth Required:** Yes (JWT)

### Description
Merge chat session của visitor sang customer khi customer vừa đăng nhập. Chuyển tất cả sessions có `visitor_id` sang `customer_id`.

### Request

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body Payload:**
```json
{
  "visitor_id": "uuid-v4-string"
}
```

### Backend Logic

**Step 1: Get Customer ID từ JWT**
```typescript
const customer_id = user.customerId; // Parse từ JWT payload
```

**Step 2: Find Visitor Sessions**
```sql
SELECT * FROM chat_sessions 
WHERE visitor_id = $1 
AND customer_id IS NULL;
```

**Step 3: Update Sessions**
```sql
UPDATE chat_sessions
SET 
  customer_id = $1,
  visitor_id = NULL,
  updated_at = NOW()
WHERE visitor_id = $2 
AND customer_id IS NULL;
```

**Step 4: Return Merged Count**

### Response

**Success (200 OK):**
```json
{
  "message": "Đã merge chat sessions thành công",
  "merged_count": 2,
  "customer_id": 456
}
```

**Error (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy sessions cần merge",
  "merged_count": 0
}
```

---

## 1.5. POST /api/v1/consultant/styling

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/consultant/styling`
- **Auth Required:** No (Public)

### Description
Tư vấn phối đồ dựa trên occasion (dịp), style (phong cách), gender. Query DB thay vì dùng AI.

### Request

**Body Payload:**
```json
{
  "occasion": "wedding",      // wedding | work | casual | party | sport
  "style": "minimalist",       // minimalist | street | vintage | elegant
  "gender": "male",            // male | female | unisex
  "weather": "summer"          // Optional: summer | winter | spring | fall
}
```

### Backend Logic

**Step 1: Map Occasion → Categories**
```typescript
const occasionCategoryMap = {
  wedding: ['Vest', 'Áo sơ mi', 'Giày da', 'Quần tây'],
  work: ['Áo sơ mi', 'Quần tây', 'Giày da', 'Blazer'],
  casual: ['Áo thun', 'Quần jean', 'Giày sneaker'],
  party: ['Áo sơ mi', 'Quần tây', 'Giày da'],
  sport: ['Áo thể thao', 'Quần short', 'Giày chạy bộ'],
};
```

**Step 2: Query Products**
```sql
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  p.selling_price, 
  p.thumbnail_url, 
  p.average_rating,
  p.attributes,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active'
  AND p.deleted_at IS NULL
  AND c.name IN ('Vest', 'Áo sơ mi', 'Giày da', 'Quần tây')
  AND (
    -- Filter by style in attributes JSONB
    p.attributes->>'style' ILIKE '%minimalist%'
    OR p.attributes IS NULL
  )
  AND (
    -- Filter by weather/season if provided
    p.attributes->>'season' ILIKE '%summer%'
    OR p.attributes->>'weather' ILIKE '%summer%'
    OR p.attributes IS NULL
  )
ORDER BY p.average_rating DESC
LIMIT 3;
```

**Step 3: Generate Styling Tip**
```typescript
const tips = {
  wedding: 'Nên chọn vest hoặc áo sơ mi lịch sự, phối với quần tây và giày da.',
  work: 'Áo sơ mi trắng/xanh nhạt + quần tây xám/đen là combo an toàn cho công sở.',
  casual: 'Áo thun basic + quần jean + sneaker là bộ đồ thoải mái cho ngày thường.',
  // ...
};
```

### Response

**Success (200 OK):**
```json
{
  "success": true,
  "occasion": "wedding",
  "style": "minimalist",
  "recommended_products": [
    {
      "id": 10,
      "name": "Vest Nam Cao Cấp",
      "slug": "vest-nam-cao-cap",
      "price": 1500000,
      "thumbnail": "https://...",
      "category": "Vest",
      "rating": 4.8,
      "attributes": {
        "style": "elegant",
        "season": "all",
        "material": "wool"
      }
    },
    {
      "id": 15,
      "name": "Áo Sơ Mi Oxford Trắng",
      "slug": "ao-so-mi-oxford-trang",
      "price": 350000,
      "thumbnail": "https://...",
      "category": "Áo sơ mi",
      "rating": 4.7
    }
  ],
  "styling_tip": "Nên chọn vest hoặc áo sơ mi lịch sự, phối với quần tây và giày da. Tránh màu sắc quá chói."
}
```

**Error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["occasion must be a string"],
  "error": "Bad Request"
}
```

---

## 1.6. POST /api/v1/consultant/sizing

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/consultant/sizing`
- **Auth Required:** No (Public)

### Description
Tư vấn size dựa trên chiều cao, cân nặng. Tính BMI và mapping với bảng size chuẩn. Nếu có `product_id`, check thêm `attributes.fit` và tồn kho.

### Request

**Body Payload:**
```json
{
  "height": 170,              // cm, bắt buộc, min: 100
  "weight": 65,               // kg, bắt buộc, min: 30
  "product_id": 10,           // Optional
  "category_slug": "ao-thun"  // Optional
}
```

### Backend Logic

**Step 1: Calculate BMI**
```typescript
const bmi = weight / ((height / 100) ** 2);
// BMI < 18.5: Underweight
// BMI 18.5-24.9: Normal
// BMI >= 25: Overweight
```

**Step 2: Size Mapping Logic**
```typescript
let recommendedSize = 'M';

if (height < 160) {
  recommendedSize = weight < 55 ? 'XS' : 'S';
} else if (height < 170) {
  recommendedSize = weight < 60 ? 'S' : weight < 70 ? 'M' : 'L';
} else if (height < 180) {
  recommendedSize = weight < 65 ? 'M' : weight < 75 ? 'L' : 'XL';
} else {
  recommendedSize = weight < 70 ? 'L' : weight < 80 ? 'XL' : 'XXL';
}
```

**Step 3: If product_id provided, query product**
```sql
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  p.selling_price,
  p.attributes
FROM products p
WHERE p.id = $1 
  AND p.deleted_at IS NULL
  AND p.status = 'active';
```

**Step 4: Check fit type & adjust size**
```typescript
const fitType = product.attributes?.fit || 'Regular';

// Nếu form Slim và BMI > 23 → Tăng 1 size
if (fitType === 'Slim' && bmi > 23) {
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const currentIndex = sizeOrder.indexOf(recommendedSize);
  if (currentIndex < sizeOrder.length - 1) {
    recommendedSize = sizeOrder[currentIndex + 1];
  }
}
```

**Step 5: Check variant availability**
```sql
SELECT 
  pv.id,
  pv.total_stock,
  pv.reserved_stock,
  s.name as size_name
FROM product_variants pv
LEFT JOIN sizes s ON pv.size_id = s.id
WHERE pv.product_id = $1
  AND s.name = $2
  AND pv.status = 'active'
  AND pv.deleted_at IS NULL;

-- Calculate available = total_stock - reserved_stock
```

### Response

**Success (200 OK):**
```json
{
  "recommended_size": "M",
  "fit_type": "Regular",
  "advice": "Với chiều cao 170cm và cân nặng 65kg, bạn nên mặc size M. Sản phẩm này form Regular nên khá thoải mái.",
  "is_available": true,
  "product": {
    "id": 10,
    "name": "Áo Sơ Mi Oxford",
    "slug": "ao-so-mi-oxford"
  },
  "variant_info": {
    "size": "M",
    "available_stock": 15,
    "price": 350000
  }
}
```

---

## 1.7. POST /api/v1/consultant/compare

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/consultant/compare`
- **Auth Required:** No (Public)

### Description
So sánh 2-3 sản phẩm về giá, chất liệu, rating. Hỗ trợ search theo tên hoặc ID.

### Request

**Body Payload:**
```json
{
  "product_names": ["Áo sơ mi A", "Áo sơ mi B"]
  // HOẶC
  // "product_names": ["10", "11"]  // IDs dạng string
}
```

**Validation:**
- `product_names`: Array, length 2-3

### Backend Logic

**Step 1: Detect Input Type (Name vs ID)**
```typescript
const isIds = product_names.every(name => !isNaN(Number(name)));
```

**Step 2: Query Products**
```sql
-- Nếu là IDs:
SELECT 
  p.id, 
  p.name, 
  p.selling_price, 
  p.average_rating, 
  p.total_reviews,
  p.thumbnail_url,
  p.attributes,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id IN (10, 11)
  AND p.deleted_at IS NULL
  AND p.status = 'active';

-- Nếu là names (fuzzy search):
WHERE unaccent(p.name) ILIKE ANY(ARRAY[
  unaccent('%Áo sơ mi A%'), 
  unaccent('%Áo sơ mi B%')
])
```

**Step 3: Extract Comparison Data**
```typescript
const comparison = products.map(p => ({
  id: p.id,
  name: p.name,
  price: p.selling_price,
  rating: p.average_rating,
  total_reviews: p.total_reviews,
  material: p.attributes?.material || 'N/A',
  origin: p.attributes?.origin || 'N/A',
  style: p.attributes?.style || 'N/A',
}));
```

**Step 4: Generate Summary**
```typescript
const priceDiff = Math.abs(products[0].price - products[1].price);
const bestValueIndex = products.reduce((bestIdx, curr, idx) => {
  const value = (curr.rating / curr.price) * 100000;
  const bestValue = (products[bestIdx].rating / products[bestIdx].price) * 100000;
  return value > bestValue ? idx : bestIdx;
}, 0);
```

### Response

**Success (200 OK):**
```json
{
  "products": [
    {
      "id": 10,
      "name": "Áo Sơ Mi Oxford",
      "price": 350000,
      "rating": 4.7,
      "total_reviews": 120,
      "material": "Cotton 100%",
      "origin": "Vietnam",
      "style": "Formal"
    },
    {
      "id": 11,
      "name": "Áo Sơ Mi Linen",
      "price": 420000,
      "rating": 4.5,
      "total_reviews": 85,
      "material": "Linen",
      "origin": "Thailand",
      "style": "Casual"
    }
  ],
  "summary": "So sánh 2 sản phẩm:\n- Chênh lệch giá: 70,000đ\n- Chênh lệch đánh giá: 0.2 sao\n- Đáng giá nhất: Áo Sơ Mi Oxford"
}
```

**Error (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Không tìm đủ sản phẩm để so sánh",
  "error": "Not Found"
}
```

---

# 2. Module Payment (VNPAY)

## 2.1. POST /api/v1/payment/create_url

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/payment/create_url`
- **Auth Required:** Yes (JWT)

### Description
Tạo URL thanh toán VNPAY cho đơn hàng. Tính checksum SHA512 và tạo record trong bảng `payments`.

### Request

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body Payload:**
```json
{
  "order_id": 123,
  "bank_code": "NCB"  // Optional: NCB, BIDV, VCB, etc.
}
```

### Backend Logic

**Step 1: Validate Order**
```sql
SELECT 
  o.id, 
  o.total_amount, 
  o.customer_id, 
  o.payment_status
FROM orders o
WHERE o.id = $1 
  AND o.customer_id = $2;  -- $2 = JWT customer_id
```

→ Nếu `payment_status` = 'paid' → Error: "Đơn hàng đã thanh toán"

**Step 2: Create Payment Record**
```sql
INSERT INTO payments (
  order_id, 
  transaction_id,  -- Generate: "PAY_" + timestamp + random
  amount, 
  provider, 
  payment_method, 
  status, 
  created_at
) VALUES (
  $1,              -- order_id
  $2,              -- transaction_id
  $3,              -- total_amount
  'VNPAY',
  'VNPAY_QR',
  'pending',
  NOW()
) RETURNING *;
```

**Step 3: Build VNPAY URL với Checksum**
```typescript
const vnpParams = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: process.env.VNPAY_TMN_CODE,
  vnp_Amount: (total_amount * 100).toString(), // VNĐ * 100
  vnp_CreateDate: moment().format('YYYYMMDDHHmmss'),
  vnp_CurrCode: 'VND',
  vnp_IpAddr: req.ip,
  vnp_Locale: 'vn',
  vnp_OrderInfo: `Thanh toan don hang ${order_id}`,
  vnp_OrderType: 'billpayment',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
  vnp_TxnRef: transaction_id,
};

if (bank_code) {
  vnpParams.vnp_BankCode = bank_code;
}

// Sort params alphabetically
const sortedParams = Object.keys(vnpParams)
  .sort()
  .reduce((acc, key) => {
    acc[key] = vnpParams[key];
    return acc;
  }, {});

// Create query string
const queryString = new URLSearchParams(sortedParams).toString();

// Generate SecureHash
const crypto = require('crypto');
const hashSecret = process.env.VNPAY_HASH_SECRET;
const secureHash = crypto
  .createHmac('sha512', hashSecret)
  .update(queryString)
  .digest('hex');

// Final URL
const vnpayUrl = `${process.env.VNPAY_URL}?${queryString}&vnp_SecureHash=${secureHash}`;
```

### Response

**Success (201 Created):**
```json
{
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=100000000&vnp_Command=pay&...",
  "transaction_id": "PAY_1701504000_ABC123",
  "amount": 1000000,
  "order_id": 123,
  "expires_at": "2024-12-01T11:00:00Z"
}
```

**Error (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Đơn hàng đã được thanh toán",
  "error": "Bad Request"
}
```

---

## 2.2. GET /api/v1/payment/vnpay_return

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/payment/vnpay_return`
- **Auth Required:** No (Public)

### Description
VNPAY redirect customer về URL này sau khi thanh toán. Verify checksum và hiển thị kết quả cho FE.

### Request

**Query Params (từ VNPAY):**
```
?vnp_Amount=100000000
&vnp_BankCode=NCB
&vnp_ResponseCode=00
&vnp_TxnRef=PAY_1701504000_ABC123
&vnp_SecureHash=abc123...
&... (nhiều params khác)
```

### Backend Logic

**Step 1: Extract Params**
```typescript
const vnpParams = req.query;
const secureHash = vnpParams.vnp_SecureHash;
delete vnpParams.vnp_SecureHash;
delete vnpParams.vnp_SecureHashType;
```

**Step 2: Verify Checksum**
```typescript
const sortedParams = Object.keys(vnpParams).sort();
const queryString = sortedParams
  .map(key => `${key}=${vnpParams[key]}`)
  .join('&');

const crypto = require('crypto');
const hashSecret = process.env.VNPAY_HASH_SECRET;
const calculatedHash = crypto
  .createHmac('sha512', hashSecret)
  .update(queryString)
  .digest('hex');

if (calculatedHash !== secureHash) {
  return res.status(400).json({
    success: false,
    message: 'Chữ ký không hợp lệ',
  });
}
```

**Step 3: Parse Response Code**
```typescript
const responseCode = vnpParams.vnp_ResponseCode;
const transactionId = vnpParams.vnp_TxnRef;

const statusMap = {
  '00': 'success',   // Thành công
  '07': 'failed',    // Trừ tiền thành công nhưng giao dịch nghi ngờ
  '09': 'failed',    // Thẻ chưa đăng ký Internet Banking
  '10': 'failed',    // Xác thực thất bại quá số lần
  '24': 'cancelled', // Customer hủy giao dịch
  // ...
};

const status = statusMap[responseCode] || 'failed';
```

**Step 4: Return HTML/JSON**
```typescript
// Option 1: Redirect to Frontend
res.redirect(`${process.env.FRONTEND_URL}/payment/result?status=${status}&transaction_id=${transactionId}`);

// Option 2: Return JSON
return res.json({
  success: status === 'success',
  status,
  transaction_id: transactionId,
  message: status === 'success' ? 'Thanh toán thành công' : 'Thanh toán thất bại',
});
```

### Response

**Success (Redirect hoặc JSON):**
```
// Redirect
→ https://lecas.vn/payment/result?status=success&transaction_id=PAY_...

// JSON
{
  "success": true,
  "status": "success",
  "transaction_id": "PAY_1701504000_ABC123",
  "message": "Thanh toán thành công"
}
```

---

## 2.3. GET /api/v1/payment/vnpay_ipn

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/payment/vnpay_ipn`
- **Auth Required:** No (VNPAY Webhook)

### Description
**IPN (Instant Payment Notification)** - VNPAY gọi ngầm để thông báo kết quả. Backend cập nhật DB và trả về response theo format VNPAY yêu cầu.

### Request

**Query Params (giống vnpay_return):**
```
?vnp_Amount=100000000
&vnp_ResponseCode=00
&vnp_TxnRef=PAY_1701504000_ABC123
&vnp_SecureHash=...
```

### Backend Logic

**Step 1: Verify Checksum (giống return)**

**Step 2: Find Payment Record**
```sql
SELECT * FROM payments 
WHERE transaction_id = $1;
```

→ Nếu không tồn tại → Return `{RspCode: '02', Message: 'Order not found'}`

**Step 3: Update Payment Status**
```sql
UPDATE payments
SET 
  status = $1,              -- 'success' | 'failed' | 'cancelled'
  payment_method = $2,      -- vnp_BankCode
  response_data = $3,       -- Full VNPAY response as JSONB
  updated_at = NOW()
WHERE transaction_id = $4;
```

**Step 4: If Success, Update Order**
```sql
-- Chỉ update nếu responseCode = '00'
UPDATE orders
SET 
  payment_status = 'paid',
  updated_at = NOW()
WHERE id = (
  SELECT order_id FROM payments WHERE transaction_id = $1
);
```

**Step 5: Return Response theo format VNPAY**
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

**VNPAY Error Codes:**
- `00`: Success
- `02`: Order not found
- `97`: Invalid checksum

### Response

**Success (200 OK):**
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

**Error (Checksum Invalid):**
```json
{
  "RspCode": "97",
  "Message": "Invalid Checksum"
}
```

---

# 3. Module Product & Search

## 3.1. GET /api/v1/products

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/products`
- **Auth Required:** No (Public)

### Description
Tìm kiếm và lọc sản phẩm đa tầng: keyword, price, category, JSONB attributes.

### Request

**Query Params:**
```
?search=áo sơ mi
&category_slug=ao-so-mi
&min_price=200000
&max_price=500000
&attrs={"material":"cotton","style":"formal"}
&page=1
&limit=20
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| search | string | No | Tìm theo tên (unaccent) |
| category_slug | string | No | Slug của category |
| min_price | integer | No | Giá tối thiểu (VNĐ) |
| max_price | integer | No | Giá tối đa (VNĐ) |
| attrs | JSON string | No | Filter JSONB attributes |
| page | integer | No | Default: 1 |
| limit | integer | No | Default: 20 |

### Backend Logic

**Step 1: Build Query**
```sql
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  p.selling_price, 
  p.thumbnail_url, 
  p.average_rating, 
  p.total_reviews,
  p.attributes,
  c.name as category_name,
  c.slug as category_slug
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active'
  AND p.deleted_at IS NULL
  AND c.deleted_at IS NULL
```

**Step 2: Apply Filters**

**Search (unaccent):**
```sql
AND unaccent(p.name) ILIKE unaccent('%áo sơ mi%')
```

**Category:**
```sql
AND c.slug = 'ao-so-mi'
```

**Price Range:**
```sql
AND p.selling_price BETWEEN 200000 AND 500000
```

**JSONB Attributes:**
```typescript
// Frontend gửi: attrs={"material":"cotton","style":"formal"}
const attrs = JSON.parse(attrsParam);

// Backend build:
Object.keys(attrs).forEach(key => {
  query.andWhere(`p.attributes->>:key ILIKE :value`, {
    key,
    value: `%${attrs[key]}%`,
  });
});

// SQL generated:
AND p.attributes->>'material' ILIKE '%cotton%'
AND p.attributes->>'style' ILIKE '%formal%'
```

**Step 3: Pagination**
```sql
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;

-- Count total
SELECT COUNT(*) FROM products WHERE ...
```

### Response

**Success (200 OK):**
```json
{
  "products": [
    {
      "id": 10,
      "name": "Áo Sơ Mi Oxford",
      "slug": "ao-so-mi-oxford",
      "price": 350000,
      "thumbnail": "https://...",
      "rating": 4.7,
      "total_reviews": 120,
      "category": "Áo sơ mi",
      "attributes": {
        "material": "cotton",
        "style": "formal",
        "origin": "Vietnam"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## 3.2. GET /api/v1/products/attributes

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/products/attributes`
- **Auth Required:** No (Public)

### Description
Lấy danh sách distinct keys từ cột `attributes` JSONB để FE render dynamic filters.

### Backend Logic

```sql
SELECT DISTINCT jsonb_object_keys(attributes) as key
FROM products
WHERE attributes IS NOT NULL
  AND attributes != '{}'
  AND deleted_at IS NULL;

-- Result: ['material', 'style', 'origin', 'fit', 'season']
```

### Response

**Success (200 OK):**
```json
{
  "attributes": [
    "material",
    "style",
    "origin",
    "fit",
    "season",
    "pattern"
  ],
  "count": 6
}
```

---

## 3.3. GET /api/v1/products/availability

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/products/availability`
- **Auth Required:** No (Public)

### Description
Kiểm tra tồn kho sản phẩm theo tên, size, màu. Dùng cho chatbot intent: `check_product_availability`.

### Request

**Query Params:**
```
?name=áo sơ mi trắng
&size=L
&color=white
```

### Backend Logic

**Step 1: Fuzzy Search Products**
```sql
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  p.selling_price, 
  p.thumbnail_url
FROM products p
WHERE p.status = 'active'
  AND p.deleted_at IS NULL
  AND unaccent(p.name) ILIKE unaccent('%áo sơ mi trắng%');
```

**Step 2: Load Variants**
```sql
SELECT 
  pv.id,
  pv.product_id,
  pv.total_stock,
  pv.reserved_stock,
  s.name as size_name,
  c.name as color_name
FROM product_variants pv
LEFT JOIN sizes s ON pv.size_id = s.id
LEFT JOIN colors c ON pv.color_id = c.id
WHERE pv.product_id IN (10, 11, ...)
  AND pv.status = 'active'
  AND pv.deleted_at IS NULL;
```

**Step 3: Filter & Calculate**
```typescript
products.forEach(product => {
  let matchedVariants = product.variants;
  
  // Filter by size
  if (size) {
    matchedVariants = matchedVariants.filter(
      v => v.size_name?.toLowerCase() === size.toLowerCase()
    );
  }
  
  // Filter by color
  if (color) {
    matchedVariants = matchedVariants.filter(
      v => v.color_name?.toLowerCase().includes(color.toLowerCase())
    );
  }
  
  // Calculate available stock
  const totalAvailable = matchedVariants.reduce(
    (sum, v) => sum + (v.total_stock - v.reserved_stock),
    0
  );
  
  product.status = totalAvailable > 0 ? 'in_stock' : 'out_of_stock';
  product.quantity_left = totalAvailable;
});
```

### Response

**Success (200 OK):**
```json
{
  "found": 2,
  "in_stock": 1,
  "out_of_stock": 1,
  "products": [
    {
      "product_id": 10,
      "product_name": "Áo Sơ Mi Trắng Oxford",
      "slug": "ao-so-mi-trang-oxford",
      "price": 350000,
      "thumbnail": "https://...",
      "status": "in_stock",
      "quantity_left": 15,
      "variants": [
        {
          "size": "L",
          "color": "Trắng",
          "available": 15
        }
      ]
    },
    {
      "product_id": 11,
      "product_name": "Áo Sơ Mi Trắng Linen",
      "status": "out_of_stock",
      "quantity_left": 0
    }
  ]
}
```

---

## 3.4. POST /api/v1/products/:id/notify

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/products/:id/notify`
- **Auth Required:** Optional (JWT)

### Description
Đăng ký nhận thông báo khi sản phẩm về hàng hoặc giảm giá. Lưu vào bảng `product_notifications`.

### Request

**Body Payload:**
```json
{
  "email": "customer@example.com",
  "size": "L",                     // Optional
  "price_condition": 300000        // Optional: Giá <= price này thì báo
}
```

### Backend Logic

**Step 1: Validate Product**
```sql
SELECT * FROM products 
WHERE id = $1 
  AND deleted_at IS NULL;
```

**Step 2: Insert Notification**
```sql
INSERT INTO product_notifications (
  id,           -- Generate UUID
  user_id,      -- customer_id từ JWT hoặc NULL
  email,
  product_id,
  size,
  price_condition,
  status,
  created_at
) VALUES (
  $1, $2, $3, $4, $5, $6, 'active', NOW()
);
```

### Response

**Success (201 Created):**
```json
{
  "message": "Đăng ký nhận thông báo thành công",
  "notification_id": "notif_1701504000_abc123"
}
```

---

# 4. Module Order & Promotion

## 4.1. GET /api/v1/orders/track

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/orders/track`
- **Auth Required:** No (Public)

### Description
Tra cứu đơn hàng công khai bằng `order_id` HOẶC `phone + email`. Dùng cho chatbot.

### Request

**Query Params (Option 1):**
```
?order_id=123
```

**Query Params (Option 2):**
```
?phone=0901234567
&email=customer@example.com
```

### Backend Logic

**Step 1: Build Query**
```sql
-- Option 1: By order_id
SELECT 
  o.id, 
  o.order_code,
  o.total_amount,
  o.fulfillment_status,  -- pending | processing | shipped | delivered | cancelled
  o.payment_status,      -- pending | paid | failed
  o.shipping_address,
  o.shipping_phone,
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.id = $1;

-- Option 2: By phone + email
WHERE o.shipping_phone = $1 
  AND o.customer_email = $2;
```

**Step 2: Load Order Items**
```sql
SELECT 
  oi.id,
  oi.quantity,
  oi.price_at_purchase,
  p.name as product_name,
  p.thumbnail_url,
  s.name as size_name,
  c.name as color_name
FROM order_items oi
LEFT JOIN product_variants pv ON oi.variant_id = pv.id
LEFT JOIN products p ON pv.product_id = p.id
LEFT JOIN sizes s ON pv.size_id = s.id
LEFT JOIN colors c ON pv.color_id = c.id
WHERE oi.order_id = $1;
```

**Step 3: Load Status History**
```sql
SELECT 
  status,
  note,
  created_at
FROM order_status_history
WHERE order_id = $1
ORDER BY created_at ASC;
```

### Response

**Success (200 OK):**
```json
{
  "order": {
    "id": 123,
    "order_code": "ORD-20241201-123",
    "total_amount": 1500000,
    "fulfillment_status": "shipped",
    "payment_status": "paid",
    "shipping_address": "123 Nguyễn Văn A, Quận 1, TP.HCM",
    "shipping_phone": "0901234567",
    "created_at": "2024-12-01T10:00:00Z",
    "updated_at": "2024-12-02T15:00:00Z"
  },
  "items": [
    {
      "product_name": "Áo Sơ Mi Oxford",
      "thumbnail": "https://...",
      "size": "L",
      "color": "Trắng",
      "quantity": 2,
      "price": 350000
    }
  ],
  "history": [
    {
      "status": "pending",
      "note": "Đơn hàng đã được tạo",
      "created_at": "2024-12-01T10:00:00Z"
    },
    {
      "status": "processing",
      "note": "Đang chuẩn bị hàng",
      "created_at": "2024-12-01T14:00:00Z"
    },
    {
      "status": "shipped",
      "note": "Đã giao cho đơn vị vận chuyển",
      "created_at": "2024-12-02T09:00:00Z"
    }
  ]
}
```

**Error (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng",
  "error": "Not Found"
}
```

---

## 4.2. POST /api/v1/promotions/validate

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/promotions/validate`
- **Auth Required:** No (Public)

### Description
Validate nhiều mã giảm giá cùng lúc. Check: còn hạn, còn lượt dùng, tính tổng giảm.

### Request

**Body Payload:**
```json
{
  "codes": ["SALE30", "NEW10"],
  "cart_total": 1000000
}
```

### Backend Logic

**Step 1: Find Promotions**
```sql
SELECT * FROM promotions
WHERE name IN ('SALE30', 'NEW10');
```

**Step 2: Validate Each Code**
```typescript
const now = new Date();

for (const promo of promotions) {
  // Check status
  if (promo.status !== 'active') {
    invalidReasons.push(`${promo.name}: Mã chưa kích hoạt`);
    continue;
  }
  
  // Check date range
  if (promo.start_date && new Date(promo.start_date) > now) {
    invalidReasons.push(`${promo.name}: Chưa đến thời gian sử dụng`);
    continue;
  }
  
  if (promo.end_date && new Date(promo.end_date) < now) {
    invalidReasons.push(`${promo.name}: Đã hết hạn`);
    continue;
  }
  
  // Check usage limit
  if (promo.number_limited !== null && promo.number_limited <= 0) {
    invalidReasons.push(`${promo.name}: Đã hết lượt sử dụng`);
    continue;
  }
  
  validPromotions.push(promo);
}
```

**Step 3: Calculate Discount**
```typescript
let totalDiscount = 0;

for (const promo of validPromotions) {
  if (promo.discount_type === 'percentage') {
    discount = (cart_total * Number(promo.discount_value)) / 100;
  } else if (promo.discount_type === 'fixed') {
    discount = Number(promo.discount_value);
  }
  
  totalDiscount += discount;
}

// Cap at cart_total
if (totalDiscount > cart_total) {
  totalDiscount = cart_total;
}
```

### Response

**Success (200 OK):**
```json
{
  "valid": true,
  "message": "Mã giảm giá hợp lệ",
  "discount_amount": 400000,
  "applied_promotions": [
    {
      "name": "SALE30",
      "type": "percentage",
      "discount_type": "percentage",
      "discount_value": 30,
      "calculated_discount": 300000
    },
    {
      "name": "NEW10",
      "type": "fixed",
      "discount_type": "fixed",
      "discount_value": 100000,
      "calculated_discount": 100000
    }
  ],
  "invalid_reasons": []
}
```

---

## 4.3. POST /api/v1/promotions/validate-mix

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/promotions/validate-mix`
- **Auth Required:** No (Public)

### Description
Kiểm tra logic gộp mã giảm giá. Rule: Không cho dùng 2 mã cùng loại (2 % hoặc 2 fixed).

### Request

**Body Payload:**
```json
{
  "coupon_codes": ["SALE30", "NEW10"],
  "cart_value": 500000
}
```

### Backend Logic

**Step 1-2: Tương tự validate**

**Step 3: Check Mix Logic**
```typescript
if (validCodes.length > 1) {
  const discountTypes = validCodes.map(p => p.discount_type);
  const hasMultiplePercentage = discountTypes.filter(t => t === 'percentage').length > 1;
  const hasMultipleFixed = discountTypes.filter(t => t === 'fixed').length > 1;
  
  if (hasMultiplePercentage) {
    return {
      can_mix: false,
      message: 'Không thể dùng nhiều mã giảm % cùng lúc',
      explanation: 'Hệ thống chỉ cho phép áp dụng 1 mã giảm theo phần trăm...',
    };
  }
  
  if (hasMultipleFixed) {
    return {
      can_mix: false,
      message: 'Không thể dùng nhiều mã giảm cố định cùng lúc',
      // ...
    };
  }
}
```

### Response

**Success (Can Mix):**
```json
{
  "can_mix": true,
  "message": "Có thể dùng 2 mã cùng lúc",
  "explanation": "Bạn có thể kết hợp SALE30 và FREESHIP để được giảm tổng cộng 350,000đ.",
  "valid_codes": [
    { "code": "SALE30", "type": "percentage", "value": 30 },
    { "code": "FREESHIP", "type": "fixed", "value": 50000 }
  ],
  "total_discount": 350000
}
```

**Error (Cannot Mix):**
```json
{
  "can_mix": false,
  "message": "Không thể dùng nhiều mã giảm % cùng lúc",
  "explanation": "Hệ thống chỉ cho phép áp dụng 1 mã giảm theo phần trăm. Bạn có thể kết hợp 1 mã giảm % với 1 mã giảm cố định.",
  "valid_codes": ["SALE30", "NEW10"]
}
```

---

# 5. Module Admin Management

## 5.1. POST /api/v1/admin/chat/:id/reply

### Endpoint Info
- **Method:** POST
- **URL:** `/api/v1/admin/chat/:id/reply`
- **Auth Required:** Yes (Admin JWT)

### Description
Admin gửi tin nhắn trực tiếp đến customer trong chat session.

### Request

**Headers:**
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**Body Payload:**
```json
{
  "message": "Dạ em xin lỗi anh vì sự bất tiện này..."
}
```

### Backend Logic

**Step 1: Validate Session**
```sql
SELECT * FROM chat_sessions WHERE id = $1;
```

**Step 2: Insert Admin Message**
```sql
INSERT INTO chat_messages (
  session_id,
  sender,        -- 'admin'
  message,
  is_read,
  created_at
) VALUES ($1, 'admin', $2, false, NOW())
RETURNING *;
```

**Step 3: Update Session Timestamp**
```sql
UPDATE chat_sessions
SET updated_at = NOW()
WHERE id = $1;
```

### Response

**Success (201 Created):**
```json
{
  "message": "Tin nhắn đã được gửi",
  "chat_message": {
    "id": 123,
    "session_id": 456,
    "sender": "admin",
    "message": "Dạ em xin lỗi anh vì sự bất tiện này...",
    "created_at": "2024-12-02T10:00:00Z"
  }
}
```

---

## 5.2. GET /api/v1/admin/transactions

### Endpoint Info
- **Method:** GET
- **URL:** `/api/v1/admin/transactions`
- **Auth Required:** Yes (Admin JWT)

### Description
Xem danh sách giao dịch thanh toán để đối soát. Filter theo ngày và status.

### Request

**Query Params:**
```
?start_date=2024-12-01
&end_date=2024-12-31
&status=success
&page=1
&limit=20
```

### Backend Logic

**Step 1: Build Query**
```sql
SELECT 
  p.id,
  p.transaction_id,
  p.order_id,
  p.amount,
  p.provider,
  p.payment_method,
  p.status,
  p.response_data,
  p.created_at,
  o.order_code
FROM payments p
LEFT JOIN orders o ON p.order_id = o.id
WHERE 1=1
```

**Step 2: Apply Filters**
```sql
-- Date range
AND p.created_at >= '2024-12-01 00:00:00'
AND p.created_at <= '2024-12-31 23:59:59'

-- Status
AND p.status = 'success'
```

**Step 3: Pagination**
```sql
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 0;
```

**Step 4: Calculate Summary**
```sql
SELECT 
  status,
  COUNT(*) as total_count,
  SUM(amount) as total_amount
FROM payments
WHERE created_at BETWEEN $1 AND $2
GROUP BY status;
```

### Response

**Success (200 OK):**
```json
{
  "transactions": [
    {
      "id": 10,
      "transaction_id": "PAY_1701504000_ABC",
      "order_id": 123,
      "order_code": "ORD-20241201-123",
      "amount": 1500000,
      "provider": "VNPAY",
      "payment_method": "NCB",
      "status": "success",
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "summary": [
    {
      "status": "success",
      "total_count": 120,
      "total_amount": 180000000
    },
    {
      "status": "failed",
      "total_count": 25,
      "total_amount": 0
    },
    {
      "status": "pending",
      "total_count": 5,
      "total_amount": 7500000
    }
  ]
}
```

---

# 6. Common Error Codes

## HTTP Status Codes

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Request thành công |
| 201 | Created | Tạo resource thành công |
| 400 | Bad Request | Validation error, thiếu params |
| 401 | Unauthorized | Không có token hoặc token invalid |
| 403 | Forbidden | Token hợp lệ nhưng không có quyền |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Duplicate resource (email, slug...) |
| 500 | Internal Server Error | Lỗi server, DB connection, etc. |

## Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    "email must be an email",
    "password must be longer than 6 characters"
  ]
}
```

---

## Notes for Developers

### 1. Soft Delete Pattern
```sql
-- Always filter soft-deleted records
WHERE deleted_at IS NULL
```

### 2. JSONB Query Pattern
```sql
-- Check if key exists
WHERE attributes ? 'material'

-- Get value
WHERE attributes->>'material' = 'cotton'

-- Case-insensitive
WHERE attributes->>'material' ILIKE '%cotton%'
```

### 3. Unaccent Search
```sql
WHERE unaccent(name) ILIKE unaccent('%áo sơ mi%')
```

### 4. Transaction Pattern
```typescript
await queryRunner.startTransaction();
try {
  // ... multiple queries
  await queryRunner.commitTransaction();
} catch (err) {
  await queryRunner.rollbackTransaction();
  throw err;
}
```

### 5. Stock Management
```typescript
// Available stock = total_stock - reserved_stock
const available = variant.total_stock - variant.reserved_stock;

// Reserve stock khi tạo order
UPDATE product_variants
SET reserved_stock = reserved_stock + $1
WHERE id = $2;

// Confirm stock khi thanh toán
UPDATE product_variants
SET 
  total_stock = total_stock - $1,
  reserved_stock = reserved_stock - $1
WHERE id = $2;
```

---

**Document Version:** 2.0  
**Last Updated:** December 2, 2024  
**Maintained by:** Backend Team
