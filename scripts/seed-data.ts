import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Parse DATABASE_URL or use individual env vars
let dbConfig: any;

if (process.env.DATABASE_URL) {
    const urlMatch = process.env.DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (urlMatch) {
        const [, user, password, host, port, database] = urlMatch;
        dbConfig = {
            type: 'postgres' as const,
            host,
            port: parseInt(port),
            username: user,
            password,
            database,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            entities: [],
            synchronize: false,
        };
    } else {
        console.error('❌ Invalid DATABASE_URL format');
        process.exit(1);
    }
} else {
    dbConfig = {
        type: 'postgres' as const,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'kltn_db',
        entities: [],
        synchronize: false,
    };
}

const AppDataSource = new DataSource(dbConfig);

// Helper function to generate slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Helper function to random element
function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to random number
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedData() {
    try {
        console.log('\n🌱 Starting seed data...\n');
        console.log('='.repeat(50));

        await AppDataSource.initialize();
        console.log('✅ Database connected\n');

        // 1. Seed Admins
        console.log('📌 Seeding Admins...');
        const adminPassword = await bcrypt.hash('Admin123456', 10);
        await AppDataSource.query(`
      INSERT INTO admins (name, email, password_hash, role) VALUES
      ('Super Admin', 'superadmin@shop.com', $1, 'super_admin'),
      ('Admin User', 'admin@shop.com', $1, 'admin'),
      ('Manager', 'manager@shop.com', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [adminPassword]);
        console.log('   ✓ Created 3 admins\n');

        // 2. Seed Sizes
        console.log('📌 Seeding Sizes...');
        await AppDataSource.query(`
      INSERT INTO sizes (name, sort_order) VALUES
      ('XS', 1), ('S', 2), ('M', 3), ('L', 4), ('XL', 5), ('XXL', 6)
      ON CONFLICT DO NOTHING
    `);
        const sizes: { id: number; name: string }[] = await AppDataSource.query('SELECT id, name FROM sizes ORDER BY sort_order');
        console.log(`   ✓ Created ${sizes.length} sizes\n`);

        // 3. Seed Colors
        console.log('📌 Seeding Colors...');
        await AppDataSource.query(`
      INSERT INTO colors (name, hex_code) VALUES
      ('Đen', '#000000'),
      ('Trắng', '#FFFFFF'),
      ('Xám', '#808080'),
      ('Xanh Navy', '#000080'),
      ('Xanh Dương', '#0000FF'),
      ('Be', '#F5F5DC'),
      ('Nâu', '#8B4513'),
      ('Xanh Lá', '#008000'),
      ('Đỏ', '#FF0000'),
      ('Vàng', '#FFD700')
      ON CONFLICT DO NOTHING
    `);
        const colors: { id: number; name: string; hex_code: string }[] = await AppDataSource.query('SELECT id, name, hex_code FROM colors');
        console.log(`   ✓ Created ${colors.length} colors\n`);

        // 4. Seed Categories & Products from Excel
        console.log('📌 Reading Excel files and seeding Categories & Products...');
        const excelFolder = path.join(__dirname, '..', 'denim_official');
        const excelFiles = fs.readdirSync(excelFolder).filter(f => f.endsWith('.xlsx'));

        let totalProducts = 0;
        let totalVariants = 0;
        let totalImages = 0;

        for (const file of excelFiles) {
            const categoryName = file.replace('.xlsx', '').replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const categorySlug = slugify(categoryName);

            // Insert category
            await AppDataSource.query(`
        INSERT INTO categories (name, slug, status) VALUES ($1, $2, 'active')
        ON CONFLICT (slug) DO NOTHING
      `, [categoryName, categorySlug]);

            const category = await AppDataSource.query('SELECT id FROM categories WHERE slug = $1', [categorySlug]);
            const categoryId = category[0]?.id;

            if (!categoryId) continue;

            // Read Excel
            const filePath = path.join(excelFolder, file);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data: any[] = XLSX.utils.sheet_to_json(sheet);

            console.log(`   📁 ${categoryName}: ${data.length} products`);

            for (const row of data) {
                const productName = row.name || 'Unnamed Product';
                const productSlug = slugify(productName) + '-' + randomInt(1000, 9999);
                const description = row.description || 'Sản phẩm chất lượng cao';

                let imageUrls: string[] = [];
                try {
                    imageUrls = JSON.parse(row.image_urls || '[]');
                } catch (e) {
                    console.log(`     ⚠️  Error parsing images for: ${productName}`);
                    continue;
                }

                if (imageUrls.length === 0) continue;

                const costPrice = randomInt(100000, 300000);
                const sellingPrice = costPrice + randomInt(50000, 200000);
                const thumbnailUrl = imageUrls[0];

                // Insert product
                const productResult = await AppDataSource.query(`
          INSERT INTO products (category_id, name, slug, description, full_description, cost_price, selling_price, status, thumbnail_url, attributes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
          RETURNING id
        `, [
                    categoryId,
                    productName,
                    productSlug,
                    description.substring(0, 200),
                    description,
                    costPrice,
                    sellingPrice,
                    thumbnailUrl,
                    JSON.stringify({ material: 'Cotton', origin: 'Vietnam', style: 'Casual' })
                ]);

                const productId = productResult[0].id;
                totalProducts++;

                // Create variants (3 colors x 5 sizes = 15 variants)
                const selectedColors = colors.sort(() => 0.5 - Math.random()).slice(0, 3);
                const selectedSizes = sizes.filter(s => ['S', 'M', 'L', 'XL', 'XXL'].includes(s.name));

                let variantIndex = 0;
                for (const color of selectedColors) {
                    for (const size of selectedSizes) {
                        const sku = `${categorySlug.substring(0, 3).toUpperCase()}-${productId}-${color.name.substring(0, 2)}-${size.name}-${randomInt(100, 999)}`.replace(/\s/g, '');
                        const stock = randomInt(10, 100);

                        const variantResult = await AppDataSource.query(`
              INSERT INTO product_variants (product_id, size_id, color_id, name, sku, total_stock, reserved_stock, status)
              VALUES ($1, $2, $3, $4, $5, $6, 0, 'active')
              ON CONFLICT (sku) DO NOTHING
              RETURNING id
            `, [productId, size.id, color.id, `${productName} - ${color.name} - ${size.name}`, sku, stock]);

                        if (!variantResult || variantResult.length === 0) {
                            // SKU conflict, skip this variant
                            continue;
                        }

                        const variantId = variantResult[0].id;
                        totalVariants++;

                        // Distribute images to variants (each variant gets 1-2 images)
                        const imagesPerVariant = Math.ceil(imageUrls.length / (selectedColors.length * selectedSizes.length));
                        const startIdx = variantIndex * imagesPerVariant;
                        const endIdx = Math.min(startIdx + imagesPerVariant, imageUrls.length);
                        const variantImages = imageUrls.slice(startIdx, endIdx);

                        if (variantImages.length === 0) {
                            variantImages.push(imageUrls[0]); // Fallback to first image
                        }

                        for (let i = 0; i < variantImages.length; i++) {
                            await AppDataSource.query(`
                INSERT INTO product_images (variant_id, image_url, is_main)
                VALUES ($1, $2, $3)
              `, [variantId, variantImages[i], i === 0]);
                            totalImages++;
                        }

                        variantIndex++;
                    }
                }
            }
        }

        console.log(`   ✓ Created ${excelFiles.length} categories`);
        console.log(`   ✓ Created ${totalProducts} products`);
        console.log(`   ✓ Created ${totalVariants} variants`);
        console.log(`   ✓ Created ${totalImages} images\n`);

        // 5. Seed Customers
        console.log('📌 Seeding Customers...');
        const customerPassword = await bcrypt.hash('Customer123', 10);
        const customerNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E', 'Vũ Thị F', 'Đỗ Văn G', 'Bùi Thị H', 'Đinh Văn I', 'Ngô Thị K', 'Dương Văn L', 'Lý Thị M', 'Mai Văn N', 'Võ Thị O', 'Phan Văn P', 'Tạ Thị Q', 'Trương Văn R', 'Hồ Thị S', 'Tôn Văn T', 'Đặng Thị U'];

        for (let i = 0; i < customerNames.length; i++) {
            await AppDataSource.query(`
        INSERT INTO customers (name, email, password_hash, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (email) DO NOTHING
      `, [customerNames[i], `customer${i + 1}@gmail.com`, customerPassword]);
        }
        const customers = await AppDataSource.query('SELECT id FROM customers');
        console.log(`   ✓ Created ${customers.length} customers\n`);

        // 6. Seed Customer Addresses
        console.log('📌 Seeding Customer Addresses...');
        const cities = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
        const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Ba Đình', 'Hoàn Kiếm'];
        const wards = ['Phường 1', 'Phường 2', 'Phường 3', 'Phường Bến Nghé', 'Phường Đa Kao'];

        for (const customer of customers.slice(0, 15)) {
            const numAddresses = randomInt(1, 3);
            for (let i = 0; i < numAddresses; i++) {
                await AppDataSource.query(`
          INSERT INTO customer_addresses (customer_id, is_default, address_type, detailed_address, phone_number)
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    customer.id,
                    i === 0,
                    randomElement(['Home', 'Office', 'Other']),
                    `${randomInt(1, 999)} ${randomElement(['Nguyễn Trãi', 'Lê Lợi', 'Trần Phú', 'Hai Bà Trưng'])}`,
                    `09${randomInt(10000000, 99999999)}`
                ]);
            }
        }
        console.log('   ✓ Created customer addresses\n');

        // 7. Seed Orders & Order Items
        console.log('📌 Seeding Orders...');
        const variants: any[] = await AppDataSource.query('SELECT id, product_id FROM product_variants LIMIT 100');
        const products: any[] = await AppDataSource.query('SELECT id, selling_price FROM products LIMIT 100');
        const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
        const paymentStatuses = ['unpaid', 'paid'];
        const paymentMethods = ['cod', 'vnpay', 'momo'];

        for (let i = 0; i < 30; i++) {
            const customer: any = randomElement(customers);
            const fulfillmentStatus = randomElement(statuses);
            const paymentStatus = fulfillmentStatus === 'delivered' ? 'paid' : randomElement(paymentStatuses);
            const paymentMethod = randomElement(paymentMethods);
            const shippingFee = randomInt(15000, 50000);

            const numItems = randomInt(1, 5);
            let totalAmount = shippingFee;
            const orderItems: any[] = [];

            for (let j = 0; j < numItems; j++) {
                const variant = randomElement(variants);
                const product = products.find(p => p.id === variant.product_id);
                const quantity = randomInt(1, 3);
                const price = product?.selling_price || randomInt(200000, 500000);
                totalAmount += price * quantity;
                orderItems.push({ variant_id: variant.id, quantity, price });
            }

            const orderResult = await AppDataSource.query(`
        INSERT INTO orders (customer_id, customer_email, shipping_address, shipping_phone, shipping_city, shipping_district, shipping_ward, fulfillment_status, payment_status, payment_method, shipping_fee, total_amount, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL '${randomInt(0, 60)} days')
        RETURNING id
      `, [
                customer.id,
                `customer${customer.id}@gmail.com`,
                `${randomInt(1, 999)} ${randomElement(['Nguyễn Trãi', 'Lê Lợi', 'Trần Phú'])}`,
                `09${randomInt(10000000, 99999999)}`,
                randomElement(cities),
                randomElement(districts),
                randomElement(wards),
                fulfillmentStatus,
                paymentStatus,
                paymentMethod,
                shippingFee,
                totalAmount
            ]);

            const orderId = orderResult[0].id;

            // Insert order items
            for (const item of orderItems) {
                await AppDataSource.query(`
          INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase)
          VALUES ($1, $2, $3, $4)
        `, [orderId, item.variant_id, item.quantity, item.price]);
            }

            // Insert order status history
            await AppDataSource.query(`
        INSERT INTO order_status_history (order_id, status, admin_id)
        VALUES ($1, $2, NULL)
      `, [orderId, fulfillmentStatus]);

            // Insert payment
            if (paymentMethod !== 'cod') {
                await AppDataSource.query(`
          INSERT INTO payments (order_id, transaction_id, amount, provider, payment_method, status)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
                    orderId,
                    `PAY_${Date.now()}_${randomInt(1000, 9999)}`,
                    totalAmount,
                    paymentMethod === 'vnpay' ? 'VNPAY' : 'MOMO',
                    paymentMethod,
                    paymentStatus === 'paid' ? 'success' : 'pending'
                ]);
            }
        }
        console.log('   ✓ Created 30 orders with items, history & payments\n');

        // 8. Seed Carts & Cart Items
        console.log('📌 Seeding Carts...');
        for (const customer of customers.slice(0, 10) as any[]) {
            const cartResult = await AppDataSource.query(`
        INSERT INTO carts (customer_id) VALUES ($1) RETURNING id
      `, [(customer as any).id]);
            const cartId = cartResult[0].id;

            const numItems = randomInt(1, 5);
            for (let i = 0; i < numItems; i++) {
                await AppDataSource.query(`
          INSERT INTO cart_items (cart_id, variant_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [cartId, (randomElement(variants) as any).id, randomInt(1, 3)]);
            }
        }
        console.log('   ✓ Created 10 carts with items\n');

        // 9. Seed Wishlist
        console.log('📌 Seeding Wishlist...');
        for (const customer of customers.slice(0, 15) as any[]) {
            const numWishlist = randomInt(2, 8);
            for (let i = 0; i < numWishlist; i++) {
                await AppDataSource.query(`
          INSERT INTO wishlist_items (customer_id, variant_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [(customer as any).id, (randomElement(variants) as any).id]);
            }
        }
        console.log('   ✓ Created wishlist items\n');

        // 10. Seed Product Reviews
        console.log('📌 Seeding Product Reviews...');
        const completedOrders = await AppDataSource.query(`
      SELECT o.id as order_id, o.customer_id, oi.variant_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.fulfillment_status = 'delivered'
      LIMIT 50
    `);

        const comments = [
            'Sản phẩm rất tốt, chất lượng cao',
            'Đóng gói cẩn thận, ship nhanh',
            'Chất vải mềm mại, mặc rất thoải mái',
            'Đúng như mô tả, sẽ ủng hộ shop tiếp',
            'Giá cả hợp lý, sản phẩm đẹp',
            'Form chuẩn, màu sắc đẹp',
            'Rất hài lòng với sản phẩm này',
            'Chất lượng tốt, giá rẻ',
            'Sẽ mua thêm lần sau',
            'Shop phục vụ tốt, nhiệt tình'
        ];

        for (const order of completedOrders) {
            await AppDataSource.query(`
        INSERT INTO product_reviews (variant_id, customer_id, order_id, rating, comment, status)
        VALUES ($1, $2, $3, $4, $5, 'approved')
      `, [
                order.variant_id,
                order.customer_id,
                order.order_id,
                randomInt(4, 5),
                randomElement(comments)
            ]);
        }
        console.log('   ✓ Created 50 product reviews\n');

        // 11. Seed Chat Sessions & Messages
        console.log('📌 Seeding Chat Sessions...');
        for (const customer of customers.slice(0, 20) as any[]) {
            const sessionResult = await AppDataSource.query(`
        INSERT INTO chat_sessions (customer_id, status)
        VALUES ($1, 'active')
        RETURNING id
      `, [(customer as any).id]);
            const sessionId = sessionResult[0].id;

            const numMessages = randomInt(3, 10);
            for (let i = 0; i < numMessages; i++) {
                const sender = i % 2 === 0 ? 'customer' : 'bot';
                const messages = {
                    customer: ['Xin chào', 'Tôi muốn mua áo', 'Còn hàng không?', 'Giá bao nhiêu?'],
                    bot: ['Chào bạn!', 'Shop có sẵn hàng ạ', 'Bạn cần size nào?', 'Giá 350k ạ']
                };
                await AppDataSource.query(`
          INSERT INTO chat_messages (session_id, sender, message, is_read)
          VALUES ($1, $2, $3, $4)
        `, [sessionId, sender, randomElement(messages[sender]), randomInt(0, 1) === 1]);
            }
        }
        console.log('   ✓ Created 20 chat sessions with messages\n');

        // 12. Seed Support Tickets
        console.log('📌 Seeding Support Tickets...');
        const subjects = ['Hỏi về sản phẩm', 'Đổi trả hàng', 'Khiếu nại chất lượng', 'Hỏi về đơn hàng', 'Yêu cầu hủy đơn'];
        const priorities = ['low', 'medium', 'high'];
        const ticketStatuses = ['pending', 'in_progress', 'resolved', 'closed'];

        for (let i = 0; i < 15; i++) {
            const customer: any = randomElement(customers);
            const ticketResult = await AppDataSource.query(`
        INSERT INTO support_tickets (ticket_code, customer_id, customer_email, subject, status, priority, message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
                `TICKET-${Date.now()}-${randomInt(1000, 9999)}`,
                (customer as any).id,
                `customer${(customer as any).id}@gmail.com`,
                randomElement(subjects),
                randomElement(ticketStatuses),
                randomElement(priorities),
                'Tôi cần hỗ trợ về vấn đề này. Vui lòng phản hồi sớm.'
            ]);

            const ticketId = ticketResult[0].id;

            // Add replies
            const numReplies = randomInt(1, 3);
            for (let j = 0; j < numReplies; j++) {
                await AppDataSource.query(`
          INSERT INTO support_ticket_replies (ticket_id, admin_id, body)
          VALUES ($1, $2, $3)
        `, [ticketId, j % 2 === 0 ? 1 : null, 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ xử lý ngay.']);
            }
        }
        console.log('   ✓ Created 15 support tickets with replies\n');

        // 13. Seed Promotions
        console.log('📌 Seeding Promotions...');
        const promotionResult = await AppDataSource.query(`
      INSERT INTO promotions (name, type, discount_value, discount_type, number_limited, start_date, end_date, status)
      VALUES 
      ('Flash Sale Cuối Tuần', 'flash_sale', 20, 'percentage', 100, NOW(), NOW() + INTERVAL '7 days', 'active'),
      ('Giảm Giá Mùa Hè', 'seasonal', 50000, 'fixed', NULL, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'active'),
      ('Black Friday', 'event', 30, 'percentage', 200, NOW() + INTERVAL '30 days', NOW() + INTERVAL '37 days', 'scheduled')
      RETURNING id
    `);

        for (const promo of promotionResult as any[]) {
            const numProducts = randomInt(5, 15);
            for (let i = 0; i < numProducts; i++) {
                const product: any = randomElement(products);
                await AppDataSource.query(`
          INSERT INTO promotion_products (promotion_id, product_id, flash_sale_price)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [(promo as any).id, (product as any).id, (product as any).selling_price * 0.8]);
            }
        }
        console.log('   ✓ Created 3 promotions with products\n');

        // 14. Seed Restock Batches
        console.log('📌 Seeding Restock Batches...');
        for (let i = 0; i < 5; i++) {
            const batchResult = await AppDataSource.query(`
        INSERT INTO restock_batches (admin_id, type)
        VALUES (1, 'Manual')
        RETURNING id
      `);
            const batchId = batchResult[0].id;

            const numItems = randomInt(5, 15);
            for (let j = 0; j < numItems; j++) {
                await AppDataSource.query(`
          INSERT INTO restock_items (batch_id, variant_id, quantity)
          VALUES ($1, $2, $3)
        `, [batchId, (randomElement(variants) as any).id, randomInt(20, 100)]);
            }
        }
        console.log('   ✓ Created 5 restock batches\n');

        console.log('='.repeat(50));
        console.log('\n🎉 Seed data completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${excelFiles.length} Categories`);
        console.log(`   - ${totalProducts} Products`);
        console.log(`   - ${totalVariants} Variants`);
        console.log(`   - ${totalImages} Images`);
        console.log(`   - ${customers.length} Customers`);
        console.log('   - 30 Orders');
        console.log('   - 50 Reviews');
        console.log('   - 15 Support Tickets');
        console.log('   - 3 Promotions');
        console.log('   - And more...\n');

        await AppDataSource.destroy();
    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(1);
    }
}

seedData();
