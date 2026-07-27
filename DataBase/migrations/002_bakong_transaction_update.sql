BEGIN;

-------------------------------------------------------
-- ROOM TABLE
-------------------------------------------------------

ALTER TABLE room
ADD COLUMN IF NOT EXISTS bakong_transaction_id VARCHAR(100);

ALTER TABLE room
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'room_bakong_transaction_id_unique'
    ) THEN
        ALTER TABLE room
        ADD CONSTRAINT room_bakong_transaction_id_unique
        UNIQUE (bakong_transaction_id);
    END IF;
END $$;

-------------------------------------------------------
-- TRANSACTIONS HISTORY
-------------------------------------------------------

ALTER TABLE transactions_history
ADD COLUMN IF NOT EXISTS bakong_transaction_id VARCHAR(100);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'transactions_history_bakong_transaction_id_unique'
    ) THEN
        ALTER TABLE transactions_history
        ADD CONSTRAINT transactions_history_bakong_transaction_id_unique
        UNIQUE (bakong_transaction_id);
    END IF;
END $$;

COMMIT;