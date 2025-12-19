/**
 * Конфигурация программы лояльности.
 * Ставки кэшбека и пороги уровней редактируются здесь — без деплоя кода.
 */

const CASHBACK_RATES = {
  Bronze:   0.10,
  Silver:   0.20,
  Gold:     0.30,
  Platinum: 0.40,
};

// Порог (totalSpent в PRB) для перехода на следующий уровень
const LEVEL_THRESHOLDS = {
  Bronze:   0,
  Silver:   10000,
  Gold:     50000,
  Platinum: 200000,
};

const DEFAULT_CASHBACK_RATE = CASHBACK_RATES.Bronze;

module.exports = { CASHBACK_RATES, LEVEL_THRESHOLDS, DEFAULT_CASHBACK_RATE };
