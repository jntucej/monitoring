-- College configuration table (singleton row)
CREATE TABLE IF NOT EXISTS config_college_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    address TEXT,
    logo TEXT,                           -- URL or emoji
    accreditation TEXT,
    website TEXT,
    principal TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with current hard-coded values
INSERT INTO config_college_info (name, short_name, address, logo, accreditation, website, principal)
VALUES (
    'JNTUH CEJ',
    'JNTUH CEJ',
    'JNTUH CEJ, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501',
    '🏛️',
    'NAAC A+ Grade',
    'https://jntuhcej.ac.in/',
    'Dr. G. Narsimha'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    address = EXCLUDED.address,
    logo = EXCLUDED.logo,
    accreditation = EXCLUDED.accreditation,
    website = EXCLUDED.website,
    principal = EXCLUDED.principal,
    updated_at = NOW();

-- RLS: Public read, admin write
ALTER TABLE config_college_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY college_info_select ON config_college_info FOR SELECT TO authenticated USING (true);
CREATE POLICY college_info_select_anon ON config_college_info FOR SELECT TO anon USING (true);
CREATE POLICY college_info_manage ON config_college_info FOR ALL TO authenticated USING (is_admin(auth.uid()));
