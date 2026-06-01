-- NEXAA Database Schema for Supabase
-- Región de Ñuble, Chile

-- ========================
-- NEWS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  summary TEXT,
  content TEXT,
  image_url TEXT,
  source_url TEXT,
  source_name VARCHAR(200),
  category VARCHAR(50) NOT NULL DEFAULT 'Regional',
  comuna VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_breaking BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  ai_generated BOOLEAN DEFAULT false,
  shared_to_social BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  views INTEGER DEFAULT 0,
  slug VARCHAR(200) UNIQUE NOT NULL
);

CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_comuna ON news(comuna);
CREATE INDEX idx_news_published ON news(is_published, is_approved);
CREATE INDEX idx_news_featured ON news(is_featured);
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_views ON news(views DESC);

-- ========================
-- PHOTOS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(300),
  description TEXT,
  image_url TEXT NOT NULL,
  photographer VARCHAR(200),
  photographer_email VARCHAR(200),
  comuna VARCHAR(100),
  category VARCHAR(50) DEFAULT 'General',
  likes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_approved ON photos(is_approved);
CREATE INDEX idx_photos_featured ON photos(is_featured);

-- ========================
-- CATEGORIES TABLE
-- ========================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50)
);

INSERT INTO categories (name, slug, icon) VALUES
  ('Política', 'politica', 'account_balance'),
  ('Emergencias', 'emergencias', 'warning'),
  ('Deportes', 'deportes', 'sports_soccer'),
  ('Subsidios', 'subsidios', 'savings'),
  ('Tránsito', 'transito', 'directions_car'),
  ('Clima', 'clima', 'cloud'),
  ('Turismo', 'turismo', 'hiking'),
  ('Economía', 'economia', 'trending_up'),
  ('Cultura', 'cultura', 'theater_comedy'),
  ('Social', 'social', 'groups'),
  ('Reportajes', 'reportajes', 'auto_stories')
ON CONFLICT (slug) DO NOTHING;

-- ========================
-- COMUNAS TABLE (Ñuble Region)
-- ========================
CREATE TABLE IF NOT EXISTS comunas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  region VARCHAR(100) DEFAULT 'Ñuble'
);

INSERT INTO comunas (name, slug) VALUES
  ('Chillán', 'chillan'),
  ('Chillán Viejo', 'chillan-viejo'),
  ('San Carlos', 'san-carlos'),
  ('Bulnes', 'bulnes'),
  ('Pinto', 'pinto'),
  ('Cobquecura', 'cobquecura'),
  ('Quillón', 'quillon'),
  ('Coihueco', 'coihueco'),
  ('Coelemu', 'coelemu'),
  ('El Carmen', 'el-carmen'),
  ('Ninhue', 'ninhue'),
  ('Ñiquén', 'niquen'),
  ('Pemuco', 'pemuco'),
  ('Portezuelo', 'portezuelo'),
  ('Quirihue', 'quirihue'),
  ('Ránquil', 'ranquil'),
  ('San Fabián', 'san-fabian'),
  ('San Ignacio', 'san-ignacio'),
  ('San Nicolás', 'san-nicolas'),
  ('Treguaco', 'treguaco'),
  ('Yungay', 'yungay')
ON CONFLICT (slug) DO NOTHING;

-- ========================
-- ADS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(50) NOT NULL,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- USER SUBMISSIONS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS user_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) CHECK (type IN ('photo', 'news_tip', 'error_report')) NOT NULL,
  content TEXT,
  image_url TEXT,
  user_name VARCHAR(200),
  user_email VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- NEWS INBOX TABLE (RSS ingestion without IA)
-- ========================
CREATE TABLE IF NOT EXISTS news_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  source VARCHAR(200) NOT NULL,
  source_url TEXT,
  image_url TEXT,
  summary TEXT,
  content TEXT,
  category VARCHAR(50) DEFAULT 'Regional',
  comuna VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ignored', 'published')),
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of UUID REFERENCES news_inbox(id),
  published_news_id UUID REFERENCES news(id),
  detected_at TIMESTAMPTZ DEFAULT now(),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_news_inbox_status ON news_inbox(status);
CREATE INDEX idx_news_inbox_detected_at ON news_inbox(detected_at DESC);
CREATE INDEX idx_news_inbox_source ON news_inbox(source);

-- ========================
-- SOCIAL SHARES TABLE (for analytics)
-- ========================
CREATE TABLE IF NOT EXISTS social_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES news(id) ON DELETE CASCADE,
  platform VARCHAR(20),
  shared_at TIMESTAMPTZ DEFAULT now()
);

-- ========================
-- TRIGGER for updated_at
-- ========================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_news_updated_at') THEN
    CREATE TRIGGER set_news_updated_at
      BEFORE UPDATE ON news
      FOR EACH ROW
      EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END;
$$;

-- ========================
-- RLS POLICIES
-- ========================
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE news_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to inbox" ON news_inbox
  FOR ALL USING (auth.role() = 'authenticated');

-- Public read access for published content
CREATE POLICY "Public can read published news" ON news
  FOR SELECT USING (is_published = true AND is_approved = true);

CREATE POLICY "Public can read approved photos" ON photos
  FOR SELECT USING (is_approved = true);

-- Authenticated admin full access
CREATE POLICY "Admins have full access to news" ON news
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to photos" ON photos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins have full access to ads" ON ads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can read submissions" ON user_submissions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anyone can insert submissions
CREATE POLICY "Anyone can submit" ON user_submissions
  FOR INSERT WITH CHECK (true);
