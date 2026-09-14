-- Site forms: waitlist and partner requests
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    interested_role contractor_role,
    country VARCHAR(100),
    state VARCHAR(100),
    city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE partner_type AS ENUM ('manufacturer', 'retailer_or_reseller', 'designer_or_builder', 'architect_or_home_developer', 'other');

CREATE TABLE partner_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    website_url TEXT,
    type_of_business partner_type NOT NULL,
    country VARCHAR(100),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet balance (preserved from the old system)
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe integration columns
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN stripe_payment_intent_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN stripe_transfer_id VARCHAR(255);
ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id VARCHAR(255);

CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_partner_requests_email ON partner_requests(email);
CREATE INDEX idx_balances_user ON balances(user_id);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);
