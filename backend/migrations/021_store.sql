-- 021: Mr Supply store — categories, products, favorites, addresses, carts, orders, job parts requests

CREATE TABLE supply_categories (
    slug VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
INSERT INTO supply_categories (slug, name, sort_order) VALUES
 ('louvers','Louvers',1), ('motors','Motors & controls',2), ('lighting','Lighting',3), ('posts','Posts & beams',4), ('hardware','Hardware',5);

ALTER TABLE supply_products
    ADD COLUMN sku VARCHAR(50) UNIQUE,
    ADD COLUMN images JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN compatible_types TEXT[] NOT NULL DEFAULT '{}',   -- louvered | fixed_roof | retractable | any
    ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN rating_avg DECIMAL(3,2) DEFAULT 0,
    ADD COLUMN specs JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE supply_products SET category = LOWER(category) WHERE category IS NOT NULL;
UPDATE supply_products SET category = NULL WHERE category IS NOT NULL AND category NOT IN (SELECT slug FROM supply_categories);
ALTER TABLE supply_products ADD CONSTRAINT fk_supply_category FOREIGN KEY (category) REFERENCES supply_categories(slug);

CREATE TABLE supply_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES supply_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50),                   -- Home, Shop, Job site
    recipient VARCHAR(150),
    phone VARCHAR(20),
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'US',
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);

CREATE TABLE supply_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id),             -- contractor cart linked to a job
    status VARCHAR(20) NOT NULL DEFAULT 'open',  -- open | checked_out | abandoned
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_one_open_cart ON supply_carts(user_id, COALESCE(job_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE status='open';

CREATE TABLE supply_cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES supply_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES supply_products(id),
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price DECIMAL(10,2) NOT NULL,           -- snapshot at add time
    parts_request_id UUID,                       -- set when the line came from a contractor's parts request
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- orders
CREATE SEQUENCE supply_order_seq START 88001;
ALTER TABLE supply_orders
    ADD COLUMN order_number VARCHAR(20) UNIQUE,
    ADD COLUMN payment_method VARCHAR(10) NOT NULL DEFAULT 'card',   -- card | cash
    ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id),
    ADD COLUMN subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN address JSONB NOT NULL DEFAULT '{}',                  -- snapshot
    ADD COLUMN job_id UUID REFERENCES jobs(id),
    ADD COLUMN parts_request_id UUID,
    ADD COLUMN payer_id UUID REFERENCES users(id),                  -- who pays (may differ from user_id for job parts)
    ADD COLUMN tracking_number VARCHAR(100),
    ADD COLUMN courier_name VARCHAR(100),
    ADD COLUMN courier_phone VARCHAR(30),
    ADD COLUMN eta_at TIMESTAMPTZ,
    ADD COLUMN packed_at TIMESTAMPTZ,
    ADD COLUMN shipped_at TIMESTAMPTZ,
    ADD COLUMN delivered_at TIMESTAMPTZ,
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN cancel_reason TEXT,
    ADD COLUMN report_reason TEXT,
    ADD COLUMN reported_at TIMESTAMPTZ,
    ADD COLUMN paid_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE OR REPLACE FUNCTION set_order_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN NEW.order_number := 'MS-' || nextval('supply_order_seq'); END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_order_number BEFORE INSERT ON supply_orders FOR EACH ROW EXECUTE FUNCTION set_order_number();
UPDATE supply_orders SET order_number = 'MS-' || nextval('supply_order_seq') WHERE order_number IS NULL;
ALTER TABLE supply_order_items ADD COLUMN product_name VARCHAR(255), ADD COLUMN product_image TEXT;
CREATE INDEX idx_supply_orders_status ON supply_orders(status);
CREATE INDEX idx_supply_orders_job ON supply_orders(job_id);

-- job-linked parts request: who pays
CREATE TABLE job_parts_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES users(id),
    consumer_id UUID NOT NULL REFERENCES users(id),
    pay_mode VARCHAR(20) NOT NULL,               -- contractor | customer_cart | customer_account
    items JSONB NOT NULL,                        -- snapshot [{product_id, name, qty, unit_price, amount}]
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_customer',   -- pending_customer | paid | approved | declined | cancelled
    order_id UUID REFERENCES supply_orders(id),
    reminded_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_parts_requests_job ON job_parts_requests(job_id);
ALTER TABLE supply_cart_items ADD CONSTRAINT fk_cart_parts FOREIGN KEY (parts_request_id) REFERENCES job_parts_requests(id) ON DELETE SET NULL;
ALTER TABLE supply_orders ADD CONSTRAINT fk_order_parts FOREIGN KEY (parts_request_id) REFERENCES job_parts_requests(id);

-- invoice line for "charge customer's account" parts
ALTER TABLE invoices ADD COLUMN line_type VARCHAR(20) DEFAULT 'job';   -- job | parts | mrcare | inspection

-- seed products
INSERT INTO supply_products (sku, name, description, category, price, image_url, is_top_seller, in_stock, stock_qty, compatible_types, specs) VALUES
 ('LV-AL-12',  'Aluminum louver blade 12 ft',   'Replacement louver blade, powder-coated aluminum, 12 ft', 'louvers', 89.00,  NULL, TRUE,  TRUE, 120, '{louvered}', '{"length_ft":12,"finish":"powder-coated"}'),
 ('LV-AL-10',  'Aluminum louver blade 10 ft',   'Replacement louver blade, 10 ft',                          'louvers', 76.00,  NULL, FALSE, TRUE, 90,  '{louvered}', '{"length_ft":10}'),
 ('LV-SEAL',   'Louver rubber seal kit',        'Weather seals for 10 blades',                              'louvers', 34.50,  NULL, FALSE, TRUE, 300, '{louvered}', '{}'),
 ('MT-RS100',  'Louver motor 100 Nm',           'Tubular motor with encoder, 100 Nm',                       'motors',  349.00, NULL, TRUE,  TRUE, 25,  '{louvered,retractable}', '{"torque_nm":100}'),
 ('MT-REMOTE', 'RF remote 5-channel',           'Hand remote for motors, 5 channels',                       'motors',  59.00,  NULL, TRUE,  TRUE, 80,  '{louvered,retractable}', '{}'),
 ('MT-RAIN',   'Rain sensor',                   'Closes louvers automatically on rain',                     'motors',  79.00,  NULL, FALSE, TRUE, 40,  '{louvered}', '{}'),
 ('MT-HUB',    'Smart hub (Wi-Fi)',             'App control for motors and lights',                        'motors',  129.00, NULL, FALSE, TRUE, 30,  '{any}', '{}'),
 ('LT-LED-5M', 'LED strip kit 5 m',             'Dimmable warm-white LED strip with driver (mount only)',   'lighting', 119.00, NULL, TRUE, TRUE, 60,  '{any}', '{"length_m":5,"color":"warm white"}'),
 ('LT-SPOT-4', 'Recessed spotlights ×4',        'Beam-mounted spots, 4 pack',                               'lighting', 149.00, NULL, FALSE, TRUE, 35, '{any}', '{}'),
 ('PB-POST-9', 'Aluminum post 9 ft',            '4×4 in aluminum post, 9 ft, with base plate',              'posts',   189.00, NULL, FALSE, TRUE, 40,  '{any}', '{"height_ft":9}'),
 ('PB-BEAM-12','Gutter beam 12 ft',             'Main beam with integrated gutter, 12 ft',                  'posts',   249.00, NULL, FALSE, TRUE, 20,  '{louvered,fixed_roof}', '{"length_ft":12}'),
 ('HW-BRKT',   'Wall bracket set',              'Ledger brackets ×4 with stainless fasteners',              'hardware', 64.00, NULL, TRUE,  TRUE, 150, '{any}', '{}'),
 ('HW-ANCHOR', 'Concrete anchor kit',           'Wedge anchors ×16 for post base plates',                   'hardware', 28.00, NULL, FALSE, TRUE, 200, '{any}', '{}'),
 ('HW-GUTTER', 'Downspout kit',                 'Post-integrated downspout with outlet',                    'hardware', 46.00, NULL, FALSE, TRUE, 70,  '{louvered,fixed_roof}', '{}')
ON CONFLICT (sku) DO NOTHING;
