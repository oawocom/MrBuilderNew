CREATE TYPE warranty_type AS ENUM ('structural', 'labor', 'materials');
CREATE TYPE warranty_status AS ENUM ('active', 'inactive', 'expired');
CREATE TYPE warranty_claim_status AS ENUM ('pending', 'under_review', 'approved', 'denied', 'resolved', 'cancelled');

-- Warranty issued for a completed job (installation/repair etc.)
CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id),
    consumer_id UUID NOT NULL REFERENCES users(id),
    contractor_id UUID REFERENCES users(id),
    warranty_type warranty_type NOT NULL,
    status warranty_status DEFAULT 'active',
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    terms JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warranty_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warranty_id UUID NOT NULL REFERENCES warranties(id),
    job_id UUID NOT NULL REFERENCES jobs(id),
    consumer_id UUID NOT NULL REFERENCES users(id),
    warranty_type warranty_type NOT NULL,
    issue_description TEXT NOT NULL,
    date_issue_started DATE,
    evidence_photos TEXT[],
    status warranty_claim_status DEFAULT 'pending',
    admin_notes TEXT,
    resolution_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warranties_job ON warranties(job_id);
CREATE INDEX idx_warranties_consumer ON warranties(consumer_id);
CREATE INDEX idx_warranties_status ON warranties(status);
CREATE INDEX idx_warranties_end_date ON warranties(end_date);
CREATE INDEX idx_warranty_claims_warranty ON warranty_claims(warranty_id);
CREATE INDEX idx_warranty_claims_job ON warranty_claims(job_id);
CREATE INDEX idx_warranty_claims_consumer ON warranty_claims(consumer_id);
CREATE INDEX idx_warranty_claims_status ON warranty_claims(status);
