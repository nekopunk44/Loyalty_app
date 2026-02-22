-- ==================== Payment System Migration ====================
-- PostgreSQL migration for Loyalty App Payment System
-- Created: 2026-01-11

-- ==================== Add Admin Level to Users ====================
-- admin_level: NULL = обычный пользователь
--              1 = админ с полным доступом (включая финансы)
--              2 = админ без доступа к финансам
ALTER TABLE users
ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT NULL
COMMENT 'admin_level: 1 = финансовый администратор, 2 = обычный администратор';

CREATE INDEX IF NOT EXISTS idx_users_admin_level ON users(admin_level) WHERE admin_level IS NOT NULL;

-- ==================== Update Payments Table ====================
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS fund_manager_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'booking', -- 'booking', 'topup', 'refund'
ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_fund_manager_id ON payments(fund_manager_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);

-- ==================== Create Card TopUp Transactions Table ====================
CREATE TABLE IF NOT EXISTS card_topups (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'crypto', etc.
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  transaction_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_card_topups_user_id ON card_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_card_topups_status ON card_topups(status);

-- ==================== Create Admin Wallet Table ====================
-- Аккаунт администратора для получения денег от платежей
CREATE TABLE IF NOT EXISTS admin_wallets (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(255) UNIQUE NOT NULL,
  admin_level INTEGER NOT NULL,
  total_balance DECIMAL(12,2) DEFAULT 0,
  available_balance DECIMAL(12,2) DEFAULT 0,
  pending_balance DECIMAL(12,2) DEFAULT 0,
  total_received DECIMAL(12,2) DEFAULT 0,
  total_withdrawn DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_wallets_admin_id ON admin_wallets(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_wallets_admin_level ON admin_wallets(admin_level);

-- ==================== Create Admin Transactions Table ====================
-- История всех транзакций администратора
CREATE TABLE IF NOT EXISTS admin_transactions (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(255) NOT NULL,
  admin_level INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'booking_payment', 'topup_commission', 'withdrawal', 'refund', 'adjustment'
  amount DECIMAL(10,2) NOT NULL,
  booking_id INTEGER,
  payment_id INTEGER,
  description TEXT,
  balance_before DECIMAL(12,2),
  balance_after DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_transactions_admin_id ON admin_transactions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_type ON admin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_created_at ON admin_transactions(created_at);

-- ==================== Create Withdrawal Requests Table ====================
-- Запросы на вывод денег администратором
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(255) NOT NULL,
  admin_level INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  bank_account VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'completed', 'rejected'
  approved_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_admin_id ON withdrawal_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- ==================== Update Transactions Table for New Fields ====================
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_id INTEGER,
ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);

-- ==================== Create Views ====================
-- View for Admin Finance Summary
CREATE OR REPLACE VIEW admin_finance_summary AS
SELECT 
  aw.admin_id,
  aw.admin_level,
  aw.total_balance,
  aw.available_balance,
  aw.pending_balance,
  aw.total_received,
  aw.total_withdrawn,
  (
    SELECT COUNT(*) FROM admin_transactions 
    WHERE admin_id = aw.admin_id AND type = 'booking_payment'
  ) as booking_payments_count,
  (
    SELECT SUM(amount) FROM admin_transactions 
    WHERE admin_id = aw.admin_id AND type = 'booking_payment'
  ) as total_booking_earnings,
  (
    SELECT COUNT(*) FROM withdrawal_requests 
    WHERE admin_id = aw.admin_id AND status = 'pending'
  ) as pending_withdrawals
FROM admin_wallets aw;

GRANT SELECT ON admin_finance_summary TO PUBLIC;
