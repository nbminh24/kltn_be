#!/usr/bin/env python3
"""
Script Seed Data - Phần Còn Lại (Addresses, Orders, Reviews)
Giữ nguyên Products, Variants, Images đã có
"""

import sys
import psycopg2
import requests
import random
from datetime import datetime, timedelta

# ==================== CONFIG ====================
BASE_URL = "http://localhost:3001"
ADMIN_EMAIL = "lecas.office@gmail.com"
ADMIN_PASSWORD = "Minh1204"

DB_CONFIG = {
    "host": "db.sdviskalbqirwlrpvmrp.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Mimikyu1204"
}

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

def get_provinces():
    """Lấy danh sách tỉnh/thành phố từ API"""
    try:
        response = requests.get(f"{BASE_URL}/api/v1/address/provinces")
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return []

def get_province_display_name(province: dict) -> str:
    """Trả về tên tỉnh/thành phố từ object province (hỗ trợ nhiều schema)"""
    return (
        province.get('full_name')
        or province.get('name')
        or province.get('fullName')
        or province.get('province_name')
        or province.get('provinceName')
        or ''
    )

# ==================== SEED FUNCTIONS ====================

def seed_customer_addresses():
    """Seed địa chỉ cho customers"""
    log("=== Bước 1: Seed Customer Addresses ===")
    
    provinces_api = get_provinces()
    if provinces_api:
        log(f"Lấy được {len(provinces_api)} tỉnh từ API")
        provinces = provinces_api
    else:
        log("⚠️ Không lấy được tỉnh từ API, dùng data hardcode")
        provinces = [
            {"code": 1, "full_name": "Hà Nội"},
            {"code": 79, "full_name": "Thành phố Hồ Chí Minh"},
            {"code": 48, "full_name": "Đà Nẵng"},
            {"code": 31, "full_name": "Hải Phòng"},
            {"code": 92, "full_name": "Cần Thơ"}
        ]
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [row[0] for row in cur.fetchall()]
    
    addresses_created = 0
    
    districts = ["Quận 1", "Quận 2", "Quận 3", "Hoàn Kiếm", "Ba Đình", "Cầu Giấy", "Hải Châu", "Thanh Khê"]
    wards = ["Phường 1", "Phường 2", "Phường Bến Nghé", "Phường Đa Kao", "Phường Cửa Nam", "Phường Láng Hạ"]
    streets = ["Hoàng Diệu", "Lê Lợi", "Trần Phú", "Nguyễn Trãi", "Hai Bà Trưng", "Lý Thường Kiệt", "Nguyễn Huệ"]
    
    for customer_id in customer_ids:
        num_addresses = random.randint(1, 2)
        
        for i in range(num_addresses):
            province = random.choice(provinces)
            district = random.choice(districts)
            ward = random.choice(wards)
            street = random.choice(streets)
            
            cur.execute("""
                INSERT INTO customer_addresses (
                    customer_id, is_default, address_type, street_address, 
                    phone_number, province, district, ward
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                customer_id,
                (i == 0),
                random.choice(["Home", "Office"]),
                f"{random.randint(1, 999)} {random.choice(['Đường', 'Phố', 'Ngõ'])} {street}",
                f"0{random.randint(900000000, 999999999)}",
                get_province_display_name(province),
                district,
                ward
            ))
            addresses_created += 1
    
    conn.commit()
    log(f"✅ Seeded {addresses_created} customer addresses")
    cur.close()
    conn.close()

def seed_orders():
    """Seed orders"""
    log("=== Bước 2: Seed Orders ===")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id FROM customers ORDER BY id")
    customer_ids = [row[0] for row in cur.fetchall()]
    
    cur.execute("""
        SELECT id, product_id FROM product_variants 
        WHERE total_stock > reserved_stock AND status = 'active'
        LIMIT 200
    """)
    variants = cur.fetchall()
    
    if not variants:
        log("❌ Không có variants để tạo orders")
        return
    
    statuses = (
        ['pending'] * 30 + ['processing'] * 20 + 
        ['shipping'] * 15 + ['delivered'] * 30 + ['cancelled'] * 5
    )
    
    orders_created = 0
    
    for _ in range(80):
        customer_id = random.choice(customer_ids)
        status = random.choice(statuses)
        payment_method = random.choice(['cod'] * 7 + ['vnpay'] * 2 + ['momo'] * 1)
        
        cur.execute("""
            SELECT street_address, phone_number, province, district, ward
            FROM customer_addresses WHERE customer_id = %s LIMIT 1
        """, (customer_id,))
        addr = cur.fetchone()
        
        if not addr:
            continue
        
        order_date = datetime.now() - timedelta(days=random.randint(1, 90))
        order_number = f"ORD{order_date.strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        order_variants = random.sample(variants, k=random.randint(2, 3))
        total_amount = 0
        
        for variant_id, product_id in order_variants:
            cur.execute("SELECT selling_price FROM products WHERE id = %s", (product_id,))
            price = cur.fetchone()[0]
            qty = random.randint(1, 2)
            total_amount += float(price) * qty
        
        shipping_fee = 30000
        total_amount += shipping_fee
        
        if payment_method == 'cod':
            payment_status = 'paid' if status == 'delivered' else 'unpaid'
        else:
            payment_status = 'paid'
        
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
        
        for variant_id, product_id in order_variants:
            cur.execute("SELECT selling_price FROM products WHERE id = %s", (product_id,))
            price = cur.fetchone()[0]
            qty = random.randint(1, 2)
            
            cur.execute("""
                INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase)
                VALUES (%s, %s, %s, %s)
            """, (order_id, variant_id, qty, price))
        
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
    """Seed 5-20 reviews cho mỗi product"""
    log("=== Bước 3: Seed Product Reviews (5-20/product) ===")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Lấy tất cả products
    cur.execute("SELECT id FROM products WHERE status = 'active'")
    product_ids = [row[0] for row in cur.fetchall()]
    
    # Lấy tất cả customers
    cur.execute("SELECT id FROM customers")
    customer_ids = [row[0] for row in cur.fetchall()]
    
    # Lấy delivered orders để có order_id hợp lệ
    cur.execute("""
        SELECT id, customer_id FROM orders 
        WHERE fulfillment_status = 'delivered'
    """)
    delivered_orders = cur.fetchall()
    
    if not delivered_orders:
        log("⚠️ Không có delivered orders, tạo fake orders để có order_id")
        # Tạo một số fake delivered orders
        for _ in range(50):
            customer_id = random.choice(customer_ids)
            cur.execute("""
                INSERT INTO orders (
                    customer_id, shipping_address, shipping_phone, 
                    shipping_city, shipping_district, shipping_ward,
                    fulfillment_status, payment_status, payment_method,
                    shipping_fee, total_amount, order_number
                )
                VALUES (%s, 'Fake Address', '0900000000', 'Hà Nội', 'Hoàn Kiếm', 'Phường 1',
                        'delivered', 'paid', 'cod', 30000, 100000, %s)
                RETURNING id
            """, (customer_id, f"FAKE{random.randint(10000, 99999)}"))
            order_id = cur.fetchone()[0]
            delivered_orders.append((order_id, customer_id))
        conn.commit()
        log(f"Tạo {len(delivered_orders)} fake delivered orders")
    
    reviews_created = 0
    
    for product_id in product_ids:
        # Random 5-20 reviews cho mỗi product
        num_reviews = random.randint(5, 20)
        
        # Lấy variants của product này
        cur.execute("""
            SELECT id FROM product_variants 
            WHERE product_id = %s AND status = 'active'
            LIMIT 10
        """, (product_id,))
        variant_ids = [row[0] for row in cur.fetchall()]
        
        if not variant_ids:
            continue
        
        for _ in range(num_reviews):
            variant_id = random.choice(variant_ids)
            order_id, customer_id = random.choice(delivered_orders)
            review_template = random.choice(REVIEW_COMMENTS)
            
            try:
                cur.execute("""
                    INSERT INTO product_reviews (variant_id, customer_id, order_id, rating, comment, status)
                    VALUES (%s, %s, %s, %s, %s, 'approved')
                """, (variant_id, customer_id, order_id, review_template['rating'], review_template['comment']))
                reviews_created += 1
            except:
                # Skip nếu duplicate hoặc lỗi
                pass
    
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
    
    log(f"✅ Seeded {reviews_created} reviews (5-20/product) và updated product ratings")
    cur.close()
    conn.close()

# ==================== MAIN ====================

def main():
    log("🌱 Bắt đầu seed data phần còn lại...")
    log("=" * 50)
    
    try:
        seed_customer_addresses()
        seed_orders()
        seed_reviews()
        
        log("=" * 50)
        log("✅ Hoàn thành seed data!")
        
    except Exception as e:
        log(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
