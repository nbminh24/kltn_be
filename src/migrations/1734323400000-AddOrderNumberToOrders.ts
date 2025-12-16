import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderNumberToOrders1734323400000 implements MigrationInterface {
    name = 'AddOrderNumberToOrders1734323400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN "order_number" varchar NULL
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_order_number" 
            ON "orders" ("order_number") 
            WHERE "order_number" IS NOT NULL
        `);

        await queryRunner.query(`
            UPDATE "orders" 
            SET "order_number" = LPAD(id::text, 10, '0')
            WHERE "order_number" IS NULL
        `);

        console.log('✅ Added order_number column to orders table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_order_number"
        `);

        await queryRunner.query(`
            ALTER TABLE "orders" 
            DROP COLUMN "order_number"
        `);

        console.log('✅ Removed order_number column from orders table');
    }
}
