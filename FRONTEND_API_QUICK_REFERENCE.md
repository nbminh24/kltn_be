# 🚀 Admin Chatbot APIs - Quick Reference

**Status:** ✅ ALL READY - Tất cả APIs đã sẵn sàng để integrate  
**Base URL:** `http://localhost:3000`  
**Auth:** JWT Bearer Token

---

## 📊 Dashboard Analytics

```typescript
// 1. Overview Stats
GET /admin/chatbot/analytics
→ Returns: total_sessions, total_messages, avg_messages, daily_activity

// 2. Top Intents (NEW - Intent tracking ready!)
GET /admin/chatbot/top-intents?limit=10
→ Returns: [{ intent, count, percentage }]

// 3. Pending Conversations (chờ admin)
GET /api/v1/chat/conversations/pending
→ Returns: conversations với status = 'human_pending'

// 4. Active Conversations (đang xử lý)
GET /api/v1/chat/conversations/admin/:adminId
→ Returns: conversations với status = 'human_active'
```

---

## 💬 Conversation Logs

```typescript
// 5. List All Conversations
GET /admin/chatbot/conversations?page=1&limit=20&search=nguyen
→ Returns: conversations[] + pagination

// 6. Conversation Detail + Messages
GET /admin/chatbot/conversations/:id
→ Returns: session + messages[] (đầy đủ lịch sử chat)

// 7. Problematic Conversations
GET /admin/chatbot/unanswered
→ Returns: conversations với message_count cao
```

---

## 💬 Chat Interface (Real-time Admin Chat)

```typescript
// 8. Get Chat History
GET /api/v1/chat/history?session_id=123&limit=50
→ Returns: session + messages[] + total

// 9. Admin Accept Conversation
POST /api/v1/chat/conversations/:id/accept?admin_id=1
→ Action: pending → active

// 10. Admin Send Message
POST /api/v1/chat/conversations/:id/admin-message?admin_id=1
Body: { "message": "Hello..." }
→ Returns: saved message

// 11. Admin Close Conversation
POST /api/v1/chat/conversations/:id/close?admin_id=1
→ Action: active → closed
```

---

## 🔥 Intent Tracking (NEW!)

**Rasa đã implement xong** → Backend tự động lưu intent vào DB

Trong mọi bot response, sẽ có `intent` field:
```typescript
{
  id: 123,
  sender: "bot",
  message: "Đây là sản phẩm phù hợp...",
  intent: "product_inquiry", // ← NEW!
  created_at: "2026-01-10T..."
}
```

Intents được track:
- `product_inquiry` - Hỏi về sản phẩm
- `order_status` - Tra cứu đơn hàng
- `check_product_availability` - Kiểm tra tồn kho
- `ask_styling_advice` - Tư vấn phối đồ
- `ask_sizing_advice` - Tư vấn size
- `check_discount` - Hỏi khuyến mãi
- `ask_shipping_info` - Thông tin vận chuyển
- `ask_return_policy` - Chính sách đổi trả
- `request_human_agent` - Chuyển human support
- ... và tất cả intents khác

---

## 🎨 Response Examples

### Top Intents
```json
GET /admin/chatbot/top-intents?limit=5
{
  "intents": [
    { "intent": "product_inquiry", "count": 456, "percentage": 28 },
    { "intent": "order_status", "count": 389, "percentage": 24 },
    { "intent": "check_discount", "count": 312, "percentage": 19 },
    { "intent": "ask_styling_advice", "count": 245, "percentage": 15 },
    { "intent": "check_product_availability", "count": 198, "percentage": 12 }
  ],
  "total_conversations": 1600,
  "total_intents_tracked": 5
}
```

### Conversation Detail
```json
GET /admin/chatbot/conversations/123
{
  "session": {
    "id": 123,
    "status": "closed",
    "customer": { "name": "Nguyễn Văn A", "email": "..." }
  },
  "messages": [
    {
      "id": 1,
      "sender": "customer",
      "message": "Tôi muốn xem áo sơ mi",
      "intent": null
    },
    {
      "id": 2,
      "sender": "bot",
      "message": "Đây là các áo sơ mi phù hợp...",
      "intent": "product_inquiry"
    },
    {
      "id": 3,
      "sender": "admin",
      "message": "Xin chào, tôi có thể giúp gì?",
      "intent": null
    }
  ],
  "message_count": 3
}
```

### Chat History
```json
GET /api/v1/chat/history?session_id=123
{
  "session": {
    "id": 123,
    "status": "human_active",
    "assigned_admin_id": 1,
    "customer": { "name": "...", "email": "..." }
  },
  "messages": [
    { "id": 1, "sender": "customer", "message": "...", "created_at": "..." },
    { "id": 2, "sender": "bot", "message": "...", "intent": "...", "created_at": "..." }
  ],
  "total": 15
}
```

---

## 🔄 Real-time Updates

**Hiện tại:** Chưa có WebSocket

**Solution:** Polling - gọi API mỗi 3-5 giây

```typescript
// Polling example cho chat interface
setInterval(() => {
  fetch(`/api/v1/chat/history?session_id=${sessionId}&limit=50`)
    .then(res => res.json())
    .then(data => {
      if (data.messages.length > currentMessageCount) {
        updateChatUI(data.messages);
      }
    });
}, 3000); // Poll every 3 seconds
```

---

## ✅ Ready to Start

1. ✅ Database migration đã chạy
2. ✅ Intent tracking đã hoạt động (Rasa đã implement)
3. ✅ Tất cả 11 APIs đã sẵn sàng
4. ✅ Response format đã chuẩn hóa

**Frontend có thể bắt đầu integrate ngay!**

---

## 📞 Support

- **Swagger API Docs:** `http://localhost:3000/api-docs`
- **Full Documentation:** Xem `FRONTEND_API_DOCUMENTATION.md`
