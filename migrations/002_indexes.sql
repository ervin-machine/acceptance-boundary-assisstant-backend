-- Additional performance indexes

-- Composite indexes for common queries
CREATE INDEX idx_emotions_user_created ON emotions(user_id, created_at DESC);
CREATE INDEX idx_values_user_importance ON values(user_id, importance DESC);
CREATE INDEX idx_actions_user_completed ON actions(user_id, completed);
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);

-- Index for active session lookups (filter by expires_at in queries)
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at);

-- Index for audit log retention cleanup (HIPAA 7-year retention)
CREATE INDEX idx_audit_logs_retention ON audit_logs(timestamp);

-- Full-text search preparation (for future use)
-- Add tsvector columns for searchable content when needed

COMMENT ON INDEX idx_emotions_user_created IS 'Optimize user emotion history queries';
COMMENT ON INDEX idx_values_user_importance IS 'Optimize user values sorted by importance';
COMMENT ON INDEX idx_actions_user_completed IS 'Optimize filtering completed/incomplete actions';
COMMENT ON INDEX idx_sessions_active IS 'Optimize active session lookups';
COMMENT ON INDEX idx_audit_logs_retention IS 'Optimize audit log retention cleanup';
