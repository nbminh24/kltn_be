import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntentToChatMessages1736524800000 implements MigrationInterface {
    name = 'AddIntentToChatMessages1736524800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            ADD COLUMN IF NOT EXISTS "intent" VARCHAR(255) NULL
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_chat_messages_intent" 
            ON "chat_messages"("intent")
        `);

        console.log('✅ Added intent tracking field to chat_messages table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_messages_intent"`);

        await queryRunner.query(`
            ALTER TABLE "chat_messages" 
            DROP COLUMN IF EXISTS "intent"
        `);

        console.log('✅ Removed intent tracking field from chat_messages table');
    }
}
