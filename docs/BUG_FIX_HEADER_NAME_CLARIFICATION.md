# Bug Fix: API Header Name Clarification

**Date:** 12/12/2024  
**Bug Report:** `BUG_REPORT_BACKEND_401_HEADER_MISMATCH.md`  
**Severity:** 🟡 MEDIUM - Misunderstanding  
**Status:** ✅ CLARIFIED - No Backend Changes Needed

---

## 📋 Summary

The 401 error was caused by chatbot using the **wrong header name** (`x-api-key` instead of `x-internal-api-key`). The backend implementation and documentation are **both correct**.

---

## 🔍 Root Cause

### The Confusion

The chatbot was using `x-api-key` header, which is the header name for the **generic ApiKeyGuard** used by `/internal/*` endpoints, but chatbot endpoints use a **different guard** (`InternalApiKeyGuard`) that expects `x-internal-api-key`.

### Backend Has Two Different Guards

**1. InternalApiKeyGuard** (for chatbot)
- **File:** `src/modules/chatbot/guards/internal-api-key.guard.ts`
- **Header checked:** `x-internal-api-key` (line 14)
- **Used by:** `/api/chatbot/*` endpoints
- **Swagger docs:** `X-Internal-Api-Key`

**2. ApiKeyGuard** (for other internal APIs)
- **File:** `src/common/guards/api-key.guard.ts`
- **Header checked:** `x-api-key` (line 10)
- **Used by:** `/internal/*` endpoints (product search, etc.)

---

## ✅ The Fix (Chatbot Side)

Chatbot team already fixed this by changing:

**Before:**
```python
headers = {"x-api-key": self.api_key}  # ❌ Wrong header name
```

**After:**
```python
headers = {"X-Internal-Api-Key": self.api_key}  # ✅ Correct header name
```

---

## 📚 Technical Details: HTTP Header Case-Insensitivity

### Why Uppercase in Docs but Lowercase in Code?

HTTP headers are **case-insensitive** according to RFC 7230. This means:
- `X-Internal-Api-Key`
- `x-internal-api-key`
- `X-INTERNAL-API-KEY`
- `x-InTeRnAl-ApI-kEy`

All of these are treated as **the same header**.

### Node.js/Express Behavior

Node.js automatically normalizes all header names to lowercase:
```javascript
// Client sends:
Headers: { "X-Internal-Api-Key": "secret123" }

// Backend receives:
request.headers['x-internal-api-key'] === "secret123"  // ✅ true
request.headers['X-Internal-Api-Key'] === undefined    // ❌
```

That's why the guard code checks for lowercase:
```typescript
const apiKey = request.headers['x-internal-api-key'];  // Must use lowercase
```

### Swagger Documentation

Swagger docs use **PascalCase with hyphens** for readability:
```typescript
@ApiHeader({
    name: 'X-Internal-Api-Key',  // Display format (more readable)
    description: 'Internal API key for Rasa server authentication',
    required: true,
})
```

This is purely for **display purposes** in Swagger UI. The actual header sent can be any case.

---

## 🧪 Verification

### Test 1: With Correct Header Name

```bash
curl -X POST http://localhost:3001/api/chatbot/cart/add \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: your_key_here" \
  -d '{
    "customer_id": 21,
    "variant_id": 14,
    "quantity": 1
  }'
```

**Expected:** ✅ 200 OK or 201 Created

### Test 2: With Wrong Header Name

```bash
curl -X POST http://localhost:3001/api/chatbot/cart/add \
  -H "x-api-key: your_key_here" \
  -d '...'
```

**Expected:** ❌ 401 Unauthorized - "Invalid or missing internal API key"

### Test 3: Case Variations (All Should Work)

```bash
# These all work because HTTP headers are case-insensitive:
-H "X-Internal-Api-Key: secret"        ✅
-H "x-internal-api-key: secret"        ✅
-H "X-INTERNAL-API-KEY: secret"        ✅
-H "x-InTeRnAl-ApI-kEy: secret"        ✅

# This doesn't work (wrong name):
-H "x-api-key: secret"                 ❌
```

---

## 📊 Backend Implementation Summary

### Chatbot Endpoints (Use InternalApiKeyGuard)

| Endpoint | Guard | Header Name |
|----------|-------|-------------|
| `POST /api/chatbot/cart/add` | InternalApiKeyGuard | `x-internal-api-key` |
| `GET /api/chatbot/cart/:id` | InternalApiKeyGuard | `x-internal-api-key` |
| `POST /api/chatbot/auth/verify` | InternalApiKeyGuard | `x-internal-api-key` |
| All `/api/chatbot/*` | InternalApiKeyGuard | `x-internal-api-key` |

### Other Internal Endpoints (Use ApiKeyGuard)

| Endpoint | Guard | Header Name |
|----------|-------|-------------|
| `GET /internal/products` | ApiKeyGuard | `x-api-key` |
| `GET /internal/variants` | ApiKeyGuard | `x-api-key` |
| All `/internal/*` | ApiKeyGuard | `x-api-key` |

---

## ✅ Checklist: What to Use Where

### For Chatbot Team

When calling **chatbot-specific APIs** (`/api/chatbot/*`):
```python
headers = {
    "X-Internal-Api-Key": os.getenv("INTERNAL_API_KEY"),
    "Content-Type": "application/json"
}
```

When calling **general internal APIs** (`/internal/*`):
```python
headers = {
    "x-api-key": os.getenv("INTERNAL_API_KEY"),
    "Content-Type": "application/json"
}
```

**Note:** Both use the same API key value from environment variable, just different header names.

---

## 🛠️ No Backend Changes Required

The backend implementation is **correct as-is**:

- ✅ Guard checks for lowercase `x-internal-api-key` (correct per Node.js behavior)
- ✅ Swagger docs show `X-Internal-Api-Key` (correct for display)
- ✅ Documentation says `X-Internal-Api-Key` (correct and case-insensitive)
- ✅ Error message is clear: "Invalid or missing internal API key"

---

## 📝 Documentation Status

**All documentation is correct:**
- `BACKEND_API_IMPLEMENTATION_SUMMARY.md` ✅ Says `X-Internal-Api-Key`
- `CUSTOMER_ID_INJECTION_GUIDE.md` ✅ Says `X-Internal-Api-Key`
- Swagger UI ✅ Shows `X-Internal-Api-Key`
- Code implementation ✅ Checks `x-internal-api-key` (lowercase, as expected)

**No updates needed** - the documentation matches the implementation.

---

## 🎯 Conclusion

**Problem:** Chatbot used wrong header name (`x-api-key`)  
**Solution:** Use correct header name (`X-Internal-Api-Key`)  
**Status:** ✅ Fixed by chatbot team  
**Backend changes:** None needed  

**The 401 error should now be resolved** after chatbot team's update.

---

## 🔗 Related Files

**Backend Guards:**
- `src/modules/chatbot/guards/internal-api-key.guard.ts` - Chatbot API guard
- `src/common/guards/api-key.guard.ts` - General internal API guard

**Documentation:**
- `BUG_REPORT_BACKEND_401_HEADER_MISMATCH.md` - Original bug report
- `BACKEND_API_IMPLEMENTATION_SUMMARY.md` - API documentation

---

**Status:** 🟢 RESOLVED  
**Action Required:** None (chatbot team already fixed)  
**Testing:** Verify chatbot can now successfully call add to cart endpoint
