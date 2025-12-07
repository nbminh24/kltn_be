# ⚡ QUICK TEST CHECKLIST - CHATBOT

**Use this for quick daily testing** | Full procedure: `TESTING_PROCEDURE.md`

---

## 🚀 QUICK START (5 phút)

### 1. Start Services
```bash
# Terminal 1
cd kltn_be && npm run start:dev

# Terminal 2
cd kltn_chatbot && .\venv\Scripts\activate && rasa run actions --debug

# Terminal 3
cd kltn_chatbot && rasa run --enable-api --debug --cors "*"

# Terminal 4
cd kltn_fe && npm run dev
```

### 2. Verify Health
- [ ] http://localhost:3001/api-docs ✅
- [ ] http://localhost:5055/health ✅
- [ ] http://localhost:5005 ✅
- [ ] http://localhost:3000 ✅

---

## 🧪 SMOKE TESTS (10 phút)

### Backend APIs (use Postman or curl)

```bash
# Set API_KEY
export API_KEY="KhoaBiMatChoRasaGoi"

# Test 1: Size Chart
curl -X GET "http://localhost:3001/api/chatbot/size-chart/shirt" \
  -H "X-Internal-Api-Key: $API_KEY"
# Expected: 200 + size chart URL

# Test 2: Size Advice
curl -X POST "http://localhost:3001/api/chatbot/size-advice" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: $API_KEY" \
  -d '{"height": 170, "weight": 65}'
# Expected: 200 + size recommendation

# Test 3: Recommendations
curl -X GET "http://localhost:3001/api/chatbot/products/recommend?context=wedding&limit=3" \
  -H "X-Internal-Api-Key: $API_KEY"
# Expected: 200 + product list

# Test 4: Add to Cart
curl -X POST "http://localhost:3001/api/chatbot/cart/add" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: $API_KEY" \
  -d '{"customer_id": 100, "variant_id": 1, "quantity": 1}'
# Expected: 201 + cart_item_id
```

### Rasa Shell Tests

```bash
cd kltn_chatbot
rasa shell

# Test conversation:
You: Xin chào
Bot: [Greeting response]

You: Tìm áo thun
Bot: [Product list]

You: Cao 1m7, 65kg mặc size gì?
Bot: [Size M recommendation]

You: Thêm vào giỏ
Bot: [Ask size]
You: M
Bot: [Ask color]
You: Đen
Bot: [Confirm added]
```

---

## 🌐 E2E TESTS (15 phút)

### Frontend → Rasa → Backend

1. **Login:** http://localhost:3000
   - Email: `chatbot.test@example.com`
   - Password: `test123`

2. **Open Chatbot Widget**
   - [ ] Widget visible
   - [ ] Can type message

3. **Test 5 Critical Flows:**

**Flow 1: Search**
```
Input: "Tìm áo sơ mi"
✅ Shows product list
✅ Can click product → Opens detail page
```

**Flow 2: Add to Cart**
```
Input: "Thêm áo sơ mi vào giỏ"
Bot: "Size nào?"
Input: "M"
Bot: "Màu gì?"
Input: "Trắng"
✅ Confirms added
✅ Check cart → Item exists
```

**Flow 3: Size Advice**
```
Input: "1m7 65kg mặc size gì?"
✅ Recommends size M or L
```

**Flow 4: Recommendations**
```
Input: "Đi đám cưới mặc gì?"
✅ Shows formal products
```

**Flow 5: Size Chart**
```
Input: "Bảng size áo"
✅ Shows size chart
```

---

## 📊 DAILY CHECK

### Morning Check (Before team starts)
- [ ] All services start without errors
- [ ] Database accessible
- [ ] Test user login works
- [ ] Smoke tests pass

### Pre-Demo Check
- [ ] All 5 E2E flows work
- [ ] No errors in logs
- [ ] Response time < 3s
- [ ] Mobile responsive working

### Before Deployment
- [ ] All tests green
- [ ] Bug count acceptable
- [ ] Performance metrics met
- [ ] Team sign-off received

---

## 🐛 COMMON ISSUES

### Issue: 401 Unauthorized
**Fix:** Check `X-Internal-Api-Key` matches in both `.env` files

### Issue: Rasa not responding
**Fix:** 
```bash
# Kill processes
taskkill /F /IM rasa.exe
# Restart Rasa
rasa run --enable-api --debug --cors "*"
```

### Issue: Add to cart fails
**Fix:** 
- Check customer_id exists (100)
- Check variant_id exists
- Check stock > 0

### Issue: Products not found
**Fix:** Run seed script:
```bash
psql -U user -d db -f scripts/seed-chatbot-test-data.sql
```

---

## ✅ QUICK METRICS

| Metric | Target | How to Check |
|--------|--------|--------------|
| API Uptime | 100% | All 4 health checks pass |
| Response Time | <2s | Test with network tab |
| Error Rate | <5% | Check logs for errors |
| Intent Accuracy | >85% | Test 10 messages, count correct |

---

## 🚨 ESCALATION

**If any critical test fails:**
1. Check logs in all terminals
2. Document error with screenshots
3. Report in Slack #chatbot-bugs
4. If blocking, escalate to PM

**Critical = Cannot proceed with testing**

---

**Last Updated:** 2024-12-07  
**Maintained by:** Backend Team
