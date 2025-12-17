import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryFieldsToOrders1734325000000 implements MigrationInterface {
    name = 'AddDeliveryFieldsToOrders1734325000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN "shipping_method" varchar DEFAULT 'standard',
            ADD COLUMN "tracking_number" varchar NULL,
            ADD COLUMN "carrier_name" varchar NULL,
            ADD COLUMN "estimated_delivery_from" date NULL,
            ADD COLUMN "estimated_delivery_to" date NULL,
            ADD COLUMN "actual_delivery_date" date NULL
        `);

        console.log('✅ Added delivery-related fields to orders table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "orders" 
            DROP COLUMN "shipping_method",
            DROP COLUMN "tracking_number",
            DROP COLUMN "carrier_name",
            DROP COLUMN "estimated_delivery_from",
            DROP COLUMN "estimated_delivery_to",
            DROP COLUMN "actual_delivery_date"
        `);

        console.log('✅ Removed delivery-related fields from orders table');
    }
}
