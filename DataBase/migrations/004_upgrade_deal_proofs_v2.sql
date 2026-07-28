BEGIN;

------------------------------------------------------------
-- Description of uploaded evidence
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS description TEXT;

------------------------------------------------------------
-- Courier Name
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);

------------------------------------------------------------
-- Tracking Number
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

------------------------------------------------------------
-- Whether admin has reviewed this evidence
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE;

------------------------------------------------------------
-- Admin notes
------------------------------------------------------------

ALTER TABLE deal_proofs
ADD COLUMN IF NOT EXISTS admin_note TEXT;

COMMIT;