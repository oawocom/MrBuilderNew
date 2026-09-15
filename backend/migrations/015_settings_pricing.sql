-- 015: platform settings, service categories, pricing rules, MrCare plans

-- Admin-editable key/value settings (values are JSON: numbers, booleans, strings)
CREATE TABLE platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description) VALUES
 ('platform_fee_pct',              '10',            'Platform commission, % of job total, deducted from contractor payout'),
 ('platform_fee_flat',             '0',             'Flat platform fee per job (USD), in addition to the %'),
 ('contractor_cancel_pct',         '1',             '% of job total charged to a contractor who cancels an assigned job before start'),
 ('consumer_cancel_pct_pre_start', '0',             '% of job total charged to a consumer who cancels after assignment but before start'),
 ('post_start_cancel_pct',         '5',             '% charged to whichever party cancels after work has started'),
 ('post_start_cancel_basis',       '"quote_total"', 'Basis for the post-start % fee: quote_total | labor | contractor_net'),
 ('min_payout_amount',             '50',            'Minimum contractor payout request (USD)'),
 ('auto_payout_default',           'false',         'Default for new contractors: automatically pay out when balance >= min'),
 ('tip_enabled',                   'true',          'Allow consumer to add a tip at confirmation (100% to contractor)'),
 ('inspection_fee',                '99',            'Fee charged to consumer when an inspection visit is booked (USD)'),
 ('inspection_fee_credited',       'true',          'Credit the inspection fee against the job if the generated quote is approved'),
 ('inspection_contractor_net',     '60',            'What the inspecting contractor receives per inspection (USD)'),
 ('auto_confirm_hours',            '72',            'Hours after "marked complete" before the job auto-confirms and pays out'),
 ('quote_valid_days',              '14',            'Days a generated quote stays valid'),
 ('cod_enabled',                   'true',          'Mr Supply: allow cash on delivery'),
 ('cod_max_change',                '20',            'Mr Supply: courier cannot give change over this amount (USD)'),
 ('cod_cancel_after_packing',      'false',         'Mr Supply: can a cash order be cancelled after packing'),
 ('store_free_shipping_over',      '150',           'Mr Supply: free shipping threshold (USD)'),
 ('store_shipping_fee',            '12.99',         'Mr Supply: flat shipping fee below the threshold (USD)'),
 ('quiz_pass_pct',                 '80',            'Training: minimum quiz score to pass a lesson'),
 ('quiz_questions_per_lesson',     '5',             'Training: questions per lesson quiz'),
 ('training_version',              '"2026.09"',     'Training: current content version stamped on completions'),
 ('referral_reward',               '25',            'Referral credit (USD) after referred user''s first completed job'),
 ('account_deletion_grace_days',   '30',            'Days before a deleted account is purged'),
 ('reminder_days_before_due',      '14',            'Maintenance reminder lead time (days)');

-- The single 8-value service category enum used by both apps
CREATE TABLE service_categories (
    slug VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_practical BOOLEAN DEFAULT FALSE,   -- supervised first job before activation
    pre_job_checklist JSONB NOT NULL DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO service_categories (slug, name, requires_practical, sort_order, pre_job_checklist) VALUES
 ('installation', 'Installation', TRUE, 1, '[
   {"id":"site_clear","text":"Work area is clear and accessible","critical":true},
   {"id":"footings","text":"Footings / mounting surface verified against plan","critical":true},
   {"id":"materials","text":"All components and hardware present and undamaged","critical":false},
   {"id":"ppe","text":"PPE worn: eye protection, gloves, hard hat where required","critical":true},
   {"id":"ladders","text":"Ladders and lifts inspected and secured","critical":true},
   {"id":"power","text":"Power tools and cords inspected; no electrical / gas work in scope","critical":true},
   {"id":"weather","text":"Weather safe for outdoor work","critical":false},
   {"id":"customer","text":"Customer notes read (gate code, pets, access)","critical":false}]'),
 ('repair',        'Repair',                     TRUE,  2, '[]'),
 ('maintenance',   'Maintenance',                FALSE, 3, '[]'),
 ('cleaning',      'Cleaning',                   FALSE, 4, '[]'),
 ('programming',   'Programming & Smart Controls', FALSE, 5, '[]'),
 ('upgrades',      'Upgrades & Accessories',     FALSE, 6, '[]'),
 ('inspection',    'Inspection & Diagnostics',   FALSE, 7, '[]'),
 ('removal',       'Removal & Relocation',       FALSE, 8, '[]');

-- Rate table read by the quote engine. Quote = sum of matching rows.
-- component: base | per_sqft | mounting | enclosure | accessory | footing_not_ready | height_over_10ft | per_pergola
-- code: enclosure type / accessory type / mounting type when the component needs one
-- structure_type: optional filter (louvered | fixed_roof | retractable | attached | any)
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_category VARCHAR(50) NOT NULL REFERENCES service_categories(slug),
    component VARCHAR(30) NOT NULL,
    code VARCHAR(50),
    structure_type VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'flat',   -- flat | per_sqft | per_unit | per_side | per_hour
    label VARCHAR(120),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pricing_rules_lookup ON pricing_rules(service_category, component, code, structure_type) WHERE is_active;

INSERT INTO pricing_rules (service_category, component, code, structure_type, amount, unit, label) VALUES
 -- Installation
 ('installation','base',             NULL,               NULL,        1500.00,'flat',    'Installation base'),
 ('installation','per_sqft',         NULL,               'louvered',    22.00,'per_sqft','Louvered roof, per sq ft'),
 ('installation','per_sqft',         NULL,               'fixed_roof',  16.00,'per_sqft','Fixed roof, per sq ft'),
 ('installation','per_sqft',         NULL,               'retractable', 19.00,'per_sqft','Retractable, per sq ft'),
 ('installation','mounting',         'attached',         NULL,         250.00,'flat',    'Wall-attached mounting'),
 ('installation','mounting',         'free_standing',    NULL,         400.00,'flat',    'Free-standing (4 posts)'),
 ('installation','footing_not_ready',NULL,               NULL,         180.00,'per_unit','Footing prep, per footing'),
 ('installation','height_over_10ft', NULL,               NULL,         300.00,'flat',    'Height over 10 ft surcharge'),
 ('installation','enclosure',        'screen',           NULL,         350.00,'per_side','Screen enclosure, per side'),
 ('installation','enclosure',        'glass',            NULL,         650.00,'per_side','Glass panel, per side'),
 ('installation','enclosure',        'privacy_wall',     NULL,         450.00,'per_side','Privacy wall, per side'),
 ('installation','enclosure',        'louvered_wall',    NULL,         700.00,'per_side','Louvered side wall, per side'),
 ('installation','enclosure',        'zip_shade',        NULL,         420.00,'per_side','Zip shade, per side'),
 ('installation','accessory',        'led_lighting',     NULL,         120.00,'per_unit','LED lighting (mount only)'),
 ('installation','accessory',        'fan',              NULL,         180.00,'per_unit','Fan (mount only)'),
 ('installation','accessory',        'electric_heater',  NULL,         160.00,'per_unit','Electric heater (mount only)'),
 ('installation','accessory',        'speaker',          NULL,          90.00,'per_unit','Speaker (mount only)'),
 ('installation','accessory',        'motor_controls',   NULL,         220.00,'per_unit','Motor / remote controls'),
 -- Repair
 ('repair','base',                   NULL,               NULL,         150.00,'flat',    'Repair call-out'),
 ('repair','per_hour',               NULL,               NULL,          95.00,'per_hour','Repair labor, per hour'),
 ('repair','urgency',                'high',             NULL,         100.00,'flat',    'Same-day / urgent surcharge'),
 -- Maintenance
 ('maintenance','base',              NULL,               NULL,         199.00,'flat',    'Maintenance visit'),
 ('maintenance','per_sqft',          NULL,               NULL,           0.75,'per_sqft','Maintenance, per sq ft'),
 -- Cleaning
 ('cleaning','base',                 NULL,               NULL,         149.00,'flat',    'Cleaning visit'),
 ('cleaning','per_sqft',             NULL,               NULL,           0.90,'per_sqft','Cleaning, per sq ft'),
 -- Programming & smart controls
 ('programming','base',              NULL,               NULL,         129.00,'flat',    'Programming / smart control setup'),
 ('programming','accessory',         'motor_controls',   NULL,          60.00,'per_unit','Additional motor / remote pairing'),
 -- Upgrades & accessories
 ('upgrades','base',                 NULL,               NULL,         120.00,'flat',    'Upgrade visit'),
 ('upgrades','accessory',            'led_lighting',     NULL,         120.00,'per_unit','LED lighting (mount only)'),
 ('upgrades','accessory',            'fan',              NULL,         180.00,'per_unit','Fan (mount only)'),
 ('upgrades','accessory',            'electric_heater',  NULL,         160.00,'per_unit','Electric heater (mount only)'),
 ('upgrades','enclosure',            'screen',           NULL,         350.00,'per_side','Screen enclosure, per side'),
 -- Inspection (consumer pays platform_settings.inspection_fee; this is the contractor side)
 ('inspection','base',               NULL,               NULL,          60.00,'flat',    'Inspection visit (contractor net)'),
 -- Removal & relocation
 ('removal','base',                  NULL,               NULL,         450.00,'flat',    'Removal base'),
 ('removal','per_sqft',              NULL,               NULL,           4.50,'per_sqft','Removal, per sq ft'),
 ('removal','relocation',            NULL,               NULL,         900.00,'flat',    'Re-install at new location');

-- MrCare: two offerings, each with plans and add-ons
CREATE TABLE mrcare_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offering VARCHAR(20) NOT NULL,          -- maintenance | electronics
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    annual_price DECIMAL(10,2) NOT NULL,
    visits_per_year INTEGER DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO mrcare_plans (offering, slug, name, annual_price, visits_per_year, sort_order, features) VALUES
 ('maintenance','maint_essential','Essential', 99.00, 1, 1, '["1 maintenance visit / year","Louver & drainage check","Hardware tightening","Priority booking"]'),
 ('maintenance','maint_plus',     'Plus',     199.00, 2, 2, '["2 maintenance visits / year","Everything in Essential","Motor & sensor check","10% off repairs"]'),
 ('maintenance','maint_premium',  'Premium',  299.00, 4, 3, '["4 maintenance visits / year","Everything in Plus","Seasonal cleaning included","15% off repairs & parts"]'),
 ('electronics','elec_standard',  'Electronics Protection', 149.00, 0, 1, '["Covers registered motors, lighting, controls","Repair or replacement","$49 service call per claim","Requires $99 pre-inspection"]');

CREATE TABLE mrcare_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offering VARCHAR(20) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    annual_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO mrcare_addons (offering, slug, name, annual_price, sort_order) VALUES
 ('maintenance','addon_screens',   'Screen & shade care',      39.00, 1),
 ('maintenance','addon_lighting',  'Lighting & electrical check', 29.00, 2),
 ('maintenance','addon_winter',    'Winterization visit',      59.00, 3),
 ('electronics','addon_heater',    'Heater coverage',          35.00, 1),
 ('electronics','addon_audio',     'Audio / speaker coverage', 25.00, 2);

-- Settings the client left open, stored so admin can change them without a deploy:
-- electronics claim fee / annual claim limit / equipment age limit
INSERT INTO platform_settings (key, value, description) VALUES
 ('electronics_claim_fee',        '49', 'MrCare Electronics: service-call fee per claim (USD)'),
 ('electronics_claims_per_year',  '3',  'MrCare Electronics: max claims per plan year'),
 ('electronics_max_equipment_age','5',  'MrCare Electronics: max age of covered equipment (years)');
