BEGIN;

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