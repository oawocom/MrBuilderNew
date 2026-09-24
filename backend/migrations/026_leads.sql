-- 026: website lead forms (contractor waitlist, quick service request, partnership inquiry)
CREATE TABLE IF NOT EXISTS website_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('contractor','consumer','partner')),
  name TEXT, email TEXT, phone TEXT, company TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_website_leads_kind_created ON website_leads(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_email ON website_leads(lower(email));
INSERT INTO platform_settings (key, value, description) VALUES
 ('content_app_links', '{"consumer_ios":"","consumer_android":"","contractor_ios":"","contractor_android":""}', 'App Store / Google Play URLs shown on the website (empty = Coming soon)'),
 ('content_company', '{"legal_name":"MrBuilder","address":"","email":"hello@mrbuilder.com","tagline":"Connecting outdoor living installation, repair and service needs with the professionals who carry out the work."}', 'Company details for the website footer')
ON CONFLICT (key) DO NOTHING;
