# 🧪 QUY TRÌNH TEST CHATBOT - COMPLETE PROCEDURE

**Version:** 1.0  
**Date:** 2024-12-07  
**Status:** Ready for Full Integration Testing

---

## 📋 OVERVIEW

Test chatbot feature end-to-end từ Frontend → Rasa → Backend → Database.

**Test Levels:**
1. ✅ Unit Testing (Backend APIs) - Đã xong
2. 🔶 Integration Testing (Rasa ↔ Backend) - Cần test
3. 🔶 E2E Testing (Frontend ↔ Rasa ↔ Backend) - Cần test
4. ⏳ User Acceptance Testing (UAT) - Sau khi pass E2E

---

## 🚀 PHASE 1: SETUP & PREPARATION (15 phút)

### Step 1.1: Seed Test Data

```bash
# Run SQL seed script
cd c:\Users\USER\Downloads\kltn_be\scripts
psql -U your_username -d your_database -f seed-chatbot-test-data.sql

# Verify data created
psql -U your_username -d your_database
SELECT customer_id, full_name, email FROM customers WHERE customer_id IN (100, 101);
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_variants;
```

**Expected Result:**
- ✅ 2 test customers created (ID: 100, 101)
- ✅ 4+ test products with variants
- ✅ 2 test orders (1 pending, 1 processing)

### Step 1.2: Start All Services

**Terminal 1 - Backend:**
```bash
cd c:\Users\USER\Downloads\kltn_be
npm run start:dev
```
**Verify:** Open http://localhost:3001/api-docs → Should see Swagger UI

**Terminal 2 - Rasa Actions:**
```bash
cd c:\Users\USER\Downloads\kltn_chatbot
.\venv\Scripts\activate
rasa run actions --debug
```
**Verify:** Should see "Action server is up and running on http://localhost:5055"

**Terminal 3 - Rasa Server:**
```bash
cd c:\Users\USER\Downloads\kltn_chatbot
rasa run --enable-api --debug --cors "*"
```
**Verify:** Should see "Rasa server is up and running on http://localhost:5005"

**Terminal 4 - Frontend:**
```bash
cd c:\Users\USER\Downloads\kltn_fe  # adjust path
npm run dev
```
**Verify:** Open http://localhost:3000 → Should see homepage

### Step 1.3: Health Check

```bash
# Check Backend
curl http://localhost:3001/api-docs
# Expected: 200 OK

# Check Rasa Actions
curl http://localhost:5055/health
# Expected: {"status": "ok"}

# Check Rasa Server
curl http://localhost:5005
# Expected: "Hello from Rasa..."
```

---

## 🧪 PHASE 2: BACKEND API TESTING (30 phút)

Test từng API riêng lẻ trước khi test full flow.

### Test 2.1: Size Chart API

```bash
# Test Size Chart
curl -X GET "http://localhost:3001/api/chatbot/size-chart/shirt" \
  -H "X-Internal-Api-Key: KhoaBiMatChoRasaGoi"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "category": "shirt",
    "image_url": "https://cdn.site.com/charts/shirt.png",
    "description": "Size chart for shirt"
  }
}
```

**✅ PASS nếu:**
- Status code: 200
- Data có đầy đủ fields

**❌ FAIL nếu:**
- 401 Unauthorized → Check API key
- 404 Not Found → Check endpoint

### Test 2.2: Size Advice API

```bash
curl -X POST "http://localhost:3001/api/chatbot/size-advice" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: KhoaBiMatChoRasaGoi" \
  -d '{
    "height": 170,
    "weight": 65,
    "category": "shirt"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "recommended_size": "M",
    "confidence": "high",
    "reason": "Based on your height and weight measurements",
    "note": "Please check size chart for accuracy",
    "measurements": {
      "height": "170 cm",
      "weight": "65 kg"
    }
  }
}
```

**✅ PASS nếu:** Recommend size M hoặc L

### Test 2.3: Product Recommendations API

```bash
curl -X GET "http://localhost:3001/api/chatbot/products/recommend?context=wedding&limit=3" \
  -H "X-Internal-Api-Key: KhoaBiMatChoRasaGoi"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "context": "wedding",
    "total": 3,
    "recommendations": [
      {
        "product_id": 123,
        "name": "Áo Sơ Mi Trắng Elegant",
        "price": 299000,
        "in_stock": true
      }
    ]
  }
}
```

**✅ PASS nếu:** Có ít nhất 1 product với `occasion: wedding` trong attributes

### Test 2.4: Add to Cart API

```bash
# First, get a variant_id from database
# SELECT variant_id FROM product_variants LIMIT 1;

curl -X POST "http://localhost:3001/api/chatbot/cart/add" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: KhoaBiMatChoRasaGoi" \
  -d '{
    "customer_id": 100,
    "variant_id": 1,
    "quantity": 1
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Product added to cart successfully",
    "cart_item_id": 123,
    "quantity": 1
  }
}
```

**✅ PASS nếu:** Status 201, cart_item_id được trả về

### Test 2.5: Cancel Order API

```bash
# Use order_id from test data (should be PENDING status)
curl -X POST "http://localhost:3001/api/chatbot/orders/1/cancel" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: KhoaBiMatChoRasaGoi" \
  -d '{
    "customer_id": 100
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Order cancelled successfully",
    "order_id": 1,
    "status": "CANCELLED"
  }
}
```

**✅ PASS nếu:** Order status changed to CANCELLED

---

## 🤖 PHASE 3: RASA INTEGRATION TESTING (45 phút)

Test Rasa actions gọi Backend APIs.

### Test 3.1: Rasa Shell Testing

```bash
# Terminal mới
cd c:\Users\USER\Downloads\kltn_chatbot
rasa shell --debug
```

**Test Scenario 1: Greet + Product Search**
```
You: Xin chào
Bot: Xin chào! Tôi là trợ lý mua sắm...

You: Tìm áo sơ mi trắng
Bot: [Danh sách sản phẩm...]
```

**✅ PASS nếu:** Bot trả về danh sách products

**Test Scenario 2: Size Chart**
```
You: Cho tôi xem bảng size áo
Bot: [Trả về URL hoặc hình ảnh bảng size]
```

**✅ PASS nếu:** Bot trả về size chart info

**Test Scenario 3: Size Advice**
```
You: Mình cao 1m7, nặng 65kg nên mặc size gì?
Bot: Dựa trên chiều cao và cân nặng của bạn, tôi gợi ý size M...
```

**✅ PASS nếu:** Bot recommend size M hoặc L

**Test Scenario 4: Add to Cart (Slot Filling)**
```
You: Thêm áo sơ mi vào giỏ
Bot: Bạn muốn size nào? (S/M/L/XL)

You: M
Bot: Bạn chọn màu gì?

You: Trắng
Bot: Đã thêm sản phẩm vào giỏ hàng!
```

**✅ PASS nếu:**
- Bot hỏi size
- Bot hỏi màu
- Bot confirm thêm vào giỏ

**Test Scenario 5: Context Recommendations**
```
You: Đi đám cưới mặc gì?
Bot: Tôi gợi ý những trang phục sau cho dịp đám cưới...
```

**✅ PASS nếu:** Bot gợi ý products có `occasion: wedding`

**Test Scenario 6: Cancel Order**
```
You: Hủy đơn hàng số 1
Bot: Bạn có chắc muốn hủy đơn hàng #1?

You: Có
Bot: Đơn hàng #1 đã được hủy thành công
```

**✅ PASS nếu:** Order status = CANCELLED trong DB

**Test Scenario 7: Gemini Fallback**
```
You: Màu nào hợp với da ngăm?
Bot: [Câu trả lời từ Gemini AI...]
```

**✅ PASS nếu:** Bot trả lời dựa trên Gemini (hoặc fallback message)

### Test 3.2: Check Logs

Trong khi test, check logs ở các terminals:

**Rasa Actions Log:**
```
[Action Server] Calling action: action_add_to_cart
[API Client] POST http://localhost:3001/api/chatbot/cart/add
[API Client] Response: 201 Created
```

**Backend Log:**
```
[ChatbotController] POST /api/chatbot/cart/add
[ChatbotService] Adding to cart for customer 100
[CartService] Item added successfully
```

**✅ PASS nếu:** Không có errors, requests flow đúng

---

## 🌐 PHASE 4: E2E FRONTEND TESTING (1 giờ)

Test full flow qua UI.

### Step 4.1: Login as Test User

1. Mở http://localhost:3000
2. Login với:
   - **Email:** `chatbot.test@example.com`
   - **Password:** `test123` (hoặc password bạn đã set)
3. Verify: User logged in, có customer_id = 100

### Step 4.2: Open Chatbot Widget

1. Click vào chatbot icon (thường ở góc dưới bên phải)
2. Widget mở ra
3. Verify: Có message box để nhập tin nhắn

### Step 4.3: Test Conversation Flows

**Flow 1: Product Search**
```
Input: "Tìm áo sơ mi trắng"
Expected: Danh sách sản phẩm hiển thị trong chat
         + Click vào sản phẩm → Mở product detail page
```

**Flow 2: Add to Cart**
```
Input: "Thêm áo sơ mi vào giỏ"
Bot: "Bạn muốn size nào?"
Input: "M"
Bot: "Bạn chọn màu gì?"
Input: "Trắng"
Bot: "Đã thêm vào giỏ hàng!"

→ Check giỏ hàng: Verify có sản phẩm mới
```

**Flow 3: Size Consultation**
```
Input: "Mình cao 1m7, 65kg nên mặc size gì?"
Expected: Bot recommend size M hoặc L với explanation
```

**Flow 4: Check Stock**
```
Input: "Áo sơ mi trắng size M còn không?"
Expected: Bot trả lời "Còn hàng" hoặc "Hết hàng"
```

**Flow 5: Size Chart**
```
Input: "Cho tôi xem bảng size áo"
Expected: Hiển thị hình ảnh hoặc link bảng size
```

**Flow 6: Recommendations**
```
Input: "Đi đám cưới mặc gì?"
Expected: Danh sách trang phục formal/elegant
```

**Flow 7: Order Management**
```
Input: "Hủy đơn hàng số 1"
Bot: "Bạn có chắc?"
Input: "Có"
Expected: Confirm hủy thành công
         → Check order list: Order #1 status = CANCELLED
```

**Flow 8: Fallback**
```
Input: "Màu nào hợp với da ngăm?"
Expected: Gemini AI answer hoặc fallback message
```

**Flow 9: Out of Scope**
```
Input: "Giá vàng hôm nay bao nhiêu?"
Expected: "Xin lỗi, tôi chỉ có thể hỗ trợ về thời trang..."
```

**Flow 10: Contact Human**
```
Input: "Tôi muốn gặp nhân viên"
Expected: Tạo support ticket hoặc thông báo sẽ được liên hệ
```

### Step 4.4: Cross-Device Testing

Test trên:
- ✅ Desktop Chrome
- ✅ Desktop Firefox
- ✅ Mobile Chrome (DevTools responsive mode)
- ✅ Mobile Safari (nếu có)

### Step 4.5: Performance Check

Measure response times:
- First message response: < 2s
- Product search: < 3s
- Add to cart: < 2s
- Recommendations: < 3s

---

## 📊 PHASE 5: BUG REPORTING & TRACKING

### Bug Report Template

```markdown
## Bug ID: CB-001
**Severity:** Critical / High / Medium / Low
**Component:** Frontend / Rasa / Backend
**Found in:** Phase 4, Flow 2

**Description:**
Add to cart không work khi chọn size M

**Steps to Reproduce:**
1. Login as customer_id 100
2. Open chatbot
3. Input: "Thêm áo sơ mi vào giỏ"
4. Input size: "M"
5. Input color: "Trắng"

**Expected Result:**
Bot confirm "Đã thêm vào giỏ hàng"

**Actual Result:**
Bot trả lời "Có lỗi xảy ra"

**Logs:**
[Attach logs from Rasa Actions, Backend]

**Screenshots:**
[Attach screenshot]

**Environment:**
- OS: Windows 11
- Browser: Chrome 120
- Backend: Running on localhost:3001
- Rasa: Running on localhost:5005
```

### Bug Severity Levels

**Critical:**
- App crash
- Data loss
- Security vulnerabilities
- Core flow không work (add to cart, search)

**High:**
- Feature không hoạt động
- Sai logic nghiêm trọng
- Performance issue nghiêm trọng

**Medium:**
- UI/UX issues
- Minor logic errors
- Slow response (3-5s)

**Low:**
- Text/spelling errors
- Minor UI glitches
- Non-critical enhancements

---

## ✅ ACCEPTANCE CRITERIA

### Must Pass (Critical)

- [ ] All 4 services start successfully
- [ ] Backend APIs respond với correct data
- [ ] Rasa recognizes all 29 intents
- [ ] Product search works (shows results)
- [ ] Add to cart works (item added to DB)
- [ ] Size advice works (returns recommendation)
- [ ] Cancel order works (status updated)
- [ ] No critical errors in logs

### Should Pass (High Priority)

- [ ] Slot filling works (size, color)
- [ ] Context recommendations work
- [ ] Size chart displays correctly
- [ ] Stock check accurate
- [ ] Wishlist add works
- [ ] Response time < 3s average

### Nice to Have (Medium Priority)

- [ ] Gemini AI integration works
- [ ] Error messages user-friendly
- [ ] Conversation flow natural
- [ ] UI/UX smooth
- [ ] Works on mobile

---

## 📈 TESTING METRICS

Track during testing:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| API Success Rate | >95% | ___ | ⏳ |
| Intent Recognition | >85% | ___ | ⏳ |
| Avg Response Time | <2s | ___ | ⏳ |
| Task Completion | >80% | ___ | ⏳ |
| Critical Bugs | 0 | ___ | ⏳ |
| High Bugs | <3 | ___ | ⏳ |

---

## 🚨 ROLLBACK PLAN

Nếu gặp critical issues:

**Option 1: Fix Forward**
- Nếu bug nhỏ, fix ngay và test lại
- Phù hợp cho: typo, config errors

**Option 2: Feature Flag**
- Disable chatbot feature
- Hiển thị "Tính năng tạm thời bảo trì"
- Fix offline, deploy sau

**Option 3: Rollback**
- Revert git commits
- Restore database backup
- Only nếu critical data corruption

---

## 📞 ESCALATION PATH

**Level 1:** Developer tự fix (< 1 giờ)
**Level 2:** Team lead review (< 4 giờ)
**Level 3:** PM escalate (> 4 giờ)

**Critical Bug:** Notify PM immediately

---

## 📝 TEST COMPLETION CHECKLIST

### Backend Team
- [ ] All 7 APIs tested manually
- [ ] Postman collection created
- [ ] Logs clean, no errors
- [ ] Performance acceptable

### AI Team
- [ ] All 29 intents work in shell
- [ ] 14 actions call APIs successfully
- [ ] Slot filling working
- [ ] Error handling tested

### Frontend Team
- [ ] Chat widget integrated
- [ ] All 10 flows work E2E
- [ ] UI responsive on mobile
- [ ] Error states handled

### QA Team
- [ ] All test scenarios executed
- [ ] Bugs documented
- [ ] Regression testing done
- [ ] Sign-off report created

---

## 🎉 FINAL SIGN-OFF

**Tested by:** _________________  
**Date:** _________________  
**Status:** PASS / FAIL / CONDITIONAL PASS  

**Notes:**
_______________________________________
_______________________________________

**Approved for Production:** YES / NO  
**Deployment Date:** _________________

---

**Next Steps After Testing:**
1. Fix all critical + high bugs
2. Create production deployment checklist
3. Prepare monitoring & alerting
4. Plan gradual rollout (beta users first)
5. Setup customer feedback collection
