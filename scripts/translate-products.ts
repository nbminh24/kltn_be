import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Script to translate Vietnamese product data to English
 * Usage: ts-node scripts/translate-products.ts
 */

// Manual translation mapping for common terms
const TRANSLATION_MAP = {
    // Product types
    'Áo Khoác': 'Jacket',
    'Áo Thun': 'T-Shirt',
    'Áo Sơ Mi': 'Shirt',
    'Áo Polo': 'Polo Shirt',
    'Áo Tank Top': 'Tank Top',
    'Quần Jean': 'Jeans',
    'Quần Short': 'Shorts',
    'Quần Dài': 'Pants',
    'Giày': 'Shoes',

    // Attributes
    'Nam': 'Men',
    'Nữ': 'Women',
    'Form Regular': 'Regular Fit',
    'Form Slim': 'Slim Fit',
    'Form Loose': 'Loose Fit',
    'Form Oversize': 'Oversize',
    'Màu Đen': 'Black',
    'Màu Trắng': 'White',
    'Màu Xanh': 'Blue',
    'Màu Đỏ': 'Red',

    // Materials
    'Cotton': 'Cotton',
    'Denim': 'Denim',
    'Kaki': 'Khaki',
    'Polyester': 'Polyester',

    // Styles
    'Basic': 'Basic',
    'Minimalist': 'Minimalist',
    'Streetwear': 'Streetwear',
    'Casual': 'Casual',
    'Formal': 'Formal',
};

// Slug translation map
const SLUG_MAP = {
    'ao-khoac': 'jacket',
    'ao-thun': 't-shirt',
    'ao-so-mi': 'shirt',
    'ao-polo': 'polo-shirt',
    'quan-jean': 'jeans',
    'quan-short': 'shorts',
    'quan-dai': 'pants',
    'giay': 'shoes',
    'nam': 'men',
    'nu': 'women',
    'form-regular': 'regular-fit',
    'form-slim': 'slim-fit',
    'form-loose': 'loose-fit',
    'den': 'black',
    'trang': 'white',
    'xanh': 'blue',
    'do': 'red',
};

function translateText(text: string): string {
    if (!text) return text;

    let translated = text;

    // Apply manual translations
    for (const [vi, en] of Object.entries(TRANSLATION_MAP)) {
        translated = translated.replace(new RegExp(vi, 'gi'), en);
    }

    return translated;
}

function translateSlug(slug: string): string {
    if (!slug) return slug;

    let translated = slug;

    // Apply slug translations
    for (const [vi, en] of Object.entries(SLUG_MAP)) {
        translated = translated.replace(new RegExp(vi, 'g'), en);
    }

    return translated;
}

async function translateProducts() {
    console.log('🚀 Starting product translation...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        // Get all products
        const products = await dataSource.query(
            'SELECT id, name, slug, description FROM products'
        );

        console.log(`📦 Found ${products.length} products to translate\n`);

        let updated = 0;
        let skipped = 0;

        for (const product of products) {
            const translatedName = translateText(product.name);
            const translatedSlug = translateSlug(product.slug);
            const translatedDescription = product.description
                ? translateText(product.description)
                : null;

            // Check if anything changed
            if (
                translatedName === product.name &&
                translatedSlug === product.slug &&
                translatedDescription === product.description
            ) {
                skipped++;
                console.log(`⏭️  Skipped: ${product.name} (no changes)`);
                continue;
            }

            // Update product
            await dataSource.query(
                `UPDATE products 
         SET name = $1, slug = $2, description = $3
         WHERE id = $4`,
                [translatedName, translatedSlug, translatedDescription, product.id]
            );

            updated++;
            console.log(`✅ Updated: ${product.name} → ${translatedName}`);
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Updated: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Total: ${products.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await app.close();
    }
}

async function translateCategories() {
    console.log('\n📂 Starting category translation...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        const categories = await dataSource.query(
            'SELECT id, name, slug FROM categories'
        );

        console.log(`📂 Found ${categories.length} categories to translate\n`);

        for (const category of categories) {
            const translatedName = translateText(category.name);
            const translatedSlug = translateSlug(category.slug);

            if (translatedName !== category.name || translatedSlug !== category.slug) {
                await dataSource.query(
                    `UPDATE categories SET name = $1, slug = $2 WHERE id = $3`,
                    [translatedName, translatedSlug, category.id]
                );
                console.log(`✅ Updated: ${category.name} → ${translatedName}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await app.close();
    }
}

// Main execution
async function main() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  🌐 Product Translation Script            ║');
    console.log('║  Vietnamese → English                     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Translate categories first
    await translateCategories();

    // Then translate products
    await translateProducts();

    console.log('\n✅ Translation complete!\n');
}

main().catch(console.error);
