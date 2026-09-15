-- 020: consumer pergolas, MrCare subscriptions, registered equipment, maintenance bookings, electronics claims

CREATE TABLE consumer_pergolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                 -- "Backyard pergola"
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    structure_type VARCHAR(50),                 -- louvered | fixed_roof | retractable
    mounting VARCHAR(20),
    width_ft DECIMAL(6,2),
    length_ft DECIMAL(6,2),
    height_ft DECIMAL(6,2),
    spec JSONB NOT NULL DEFAULT '{}',           -- enclosures[], accessories[], footings{}
    brand VARCHAR(100),
    model VARCHAR(100),
    installed_at DATE,
    install_job_id UUID REFERENCES jobs(id),
    photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pergolas_consumer ON consumer_pergolas(consumer_id);

ALTER TABLE jobs
    ADD COLUMN pergola_id UUID REFERENCES consumer_pergolas(id),
    ADD COLUMN kind VARCHAR(30) NOT NULL DEFAULT 'service',   -- installation | repair | service | maintenance_booking | electronics_claim
    ADD COLUMN subscription_id UUID,
    ADD COLUMN covered_by VARCHAR(30);                        -- maintenance | electronics  (banner: "Covered — no charge to client")
UPDATE jobs SET kind = CASE WHEN service_category='installation' THEN 'installation' WHEN service_category='repair' THEN 'repair' ELSE 'service' END;

ALTER TABLE invoices ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN contractor_id DROP NOT NULL;

INSERT INTO platform_settings (key, value, description) VALUES
 ('maintenance_visit_contractor_net', '180', 'MrCare maintenance visit: what the contractor receives (USD); customer pays 0'),
 ('electronics_claim_contractor_net', '240', 'MrCare electronics claim visit: what the contractor receives (USD); customer pays the service-call fee')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE mrcare_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offering VARCHAR(20) NOT NULL,              -- maintenance | electronics
    plan_id UUID NOT NULL REFERENCES mrcare_plans(id),
    plan_slug VARCHAR(50) NOT NULL,
    billing VARCHAR(10) NOT NULL DEFAULT 'annual',
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payment',  -- pending_payment | active | cancelled | expired
    pergola_ids UUID[] NOT NULL DEFAULT '{}',
    addons JSONB NOT NULL DEFAULT '{}',         -- {pergola_id: [addon_slug, ...]}
    price_plan DECIMAL(10,2) NOT NULL,
    price_addons DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_total DECIMAL(10,2) NOT NULL,
    visits_per_year INTEGER NOT NULL DEFAULT 0,
    visits_used INTEGER NOT NULL DEFAULT 0,
    claims_used INTEGER NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ,
    renew_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    certificate_url TEXT,
    invoice_id UUID REFERENCES invoices(id),
    consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_mrcare_subs_consumer ON mrcare_subscriptions(consumer_id, status);

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_subscription FOREIGN KEY (subscription_id) REFERENCES mrcare_subscriptions(id);

CREATE TABLE registered_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pergola_id UUID NOT NULL REFERENCES consumer_pergolas(id) ON DELETE CASCADE,
    consumer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL,           -- motor | led_lighting | fan | electric_heater | controller | sensor | speaker
    brand VARCHAR(100),
    model VARCHAR(100),
    serial VARCHAR(100),
    installed_at DATE,
    photo_url TEXT,
    registered_by VARCHAR(20) DEFAULT 'consumer',   -- consumer | inspection
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_equipment_pergola ON registered_equipment(pergola_id);

-- Maintenance bookings and electronics claims are jobs (kind set) plus a detail record
CREATE TABLE maintenance_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES mrcare_subscriptions(id),
    pergola_id UUID NOT NULL REFERENCES consumer_pergolas(id),
    visit_type VARCHAR(50) NOT NULL DEFAULT 'seasonal',  -- seasonal | pre_winter | post_winter | inspection
    preferred_window JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE electronics_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES mrcare_subscriptions(id),
    pergola_id UUID NOT NULL REFERENCES consumer_pergolas(id),
    equipment_id UUID REFERENCES registered_equipment(id),
    issue_code VARCHAR(50) NOT NULL,            -- not_powering | intermittent | noise | remote_unresponsive | water_ingress | other
    notes TEXT,
    files JSONB NOT NULL DEFAULT '[]',
    priority VARCHAR(10) NOT NULL DEFAULT 'normal',   -- low | normal | high
    preferred_window JSONB NOT NULL DEFAULT '{}',
    service_call_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    review_status VARCHAR(20) NOT NULL DEFAULT 'under_review',  -- under_review | approved | denied
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Back-fill pergolas from paid installation jobs
INSERT INTO consumer_pergolas (consumer_id, name, address_line1, city, state, zip_code, lat, lng, structure_type, mounting, width_ft, length_ft, height_ft, spec, installed_at, install_job_id)
SELECT consumer_id, title, location_address, location_city, location_state, location_zip, location_lat, location_lng,
       pergola_spec->>'structure_type', mounting, width_ft, length_ft, height_ft, pergola_spec, paid_at::date, id
FROM jobs WHERE service_category='installation' AND status='completed_paid';
UPDATE jobs j SET pergola_id = p.id FROM consumer_pergolas p WHERE p.install_job_id = j.id;
