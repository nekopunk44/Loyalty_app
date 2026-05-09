import { Platform } from 'react-native';

// ======================================================================
// Конфигурация API URL
// ======================================================================
// Для ФИЗИЧЕСКОГО устройства в локальной сети:
//   Установите IP вашего компьютера ниже (ipconfig / ifconfig)
// Для PRODUCTION:
//   Установите реальный URL сервера
// ======================================================================

// 🔧 Настройте IP вашего компьютера (для физических устройств)
const LOCAL_MACHINE_IP = '192.168.0.106';

// 🌐 Production URL (когда сервер развёрнут)
const PRODUCTION_API_URL = null; // Пример: 'https://api.villajaconda.com/api'

const API_PORT = 5002;

/**
 * Получить правильный API URL для текущей платформы
 * - На Android эмуляторе: 10.0.2.2 (специальный IP для host machine)
 * - На iOS симуляторе: localhost
 * - На физическом устройстве: IP компьютера в локальной сети
 * - В production: реальный URL сервера
 */
export const getApiUrl = () => {
  // Если задана переменная окружения — приоритет
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Production URL, если настроен
  if (PRODUCTION_API_URL) {
    return PRODUCTION_API_URL;
  }

  // Development — определяем URL по платформе
  if (Platform.OS === 'android') {
    // На Android эмуляторе (используем 10.0.2.2 для обхода блокировки HTTP и связи с host)
    // Если тестируете на реальном Android-устройстве, раскомментируйте строку с LOCAL_MACHINE_IP
    if (__DEV__) {
      return `http://10.0.2.2:${API_PORT}/api`;
      // return `http://${LOCAL_MACHINE_IP}:${API_PORT}/api`; 
    }
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  if (Platform.OS === 'ios') {
    if (__DEV__) {
      // На физическом iOS устройстве localhost не работает
      return `http://${LOCAL_MACHINE_IP}:${API_PORT}/api`;
    }
    return `http://localhost:${API_PORT}/api`;
  }

  // Web и другие платформы
  return `http://localhost:${API_PORT}/api`;
};
