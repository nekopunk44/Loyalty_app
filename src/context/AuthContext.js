import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DatabaseService from '../services/DatabaseService';
import { getApiUrl } from '../utils/apiUrl';

const STORAGE_KEYS = {
  AUTH_TOKEN:    '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER:          '@user',
  USER_ID:       '@user_id',
};

// Access-токен живёт 15 минут. Обновляем за 2 минуты до истечения.
const ACCESS_TTL_MS   = 15 * 60 * 1000;
const REFRESH_BEFORE  =  2 * 60 * 1000;
const REFRESH_INTERVAL = ACCESS_TTL_MS - REFRESH_BEFORE; // ~13 мин

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState(null);

  const heartbeatIntervalRef = React.useRef(null);
  const refreshIntervalRef   = React.useRef(null);
  // Гарантирует, что одновременно выполняется не более одного refresh-запроса
  const refreshPromiseRef    = React.useRef(null);

  // ─── Тихое обновление access-токена ────────────────────────────────────────
  const refreshAccessToken = () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const storedRefresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!storedRefresh) return null;

        const response = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
        });

        if (!response.ok) {
          // Refresh-токен истёк или отозван — выходим
          await _clearSession();
          return null;
        }

        const data = await response.json();
        const { token: newAccess, refreshToken: newRefresh } = data;

        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN,    newAccess);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
        setAuthToken(newAccess);

        return newAccess;
      } catch (e) {
        console.error('Ошибка тихого обновления токена:', e);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  // ─── Запуск/остановка таймера обновления ───────────────────────────────────
  const _startRefreshTimer = () => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(refreshAccessToken, REFRESH_INTERVAL);
  };

  const _stopRefreshTimer = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  // ─── Очистка локального состояния и AsyncStorage ───────────────────────────
  const _clearSession = async () => {
    _stopRefreshTimer();
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.USER_ID,
    ]);
    setAuthToken(null);
    setUser(null);
    setError('');
  };

  // ─── Инициализация при загрузке приложения ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
        ]);

        if (savedToken && savedUser) {
          setAuthToken(savedToken);
          setUser(JSON.parse(savedUser));
          // Сразу пробуем обновить токен — он мог устареть пока приложение было закрыто
          _startRefreshTimer();
          refreshAccessToken();
        }
      } catch (e) {
        console.error('Ошибка при восстановлении сессии:', e);
      } finally {
        setTimeout(() => setIsLoading(false), 100);
      }
    })();

    return () => {
      _stopRefreshTimer();
    };
  }, []);

  // ─── Сохранение токенов и запуск таймеров ──────────────────────────────────
  const _persistSession = async (accessToken, refreshToken, userData) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN,    accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      AsyncStorage.setItem(STORAGE_KEYS.USER,          JSON.stringify(userData)),
      AsyncStorage.setItem(STORAGE_KEYS.USER_ID,       userData.id),
    ]);
    setAuthToken(accessToken);
    setUser(userData);
    _startRefreshTimer();
  };

  // ─── Регистрация ────────────────────────────────────────────────────────────
  const register = async (email, password, displayName) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка регистрации');

      const { token, refreshToken, user: userData } = data;
      if (!token) throw new Error('Сервер не вернул токен авторизации');

      await _persistSession(token, refreshToken, userData);
      return true;
    } catch (e) {
      console.error('Ошибка регистрации:', e);
      setError(e.message || 'Ошибка при регистрации');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Вход ───────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Неверный email или пароль');

      const { token, refreshToken, user: userData } = data;
      if (!token) throw new Error('Сервер не вернул токен авторизации');

      await _persistSession(token, refreshToken, userData);

      // Heartbeat каждые 60 секунд
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat(userData.id, token);
      }, 60000);

      return { success: true };
    } catch (e) {
      console.error('Ошибка входа:', e);
      const msg = e.message || 'Ошибка при входе';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Heartbeat ──────────────────────────────────────────────────────────────
  const sendHeartbeat = async (userId, token) => {
    try {
      await fetch(`${getApiUrl()}/auth/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
    } catch (_) {
      // фоновый процесс, ошибки не критичны
    }
  };

  // ─── Выход ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (user?.id && authToken) {
        try {
          await fetch(`${getApiUrl()}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (_) {
          // logout request failure is non-fatal
        }
      }
      await _clearSession();
      return true;
    } catch (e) {
      console.error('Ошибка выхода:', e);
      return false;
    }
  };

  // ─── Обновление профиля ─────────────────────────────────────────────────────
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('Пользователь не авторизован');
      const updatedUser = await DatabaseService.updateUser(user.id, updates);
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      return newUser;
    } catch (e) {
      console.error('Ошибка обновления профиля:', e);
      throw e;
    }
  };

  // ─── Запрос письма со ссылкой для сброса пароля ────────────────────────────
  const requestPasswordReset = async (email) => {
    const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса сброса пароля');
    return true;
  };

  // ─── Установка нового пароля по токену из письма ───────────────────────────
  const setNewPassword = async (token, newPassword) => {
    const response = await fetch(`${getApiUrl()}/auth/set-new-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка смены пароля');
    return true;
  };

  // ─── Подтверждение email ────────────────────────────────────────────────────
  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка подтверждения email');
      return true;
    } catch (e) {
      console.error('Ошибка подтверждения email:', e);
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
    requestPasswordReset,
    setNewPassword,
    verifyEmail,
    refreshAccessToken,
    isAuthenticated: !!authToken,
    isLoggedIn:      !!user && !!authToken,
    isAdmin:         user?.role === 'admin',
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
