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
    background: '#F8F9FA',     // Очень светлый серый
    cardBg: '#FFFFFF',         // Белый
    text: '#1F2937',           // Почти чёрный
    textSecondary: '#6B7280',  // Средний серый
    success: '#10B981',        // Зелёный
    danger: '#EF4444',         // Красный
    border: '#E5E7EB',         // Светлая граница
    shadow: '#00000020',       // Полупрозрачная тень
  },
};

// Dark theme - оптимизирован для тёмного режима
export const darkTheme = {
  colors: {
    primary: '#FF7D50',        // Немного светлее для тёмного фона
    primaryLight: '#FFC85F',   // Ярче
    secondary: '#4A90E2',      // Светлее синий
    accent: '#FFB347',         // Светлый оранжевый
    background: '#0F172A',     // Очень тёмный фон
    cardBg: '#1E293B',         // Тёмная карточка
    text: '#F1F5F9',           // Очень светлый текст
    textSecondary: '#CBD5E1',  // Светлый вторичный текст
    success: '#34D399',        // Яркий зелёный
    danger: '#F87171',         // Яркий красный
    border: '#334155',         // Тёмная граница
    shadow: '#00000050',       // Более видимая тень в тёмном режиме
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Load theme preference
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@theme_mode');
        if (saved) {
          setIsDark(saved === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
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
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme: currentTheme }}>
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
