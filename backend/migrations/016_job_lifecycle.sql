-- 016: job lifecycle — shared status machine, request fields, system quotes, inspection reports, events

-- 1. Status enum: add the shared values (old ones kept so existing rows keep working)
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'inspection_booked';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'inspection_done';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'quote_generating';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'quote_ready';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'quote_declined';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'no_match_waitlist';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'en_route';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'arrived';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'paused_safety';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'awaiting_confirmation';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'completed_paid';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'issue_reported';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'dispute_open';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'dispute_rejected';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'return_visit_scheduled';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'dispute_upheld';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'reassigning';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled_by_client';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled_by_contractor';

-- 2. Request / job fields from the consumer form and the contractor job card
ALTER TABLE jobs ALTER COLUMN job_type DROP NOT NULL;
ALTER TABLE jobs ALTER COLUMN status SET DEFAULT 'submitted';
ALTER TABLE jobs
    ADD COLUMN request_code VARCHAR(20) UNIQUE,
    ADD COLUMN service_category VARCHAR(50) REFERENCES service_categories(slug),
    ADD COLUMN quote_method VARCHAR(20) NOT NULL DEFAULT 'instant',   -- instant | inspection
    ADD COLUMN pergola_spec JSONB NOT NULL DEFAULT '{}',              -- {structure_type, enclosures[], accessories[], footings{}}
    ADD COLUMN property_type VARCHAR(30),                             -- residential | commercial | hoa | government
    ADD COLUMN mounting VARCHAR(20),                                  -- attached | free_standing
    ADD COLUMN notes TEXT,                                            -- notes for the contractor
    ADD COLUMN urgency VARCHAR(10),                                   -- repair: low | medium | high
    ADD COLUMN time_window VARCHAR(50),                               -- repair: preferred window
    ADD COLUMN issue_description TEXT,                                -- repair
    ADD COLUMN scheduled_start TIMESTAMPTZ,
    ADD COLUMN scheduled_end TIMESTAMPTZ,
    ADD COLUMN quote_total DECIMAL(10,2),
    ADD COLUMN platform_fee DECIMAL(10,2),
    ADD COLUMN contractor_net DECIMAL(10,2),
    ADD COLUMN tip DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN inspection_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN inspection_fee_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN en_route_eta_minutes INTEGER,
    ADD COLUMN en_route_at TIMESTAMPTZ,
    ADD COLUMN arrived_at TIMESTAMPTZ,
    ADD COLUMN paused_at TIMESTAMPTZ,
    ADD COLUMN pause_reason TEXT,
    ADD COLUMN completion_note TEXT,
    ADD COLUMN checklist_done JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN parent_job_id UUID REFERENCES jobs(id),
    ADD COLUMN current_quote_id UUID;

-- Request code MRB-YYYY-NNNNN, same ID shown in both apps
CREATE SEQUENCE job_request_seq START 10001;
CREATE OR REPLACE FUNCTION set_job_request_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_code IS NULL THEN
        NEW.request_code := 'MRB-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('job_request_seq')::text, 5, '0');
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_job_request_code BEFORE INSERT ON jobs FOR EACH ROW EXECUTE FUNCTION set_job_request_code();

-- Backfill old rows
UPDATE jobs SET request_code = 'MRB-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('job_request_seq')::text, 5, '0') WHERE request_code IS NULL;
UPDATE jobs SET service_category = job_type::text WHERE service_category IS NULL AND job_type IS NOT NULL;
UPDATE jobs SET mounting = structure_type::text WHERE mounting IS NULL AND structure_type IS NOT NULL;
UPDATE jobs SET quote_total = payment_amount WHERE quote_total IS NULL AND payment_amount IS NOT NULL;

CREATE INDEX idx_jobs_category_status ON jobs(service_category, status);
CREATE INDEX idx_jobs_request_code ON jobs(request_code);

-- 3. System-generated quotes, versioned
CREATE TABLE quote_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    adjustments JSONB NOT NULL DEFAULT '[]',        -- admin manual lines [{label, amount}]
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    contractor_net DECIMAL(10,2) NOT NULL DEFAULT 0,
    inspection_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
    generated_by VARCHAR(20) NOT NULL DEFAULT 'system',   -- system | admin
    generated_by_user UUID REFERENCES users(id),
    inspection_report_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'sent',    -- sent | approved | declined | superseded | expired
    decline_reason TEXT,
    note TEXT,
    valid_until TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, version)
);
CREATE INDEX idx_quote_versions_job ON quote_versions(job_id);

-- 4. Inspection reports (no price field — pricing engine prices the job)
CREATE TABLE inspection_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id),
    width_ft DECIMAL(6,2),
    length_ft DECIMAL(6,2),
    height_ft DECIMAL(6,2),
    structure_type_observed VARCHAR(50),
    mounting_observed VARCHAR(20),
    footings JSONB NOT NULL DEFAULT '{}',          -- {involved, ready, count}
    scope TEXT[] NOT NULL DEFAULT '{}',
    findings TEXT,
    photos JSONB NOT NULL DEFAULT '[]',            -- [{url, label}] (>=2 labelled)
    pdf_url TEXT,
    spec_override JSONB,                           -- corrected pergola spec used for pricing
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inspection_reports_job ON inspection_reports(job_id);

-- 5. Event log — every transition; notifications derive from these
CREATE TABLE job_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(20),
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(40),
    to_status VARCHAR(40),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_job_events_job ON job_events(job_id, created_at);

-- 6. Contractor declines (no effect on rating)
CREATE TABLE job_declines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, contractor_id)
);

-- 7. Notifications: free-form type + deep-link payload; push device tokens
ALTER TABLE notifications ALTER COLUMN notification_type TYPE VARCHAR(50);
ALTER TABLE notifications ADD COLUMN data JSONB NOT NULL DEFAULT '{}';   -- {screen, params}

CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL,                 -- ios | android | web
    app VARCHAR(20) NOT NULL DEFAULT 'consumer',   -- consumer | contractor
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- 8. Contractor skills must be one of the 8 categories
DELETE FROM contractor_skills WHERE skill_name NOT IN (SELECT slug FROM service_categories);
ALTER TABLE contractor_skills ADD CONSTRAINT fk_skill_category FOREIGN KEY (skill_name) REFERENCES service_categories(slug);
