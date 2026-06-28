import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DatabaseService from '../services/DatabaseService';
import { getApiUrl } from '../utils/apiUrl';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  authenticate as biometricAuthenticate,
  saveBiometricCredentials,
  updateBiometricToken,
  getBiometricCredentials,
  clearBiometric,
} from '../utils/biometricAuth';

const STORAGE_KEYS = {
  AUTH_TOKEN:    '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER:          '@user',
  USER_ID:       '@user_id',
  LAST_ACTIVE:   '@last_active',
};

// Access-токен живёт 15 минут. Обновляем за 2 минуты до истечения.
const ACCESS_TTL_MS   = 15 * 60 * 1000;
const REFRESH_BEFORE  =  2 * 60 * 1000;
const REFRESH_INTERVAL = ACCESS_TTL_MS - REFRESH_BEFORE; // ~13 мин

// Автовыход по бездействию: если приложение не открывали дольше этого времени —
// при следующем открытии требуем повторный вход.
const INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 часа

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

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
        // Держим биометрический refresh-токен актуальным при ротации
        updateBiometricToken(newRefresh);

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
      STORAGE_KEYS.LAST_ACTIVE,
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
          // Автовыход по бездействию: если приложение не открывали дольше лимита —
          // не восстанавливаем сессию, чистим хранилище и требуем повторный вход.
          const lastActiveRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
          const lastActive = lastActiveRaw ? parseInt(lastActiveRaw, 10) : null;
          if (lastActive && Date.now() - lastActive > INACTIVITY_LIMIT_MS) {
            await AsyncStorage.multiRemove([
              STORAGE_KEYS.AUTH_TOKEN,
              STORAGE_KEYS.REFRESH_TOKEN,
              STORAGE_KEYS.USER,
              STORAGE_KEYS.USER_ID,
              STORAGE_KEYS.LAST_ACTIVE,
            ]);
          } else {
            const parsedUser = JSON.parse(savedUser);
            setAuthToken(savedToken);
            setUser(parsedUser);
            // Сразу пробуем обновить токен — он мог устареть пока приложение было закрыто
            _startRefreshTimer();
            refreshAccessToken();
            // Без heartbeat сервер считает пользователя offline сразу после рестарта
            _startHeartbeat(parsedUser.id);
          }
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

  // ─── Автовыход по бездействию ──────────────────────────────────────────────
  // Уходя в фон, запоминаем время. При возврате в приложение, если прошло больше
  // лимита — принудительно разлогиниваем и требуем повторный вход.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      try {
        if (next === 'active') {
          const [token, lastRaw] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
            AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE),
          ]);
          const last = lastRaw ? parseInt(lastRaw, 10) : null;
          if (token && last && Date.now() - last > INACTIVITY_LIMIT_MS) {
            // Локальный выход, но биометрию сохраняем — чтобы вернуться по Face ID
            await _clearSession();
          }
        } else {
          // background / inactive — фиксируем момент ухода
          AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(Date.now())).catch(() => {});
        }
      } catch (_) { /* фоновая проверка, ошибки не критичны */ }
    });
    return () => sub?.remove?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Доступность и состояние биометрии ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [available, enabled] = await Promise.all([
        isBiometricAvailable(),
        isBiometricEnabled(),
      ]);
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
    })();
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
    // Если биометрия включена — обновляем сохранённый refresh-токен
    updateBiometricToken(refreshToken);
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
      _startHeartbeat(userData.id);
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
  // Токен читаем из AsyncStorage на каждый запрос — старый, закрытый в замыкании
  // setInterval'а, становится невалидным после refresh (~раз в 13 мин) и сервер
  // начинает отдавать 401, из-за чего пользователь «протухает» в offline.
  const sendHeartbeat = async (userId) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;
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

  // Сразу отправляем heartbeat и запускаем интервал. Используется и при login,
  // и при восстановлении сессии — без второго вызова админ остаётся offline до
  // следующего логина (heartbeat висел только внутри login).
  const _startHeartbeat = (userId) => {
    if (!userId) return;
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    sendHeartbeat(userId);
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat(userId);
    }, 60000);
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
      // Явный выход — отключаем биометрию (требуется повторное включение)
      await clearBiometric();
      setBiometricEnabled(false);
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
  // mode: 'reset' (по умолчанию) или 'setup' — влияет только на текст
  // уведомления админам.
  const setNewPassword = async (token, newPassword, mode) => {
    const response = await fetch(`${getApiUrl()}/auth/set-new-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword, ...(mode ? { mode } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ошибка смены пароля');
    // Возвращаем data (содержит email аккаунта) — нужно для автоматического входа.
    return data;
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

  // ─── Биометрия: включение/выключение/вход ─────────────────────────────────
  const enableBiometric = async () => {
    try {
      if (!user) return false;
      const ok = await biometricAuthenticate('Включить вход по биометрии');
      if (!ok) return false;
      const refresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refresh) return false;
      await saveBiometricCredentials(refresh, user);
      setBiometricEnabled(true);
      return true;
    } catch (e) {
      console.error('Ошибка включения биометрии:', e);
      return false;
    }
  };

  const disableBiometric = async () => {
    await clearBiometric();
    setBiometricEnabled(false);
  };

  // Вход по Face ID/отпечатку: refresh-токен из защищённого хранилища меняем на
  // новую пару токенов и восстанавливаем сессию. Протух — откат на пароль.
  const loginWithBiometric = async () => {
    try {
      const ok = await biometricAuthenticate('Вход по биометрии');
      if (!ok) return { success: false, error: 'cancelled' };

      const creds = await getBiometricCredentials();
      if (!creds) return { success: false, error: 'no-credentials' };

      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: creds.refreshToken }),
      });

      if (!response.ok) {
        // Токен истёк/отозван — чистим биометрию, нужен вход по паролю
        await clearBiometric();
        setBiometricEnabled(false);
        return { success: false, error: 'expired' };
      }

      const data = await response.json();
      await _persistSession(data.token, data.refreshToken, creds.user);
      _startHeartbeat(creds.user.id);
      return { success: true };
    } catch (e) {
      console.error('Ошибка входа по биометрии:', e);
      return { success: false, error: e.message };
    }
  };

  const value = {
    user,
    isLoading,
    error,
    authToken,
    biometricAvailable,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    loginWithBiometric,
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
