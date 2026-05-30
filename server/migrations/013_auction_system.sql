-- ==================== Auction System ====================
-- Stage 2 ВКР: «Интеллектуальный аукцион» — поэтапная реализация описана
-- в §2.2/§3.1. До этой миграции eventType='auction' был чисто визуальным,
-- ставки нигде не хранились.
--
-- Семантика soft-lock (см. §3.1):
--   1. При ставке lockedBalance в loyalty_cards увеличивается на сумму.
--   2. При перебитии — у предыдущего лидера освобождается.
--   3. При закрытии (cron): у победителя списывается реальный balance,
--      у проигравших locked возвращается в доступный.
--
-- Created: 2026-05-30

-- ── 1. loyalty_cards.locked_balance ─────────────────────────────────────────
ALTER TABLE loyalty_cards
  ADD COLUMN IF NOT EXISTS locked_balance DECIMAL(12,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN loyalty_cards.locked_balance IS
  'Сумма PRB, заблокированная в активных аукционных ставках. Доступный баланс = balance - locked_balance.';

-- ── 2. Денормализация в events ──────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS current_bid           DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS current_bid_user_id   TEXT,
  ADD COLUMN IF NOT EXISTS winner_user_id        TEXT,
  ADD COLUMN IF NOT EXISTS closed_at             TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS min_bid_increment     DECIMAL(12,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS start_bid             DECIMAL(12,2);

COMMENT ON COLUMN events.current_bid IS
  'Текущая (высшая) ставка по аукциону. NULL если ставок не было.';
COMMENT ON COLUMN events.min_bid_increment IS
  'Минимальный шаг ставки в PRB. По умолчанию 100.';
COMMENT ON COLUMN events.start_bid IS
  'Стартовая цена аукциона. Первая ставка должна быть >= start_bid.';

-- ── 3. Таблица ставок ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_bids (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL,
  user_id     TEXT NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'outbid', 'won', 'returned', 'cancelled')),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE  auction_bids IS
  'История всех ставок по аукционам. Полный аудит для §3.5 ВКР.';
COMMENT ON COLUMN auction_bids.status IS
  'active=текущая высшая для юзера, outbid=перебита, won=победила, returned=освобождена при закрытии, cancelled=админ откатил.';

CREATE INDEX IF NOT EXISTS idx_auction_bids_event_user ON auction_bids (event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_event_active ON auction_bids (event_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_active  ON auction_bids (user_id)  WHERE status = 'active';
