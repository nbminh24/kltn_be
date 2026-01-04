import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
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

type TnoExcelRow = {
    STT?: number;
    Category?: string;
    'Tên sản phẩm'?: string;
    Giá?: string;
    'Màu sắc'?: string;
    'Danh sách link ảnh'?: string;
    'Mô tả sản phẩm'?: string;
};

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

function normalizeTitle(text: string): string {
    return (text || '').replace(/\s+/g, ' ').trim();
}

function normalizeLongText(text: string): string {
    const s = (text || '').replace(/\r\n/g, '\n');
    return s
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function splitCommaList(input: string): string[] {
    return (input || '')
        .split(',')
        .map(s => normalizeTitle(s))
        .filter(Boolean);
}

function parseVndPrices(rawPriceText: string): number[] {
    const text = rawPriceText || '';
    const matches = text.match(/\d{1,3}(?:\.\d{3})+|\d+/g) || [];
    const numbers = matches
        .map(m => parseInt(m.replace(/\./g, ''), 10))
        .filter(n => Number.isFinite(n) && n > 0);
    const unique = Array.from(new Set(numbers));
    unique.sort((a, b) => a - b);
    return unique;
}

function stableHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function vndToUsd(vnd: number, exchangeRate: number): number {
    const usd = vnd / exchangeRate;
    return Math.round(usd * 100) / 100;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAdminIdByEmail(email: string): Promise<number | null> {
    const rows: { id: number }[] = await AppDataSource.query('SELECT id FROM admins WHERE email = $1 LIMIT 1', [email]);
    return rows?.[0]?.id ?? null;
}

async function getCustomerIdsByEmail(emails: string[]): Promise<Map<string, number>> {
    if (emails.length === 0) return new Map();
    const rows: { id: number; email: string }[] = await AppDataSource.query(
        'SELECT id, email FROM customers WHERE email = ANY($1)',
        [emails]
    );
    return new Map(rows.map(r => [r.email, r.id] as const));
}

const vnColorToEnglish: Record<string, string> = {
    'đen': 'Black',
    'trắng': 'White',
    'kem': 'Cream',
    'be': 'Beige',
    'xám': 'Gray',
    'nâu': 'Brown',
    'đỏ': 'Red',
    'vàng': 'Yellow',
    'xanh': 'Blue',
    'xanh navy': 'Navy',
    'navy': 'Navy',
    'xanh dương': 'Blue',
    'xanh lá': 'Green',
    'xanh la': 'Green',
    'hồng': 'Pink',
    'tím': 'Purple',
    'cam': 'Orange',
};

function mapColorToEnglish(color: string): string {
    const cleaned = normalizeTitle(color);
    if (!cleaned) return '';
    const key = cleaned.toLowerCase();
    return vnColorToEnglish[key] || cleaned;
}

async function ensureAdminAndCustomers() {
    console.log('📌 Seeding Admin + Customers (fixed emails)...');

    const adminPassword = await bcrypt.hash('Admin123456', 10);
    await AppDataSource.query(
        `
      INSERT INTO admins (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `,
        ['Lecas Office', 'lecas.office@gmail.com', adminPassword, 'admin']
    );

    const customerPassword = await bcrypt.hash('Customer123', 10);

    await AppDataSource.query(
        `
      INSERT INTO customers (name, email, password_hash, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (email) DO NOTHING
    `,
        ['Nbminh24', 'nbminh24@gmail.com', customerPassword]
    );

    for (let i = 1; i <= 19; i++) {
        await AppDataSource.query(
            `
        INSERT INTO customers (name, email, password_hash, status)
        VALUES ($1, $2, $3, 'active')
        ON CONFLICT (email) DO NOTHING
      `,
            [`Customer ${i}`, `customer${i}@gmail.com`, customerPassword]
        );
    }

    console.log('   ✓ Admin + customers ensured\n');
}

async function seedCustomerAddresses(customerIds: number[]) {
    console.log('📌 Seeding Customer Addresses...');
    const addressTypes = ['Home', 'Office', 'Other'];

    for (const customerId of customerIds) {
        const count = randomInt(1, 2);
        for (let i = 0; i < count; i++) {
            await AppDataSource.query(
                `
          INSERT INTO customer_addresses (customer_id, is_default, address_type, detailed_address, phone_number)
          VALUES ($1, $2, $3, $4, $5)
        `,
                [
                    customerId,
                    i === 0,
                    randomElement(addressTypes),
                    `${randomInt(1, 999)} ${randomElement(['Main St', '2nd Ave', 'Oak Street', 'Maple Road'])}`,
                    `09${randomInt(10000000, 99999999)}`,
                ]
            );
        }
    }

    console.log('   ✓ Customer addresses created\n');
}

async function readTnoExcelRows(): Promise<TnoExcelRow[]> {
    const filePath = path.join(__dirname, '..', 'tno_data.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as TnoExcelRow[];
    return rows;
}

async function seedSizes() {
    console.log('📌 Seeding Sizes (S -> 3XL)...');

    const targetSizes = [
        { name: 'S', sort_order: 1 },
        { name: 'M', sort_order: 2 },
        { name: 'L', sort_order: 3 },
        { name: 'XL', sort_order: 4 },
        { name: 'XXL', sort_order: 5 },
        { name: '3XL', sort_order: 6 },
    ];

    const existing: { id: number; name: string }[] = await AppDataSource.query('SELECT id, name FROM sizes');
    const existingSet = new Set(existing.map(s => s.name.toLowerCase()));

    for (const s of targetSizes) {
        if (existingSet.has(s.name.toLowerCase())) continue;
        await AppDataSource.query('INSERT INTO sizes (name, sort_order) VALUES ($1, $2)', [s.name, s.sort_order]);
    }

    const sizes: { id: number; name: string }[] = await AppDataSource.query('SELECT id, name FROM sizes ORDER BY sort_order');
    console.log(`   ✓ Sizes ready: ${sizes.map(s => s.name).join(', ')}\n`);
    return sizes;
}

async function seedCategoriesFromExcel(rows: TnoExcelRow[]) {
    console.log('📌 Seeding Categories from Excel (unique)...');
    const excelCategorySlugs = Array.from(
        new Set(
            rows
                .map(r => normalizeTitle(r.Category || ''))
                .filter(Boolean)
        )
    );

    const excelSlugToCategoryId = new Map<string, number>();
    const excelSlugToCategoryName = new Map<string, string>();

    for (const excelSlug of excelCategorySlugs) {
        const categoryName = normalizeTitle(excelSlug);
        const baseSlug = slugify(categoryName) || slugify(excelSlug);
        const englishSlug = baseSlug || `category-${stableHash(excelSlug) % 1000}`;

        const upserted = await AppDataSource.query(
            `
        INSERT INTO categories (name, slug, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status
        RETURNING id
      `,
            [categoryName, englishSlug]
        );

        const categoryId = upserted?.[0]?.id as number | undefined;
        if (categoryId) {
            excelSlugToCategoryId.set(excelSlug, categoryId);
            excelSlugToCategoryName.set(excelSlug, categoryName);
        }
    }

    console.log(`   ✓ Categories ready: ${excelSlugToCategoryId.size}\n`);
    return { excelSlugToCategoryId, excelSlugToCategoryName };
}

async function seedColorsFromExcel(rows: TnoExcelRow[]) {
    console.log('📌 Seeding Colors from Excel (unique)...');
    const rawColors = new Set<string>();
    for (const r of rows) {
        for (const c of splitCommaList(r['Màu sắc'] || '')) rawColors.add(c);
    }

    const existing: { id: number; name: string }[] = await AppDataSource.query('SELECT id, name FROM colors');
    const byName = new Map(existing.map(c => [c.name.toLowerCase(), c.id] as const));

    for (const raw of Array.from(rawColors)) {
        const englishName = mapColorToEnglish(raw);
        const key = englishName.toLowerCase();
        if (byName.has(key)) continue;
        const inserted = await AppDataSource.query(
            'INSERT INTO colors (name, hex_code) VALUES ($1, NULL) RETURNING id',
            [englishName]
        );
        const id = inserted?.[0]?.id;
        if (id) byName.set(key, id);
    }

    const colors: { id: number; name: string }[] = await AppDataSource.query('SELECT id, name FROM colors');
    console.log(`   ✓ Colors ready: ${colors.length}\n`);
    return new Map(colors.map(c => [c.name.toLowerCase(), c.id] as const));
}

async function seedProductsVariantsImages(
    rows: TnoExcelRow[],
    categoryInfo: { excelSlugToCategoryId: Map<string, number>; excelSlugToCategoryName: Map<string, string> },
    sizeList: { id: number; name: string }[],
    colorIdByLowerName: Map<string, number>,
    exchangeRateVndToUsd: number
) {
    console.log('📌 Seeding Products, Variants, Images...');

    let totalProducts = 0;
    let totalVariants = 0;
    let totalImages = 0;

    for (const row of rows) {
        const categorySlug = normalizeTitle(row.Category || '');
        const categoryId = categoryInfo.excelSlugToCategoryId.get(categorySlug);
        const categoryName = categoryInfo.excelSlugToCategoryName.get(categorySlug) || categorySlug;
        if (!categoryId) continue;

        const rawProductName = normalizeTitle((row['Tên sản phẩm'] || '').toString());
        if (!rawProductName) continue;

        const productName = `${categoryName}: ${rawProductName}`;

        const descRaw = (row['Mô tả sản phẩm'] || '').toString();
        const desc = normalizeLongText(descRaw);
        const fullDesc = desc;

        const slugBase = slugify(productName);
        const productSlug = `${slugBase}-${randomInt(1000, 9999)}`;

        const imageUrls = splitCommaList((row['Danh sách link ảnh'] || '').toString());
        const thumbnailUrl = imageUrls[0] || null;

        const pricesVnd = parseVndPrices((row.Giá || '').toString());
        const minVnd = pricesVnd[0] || 0;
        const maxVnd = pricesVnd.length >= 2 ? pricesVnd[pricesVnd.length - 1] : minVnd;

        const costUsd = vndToUsd(minVnd, exchangeRateVndToUsd);
        const sellingUsd = vndToUsd(maxVnd, exchangeRateVndToUsd);

        const productResult = await AppDataSource.query(
            `
        INSERT INTO products (
          category_id, name, slug, description, full_description,
          cost_price, selling_price, status, thumbnail_url, attributes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
        RETURNING id
      `,
            [
                categoryId,
                productName,
                productSlug,
                (desc || '').substring(0, 500),
                fullDesc,
                costUsd,
                sellingUsd || costUsd,
                thumbnailUrl,
                JSON.stringify({ source: 'tno_data.xlsx' }),
            ]
        );

        const productId = productResult?.[0]?.id as number | undefined;
        if (!productId) continue;
        totalProducts++;

        const vnColors = splitCommaList((row['Màu sắc'] || '').toString());
        const selectedColors = Array.from(
            new Set(vnColors.map(c => mapColorToEnglish(c)).map(c => normalizeTitle(c)))
        ).filter(Boolean);
        if (selectedColors.length === 0) continue;

        const variantsForThisProduct: number[] = [];
        for (const colorName of selectedColors) {
            const colorId = colorIdByLowerName.get(colorName.toLowerCase());
            if (!colorId) continue;

            for (const size of sizeList) {
                const skuBase = `TNO-${productId}-${slugify(colorName)}-${size.name}`.toUpperCase();
                const sku = `${skuBase}-${randomInt(100, 999)}`;
                const variantName = `${productName} - ${colorName} - ${size.name}`;

                const variantResult = await AppDataSource.query(
                    `
              INSERT INTO product_variants (product_id, size_id, color_id, name, sku, total_stock, reserved_stock, status)
              VALUES ($1, $2, $3, $4, $5, $6, 0, 'active')
              ON CONFLICT (sku) DO NOTHING
              RETURNING id
            `,
                    [productId, size.id, colorId, variantName, sku, randomInt(10, 80)]
                );

                const variantId = variantResult?.[0]?.id as number | undefined;
                if (!variantId) continue;
                variantsForThisProduct.push(variantId);
                totalVariants++;
            }
        }

        if (variantsForThisProduct.length === 0) continue;

        if (imageUrls.length > 0) {
            const imagesPerVariant = Math.max(1, Math.ceil(imageUrls.length / variantsForThisProduct.length));
            let idx = 0;

            for (const variantId of variantsForThisProduct) {
                const start = idx;
                const end = Math.min(start + imagesPerVariant, imageUrls.length);
                let assigned = imageUrls.slice(start, end);
                if (assigned.length === 0) assigned = [imageUrls[0]];

                for (let i = 0; i < assigned.length; i++) {
                    await AppDataSource.query(
                        `
                INSERT INTO product_images (variant_id, image_url, is_main)
                VALUES ($1, $2, $3)
              `,
                        [variantId, assigned[i], i === 0]
                    );
                    totalImages++;
                }

                idx += imagesPerVariant;
            }
        }
    }

    console.log(`   ✓ Created ${totalProducts} products`);
    console.log(`   ✓ Created ${totalVariants} variants`);
    console.log(`   ✓ Created ${totalImages} images\n`);
}

async function seedOrdersAndPayments(
    customerIds: number[],
    customerEmailById: Map<number, string>,
    adminId: number | null
) {
    console.log('📌 Seeding Orders, Order Items, Status History, Payments...');

    const variants: { id: number; product_id: number }[] = await AppDataSource.query(
        'SELECT id, product_id FROM product_variants'
    );
    const products: { id: number; selling_price: number }[] = await AppDataSource.query(
        'SELECT id, selling_price FROM products'
    );

    if (variants.length === 0 || products.length === 0) {
        console.log('   ⚠️  No variants/products found. Skipping orders.\n');
        return;
    }

    const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    const paymentMethods = ['cod', 'vnpay', 'momo'];

    const orderCount = 30;
    const createdOrderIds: number[] = [];

    for (let i = 0; i < orderCount; i++) {
        const customerId = randomElement(customerIds);
        const email = customerEmailById.get(customerId) || `customer${customerId}@gmail.com`;
        const fulfillmentStatus = randomElement(statuses);
        const paymentMethod = randomElement(paymentMethods);
        const paymentStatus = fulfillmentStatus === 'delivered' ? 'paid' : randomElement(['unpaid', 'paid']);

        const shippingFee = randomInt(1, 3) * 5;
        const numItems = randomInt(1, 4);

        let totalAmount = shippingFee;
        const items: { variantId: number; quantity: number; price: number }[] = [];

        for (let j = 0; j < numItems; j++) {
            const variant = randomElement(variants);
            const product = products.find(p => p.id === variant.product_id);
            const quantity = randomInt(1, 3);
            const price = product?.selling_price || randomInt(10, 40);
            items.push({ variantId: variant.id, quantity, price });
            totalAmount += price * quantity;
        }

        const orderResult = await AppDataSource.query(
            `
        INSERT INTO orders (
          customer_id, customer_email, shipping_address, shipping_phone,
          shipping_city, shipping_district, shipping_ward,
          fulfillment_status, payment_status, payment_method,
          shipping_fee, total_amount, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL '${randomInt(0, 60)} days')
        RETURNING id
      `,
            [
                customerId,
                email,
                `${randomInt(1, 999)} ${randomElement(['Main St', '2nd Ave', 'Oak Street'])}`,
                `09${randomInt(10000000, 99999999)}`,
                randomElement(['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong', 'Can Tho']),
                randomElement(['District 1', 'District 2', 'District 3', 'Ba Dinh', 'Hoan Kiem']),
                randomElement(['Ward 1', 'Ward 2', 'Ward 3']),
                fulfillmentStatus,
                paymentStatus,
                paymentMethod,
                shippingFee,
                totalAmount,
            ]
        );

        const orderId = orderResult?.[0]?.id as number | undefined;
        if (!orderId) continue;
        createdOrderIds.push(orderId);

        for (const item of items) {
            await AppDataSource.query(
                `
          INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase)
          VALUES ($1, $2, $3, $4)
        `,
                [orderId, item.variantId, item.quantity, item.price]
            );
        }

        await AppDataSource.query(
            `
        INSERT INTO order_status_history (order_id, status, admin_id, note)
        VALUES ($1, $2, $3, $4)
      `,
            [orderId, fulfillmentStatus, adminId, 'Seeded data']
        );

        if (paymentMethod !== 'cod') {
            await AppDataSource.query(
                `
          INSERT INTO payments (order_id, transaction_id, amount, provider, payment_method, status)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
                [
                    orderId,
                    `PAY_${Date.now()}_${randomInt(1000, 9999)}`,
                    totalAmount,
                    paymentMethod === 'vnpay' ? 'VNPAY' : 'MOMO',
                    paymentMethod,
                    paymentStatus === 'paid' ? 'success' : 'pending',
                ]
            );
        }
    }

    console.log(`   ✓ Created ${createdOrderIds.length} orders\n`);
}

async function seedCartsAndWishlist(customerIds: number[]) {
    console.log('📌 Seeding Carts, Cart Items, Wishlist...');
    const variants: { id: number }[] = await AppDataSource.query('SELECT id FROM product_variants');
    if (variants.length === 0) {
        console.log('   ⚠️  No variants found. Skipping carts/wishlist.\n');
        return;
    }

    const cartCustomers = customerIds.slice(0, Math.min(10, customerIds.length));
    for (const customerId of cartCustomers) {
        const cartResult = await AppDataSource.query(
            'INSERT INTO carts (customer_id) VALUES ($1) RETURNING id',
            [customerId]
        );
        const cartId = cartResult?.[0]?.id;
        if (!cartId) continue;

        const numItems = randomInt(1, 5);
        for (let i = 0; i < numItems; i++) {
            await AppDataSource.query(
                `
          INSERT INTO cart_items (cart_id, variant_id, quantity)
          VALUES ($1, $2, $3)
        `,
                [cartId, randomElement(variants).id, randomInt(1, 3)]
            );
        }
    }

    const wishCustomers = customerIds.slice(0, Math.min(15, customerIds.length));
    for (const customerId of wishCustomers) {
        const numWish = randomInt(2, 8);
        for (let i = 0; i < numWish; i++) {
            await AppDataSource.query(
                `
          INSERT INTO wishlist_items (customer_id, variant_id)
          VALUES ($1, $2)
        `,
                [customerId, randomElement(variants).id]
            );
        }
    }

    console.log('   ✓ Carts & wishlist seeded\n');
}

async function seedChat(customerIds: number[]) {
    console.log('📌 Seeding Chat Sessions & Messages...');
    const customers = customerIds.slice(0, Math.min(20, customerIds.length));
    for (const customerId of customers) {
        const sessionResult = await AppDataSource.query(
            `
        INSERT INTO chat_sessions (customer_id, status)
        VALUES ($1, 'active')
        RETURNING id
      `,
            [customerId]
        );
        const sessionId = sessionResult?.[0]?.id;
        if (!sessionId) continue;

        const numMessages = randomInt(3, 10);
        for (let i = 0; i < numMessages; i++) {
            const sender = i % 2 === 0 ? 'customer' : 'bot';
            const message = sender === 'customer'
                ? randomElement(['Hello', 'Do you have this item?', 'What sizes are available?', 'How much is shipping?'])
                : randomElement(['Hi! We have it in stock.', 'Available sizes: S to 3XL.', 'Shipping takes 1-5 days.', 'Anything else I can help with?']);

            await AppDataSource.query(
                `
          INSERT INTO chat_messages (session_id, sender, message, is_read)
          VALUES ($1, $2, $3, $4)
        `,
                [sessionId, sender, message, randomInt(0, 1) === 1]
            );
        }
    }

    console.log('   ✓ Chat seeded\n');
}

async function seedSupportTickets(customerIds: number[], customerEmailById: Map<number, string>, adminId: number | null) {
    console.log('📌 Seeding Support Tickets & Replies...');
    const subjects = ['Product inquiry', 'Return request', 'Order issue', 'Shipping question', 'Account support'];
    const statuses = ['pending', 'in_progress', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high'];

    const ticketCount = 15;
    for (let i = 0; i < ticketCount; i++) {
        const customerId = randomElement(customerIds);
        const email = customerEmailById.get(customerId) || `customer${customerId}@gmail.com`;

        const ticketResult = await AppDataSource.query(
            `
        INSERT INTO support_tickets (ticket_code, customer_id, customer_email, subject, status, priority, message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
            [
                `TICKET-${Date.now()}-${randomInt(1000, 9999)}`,
                customerId,
                email,
                randomElement(subjects),
                randomElement(statuses),
                randomElement(priorities),
                'Please help me with this issue.',
            ]
        );
        const ticketId = ticketResult?.[0]?.id;
        if (!ticketId) continue;

        const replyCount = randomInt(1, 3);
        for (let r = 0; r < replyCount; r++) {
            await AppDataSource.query(
                `
          INSERT INTO support_ticket_replies (ticket_id, admin_id, body)
          VALUES ($1, $2, $3)
        `,
                [ticketId, adminId, 'Thanks for contacting us. We will handle it shortly.']
            );
        }
    }

    console.log('   ✓ Support tickets seeded\n');
}

async function seedPromotions() {
    console.log('📌 Seeding Promotions & Promotion Products...');
    const promoRows: { id: number }[] = await AppDataSource.query(
        `
      INSERT INTO promotions (name, type, discount_value, discount_type, number_limited, start_date, end_date, status)
      VALUES
      ('Weekend Flash Sale', 'flash_sale', 20, 'percentage', 100, NOW(), NOW() + INTERVAL '7 days', 'active'),
      ('Summer Discount', 'seasonal', 5, 'fixed', NULL, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'active'),
      ('Black Friday', 'event', 30, 'percentage', 200, NOW() + INTERVAL '30 days', NOW() + INTERVAL '37 days', 'scheduled')
      RETURNING id
    `
    );

    const products: { id: number; selling_price: number }[] = await AppDataSource.query('SELECT id, selling_price FROM products');
    if (products.length === 0) {
        console.log('   ⚠️  No products found. Skipping promotion_products.\n');
        return;
    }

    for (const promo of promoRows) {
        const numProducts = randomInt(5, 15);
        for (let i = 0; i < numProducts; i++) {
            const product = randomElement(products);
            await AppDataSource.query(
                `
          INSERT INTO promotion_products (promotion_id, product_id, flash_sale_price)
          VALUES ($1, $2, $3)
        `,
                [promo.id, product.id, Math.round((product.selling_price * 0.8) * 100) / 100]
            );
        }
    }

    console.log('   ✓ Promotions seeded\n');
}

async function seedRestock(adminId: number) {
    console.log('📌 Seeding Restock Batches & Items...');
    const variants: { id: number }[] = await AppDataSource.query('SELECT id FROM product_variants');
    if (variants.length === 0) {
        console.log('   ⚠️  No variants found. Skipping restock.\n');
        return;
    }

    for (let i = 0; i < 5; i++) {
        const batchResult = await AppDataSource.query(
            `
        INSERT INTO restock_batches (admin_id, type)
        VALUES ($1, 'Manual')
        RETURNING id
      `,
            [adminId]
        );
        const batchId = batchResult?.[0]?.id;
        if (!batchId) continue;

        const numItems = randomInt(5, 15);
        for (let j = 0; j < numItems; j++) {
            await AppDataSource.query(
                `
          INSERT INTO restock_items (batch_id, variant_id, quantity)
          VALUES ($1, $2, $3)
        `,
                [batchId, randomElement(variants).id, randomInt(20, 100)]
            );
        }
    }

    console.log('   ✓ Restock seeded\n');
}

async function seedPages() {
    console.log('📌 Seeding Pages...');
    const pages = [
        { title: 'About Us', slug: 'about-us', content: 'About our brand', status: 'Published' },
        { title: 'Shipping Policy', slug: 'shipping-policy', content: 'Shipping information', status: 'Published' },
        { title: 'Return Policy', slug: 'return-policy', content: 'Return and exchange policy', status: 'Published' },
        { title: 'Contact', slug: 'contact', content: 'Contact information', status: 'Published' },
    ];

    for (const p of pages) {
        await AppDataSource.query(
            `
        INSERT INTO pages (title, slug, content, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `,
            [p.title, p.slug, p.content, p.status]
        );
    }

    console.log('   ✓ Pages seeded\n');
}

async function seedReviews(customerIds: number[]) {
    console.log('📌 Seeding Product Reviews...');
    const deliveredRows: { order_id: number; customer_id: number; variant_id: number }[] = await AppDataSource.query(
        `
      SELECT o.id as order_id, o.customer_id, oi.variant_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.fulfillment_status = 'delivered'
      LIMIT 50
    `
    );

    if (deliveredRows.length === 0) {
        console.log('   ⚠️  No delivered orders. Skipping reviews.\n');
        return;
    }

    const comments = [
        'Great quality, highly recommended.',
        'Fast shipping and nice packaging.',
        'Fits well and feels comfortable.',
        'Good value for the price.',
        'I will buy again.',
    ];

    for (const r of deliveredRows) {
        await AppDataSource.query(
            `
        INSERT INTO product_reviews (variant_id, customer_id, order_id, rating, comment, status)
        VALUES ($1, $2, $3, $4, $5, 'approved')
      `,
            [r.variant_id, r.customer_id, r.order_id, randomInt(4, 5), randomElement(comments)]
        );
    }

    console.log('   ✓ Reviews seeded\n');
}

async function seedNotifications(customerIds: number[]) {
    console.log('📌 Seeding Product Notifications...');
    const products: { id: number }[] = await AppDataSource.query('SELECT id FROM products');
    if (products.length === 0) {
        console.log('   ⚠️  No products found. Skipping notifications.\n');
        return;
    }

    const sizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const count = 20;
    for (let i = 0; i < count; i++) {
        const userId = randomElement(customerIds);
        const productId = randomElement(products).id;
        await AppDataSource.query(
            `
        INSERT INTO product_notifications (id, user_id, product_id, size, price_condition, status)
        VALUES ($1, $2, $3, $4, $5, 'active')
      `,
            [`PN-${Date.now()}-${randomInt(1000, 9999)}`, userId, productId, randomElement(sizes), randomInt(5, 20)]
        );
    }

    console.log('   ✓ Notifications seeded\n');
}

async function seedData() {
    try {
        console.log('\n🌱 Starting seed data...\n');
        console.log('='.repeat(50));

        await AppDataSource.initialize();
        console.log('✅ Database connected\n');

        await ensureAdminAndCustomers();

        const adminId = await getAdminIdByEmail('lecas.office@gmail.com');
        if (!adminId) {
            throw new Error('Admin not found after seeding');
        }

        const customerEmails = ['nbminh24@gmail.com', ...Array.from({ length: 19 }).map((_, i) => `customer${i + 1}@gmail.com`)];
        const customerIdByEmail = await getCustomerIdsByEmail(customerEmails);
        const customerIds = Array.from(customerIdByEmail.values());
        const customerEmailById = new Map<number, string>(Array.from(customerIdByEmail.entries()).map(([email, id]) => [id, email] as const));

        const exchangeRate = 25_000;
        const rows = await readTnoExcelRows();
        console.log(`📄 Loaded tno_data.xlsx rows: ${rows.length}\n`);

        const sizes = await seedSizes();
        const categoryInfo = await seedCategoriesFromExcel(rows);
        const colorIdByLowerName = await seedColorsFromExcel(rows);

        await seedProductsVariantsImages(rows, categoryInfo, sizes, colorIdByLowerName, exchangeRate);

        await seedCustomerAddresses(customerIds);
        await seedOrdersAndPayments(customerIds.filter(id => customerEmailById.get(id)?.startsWith('customer')), customerEmailById, adminId);
        await seedCartsAndWishlist(customerIds);
        await seedChat(customerIds);
        await seedSupportTickets(customerIds, customerEmailById, adminId);
        await seedPromotions();
        await seedRestock(adminId);
        await seedPages();
        await seedReviews(customerIds);
        await seedNotifications(customerIds);

        console.log('='.repeat(50));
        console.log('\n🎉 Seed data completed successfully!\n');

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
