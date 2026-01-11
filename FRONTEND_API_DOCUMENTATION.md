# 📡 Admin Chatbot APIs - Frontend Documentation

**To:** Team Frontend  
**From:** Backend Team  
**Date:** 2026-01-10  
**Status:** ✅ READY TO INTEGRATE

---

## 🎯 APIs Available

Tất cả APIs đã sẵn sàng để tích hợp vào admin dashboard.

---

## 📊 1. Dashboard Analytics - `/admin/chatbot`

### **GET /admin/chatbot/analytics**

Lấy thống kê tổng quan chatbot.

**Request:**
```typescript
GET /admin/chatbot/analytics
```

**Response:**
```typescript
{
  overview: {
    total_sessions: 1250,
    total_messages: 8934,
    avg_messages_per_session: 7.15,
    customer_messages: 4500,
    bot_messages: 4434
  },
  daily_activity: [
    { date: '2026-01-01', sessions: 45 },
    { date: '2026-01-02', sessions: 52 },
    // ... last 30 days
  ]
}
```

---

### **GET /admin/chatbot/top-intents?limit=10** ✨ NEW

Lấy top intents được detect từ conversations.

**Request:**
```typescript
GET /admin/chatbot/top-intents?limit=10
```

**Query params:**
- `limit` (optional): Số lượng top intents, default = 10

**Response:**
```typescript
{
  intents: [
    { intent: 'product_inquiry', count: 456, percentage: 28 },
    { intent: 'order_status', count: 389, percentage: 24 },
    { intent: 'check_discount', count: 312, percentage: 19 },
    { intent: 'ask_styling_advice', count: 245, percentage: 15 },
    { intent: 'check_product_availability', count: 198, percentage: 12 }
  ],
  total_conversations: 1650,
  total_intents_tracked: 5
}
```

**UI Mapping:**
- Hiển thị chart với `intent`, `count`, `percentage`
- Dùng `total_conversations` để tính metrics

---

### **GET /api/v1/chat/conversations/pending**

Lấy danh sách conversations đang chờ admin (status = `human_pending`).

**Request:**
```typescript
GET /api/v1/chat/conversations/pending
```

**Response:**
```typescript
{
  total: 5,
  conversations: [
    {
      session_id: 123,
      customer: {
        id: 45,
        name: "Nguyễn Văn A",
        email: "nguyenvana@email.com"
      },
      visitor_id: "visitor_abc123",
      handoff_reason: "customer_request",
      handoff_requested_at: "2026-01-10T10:30:00Z",
      created_at: "2026-01-10T09:00:00Z"
    }
  ]
}
```

---

### **GET /api/v1/chat/conversations/admin/:adminId**

Lấy conversations đang active với admin (status = `human_active`).

**Request:**
```typescript
GET /api/v1/chat/conversations/admin/1
```

**Response:**
```typescript
{
  total: 3,
  conversations: [
    {
      session_id: 124,
      customer: {
        id: 46,
        name: "Trần Thị B",
        email: "tranthib@email.com"
      },
      visitor_id: null,
      handoff_reason: "complex_inquiry",
      handoff_accepted_at: "2026-01-10T11:00:00Z",
      updated_at: "2026-01-10T11:15:00Z"
    }
  ]
}
```

---

## 💬 2. Conversation Logs - `/admin/chatbot/conversations`

### **GET /admin/chatbot/conversations**

Lấy danh sách tất cả conversations với filters.

**Request:**
```typescript
GET /admin/chatbot/conversations?page=1&limit=20&search=nguyen
```

**Query params:**
- `page` (optional): Trang hiện tại, default = 1
- `limit` (optional): Số conversations mỗi trang, default = 20
- `search` (optional): Tìm kiếm theo customer email hoặc visitor_id

**Response:**
```typescript
{
  conversations: [
    {
      id: 123,
      customer_id: 45,
      visitor_id: null,
      status: "closed",
      created_at: "2026-01-10T09:00:00Z",
      updated_at: "2026-01-10T11:30:00Z",
      customer: {
        id: 45,
        name: "Nguyễn Văn A",
        email: "nguyenvana@email.com"
      }
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

---

### **GET /admin/chatbot/conversations/:id**

Lấy chi tiết 1 conversation **kèm toàn bộ messages**.

**Request:**
```typescript
GET /admin/chatbot/conversations/123
```

**Response:**
```typescript
{
  session: {
    id: 123,
    customer_id: 45,
    visitor_id: null,
    status: "closed",
    assigned_admin_id: 1,
    handoff_requested_at: "2026-01-10T10:30:00Z",
    handoff_accepted_at: "2026-01-10T11:00:00Z",
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-01-10T11:30:00Z",
    customer: {
      id: 45,
      name: "Nguyễn Văn A",
      email: "nguyenvana@email.com"
    }
  },
  messages: [
    {
      id: 1,
      sender: "customer",
      message: "Tôi muốn xem áo sơ mi",
      intent: null,
      image_url: null,
      created_at: "2026-01-10T09:01:00Z"
    },
    {
      id: 2,
      sender: "bot",
      message: "Đây là các áo sơ mi phù hợp với bạn...",
      intent: "product_inquiry",
      custom: { /* ... */ },
      buttons: [ /* ... */ ],
      created_at: "2026-01-10T09:01:05Z"
    },
    {
      id: 3,
      sender: "admin",
      message: "Xin chào, tôi có thể giúp gì cho bạn?",
      intent: null,
      created_at: "2026-01-10T11:00:30Z"
    }
  ],
  message_count: 15
}
```

**UI Mapping:**
- Hiển thị modal với `messages` array
- `sender`: "customer" | "bot" | "admin"
- `intent`: hiển thị badge nếu có

---

### **GET /admin/chatbot/unanswered**

Lấy các conversations có message count cao (user gặp khó khăn).

**Request:**
```typescript
GET /admin/chatbot/unanswered
```

**Response:**
```typescript
{
  unanswered_sessions: [
    {
      id: 125,
      customer: { /* ... */ },
      message_count: 18,
      // ... other fields
    }
  ],
  count: 12
}
```

---

## 💬 3. Chat Interface - `/admin/chatbot/chat/:id`

### **GET /api/v1/chat/history?session_id=123&limit=50**

Lấy lịch sử chat để hiển thị trong chat interface.

**Request:**
```typescript
GET /api/v1/chat/history?session_id=123&limit=50&offset=0
```

**Query params:**
- `session_id` (required): ID của chat session
- `limit` (optional): Số messages, default = 50
- `offset` (optional): Pagination offset, default = 0

**Response:**
```typescript
{
  session: {
    id: 123,
    customer_id: 45,
    visitor_id: null,
    status: "human_active",
    assigned_admin_id: 1,
    handoff_requested_at: "2026-01-10T10:30:00Z",
    handoff_accepted_at: "2026-01-10T11:00:00Z",
    customer: {
      id: 45,
      name: "Nguyễn Văn A",
      email: "nguyenvana@email.com"
    }
  },
  messages: [
    {
      id: 1,
      session_id: 123,
      sender: "customer",
      message: "Hello",
      is_read: true,
      image_url: null,
      custom: null,
      buttons: null,
      created_at: "2026-01-10T09:00:00Z"
    }
  ],
  total: 15,
  limit: 50,
  offset: 0
}
```

---

### **POST /api/v1/chat/conversations/:id/accept?admin_id=1**

Admin accept conversation (chuyển từ `human_pending` → `human_active`).

**Request:**
```typescript
POST /api/v1/chat/conversations/123/accept?admin_id=1
```

**Response:**
```typescript
{
  success: true,
  message: "Conversation accepted",
  session: {
    id: 123,
    status: "human_active",
    assigned_admin_id: 1,
    handoff_accepted_at: "2026-01-10T11:00:00Z"
  }
}
```

---

### **POST /api/v1/chat/conversations/:id/admin-message?admin_id=1**

Admin gửi tin nhắn cho customer.

**Request:**
```typescript
POST /api/v1/chat/conversations/123/admin-message?admin_id=1
Content-Type: application/json

{
  "message": "Xin chào, tôi có thể giúp gì cho bạn?"
}
```

**Response:**
```typescript
{
  success: true,
  message: {
    id: 456,
    session_id: 123,
    sender: "admin",
    message: "Xin chào, tôi có thể giúp gì cho bạn?",
    created_at: "2026-01-10T11:00:30Z"
  }
}
```

---

### **POST /api/v1/chat/conversations/:id/close?admin_id=1**

Admin đóng conversation (chuyển về status = `closed`).

**Request:**
```typescript
POST /api/v1/chat/conversations/123/close?admin_id=1
```

**Response:**
```typescript
{
  success: true,
  message: "Conversation closed",
  session_id: 123
}
```

---

## 🔄 Real-time Updates

**Hiện tại:** Chưa có WebSocket.

**Giải pháp tạm thời:** Dùng **polling** - gọi `GET /api/v1/chat/history` mỗi 3-5 giây để check messages mới.

```typescript
// Polling example
setInterval(() => {
  fetch(`/api/v1/chat/history?session_id=${sessionId}&limit=50`)
    .then(res => res.json())
    .then(data => updateMessages(data.messages));
}, 3000); // Poll every 3 seconds
```

**Tương lai:** Backend sẽ implement WebSocket nếu cần.

---

## 📋 Status Codes Reference

- `bot` - Bot đang xử lý
- `human_pending` - Đang chờ admin accept
- `human_active` - Admin đang xử lý
- `closed` - Đã đóng conversation

---

## 🧪 Testing

Base URL: `http://localhost:3000` (development)

**Authentication:** Sử dụng JWT token trong header `Authorization: Bearer <token>`

**Postman Collection:** (Có thể export từ Swagger nếu cần)

---

## 📞 Support

Nếu có vấn đề khi integrate, liên hệ Backend Team.

**API Swagger:** `http://localhost:3000/api-docs`
