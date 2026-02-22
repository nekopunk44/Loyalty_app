-- ==================== Initial Database Schema ====================
-- PostgreSQL migration for Loyalty App
-- Created: 2025-12-23

-- ==================== Users Table ====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  address TEXT,
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin'
  loyalty_points INTEGER DEFAULT 0,
  membership_level VARCHAR(50) DEFAULT 'Bronze', -- 'Bronze', 'Silver', 'Gold', 'Platinum'
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);

-- ==================== Properties Table ====================
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price VARCHAR(50),
  price_number INTEGER,
  rooms INTEGER,
  guests INTEGER,
  amenities JSONB DEFAULT '[]',
  image VARCHAR(500),
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'unavailable'
  location VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_name ON properties(name);

-- ==================== Bookings Table ====================
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  check_in_date VARCHAR(50) NOT NULL,
  check_out_date VARCHAR(50) NOT NULL,
  guests INTEGER NOT NULL,
  notes TEXT DEFAULT '',
  sauna_hours INTEGER DEFAULT 0,
  kitchenware BOOLEAN DEFAULT false,
  total_price DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_check_in ON bookings(check_in_date);
CREATE INDEX idx_bookings_sauna_hours ON bookings(sauna_hours);
CREATE INDEX idx_bookings_kitchenware ON bookings(kitchenware);

-- ==================== Loyalty Cards Table ====================
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  cashback_rate DECIMAL(5,2) DEFAULT 5,
  total_spent DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  membership_level VARCHAR(50) DEFAULT 'Bronze',
  card_number VARCHAR(50),
  expiry_date VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_cards_user_id ON loyalty_cards(user_id);
CREATE INDEX idx_loyalty_cards_membership ON loyalty_cards(membership_level);

-- ==================== Transactions Table ====================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  booking_id INTEGER,
  type VARCHAR(20) NOT NULL, -- 'debit', 'credit'
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);

-- ==================== Reviews Table ====================
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  property_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  booking_id INTEGER,
  rating DECIMAL(3,2) NOT NULL,
  title VARCHAR(255),
  text TEXT,
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_property_id ON reviews(property_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);

-- ==================== Payments Table ====================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  booking_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ==================== Events Table ====================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  location VARCHAR(255),
  image_url VARCHAR(500),
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'cancelled'
  prize VARCHAR(255),
  allowed_users VARCHAR(50) DEFAULT 'all',
  event_type VARCHAR(50) DEFAULT 'auction',
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_category ON events(category);

-- ==================== Notifications Table ====================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'booking', 'loyalty', 'payment', 'system'
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ==================== Referrals Table ====================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id VARCHAR(255) NOT NULL,
  referred_id VARCHAR(255) NOT NULL,
  bonus_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ==================== Create Views ====================

-- View for user loyalty summary
CREATE OR REPLACE VIEW user_loyalty_summary AS
SELECT 
  u.user_id,
  u.display_name,
  u.email,
  lc.balance,
  lc.total_spent,
  lc.total_earned,
  lc.membership_level,
  COUNT(DISTINCT b.id) as total_bookings,
  COALESCE(AVG(r.rating), 0) as avg_rating
FROM users u
LEFT JOIN loyalty_cards lc ON u.user_id = lc.user_id
LEFT JOIN bookings b ON u.user_id = b.user_id AND b.status = 'confirmed'
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id, u.display_name, u.email, lc.balance, lc.total_spent, lc.total_earned, lc.membership_level;

-- View for property statistics
CREATE OR REPLACE VIEW property_stats AS
SELECT 
  p.id,
  p.name,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END), 0) as total_revenue
FROM properties p
LEFT JOIN bookings b ON p.id = CAST(b.property_id AS VARCHAR)
LEFT JOIN reviews r ON p.id = CAST(r.property_id AS VARCHAR)
GROUP BY p.id, p.name;
