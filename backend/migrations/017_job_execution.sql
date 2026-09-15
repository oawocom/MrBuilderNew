-- 017: field execution — evidence, checklist, reschedule proposals, disputes, cancellation fees, auto-confirm

CREATE TABLE job_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,            -- area | product | damage | completion | issue | dispute
    url TEXT NOT NULL,
    note TEXT,
    captured_at TIMESTAMPTZ,              -- client timestamp
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()  -- server timestamp
);
CREATE INDEX idx_job_evidence_job ON job_evidence(job_id, kind);

CREATE TABLE job_reschedule_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    proposed_by UUID NOT NULL REFERENCES users(id),
    proposed_by_role VARCHAR(20) NOT NULL,    -- consumer | contractor
    kind VARCHAR(10) NOT NULL DEFAULT 'start', -- start | return
    proposed_start TIMESTAMPTZ NOT NULL,
    proposed_end TIMESTAMPTZ,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | accepted | declined | countered | withdrawn
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reschedule_job ON job_reschedule_proposals(job_id, status);

ALTER TABLE jobs
    ADD COLUMN auto_confirm_at TIMESTAMPTZ,
    ADD COLUMN damage_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN return_visit_at TIMESTAMPTZ,
    ADD COLUMN reschedule_pending_by VARCHAR(20),
    ADD COLUMN issue_reason VARCHAR(100),
    ADD COLUMN issue_text TEXT,
    ADD COLUMN resumed_at TIMESTAMPTZ,
    ADD COLUMN consumer_charged DECIMAL(10,2),
    ADD COLUMN paid_at TIMESTAMPTZ;

ALTER TABLE job_disputes
    ADD COLUMN decision VARCHAR(20),          -- rejected | upheld
    ADD COLUMN decided_by UUID REFERENCES users(id);

ALTER TABLE job_cancellations
    ADD COLUMN phase VARCHAR(10),             -- pre_start | post_start
    ADD COLUMN fee_pct DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN fee_basis VARCHAR(20),
    ADD COLUMN text TEXT;

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'cancellation_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'platform_fee';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'job_payment';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'inspection_fee';

CREATE INDEX idx_jobs_auto_confirm ON jobs(auto_confirm_at) WHERE status = 'awaiting_confirmation';
