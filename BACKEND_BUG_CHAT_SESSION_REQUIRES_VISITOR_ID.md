# Backend Bug Report: Chat Session API Requires visitor_id Even When JWT Present

## Bug Category
**API Design Issue** - Backend validation too strict

## Affected Endpoints
1. `POST /api/v1/chat/session`
2. `GET /api/v1/chat/sessions/history`

## Current Behavior (Incorrect)

### 1. POST /api/v1/chat/session

**Request from logged-in user:**
```http
POST /api/v1/chat/session
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{}
```

**Response:**
```http
HTTP/1.1 400 Bad Request

{
  "statusCode": 400,
  "message": "Bad Request"
}
```

### 2. GET /api/v1/chat/sessions/history

**Request from logged-in user:**
```http
GET /api/v1/chat/sessions/history?limit=50
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```http
HTTP/1.1 400 Bad Request

{
  "statusCode": 400,
  "message": "Bad Request"
}
```

---

## Expected Behavior (Correct)

### For Authenticated Users (Has JWT Token)

Backend should:
1. **Extract `customer_id` from JWT token automatically**
2. **Not require `visitor_id` or `customer_id` in request body/params**
3. **Use extracted `customer_id` to create/fetch customer sessions**

### Example Flow:

#### POST /api/v1/chat/session

**Request:**
```http
POST /api/v1/chat/session
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{}
```

**Expected Response:**
```json
{
  "session": {
    "id": "1",
    "customer_id": 1,           // ✅ From JWT
    "visitor_id": null,
    "created_at": "2025-12-13T...",
    "updated_at": "2025-12-13T..."
  },
  "is_new": false
}
```

#### GET /api/v1/chat/sessions/history

**Request:**
```http
GET /api/v1/chat/sessions/history?limit=50
Authorization: Bearer <JWT_TOKEN>
```

**Expected Response:**
```json
{
  "sessions": {
    "today": [...],
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

## Root Cause

Backend validation requires `visitor_id` or `customer_id` even when JWT token is present:

```typescript
// Current (incorrect) validation
@Body() createSessionDto: CreateSessionDto  // visitor_id or customer_id REQUIRED

// Should be (correct)
@Body() createSessionDto?: CreateSessionDto  // OPTIONAL when JWT present
```

Backend should prioritize:
1. If JWT token exists → Extract `customer_id` from JWT
2. Else if `visitor_id` in body/params → Use visitor session
3. Else → Return 401 Unauthorized

---

## Impact

- Frontend cannot create chat sessions for logged-in users
- Logged-in users are forced to use visitor sessions
- `customer_id` is always `null` even when user is authenticated
- Chat history cannot be loaded for logged-in users

---

## Suggested Fix

### 1. Update DTO Validation

Make `visitor_id` and `customer_id` optional:

```typescript
// src/modules/chat/dto/create-session.dto.ts
export class CreateSessionDto {
  @IsString()
  @IsOptional()  // ✅ Add this
  visitor_id?: string;

  @IsNumber()
  @IsOptional()  // ✅ Add this
  customer_id?: number;
}
```

### 2. Update Controller Logic

```typescript
// src/modules/chat/chat.controller.ts

@Post('session')
async createOrGetSession(
  @Body() createSessionDto: CreateSessionDto,
  @Req() req: Request  // Get JWT from request
) {
  // Priority 1: Extract customer_id from JWT if present
  const customerId = req.user?.id;  // From JWT
  
  // Priority 2: Use provided customer_id or visitor_id
  const visitorId = createSessionDto.visitor_id;
  
  if (customerId) {
    // Logged-in user - use customer_id from JWT
    return this.chatService.createOrGetCustomerSession(customerId);
  } else if (visitorId) {
    // Guest user - use visitor_id
    return this.chatService.createOrGetVisitorSession(visitorId);
  } else {
    // No authentication
    throw new UnauthorizedException('visitor_id or valid JWT required');
  }
}
```

### 3. Update Sessions History Endpoint

```typescript
@Get('sessions/history')
async getSessionsHistory(
  @Query('visitor_id') visitorId?: string,
  @Query('customer_id') customerId?: number,
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Req() req: Request
) {
  // Priority 1: Use customer_id from JWT
  const authCustomerId = req.user?.id;
  
  const finalCustomerId = authCustomerId || customerId;
  
  if (finalCustomerId) {
    return this.chatService.getCustomerSessions(finalCustomerId, page, limit);
  } else if (visitorId) {
    return this.chatService.getVisitorSessions(visitorId, page, limit);
  } else {
    throw new BadRequestException('visitor_id or valid JWT required');
  }
}
```

---

## Testing

### Test Case 1: Logged-in User Creates Session

```bash
# Should work without visitor_id in body
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Authorization: Bearer <VALID_JWT>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:** 201 Created with `customer_id` from JWT

### Test Case 2: Guest User Creates Session

```bash
# Should work with visitor_id
curl -X POST http://localhost:3001/api/v1/chat/session \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "uuid-v4-string"}'
```

**Expected:** 201 Created with `visitor_id`, `customer_id = null`

### Test Case 3: Logged-in User Gets Session History

```bash
# Should work without query params
curl -X GET "http://localhost:3001/api/v1/chat/sessions/history?limit=50" \
  -H "Authorization: Bearer <VALID_JWT>"
```

**Expected:** 200 OK with customer's sessions

---

## Priority
**HIGH** - Blocks chat functionality for all logged-in users

## Workaround (Temporary)
Frontend can continue sending `visitor_id` even for logged-in users, but this defeats the purpose of authentication and makes chat history unusable.

---

## Related Files
- `src/modules/chat/chat.controller.ts`
- `src/modules/chat/chat.service.ts`
- `src/modules/chat/dto/create-session.dto.ts`
- `src/modules/chat/entities/chat-session.entity.ts`
