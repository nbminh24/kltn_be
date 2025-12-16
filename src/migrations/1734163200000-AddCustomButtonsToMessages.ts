import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomButtonsToMessages1734163200000 implements MigrationInterface {
    name = 'AddCustomButtonsToMessages1734163200000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            ADD COLUMN "custom" jsonb NULL,
            ADD COLUMN "buttons" jsonb NULL
        `);

        console.log('✅ Added custom and buttons columns to chat_messages');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            DROP COLUMN "custom",
            DROP COLUMN "buttons"
        `);

        console.log('✅ Removed custom and buttons columns from chat_messages');
    }
}
