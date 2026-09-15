-- 023: admin-managed integration settings (encrypted), uploads registry

CREATE TABLE integration_settings (
    provider VARCHAR(30) PRIMARY KEY,      -- stripe | smtp | twilio | storage | google_oauth | apple_oauth | push | maps
    config_enc TEXT,                       -- AES-GCM encrypted JSON, key from SETTINGS_ENC_KEY (env)
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_test_at TIMESTAMPTZ,
    last_test_ok BOOLEAN,
    last_test_message TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO integration_settings (provider) VALUES ('stripe'),('smtp'),('twilio'),('storage'),('google_oauth'),('apple_oauth'),('push'),('maps') ON CONFLICT DO NOTHING;
-- push via Expo needs no credentials → enabled by default
UPDATE integration_settings SET is_enabled=TRUE WHERE provider='push';

CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(30) NOT NULL,          -- evidence | avatar | product | document | chat | inspection | claim
    object_key TEXT NOT NULL,
    public_url TEXT NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_uploads_user ON uploads(user_id, created_at DESC);

ALTER TABLE notifications ADD COLUMN delivered_push_at TIMESTAMPTZ;
