CREATE TYPE job_status AS ENUM ('posted', 'accepted', 'in_progress', 'completed', 'confirmed', 'disputed', 'cancelled');
CREATE TYPE job_type AS ENUM ('installation', 'maintenance', 'repair', 'inspection');
CREATE TYPE structure_type AS ENUM ('attached', 'free_standing');
CREATE TYPE building_type AS ENUM ('residential', 'commercial', 'government');

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consumer_id UUID NOT NULL REFERENCES users(id),
    contractor_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    job_type job_type NOT NULL,
    status job_status DEFAULT 'posted',
    location_address VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_zip VARCHAR(20),
    location_lat DECIMAL(10,7),
    location_lng DECIMAL(10,7),
    preferred_start_date DATE,
    preferred_end_date DATE,
    payment_amount DECIMAL(10,2),
    structure_type structure_type,
    building_type building_type,
    main_product VARCHAR(255),
    side_enclosure VARCHAR(255),
    width_ft DECIMAL(6,2),
    length_ft DECIMAL(6,2),
    height_ft DECIMAL(6,2),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_consumer ON jobs(consumer_id);
CREATE INDEX idx_jobs_contractor ON jobs(contractor_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_location ON jobs(location_city, location_state);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
