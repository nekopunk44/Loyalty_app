/**
 * Конфигурация программы лояльности.
 * Ставки кэшбека и пороги уровней редактируются здесь — без деплоя кода.
 */

const CASHBACK_RATES = {
  Bronze:   0.03,
  Silver:   0.05,
  Gold:     0.07,
  Platinum: 0.10,
};

// Множитель кэшбека в день рождения
const BIRTHDAY_MULTIPLIER = {
  Bronze:   1.5,
  Silver:   2.0,
  Gold:     2.0,
  Platinum: 2.0,
};

// Порядок уровней для сравнения (меньше = ниже)
const LEVEL_ORDER = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3 };

// Порог (totalSpent в PRB) для перехода на следующий уровень
const LEVEL_THRESHOLDS = {
  Bronze:   0,
  Silver:   10000,
  Gold:     50000,
  Platinum: 200000,
};

const DEFAULT_CASHBACK_RATE = CASHBACK_RATES.Bronze;

module.exports = { CASHBACK_RATES, BIRTHDAY_MULTIPLIER, LEVEL_ORDER, LEVEL_THRESHOLDS, DEFAULT_CASHBACK_RATE };
