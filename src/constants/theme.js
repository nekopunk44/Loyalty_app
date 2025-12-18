// Theme and color constants for the app
export const colors = {
  // Светлая тема
  light: {
    background: '#F8F9FA',
    cardBg: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
  },
  // Темная тема
  dark: {
    background: '#0F172A',
    cardBg: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    border: '#334155',
  },
  
  // Основные цвета
  primary: '#FF6B35',        // Яркий оранжевый (основной)
  primaryLight: '#FFB400',   // Светлый оранжевый
  secondary: '#004E89',      // Глубокий синий
  accent: '#F7931E',         // Золотой оранжевый
  
  // Дополнительные цвета для событий
  eventPurple: '#8B5CF6',    // Фиолетовый
  eventTeal: '#14B8A6',      // Бирюзовый
  eventRose: '#EC4899',      // Розовый
  eventCyan: '#06B6D4',      // Голубой
  
  // Фоны и тексты
  background: '#F8F9FA',     // Очень светлый серый (для светлого режима)
  cardBg: '#FFFFFF',         // Белый (для светлого режима)
  text: '#1F2937',           // Почти чёрный (для светлого режима)
  textSecondary: '#6B7280',  // Средний серый
  
  // Статус и действия
  success: '#10B981',        // Зелёный
  danger: '#EF4444',         // Красный
  warning: '#F59E0B',        // Жёлтый
  
  // Интерфейс
  border: '#E5E7EB',         // Светлая граница (для светлого режима)
  shadow: '#00000020',       // Полупрозрачная тень
};

// Dark theme colors (используется в темном режиме)
export const darkColors = {
  // Основные цвета
  primary: '#FF7D50',        // Немного светлее для тёмного фона
  primaryLight: '#FFC85F',   // Ярче
  secondary: '#4A90E2',      // Светлее синий
  accent: '#FFB347',         // Светлый оранжевый
  
  // Дополнительные цвета для событий
  eventPurple: '#A78BFA',    // Светлый фиолетовый
  eventTeal: '#2DD4BF',      // Светлый бирюзовый
  eventRose: '#F472B6',      // Светлый розовый
  eventCyan: '#22D3EE',      // Светлый голубой
  
  // Фоны и тексты
  background: '#0F172A',     // Очень тёмный фон
  cardBg: '#1E293B',         // Тёмная карточка
  text: '#F1F5F9',           // Очень светлый текст
  textSecondary: '#CBD5E1',  // Светлый вторичный текст
  
  // Статус и действия
  success: '#34D399',        // Яркий зелёный
  danger: '#F87171',         // Яркий красный
  warning: '#FBBF24',        // Яркий жёлтый
  
  // Интерфейс
  border: '#334155',         // Тёмная граница
  shadow: '#00000050',       // Более видимая тень в тёмном режиме
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};
