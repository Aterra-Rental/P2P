-- Add snapshot data to transaction history

ALTER TABLE transactions_history
ADD COLUMN IF NOT EXISTS room_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS item_description TEXT,
ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS fulfillment_proof VARCHAR(255),
ADD COLUMN IF NOT EXISTS fulfillment_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS released_at TIMESTAMP;


-- Temporary proof storage during active deals

CREATE TABLE IF NOT EXISTS deal_proofs (

    proof_id SERIAL PRIMARY KEY,

    room_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    proof_type VARCHAR(30) NOT NULL,

    file_path VARCHAR(255) NOT NULL,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT fk_proof_room
    FOREIGN KEY(room_id)
    REFERENCES room(room_id)
    ON DELETE CASCADE,


    CONSTRAINT fk_proof_user
    FOREIGN KEY(user_id)
    REFERENCES user_details(user_id)
    ON DELETE RESTRICT
);
-------------------------------------------------------
-- Bakong Payment Information
-------------------------------------------------------

ALTER TABLE room
ADD COLUMN IF NOT EXISTS bakong_transaction_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP;

ALTER TABLE transactions_history
ADD COLUMN IF NOT EXISTS bakong_transaction_id VARCHAR(100) UNIQUE;