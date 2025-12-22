// Утилита для получения стиля события по его типу
export const getEventStyleByType = (eventType, colors) => {
  const eventStyles = {
    auction: {
      icon: 'gavel',
      color: '#FF6B35',  // Оранжевый
      label: 'Аукцион'
    },
    cashback: {
      icon: 'trending-up',
      color: '#14B8A6',  // Бирюзовый
      label: 'Кешбек'
    },
    giveaway: {
      icon: 'card-giftcard',
      color: '#10B981',  // Зелёный
      label: 'Розыгрыш'
    },
    promotion: {
      icon: 'local-fire-department',
      color: '#EF4444',  // Красный
      label: 'Акция'
    },
    discount: {
      icon: 'local-offer',
      color: '#EC4899',  // Розовый
      label: 'Скидка'
    },
    special: {
      icon: 'stars',
      color: '#8B5CF6',  // Фиолетовый
      label: 'Специальное'
    },
    default: {
      icon: 'event',
      color: '#004E89',  // Синий
      label: 'Событие'
    }
  };

  return eventStyles[eventType] || eventStyles.default;
};

// Получить все доступные типы событий
export const getAllEventTypes = () => [
  { value: 'auction', label: 'Аукцион', icon: 'gavel', color: '#FF6B35' },
  { value: 'cashback', label: 'Кешбек', icon: 'trending-up', color: '#14B8A6' },
  { value: 'giveaway', label: 'Розыгрыш', icon: 'card-giftcard', color: '#10B981' },
  { value: 'promotion', label: 'Акция', icon: 'local-fire-department', color: '#EF4444' },
  { value: 'discount', label: 'Скидка', icon: 'local-offer', color: '#EC4899' },
  { value: 'special', label: 'Специальное', icon: 'stars', color: '#8B5CF6' },
];
