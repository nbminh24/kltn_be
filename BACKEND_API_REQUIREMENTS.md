# YÊU CẦU API BACKEND - CUSTOMER DETAIL PAGE

## 📋 Tổng quan
Hiện tại trang chi tiết khách hàng (Admin Customer Detail) đang thiếu một số API để hiển thị đầy đủ thông tin. Cần bổ sung các endpoint sau:

---

## 1️⃣ GET `/admin/customers/:id` - Cải tiến

### **Hiện tại:**
```json
{
  "data": {
    "id": 1,
    "name": "Nbminh24",
    "email": "nbminh24@gmail.com",
    "status": "active",
    "created_at": "2025-12-13T04:27:42.737Z",
    "ordersCount": 7,
    "totalSpent": 239.12
  }
}
```

### **Yêu cầu bổ sung:**
Thêm các field sau vào response:

```json
{
  "data": {
    "id": 1,
    "name": "Nbminh24",
    "email": "nbminh24@gmail.com",
    "phone": "+84 xxx xxx xxx",           // ✅ Bổ sung
    "address": "123 Đường ABC, Quận 1, TP.HCM",  // ✅ Bổ sung
    "status": "active",
    "created_at": "2025-12-13T04:27:42.737Z",
    "updated_at": "2026-01-04T15:09:27.977Z",
    "total_orders": 7,                    // ✅ Đổi tên từ ordersCount
    "total_spent": 239.12,                // ✅ Đổi tên từ totalSpent
    "recent_orders": [                    // ✅ Bổ sung: 5 đơn hàng gần nhất
      {
        "id": 38,
        "total_amount": 89.99,
        "status": "delivered",
        "created_at": "2025-12-20T10:30:00Z"
      },
      {
        "id": 35,
        "total_amount": 120.50,
        "status": "shipped",
        "created_at": "2025-12-15T14:20:00Z"
      }
    ]
  }
}
```

### **Notes:**
- `recent_orders`: Giới hạn 5 đơn hàng gần nhất, sắp xếp theo `created_at` DESC
- `address`: Địa chỉ mặc định của khách hàng (nếu có nhiều địa chỉ, lấy default hoặc gần nhất)
- `phone`: Số điện thoại của khách hàng

---

## 2️⃣ GET `/admin/customers/:id/chat-history` - MỚI

### **Mục đích:**
Lấy danh sách các cuộc hội thoại chat của khách hàng với chatbot/admin

### **Request:**
```
GET /admin/customers/:id/chat-history?page=1&limit=20
```

**Query params:**
- `page` (optional): Trang hiện tại, default = 1
- `limit` (optional): Số lượng/trang, default = 20
- `status` (optional): Filter theo trạng thái ['resolved', 'unresolved', 'all']
- `intent` (optional): Filter theo intent ['product_inquiry', 'order_status', 'shipping_info', ...]

### **Response:**
```json
{
  "data": [
    {
      "id": "conv_123",
      "customer_id": 1,
      "status": "resolved",                    // "resolved" | "unresolved"
      "intents": ["product_inquiry", "size_guide"],  // Danh sách intents được detect
      "message_count": 12,                     // Tổng số tin nhắn
      "last_message_at": "2025-12-20T14:30:00Z",
      "created_at": "2025-12-20T14:15:00Z",
      "messages": [                            // ✅ Bổ sung: Tin nhắn trong cuộc hội thoại
        {
          "id": "msg_001",
          "role": "user",                      // "user" | "bot" | "admin"
          "content": "Hi! Can you help me find a nice t-shirt?",
          "created_at": "2025-12-20T14:15:00Z"
        },
        {
          "id": "msg_002",
          "role": "bot",
          "content": "Of course! I'd be happy to help you find the perfect t-shirt.",
          "created_at": "2025-12-20T14:15:30Z"
        }
      ]
    }
  ],
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### **Notes:**
- `intents`: Có thể là array các intent mà AI/chatbot đã detect được
- `status`: `resolved` nếu bot đã trả lời đầy đủ, `unresolved` nếu cần admin xử lý
- `messages`: Có thể giới hạn số lượng tin nhắn trả về (ví dụ: 10-20 tin gần nhất)

---

## 3️⃣ GET `/admin/customers/:id/support-tickets` - MỚI

### **Mục đích:**
Lấy danh sách support tickets (yêu cầu hỗ trợ) của khách hàng

### **Request:**
```
GET /admin/customers/:id/support-tickets?page=1&limit=20&status=pending
```

**Query params:**
- `page` (optional): Trang hiện tại, default = 1
- `limit` (optional): Số lượng/trang, default = 20
- `status` (optional): Filter theo trạng thái ['pending', 'replied', 'resolved']
- `priority` (optional): Filter theo độ ưu tiên ['high', 'medium', 'low']

### **Response:**
```json
{
  "data": [
    {
      "id": "TKT-001",
      "customer_id": 1,
      "customer_name": "Nbminh24",
      "customer_email": "nbminh24@gmail.com",
      "subject": "Damaged item received",
      "message": "I received a damaged t-shirt in my order. The fabric has a tear on the side.",
      "status": "pending",                   // "pending" | "replied" | "resolved"
      "priority": "high",                    // "high" | "medium" | "low"
      "created_at": "2024-01-16T09:30:00Z",
      "updated_at": "2024-01-16T09:30:00Z",
      "ai_attempted": false,                 // ✅ AI đã cố gắng trả lời hay chưa
      "assigned_admin_id": null,             // ✅ Admin được assign (nếu có)
      "order_id": 38                         // ✅ Liên kết đơn hàng (nếu có)
    },
    {
      "id": "TKT-002",
      "customer_id": 1,
      "customer_name": "Nbminh24",
      "customer_email": "nbminh24@gmail.com",
      "subject": "Refund request for order #35",
      "message": "I'd like to request a refund for order #35. The item doesn't fit properly.",
      "status": "replied",
      "priority": "medium",
      "created_at": "2024-01-12T14:20:00Z",
      "updated_at": "2024-01-13T10:15:00Z",
      "ai_attempted": true,
      "assigned_admin_id": 5,
      "order_id": 35
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### **Notes:**
- `ai_attempted`: Đánh dấu ticket đã được AI chatbot cố gắng trả lời nhưng cần escalate lên admin
- `order_id`: Nếu ticket liên quan đến đơn hàng cụ thể
- `assigned_admin_id`: Admin được giao để xử lý ticket (có thể null nếu chưa assign)

---

## 4️⃣ GET `/admin/customers/:id/addresses` - MỚI (Optional)

### **Mục đích:**
Lấy tất cả địa chỉ đã lưu của khách hàng (nếu hệ thống hỗ trợ nhiều địa chỉ)

### **Request:**
```
GET /admin/customers/:id/addresses
```

### **Response:**
```json
{
  "data": [
    {
      "id": 1,
      "label": "Home",                       // "Home" | "Office" | "Other"
      "name": "Nbminh24",
      "address": "089 Kutch Green Apt. 448",
      "city": "Hồ Chí Minh",
      "district": "Quận 1",
      "ward": "Phường Bến Nghé",
      "phone": "+84 xxx xxx xxx",
      "is_default": true,
      "created_at": "2025-12-13T04:27:42.737Z"
    },
    {
      "id": 2,
      "label": "Office",
      "name": "Nbminh24",
      "address": "1234 Business Plaza",
      "city": "Hồ Chí Minh",
      "district": "Quận 3",
      "ward": "Phường Võ Thị Sáu",
      "phone": "+84 yyy yyy yyy",
      "is_default": false,
      "created_at": "2025-12-15T10:00:00Z"
    }
  ]
}
```

### **Notes:**
- Nếu hệ thống không hỗ trợ nhiều địa chỉ, có thể bỏ qua endpoint này
- Địa chỉ mặc định (`is_default: true`) sẽ được hiển thị trong GET `/admin/customers/:id`

---

## 🎯 Ưu tiên triển khai

### **Priority 1 (Cao):**
1. ✅ Cải tiến GET `/admin/customers/:id` - Thêm `recent_orders`, `phone`, `address`

### **Priority 2 (Trung bình):**
2. ✅ GET `/admin/customers/:id/chat-history` - Lịch sử chat
3. ✅ GET `/admin/customers/:id/support-tickets` - Support tickets

### **Priority 3 (Thấp):**
4. GET `/admin/customers/:id/addresses` - Danh sách địa chỉ (nếu cần)

---

## 📝 Lưu ý kỹ thuật

### **Authentication:**
- Tất cả endpoint đều yêu cầu admin token trong header:
  ```
  Authorization: Bearer <admin_access_token>
  ```

### **Error Response Format:**
```json
{
  "message": "Customer not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### **Data Types:**
- `id`: number
- `total_spent`: number (USD, frontend sẽ convert sang VND)
- `created_at`, `updated_at`: ISO 8601 datetime string
- `status`: string (lowercase: "active", "inactive")

### **Pagination:**
- Sử dụng format pagination hiện tại (page, limit, totalPages)
- Default: `page=1`, `limit=20`

---

## 🔄 Migration/Update hiện tại

Nếu đã có bảng/table liên quan, cần kiểm tra:

1. **Table `customers`**: Đảm bảo có field `phone`, `address`
2. **Table `chat_sessions`**: Lưu lịch sử chat
3. **Table `support_tickets`**: Lưu support requests
4. **Table `customer_addresses`**: Nếu hỗ trợ nhiều địa chỉ

---

## 📞 Contact

Nếu có thắc mắc hoặc cần làm rõ yêu cầu, vui lòng liên hệ Frontend Team.
