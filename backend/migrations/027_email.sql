-- 027: transactional email outbox
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL, event TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status, created_at);
