# 🧪 Test Chatbot Search Product API

**Date:** December 9, 2025  
**Purpose:** Testing guide for chatbot search products API

---

## 📋 API Information

**Endpoint:** `GET /internal/products`  
**Full URL:** `http://localhost:3001/internal/products`  
**Authentication:** API Key required in header  
**API Key:** `KhoaBiMatChoRasaGoi` (from .env: `INTERNAL_API_KEY`)

**Note:** Không có prefix `/api`, route là `/internal/products` trực tiếp

---

## 🔧 Test Commands

### **1. Test Basic Search (Natural Language)**

**Tìm "áo khoác":**

**Bash/Linux:**
```bash
curl -X GET "http://localhost:3001/internal/products?search=áo khoác" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**PowerShell/Windows:**
```powershell
curl.exe -X GET "http://localhost:3001/internal/products?search=áo khoác" -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Expected Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Áo Khoác Denim",
      "slug": "ao-khoac-denim-oversize",
      "description": "...",
      "selling_price": 450000,
      "total_stock": 25,
      "category_name": "Áo Khoác",
      "thumbnail_url": "https://...",
      "available_sizes": ["S", "M", "L"],
      "available_colors": ["Xanh", "Đen"],
      "images": ["url1", "url2"]
    }
  ],
  "count": 1
}
```

---

### **2. Test Slug Search (Product Code)**

**Tìm bằng slug:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=ao-khoac-nam-lightweight-windbreaker-form-regular" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Test smart extraction (full sentence with slug):**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=tôi cần tìm ao-khoac-nam-lightweight-windbreaker-form-regular" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Note:** Backend sẽ tự động extract slug pattern từ câu đầy đủ.

---

### **3. Test với Category Filter**

**Tìm "áo" trong category "ao-khoac":**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo&category=ao-khoac" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Chỉ category không có search:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?category=ao-thun" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

---

### **4. Test với Limit**

**Giới hạn 5 kết quả:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo&limit=5" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Default limit = 10:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

---

### **5. Test Edge Cases**

**Empty search (all products):**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**No results:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=xyz123notexist" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Expected:**
```json
{
  "products": [],
  "count": 0
}
```

---

### **6. Test Multiple Search Terms**

**Search với nhiều từ:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo thun đen" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Search tiếng Anh:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=shirt" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

---

### **7. Test Without API Key (Should Fail)**

**Missing API key:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo"
```

**Expected:** `401 Unauthorized`

**Wrong API key:**
```bash
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo" \
  -H "x-api-key: WrongKey123"
```

**Expected:** `401 Unauthorized`

---

## 🌐 Test với Postman/Thunder Client

### **Setup:**

**Method:** `GET`  
**URL:** `http://localhost:3001/api/internal/search-products`  
**Headers:**
```
x-api-key: KhoaBiMatChoRasaGoi
```

**Query Params:**
```
search: áo khoác
category: (optional)
limit: 10 (optional)
```

---

### **Test Cases:**

| Test Case | Search | Category | Expected |
|-----------|--------|----------|----------|
| Natural language | `áo khoác` | - | Products found |
| Slug direct | `ao-khoac-denim` | - | Specific product |
| Slug in sentence | `tôi cần tìm ao-khoac-denim` | - | Extract slug, find product |
| With category | `áo` | `ao-khoac` | Only jackets |
| English | `shirt` | - | Shirts found |
| No results | `xyz123` | - | Empty array |
| No API key | `áo` | - | 401 Error |

---

## 📊 Performance Testing

### **Response Time Test:**

```bash
# Measure response time
time curl -X GET "http://localhost:3001/api/internal/search-products?search=áo khoác" \
  -H "x-api-key: KhoaBiMatChoRasaGoi"
```

**Expected:** <2 seconds

---

### **Load Test (với ab - Apache Bench):**

```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 \
  -H "x-api-key: KhoaBiMatChoRasaGoi" \
  "http://localhost:3001/api/internal/search-products?search=áo"
```

**Target:** 
- Response time: <2s (95th percentile)
- No errors

---

## 🐍 Test với Python Script

**File:** `test_search_api.py`

```python
import requests
import json

BASE_URL = "http://localhost:3001/api/internal"
API_KEY = "KhoaBiMatChoRasaGoi"

def search_products(query, category=None, limit=10):
    """Test search products API"""
    headers = {"x-api-key": API_KEY}
    params = {"search": query, "limit": limit}
    
    if category:
        params["category"] = category
    
    response = requests.get(
        f"{BASE_URL}/search-products",
        headers=headers,
        params=params
    )
    
    print(f"\n{'='*50}")
    print(f"Query: {query}")
    print(f"Status: {response.status_code}")
    print(f"Response time: {response.elapsed.total_seconds():.3f}s")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Products found: {data['count']}")
        
        if data['products']:
            for p in data['products'][:3]:  # Show first 3
                print(f"  - {p['name']} (${p['selling_price']})")
        else:
            print("  No products found")
    else:
        print(f"Error: {response.text}")
    
    return response

# Test cases
if __name__ == "__main__":
    # Test 1: Natural language
    search_products("áo khoác")
    
    # Test 2: Slug
    search_products("ao-khoac-denim")
    
    # Test 3: Slug in sentence
    search_products("tôi cần tìm ao-khoac-nam-lightweight-windbreaker")
    
    # Test 4: With category
    search_products("áo", category="ao-khoac")
    
    # Test 5: English
    search_products("shirt")
    
    # Test 6: No results
    search_products("xyz123notexist")
```

**Run:**
```bash
python test_search_api.py
```

---

## 🧪 Test From Chatbot (Rasa Action)

**Trong Rasa actions code, test như thế này:**

```python
# actions/api_client.py
import requests

class BackendAPIClient:
    def __init__(self):
        self.base_url = "http://localhost:3001/api/internal"
        self.api_key = "KhoaBiMatChoRasaGoi"
    
    def search_products(self, query: str, category: str = None, limit: int = 10):
        """Search products via backend API"""
        headers = {"x-api-key": self.api_key}
        params = {"search": query, "limit": limit}
        
        if category:
            params["category"] = category
        
        response = requests.get(
            f"{self.base_url}/search-products",
            headers=headers,
            params=params,
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")

# Test
if __name__ == "__main__":
    client = BackendAPIClient()
    
    # Test search
    result = client.search_products("áo khoác")
    print(f"Found {result['count']} products")
    
    for product in result['products']:
        print(f"  - {product['name']}: {product['selling_price']} VND")
```

---

## 📝 Validation Checklist

**✅ API should:**
- [ ] Return 200 with valid API key
- [ ] Return 401 without API key
- [ ] Search by product name
- [ ] Search by product slug
- [ ] Extract slug from full sentence
- [ ] Filter by category
- [ ] Respect limit parameter
- [ ] Return empty array when no results
- [ ] Response time < 2s
- [ ] Return correct data structure

**✅ Response should include:**
- [ ] `products` array
- [ ] `count` number
- [ ] Each product has:
  - `id`, `name`, `slug`
  - `selling_price`, `total_stock`
  - `category_name`, `thumbnail_url`
  - `available_sizes`, `available_colors`
  - `images` array

---

## 🔍 Debug Tips

### **If no results found:**

1. **Check product exists in database:**
   ```sql
   SELECT id, name, slug, status 
   FROM products 
   WHERE slug ILIKE '%ao-khoac%';
   ```

2. **Check search query:**
   - Backend logs will show actual query
   - Verify slug extraction working

3. **Check product status:**
   - Only `status = 'active'` products returned
   - Check `deleted_at IS NULL`

### **If getting 401:**
- Verify API key in header: `x-api-key`
- Check key matches `.env`: `INTERNAL_API_KEY`

### **If slow response:**
- Check database indexes
- Check if too many variants/images joined
- Consider adding `limit` parameter

---

## 📊 Expected Response Times

| Query Type | Target | Acceptable |
|------------|--------|------------|
| Simple search | <0.5s | <1s |
| Search + category | <0.8s | <1.5s |
| Slug extraction | <0.6s | <1.2s |
| Large result set | <1s | <2s |

---

## 🎯 Quick Test Commands

**Copy-paste ready tests:**

```bash
# Test 1: Basic search
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo" -H "x-api-key: KhoaBiMatChoRasaGoi"

# Test 2: Slug search
curl -X GET "http://localhost:3001/api/internal/search-products?search=ao-khoac-denim" -H "x-api-key: KhoaBiMatChoRasaGoi"

# Test 3: Smart extraction
curl -X GET "http://localhost:3001/api/internal/search-products?search=tôi%20cần%20tìm%20ao-khoac-nam" -H "x-api-key: KhoaBiMatChoRasaGoi"

# Test 4: Category filter
curl -X GET "http://localhost:3001/api/internal/search-products?category=ao-khoac&limit=5" -H "x-api-key: KhoaBiMatChoRasaGoi"

# Test 5: No auth (should fail)
curl -X GET "http://localhost:3001/api/internal/search-products?search=áo"
```

---

**Created:** 2025-12-09  
**Backend:** http://localhost:3001  
**API Key:** KhoaBiMatChoRasaGoi
