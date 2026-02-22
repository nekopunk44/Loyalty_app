import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DatabaseService from '../services/DatabaseService';
import { getApiUrl } from '../utils/apiUrl';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER: '@user',
  USER_ID: '@user_id',
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const heartbeatIntervalRef = React.useRef(null);

  // Инициализация при загрузке приложения
  useEffect(() => {
    (async () => {
      try {
        console.log('🔄 Инициализация AuthContext с PostgreSQL API...');

        // ⚠️ Для разработки - требуем повторный вход при каждом старте
        // Раскомментируйте код ниже, чтобы отключить сохранение сессии
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (isDevelopment) {
          console.log('🔐 Режим разработки - требуем повторный вход');
          setIsLoading(false);
          return;
        }

        // Пытаемся восстановить сессию из AsyncStorage
        const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const savedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (savedToken && savedUser) {
          console.log('✅ Найдена сохранённая сессия');
          setAuthToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.warn('⚠️ Ошибка при восстановлении сессии:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Регистрация
  const register = async (email, password, displayName) => {
    setError('');
    setIsLoading(true);
    try {
      console.log('📝 Регистрация:', email);

      // Отправляем запрос на сервер
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      // Сохраняем токен и пользователя
      const userData = data.user;
      const token = data.token || userData.id;

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userData.id);

      setAuthToken(token);
      setUser(userData);
      setIsLoading(false);

      console.log('✅ Регистрация успешна:', userData.id);
      return true;
    } catch (e) {
      console.error('❌ Ошибка регистрации:', e);
      setError(e.message || 'Ошибка при регистрации');
      setIsLoading(false);
      return false;
    }
  };

  // Вход
  const login = async (email, password) => {
    setError('');
    setIsLoading(true);
    try {
      console.log('🔐 Вход:', email);

      // Реальный вход через API
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Неверный email или пароль');
      }

      // Сохраняем токен и пользователя
      const userData = data.user;
      const token = data.token || userData.id;

      console.log('🔐 Saving to AsyncStorage:', { userId: userData.id, token: token.substring(0, 20) + '...' });
      
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userData.id);

      console.log('✅ AsyncStorage saved');
      
      setAuthToken(token);
      setUser(userData);
      setIsLoading(false);

      console.log('✅ Вход успешен:', userData.id, 'роль:', userData.role);
      
      // Запускаем heartbeat для поддержания онлайн статуса
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Отправляем heartbeat каждые 10 секунд
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat(userData.id);
      }, 10000);
      
      return true;
    } catch (e) {
      console.error('❌ Ошибка входа:', e);
      setError(e.message || 'Ошибка при входе');
      setIsLoading(false);
      return false;
    }
  };

  // Отправить heartbeat для поддержания онлайн статуса
  const sendHeartbeat = async (userId) => {
    try {
      await fetch(`${getApiUrl()}/auth/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.warn('⚠️ Ошибка отправки heartbeat:', e);
      // Не выводим ошибку - это фоновый процесс
    }
  };

  // Выход
  const logout = async () => {
    try {
      console.log('🚪 Выход...');

      // Останавливаем heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Отправляем logout запрос на сервер
      if (user?.id) {
        try {
          await fetch(`${getApiUrl()}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (e) {
          console.warn('⚠️ Ошибка отправки logout запроса:', e);
        }
      }

      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);

      setAuthToken(null);
      setUser(null);
      setError('');

      console.log('✅ Выход успешен');
      return true;
    } catch (e) {
      console.error('❌ Ошибка выхода:', e);
      return false;
    }
  };

  // Обновить профиль пользователя
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('Пользователь не авторизован');

      const updatedUser = await DatabaseService.updateUser(user.id, updates);

      const newUser = { ...user, ...updatedUser };
      setUser(newUser);

      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));

      console.log('✅ Профиль обновлён');
      return newUser;
    } catch (e) {
      console.error('❌ Ошибка обновления профиля:', e);
      throw e;
    }
  };

  // Забыли пароль
  const resetPassword = async (email) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка сброса пароля');
      }

      console.log('✅ Письмо со сбросом пароля отправлено');
      return true;
    } catch (e) {
      console.error('❌ Ошибка сброса пароля:', e);
      throw e;
    }
  };

  // Подтверждение email
  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка подтверждения email');
      }

      console.log('✅ Email подтверждён');
      return true;
    } catch (e) {
      console.error('❌ Ошибка подтверждения email:', e);
      throw e;
    }
  };

  const value = {
    user,
    isLoading,
    error,
    authToken,
    register,
    login,
    logout,
    updateProfile,
    resetPassword,
    verifyEmail,
    isAuthenticated: !!authToken,
    isLoggedIn: !!user && !!authToken,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
