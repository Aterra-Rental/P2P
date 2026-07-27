BEGIN;
-- ==========================================
-- Migration: 002_database_v1_finalize.sql
-- Purpose : Finalize Database Version 1.0
-- Author  : Your Team
-- ==========================================

-------------------------------------------------------
-- ROOM TABLE
-------------------------------------------------------

ALTER TABLE room
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) DEFAULT 'Bakong';

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
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) DEFAULT 'Bakong';

-------------------------------------------------------
-- BUYER
-------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'buyer'
          AND column_name = 'proposedamount'
    ) THEN
        ALTER TABLE buyer
        RENAME COLUMN proposedamount TO agreed_amount;
    END IF;
END $$;

-------------------------------------------------------
-- SELLER
-------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'seller'
          AND column_name = 'proposedamount'
    ) THEN
        ALTER TABLE seller
        RENAME COLUMN proposedamount TO agreed_amount;
    END IF;
END $$;

COMMIT;