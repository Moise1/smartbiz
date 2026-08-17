-- Smartbiz.ai initial database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'business_owner', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) UNIQUE NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Businesses
CREATE TABLE IF NOT EXISTS businesses (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  phone       VARCHAR(30),
  email       VARCHAR(255),
  website     VARCHAR(255),
  address     TEXT,
  city        VARCHAR(100) NOT NULL DEFAULT 'Kigali',
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business images
CREATE TABLE IF NOT EXISTS business_images (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Seed categories
INSERT INTO categories (name, description, icon) VALUES
  ('Restaurants & Cafes',    'Food and beverage establishments',      'utensils'),
  ('Retail & Shops',         'Clothing, electronics, and general stores', 'shopping-bag'),
  ('Health & Wellness',      'Clinics, pharmacies, and fitness centers', 'heart'),
  ('Beauty & Personal Care', 'Salons, barbershops, and spas',         'scissors'),
  ('Education & Training',   'Schools, tutors, and skill centers',    'book'),
  ('Transport & Logistics',  'Taxis, delivery, and moving services',  'truck'),
  ('Technology & IT',        'Tech repair, software, and IT services','cpu'),
  ('Finance & Insurance',    'Banks, MFIs, and insurance agents',     'landmark'),
  ('Construction & Real Estate', 'Builders, architects, and agents',  'building'),
  ('Events & Entertainment', 'Venues, photographers, and DJs',        'music')
ON CONFLICT (name) DO NOTHING;
