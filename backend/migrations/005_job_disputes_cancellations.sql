CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved');
CREATE TYPE cancellation_by AS ENUM ('consumer', 'contractor');

CREATE TABLE job_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_cancellations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    cancelled_by cancellation_by NOT NULL,
    cancelled_by_user UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    service_fee_applied BOOLEAN DEFAULT FALSE,
    service_fee_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_job ON job_disputes(job_id);
CREATE INDEX idx_disputes_status ON job_disputes(status);
CREATE INDEX idx_cancellations_job ON job_cancellations(job_id);
