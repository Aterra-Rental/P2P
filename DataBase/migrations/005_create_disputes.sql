BEGIN;

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

COMMIT;