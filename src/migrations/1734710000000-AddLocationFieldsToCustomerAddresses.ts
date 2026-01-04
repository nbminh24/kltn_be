import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationFieldsToCustomerAddresses1734710000000 implements MigrationInterface {
    name = 'AddLocationFieldsToCustomerAddresses1734710000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add province, district, ward fields
        await queryRunner.query(`
            ALTER TABLE "customer_addresses" 
            ADD COLUMN "province" VARCHAR(100),
            ADD COLUMN "district" VARCHAR(100),
            ADD COLUMN "ward" VARCHAR(100),
            ADD COLUMN "latitude" DECIMAL(10, 8),
            ADD COLUMN "longitude" DECIMAL(11, 8),
            ADD COLUMN "address_source" VARCHAR(20) DEFAULT 'manual'
        `);

        // Rename detailed_address to street_address for clarity
        await queryRunner.query(`
            ALTER TABLE "customer_addresses" 
            RENAME COLUMN "detailed_address" TO "street_address"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert column rename
        await queryRunner.query(`
            ALTER TABLE "customer_addresses" 
            RENAME COLUMN "street_address" TO "detailed_address"
        `);

        // Drop new columns
        await queryRunner.query(`
            ALTER TABLE "customer_addresses" 
            DROP COLUMN "address_source",
            DROP COLUMN "longitude",
            DROP COLUMN "latitude",
            DROP COLUMN "ward",
            DROP COLUMN "district",
            DROP COLUMN "province"
        `);
    }
}
