-- Audit logging trigger function
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
BEGIN
  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    action_type := 'CREATE';
  ELSIF (TG_OP = 'UPDATE') THEN
    action_type := 'UPDATE';
  ELSIF (TG_OP = 'DELETE') THEN
    action_type := 'DELETE';
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (user_id, action, resource, resource_id, timestamp)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    action_type,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all user data tables
CREATE TRIGGER audit_emotions
AFTER INSERT OR UPDATE OR DELETE ON emotions
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_values
AFTER INSERT OR UPDATE OR DELETE ON values
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_actions
AFTER INSERT OR UPDATE OR DELETE ON actions
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_boundary_practices
AFTER INSERT OR UPDATE OR DELETE ON boundary_practices
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_messages
AFTER INSERT OR UPDATE OR DELETE ON messages
FOR EACH ROW
EXECUTE FUNCTION log_audit_trail();

-- Prevent modification of audit logs (immutable)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

COMMENT ON FUNCTION log_audit_trail() IS 'Automatically log all data access operations for HIPAA compliance';
COMMENT ON FUNCTION prevent_audit_log_modification() IS 'Ensure audit logs remain immutable';
