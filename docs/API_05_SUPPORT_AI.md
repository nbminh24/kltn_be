# 💬 Module 5: Support & AI

> **Support Tickets, Live Chat & AI Consultant APIs**  
> **Total Endpoints:** 18  
> **Last Updated:** December 5, 2025

---

## 📑 Table of Contents

### Support Tickets (Customer)
1. [GET /support/tickets](#1-get-supporttickets) - Danh sách tickets
2. [GET /support/tickets/:id](#2-get-supportticketsid) - Chi tiết ticket
3. [POST /support/tickets](#3-post-supporttickets) - Tạo ticket
4. [POST /support/tickets/:id/reply](#4-post-supportticketsidreply) - Trả lời ticket

### Live Chat (Customer)
5. [GET /chat/sessions](#5-get-chatsessions) - Danh sách chat sessions
6. [GET /chat/sessions/:id](#6-get-chatsessionsid) - Chi tiết session
7. [POST /chat/sessions](#7-post-chatsessions) - Tạo chat session
8. [POST /chat/sessions/:id/messages](#8-post-chatsessionsidmessages) - Gửi tin nhắn

### AI Consultant (Public)
9. [POST /consultant/sizing-advice](#9-post-consultantsizing-advice) - Tư vấn size
10. [POST /consultant/styling-advice](#10-post-consultantstyling-advice) - Tư vấn phối đồ
11. [POST /consultant/compare-products](#11-post-consultantcompare-products) - So sánh sản phẩm

### Admin - Support Management
12. [GET /admin/support-tickets](#12-get-adminsupport-tickets) - Danh sách tickets (Admin)
13. [GET /admin/support-tickets/:id](#13-get-adminsupport-ticketsid) - Chi tiết ticket (Admin)
14. [PUT /admin/support-tickets/:id](#14-put-adminsupport-ticketsid) - Cập nhật trạng thái
15. [POST /admin/support-tickets/:id/reply](#15-post-adminsupport-ticketsidreply) - Admin reply

### Admin - Chat Management
16. [GET /admin/chatbot/conversations](#16-get-adminchatbotconversations) - Danh sách conversations
17. [GET /admin/chatbot/analytics](#17-get-adminchatbotanalytics) - Analytics chatbot
18. [GET /admin/chatbot/unanswered](#18-get-adminchatbotunanswered) - Conversations cần hỗ trợ

---

# Support Tickets (Customer)

## 1. GET `/support/tickets`
**Danh sách tickets của customer**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request

#### Query Parameters
- `page`, `limit` (pagination)
- `status`: `open`, `in_progress`, `resolved`, `closed`

### 📤 Response

```json
{
  "data": [
    {
      "id": 101,
      "customer_id": 456,
      "subject": "Sản phẩm bị lỗi",
      "category": "product_issue",
      "status": "in_progress",
      "priority": "medium",
      "created_at": "2024-12-04T10:00:00Z",
      "updated_at": "2024-12-05T09:00:00Z",
      "last_reply_by": "admin",
      "unread_count": 1
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 2. GET `/support/tickets/:id`
**Chi tiết ticket**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "id": 101,
  "customer_id": 456,
  "customer_name": "Nguyễn Văn A",
  "customer_email": "user@example.com",
  "subject": "Sản phẩm bị lỗi",
  "category": "product_issue",
  "description": "Sản phẩm tôi nhận được bị lỗi...",
  "status": "in_progress",
  "priority": "medium",
  "created_at": "2024-12-04T10:00:00Z",
  "updated_at": "2024-12-05T09:00:00Z",
  "replies": [
    {
      "id": 501,
      "ticket_id": 101,
      "sender_type": "customer",
      "sender_name": "Nguyễn Văn A",
      "message": "Sản phẩm tôi nhận được bị lỗi...",
      "created_at": "2024-12-04T10:00:00Z"
    },
    {
      "id": 502,
      "ticket_id": 101,
      "sender_type": "admin",
      "sender_name": "Support Team",
      "message": "Chúng tôi xin lỗi về sự cố này. Vui lòng cung cấp hình ảnh sản phẩm...",
      "created_at": "2024-12-05T09:00:00Z"
    }
  ]
}
```

---

## 3. POST `/support/tickets`
**Tạo support ticket mới**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "subject": "Sản phẩm bị lỗi",
  "category": "product_issue",
  "description": "Sản phẩm tôi nhận được bị lỗi khi sử dụng...",
  "order_id": 789
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | ✅ | Tiêu đề (max 200 chars) |
| `category` | string | ✅ | Loại: `product_issue`, `order`, `account`, `other` |
| `description` | string | ✅ | Mô tả chi tiết (max 2000 chars) |
| `order_id` | number | ❌ | Liên quan đến đơn hàng nào |

### 📤 Response

```json
{
  "message": "Ticket đã được tạo. Chúng tôi sẽ phản hồi trong 24 giờ.",
  "ticket": {
    "id": 101,
    "subject": "Sản phẩm bị lỗi",
    "status": "open",
    "created_at": "2024-12-04T10:00:00Z"
  }
}
```

---

## 4. POST `/support/tickets/:id/reply`
**Trả lời ticket**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "message": "Đây là hình ảnh sản phẩm: [link]"
}
```

### 📤 Response

```json
{
  "message": "Gửi phản hồi thành công",
  "reply": {
    "id": 503,
    "message": "Đây là hình ảnh sản phẩm: [link]",
    "created_at": "2024-12-05T10:00:00Z"
  }
}
```

---

# Live Chat (Customer)

## 5. GET `/chat/sessions`
**Danh sách chat sessions**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "sessions": [
    {
      "id": 201,
      "customer_id": 456,
      "status": "active",
      "last_message": "Cảm ơn bạn đã hỗ trợ!",
      "last_message_at": "2024-12-05T10:30:00Z",
      "unread_count": 0,
      "created_at": "2024-12-05T10:00:00Z"
    }
  ]
}
```

---

## 6. GET `/chat/sessions/:id`
**Chi tiết chat session**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📤 Response

```json
{
  "id": 201,
  "customer_id": 456,
  "status": "active",
  "created_at": "2024-12-05T10:00:00Z",
  "messages": [
    {
      "id": 1001,
      "session_id": 201,
      "sender_type": "customer",
      "message": "Xin chào, tôi muốn hỏi về sản phẩm",
      "created_at": "2024-12-05T10:00:00Z"
    },
    {
      "id": 1002,
      "session_id": 201,
      "sender_type": "bot",
      "message": "Xin chào! Tôi có thể giúp gì cho bạn?",
      "created_at": "2024-12-05T10:00:05Z"
    }
  ]
}
```

---

## 7. POST `/chat/sessions`
**Tạo chat session mới**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "initial_message": "Xin chào, tôi cần hỗ trợ"
}
```

### 📤 Response

```json
{
  "message": "Chat session created",
  "session": {
    "id": 201,
    "status": "active",
    "created_at": "2024-12-05T10:00:00Z"
  }
}
```

---

## 8. POST `/chat/sessions/:id/messages`
**Gửi tin nhắn**

### 🔐 Authentication
**Required** - Bearer Token (Customer)

### 📥 Request Body

```json
{
  "message": "Sản phẩm XYZ còn hàng không?"
}
```

### 📤 Response

```json
{
  "message": {
    "id": 1003,
    "message": "Sản phẩm XYZ còn hàng không?",
    "created_at": "2024-12-05T10:05:00Z"
  },
  "bot_response": {
    "id": 1004,
    "message": "Sản phẩm XYZ hiện còn 45 sản phẩm trong kho.",
    "created_at": "2024-12-05T10:05:01Z"
  }
}
```

---

# AI Consultant (Public)

## 9. POST `/consultant/sizing-advice`
**Tư vấn size**

### 🔓 Authentication
**Public**

### 📥 Request Body

```json
{
  "height": 170,
  "weight": 65,
  "product_id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `height` | number | ✅ | Chiều cao (cm) |
| `weight` | number | ✅ | Cân nặng (kg) |
| `product_id` | number | ❌ | ID sản phẩm cụ thể |

### 📤 Response

```json
{
  "recommended_size": "M",
  "confidence": 0.85,
  "advice": "Với chiều cao 170cm và cân nặng 65kg, chúng tôi khuyên bạn nên chọn size M. Size này sẽ vừa vặn và thoải mái cho bạn.",
  "alternative_sizes": ["S", "L"],
  "size_chart": {
    "S": "155-165cm, 45-55kg",
    "M": "165-175cm, 55-70kg",
    "L": "175-180cm, 70-80kg"
  }
}
```

---

## 10. POST `/consultant/styling-advice`
**Tư vấn phối đồ**

### 🔓 Authentication
**Public**

### 📥 Request Body

```json
{
  "product_id": 1,
  "occasion": "office",
  "style_preference": "formal"
}
```

### 📤 Response

```json
{
  "advice": "Áo Sơ Mi Trắng này rất phù hợp cho môi trường văn phòng...",
  "recommended_combinations": [
    {
      "product_id": 10,
      "product_name": "Quần Âu Xám",
      "reason": "Phối hợp tạo style công sở chuyên nghiệp"
    },
    {
      "product_id": 15,
      "product_name": "Giày Tây Đen",
      "reason": "Hoàn thiện tổng thể trang phục"
    }
  ]
}
```

---

## 11. POST `/consultant/compare-products`
**So sánh sản phẩm**

### 🔓 Authentication
**Public**

### 📥 Request Body

```json
{
  "product_ids": [1, 2, 3]
}
```

### 📤 Response

```json
{
  "comparison": [
    {
      "product_id": 1,
      "name": "Áo Sơ Mi A",
      "price": 350000,
      "rating": 4.5,
      "material": "Cotton 100%",
      "pros": ["Chất liệu cao cấp", "Giá hợp lý"],
      "cons": ["Ít màu sắc"]
    },
    {
      "product_id": 2,
      "name": "Áo Sơ Mi B",
      "price": 280000,
      "rating": 4.2,
      "material": "Cotton pha",
      "pros": ["Giá rẻ", "Nhiều màu"],
      "cons": ["Chất liệu trung bình"]
    }
  ],
  "recommendation": {
    "product_id": 1,
    "reason": "Tốt nhất về chất lượng và đánh giá"
  }
}
```

---

# Admin - Support Management

## 12. GET `/admin/support-tickets`
**Danh sách tất cả tickets (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Query Parameters
- `page`, `limit`
- `status`: `open`, `in_progress`, `resolved`, `closed`
- `priority`: `low`, `medium`, `high`, `urgent`
- `category`: ticket categories
- `assigned_to`: admin ID

### 📤 Response

```json
{
  "data": [
    {
      "id": 101,
      "customer_id": 456,
      "customer_name": "Nguyễn Văn A",
      "customer_email": "user@example.com",
      "subject": "Sản phẩm bị lỗi",
      "category": "product_issue",
      "status": "in_progress",
      "priority": "medium",
      "assigned_to": 1,
      "assigned_to_name": "Admin User",
      "created_at": "2024-12-04T10:00:00Z",
      "last_reply_at": "2024-12-05T09:00:00Z"
    }
  ],
  "metadata": {...},
  "statistics": {
    "total": 150,
    "open": 25,
    "in_progress": 40,
    "resolved": 70,
    "closed": 15
  }
}
```

---

## 13. GET `/admin/support-tickets/:id`
**Chi tiết ticket (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

Same as customer view but includes:
- Customer full info (email, phone, order history)
- Internal notes
- Admin assignment history

---

## 14. PUT `/admin/support-tickets/:id`
**Cập nhật ticket**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "status": "resolved",
  "priority": "high",
  "assigned_to": 2,
  "internal_note": "Đã giải quyết và hoàn tiền cho khách"
}
```

### 📤 Response

```json
{
  "message": "Cập nhật ticket thành công",
  "ticket": {
    "id": 101,
    "status": "resolved",
    "updated_at": "2024-12-05T15:00:00Z"
  }
}
```

---

## 15. POST `/admin/support-tickets/:id/reply`
**Admin reply ticket**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request Body

```json
{
  "message": "Chúng tôi đã xử lý vấn đề của bạn..."
}
```

### 📤 Response

```json
{
  "message": "Gửi phản hồi thành công",
  "reply": {
    "id": 504,
    "message": "Chúng tôi đã xử lý vấn đề của bạn...",
    "sender_type": "admin",
    "created_at": "2024-12-05T15:00:00Z"
  }
}
```

### 🔄 Logic Flow
1. Create reply with sender_type = 'admin'
2. Update ticket `last_reply_at` and `last_reply_by = 'admin'`
3. Send email notification to customer
4. Return success

---

# Admin - Chat Management

## 16. GET `/admin/chatbot/conversations`
**Danh sách chat conversations (Admin)**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📥 Request

#### Query Parameters
- `page`, `limit`
- `status`: `active`, `resolved`, `needs_human`
- `date_from`, `date_to`

### 📤 Response

```json
{
  "data": [
    {
      "id": 201,
      "customer_id": 456,
      "customer_name": "Nguyễn Văn A",
      "status": "needs_human",
      "message_count": 15,
      "bot_satisfaction": 0.6,
      "created_at": "2024-12-05T10:00:00Z",
      "last_message_at": "2024-12-05T10:30:00Z"
    }
  ],
  "metadata": {...}
}
```

---

## 17. GET `/admin/chatbot/analytics`
**Analytics chatbot**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "overview": {
    "total_conversations": 1250,
    "active_conversations": 45,
    "resolved_by_bot": 980,
    "needs_human": 20,
    "average_response_time": 1.2,
    "bot_success_rate": 0.78
  },
  "popular_queries": [
    {
      "query": "Kiểm tra đơn hàng",
      "count": 350
    },
    {
      "query": "Sản phẩm còn hàng",
      "count": 280
    }
  ],
  "daily_stats": [
    {
      "date": "2024-12-05",
      "conversations": 85,
      "resolved": 70,
      "needs_human": 5
    }
  ]
}
```

---

## 18. GET `/admin/chatbot/unanswered`
**Conversations cần hỗ trợ**

### 🔐 Authentication
**Required** - Bearer Token (Admin)

### 📤 Response

```json
{
  "conversations": [
    {
      "id": 201,
      "customer_name": "Nguyễn Văn A",
      "last_message": "Tôi muốn đổi sản phẩm",
      "bot_confidence": 0.45,
      "created_at": "2024-12-05T10:00:00Z",
      "waiting_time": "30 minutes"
    }
  ]
}
```

---

## 🎯 Summary

### Support & AI Features

| Feature | Endpoints | Auth Level |
|---------|-----------|------------|
| **Customer Tickets** | 4 | Customer |
| **Customer Chat** | 4 | Customer |
| **AI Consultant** | 3 | Public |
| **Admin Support** | 4 | Admin |
| **Admin Chat** | 3 | Admin |
| **Total** | **18** | - |

---

## 🔍 Key Concepts

### Support Ticket Flow
```
Customer creates ticket (status: open)
  ↓
Admin assigns & replies (status: in_progress)
  ↓
Issue resolved (status: resolved)
  ↓
Customer confirms (status: closed)
```

### Ticket Categories
- `product_issue`: Sản phẩm lỗi
- `order`: Vấn đề đơn hàng
- `account`: Tài khoản
- `other`: Khác

### Chat Features
- **Chatbot:** AI trả lời tự động
- **Human Handoff:** Chuyển sang admin khi bot không trả lời được
- **Confidence Score:** Độ tin cậy của bot response
- **Session Management:** Track conversations

### AI Consultant
- **Sizing Advice:** Based on height/weight
- **Styling:** Suggest outfits and combinations
- **Product Comparison:** Analyze pros/cons
- **Public Access:** No login required

---

## 🔒 Security Notes

1. **Tickets:** Verify customer_id matches ticket owner
2. **Chat:** Sessions belong to customers
3. **AI Endpoints:** Rate limit to prevent abuse
4. **Admin Access:** Only admins view all tickets/chats

---

**✅ Support & AI Module Complete!**

**Next Module:** [Admin Management →](./API_06_ADMIN_MANAGEMENT.md)

---

*Last Updated: December 5, 2025*  
*Audited by: Senior Backend Developer*
