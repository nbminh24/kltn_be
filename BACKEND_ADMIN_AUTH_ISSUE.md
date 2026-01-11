# 🔴 CRITICAL: Backend Admin Authorization Issue

## Error Summary
```
Status: 403 Forbidden
Endpoint: GET /api/v1/promotions?status=active
Error: "Access forbidden - insufficient permissions"
```

---

## Issue Details

### What's Happening
- ✅ Frontend IS sending `Authorization: Bearer {admin_access_token}` header
- ✅ Token is valid (other admin endpoints work)
- ❌ Backend **AdminGuard** is rejecting the request with 403 Forbidden

### Console Evidence
```
🌐 API Request: {url: '/api/v1/promotions', method: 'get'}
🔐 Token attached: eyJhbGciOiJIUzI1NiIs...
❌ Failed to load resource: the server responded with a status of 403 (Forbidden)
```

---

## Root Cause Analysis

### Backend Implementation Check Needed

The backend promotions controller is protected by:
```typescript
@Controller('api/v1/promotions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPromotionsController {
  // ...
}
```

**Possible Issues:**

### 1. AdminGuard Not Recognizing Admin Role
```typescript
// Check trong AdminGuard
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // ⚠️ CHECK: Có đúng field name không?
    // Có thể là: user.role, user.isAdmin, user.admin, etc.
    return user && user.role === 'admin';
  }
}
```

### 2. JWT Payload Missing Admin Info
```typescript
// Check JWT payload structure
// Token được tạo như thế nào trong login?
{
  "email": "admin@example.com",
  "sub": 1,
  "role": "admin", // ⚠️ Field này có tồn tại không?
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 3. Database User Record
```sql
-- Check trong database
SELECT id, email, role, is_admin FROM users WHERE email = 'nbminh24@gmail.com';
-- ⚠️ User này có role = 'admin' hoặc is_admin = true không?
```

---

## Required Fixes (Backend Team)

### Fix 1: Verify AdminGuard Implementation
**File**: `src/common/guards/admin.guard.ts` (hoặc tương tự)

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    console.log('🔍 AdminGuard - User object:', user);
    console.log('🔍 AdminGuard - User role:', user?.role);
    
    // ✅ IMPORTANT: Check đúng field name
    // Có thể là một trong các cách sau:
    // return user && user.role === 'admin';
    // return user && user.isAdmin === true;
    // return user && user.admin === true;
    
    if (!user) {
      console.error('❌ AdminGuard - No user object');
      return false;
    }
    
    if (user.role !== 'admin') {
      console.error('❌ AdminGuard - User is not admin:', user.role);
      return false;
    }
    
    return true;
  }
}
```

### Fix 2: Verify JWT Strategy Populates User Correctly
**File**: `src/modules/auth/strategies/jwt.strategy.ts`

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // ✅ IMPORTANT: Phải load user từ database để lấy role
    const user = await this.usersService.findOne(payload.sub);
    
    console.log('🔍 JWT Strategy - Payload:', payload);
    console.log('🔍 JWT Strategy - User from DB:', user);
    
    // ✅ Return object này sẽ được gán vào request.user
    return {
      id: user.id,
      email: user.email,
      role: user.role, // ⚠️ Đảm bảo field này tồn tại
    };
  }
}
```

### Fix 3: Verify Login Response Includes Role
**File**: `src/modules/auth/auth.service.ts`

```typescript
async login(user: User) {
  const payload = {
    email: user.email,
    sub: user.id,
    role: user.role, // ✅ MUST include role in JWT payload
  };
  
  return {
    access_token: this.jwtService.sign(payload),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // ✅ Also return in response
    },
  };
}
```

### Fix 4: Database Migration (if needed)
```sql
-- If 'role' column doesn't exist
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer';

-- Update admin user
UPDATE users 
SET role = 'admin' 
WHERE email = 'nbminh24@gmail.com';

-- Or if using is_admin boolean
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
UPDATE users SET is_admin = true WHERE email = 'nbminh24@gmail.com';
```

---

## Testing Steps for Backend

### Step 1: Add Debug Logging
```typescript
// In AdminGuard
console.log('AdminGuard check:', {
  hasUser: !!request.user,
  userObject: request.user,
  role: request.user?.role,
  isAdmin: request.user?.role === 'admin'
});
```

### Step 2: Test JWT Decode
```bash
# Decode token để xem payload
# Copy token từ localStorage (admin_access_token)
# Paste vào https://jwt.io để decode

# Hoặc dùng command line:
echo "YOUR_TOKEN_HERE" | cut -d. -f2 | base64 -d | jq
```

Expected payload should contain:
```json
{
  "email": "nbminh24@gmail.com",
  "sub": 1,
  "role": "admin",  // ⚠️ THIS IS CRITICAL
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Step 3: Verify Database
```sql
SELECT * FROM users WHERE email = 'nbminh24@gmail.com';
-- Should show role = 'admin' or is_admin = true
```

### Step 4: Test Endpoint
```bash
# After fixes, test with curl
curl -X GET "http://localhost:3001/api/v1/promotions" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Should return 200 with promotions list, not 403
```

---

## Quick Debug Checklist

- [ ] AdminGuard exists and is imported correctly
- [ ] AdminGuard checks correct field (`user.role`, `user.isAdmin`, etc.)
- [ ] JWT Strategy loads user from database (not just using payload)
- [ ] User record in database has admin role set
- [ ] Login endpoint includes role in JWT payload
- [ ] Login endpoint returns role in response
- [ ] Token refresh preserves role information
- [ ] All admin endpoints use `@UseGuards(JwtAuthGuard, AdminGuard)`

---

## Temporary Workaround (NOT RECOMMENDED)

If you need to test immediately, you can temporarily remove AdminGuard:

```typescript
@Controller('api/v1/promotions')
@UseGuards(JwtAuthGuard) // Remove AdminGuard temporarily
export class AdminPromotionsController {
  // ...
}
```

**⚠️ WARNING**: This makes the endpoint accessible to all authenticated users, not just admins. Fix the AdminGuard ASAP.

---

## Expected Behavior After Fix

✅ Request with admin token → 200 OK with data
❌ Request with regular user token → 403 Forbidden
❌ Request without token → 401 Unauthorized

---

## Priority

🔴 **CRITICAL** - Blocking promotion management feature

## Next Steps

1. Backend team: Check AdminGuard implementation
2. Verify JWT payload includes role
3. Verify database user has admin role
4. Add debug logging to identify exact issue
5. Test and confirm fix
6. Frontend team: Will test after backend fix is deployed

---

**Current Status**: Frontend is correct. Waiting for backend admin authorization fix.
