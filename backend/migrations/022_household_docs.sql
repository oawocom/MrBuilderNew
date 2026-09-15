-- 022: household members, documents vault, request drafts, maintenance reminders, referrals

CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES users(id) ON DELETE CASCADE,     -- set once the invitee has an account
    invite_email VARCHAR(255),
    invite_phone VARCHAR(20),
    name VARCHAR(150),
    role VARCHAR(20) NOT NULL DEFAULT 'member',                 -- member | viewer
    can_create_requests BOOLEAN NOT NULL DEFAULT TRUE,
    can_message BOOLEAN NOT NULL DEFAULT TRUE,
    can_acknowledge BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'invited',              -- invited | active | removed
    invite_token VARCHAR(64) UNIQUE,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    removed_at TIMESTAMPTZ
);
CREATE INDEX idx_household_owner ON household_members(owner_id, status);
CREATE INDEX idx_household_member ON household_members(member_id, status);

ALTER TABLE jobs
    ADD COLUMN created_by UUID REFERENCES users(id),           -- household member who submitted (owner stays consumer_id)
    ADD COLUMN hh_acknowledged_by UUID REFERENCES users(id),
    ADD COLUMN hh_acknowledged_at TIMESTAMPTZ;
UPDATE jobs SET created_by = consumer_id WHERE created_by IS NULL;

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,          -- invoice | receipt | certificate | inspection_report | warranty | completion_photos | order_receipt | other
    title VARCHAR(200) NOT NULL,
    job_id UUID REFERENCES jobs(id),
    pergola_id UUID REFERENCES consumer_pergolas(id),
    ref_id UUID,                        -- invoice / subscription / order / report id
    url TEXT,
    payload JSONB NOT NULL DEFAULT '{}',   -- structured data when there is no file yet (line items, photo urls)
    share_token VARCHAR(64) UNIQUE,
    share_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_documents_user ON documents(user_id, type, created_at DESC);
CREATE INDEX idx_documents_job ON documents(job_id);

CREATE TABLE request_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_category VARCHAR(50),
    step VARCHAR(50),
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_drafts_user ON request_drafts(user_id, updated_at DESC);

CREATE TABLE maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pergola_id UUID NOT NULL REFERENCES consumer_pergolas(id) ON DELETE CASCADE,
    kind VARCHAR(30) NOT NULL DEFAULT 'maintenance',   -- maintenance | winterization | plan_renewal
    due_at DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',     -- pending | notified | snoozed | done | dismissed
    snoozed_until DATE,
    notified_at TIMESTAMPTZ,
    source VARCHAR(30),                                 -- last_visit | installation | subscription
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pergola_id, kind, due_at)
);
CREATE INDEX idx_reminders_due ON maintenance_reminders(status, due_at);

INSERT INTO platform_settings (key, value, description) VALUES
 ('maintenance_interval_months', '12', 'Months between recommended maintenance visits (reminder scheduling)')
ON CONFLICT (key) DO NOTHING;

-- referrals
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'referral_credit';
ALTER TABLE users ADD COLUMN referral_code VARCHAR(12) UNIQUE;
UPDATE users SET referral_code = UPPER(SUBSTRING(REPLACE(id::text,'-',''), 1, 8)) WHERE referral_code IS NULL;
CREATE OR REPLACE FUNCTION set_referral_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN NEW.referral_code := UPPER(SUBSTRING(REPLACE(NEW.id::text,'-',''), 1, 8)); END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_referral_code BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION set_referral_code();

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending | rewarded | void
    reward_amount DECIMAL(10,2),
    rewarded_job_id UUID REFERENCES jobs(id),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

-- Back-fill documents for existing paid jobs / invoices / active subscriptions
INSERT INTO documents (user_id, type, title, job_id, ref_id, payload)
SELECT i.consumer_id, 'invoice', 'Invoice ' || COALESCE(j.request_code, ''), i.job_id, i.id,
       jsonb_build_object('amount', i.amount, 'status', i.status, 'paid_at', i.paid_at, 'description', i.description)
FROM invoices i LEFT JOIN jobs j ON j.id=i.job_id WHERE i.status='paid';
INSERT INTO documents (user_id, type, title, pergola_id, ref_id, payload)
SELECT s.consumer_id, 'certificate', 'MrCare certificate · ' || s.plan_slug, s.pergola_ids[1], s.id,
       jsonb_build_object('offering', s.offering, 'plan', s.plan_slug, 'starts_at', s.starts_at, 'renew_at', s.renew_at, 'total', s.price_total)
FROM mrcare_subscriptions s WHERE s.status IN ('active','cancelled');
