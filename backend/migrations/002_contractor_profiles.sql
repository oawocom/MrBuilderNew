CREATE TYPE contractor_role AS ENUM ('inspector', 'service_team', 'installation_team');
CREATE TYPE business_type AS ENUM ('sole_proprietor', 'llc', 'corporation', 'partnership');

CREATE TABLE contractor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role contractor_role NOT NULL,
    business_name VARCHAR(255),
    business_type business_type,
    ein_or_itin VARCHAR(50),
    years_of_experience INTEGER,
    professional_title VARCHAR(100),
    hourly_rate DECIMAL(10,2),
    bio TEXT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    insurance_certificate_url TEXT,
    contractor_license_url TEXT,
    business_card_url TEXT,
    background_check_passed BOOLEAN DEFAULT FALSE,
    stripe_account_id VARCHAR(255),
    rating_avg DECIMAL(3,2) DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contractor_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    UNIQUE(contractor_id, skill_name)
);

CREATE TABLE contractor_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    issued_at DATE,
    expires_at DATE,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contractor_pergola_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
    system_name VARCHAR(100) NOT NULL,
    UNIQUE(contractor_id, system_name)
);

CREATE INDEX idx_contractor_user ON contractor_profiles(user_id);
CREATE INDEX idx_contractor_role ON contractor_profiles(role);
CREATE INDEX idx_contractor_skills ON contractor_skills(contractor_id);
