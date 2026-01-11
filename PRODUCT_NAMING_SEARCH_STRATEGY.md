# 🔍 Product Naming & Search Strategy

## 📊 Phân Tích Hiện Tại

### Search Logic Hiện Tại
```typescript
// chatbot.service.ts - searchProducts()
// ✅ Đang làm tốt:
// - Split query thành keywords
// - Tìm trong name + description
// - Tính relevance score
// - Boost theo stock, rating, reviews

// ⚠️ Hạn chế:
// - Chỉ tìm LIKE %keyword% (không tối ưu cho tiếng Việt)
// - Không tách biệt: loại áo, họa tiết, màu sắc, phong cách
// - Không có synonyms (áo thun = t-shirt = áo phông)
// - Khó tìm theo context (đi biển, đi làm, dự tiệc)
```

### Naming Convention Hiện Tại
```
Format: [product-type]: [design-name]
Ví dụ:
- "relaxed-fit-t-shirt: Sushi Meow"
- "relaxed-fit-t-shirt: Chick Meow"
- "relaxed-fit-t-shirt: Flower With Meow"
```

**❌ Vấn đề:**
- User tìm "áo thun" → KHÔNG match "relaxed-fit-t-shirt"
- User tìm "áo meow" → match được nhờ "Meow" trong name
- User tìm "áo hoa" → KHÔNG match "Flower With Meow" (tiếng Anh)
- User tìm "áo mèo" → KHÔNG match "Meow"

---

## ✅ Đề Xuất Strategy

### 1. Product Name Structure (Database)

**Format chuẩn hóa:**
```
[Loại sản phẩm Tiếng Việt] [Loại/Fit] [Tên Design]
```

**Ví dụ:**
```
❌ BEFORE: "relaxed-fit-t-shirt: Sushi Meow"

✅ AFTER:  "Áo Thun Relaxed Fit - Sushi Meow"
✅ AFTER:  "Áo Khoác Bomber - Street Style"
✅ AFTER:  "Quần Jean Slim Fit - Dark Blue"
✅ AFTER:  "Áo Sơ Mi Dài Tay - Classic White"
```

**Lợi ích:**
- ✅ User tìm "áo thun" → Match ngay
- ✅ User tìm "áo khoác" → Match ngay
- ✅ Hiển thị tên đẹp, dễ đọc cho người Việt
- ✅ Vẫn giữ được design name (Sushi Meow, Street Style...)

---

### 2. Description Structure

**Format chi tiết:**
```
[Mô tả ngắn gọn] + [Đặc điểm nổi bật] + [Phong cách/Dịp sử dụng]
```

**Ví dụ:**
```
Áo thun Relaxed Fit với họa tiết Sushi Meow đáng yêu. 
Chất liệu cotton mềm mại, thoáng mát. 
Phù hợp cho phong cách casual hàng ngày, đi chơi cuối tuần.
Họa tiết: mèo, đồ ăn, kawaii, cute
```

**Keywords trong description:**
- Chất liệu: cotton, polyester, denim...
- Phong cách: casual, formal, streetwear, sporty...
- Dịp: hàng ngày, đi làm, đi chơi, dự tiệc, đi biển...
- Họa tiết: hoa, kẻ sọc, trơn, in chữ, động vật...

---

### 3. Sử Dụng JSONB Attributes (QUAN TRỌNG!)

**Schema cải tiến:**
```typescript
// products.attributes column (JSONB)
{
  // Loại sản phẩm & fit
  "product_type": "t-shirt",              // áo thun, áo khoác, quần jean...
  "product_type_vi": "áo thun",
  "fit_type": "relaxed-fit",              // slim, regular, oversized...
  
  // Họa tiết & design
  "design_name": "Sushi Meow",
  "pattern": ["graphic", "character"],     // họa tiết: graphic, floral, stripe, solid...
  "pattern_vi": ["họa tiết", "nhân vật"],
  "theme": ["food", "cat", "kawaii"],      // chủ đề: mèo, hoa, xe, âm nhạc...
  "theme_vi": ["đồ ăn", "mèo", "kawaii"],
  
  // Màu sắc
  "colors": ["white", "red", "yellow"],
  "colors_vi": ["trắng", "đỏ", "vàng"],
  "primary_color": "white",
  "primary_color_vi": "trắng",
  
  // Phong cách & context
  "style": ["casual", "streetwear", "cute"],
  "style_vi": ["thường ngày", "streetwear", "đáng yêu"],
  "occasion": ["everyday", "weekend", "hangout"],
  "occasion_vi": ["hàng ngày", "cuối tuần", "đi chơi"],
  
  // Material
  "material": "cotton",
  "material_vi": "cotton",
  
  // Search keywords (synonyms + common searches)
  "search_keywords": [
    "áo thun", "t-shirt", "áo phông",
    "áo mèo", "áo meow", "áo cute",
    "áo đồ ăn", "áo sushi",
    "áo trắng", "áo họa tiết"
  ],
  
  // Gender
  "gender": "unisex",  // nam, nữ, unisex
  
  // Season
  "season": ["spring", "summer"],
  "season_vi": ["xuân", "hè"]
}
```

---

### 4. Enhanced Search Query

**Cải tiến search logic:**

```typescript
async searchProducts(dto: any) {
  const { query, limit = 5 } = dto;
  
  // Split query
  const keywords = query.toLowerCase().trim().split(/\s+/);
  
  const queryBuilder = this.productRepo
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.variants', 'variants')
    .leftJoinAndSelect('product.category', 'category')
    .where('product.status = :status', { status: 'active' })
    .andWhere('product.deleted_at IS NULL');
  
  // ✅ ENHANCED: Multi-field search với JSONB
  const searchConditions = keywords.map((keyword, index) => {
    return `(
      LOWER(product.name) LIKE :keyword${index} 
      OR LOWER(product.description) LIKE :keyword${index}
      OR product.attributes::jsonb->'search_keywords' ??| ARRAY[:keyword${index}]
      OR LOWER(product.attributes::jsonb->>'product_type_vi') LIKE :keyword${index}
      OR LOWER(product.attributes::jsonb->>'design_name') LIKE :keyword${index}
      OR product.attributes::jsonb->'theme_vi' ??| ARRAY[:keyword${index}]
      OR product.attributes::jsonb->'style_vi' ??| ARRAY[:keyword${index}]
      OR product.attributes::jsonb->'colors_vi' ??| ARRAY[:keyword${index}]
    )`;
  });
  
  if (searchConditions.length > 0) {
    queryBuilder.andWhere(`(${searchConditions.join(' AND ')})`);
    
    keywords.forEach((keyword, index) => {
      queryBuilder.setParameter(`keyword${index}`, `%${keyword}%`);
    });
  }
  
  const products = await queryBuilder.getMany();
  
  // Calculate enhanced relevance score...
  return formatResults(products);
}
```

---

### 5. Enhanced Relevance Score

**Cải tiến scoring với attributes:**

```typescript
private calculateRelevanceScore(product: Product, query: string, keywords: string[]): number {
  const attrs = product.attributes || {};
  let score = 0.0;
  
  // 1. Name exact match = 1.0
  if (product.name.toLowerCase() === query.toLowerCase()) {
    score = 1.0;
  }
  // 2. Name partial match = 0.85 - 0.95
  else if (product.name.toLowerCase().includes(query.toLowerCase())) {
    score = 0.90;
  }
  // 3. Match in search_keywords = 0.80 - 0.90
  else if (attrs.search_keywords?.some(kw => 
    keywords.some(q => kw.toLowerCase().includes(q))
  )) {
    score = 0.85;
  }
  // 4. Match product_type_vi = 0.75 - 0.85
  else if (attrs.product_type_vi && 
    keywords.some(kw => attrs.product_type_vi.includes(kw))
  ) {
    score = 0.80;
  }
  // 5. Match theme_vi or style_vi = 0.65 - 0.75
  else if (
    attrs.theme_vi?.some(t => keywords.some(kw => t.includes(kw))) ||
    attrs.style_vi?.some(s => keywords.some(kw => s.includes(kw)))
  ) {
    score = 0.70;
  }
  // 6. Match in description = 0.50 - 0.65
  else if (product.description?.toLowerCase().includes(query.toLowerCase())) {
    score = 0.60;
  }
  
  // Boost factors
  let boost = 0.0;
  
  // In stock: +0.05
  if (hasStock(product)) boost += 0.05;
  
  // High rating: +0.03
  if (product.average_rating >= 4.5) boost += 0.03;
  
  // Many reviews: +0.02
  if (product.total_reviews >= 50) boost += 0.02;
  
  return Math.min(score + boost, 1.0);
}
```

---

## 🗄️ Migration Required

### Option 1: Thêm Column `search_keywords` (Simple)

```typescript
// migration: AddSearchKeywordsToProducts
ALTER TABLE products ADD COLUMN search_keywords TEXT[];
CREATE INDEX idx_products_search_keywords ON products USING GIN(search_keywords);
```

**Pros:**
- ✅ Simple, dễ query
- ✅ PostgreSQL GIN index support
- ✅ Fast search

**Cons:**
- ❌ Không flexible như JSONB
- ❌ Khó maintain nhiều metadata

### Option 2: Sử Dụng JSONB Attributes (Recommended)

```typescript
// Không cần migration mới - đã có column attributes JSONB!
// Chỉ cần populate data theo structure mới

// Add GIN index for better JSONB search
CREATE INDEX idx_products_attributes_gin ON products USING GIN(attributes);
```

**Pros:**
- ✅ Đã có sẵn column `attributes`
- ✅ Flexible - có thể thêm metadata mới dễ dàng
- ✅ Support nested search
- ✅ GIN index support

**Cons:**
- ❌ Query phức tạp hơn một chút
- ❌ Cần chuẩn hóa data structure

---

## 📋 Implementation Checklist

### Phase 1: Chuẩn Hóa Product Names (Manual/Script)
- [ ] Review tất cả product names hiện tại
- [ ] Convert sang format: "Áo Thun [Fit] - [Design Name]"
- [ ] Update tất cả descriptions với keywords

### Phase 2: Populate Attributes JSONB
- [ ] Tạo script để extract metadata từ product names
- [ ] Populate attributes theo structure đề xuất
- [ ] Thêm search_keywords array cho mỗi product

### Phase 3: Add GIN Index
- [ ] Chạy migration thêm GIN index cho attributes
- [ ] Test search performance

### Phase 4: Update Search Logic
- [ ] Update `searchProducts()` method với JSONB search
- [ ] Update `calculateRelevanceScore()` với attributes
- [ ] Test với các query phổ biến

### Phase 5: Testing
- [ ] Test search "áo thun" → match all t-shirts
- [ ] Test search "áo mèo" → match cat-themed products
- [ ] Test search "áo hoa" → match floral patterns
- [ ] Test search "áo đi biển" → match beach/summer occasion
- [ ] Test search performance với large dataset

---

## 💡 Examples

### Product Entry Example

```json
{
  "id": 5,
  "name": "Áo Thun Relaxed Fit - Sushi Meow",
  "slug": "ao-thun-relaxed-fit-sushi-meow",
  "description": "Áo thun Relaxed Fit với họa tiết Sushi Meow đáng yêu. Chất liệu cotton mềm mại, thoáng mát. Phù hợp cho phong cách casual hàng ngày, đi chơi cuối tuần. Họa tiết mèo và đồ ăn Nhật Bản độc đáo.",
  "category": "T-Shirt",
  "attributes": {
    "product_type": "t-shirt",
    "product_type_vi": "áo thun",
    "fit_type": "relaxed-fit",
    "design_name": "Sushi Meow",
    "pattern": ["graphic", "character"],
    "pattern_vi": ["họa tiết", "nhân vật"],
    "theme": ["food", "cat", "japanese", "kawaii"],
    "theme_vi": ["đồ ăn", "mèo", "nhật bản", "kawaii"],
    "colors": ["white", "red", "yellow", "black"],
    "colors_vi": ["trắng", "đỏ", "vàng", "đen"],
    "primary_color_vi": "trắng",
    "style": ["casual", "streetwear", "cute"],
    "style_vi": ["thường ngày", "streetwear", "đáng yêu"],
    "occasion": ["everyday", "weekend", "hangout"],
    "occasion_vi": ["hàng ngày", "cuối tuần", "đi chơi"],
    "material": "cotton",
    "material_vi": "cotton",
    "search_keywords": [
      "áo thun", "t-shirt", "áo phông",
      "áo mèo", "áo meow", "áo cat",
      "áo đồ ăn", "áo sushi", "áo nhật bản",
      "áo cute", "áo kawaii", "áo đáng yêu",
      "áo trắng", "áo họa tiết",
      "relaxed fit", "áo rộng"
    ],
    "gender": "unisex",
    "season": ["spring", "summer"],
    "season_vi": ["xuân", "hè"]
  }
}
```

### Search Query Examples

```typescript
// Query: "áo thun"
// Matches:
// - name: "Áo Thun Relaxed Fit - Sushi Meow"
// - attributes.product_type_vi: "áo thun"
// - attributes.search_keywords: ["áo thun", ...]
// Score: 0.85 (high)

// Query: "áo mèo"
// Matches:
// - attributes.theme_vi: ["mèo"]
// - attributes.search_keywords: ["áo mèo"]
// Score: 0.75 (medium-high)

// Query: "áo đi biển"
// Matches:
// - attributes.occasion_vi: ["đi biển"]
// - description: "...phù hợp đi biển..."
// Score: 0.65 (medium)

// Query: "áo hoa"
// Matches:
// - attributes.pattern_vi: ["hoa"]
// - attributes.search_keywords: ["áo hoa"]
// Score: 0.70 (medium-high)
```

---

## 🚀 Next Steps

1. **Review với team** về naming convention mới
2. **Chuẩn bị migration** cho GIN index
3. **Tạo script** để populate attributes cho products hiện có
4. **Update search logic** theo đề xuất
5. **Testing & tuning** relevance score

---

## 📞 Notes

- Attributes structure có thể mở rộng thêm theo nhu cầu
- Search keywords nên được update thường xuyên dựa trên user queries
- Có thể implement A/B testing để tối ưu relevance scoring
- Consider full-text search (tsvector) nếu cần search tiếng Việt tốt hơn
