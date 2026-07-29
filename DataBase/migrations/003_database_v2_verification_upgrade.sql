BEGIN;

ALTER TABLE user_details
ADD COLUMN IF NOT EXISTS reject_reason TEXT,
ADD COLUMN IF NOT EXISTS reject_comment TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_user_details_reviewed_by'
    ) THEN
        ALTER TABLE user_details
        ADD CONSTRAINT fk_user_details_reviewed_by
        FOREIGN KEY (reviewed_by)
        REFERENCES admin_login(admin_id)
        ON DELETE SET NULL;
    END IF;
END $$;

COMMIT;