-- ==================== Performance Indexes ====================
-- Индексы для часто используемых запросов.
-- Все CREATE INDEX CONCURRENTLY — без блокировки таблицы.
-- Идемпотентны: IF NOT EXISTS.

-- bookings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_id
  ON bookings ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_property_id
  ON bookings ("propertyId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status
  ON bookings (status);

-- Составной индекс для запросов "занятые даты объекта"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_property_status
  ON bookings ("propertyId", status);

-- transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id
  ON transactions ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at
  ON transactions ("createdAt" DESC);

-- card_top_ups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_card_top_ups_user_id
  ON card_top_ups ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_card_top_ups_transaction_id
  ON card_top_ups ("transactionId");

-- notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
  ON notifications ("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read
  ON notifications ("userId", read);

-- payments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_booking_id
  ON payments ("bookingId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id
  ON payments ("userId");

-- referrals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_id
  ON referrals ("referrerId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_code
  ON referrals ("referralCode");

-- loyalty_cards
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_cards_user_id
  ON loyalty_cards ("userId");

-- admin_transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_transactions_admin_id
  ON admin_transactions ("adminId");

-- withdrawal_requests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdrawal_requests_admin_id
  ON withdrawal_requests ("adminId");
