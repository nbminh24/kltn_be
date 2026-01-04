import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHandoffFieldsToChatSessions1734440000000 implements MigrationInterface {
  name = 'AddHandoffFieldsToChatSessions1734440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add handoff tracking fields
    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            ADD COLUMN IF NOT EXISTS "assigned_admin_id" BIGINT NULL,
            ADD COLUMN IF NOT EXISTS "handoff_requested_at" TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN IF NOT EXISTS "handoff_accepted_at" TIMESTAMP WITH TIME ZONE NULL,
            ADD COLUMN IF NOT EXISTS "handoff_reason" VARCHAR(255) NULL
        `);

    // Update existing sessions to 'bot' status
    await queryRunner.query(`
            UPDATE "chat_sessions" 
            SET status = 'bot' 
            WHERE status = 'active'
        `);

    // Drop old constraint if exists
    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            DROP CONSTRAINT IF EXISTS chat_sessions_status_check
        `);

    // Add new constraint with handoff statuses
    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            ADD CONSTRAINT chat_sessions_status_check 
            CHECK (status IN ('bot', 'human_pending', 'human_active', 'closed'))
        `);

    // Add foreign key to admins
    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            ADD CONSTRAINT fk_chat_sessions_admin 
            FOREIGN KEY (assigned_admin_id) 
            REFERENCES admins(id) 
            ON DELETE SET NULL
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_chat_sessions_status" 
            ON "chat_sessions"("status")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_chat_sessions_assigned_admin" 
            ON "chat_sessions"("assigned_admin_id")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_chat_sessions_handoff_requested" 
            ON "chat_sessions"("handoff_requested_at")
        `);

    console.log('✅ Added human handoff tracking fields to chat_sessions table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_sessions_handoff_requested"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_sessions_assigned_admin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chat_sessions_status"`);

    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            DROP CONSTRAINT IF EXISTS fk_chat_sessions_admin
        `);

    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            DROP CONSTRAINT IF EXISTS chat_sessions_status_check
        `);

    await queryRunner.query(`
            ALTER TABLE "chat_sessions" 
            DROP COLUMN IF EXISTS "assigned_admin_id",
            DROP COLUMN IF EXISTS "handoff_requested_at",
            DROP COLUMN IF EXISTS "handoff_accepted_at",
            DROP COLUMN IF EXISTS "handoff_reason"
        `);

    await queryRunner.query(`
            UPDATE "chat_sessions" 
            SET status = 'active' 
            WHERE status = 'bot'
        `);

    console.log('✅ Removed human handoff tracking fields from chat_sessions table');
  }
}
