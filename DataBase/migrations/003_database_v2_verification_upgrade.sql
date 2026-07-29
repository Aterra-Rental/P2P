BEGIN;

------------------------------------------------------------
-- User Profile
------------------------------------------------------------

ALTER TABLE user_details
ADD COLUMN IF NOT EXISTS bio VARCHAR(120);

------------------------------------------------------------
-- Profile Privacy Settings
------------------------------------------------------------

ALTER TABLE user_details
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT FALSE;

------------------------------------------------------------
-- Profile Visibility
-- public   : Anyone can view public profile information
-- partners : Only users who have completed a trade together
-- private  : Only the account owner and admins
------------------------------------------------------------

ALTER TABLE user_details
ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20)
DEFAULT 'public';

------------------------------------------------------------
-- Profile Visibility Constraint
------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_profile_visibility'
    ) THEN
        ALTER TABLE user_details
        ADD CONSTRAINT chk_profile_visibility
        CHECK (
            profile_visibility IN ('public', 'partners', 'private')
        );
    END IF;
END $$;

------------------------------------------------------------
-- Public Profile
------------------------------------------------------------

ALTER TABLE user_details
ADD COLUMN IF NOT EXISTS username VARCHAR(30),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

------------------------------------------------------------
-- Username Length Constraint
------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_username_length'
    ) THEN
        ALTER TABLE user_details
        ADD CONSTRAINT chk_username_length
        CHECK (
            username IS NULL
            OR LENGTH(username) BETWEEN 3 AND 30
        );
    END IF;
END $$;

------------------------------------------------------------
-- Username Format Constraint
-- Only lowercase letters, numbers and underscores
------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_username_format'
    ) THEN
        ALTER TABLE user_details
        ADD CONSTRAINT chk_username_format
        CHECK (
            username IS NULL
            OR username ~ '^[a-z0-9_]{3,30}$'
        );
    END IF;
END $$;

------------------------------------------------------------
-- Username Must Be Unique
------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_details_username
ON user_details(username);

COMMIT;