# 🚨 BACKEND BUG: Missing `custom` Field in Chat Response

**Priority:** HIGH  
**Impact:** Product cards không hiển thị trong chat  
**Date:** 14/12/2025

---

## 📋 PROBLEM

API `/api/v1/chat/send` response **THIẾU `custom` field** trong `bot_responses`.

### Current Response (WRONG):
```json
{
  "customer_message": {...},
  "bot_responses": [
    {
      "id": 2,
      "sender": "bot",
      "message": "Tôi đã tìm thấy 5 sản phẩm...",
      "created_at": "2025-12-14T03:00:02.000Z"
      // ❌ MISSING: custom field
    }
  ]
}
```

### Expected Response (CORRECT):
```json
{
  "customer_message": {...},
  "bot_responses": [
    {
      "id": 2,
      "sender": "bot",
      "message": "Tôi đã tìm thấy 5 sản phẩm...",
      "created_at": "2025-12-14T03:00:02.000Z",
      "custom": {                           // ← MISSING THIS
        "type": "product_list",
        "products": [
          {
            "product_id": 496,
            "name": "Áo thun basic",
            "price": 26.00,
            "thumbnail": "https://...",
            "slug": "ao-thun-basic",
            "in_stock": true
          }
        ]
      }
    }
  ]
}
```

---

## 🔍 ROOT CAUSE

**Rasa trả về có `custom` data:**
```json
[
  {
    "text": "Tôi đã tìm thấy...",
    "custom": {
      "type": "product_list",
      "products": [...]
    }
  }
]
```

**Nhưng Backend chỉ lưu `text` vào DB, không forward `custom` cho Frontend!**

---

## 🔧 SOLUTION

### File: `src/chat/chat.service.ts` (hoặc tương tự)

**Method:** `sendMessage()` hoặc `handleSendMessage()`

#### Before (WRONG):
```typescript
async sendMessage(dto: SendMessageDto) {
  // 1. Save customer message
  const customerMessage = await this.chatMessageRepository.save({
    session_id: dto.session_id,
    sender: 'customer',
    message: dto.message,
  });

  // 2. Call Rasa
  const rasaResponse = await this.callRasaWebhook({
    sender: `customer_${customerId}`,
    message: dto.message,
    metadata: { customer_id: customerId, session_id: dto.session_id }
  });

  // 3. Save bot responses (TEXT ONLY) ❌
  const botMessages = await Promise.all(
    rasaResponse.map(async (rasaMsg) => {
      return await this.chatMessageRepository.save({
        session_id: dto.session_id,
        sender: 'bot',
        message: rasaMsg.text,  // ❌ Only saving text
      });
    })
  );

  // 4. Return (MISSING custom data) ❌
  return {
    customer_message: customerMessage,
    bot_responses: botMessages,  // ❌ No custom field
  };
}
```

#### After (CORRECT):
```typescript
async sendMessage(dto: SendMessageDto) {
  // 1. Save customer message (same)
  const customerMessage = await this.chatMessageRepository.save({
    session_id: dto.session_id,
    sender: 'customer',
    message: dto.message,
  });

  // 2. Call Rasa (same)
  const rasaResponse = await this.callRasaWebhook({
    sender: `customer_${customerId}`,
    message: dto.message,
    metadata: { customer_id: customerId, session_id: dto.session_id }
  });

  // 3. Save bot responses + Extract custom data ✅
  const botMessages = await Promise.all(
    rasaResponse.map(async (rasaMsg) => {
      // Save to DB (text only)
      const savedMessage = await this.chatMessageRepository.save({
        session_id: dto.session_id,
        sender: 'bot',
        message: rasaMsg.text,
      });

      // ✅ ATTACH custom data from Rasa (not saved in DB)
      return {
        id: savedMessage.id,
        session_id: savedMessage.session_id,
        sender: savedMessage.sender,
        message: savedMessage.message,
        created_at: savedMessage.created_at,
        is_read: savedMessage.is_read,
        custom: rasaMsg.custom || undefined,    // ← ADD THIS
        buttons: rasaMsg.buttons || undefined,  // ← ADD THIS (for quick replies)
      };
    })
  );

  // 4. Return WITH custom data ✅
  return {
    customer_message: customerMessage,
    bot_responses: botMessages,  // ✅ Now includes custom field
  };
}
```

---

## 🧪 TEST VERIFICATION

### Test 1: Product Search

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/chat/send \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 123,
    "message": "Tìm áo thun"
  }'
```

**Expected Response:**
```json
{
  "customer_message": {
    "id": 1,
    "message": "Tìm áo thun",
    "sender": "customer"
  },
  "bot_responses": [
    {
      "id": 2,
      "message": "Tôi tìm thấy 5 áo thun:",
      "sender": "bot",
      "custom": {                         // ← MUST EXIST
        "type": "product_list",
        "products": [
          {
            "product_id": 496,
            "name": "Áo thun basic",
            "price": 26.00,
            "thumbnail": "https://...",
            "in_stock": true
          }
        ]
      }
    }
  ]
}
```

**Verification:**
```bash
# Check if custom field exists
response.bot_responses[0].custom !== undefined  // ✅ Must be true
response.bot_responses[0].custom.type === "product_list"  // ✅ Must match
response.bot_responses[0].custom.products.length > 0  // ✅ Must have products
```

---

### Test 2: With Buttons (Quick Replies)

**User:** "Tôi muốn huỷ đơn hàng"

**Expected Response:**
```json
{
  "bot_responses": [
    {
      "message": "Bạn có chắc muốn huỷ đơn #ORD-12345?",
      "sender": "bot",
      "buttons": [                        // ← MUST EXIST
        {
          "title": "Có, huỷ đơn",
          "payload": "/cancel_order{\"order_id\":12345}"
        },
        {
          "title": "Không, giữ đơn",
          "payload": "/keep_order"
        }
      ]
    }
  ]
}
```

---

## 📊 DATABASE vs RESPONSE

**Important Note:**

| Field | Database | API Response | Reason |
|-------|----------|--------------|--------|
| `message` (text) | ✅ Saved | ✅ Returned | Core message |
| `sender` | ✅ Saved | ✅ Returned | Identify speaker |
| `custom` | ❌ NOT Saved | ✅ Returned | Real-time only, too large |
| `buttons` | ❌ NOT Saved | ✅ Returned | Real-time only |

**Why not save `custom` in DB?**
- Product data thay đổi (price, stock)
- Dữ liệu lớn, không cần lưu lâu dài
- Chỉ cần hiển thị 1 lần khi chat realtime

**Database Schema (chat_messages table):**
```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL,
  sender VARCHAR(50) NOT NULL,  -- 'customer' | 'bot'
  message TEXT NOT NULL,        -- Text message only
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
  -- NO custom column needed
);
```

---

## ✅ CHECKLIST

Before marking as fixed, verify:

- [ ] `custom` field xuất hiện trong response khi Rasa trả về custom data
- [ ] `buttons` field xuất hiện khi Rasa trả về buttons
- [ ] Test với Postman: gửi message "Tìm áo thun" → check `custom.products`
- [ ] Test với Frontend: ProductCarousel hiển thị đúng
- [ ] Test chat history: messages vẫn load được (không cần custom)
- [ ] Performance: response time không tăng đáng kể

---

## 🔗 RELATED FILES

- Frontend: `lib/stores/useChatStore.ts:282-290` (đã sẵn sàng nhận custom)
- Frontend: `components/chatbot/MessageRenderer.tsx:36-50` (đã render ProductCarousel)
- Backend Doc: `CHATBOT_API_DOCUMENTATION.md:211-233` (cần update example)
- Testing Guide: `CHATBOT_PRODUCT_CARDS_TESTING.md`

---

## 📞 CONTACT

**Reporter:** Frontend Team  
**Assignee:** Backend Team  
**Priority:** HIGH (blocking product cards feature)  
**Estimated Fix Time:** 30 minutes
