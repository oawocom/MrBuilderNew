CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'withdrawn');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'cancelled', 'expired');

-- Contractor sends a quote (price offer) for a posted job.
-- One contractor can have only one active quote per job.
CREATE TABLE job_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    line_items JSONB,
    status quote_status DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    valid_until TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, contractor_id)
);

-- Invoice is generated when the consumer accepts a quote.
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id),
    quote_id UUID UNIQUE REFERENCES job_quotes(id),
    consumer_id UUID NOT NULL REFERENCES users(id),
    contractor_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status invoice_status DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    metadata JSONB,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_quotes_job ON job_quotes(job_id);
CREATE INDEX idx_job_quotes_contractor ON job_quotes(contractor_id);
CREATE INDEX idx_job_quotes_status ON job_quotes(status);
CREATE INDEX idx_invoices_job ON invoices(job_id);
CREATE INDEX idx_invoices_consumer ON invoices(consumer_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
