-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_encrypted BYTEA NOT NULL,
  email_hash VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email_hash ON users(email_hash);

-- Emotions table
CREATE TABLE emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emotions_encrypted BYTEA NOT NULL,
  intensity SMALLINT NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  body_sensations_encrypted BYTEA,
  context_encrypted BYTEA,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emotions_user_id ON emotions(user_id);
CREATE INDEX idx_emotions_created_at ON emotions(created_at DESC);

-- Values table
CREATE TABLE values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_encrypted BYTEA NOT NULL,
  custom_value_encrypted BYTEA,
  importance SMALLINT NOT NULL CHECK (importance >= 1 AND importance <= 10),
  alignment SMALLINT NOT NULL CHECK (alignment >= 1 AND alignment <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_values_user_id ON values(user_id);

-- Actions table
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value_encrypted BYTEA NOT NULL,
  action_encrypted BYTEA NOT NULL,
  completed BOOLEAN DEFAULT false,
  micro_steps_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_actions_user_id ON actions(user_id);
CREATE INDEX idx_actions_completed ON actions(completed);

-- Boundary practices table
CREATE TABLE boundary_practices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_encrypted BYTEA NOT NULL,
  boundary_type VARCHAR(50) NOT NULL,
  response_encrypted BYTEA NOT NULL,
  confidence SMALLINT NOT NULL CHECK (confidence >= 1 AND confidence <= 10),
  outcome_encrypted BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_boundary_practices_user_id ON boundary_practices(user_id);
CREATE INDEX idx_boundary_practices_boundary_type ON boundary_practices(boundary_type);

-- Messages table (AI Companion conversations)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content_encrypted BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Sessions table (refresh tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Audit logs table (HIPAA compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with encrypted PII';
COMMENT ON TABLE emotions IS 'User emotion tracking entries';
COMMENT ON TABLE values IS 'User values exploration data';
COMMENT ON TABLE actions IS 'User committed actions aligned with values';
COMMENT ON TABLE boundary_practices IS 'User boundary practice scenarios';
COMMENT ON TABLE messages IS 'AI Companion conversation history';
COMMENT ON TABLE sessions IS 'Active user sessions for refresh tokens';
COMMENT ON TABLE audit_logs IS 'HIPAA compliance audit trail (7-year retention)';
