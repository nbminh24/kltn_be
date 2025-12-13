# 🐛 BUG REPORT - Chatbot Entity Extraction Not Working

**Date:** December 9, 2025, 10:34 AM  
**Reporter:** Backend Team  
**Severity:** 🔴 HIGH (Core feature broken)  
**Status:** ACTIVE  
**Assigned to:** Chatbot/Rasa Team

---

## 📋 SUMMARY

Chatbot action đang gửi **TOÀN BỘ user input** làm search query thay vì extract `product_name` entity. Điều này làm backend API không tìm được sản phẩm.

---

## 🔴 ISSUE

### **Test Case:**

**User input:**
```
"tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular"
```

**What chatbot sends to API:**
```python
query = "tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular"
# ❌ WRONG - sending entire sentence
```

**What should be sent:**
```python
query = "ao-khoac-nam-lightweight-windbreaker-form-regular"
# ✅ CORRECT - only the product name/slug
```

---

## 📊 EVIDENCE

### **Chatbot Logs:**
```
2025-12-09 10:32:37 INFO  actions.api_client  
- Searching products with query: tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular, category: None

2025-12-09 10:32:37 INFO  actions.actions  
- ✅ API search_products took 0.604s

2025-12-09 10:32:37 INFO  actions.actions  
- ✅ Got 0 products from API 

2025-12-09 10:32:37 INFO  actions.actions  
- ⚠️ No products found, returning empty message
```

### **Problem:**
1. Query includes: `"tôi cần tìm"` (unnecessary prefix)
2. Backend searches: `ILIKE %tôi cần tìm ao-khoac-nam-lightweight...%`
3. Product slug is: `"ao-khoac-nam-lightweight-windbreaker-form-regular"`
4. No match found → 0 results

---

## 💥 ROOT CAUSE

### **Suspected Code Issue:**

**File:** `actions/actions.py` (or similar)

```python
# ❌ WRONG CODE (suspected):
class ActionSearchProducts(Action):
    def run(self, dispatcher, tracker, domain):
        # Getting entire user message instead of entity
        query = tracker.latest_message.get('text')  # ❌ WRONG
        
        # OR not extracting entity properly
        product_name = tracker.get_slot("product_name")
        if not product_name:
            query = tracker.latest_message.get('text')  # ❌ FALLBACK TO FULL TEXT
        
        # Calling API with wrong query
        results = api_client.search_products(query)
```

**Should be:**

```python
# ✅ CORRECT CODE:
class ActionSearchProducts(Action):
    def run(self, dispatcher, tracker, domain):
        # Extract product_name entity first
        product_name = next(tracker.get_latest_entity_values("product_name"), None)
        
        # If no entity, try slot
        if not product_name:
            product_name = tracker.get_slot("product_name")
        
        # If still no entity, try to extract from text
        if not product_name:
            text = tracker.latest_message.get('text', '')
            product_name = self._extract_product_from_text(text)
        
        if not product_name:
            dispatcher.utter_message(
                text="Bạn muốn tìm sản phẩm gì? Ví dụ: áo khoác, quần jean..."
            )
            return []
        
        # Log what we're searching
        logger.info(f"🔍 Searching with extracted query: {product_name}")
        
        # Call API with EXTRACTED query only
        results = api_client.search_products(product_name)

    def _extract_product_from_text(self, text: str) -> str:
        """
        Extract product name from user text by removing common phrases
        """
        # Remove common prefixes
        prefixes = [
            'tôi cần tìm', 'tôi muốn tìm', 'tìm cho tôi', 
            'cho tôi xem', 'tìm giúp tôi', 'tìm',
            'i want to find', 'find me', 'search for'
        ]
        
        cleaned = text.lower().strip()
        for prefix in prefixes:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
                break
        
        return cleaned
```

---

## 🛠️ HOW TO FIX

### **Priority 1: Fix Entity Extraction** (CRITICAL)

**Step 1: Check NLU Entity Annotation**

**File:** `data/nlu.yml`

Verify entities are properly annotated:

```yaml
- intent: search_product
  examples: |
    - tôi cần tìm [áo khoác](product_name)
    - tìm cho tôi [áo thun đen](product_name)
    - có [áo polo](product_name) không
    - [áo khoác nam](product_name)
    - tôi cần tìm [ao-khoac-nam-lightweight-windbreaker-form-regular](product_name)
```

**Step 2: Check Entity Extraction in Action**

**File:** `actions/actions.py`

```python
def run(self, dispatcher, tracker, domain):
    # Method 1: Get from entity (BEST)
    product_name = next(tracker.get_latest_entity_values("product_name"), None)
    logger.info(f"📝 Entity extracted: {product_name}")
    
    # Method 2: Get from slot (FALLBACK)
    if not product_name:
        product_name = tracker.get_slot("product_name")
        logger.info(f"📝 Slot value: {product_name}")
    
    # Method 3: Extract from text (LAST RESORT)
    if not product_name:
        text = tracker.latest_message.get('text', '')
        product_name = self._extract_product_from_text(text)
        logger.info(f"📝 Extracted from text: {product_name}")
    
    # Log what we're actually searching
    logger.info(f"🔍 Final search query: '{product_name}'")
    
    # Call API
    results = api_client.search_products(product_name)
```

**Step 3: Add Text Cleanup Helper**

```python
def _extract_product_from_text(self, text: str) -> str:
    """
    Remove common search phrases to extract actual product query
    """
    import re
    
    # Remove Vietnamese search phrases
    patterns = [
        r'^(tôi\s+cần\s+tìm)\s+',
        r'^(tôi\s+muốn\s+tìm)\s+',
        r'^(tìm\s+cho\s+tôi)\s+',
        r'^(cho\s+tôi\s+xem)\s+',
        r'^(tìm\s+giúp\s+tôi)\s+',
        r'^(tìm)\s+',
        # English patterns
        r'^(i\s+want\s+to\s+find)\s+',
        r'^(find\s+me)\s+',
        r'^(search\s+for)\s+',
        r'^(show\s+me)\s+',
    ]
    
    cleaned = text.lower().strip()
    for pattern in patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    return cleaned.strip()
```

---

## 🧪 TESTING

### **Test Case 1: Natural Language**
```
Input: "tôi cần tìm áo khoác"

Expected Extraction:
- Full text: "tôi cần tìm áo khoác"
- Entity/Extracted: "áo khoác" ✅
- API Query: "áo khoác" ✅
- Log: "🔍 Final search query: 'áo khoác'"
```

### **Test Case 2: Slug Pattern**
```
Input: "tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular"

Expected Extraction:
- Full text: "tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular"
- Entity/Extracted: "ao-khoac-nam-lightweight-windbreaker-form-regular" ✅
- API Query: "ao-khoac-nam-lightweight-windbreaker-form-regular" ✅
- Log: "🔍 Final search query: 'ao-khoac-nam-lightweight-windbreaker-form-regular'"
```

### **Test Case 3: Direct Product Name**
```
Input: "áo polo"

Expected Extraction:
- Full text: "áo polo"
- Entity/Extracted: "áo polo" ✅
- API Query: "áo polo" ✅
```

### **Test Case 4: English**
```
Input: "i want to find a shirt"

Expected Extraction:
- Full text: "i want to find a shirt"
- Entity/Extracted: "shirt" ✅
- API Query: "shirt" ✅
```

---

## 📊 LOGS TO ADD

Add these logs để debug entity extraction:

```python
def run(self, dispatcher, tracker, domain):
    # Debug current state
    logger.info("=" * 50)
    logger.info("🔍 ACTION: action_search_products")
    
    # Log user input
    user_text = tracker.latest_message.get('text', '')
    logger.info(f"👤 User input: '{user_text}'")
    
    # Log intent
    intent = tracker.latest_message.get('intent', {})
    logger.info(f"🎯 Intent: {intent.get('name')} (confidence: {intent.get('confidence')})")
    
    # Log entities
    entities = tracker.latest_message.get('entities', [])
    logger.info(f"📌 Entities detected: {entities}")
    
    # Try extraction methods
    entity_value = next(tracker.get_latest_entity_values("product_name"), None)
    logger.info(f"📝 Entity 'product_name': {entity_value}")
    
    slot_value = tracker.get_slot("product_name")
    logger.info(f"🎰 Slot 'product_name': {slot_value}")
    
    # Final query
    final_query = entity_value or slot_value or self._extract_product_from_text(user_text)
    logger.info(f"🔍 Final search query: '{final_query}'")
    logger.info(f"✅ Query length: {len(final_query)} characters")
    logger.info("=" * 50)
    
    # Continue with search...
```

**Expected logs:**
```
==================================================
🔍 ACTION: action_search_products
👤 User input: 'tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular'
🎯 Intent: search_product (confidence: 0.85)
📌 Entities detected: [{'entity': 'product_name', 'value': 'ao-khoac-nam-lightweight-windbreaker-form-regular', ...}]
📝 Entity 'product_name': ao-khoac-nam-lightweight-windbreaker-form-regular
🎰 Slot 'product_name': ao-khoac-nam-lightweight-windbreaker-form-regular
🔍 Final search query: 'ao-khoac-nam-lightweight-windbreaker-form-regular'
✅ Query length: 51 characters
==================================================
```

---

## ✅ BACKEND STATUS

**Backend đã được improve** để handle cả 2 cases:

### **Temporary Workaround Added:**

Backend API giờ tự động extract slug pattern từ query:

```typescript
// Smart extraction in backend
const slugPattern = /([a-z0-9]+(?:-[a-z0-9]+){2,})/gi;
const slugMatches = search.match(slugPattern);

if (slugMatches) {
  // Search with BOTH full text AND extracted slug
  WHERE (name ILIKE '%full query%' OR slug ILIKE '%extracted-slug%')
}
```

**Example:**
```
Input: "tôi cần tìm ao-khoac-nam-lightweight..."
       ↓
Backend extracts: "ao-khoac-nam-lightweight..."
       ↓
Searches BOTH patterns
       ↓
✅ Product found
```

**BUT:** This is a **workaround**. Chatbot should still fix entity extraction for:
1. Better performance (no need to search twice)
2. More accurate results
3. Cleaner logs
4. Standard architecture

---

## 📞 ACTION ITEMS

### **Chatbot Team (URGENT):**

**Step 1: Add Detailed Logs (15 min)**
- [ ] Add logs cho entity extraction
- [ ] Log full text, entities, slots
- [ ] Log final query being sent to API
- [ ] Test và collect logs

**Step 2: Verify NLU (15 min)**
- [ ] Check `nlu.yml` entity annotations
- [ ] Verify entities are detected in `rasa shell nlu`
- [ ] Test with: "tôi cần tìm áo khoác"
- [ ] Confirm entity value extracted correctly

**Step 3: Fix Action Code (30 min)**
- [ ] Implement proper entity extraction
- [ ] Add fallback to slot
- [ ] Add text cleanup as last resort
- [ ] Log each extraction attempt

**Step 4: Test (15 min)**
- [ ] Test natural language: "tìm áo khoác"
- [ ] Test slug: "ao-khoac-nam-lightweight..."
- [ ] Test direct: "áo polo"
- [ ] Verify API receives clean query

**Total time:** ~1.5 hours

---

### **Backend Team:**
- [x] ✅ Added smart slug extraction (WORKAROUND DEPLOYED)
- [x] ✅ API now handles both full text and extracted slugs

---

## 🎯 SUCCESS CRITERIA

After fix:
- ✅ Logs show: `"🔍 Final search query: 'ao-khoac-nam-lightweight...'"` (not full sentence)
- ✅ API receives clean query without "tôi cần tìm"
- ✅ Products found successfully
- ✅ Works for both natural language and slug inputs

---

## 💡 QUICK DEBUG

**To verify current behavior, add this test:**

```python
# In rasa shell
User: tôi cần tìm áo khoác

# Check logs - should see:
Entity extracted: "áo khoác"  ✅
Final query: "áo khoác"  ✅

# NOT this:
Entity extracted: None  ❌
Final query: "tôi cần tìm áo khoác"  ❌
```

---

**Priority:** 🔴 **HIGH - URGENT**  
**Impact:** Product search returns 0 results incorrectly  
**Timeline:** Fix today  
**Workaround:** Backend smart extraction (deployed)

---

**Bug Report Created:** 2025-12-09 10:34  
**Reporter:** Backend Team  
**Status:** Backend workaround deployed, chatbot fix needed
