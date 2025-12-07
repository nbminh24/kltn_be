# 📊 CHATBOT API REPORT

## Tổng quan
Hệ thống chatbot AI bao gồm các API sau:
- **Chat & Conversation Management**: Quản lý phiên chat và tin nhắn
- **Rasa Integration**: Tích hợp với Rasa chatbot server
- **Image Search**: Tìm kiếm sản phẩm bằng ảnh sử dụng AI (pgvector + FastAPI)

---

## 📂 1. CHAT & CONVERSATION APIs

### Base URL: `/chat`

---

### 1.1. Tạo hoặc lấy phiên chat
**Endpoint:** `POST /chat/session`  
**Auth:** Public  
**Mô tả:** Tạo session mới cho guest (visitor_id) hoặc lấy session của customer đã login

**Request Body:**
```json
{
  "visitor_id": "uuid-string" // Optional, dùng cho guest user
}
```

**Response:**
```json
{
  "session_id": 1,
  "customer_id": 123, // null nếu là guest
  "visitor_id": "uuid-string", // null nếu là customer
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Logic:**
- Nếu user đã login (JWT token) → tìm/tạo session theo `customer_id`
- Nếu guest → tìm/tạo session theo `visitor_id`
- Mỗi customer/visitor chỉ có 1 session active tại 1 thời điểm

---

### 1.2. Lấy lịch sử chat
**Endpoint:** `GET /chat/history`  
**Auth:** Public  
**Mô tả:** Lấy tất cả tin nhắn trong một phiên chat

**Query Parameters:**
- `session_id` (required): Number - ID của session
- `limit` (optional): Number - Số lượng message (default: 50)
- `offset` (optional): Number - Offset cho pagination (default: 0)

**Response:**
```json
{
  "session": {
    "id": 1,
    "customer_id": 123,
    "visitor_id": null,
    "customer": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "messages": [
    {
      "id": 1,
      "session_id": 1,
      "sender": "customer", // "customer" | "bot"
      "message": "Xin chào",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

---

### 1.3. Gửi tin nhắn
**Endpoint:** `POST /chat/send`  
**Auth:** Public  
**Mô tả:** Gửi tin nhắn từ user và nhận phản hồi từ Rasa bot

**Request Body:**
```json
{
  "session_id": 1,
  "message": "Tôi muốn tìm sản phẩm ABC"
}
```

**Response:**
```json
{
  "user_message": {
    "id": 10,
    "session_id": 1,
    "sender": "customer",
    "message": "Tôi muốn tìm sản phẩm ABC",
    "is_read": false,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "bot_messages": [
    {
      "id": 11,
      "session_id": 1,
      "sender": "bot",
      "message": "Tôi đã tìm thấy 5 sản phẩm ABC...",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.100Z"
    }
  ],
  "session_id": 1
}
```

**Logic:**
1. Lưu user message vào DB
2. Gửi request đến Rasa Server (`/webhooks/rest/webhook`)
3. Lưu bot responses vào DB
4. Update session timestamp

**Fallback:** Nếu Rasa server down → trả về message mặc định

---

### 1.4. Merge phiên chat visitor sang customer
**Endpoint:** `PUT /chat/merge`  
**Auth:** Required (JWT Bearer Token)  
**Mô tả:** Gọi sau khi user login để gộp chat history từ visitor_id vào tài khoản

**Request Body:**
```json
{
  "visitor_id": "uuid-string"
}
```

**Response:**
```json
{
  "message": "Merge phiên chat thành công",
  "merged_count": 2,
  "customer_id": 123
}
```

**Logic:**
- Tìm tất cả sessions có `visitor_id` = request
- Update `customer_id` và set `visitor_id` = null
- Giữ nguyên tất cả messages

---

### 1.5. Lấy lịch sử chat sessions (ChatGPT-style)
**Endpoint:** `GET /chat/sessions/history`  
**Auth:** Public  
**Mô tả:** Lấy danh sách chat sessions grouped by time (Hôm nay, Hôm qua, 7 ngày trước...). Dùng cho sidebar.

**Query Parameters:**
- `customer_id` (optional): Number
- `visitor_id` (optional): String
- `page` (optional): Number (default: 1)
- `limit` (optional): Number (default: 50)

**Response:**
```json
{
  "sessions": {
    "today": [
      {
        "id": 1,
        "customer_id": 123,
        "visitor_id": null,
        "status": "active",
        "created_at": "2024-01-01T10:00:00.000Z",
        "updated_at": "2024-01-01T11:00:00.000Z"
      }
    ],
    "yesterday": [],
    "last_7_days": [],
    "older": []
  },
  "total": 1,
  "page": 1,
  "limit": 50
}
```

---

### 1.6. Lấy active session
**Endpoint:** `GET /chat/sessions/active`  
**Auth:** Public  
**Mô tả:** Lấy session đang active của customer hoặc visitor. Dùng cho popup bubble chat.

**Query Parameters:**
- `customer_id` (optional): Number
- `visitor_id` (optional): String

**Response:**
```json
{
  "session_id": 1,
  "customer_id": 123,
  "visitor_id": null,
  "status": "active",
  "created_at": "2024-01-01T10:00:00.000Z",
  "updated_at": "2024-01-01T11:00:00.000Z"
}
```

**Error:** 404 nếu không tìm thấy session

---

### 1.7. Xóa chat session
**Endpoint:** `DELETE /chat/sessions/:id`  
**Auth:** Public  
**Mô tả:** Xóa một conversation trong sidebar. Xóa cả messages liên quan.

**Response:**
```json
{
  "message": "Xóa session thành công",
  "session_id": 1
}
```

---

### 1.8. Upload ảnh trong chat
**Endpoint:** `POST /chat/upload-image`  
**Auth:** Public  
**Content-Type:** `multipart/form-data`  
**Mô tả:** Upload ảnh và trả về URL. Frontend sẽ gửi URL này kèm message.

**Request:**
- Form field: `file` (image file)

**Response:**
```json
{
  "url": "https://placeholder.com/chat/1234567890-image.png",
  "filename": "image.png",
  "size": 123456
}
```

**Validation:**
- Allowed types: JPEG, PNG, GIF, WebP
- Max size: 5MB

**Note:** Hiện tại chỉ trả về placeholder URL. Cần implement upload lên cloud storage (S3, Cloudinary).

---

### 1.9. Đánh dấu tin nhắn đã đọc
**Endpoint:** `PUT /chat/messages/:id/read`  
**Auth:** Public  
**Mô tả:** Đánh dấu một tin nhắn đã đọc (Optional - có thể bỏ)

**Response:**
```json
{
  "message": "Đánh dấu đã đọc thành công",
  "message_id": 1
}
```

---

## 🤖 2. RASA CHATBOT INTEGRATION APIs

### Base URL: `/ai`

---

### 2.1. Chatbot AI (Proxy đến Rasa Server)
**Endpoint:** `POST /ai/chatbot`  
**Auth:** Public  
**Mô tả:** Gửi tin nhắn đến Rasa chatbot. API này hoạt động như proxy.

**Request Body:**
```json
{
  "message": "Tôi muốn tìm áo thun",
  "session_id": "uuid-or-customer-id"
}
```

**Response:**
```json
{
  "responses": [
    {
      "text": "Tôi đã tìm thấy 10 sản phẩm áo thun..."
    }
  ],
  "session_id": "uuid-or-customer-id"
}
```

**Response (Fallback - Rasa down):**
```json
{
  "responses": [
    {
      "text": "Xin lỗi, chatbot hiện không khả dụng. Vui lòng thử lại sau."
    }
  ],
  "session_id": "uuid-or-customer-id",
  "error": "Rasa server unavailable"
}
```

**Logic:**
1. Gửi request đến Rasa Server: `POST {RASA_SERVER_URL}/webhooks/rest/webhook`
2. Tìm hoặc tạo chat session dựa trên `customer_id` (nếu login) hoặc `session_id` (nếu guest)
3. Lưu user message vào DB
4. Lưu bot responses vào DB
5. Trả về responses cho client

**Environment Variables:**
- `RASA_SERVER_URL`: URL của Rasa server (VD: http://localhost:5005)

**Rasa Request Format:**
```json
{
  "sender": "session_id_or_customer_id",
  "message": "user message"
}
```

**Rasa Response Format:**
```json
[
  {
    "text": "Bot response message"
  }
]
```

---

## 🖼️ 3. IMAGE SEARCH API

### Base URL: `/ai`

---

### 3.1. Tìm kiếm sản phẩm bằng ảnh
**Endpoint:** `POST /ai/search/image`  
**Auth:** Public  
**Content-Type:** `multipart/form-data`  
**Mô tả:** Upload ảnh để tìm sản phẩm tương tự. Sử dụng FastAPI để encode ảnh thành vector và pgvector để tìm kiếm.

**Request:**
- Form field: `image` (image file)

**Response:**
```json
{
  "message": "Image search completed",
  "results": [
    {
      "id": 1,
      "name": "Áo thun nam",
      "price": 150000,
      "images": [
        {
          "id": 1,
          "image_url": "https://example.com/product1.jpg",
          "is_primary": true
        }
      ],
      "category": {
        "id": 1,
        "name": "Áo thun"
      },
      "status": "Active"
    }
  ],
  "count": 10
}
```

**Response (Service unavailable):**
```json
{
  "message": "Image search service unavailable",
  "results": [],
  "count": 0,
  "error": "error message"
}
```

**Logic:**
1. **Encode ảnh thành vector** (sử dụng FastAPI service):
   - Gửi image đến `{FASTAPI_SERVICE_URL}/ai/encode-image`
   - Nhận về vector 512 chiều
   
2. **Tìm kiếm similar images** (sử dụng pgvector):
   - Query database với pgvector operator `<->` (cosine distance)
   - Tìm 20 images gần nhất
   - Lấy unique product IDs
   
3. **Fetch product details**:
   - Join với bảng products, categories
   - Filter status = 'Active'
   - Trả về top 10 products

**Database Schema:**
```sql
-- product_images table có column:
image_vector vector(512) -- pgvector type

-- Query example:
SELECT product_id, image_vector <-> '[0.1,0.2,...]'::vector AS distance
FROM product_images
WHERE image_vector IS NOT NULL
ORDER BY distance ASC
LIMIT 20;
```

**Environment Variables:**
- `FASTAPI_SERVICE_URL`: URL của FastAPI service (VD: http://localhost:8000)

**Current Implementation:**
- Hiện tại đang dùng **mock vector** (random array) để test
- Cần implement actual FastAPI integration khi FastAPI service ready

**Dependencies:**
- PostgreSQL với extension `pgvector`
- FastAPI service cho image encoding (CLIP model hoặc tương tự)

---

## 🗄️ 4. DATABASE SCHEMA

### ChatSession
```typescript
{
  id: number (PK, auto increment)
  customer_id: number (FK -> customers.id, nullable)
  visitor_id: string (nullable, UUID cho guest)
  status: string (default: 'active')
  created_at: timestamp
  updated_at: timestamp
}
```

### ChatMessage
```typescript
{
  id: number (PK, auto increment)
  session_id: number (FK -> chat_sessions.id)
  sender: string ('customer' | 'bot')
  message: text
  is_read: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

### ProductImage
```typescript
{
  id: number (PK)
  product_id: number (FK)
  image_url: string
  is_primary: boolean
  image_vector: vector(512) // pgvector
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 🔧 5. CONFIGURATION

### Environment Variables
```env
# Rasa Server
RASA_SERVER_URL=http://localhost:5005

# FastAPI Service (Image AI)
FASTAPI_SERVICE_URL=http://localhost:8000

# Database (pgvector)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=kltn_db
DATABASE_USER=postgres
DATABASE_PASSWORD=password
```

---

## 📝 6. NOTES & TODO

### Current Status
✅ **Hoàn thành:**
- Chat session management (create, get, merge)
- Chat message management (send, history, read)
- Rasa integration với fallback
- Image search với pgvector (mock vector)
- Upload image trong chat (placeholder URL)

⚠️ **Cần hoàn thiện:**
- Image upload: Implement cloud storage (S3, Cloudinary)
- Image search: Integrate với FastAPI service thực tế
- Notification: Real-time chat với WebSocket/Socket.io
- Admin panel: Quản lý chat sessions, trả lời thủ công

### Security Notes
- Tất cả API đều Public (không cần auth) để hỗ trợ guest users
- Với logged-in users, sử dụng JWT token để identify customer
- Validate file upload: type, size
- Sanitize user input trước khi lưu DB

### Performance Considerations
- Chat history có pagination (limit, offset)
- Image search giới hạn top 20 similar images → top 10 products
- Session query có index trên `customer_id` và `visitor_id`
- Messages query có index trên `session_id` và `created_at`

---

## 📞 7. INTEGRATION EXAMPLES

### Frontend Integration Flow

#### 7.1. Guest User Flow
```javascript
// 1. Tạo visitor_id (UUID)
const visitorId = crypto.randomUUID();

// 2. Tạo session
const session = await fetch('/chat/session', {
  method: 'POST',
  body: JSON.stringify({ visitor_id: visitorId })
});

// 3. Gửi message
const response = await fetch('/chat/send', {
  method: 'POST',
  body: JSON.stringify({
    session_id: session.session_id,
    message: 'Xin chào'
  })
});
```

#### 7.2. Logged-in User Flow
```javascript
// 1. Tạo session (với JWT token)
const session = await fetch('/chat/session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({}) // không cần visitor_id
});

// 2. Gửi message
const response = await fetch('/chat/send', {
  method: 'POST',
  body: JSON.stringify({
    session_id: session.session_id,
    message: 'Tôi muốn tìm áo'
  })
});
```

#### 7.3. Login & Merge Flow
```javascript
// User vừa login → merge old visitor session
await fetch('/chat/merge', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    visitor_id: oldVisitorId
  })
});
```

#### 7.4. Image Search Flow
```javascript
// Upload ảnh để tìm sản phẩm
const formData = new FormData();
formData.append('image', imageFile);

const result = await fetch('/ai/search/image', {
  method: 'POST',
  body: formData
});

// Hiển thị products tương tự
console.log(result.results); // Array of products
```

---

## 🎯 8. API SUMMARY TABLE

| Endpoint | Method | Auth | Mô tả |
|----------|--------|------|-------|
| `/chat/session` | POST | Public | Tạo/lấy session |
| `/chat/history` | GET | Public | Lấy lịch sử chat |
| `/chat/send` | POST | Public | Gửi tin nhắn |
| `/chat/merge` | PUT | Required | Merge sessions |
| `/chat/sessions/history` | GET | Public | Danh sách sessions |
| `/chat/sessions/active` | GET | Public | Session active |
| `/chat/sessions/:id` | DELETE | Public | Xóa session |
| `/chat/upload-image` | POST | Public | Upload ảnh chat |
| `/chat/messages/:id/read` | PUT | Public | Đánh dấu đã đọc |
| `/ai/chatbot` | POST | Public | Proxy đến Rasa |
| `/ai/search/image` | POST | Public | Tìm kiếm bằng ảnh |

---

**Ngày tạo:** 2024-12-07  
**Version:** 1.0  
**Author:** Chatbot AI Team
