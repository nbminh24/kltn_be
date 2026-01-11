#!/usr/bin/env python3
"""
Script Seed Data cho Fashion E-commerce Backend
- Đọc data từ 4 files Excel trong folder Data/
- Mix cả SQL Insert và API calls
- Addresses: Dùng API lấy địa chỉ VN thật
- Reviews: Random 5-20 reviews/product với 20 mẫu comments tiếng Việt
"""

import os
import sys
import psycopg2
import requests
import pandas as pd
import random
import json
from datetime import datetime, timedelta
from urllib.parse import quote
import time

# ==================== CONFIG ====================
BASE_URL = "http://localhost:3001"
ADMIN_EMAIL = "lecas.office@gmail.com"
ADMIN_PASSWORD = "Minh1204"

# Database connection
DB_CONFIG = {
    "host": "db.sdviskalbqirwlrpvmrp.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Mimikyu1204"
}

# Excel files
EXCEL_FILES = [
    "Data/seed_data.xlsx",
    "Data/seed_data_1.xlsx",
    "Data/seed_data_2.xlsx",
    "Data/seed_data_3.xlsx"
]

# Review comments pool (20 mẫu)
REVIEW_COMMENTS = [
    {"rating": 5, "comment": "Áo mặc lên form rất đẹp, chất vải mềm và mát. Đóng gói cẩn thận, giao hàng nhanh hơn dự kiến. Sẽ ủng hộ shop thêm."},
    {"rating": 4, "comment": "Chất lượng ổn so với giá tiền, màu sắc giống hình. Tuy nhiên size hơi rộng hơn mong đợi một chút."},
    {"rating": 5, "comment": "Quần mặc rất thoải mái, đường may chắc chắn. Đi làm hay đi chơi đều hợp. Rất hài lòng."},
    {"rating": 4, "comment": "Áo đẹp, vải dày dặn, không bị mỏng. Chỉ tiếc là giao hàng chậm hơn 1 ngày so với dự kiến."},
    {"rating": 3, "comment": "Mẫu mã ổn nhưng chất vải ở mức trung bình, không quá nổi bật. Phù hợp với mức giá."},
    {"rating": 5, "comment": "Mặc lên nhìn gọn dáng, đúng như mô tả. Shop tư vấn nhiệt tình, phản hồi nhanh."},
    {"rating": 4, "comment": "Quần khá đẹp, không bị xù lông sau vài lần giặt. Mong shop bổ sung thêm nhiều màu hơn."},
    {"rating": 5, "comment": "Rất ưng ý! Chất vải mát, mặc không bị bí. Đúng kiểu mình đang tìm."},
    {"rating": 3, "comment": "Form áo hơi ngắn so với mong đợi, nhưng chất lượng vải ổn. Có thể cân nhắc mua lại nếu có size khác."},
    {"rating": 5, "comment": "Sản phẩm đúng hình, mặc lên rất hợp. Giá hợp lý, chất lượng vượt mong đợi."},
    {"rating": 5, "comment": "Áo mặc rất thoải mái, chất vải mềm và không bị ngứa. Giặt máy vẫn giữ form tốt."},
    {"rating": 4, "comment": "Quần đẹp, đường may ổn, mặc lên gọn gàng. Nếu vải dày hơn chút nữa thì hoàn hảo."},
    {"rating": 3, "comment": "Sản phẩm đúng mô tả nhưng chưa có gì nổi bật. Phù hợp mua mặc hằng ngày."},
    {"rating": 5, "comment": "Màu sắc ngoài đời đẹp hơn hình, mặc lên nhìn rất lịch sự. Sẽ mua thêm màu khác."},
    {"rating": 2, "comment": "Chất vải hơi mỏng so với mong đợi, form chưa thật sự hợp dáng mình."},
    {"rating": 4, "comment": "Áo mặc mát, không bị bí. Shop đóng gói cẩn thận, giao hàng đúng hẹn."},
    {"rating": 5, "comment": "Quần mặc lên rất vừa vặn, thoải mái khi vận động. Giá vậy là quá ổn."},
    {"rating": 3, "comment": "Mẫu mã đẹp nhưng size hơi lệch so với bảng size. Nên cân nhắc khi chọn."},
    {"rating": 4, "comment": "Chất lượng ổn định, không có lỗi may. Phù hợp với môi trường công sở."},
    {"rating": 5, "comment": "Rất hài lòng với sản phẩm, từ chất lượng đến dịch vụ. Sẽ quay lại mua tiếp."}
]

# ==================== HELPERS ====================
def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def login_admin():
    """Login admin và lấy JWT token"""
    log("Đang login admin...")
    response = requests.post(f"{BASE_URL}/api/v1/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200 or response.status_code == 201:
        token = response.json()["access_token"]
        log("✅ Login admin thành công")
        return token
    else:
        log(f"❌ Login admin thất bại: {response.text}")
        sys.exit(1)

def login_customer(customer_id):
    """Login customer và lấy JWT token (dùng password mặc định)"""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT email FROM customers WHERE id = %s", (customer_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return None
    
    email = row[0]
    response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": email,
        "password": "password123"
    })
    
    if response.status_code in [200, 201]:
        return response.json()["access_token"]
    return None

def get_provinces():
    """Lấy danh sách tỉnh/thành phố từ API"""
    response = requests.get(f"{BASE_URL}/api/v1/address/provinces")
    if response.status_code == 200:
        return response.json()
    return []

def get_districts(province_code):
    """Lấy danh sách quận/huyện theo tỉnh"""
    response = requests.get(f"{BASE_URL}/api/v1/address/districts?province_code={province_code}")
    if response.status_code == 200:
        return response.json()
    return []

def get_wards(province_code):
    """Lấy danh sách phường/xã theo tỉnh"""
    response = requests.get(f"{BASE_URL}/api/v1/address/wards?province_code={province_code}")
    if response.status_code == 200:
        return response.json()
    return []

def generate_slug(name):
    """Chuyển tên thành slug URL-friendly"""
    import unicodedata
    slug = name.lower()
    slug = unicodedata.normalize('NFKD', slug)
    slug = slug.encode('ascii', 'ignore').decode('ascii')
    slug = ''.join(c if c.isalnum() or c in [' ', '-'] else '' for c in slug)
    slug = '-'.join(slug.split())
    return slug

# ==================== SEED FUNCTIONS ====================

def seed_categories():
    """Seed categories từ Excel files"""
    log("=== Bước 1: Seed Categories ===")
    
    all_categories = []
    for file in EXCEL_FILES:
        if not os.path.exists(file):
            continue
        df = pd.read_excel(file, sheet_name='Categories')
        all_categories.extend(df.to_dict('records'))
    
    # Remove duplicates by name
    unique_cats = {}
    for cat in all_categories:
        unique_cats[cat['name']] = cat
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    for cat in unique_cats.values():
        slug = generate_slug(cat['name'])
        cur.execute("""
            INSERT INTO categories (name, slug, status)
            VALUES (%s, %s, 'active')
            ON CONFLICT (slug) DO NOTHING
        """, (cat['name'], slug))
    
    conn.commit()
    log(f"✅ Seeded {len(unique_cats)} categories")
    cur.close()
    conn.close()

def seed_colors():
    """Seed colors từ Excel files"""
    log("=== Bước 2: Seed Colors ===")
    
    # Mapping màu sang hex code
    COLOR_HEX = {
        "Trắng": "#FFFFFF", "Đen": "#000000", "Xám": "#6B7280",
        "Xanh Dương": "#1E40AF", "Xanh Navy": "#1E3A8A", "Navy": "#1E3A8A",
        "Be": "#D4B59E", "Kem": "#F5E6D3", "Đỏ": "#DC2626",
        "Hồng": "#EC4899", "Xanh Lá": "#059669", "Nâu": "#92400E"
    }
    
    all_colors = []
    for file in EXCEL_FILES:
        if not os.path.exists(file):
            continue
        df = pd.read_excel(file, sheet_name='Colors')
        all_colors.extend(df.to_dict('records'))
    
    unique_colors = {}
    for color in all_colors:
        unique_colors[color['name']] = color
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    for color in unique_colors.values():
        hex_code = COLOR_HEX.get(color['name'], "#CCCCCC")
        cur.execute("""
            INSERT INTO colors (id, name, hex_code)
            OVERRIDING SYSTEM VALUE
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, hex_code = EXCLUDED.hex_code
        """, (color['id'], color['name'], hex_code))
    
    conn.commit()
    log(f"✅ Seeded {len(unique_colors)} colors")
    cur.close()
    conn.close()

def seed_products():
    """Seed products từ Excel files"""
    log("=== Bước 3: Seed Products ===")
    
    all_products = []
    for file in EXCEL_FILES:
        if not os.path.exists(file):
            continue
        df = pd.read_excel(file, sheet_name='Products')
        all_products.extend(df.to_dict('records'))
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    seeded_count = 0
    for product in all_products:
        slug = generate_slug(product['name'])
        cost_price = float(product['selling_price']) * 0.7
        thumbnail = product['images'].split(', ')[0] if product['images'] else None
        
        cur.execute("""
            INSERT INTO products (
                category_id, name, slug, description, cost_price, selling_price,
                status, thumbnail_url, average_rating, total_reviews, attributes
            )
            VALUES (%s, %s, %s, %s, %s, %s, 'active', %s, 0, 0, '{}'::jsonb)
            ON CONFLICT (slug) DO NOTHING
            RETURNING id
        """, (
            product['category_id'], product['name'], slug, product['description'],
            cost_price, product['selling_price'], thumbnail
        ))
        
        if cur.rowcount > 0:
            seeded_count += 1
    
    conn.commit()
    log(f"✅ Seeded {seeded_count} products")
    cur.close()
    conn.close()

def seed_variants_and_images():
    """Seed variants và images cho mỗi product"""
    log("=== Bước 4: Seed Product Variants & Images ===")
    
    all_products = []
    for file in EXCEL_FILES:
        if not os.path.exists(file):
            continue
        df = pd.read_excel(file, sheet_name='Products')
        all_products.extend(df.to_dict('records'))
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Lấy sizes
    cur.execute("SELECT id FROM sizes ORDER BY sort_order")
    sizes = [row[0] for row in cur.fetchall()]
    
    variant_count = 0
    image_count = 0
    
    for excel_product in all_products:
        slug = generate_slug(excel_product['name'])
        
        # Lấy product_id từ DB
        cur.execute("SELECT id FROM products WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row:
            continue
        product_id = row[0]
        
        # Parse color_ids và images
        color_ids = [int(c.strip()) for c in str(excel_product['color_ids']).split(',')]
        images = [img.strip() for img in excel_product['images'].split(', ')]
        
        # Chia đều images cho các colors
        images_per_color = max(1, len(images) // len(color_ids))
        
        for idx, color_id in enumerate(color_ids):
            # Chọn random 1 size (hoặc dùng M)
            size_id = sizes[1] if len(sizes) > 1 else sizes[0]
            
            # Generate SKU
            sku = f"SW-{product_id}-S{size_id}-C{color_id}-{idx}"
            
            # Insert variant
            cur.execute("""
                INSERT INTO product_variants (
                    product_id, size_id, color_id, sku, total_stock, reserved_stock, reorder_point, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, 10, 'active')
                ON CONFLICT (sku) DO NOTHING
                RETURNING id
            """, (product_id, size_id, color_id, sku, random.randint(30, 60), random.randint(0, 2)))
            
            if cur.rowcount == 0:
                continue
            
            variant_id = cur.fetchone()[0]
            variant_count += 1
            
            # Insert images cho variant này
            start_idx = idx * images_per_color
            end_idx = min(start_idx + images_per_color, len(images))
            variant_images = images[start_idx:end_idx]
            
            if not variant_images and images:
                variant_images = [images[0]]
            
            for img_idx, image_url in enumerate(variant_images):
                is_main = (img_idx == 0)
                cur.execute("""
                    INSERT INTO product_images (variant_id, image_url, is_main)
                    VALUES (%s, %s, %s)
                """, (variant_id, image_url, is_main))
                image_count += 1
    
    conn.commit()
    log(f"✅ Seeded {variant_count} variants và {image_count} images")
    cur.close()
    conn.close()

def seed_customer_addresses():
    """Seed địa chỉ cho customers qua SQL (không qua API vì customer authentication phức tạp)"""
    log("=== Bước 5: Seed Customer Addresses ===")
    
    provinces = get_provinces()
    if not provinces:
        log("⚠️ Không lấy được tỉnh từ API, dùng data hardcode")
        # Fallback: hardcode một số tỉnh phổ biến
        provinces = [
            {"code": 1, "full_name": "Hà Nội"},
            {"code": 79, "full_name": "Thành phố Hồ Chí Minh"},
            {"code": 48, "full_name": "Đà Nẵng"},
            {"code": 31, "full_name": "Hải Phòng"},
            {"code": 92, "full_name": "Cần Thơ"}
        ]
    
    log(f"Lấy được {len(provinces)} tỉnh/thành phố")
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [row[0] for row in cur.fetchall()]
    
    addresses_created = 0
    
    # Danh sách quận/huyện mẫu
    districts = ["Quận 1", "Quận 2", "Quận 3", "Hoàn Kiếm", "Ba Đình", "Cầu Giấy", "Hải Châu", "Thanh Khê"]
    wards = ["Phường 1", "Phường 2", "Phường Bến Nghé", "Phường Đa Kao", "Phường Cửa Nam", "Phường Láng Hạ"]
    streets = ["Hoàng Diệu", "Lê Lợi", "Trần Phú", "Nguyễn Trãi", "Hai Bà Trưng", "Lý Thường Kiệt", "Nguyễn Huệ"]
    
    for customer_id in customer_ids:
        # Tạo 1-2 địa chỉ cho mỗi customer
        num_addresses = random.randint(1, 2)
        
        for i in range(num_addresses):
            province = random.choice(provinces)
            district = random.choice(districts)
            ward = random.choice(wards)
            street = random.choice(streets)
            
            # Insert trực tiếp vào database
            cur.execute("""
                INSERT INTO customer_addresses (
                    customer_id, is_default, address_type, street_address, 
                    phone_number, province, district, ward
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                customer_id,
                (i == 0),  # Địa chỉ đầu là default
                random.choice(["Home", "Office"]),
                f"{random.randint(1, 999)} {random.choice(['Đường', 'Phố', 'Ngõ'])} {street}",
                f"0{random.randint(900000000, 999999999)}",
                province['full_name'],
                district,
                ward
            ))
            addresses_created += 1
    
    conn.commit()
    log(f"✅ Seeded {addresses_created} customer addresses")
    cur.close()
    conn.close()

def seed_orders():
    """Seed orders qua SQL (vì quá phức tạp qua API checkout)"""
    log("=== Bước 6: Seed Orders ===")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Lấy customers
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [row[0] for row in cur.fetchall()]
    
    # Lấy variants có stock
    cur.execute("""
        SELECT id, product_id FROM product_variants 
        WHERE total_stock > reserved_stock AND status = 'active'
        LIMIT 200
    """)
    variants = cur.fetchall()
    
    if not variants:
        log("❌ Không có variants để tạo orders")
        return
    
    # Status distribution
    statuses = (
        ['pending'] * 30 + ['processing'] * 20 + 
        ['shipping'] * 15 + ['delivered'] * 30 + ['cancelled'] * 5
    )
    
    orders_created = 0
    
    for _ in range(80):
        customer_id = random.choice(customer_ids)
        status = random.choice(statuses)
        payment_method = random.choice(['cod'] * 7 + ['vnpay'] * 2 + ['momo'] * 1)
        
        # Lấy địa chỉ customer
        cur.execute("""
            SELECT street_address, phone_number, province, district, ward
            FROM customer_addresses WHERE customer_id = %s LIMIT 1
        """, (customer_id,))
        addr = cur.fetchone()
        
        if not addr:
            continue
        
        # Tạo order
        order_date = datetime.now() - timedelta(days=random.randint(1, 90))
        order_number = f"ORD{order_date.strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        # Random 2-3 items
        order_variants = random.sample(variants, k=random.randint(2, 3))
        total_amount = 0
        
        # Calculate total
        for variant_id, product_id in order_variants:
            cur.execute("SELECT selling_price FROM products WHERE id = %s", (product_id,))
            price = cur.fetchone()[0]
            qty = random.randint(1, 2)
            total_amount += float(price) * qty
        
        shipping_fee = 30000
        total_amount += shipping_fee
        
        # Payment status
        if payment_method == 'cod':
            payment_status = 'paid' if status == 'delivered' else 'unpaid'
        else:
            payment_status = 'paid'
        
        # Insert order
        cur.execute("""
            INSERT INTO orders (
                customer_id, shipping_address, shipping_phone, shipping_city,
                shipping_district, shipping_ward, fulfillment_status, payment_status,
                payment_method, shipping_fee, total_amount, created_at, order_number
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            customer_id, addr[0], addr[1], addr[2], addr[3], addr[4],
            status, payment_status, payment_method, shipping_fee, total_amount,
            order_date, order_number
        ))
        
        order_id = cur.fetchone()[0]
        
        # Insert order items
        for variant_id, product_id in order_variants:
            cur.execute("SELECT selling_price FROM products WHERE id = %s", (product_id,))
            price = cur.fetchone()[0]
            qty = random.randint(1, 2)
            
            cur.execute("""
                INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s)
            """, (order_id, variant_id, qty, price))
        
        # Insert payment record
        cur.execute("""
            INSERT INTO payments (order_id, amount, provider, payment_method, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (order_id, total_amount, payment_method, payment_method, 
              'completed' if payment_status == 'paid' else 'pending', order_date))
        
        orders_created += 1
    
    conn.commit()
    log(f"✅ Seeded {orders_created} orders")
    cur.close()
    conn.close()

def seed_reviews():
    """Seed reviews cho sản phẩm (5-20 reviews/product, từ delivered orders)"""
    log("=== Bước 7: Seed Product Reviews ===")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Lấy các delivered orders
    cur.execute("""
        SELECT o.id, o.customer_id, oi.variant_id
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.fulfillment_status = 'delivered'
        ORDER BY RANDOM()
    """)
    delivered_items = cur.fetchall()
    
    if not delivered_items:
        log("❌ Không có delivered orders để tạo reviews")
        return
    
    reviews_created = 0
    
    for order_id, customer_id, variant_id in delivered_items:
        # Random số lượng reviews (không phải tất cả đều review)
        if random.random() < 0.4:
            continue
        
        # Random 1 comment từ pool
        review_template = random.choice(REVIEW_COMMENTS)
        
        # Login customer
        token = login_customer(customer_id)
        if not token:
            # Fallback: Insert trực tiếp SQL
            cur.execute("""
                INSERT INTO product_reviews (variant_id, customer_id, order_id, rating, comment, status)
                VALUES (%s, %s, %s, %s, %s, 'approved')
            """, (variant_id, customer_id, order_id, review_template['rating'], review_template['comment']))
            reviews_created += 1
            continue
        
        # Call API
        response = requests.post(
            f"{BASE_URL}/reviews",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "variant_id": variant_id,
                "order_id": order_id,
                "rating": review_template['rating'],
                "comment": review_template['comment']
            }
        )
        
        if response.status_code in [200, 201]:
            reviews_created += 1
        
        time.sleep(0.1)
        
        # Limit số reviews để không quá nhiều
        if reviews_created >= 100:
            break
    
    conn.commit()
    
    # Update product average_rating và total_reviews
    cur.execute("""
        UPDATE products p SET
            average_rating = (
                SELECT COALESCE(AVG(pr.rating), 0)
                FROM product_reviews pr
                JOIN product_variants pv ON pr.variant_id = pv.id
                WHERE pv.product_id = p.id AND pr.status = 'approved'
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM product_reviews pr
                JOIN product_variants pv ON pr.variant_id = pv.id
                WHERE pv.product_id = p.id AND pr.status = 'approved'
            )
    """)
    conn.commit()
    
    log(f"✅ Seeded {reviews_created} reviews và updated product ratings")
    cur.close()
    conn.close()

def seed_promotions():
    """Seed promotions"""
    log("=== Bước 8: Seed Promotions ===")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    promotions_data = [
        {
            "name": "Flash Sale Cuối Tuần",
            "type": "flash_sale",
            "discount_type": "percentage",
            "discount_value": 20,
            "start_date": datetime.now() - timedelta(days=2),
            "end_date": datetime.now() + timedelta(days=2),
            "status": "active"
        },
        {
            "name": "Giảm Giá Mùa Hè",
            "type": "seasonal",
            "discount_type": "percentage",
            "discount_value": 15,
            "start_date": datetime.now() + timedelta(days=7),
            "end_date": datetime.now() + timedelta(days=30),
            "status": "scheduled"
        },
        {
            "name": "Sale Tết 2025",
            "type": "seasonal",
            "discount_type": "percentage",
            "discount_value": 30,
            "start_date": datetime.now() - timedelta(days=60),
            "end_date": datetime.now() - timedelta(days=30),
            "status": "expired"
        }
    ]
    
    for promo in promotions_data:
        cur.execute("""
            INSERT INTO promotions (name, type, discount_type, discount_value, start_date, end_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (promo['name'], promo['type'], promo['discount_type'], promo['discount_value'],
              promo['start_date'], promo['end_date'], promo['status']))
        
        promo_id = cur.fetchone()[0]
        
        # Random products cho promotion
        cur.execute("SELECT id, selling_price FROM products WHERE status = 'active' ORDER BY RANDOM() LIMIT 10")
        products = cur.fetchall()
        
        for product_id, selling_price in products:
            flash_price = float(selling_price) * (1 - promo['discount_value'] / 100)
            cur.execute("""
                INSERT INTO promotion_products (promotion_id, product_id, flash_sale_price)
                VALUES (%s, %s, %s)
            """, (promo_id, product_id, flash_price))
    
    conn.commit()
    log(f"✅ Seeded {len(promotions_data)} promotions")
    cur.close()
    conn.close()

# ==================== MAIN ====================

def main():
    log("🌱 Bắt đầu seed data...")
    log("=" * 50)
    
    try:
        # Login admin để lấy token
        admin_token = login_admin()
        
        # Seed data theo thứ tự
        seed_categories()
        seed_colors()
        seed_products()
        seed_variants_and_images()
        seed_customer_addresses()
        seed_orders()
        seed_reviews()
        seed_promotions()
        
        log("=" * 50)
        log("✅ Hoàn thành seed data!")
        
    except Exception as e:
        log(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
