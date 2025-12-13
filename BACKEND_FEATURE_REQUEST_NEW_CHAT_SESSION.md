# Backend Feature Request: Force Create New Chat Session

## Current Behavior (Issue)

**Problem:** Logged-in users cannot create new chat sessions - `POST /api/v1/chat/session` always returns existing session.

### For Logged-in Users:
```http
POST /api/v1/chat/session
Authorization: Bearer <JWT>
Body: {}

Response: Always returns THE SAME session (last active)
{
  "session": {
    "id": "123",  // ← Same ID every time
    "customer_id": 1,
    "visitor_id": null,
    ...
  },
  "is_new": false
}
```

### For Guest Users:
✅ Works - Generate new `visitor_id` → New session created

---

## Expected Behavior

Users should be able to create **multiple chat sessions** like ChatGPT:
- Session 1: "Chat về áo thun"
- Session 2: "Hỏi về shipping"
- Session 3: "Tìm quần jeans"

Each "New Chat" button click should create a **fresh, empty conversation**.

---

## Proposed Solution

### Option 1: Add `force_new` Parameter (Recommended)

```typescript
POST /api/v1/chat/session
Authorization: Bearer <JWT>
Body: { "force_new": true }

Response: Creates NEW session
{
  "session": {
    "id": "456",  // ← New ID
    "customer_id": 1,
    "visitor_id": null,
    "created_at": "2025-12-13T...",
    "updated_at": "2025-12-13T..."
  },
  "is_new": true
}
```

**Backend Logic:**
```typescript
@Post('session')
async createOrGetSession(
  @Body() body: { force_new?: boolean },
  @Req() req: Request
) {
  const customerId = req.user?.id;
  
  if (body.force_new) {
    // Force create new session
    return this.chatService.createNewSession(customerId);
  } else {
    // Get or create (existing behavior)
    return this.chatService.getOrCreateSession(customerId);
  }
}
```

### Option 2: Separate Endpoint

```typescript
POST /api/v1/chat/session/new
Authorization: Bearer <JWT>
Body: {}

// Always creates new session
```

---

## Use Cases

### 1. New Chat Button
User clicks "New Chat" → Frontend sends `force_new: true` → Fresh conversation

### 2. Continue Existing Chat
User clicks session in sidebar → Frontend loads that session's history

### 3. Auto-Resume Last Chat
User opens chat widget → Frontend gets existing session (no `force_new`)

---

## Database Implications

**No schema changes needed** - Just creation logic:

```sql
-- Currently: Find active session OR create if not exists
SELECT * FROM chat_sessions 
WHERE customer_id = $1 AND status = 'active'
ORDER BY updated_at DESC LIMIT 1;

-- With force_new: Always INSERT new row
INSERT INTO chat_sessions (customer_id, ...) VALUES ($1, ...);
```

**Old sessions remain** for history - mark as inactive or keep all.

---

## Frontend Implementation (Ready)

Frontend already prepared:

```typescript
// In chatService.ts
createNewSession: async () => {
  return apiClient.post('/api/v1/chat/session', { 
    force_new: true  // ← Waiting for backend support
  });
}

// In chat page
const handleNewChat = async () => {
  const response = await chatService.createNewSession();
  // Load new empty session
}
```

---

## Alternative Workaround (Current)

**For guests only:**
```typescript
// Generate new visitor_id → Backend creates new session
const newVisitorId = crypto.randomUUID();
await chatService.createOrGetSession({ visitor_id: newVisitorId });
```

**For logged-in users:**
❌ No workaround available - Always gets same session

---

## Priority

**MEDIUM-HIGH** - UX feature that affects user experience significantly. Users expect ChatGPT-like behavior where they can organize conversations into separate sessions.

---

## Testing

```bash
# Test 1: Create first session
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"force_new": true}'
# Expected: Session ID = 1

# Test 2: Create second session (same user)
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"force_new": true}'
# Expected: Session ID = 2 (different from first)

# Test 3: Get existing session (no force_new)
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: Session ID = 2 (last active session)
```

---

## Summary

Add `force_new: boolean` parameter to `POST /api/v1/chat/session` endpoint to allow creating multiple chat sessions per user, enabling ChatGPT-like conversation organization.
