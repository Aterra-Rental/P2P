BEGIN;

------------------------------------------------------------
-- ROOM TABLE UPDATES (Migration 003)
------------------------------------------------------------

ALTER TABLE room
ADD COLUMN IF NOT EXISTS escrow_fee DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE room
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE room
ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(30) DEFAULT 'NotShipped';

ALTER TABLE room
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);

ALTER TABLE room
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

ALTER TABLE room
ADD COLUMN IF NOT EXISTS cancel_requested_by INT;

ALTER TABLE room
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

ALTER TABLE room
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

------------------------------------------------------------
-- DEAL PROOFS UPDATES (Migration 004)
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS admin_note TEXT;

------------------------------------------------------------
-- DISPUTES (Migration 005)
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS disputes (

    dispute_id SERIAL PRIMARY KEY,

    room_id INT NOT NULL
        REFERENCES room(room_id)
        ON DELETE CASCADE,

    opened_by INT NOT NULL
        REFERENCES user_login(user_id),

    against_user INT NOT NULL
        REFERENCES user_login(user_id),

    dispute_type VARCHAR(50) NOT NULL,

    buyer_choice VARCHAR(30),

    status VARCHAR(30) DEFAULT 'Open',

    reason TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    closed_at TIMESTAMP
);

------------------------------------------------------------
-- DISPUTE RESOLUTION (Migration 006)
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dispute_resolution (

    resolution_id SERIAL PRIMARY KEY,

    dispute_id INT NOT NULL
        REFERENCES disputes(dispute_id)
        ON DELETE CASCADE,

    resolved_by INT NOT NULL
        REFERENCES admin_login(admin_id),

    decision VARCHAR(50) NOT NULL,

    refund_amount DECIMAL(10,2) DEFAULT 0.00,

    winner_user INT
        REFERENCES user_login(user_id),

    resolution_note TEXT,

    resolved_at TIMESTAMP DEFAULT NOW()
);

COMMIT;