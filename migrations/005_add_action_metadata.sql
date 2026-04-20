-- Add commitment and feeling fields to actions table
-- These are frontend-specific fields for user experience

ALTER TABLE actions
ADD COLUMN commitment SMALLINT CHECK (commitment >= 1 AND commitment <= 10),
ADD COLUMN feeling_encrypted BYTEA;

COMMENT ON COLUMN actions.commitment IS 'User commitment level (1-10)';
COMMENT ON COLUMN actions.feeling_encrypted IS 'Encrypted uncomfortable feeling that might arise';
