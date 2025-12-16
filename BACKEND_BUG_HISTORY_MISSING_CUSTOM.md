# 🐛 Backend Bug: Chat History Missing `custom` Field

**Date:** December 14, 2024  
**Priority:** CRITICAL  
**Component:** Backend Chat History API  
**Reporter:** Frontend Team  
**Status:** 🔴 BLOCKING - Product cards disappear on page reload

---

## 🚨 Problem Summary

When users reload the chat page, **product cards disappear** even though the messages are still there. The root cause is that the **Chat History API does not return the `custom` field** that was saved when the message was originally sent.

**Impact:**
- ❌ Product recommendations disappear after page refresh
- ❌ Cart summaries disappear after page refresh  
- ❌ All rich content (buttons, selectors, images) lost on reload
- ❌ Poor user experience - chat appears broken

---

## 📊 Evidence

### ✅ First Search (Works)

**User:** "i want to find a meow shirt"

**Response from Send Message API:**
```json
{
  "bot_responses": [
    {
      "id": "325",
      "message": "",
      "sender": "bot",
      "created_at": "2024-12-14T14:03:00Z",
      "custom": {                           // ✅ custom field present
        "type": "product_list",
        "products": [
          {
            "product_id": 5,
            "name": "Sushi Meow",
            "price": 13.52,
            "thumbnail": "...",
            "in_stock": true
          }
          // ... more products
        ],
        "total": 5
      }
    },
    {
      "id": "326",
      "message": "💡 Click on any product to see details! 😊",
      "sender": "bot",
      "created_at": "2024-12-14T14:03:00Z"
    }
  ]
}
```

**UI Display:** ✅ Product cards show correctly

---

### ❌ After Reload (Broken)

**Request:** `GET /api/v1/chat/history?session_id=24&limit=50`

**Response from History API:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "325",
        "message": "",
        "sender": "bot",
        "created_at": "2024-12-14T14:03:00Z"
        // ❌ NO "custom" field - data lost!
      },
      {
        "id": "326",
        "message": "💡 Click on any product to see details! 😊",
        "sender": "bot",
        "created_at": "2024-12-14T14:03:00Z"
      }
    ]
  }
}
```

**UI Display:** ❌ Only text messages, product cards gone

---

## 🔍 Root Cause

### Backend Issue: History Endpoint Missing `custom` Field

The Chat History API endpoint is not including the `custom` field in the response, even though this data should be stored in the database.

**Possible causes:**

1. **Database schema issue**
   - `custom` field not saved to database
   - Column type incorrect (TEXT instead of JSON/JSONB)
   - Data not persisted during message creation

2. **Query/Serialization issue**
   - SELECT query doesn't include `custom` column
   - Serializer/DTO doesn't map `custom` field
   - Field excluded in response mapping

3. **TypeORM/Prisma entity issue**
   - Entity definition missing `custom` property
   - Property not decorated correctly
   - Relation or column mapping issue

---

## 🔧 Expected Fix

### Step 1: Verify Database Schema

**Check if `custom` column exists:**

```sql
-- PostgreSQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
  AND column_name = 'custom';

-- Expected result:
-- column_name | data_type
-- custom      | jsonb      (or json, text)
```

**If column doesn't exist, add it:**

```sql
ALTER TABLE chat_messages 
ADD COLUMN custom JSONB;
```

---

### Step 2: Update Entity/Model

**Example with TypeORM:**

```typescript
// chat-message.entity.ts

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  session_id: number;

  @Column({ type: 'text' })
  message: string;

  @Column()
  sender: string;

  @Column({ type: 'jsonb', nullable: true })  // ✅ Add this
  custom: any;

  @Column({ type: 'jsonb', nullable: true })  // ✅ Add this if missing
  buttons: any;

  @CreateDateColumn()
  created_at: Date;
}
```

---

### Step 3: Update Save Logic

**When saving bot messages from Rasa:**

```typescript
// chat.service.ts - saveMessage method

async saveMessage(data: SaveMessageDto) {
  const message = this.chatMessageRepository.create({
    session_id: data.session_id,
    message: data.message,
    sender: data.sender,
    custom: data.custom,      // ✅ Must save this
    buttons: data.buttons,    // ✅ Must save this
  });

  return await this.chatMessageRepository.save(message);
}
```

---

### Step 4: Update History Response

**History endpoint must return `custom`:**

```typescript
// chat.controller.ts - getChatHistory

@Get('history')
async getChatHistory(@Query() query: GetHistoryDto) {
  const messages = await this.chatService.getHistory(
    query.session_id,
    query.limit,
    query.offset
  );

  return {
    success: true,
    data: {
      messages: messages.map(msg => ({
        id: msg.id,
        message: msg.message,
        sender: msg.sender,
        created_at: msg.created_at,
        custom: msg.custom,      // ✅ Must include this
        buttons: msg.buttons,    // ✅ Must include this
      }))
    }
  };
}
```

---

## 🧪 Test Cases

### Test Case 1: Save and Reload Product Cards

**Steps:**
1. Send message: "show me shirts"
2. Bot responds with product cards (custom.type = "product_list")
3. Verify message saved to DB with `custom` field
4. Reload page
5. Check if product cards still display

**Expected:**
- ✅ Product cards persist after reload
- ✅ All product data intact

**Actual:**
- ❌ Product cards disappear
- ❌ Only text messages remain

---

### Test Case 2: Database Verification

**Query to check saved data:**

```sql
SELECT id, message, custom, buttons, created_at
FROM chat_messages
WHERE session_id = 24
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
```
id  | message | custom                                | buttons | created_at
----|---------|---------------------------------------|---------|-------------------
325 | ""      | {"type":"product_list","products":[]} | null    | 2024-12-14 14:03
326 | "💡..." | null                                  | null    | 2024-12-14 14:03
```

**If `custom` is NULL or column doesn't exist → DATABASE BUG**

---

### Test Case 3: API Response Verification

**Direct API test:**

```bash
# Get history
curl -X GET "http://localhost:3001/api/v1/chat/history?session_id=24&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected response:**
```json
{
  "messages": [
    {
      "id": "325",
      "custom": {              // ✅ Must be present
        "type": "product_list",
        "products": [...]
      }
    }
  ]
}
```

**If `custom` field missing → SERIALIZATION BUG**

---

## 📋 Debug Checklist

### For Backend Team:

- [ ] Check database schema - does `custom` column exist?
- [ ] Check entity/model - is `custom` property defined?
- [ ] Check save logic - is `custom` being saved to DB?
- [ ] Query database directly - is data actually stored?
- [ ] Check history query - does SELECT include `custom`?
- [ ] Check DTO/serializer - is `custom` included in response?
- [ ] Test with Postman/curl - does API return `custom`?

---

## 🎯 Success Criteria

**When fixed:**

1. **Product cards persist after reload** ✅
2. **All rich content preserved** ✅
3. **Database contains `custom` data** ✅
4. **History API returns `custom` field** ✅

**Test scenario:**
```
1. User: "show me shirts"
2. Bot: [Shows 5 product cards]
3. User: [Reloads page F5]
4. Result: Product cards still visible ✅
```

---

## 📎 Related Files

**Backend:**
- Entity: `src/chat/entities/chat-message.entity.ts`
- Service: `src/chat/chat.service.ts`
- Controller: `src/chat/chat.controller.ts`
- Migration: `src/migrations/XXXX-add-custom-to-messages.ts` (may need to create)

**Database:**
- Table: `chat_messages`
- Column: `custom` (JSONB)

**Frontend:** (No changes needed)
- Already expects `custom` field
- Renders correctly when data present

---

## 💡 Additional Notes

**Why This is Critical:**

- Chatbot's main value is product recommendations
- Without persistent cards, chatbot appears broken
- Users lose context on page refresh
- Severely impacts user experience and trust

**Quick Workaround (Not Recommended):**

Frontend could cache messages in localStorage, but this:
- ❌ Doesn't solve root cause
- ❌ Causes sync issues
- ❌ Violates data persistence principles
- ✅ Better to fix backend properly

---

## 🚀 Priority: CRITICAL

This bug completely breaks the chatbot's product recommendation feature. Users expect their conversation history (including product cards) to persist after page reload.

**Please prioritize this fix immediately.**

---

**For questions or reproduction steps, contact Frontend Team.**
