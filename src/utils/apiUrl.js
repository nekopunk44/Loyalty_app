import { Platform } from 'react-native';

/**
 * Получить правильный API URL для текущей платформы
 * На Android эмуляторе используем 10.0.2.2 вместо localhost
 * На физических устройствах используем IP адрес машины
 */
export const getApiUrl = () => {
  // Если задана переменная окружения - используем её
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Android эмулятор - специальный IP для доступа к host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5002/api';
  }

  // iOS эмулятор и другие платформы
  return 'http://localhost:5002/api';
};
