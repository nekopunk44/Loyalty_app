/**
 * Функция для правильного склонения русских слов в зависимости от числа
 * @param {number} count - Количество
 * @param {string} one - Форма для 1 (например: "новое")
 * @param {string} two - Форма для 2-4 (например: "новых")
 * @param {string} many - Форма для 5+ (например: "новых")
 * @returns {string} - Правильная форма слова
 */
export const pluralize = (count, one, two, many) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }

  if (lastDigit === 1) {
    return one;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return two;
  }

  return many;
};

/**
 * Примеры использования:
 * 
 * pluralize(1, 'новое', 'новых', 'новых') // "новое"
 * pluralize(2, 'новое', 'новых', 'новых') // "новых"
 * pluralize(3, 'новое', 'новых', 'новых') // "новых"
 * pluralize(5, 'новое', 'новых', 'новых') // "новых"
 * pluralize(11, 'новое', 'новых', 'новых') // "новых"
 * pluralize(21, 'новое', 'новых', 'новых') // "новое"
 * 
 * pluralize(1, 'сообщение', 'сообщения', 'сообщений') // "сообщение"
 * pluralize(2, 'сообщение', 'сообщения', 'сообщений') // "сообщения"
 * pluralize(5, 'сообщение', 'сообщения', 'сообщений') // "сообщений"
 */
