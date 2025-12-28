/**
 * Currency conversion service: PRB ↔ RUB / USD.
 *
 * Внутренняя валюта приложения — PRB (приднестровский рубль). Платёжные
 * провайдеры (Stripe, PayPal) принимают RUB/USD — поэтому при создании
 * сессии оплаты сумма из PRB конвертируется в валюту провайдера, а после
 * успешной оплаты курс пишется в card_topups.exchange_rate как аудит-трейл.
 *
 * Курсы задаются через env (PRB_RATE_RUB, PRB_RATE_USD) — 1 единица внешней
 * валюты = X PRB. Например, PRB_RATE_RUB=0.18 означает что 1 RUB = 0.18 PRB.
 * Хук на публичный API ПРБ (cbpmr.net) — TODO для production.
 */

const DEFAULTS = {
  RUB: 0.18,    // 1 RUB ≈ 0.18 PRB (примерно)
  USD: 16.10,   // 1 USD ≈ 16.10 PRB (примерно)
};

function getRate(currency) {
  const code = String(currency || '').toUpperCase();
  const envKey = `PRB_RATE_${code}`;
  const raw = process.env[envKey];
  if (raw) {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULTS[code] ?? null;
}

/**
 * Конвертирует сумму из PRB в указанную внешнюю валюту.
 * @returns {{ amount: number, rate: number, currency: string }}
 */
function convertFromPRB(amountPRB, targetCurrency) {
  const rate = getRate(targetCurrency);
  if (!rate) {
    throw new Error(`Unsupported currency: ${targetCurrency}`);
  }
  const amount = parseFloat((amountPRB / rate).toFixed(2));
  return { amount, rate, currency: targetCurrency.toUpperCase() };
}

/**
 * Конвертирует сумму из внешней валюты обратно в PRB
 * по сохранённому курсу (для webhook'ов — повторяемая операция).
 */
function convertToPRB(amount, currency, rate = null) {
  const useRate = rate ?? getRate(currency);
  if (!useRate) throw new Error(`Unsupported currency: ${currency}`);
  return parseFloat((amount * useRate).toFixed(2));
}

/**
 * Возвращает поддерживаемые валюты с актуальными курсами — для клиента,
 * чтобы показать пользователю «10 USD ≈ 161 PRB» до оплаты.
 */
function getSupportedCurrencies() {
  return ['RUB', 'USD'].map(code => ({
    code,
    rate: getRate(code),
  }));
}

module.exports = {
  convertFromPRB,
  convertToPRB,
  getRate,
  getSupportedCurrencies,
};
