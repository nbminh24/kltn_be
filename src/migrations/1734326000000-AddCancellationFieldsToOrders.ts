import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancellationFieldsToOrders1734326000000 implements MigrationInterface {
    name = 'AddCancellationFieldsToOrders1734326000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN IF NOT EXISTS "cancel_reason" VARCHAR(50) NULL,
            ADD COLUMN IF NOT EXISTS "cancelled_by_customer_id" BIGINT NULL,
            ADD COLUMN IF NOT EXISTS "refund_status" VARCHAR(20) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS "refund_amount" NUMERIC NULL
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_orders_cancel_reason" ON "orders"("cancel_reason")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_orders_cancelled_at" ON "orders"("cancelled_at")
        `);

        console.log('✅ Added cancellation tracking fields to orders table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_cancelled_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_cancel_reason"`);

        await queryRunner.query(`
            ALTER TABLE "orders" 
            DROP COLUMN IF EXISTS "cancelled_at",
            DROP COLUMN IF EXISTS "cancel_reason",
            DROP COLUMN IF EXISTS "cancelled_by_customer_id",
            DROP COLUMN IF EXISTS "refund_status",
            DROP COLUMN IF EXISTS "refund_amount"
        `);

        console.log('✅ Removed cancellation tracking fields from orders table');
    }
}
