# 🤖 CHATBOT API DOCUMENTATION

> **Base URL:** `http://localhost:3001`  
> **Version:** v1  
> **Date:** 14/12/2025

---

## 📚 Table of Contents

1. [Chat Session APIs](#chat-session-apis)
2. [Chat Message APIs](#chat-message-apis)
3. [Chatbot Internal APIs (Rasa)](#chatbot-internal-apis-rasa)
4. [Product Display on Frontend](#product-display-on-frontend)
5. [Response Format Examples](#response-format-examples)

---

## 🔐 Authentication

### Public Endpoints (Chat Widget)
- `POST /api/v1/chat/session`
- `POST /api/v1/chat/send`
- `GET /api/v1/chat/history`
- `GET /api/v1/chat/sessions/history`

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>  (optional - auto-extracts customer_id)
Content-Type: application/json
```

### Internal Endpoints (Rasa Actions)
- All `/api/chatbot/*` endpoints
- **Required Header:**
```http
X-Internal-Api-Key: <INTERNAL_API_KEY>
```

---

## 📱 CHAT SESSION APIs

### 1. Create or Get Chat Session

```http
POST /api/v1/chat/session
```

**Use Cases:**
- Resume existing chat (default)
- Create new conversation (`force_new: true`)
- Auto-login with JWT token

**Request Body:**
```json
{
  "visitor_id": "uuid-v4-string",  // Optional - for guest users
  "force_new": true                 // Optional - create new session
}
```

**Response:**
```json
{
  "session": {
    "id": "123",
    "customer_id": 1,           // From JWT if logged in
    "visitor_id": "uuid...",    // For guest users
    "created_at": "2025-12-14T...",
    "updated_at": "2025-12-14T..."
  },
  "is_new": true
}
```

**Examples:**

**a) Logged-in User - Resume Last Chat:**
```bash
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**b) Logged-in User - Create New Chat (ChatGPT-style):**
```bash
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"force_new": true}'
```

**c) Guest User:**
```bash
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "550e8400-e29b-41d4-a716-446655440000"}'
```

---

### 2. Get Chat History

```http
GET /api/v1/chat/history?session_id={id}&limit={limit}&offset={offset}
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `session_id` | number | ✅ | - | Chat session ID |
| `limit` | number | ❌ | 50 | Messages per page |
| `offset` | number | ❌ | 0 | Pagination offset |

**Response:**
```json
{
  "session": {
    "id": "123",
    "customer_id": 1,
    "visitor_id": null,
    "customer": {
      "id": 1,
      "name": "Nguyễn Văn A",
      "email": "user@example.com"
    }
  },
  "messages": [
    {
      "id": 1,
      "session_id": 123,
      "sender": "customer",
      "message": "Tôi muốn tìm áo sơ mi",
      "is_read": false,
      "created_at": "2025-12-14T03:00:00.000Z"
    },
    {
      "id": 2,
      "session_id": 123,
      "sender": "bot",
      "message": "Chúng tôi có nhiều mẫu áo sơ mi. Bạn thích phong cách nào?",
      "is_read": false,
      "created_at": "2025-12-14T03:00:02.000Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

**Note:** Messages are sorted from **oldest to newest** for chat display.

---

### 3. Get Sessions History (Sidebar)

```http
GET /api/v1/chat/sessions/history?limit={limit}&page={page}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customer_id` | number | ❌ | Auto-extracted from JWT |
| `visitor_id` | string | ❌ | For guest users |
| `page` | number | ❌ | Default: 1 |
| `limit` | number | ❌ | Default: 50 |

**Response:**
```json
{
  "sessions": {
    "today": [
      {
        "id": "123",
        "customer_id": 1,
        "updated_at": "2025-12-14T03:00:00.000Z"
      }
    ],
    "yesterday": [...],
    "last_7_days": [...],
    "older": [...]
  },
  "total": 15,
  "page": 1,
  "limit": 50
}
```

---

## 💬 CHAT MESSAGE APIs

### Send Message

```http
POST /api/v1/chat/send
```

**Request Body:**
```json
{
  "session_id": 123,
  "message": "Tìm áo sơ mi trắng cho đi làm"
}
```

**Response:**
```json
{
  "customer_message": {
    "id": 1,
    "session_id": 123,
    "sender": "customer",
    "message": "Tìm áo sơ mi trắng cho đi làm",
    "is_read": false,
    "created_at": "2025-12-14T03:00:00.000Z"
  },
  "bot_responses": [
    {
      "id": 2,
      "session_id": 123,
      "sender": "bot",
      "message": "Tôi đã tìm thấy một số áo sơ mi trắng phù hợp cho công sở...",
      "is_read": false,
      "created_at": "2025-12-14T03:00:02.000Z"
    }
  ]
}
```

**How It Works:**

1. **Backend saves customer message** to database
2. **Backend calls Rasa server** at `http://localhost:5005/webhooks/rest/webhook`
3. **Rasa processes message** and returns responses (text + custom data)
4. **Backend saves bot responses** to database
5. **Backend returns both** customer message + bot responses

**Metadata Sent to Rasa:**
```json
{
  "sender": "customer_1",
  "message": "Tìm áo sơ mi trắng",
  "metadata": {
    "session_id": "123",
    "customer_id": 1,           // ✅ Extracted from JWT
    "user_jwt_token": "eyJh..."  // ✅ For internal API calls
  }
}
```

---

## 🔧 CHATBOT INTERNAL APIs (Rasa)

**Base Path:** `/api/chatbot`  
**Authentication:** `X-Internal-Api-Key` header

These APIs are called by **Rasa custom actions** to perform operations on behalf of users.

### 1. Get Cart

```http
GET /api/chatbot/cart/:customer_id
Headers: X-Internal-Api-Key: <KEY>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer_id": 1,
    "items": [
      {
        "id": 1,
        "product_id": 456,
        "product_name": "Áo Sơ Mi Trắng Basic",
        "variant_id": 789,
        "size": "M",
        "color": "Trắng",
        "quantity": 2,
        "price": 150000,
        "image_url": "https://example.com/image.jpg"
      }
    ],
    "total_items": 2,
    "subtotal": 300000,
    "total": 300000
  }
}
```

---

### 2. Add to Cart

```http
POST /api/chatbot/cart/add
Headers: X-Internal-Api-Key: <KEY>
Content-Type: application/json
```

**Request:**
```json
{
  "customer_id": 1,
  "variant_id": 789,
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart_item_id": 1,
    "variant_id": 789,
    "quantity": 1
  },
  "message": "Item added to cart successfully"
}
```

---

### 3. Add to Wishlist

```http
POST /api/chatbot/wishlist/add
Headers: X-Internal-Api-Key: <KEY>
```

**Request:**
```json
{
  "customer_id": 1,
  "variant_id": 789
}
```

---

### 4. Cancel Order

```http
POST /api/chatbot/orders/:order_id/cancel
Headers: X-Internal-Api-Key: <KEY>
```

**Request:**
```json
{
  "customer_id": 1
}
```

**Validation:**
- Order must belong to customer
- Order must be in `pending` status

---

### 5. Get Size Chart

```http
GET /api/chatbot/size-chart/:category
Headers: X-Internal-Api-Key: <KEY>
```

**Categories:** `shirt`, `pants`, `shoes`

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "shirt",
    "image_url": "https://example.com/size-chart-shirt.png",
    "description": "Size chart for shirt"
  }
}
```

---

### 6. Get Size Recommendation

```http
POST /api/chatbot/size-advice
Headers: X-Internal-Api-Key: <KEY>
```

**Request:**
```json
{
  "height": 170,
  "weight": 65,
  "category": "shirt"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommended_size": "M",
    "confidence": "high",
    "reason": "Based on your height and weight measurements",
    "note": "This is a general recommendation. Please check the size chart for accurate measurements.",
    "measurements": {
      "height": "170 cm",
      "weight": "65 kg"
    }
  }
}
```

**Size Logic:**
- **S:** height < 160cm OR weight < 50kg
- **M:** height 160-170cm AND weight 50-60kg
- **L:** height 170-180cm AND weight 60-75kg
- **XL:** height > 180cm OR weight > 75kg

---

### 7. Get Product Recommendations

```http
GET /api/chatbot/products/recommend?context={context}&category={category}&limit={limit}
Headers: X-Internal-Api-Key: <KEY>
```

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `context` | string | ❌ | Occasion/style | `wedding`, `beach`, `work`, `party`, `casual`, `sport` |
| `category` | string | ❌ | Category slug | `ao-so-mi`, `quan-jean` |
| `limit` | number | ❌ | Max results (default: 5) | `10` |

**Context Mapping:**
```javascript
{
  "wedding": ["wedding", "formal", "elegant", "occasion"],
  "beach": ["beach", "summer", "casual", "light"],
  "work": ["work", "office", "formal", "professional"],
  "party": ["party", "evening", "elegant", "special"],
  "casual": ["casual", "everyday", "comfortable"],
  "sport": ["sport", "athletic", "active", "gym"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "context": "work",
    "total": 5,
    "recommendations": [
      {
        "product_id": 123,
        "name": "Áo Sơ Mi Trắng Oxford",
        "slug": "ao-so-mi-trang-oxford",
        "description": "Áo sơ mi công sở...",
        "price": 250000,
        "thumbnail": "https://example.com/image.jpg",
        "rating": 4.5,
        "reviews": 120,
        "category": "Áo Sơ Mi",
        "in_stock": true,
        "attributes": {
          "style": "formal",
          "occasion": "work",
          "material": "cotton"
        }
      }
    ]
  }
}
```

**Uses JSONB Search:**
```sql
product.attributes @> '{"tags": ["work", "office", "formal"]}'
OR product.attributes->>'occasion' = 'work'
OR product.attributes->>'style' = 'work'
```

---

### 8. Verify JWT Token

```http
POST /api/chatbot/auth/verify
Headers: X-Internal-Api-Key: <KEY>
```

**Request:**
```json
{
  "jwt_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customer_id": 1,
    "email": "user@example.com",
    "name": "Nguyễn Văn A"
  }
}
```

**Used by Rasa to:**
- Extract customer_id from JWT
- Validate authentication
- Get customer profile

---

### 9. Ask Gemini AI

```http
POST /api/chatbot/gemini/ask
Headers: X-Internal-Api-Key: <KEY>
```

**Request:**
```json
{
  "question": "Màu nào phù hợp với da ngăm?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "Màu nào phù hợp với da ngăm?",
    "answer": "Với da ngăm, bạn nên chọn màu sáng như trắng, xanh pastel, hoặc màu nude để tôn lên làn da. Tránh màu tối như đen, nâu đậm vì có thể làm da trông xỉn màu hơn.",
    "source": "Gemini AI"
  }
}
```

**Fallback on Error:**
```json
{
  "question": "...",
  "answer": "I'm sorry, I couldn't process your question right now...",
  "source": "Fallback",
  "error": true
}
```

---

## 🎨 PRODUCT DISPLAY ON FRONTEND

### How Rasa Returns Product Data

When Rasa recommends products, it uses **custom responses** with structured data:

**Rasa Response Format:**
```json
[
  {
    "text": "Tôi đã tìm thấy những sản phẩm phù hợp với bạn:",
    "custom": {
      "type": "product_list",
      "products": [
        {
          "product_id": 123,
          "name": "Áo Sơ Mi Trắng Oxford",
          "slug": "ao-so-mi-trang-oxford",
          "price": 250000,
          "thumbnail": "https://example.com/image.jpg",
          "rating": 4.5,
          "in_stock": true
        }
      ]
    }
  }
]
```

### Frontend Display Logic

```typescript
// In frontend chat component
const renderMessage = (message) => {
  // 1. Display text message
  const textContent = message.text;
  
  // 2. Check for custom data
  if (message.custom?.type === 'product_list') {
    return (
      <>
        <p>{textContent}</p>
        <ProductCarousel products={message.custom.products} />
      </>
    );
  }
  
  // 3. Check for custom buttons
  if (message.custom?.type === 'quick_replies') {
    return (
      <>
        <p>{textContent}</p>
        <QuickReplyButtons buttons={message.custom.buttons} />
      </>
    );
  }
  
  // 4. Default text only
  return <p>{textContent}</p>;
};
```

### Custom Response Types

**1. Product List:**
```json
{
  "type": "product_list",
  "products": [...]
}
```

**2. Cart Summary:**
```json
{
  "type": "cart_summary",
  "items": [...],
  "total": 300000
}
```

**3. Order Status:**
```json
{
  "type": "order_status",
  "order_id": 123,
  "status": "pending",
  "tracking_url": "https://..."
}
```

**4. Size Chart:**
```json
{
  "type": "size_chart",
  "image_url": "https://...",
  "category": "shirt"
}
```

**5. Quick Replies (Buttons):**
```json
{
  "type": "quick_replies",
  "buttons": [
    {"title": "Xem giỏ hàng", "payload": "/view_cart"},
    {"title": "Tiếp tục mua", "payload": "/continue_shopping"}
  ]
}
```

---

## 📋 RESPONSE FORMAT EXAMPLES

### Example 1: Product Search

**User Input:**
```
"Tìm áo sơ mi trắng cho đi làm"
```

**Rasa Response:**
```json
[
  {
    "text": "Tôi đã tìm thấy 5 mẫu áo sơ mi trắng phù hợp cho công sở:",
    "custom": {
      "type": "product_list",
      "products": [
        {
          "product_id": 123,
          "name": "Áo Sơ Mi Trắng Oxford",
          "slug": "ao-so-mi-trang-oxford",
          "price": 250000,
          "thumbnail": "https://example.com/shirt1.jpg",
          "rating": 4.5,
          "reviews": 120,
          "in_stock": true
        },
        {
          "product_id": 124,
          "name": "Áo Sơ Mi Trắng Slim Fit",
          "slug": "ao-so-mi-trang-slim-fit",
          "price": 280000,
          "thumbnail": "https://example.com/shirt2.jpg",
          "rating": 4.7,
          "reviews": 85,
          "in_stock": true
        }
      ]
    }
  },
  {
    "text": "Bạn muốn xem chi tiết sản phẩm nào không?"
  }
]
```

**Backend Saves:**
```json
{
  "customer_message": {
    "message": "Tìm áo sơ mi trắng cho đi làm",
    "sender": "customer"
  },
  "bot_responses": [
    {
      "message": "Tôi đã tìm thấy 5 mẫu áo sơ mi trắng phù hợp cho công sở:",
      "sender": "bot"
    },
    {
      "message": "Bạn muốn xem chi tiết sản phẩm nào không?",
      "sender": "bot"
    }
  ]
}
```

**Note:** Custom data is NOT saved in database, only sent in real-time response.

---

### Example 2: Add to Cart

**User Input:**
```
"Thêm áo này vào giỏ hàng"
```

**Rasa Action:**
1. Calls `POST /api/chatbot/cart/add`
2. Receives success response

**Rasa Response:**
```json
[
  {
    "text": "✅ Đã thêm 'Áo Sơ Mi Trắng Oxford' vào giỏ hàng của bạn!",
    "custom": {
      "type": "cart_action",
      "action": "added",
      "product_name": "Áo Sơ Mi Trắng Oxford",
      "quantity": 1
    }
  },
  {
    "text": "Bạn có muốn xem giỏ hàng hoặc tiếp tục mua sắm không?",
    "custom": {
      "type": "quick_replies",
      "buttons": [
        {"title": "Xem giỏ hàng", "payload": "/view_cart"},
        {"title": "Tiếp tục mua", "payload": "/continue_shopping"}
      ]
    }
  }
]
```

---

### Example 3: Size Advice

**User Input:**
```
"Cao 170cm nặng 65kg nên mặc size nào?"
```

**Rasa Action:**
1. Extracts height: 170, weight: 65
2. Calls `POST /api/chatbot/size-advice`

**Rasa Response:**
```json
[
  {
    "text": "Dựa trên thông tin chiều cao 170cm và cân nặng 65kg của bạn, tôi khuyên bạn nên chọn size M.",
    "custom": {
      "type": "size_advice",
      "recommended_size": "M",
      "confidence": "high",
      "measurements": {
        "height": "170 cm",
        "weight": "65 kg"
      }
    }
  },
  {
    "text": "Để chắc chắn hơn, bạn có thể xem bảng size chi tiết không?"
  }
]
```

---

## 🔄 Complete Chat Flow

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │
       │ 1. POST /api/v1/chat/send
       │    { session_id: 123, message: "Tìm áo sơ mi" }
       ▼
┌─────────────┐
│   Backend   │
│   (NestJS)  │
└──────┬──────┘
       │
       │ 2. Save customer message to DB
       │
       │ 3. Call Rasa webhook
       │    POST http://localhost:5005/webhooks/rest/webhook
       │    {
       │      sender: "customer_1",
       │      message: "Tìm áo sơ mi",
       │      metadata: { customer_id: 1, jwt_token: "..." }
       │    }
       ▼
┌─────────────┐
│    Rasa     │
│   Server    │
└──────┬──────┘
       │
       │ 4. Process intent: search_product
       │
       │ 5. Execute custom action: action_search_products
       │    - Calls GET /api/chatbot/products/recommend
       │    - Gets product list
       │
       │ 6. Return responses with custom data
       │    [
       │      { text: "...", custom: { products: [...] } }
       │    ]
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │
       │ 7. Save bot responses to DB (text only)
       │
       │ 8. Return to frontend
       │    {
       │      customer_message: {...},
       │      bot_responses: [
       │        { message: "...", sender: "bot" }
       │      ]
       │    }
       ▼
┌─────────────┐
│  Frontend   │
└─────────────┘
       │
       │ 9. Display messages
       │    - Text in chat bubble
       │    - Products in carousel
       │    - Buttons as quick replies
```

---

## 🚨 Error Handling

### 1. Rasa Server Down

**Backend Fallback:**
```json
{
  "bot_responses": [
    {
      "message": "Xin lỗi, chatbot hiện không khả dụng. Vui lòng thử lại sau hoặc liên hệ support.",
      "sender": "bot"
    }
  ]
}
```

### 2. JWT Expired

**Warning logged, falls back to visitor session:**
```
WARN [ChatService] ⚠️ Failed to decode JWT: jwt expired
```

### 3. Invalid API Key (Internal APIs)

**Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 📝 Notes for Frontend Team

### 1. Session Management

```typescript
// On app load
const initChat = async () => {
  // Try to get existing session
  const session = await chatService.createOrGetSession({});
  setSessionId(session.session.id);
};

// On "New Chat" button
const handleNewChat = async () => {
  const session = await chatService.createOrGetSession({ 
    force_new: true 
  });
  setSessionId(session.session.id);
  clearMessages();
};
```

### 2. Send Message

```typescript
const sendMessage = async (text: string) => {
  const response = await chatService.sendMessage({
    session_id: sessionId,
    message: text
  });
  
  // Add customer message to UI
  addMessage(response.customer_message);
  
  // Add bot responses to UI
  response.bot_responses.forEach(msg => addMessage(msg));
};
```

### 3. Display Custom Data

```typescript
// Rasa returns custom data in real-time, not saved in DB
// Frontend must parse custom field from Rasa response
const displayMessage = (message) => {
  if (message.custom?.type === 'product_list') {
    return <ProductCarousel products={message.custom.products} />;
  }
  return <TextBubble text={message.text} />;
};
```

### 4. Load History

```typescript
const loadHistory = async () => {
  const response = await chatService.getChatHistory(sessionId, {
    limit: 50,
    offset: 0
  });
  
  // Messages already sorted old -> new
  setMessages(response.messages);
};
```

---

## 🔗 Related Documentation

- `PUBLIC_API_ENDPOINTS.md` - All public APIs
- `BACKEND_FEATURE_REQUEST_NEW_CHAT_SESSION.md` - force_new feature
- `BACKEND_BUG_CHAT_SESSION_REQUIRES_VISITOR_ID.md` - JWT authentication

---

## 📞 Support

**Backend Team Contact:** PM → Backend Team  
**Rasa Server:** `http://localhost:5005`  
**Backend API:** `http://localhost:3001`
