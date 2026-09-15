-- 024: Stripe wiring, OAuth identities, OTP purposes, web base url

ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20), ADD COLUMN oauth_sub VARCHAR(255);
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_sub) WHERE oauth_sub IS NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE contractor_profiles ADD COLUMN stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN stripe_onboarded_at TIMESTAMPTZ;
ALTER TABLE payout_requests ADD COLUMN stripe_transfer_id VARCHAR(255);
ALTER TABLE supply_orders ADD COLUMN stripe_payment_intent_id VARCHAR(255), ADD COLUMN stripe_refund_id VARCHAR(255);
ALTER TABLE mrcare_subscriptions ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE jobs ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE payment_methods ADD COLUMN exp_month INTEGER, ADD COLUMN exp_year INTEGER;

ALTER TABLE otp_codes ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'verify', ADD COLUMN email VARCHAR(255), ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_otp_email ON otp_codes(email);

INSERT INTO platform_settings (key, value, description) VALUES
 ('web_base_url', '"https://new.mrbuilder.com"', 'Public web URL used in emails and Stripe return links'),
 ('payment_capture', '"on_confirm"', 'When the customer is charged: on_confirm (charge when work is confirmed) | on_approve (authorize at quote approval, capture on confirm)')
ON CONFLICT (key) DO NOTHING;
