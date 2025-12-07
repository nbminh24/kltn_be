# 🐛 BACKEND BUG - Chat Send Message API Response Naming Inconsistency

**Date:** December 7, 2025  
**Reporter:** Frontend Team  
**Severity:** MEDIUM (Inconsistent with documentation)  
**Status:** ✅ RESOLVED  
**Fixed by:** Backend Team  
**Fixed at:** December 7, 2025 17:50

---

## 📋 SUMMARY

API endpoint `POST /chat/send` trả về field `bot_messages` thay vì `bot_responses` như trong documentation, gây không nhất quán.

---

## ✅ FIX SUMMARY

**File Changed:** `src/modules/chat/chat.service.ts`  
**Method:** `sendMessage()`  
**Lines:** 121-198

### What was changed:

**Before (Incorrect):**
```typescript
return {
  user_message: userMessage,      // ❌ Wrong naming
  bot_messages: savedBotMessages, // ❌ Wrong naming
  session_id: dto.session_id
};
```

**After (Fixed):**
```typescript
return {
  customer_message: customerMessage,  // ✅ Correct
  bot_responses: savedBotResponses,   // ✅ Correct
};
```

### Changes Made:
1. ✅ `user_message` → `customer_message` (consistent với sender type)
2. ✅ `bot_messages` → `bot_responses` (match documentation)
3. ✅ Removed redundant `session_id` from response (already in request)
4. ✅ Variable names cũng đổi theo để consistent

### Testing:
```bash
curl -X POST http://localhost:3001/chat/send \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1, "message": "hello"}'

# New response format:
{
  "customer_message": { ... },
  "bot_responses": [ ... ]
}
```

---

## 🔴 ISSUE

### **Endpoint:**
```
POST /chat/send
```

### **Request Body:**
```json
{
  "session_id": 21,
  "message": "are you bot?"
}
```

### **Expected Response (theo docs):**
```json
{
  "customer_message": {
    "id": "122",
    "session_id": 21,
    "sender": "customer",
    "message": "are you bot?",
    "created_at": "2025-12-07T10:37:07.346Z"
  },
  "bot_responses": [    // ← SHOULD BE THIS
    {
      "id": "123",
      "message": "...",
      "created_at": "2025-12-07T10:37:08.202Z"
    }
  ]
}
```

### **Actual Response:**
```json
{
  "user_message": {    // ← Also inconsistent: should be customer_message
    "id": "122",
    "session_id": 21,
    "sender": "customer",
    "message": "are you bot?",
    "created_at": "2025-12-07T10:37:07.346Z"
  },
  "bot_messages": [    // ← WRONG: should be bot_responses
    {
      "id": "123",
      "message": "I'm an AI shopping assistant...",
      "created_at": "2025-12-07T10:37:08.202Z"
    }
  ],
  "session_id": 21
}
```

---

## 💥 IMPACT

### **Issues:**
1. ❌ **Naming inconsistency:** `bot_messages` vs `bot_responses`
2. ❌ **Naming inconsistency:** `user_message` vs `customer_message`
3. ⚠️ Frontend phải handle nhiều field names
4. ⚠️ Không follow documentation

### **Current Workaround:**
Frontend đã add fallback parsing:
```typescript
const botResponses = data?.bot_responses || data?.bot_messages || [];
```

---

## ✅ EXPECTED BEHAVIOR

API `POST /chat/send` should return:

```json
{
  "customer_message": {
    // User's message that was sent
  },
  "bot_responses": [
    // Array of bot responses from Rasa
  ]
}
```

**Consistent với:**
- Field name trong documentation
- Other APIs naming convention
- TypeScript interfaces

---

## 🛠️ SUGGESTED FIX

### **File:** `src/chat/chat.service.ts` hoặc `chat.controller.ts`

**Change:**
```typescript
// Before
return {
  user_message: savedUserMessage,
  bot_messages: botResponses,
  session_id: session_id
};

// After
return {
  customer_message: savedUserMessage,  // Consistent naming
  bot_responses: botResponses,          // Match documentation
};
```

---

## 📊 RELATED

- `POST /chat/session` - Uses correct naming ✅
- `GET /chat/history` - Need to verify naming
- Documentation: API_CHAT.md

---

## 🎯 PRIORITY

**MEDIUM** - Frontend has workaround, but should fix for consistency

**Impact:**
- Documentation mismatch
- Code maintainability
- Future API consumers

---

## 📝 NOTES

Frontend đã implement workaround để support cả 2 naming:
- `bot_responses` (documented)
- `bot_messages` (actual)

Recommend backend fix để match documentation.

---

**Bug Report v1.0**  
**Created:** 2024-12-07 17:38  
**Assigned to:** Backend Team
