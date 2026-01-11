import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGinIndexForProductAttributes1736576400000 implements MigrationInterface {
    name = 'AddGinIndexForProductAttributes1736576400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add GIN index for JSONB attributes column to optimize search
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_attributes_gin" 
      ON "products" USING GIN("attributes")
    `);

        console.log('✅ Added GIN index on products.attributes for faster JSONB search');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_attributes_gin"`);

        console.log('✅ Removed GIN index from products.attributes');
    }
}
