# Backend Integration Guide: Product Actions Metadata

**Date:** 2025-12-13  
**Priority:** 🔴 CRITICAL  
**Status:** Frontend Ready - Awaiting Backend Update

---

## 🎯 Objective

Update chatbot backend to send **product_actions metadata** instead of text prompts when showing product details. This enables button-based variant selection to fix the variant matching bug.

---

## ❌ Current Backend Behavior (BROKEN)

When user asks for product details, backend sends:

```json
{
  "bot_responses": [
    {
      "message": "📦 **relaxed-fit-t-shirt: Be Bold Become Fearless**"
    },
    {
      "message": "💰 Price: $6.36\n🎨 Available colors: Black, White, Cream (+1 more)\n📏 Available sizes: S, M, L, XL, XXL, 3XL\n✅ In stock"
    },
    {
      "message": "Would you like sizing advice, styling tips, or ready to add to cart? 😊"
    }
  ]
}
```

**Result:** User has to TYPE color/size → matching fails → wrong variant added ❌

---

## ✅ Required Backend Behavior (FIXED)

When user asks for product details, backend MUST send:

```json
{
  "bot_responses": [
    {
      "message": "Would you like to add this to your cart? 😊",
      "custom": {
        "type": "product_actions",
        "product_id": 7,
        "product_name": "relaxed-fit-t-shirt: Be Bold Become Fearless",
        "product_price": 6.36,
        "product_thumbnail": "https://res.cloudinary.com/doticibcy/image/upload/...",
        "available_colors": [
          {"id": 1, "name": "Black", "hex": "#000000"},
          {"id": 2, "name": "White", "hex": "#FFFFFF"},
          {"id": 3, "name": "Cream", "hex": "#F5F5DC"},
          {"id": 4, "name": "Navy", "hex": "#001F3F"}
        ],
        "available_sizes": [
          {"id": 1, "name": "S"},
          {"id": 2, "name": "M"},
          {"id": 3, "name": "L"},
          {"id": 4, "name": "XL"},
          {"id": 5, "name": "XXL"},
          {"id": 6, "name": "3XL"}
        ]
      }
    }
  ]
}
```

**Result:** User CLICKS buttons → frontend sends IDs → 100% accurate matching ✅

---

## 🔧 Backend Changes Required

### File: `actions/actions.py`

### 1️⃣ Update `action_get_product_details`

**Current code (approximate):**
```python
def run(self, dispatcher, tracker, domain):
    product = self.get_product_from_api(product_id)
    
    # ❌ OLD: Send text messages
    dispatcher.utter_message(text=f"📦 **{product['name']}**")
    dispatcher.utter_message(text=f"💰 Price: ${product['price']}")
    dispatcher.utter_message(text="Would you like sizing advice, styling tips, or ready to add to cart? 😊")
```

**NEW CODE REQUIRED:**
```python
def run(self, dispatcher, tracker, domain):
    product_id = tracker.get_slot("product_id")
    
    # Get product details from backend API
    response = requests.get(f"{API_URL}/internal/products/{product_id}")
    product = response.json()
    
    # Extract color and size options with IDs
    available_colors = []
    available_sizes = []
    
    # Get unique colors from variants
    seen_colors = {}
    seen_sizes = {}
    
    for variant in product.get('variants', []):
        color_id = variant.get('color_id')
        color_name = variant.get('color_name')
        color_hex = variant.get('color_hex')  # If available
        
        size_id = variant.get('size_id')
        size_name = variant.get('size_name')
        
        if color_id and color_id not in seen_colors:
            seen_colors[color_id] = {
                "id": color_id,
                "name": color_name,
                "hex": color_hex
            }
        
        if size_id and size_id not in seen_sizes:
            seen_sizes[size_id] = {
                "id": size_id,
                "name": size_name
            }
    
    available_colors = list(seen_colors.values())
    available_sizes = list(seen_sizes.values())
    
    # ✅ NEW: Send metadata with product_actions type
    dispatcher.utter_message(
        text="Would you like to add this to your cart? 😊",
        json_message={
            "custom": {
                "type": "product_actions",
                "product_id": product['id'],
                "product_name": product['name'],
                "product_price": product['price'],
                "product_thumbnail": product.get('thumbnail') or product.get('images', [{}])[0].get('url'),
                "available_colors": available_colors,
                "available_sizes": available_sizes
            }
        }
    )
    
    return []
```

---

### 2️⃣ Update `action_add_to_cart`

**Current code (approximate):**
```python
def run(self, dispatcher, tracker, domain):
    product_id = tracker.get_slot("product_id")
    size = tracker.get_slot("size")  # ❌ TEXT: "XXL"
    color = tracker.get_slot("color")  # ❌ TEXT: "black"
    
    # ❌ OLD: Match by text (FAILS)
    variant = self.find_variant_by_text(product_id, size, color)
    
    if not variant:
        # Falls back to product_id → WRONG VARIANT
        variant_id = product_id
```

**NEW CODE REQUIRED:**
```python
def run(self, dispatcher, tracker, domain):
    # Check if frontend sent structured metadata
    metadata = tracker.latest_message.get('metadata', {})
    
    if metadata.get('action') == 'add_to_cart':
        # ✅ NEW: Frontend sent IDs
        product_id = metadata.get('product_id')
        color_id = metadata.get('color_id')
        size_id = metadata.get('size_id')
        
        # Match variant by IDs (100% accurate)
        variant = self.find_variant_by_ids(product_id, color_id, size_id)
        
        if variant:
            # Add to cart using variant_id
            self.add_to_cart_api(customer_id, variant['id'], quantity=1)
            dispatcher.utter_message(
                text=f"✅ Added to cart: {variant['product_name']} ({variant['size_name']}, {variant['color_name']})"
            )
            return []
    
    # ❌ FALLBACK: Old text-based flow (for backward compatibility)
    size = tracker.get_slot("size")
    color = tracker.get_slot("color")
    
    if not size:
        dispatcher.utter_message(text="What size would you like?")
        return []
    
    if not color:
        dispatcher.utter_message(text="What color would you like?")
        return []
    
    # Try text matching (less reliable)
    variant = self.find_variant_by_text(product_id, size, color)
    # ... rest of old logic
```

---

### 3️⃣ Add Helper Function

```python
def find_variant_by_ids(self, product_id, color_id, size_id):
    """
    Find variant by exact ID matching (100% accurate)
    """
    response = requests.get(f"{API_URL}/internal/products/{product_id}")
    product = response.json()
    
    for variant in product.get('variants', []):
        if variant['color_id'] == color_id and variant['size_id'] == size_id:
            return variant
    
    return None
```

---

## 📨 Frontend → Backend Message Format

When user clicks color/size buttons, frontend sends:

```json
POST /chat/send
{
  "session_id": 1,
  "message": "Thêm vào giỏ hàng",
  "metadata": {
    "action": "add_to_cart",
    "product_id": 7,
    "color_id": 1,
    "size_id": 5
  }
}
```

Backend MUST read `metadata` and use IDs for matching.

---

## 🧪 Testing Steps

### 1. Test Product Details Response

**Send:** `GET /internal/products/7`

**Check response includes:**
- `variants[]` with `color_id`, `color_name`, `size_id`, `size_name`
- Unique list of colors and sizes

### 2. Test Chatbot Response

**User says:** "i want more info about the first one"

**Expected bot response:**
```json
{
  "custom": {
    "type": "product_actions",
    "available_colors": [...],
    "available_sizes": [...]
  }
}
```

### 3. Test Add to Cart with IDs

**Frontend sends:**
```json
{
  "metadata": {
    "action": "add_to_cart",
    "product_id": 7,
    "color_id": 1,
    "size_id": 5
  }
}
```

**Expected:** Correct variant added to cart (check cart API)

---

## 🐛 Debug Logs

Add these logs to track the flow:

```python
# In action_get_product_details
print(f"🎨 Available Colors: {available_colors}")
print(f"📏 Available Sizes: {available_sizes}")

# In action_add_to_cart
metadata = tracker.latest_message.get('metadata', {})
print(f"📦 Metadata received: {metadata}")

if metadata.get('action') == 'add_to_cart':
    print(f"✅ Using ID-based matching: color_id={metadata.get('color_id')}, size_id={metadata.get('size_id')}")
    variant = self.find_variant_by_ids(...)
    print(f"🎯 Variant found: {variant}")
else:
    print(f"⚠️ Using text-based matching (fallback)")
```

---

## ✅ Acceptance Criteria

- [ ] `action_get_product_details` returns `product_actions` metadata
- [ ] Frontend displays color/size buttons (already implemented)
- [ ] User can click buttons to select variant
- [ ] `action_add_to_cart` accepts metadata with IDs
- [ ] Variant matching uses IDs (100% accurate)
- [ ] Add-to-cart works with correct variant
- [ ] Old text flow still works as fallback

---

## 📝 Backend API Requirements

Backend product API MUST return:

```json
GET /internal/products/{id}
{
  "id": 7,
  "name": "Product Name",
  "price": 6.36,
  "thumbnail": "https://...",
  "variants": [
    {
      "id": 101,
      "product_id": 7,
      "color_id": 1,
      "color_name": "Black",
      "color_hex": "#000000",
      "size_id": 5,
      "size_name": "XXL",
      "stock": 10,
      "price": 6.36
    }
  ]
}
```

**Check if your API returns `color_id` and `size_id`!** If not, update backend API first.

---

## 🚀 Deployment Order

1. ✅ Frontend implementation (DONE)
2. ⏳ Backend chatbot update (THIS DOCUMENT)
3. ⏳ Testing add-to-cart flow
4. ⏳ Deploy to production

---

## 📞 Questions?

- Frontend team: Implementation complete, awaiting backend integration
- Backend team: Follow this guide to update `actions.py`
- Any issues: Check console logs for metadata format

**Status:** 🟡 Waiting for backend chatbot update
