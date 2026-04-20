-- Add completed_steps_encrypted column to actions table
-- This stores an array of step indices that have been completed

ALTER TABLE actions
ADD COLUMN completed_steps_encrypted BYTEA;

COMMENT ON COLUMN actions.completed_steps_encrypted IS 'Encrypted JSON array of completed micro-step indices';
