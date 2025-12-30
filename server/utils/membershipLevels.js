/**
 * Иерархия уровней лояльности. Используется и для пермиссий событий,
 * и для уровневых множителей.
 *
 * Семантика allowedUsers='silver' в Event = «Silver И ВЫШЕ» (Stage 2 ВКР).
 * До Stage 2 эта же строка означала «только Silver» — поведение изменилось
 * сознательно (см. §2.2). Прод-данных с уровневой адресацией не было, ломать
 * нечего.
 */

const LEVEL_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const LEVEL_RANK = LEVEL_ORDER.reduce((acc, lvl, i) => {
  acc[lvl] = i;
  acc[lvl.toLowerCase()] = i;
  return acc;
}, {});

/**
 * @param {string} userLevel     — 'Bronze' | 'Silver' | ... (или lowercase)
 * @param {string} requiredLevel — что указано в Event.allowedUsers ('silver', 'gold', ...)
 * @returns {boolean} true если пользователь дотягивает до требуемого уровня.
 *
 * 'all' разрешает всем. Неизвестный уровень → false (fail-closed).
 */
function userMeetsLevelRequirement(userLevel, requiredLevel) {
  if (!requiredLevel || requiredLevel === 'all') return true;
  if (!userLevel) return false;

  const need = LEVEL_RANK[requiredLevel] ?? LEVEL_RANK[String(requiredLevel).toLowerCase()];
  const have = LEVEL_RANK[userLevel]     ?? LEVEL_RANK[String(userLevel).toLowerCase()];

  if (need === undefined || have === undefined) return false;
  return have >= need;
}

module.exports = {
  LEVEL_ORDER,
  LEVEL_RANK,
  userMeetsLevelRequirement,
};
