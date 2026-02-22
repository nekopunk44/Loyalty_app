import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Light theme
export const lightTheme = {
  colors: {
    primary: '#FF6B35',        // Яркий оранжевый
    primaryLight: '#FFB400',   // Светлый оранжевый
    secondary: '#004E89',      // Глубокий синий
    accent: '#F7931E',         // Золотой оранжевый
    background: '#F8F9FA',     // Очень светлый серый (slate-50)
    cardBg: '#FFFFFF',         // Белый
    text: '#1F2937',           // Почти чёрный (gray-800)
    textSecondary: '#6B7280',  // Средний серый (gray-500)
    success: '#10B981',        // Зелёный
    danger: '#EF4444',         // Красный
    warning: '#F59E0B',        // Оранжевый
    border: '#E5E7EB',         // Светлая граница (gray-200)
    shadow: '#00000015',       // Полупрозрачная тень
    disabled: '#D1D5DB',       // Отключённые элементы (gray-300)
    overlay: '#FFFFFF99',      // Полупрозрачный оверлей
  },
};

// Dark theme - оптимизирован для тёмного режима
export const darkTheme = {
  colors: {
    primary: '#FF7D50',        // Немного светлее для тёмного фона
    primaryLight: '#FFC85F',   // Ярче
    secondary: '#5B9EFF',      // Светлее синий
    accent: '#FFB347',         // Светлый оранжевый
    background: '#0F172A',     // Очень тёмный фон (slate-900)
    cardBg: '#1E293B',         // Тёмная карточка (slate-800)
    text: '#F1F5F9',           // Очень светлый текст (slate-100)
    textSecondary: '#94A3B8',  // Светлый вторичный текст (slate-400)
    success: '#4ADE80',        // Яркий зелёный
    danger: '#F87171',         // Яркий красный
    warning: '#FBBF24',        // Жёлтый
    border: '#334155',         // Тёмная граница (slate-700)
    shadow: '#00000080',       // Более видимая тень в тёмном режиме
    disabled: '#475569',       // Отключённые элементы (slate-600)
    overlay: '#0F172A99',      // Полупрозрачный оверлей
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Load theme preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@theme_mode');
        if (saved) {
          setIsDark(saved === 'dark');
          console.log('🎨 Theme loaded:', saved);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsThemeLoaded(true);
      }
    })();
  }, []);

  // Save theme preference
  const toggleTheme = async () => {
    try {
      const newMode = !isDark ? 'dark' : 'light';
      await AsyncStorage.setItem('@theme_mode', newMode);
      setIsDark(!isDark);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme: currentTheme, isThemeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
