# YÊU CẦU BỔ SUNG API - CUSTOMER DETAIL PAGE (Update)

## 📋 Vấn đề hiện tại

Sau khi integrate các API cơ bản, phát hiện thêm 1 số điểm cần cải thiện:

---

## 🔥 **PRIORITY HIGH - Cần ngay**

### 1️⃣ GET `/admin/customers/:customerId/chat-history/:sessionId/messages`

**Mục đích:** Lấy đầy đủ tin nhắn của một cuộc hội thoại cụ thể khi admin click vào.

**Hiện tại:** 
- API `GET /admin/customers/:id/chat-history` chỉ trả về danh sách conversations với `messages: []` (array rỗng)
- Không có cách nào để xem chi tiết tin nhắn trong conversation

**Yêu cầu:**

```typescript
// Request
GET /admin/customers/{customerId}/chat-history/{sessionId}/messages
Authorization: Bearer <admin_access_token>

// Query params (optional)
{
  limit?: number,     // Default 50
  offset?: number     // Default 0
}

// Response
{
  "data": {
    "session": {
      "id": "46",
      "customer_id": 1,
      "status": "resolved" | "unresolved",
      "created_at": "2025-12-26T05:03:14.866Z",
      "updated_at": "2025-12-26T05:03:14.866Z"
    },
    "messages": [
      {
        "id": "msg_123",
        "session_id": "46",
        "role": "user" | "bot" | "admin",
        "content": "Xin chào, tôi muốn hỏi về sản phẩm...",
        "created_at": "2025-12-26T05:05:00.000Z",
        "metadata": {
          "intent": "product_inquiry",      // Optional
          "confidence": 0.95,                 // Optional
          "admin_id": null                    // Nếu role = admin
        }
      },
      {
        "id": "msg_124",
        "session_id": "46",
        "role": "bot",
        "content": "Vâng, tôi có thể giúp gì cho bạn?",
        "created_at": "2025-12-26T05:05:02.000Z",
        "metadata": {
          "intent": "greeting_response",
          "confidence": 0.98
        }
      }
    ],
    "total": 12,
    "has_more": false
  }
}

// Error responses
404 - Session not found
403 - Forbidden (nếu session không thuộc customer này)
401 - Unauthorized
```

**Use case:**
- Admin click vào row trong bảng chat history
- Frontend gọi API này để load đầy đủ tin nhắn
- Hiển thị trong modal popup

**Technical notes:**
- Messages phải được sắp xếp theo `created_at` ASC (cũ → mới)
- `role` field rất quan trọng để hiển thị đúng UI (user bên trái, bot/admin bên phải)
- Nếu có metadata như `intent`, confidence score → rất hữu ích cho admin phân tích

---

## 📌 **Cải tiến API hiện có**

### 2️⃣ GET `/admin/customers/:id/chat-history` - Thêm option include messages

**Hiện tại:** Response trả về `messages: []` (luôn rỗng)

**Đề xuất:** Thêm query param để có thể include một số messages preview

```typescript
GET /admin/customers/:id/chat-history?include_messages=true&message_limit=3

// Response sẽ bao gồm 3 tin nhắn gần nhất của mỗi conversation
{
  "data": [
    {
      "id": "46",
      "customer_id": 1,
      "status": "unresolved",
      "intents": [],
      "message_count": 12,
      "last_message_at": "2025-12-26T05:15:00.000Z",
      "created_at": "2025-12-26T05:03:14.866Z",
      "messages": [  // ← 3 tin nhắn gần nhất
        { "id": "msg_10", "role": "user", "content": "...", "created_at": "..." },
        { "id": "msg_11", "role": "bot", "content": "...", "created_at": "..." },
        { "id": "msg_12", "role": "user", "content": "...", "created_at": "..." }
      ]
    }
  ]
}
```

**Lợi ích:**
- Admin có thể preview nội dung trước khi click xem chi tiết
- Giảm số lần gọi API

---

## 🎯 **Priority thấp - Nice to have**

### 3️⃣ Thêm thống kê cho chat history

**Đề xuất:** Thêm endpoint để lấy stats

```typescript
GET /admin/customers/:id/chat-statistics

Response:
{
  "data": {
    "total_conversations": 15,
    "resolved_conversations": 10,
    "unresolved_conversations": 5,
    "total_messages": 250,
    "avg_messages_per_conversation": 16.7,
    "most_common_intents": [
      { "intent": "product_inquiry", "count": 8 },
      { "intent": "order_status", "count": 5 }
    ],
    "last_conversation_at": "2025-12-26T05:15:00.000Z"
  }
}
```

---

## 📝 **Tóm tắt ưu tiên**

| Priority | Endpoint | Status | Mô tả |
|----------|----------|--------|-------|
| 🔥 **HIGH** | `GET /admin/customers/:id/chat-history/:sessionId/messages` | ❌ Chưa có | **CẦN NGAY** - Load chi tiết tin nhắn khi click conversation |
| 🟡 Medium | `GET /admin/customers/:id/chat-history?include_messages=true` | ⚠️ Cải tiến | Thêm preview messages trong list |
| 🟢 Low | `GET /admin/customers/:id/chat-statistics` | 💡 Nice to have | Thống kê chat history |

---

## ✅ **Testing checklist**

Khi implement API mới, cần test:

- [ ] Session không tồn tại → return 404
- [ ] Session thuộc customer khác → return 403
- [ ] No auth token → return 401
- [ ] Messages được sort đúng thứ tự (cũ → mới)
- [ ] Role field đúng: user/bot/admin
- [ ] Pagination hoạt động (limit, offset)
- [ ] Performance: Query <100ms với 100+ messages
- [ ] Metadata fields (intent, confidence) có thể null/undefined

---

## 🔧 **Frontend sẵn sàng**

Frontend đã chuẩn bị sẵn:
- ✅ State management cho conversation messages
- ✅ UI modal để hiển thị full conversation
- ✅ Loading states
- ✅ Error handling
- ✅ TypeScript interfaces

Chỉ cần backend implement API là có thể integrate ngay!
