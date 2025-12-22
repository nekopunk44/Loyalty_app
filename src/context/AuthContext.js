import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseService from '../services/FirebaseService';
import * as DatabaseService from '../services/DatabaseService';
import * as EncryptionService from '../services/EncryptionService';
import { STORAGE_KEYS } from '../utils/firebaseConfig';

const AuthContext = createContext();

// Helper для добавления таймаута к Promise
const promiseWithTimeout = (promise, timeoutMs, label = '') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), timeoutMs)
    ),
  ]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [authToken, setAuthToken] = useState(null);

  // Инициализация Firebase и проверка сессии
  useEffect(() => {
    (async () => {
      try {
        console.log('🔄 Инициализация AuthContext...');
        
        // Инициализируем Firebase
        FirebaseService.initializeFirebase();
        console.log('✅ Firebase инициализирован');

        // Пытаемся восстановить сессию
        const savedAuthToken = await EncryptionService.getFromSecureStore(STORAGE_KEYS.AUTH_TOKEN);
        if (savedAuthToken) {
          console.log('✅ Найден сохранённый токен');
          setAuthToken(savedAuthToken);
          
          // Получаем данные пользователя из Firestore
          const currentUser = FirebaseService.getCurrentUser();
          if (currentUser) {
            console.log('✅ Найден пользователь в Firebase:', currentUser.uid);
            try {
              const userProfile = await promiseWithTimeout(
                DatabaseService.getUser(currentUser.uid),
                2000,
                'DatabaseService.getUser (init)'
              );
              if (userProfile) {
                console.log('✅ Профиль пользователя загружен');
                setUser(userProfile);
              }
            } catch (err) {
              console.warn('⚠️ Не удалось загрузить профиль при инициализации:', err.message);
            }
          }
        } else {
          console.log('ℹ️ Сохранённый токен не найден');
        }

        // Слушаем изменения состояния аутентификации
        console.log('👂 Установка слушателя onAuthStateChange...');
        const unsubscribe = FirebaseService.onAuthStateChange(async (firebaseUser) => {
          console.log('🔔 onAuthStateChange срабатывает. User:', firebaseUser?.uid);
          if (firebaseUser) {
            try {
              const userProfile = await promiseWithTimeout(
                DatabaseService.getUser(firebaseUser.uid),
                2000,
                'DatabaseService.getUser (listener)'
              );
              if (userProfile) {
                console.log('✅ Пользователь авторизован:', firebaseUser.uid);
                setUser(userProfile);
              }
            } catch (err) {
              console.warn('⚠️ Не удалось получить профиль в onAuthStateChange:', err.message);
              // Оставляем пользователя авторизованным, но без полного профиля
              setUser(null);
            }
          } else {
            console.log('❌ Пользователь разлогинен');
            setUser(null);
            setAuthToken(null);
          }
        });

        console.log('✅ AuthContext инициализирован');
        
        // Установить таймаут для финализации загрузки (на случай медленного интернета)
        const timeout = setTimeout(() => {
          if (isLoading) {
            console.log('⏱️ Таймаут инициализации - завершение загрузки');
            setIsLoading(false);
          }
        }, 5000);
        
        return () => {
          unsubscribe();
          clearTimeout(timeout);
        };
      } catch (e) {
        console.error('❌ Ошибка инициализации:', e);
        setError('Ошибка инициализации приложения');
        setIsLoading(false);
      }
    })();
  }, []);

  // Регистрация
  const register = async (email, password, displayName) => {
    setError('');
    try {
      // Создаём пользователя в Firebase Auth
      const firebaseUser = await FirebaseService.registerWithEmail(email, password, displayName);

      // Создаём профиль пользователя в Firestore
      const userData = {
        id: firebaseUser.uid,
        email,
        displayName,
        name: displayName,
        avatar: null,
        phone: '',
        address: '',
        role: 'user',
        status: 'active',
        membershipLevel: 'Bronze',
        loyaltyPoints: 0,
        balance: 0, // Остаток на счёте
        walletBalance: 0, // Баланс кошелька
        stats: {
          totalBookings: 0,
          totalSpent: 0,
          totalEarned: 0,
          reviewsCount: 0,
          averageRating: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          lastBookingDate: null,
        },
        paymentMethods: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Сохраняем роль в AsyncStorage как резервный вариант
      await AsyncStorage.setItem(`${STORAGE_KEYS.USER}-${firebaseUser.uid}-role`, userData.role);

      // Сохраняем полный профиль в AsyncStorage
      await AsyncStorage.setItem(`${STORAGE_KEYS.USER}-${firebaseUser.uid}`, JSON.stringify(userData));

      await DatabaseService.createUser(firebaseUser.uid, userData);

      // Сохраняем токен
      const token = await firebaseUser.getIdToken();
      await EncryptionService.saveToSecureStore(STORAGE_KEYS.AUTH_TOKEN, token);
      setAuthToken(token);

      setUser(userData);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error('❌ Ошибка регистрации:', e);
      
      let errorMessage = 'Ошибка при регистрации';
      if (e.message && e.message.includes('email-already-in-use')) {
        errorMessage = 'Email уже зарегистрирован';
      } else if (e.message && e.message.includes('weak-password')) {
        errorMessage = 'Пароль не соответствует требованиям безопасности';
      } else if (e.message && e.message.includes('invalid-email')) {
        errorMessage = 'Email некорректный';
      } else if (e.message && e.message.includes('Timeout')) {
        errorMessage = 'Сервер не отвечает. Попробуйте ещё раз';
      } else if (e.message && e.message.includes('Network')) {
        errorMessage = 'Ошибка сети. Проверьте подключение';
      }
      
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // Вход
  const login = async (email, password) => {
    setError('');
    try {
      console.log('🔐 Попытка входа:', email);
      
      // На web в режиме разработки сначала проверяем тестовые учётные данные
      if (typeof window !== 'undefined') {
        console.log('ℹ️ Используется режим разработки web');
        
        // Тестовые учётные данные
        if ((email === 'admin' && password === 'admin123') ||
            (email === 'user' && password === 'user123') ||
            (email === 'demo' && password === 'demo123')) {
          
          const testUser = {
            uid: `dev-${email}-${Date.now()}`,
            email: `${email}@test.local`,
            displayName: email === 'admin' ? 'Administrator' : email === 'user' ? 'User' : 'Demo User',
          };

          const userProfile = {
            id: testUser.uid,
            email: testUser.email,
            displayName: testUser.displayName,
            name: testUser.displayName,
            avatar: null,
            phone: '',
            address: '',
            role: email === 'admin' ? 'admin' : 'user',
            status: 'active',
            membershipLevel: 'Bronze',
            loyaltyPoints: 0,
          };

          // Сохраняем токен (в режиме разработки - просто ID)
          const token = testUser.uid;
          await EncryptionService.saveToSecureStore(STORAGE_KEYS.AUTH_TOKEN, token);
          setAuthToken(token);
          setUser(userProfile);
          setIsLoading(false);
          
          console.log('✅ Тестовый вход успешен:', email);
          return true;
        }
        
        // Если не тестовые данные, пробуем войти через Firebase
        console.log('🔄 Не тестовые данные, проверяю Firebase...');
      }

      // На мобильных и для реальных пользователей используем Firebase
      const firebaseUser = await FirebaseService.loginWithEmail(email, password);

      // Получаем профиль пользователя (с таймаутом 3 секунды)
      let userProfile = null;
      
      // Сначала пытаемся загрузить профиль из AsyncStorage (если он там есть)
      try {
        console.log('⏳ Загрузка профиля из AsyncStorage...');
        const savedProfile = await AsyncStorage.getItem(`${STORAGE_KEYS.USER}-${firebaseUser.uid}`);
        if (savedProfile) {
          userProfile = JSON.parse(savedProfile);
          console.log('✅ Профиль загружен из AsyncStorage:', userProfile.name);
        }
      } catch (err) {
        console.warn('⚠️ Не удалось загрузить профиль из AsyncStorage');
      }
      
      // Если нет в AsyncStorage, пытаемся загрузить из Firestore
      if (!userProfile) {
        try {
          console.log('⏳ Загрузка профиля из Firestore (таймаут 3с)...');
          userProfile = await promiseWithTimeout(
            DatabaseService.getUser(firebaseUser.uid),
            3000,
            'DatabaseService.getUser'
          );
          if (userProfile) {
            console.log('✅ Профиль загружен из Firestore');
          }
        } catch (dbError) {
          console.warn('⚠️ Ошибка Firestore (или таймаут):', dbError.message);
        }
      }
      
      // Если профиль не найден ни где, создаём его локально
      if (!userProfile) {
        console.log('⚠️ Профиль не найден ни в AsyncStorage ни в Firestore, создаю новый профиль локально...');
        
        // Пытаемся загрузить роль из AsyncStorage
        let savedRole = 'user';
        try {
          const storedRole = await AsyncStorage.getItem(`${STORAGE_KEYS.USER}-${firebaseUser.uid}-role`);
          if (storedRole) {
            savedRole = storedRole;
            console.log('✅ Роль загружена из AsyncStorage:', savedRole);
          }
        } catch (err) {
          console.warn('⚠️ Не удалось загрузить роль из AsyncStorage');
        }
        
        const displayNameValue = firebaseUser.displayName || email.split('@')[0];
        userProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName: displayNameValue,
          name: displayNameValue,
          avatar: null,
          phone: '',
          address: '',
          role: savedRole,
          status: 'active',
          membershipLevel: 'Bronze',
          loyaltyPoints: 0,
          balance: 0,
          walletBalance: 0,
          stats: {
            totalBookings: 0,
            totalSpent: 0,
            totalEarned: 0,
            reviewsCount: 0,
            averageRating: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            lastBookingDate: null,
          },
          paymentMethods: [],
        };
        
        // Пытаемся сохранить в Firestore, но не падаем если не удастся (с таймаутом 2 секунды)
        try {
          console.log('⏳ Попытка сохранить профиль в Firestore (таймаут 2с)...');
          await promiseWithTimeout(
            DatabaseService.createUser(firebaseUser.uid, userProfile),
            2000,
            'DatabaseService.createUser'
          );
          console.log('✅ Новый профиль создан в Firestore');
        } catch (createError) {
          console.log('⚠️ Не удалось создать профиль в Firestore, используем локальный профиль:', createError.message);
          // Профиль всё равно будет использован из памяти
        }
      }

      // Сохраняем профиль в AsyncStorage
      try {
        await AsyncStorage.setItem(`${STORAGE_KEYS.USER}-${firebaseUser.uid}`, JSON.stringify(userProfile));
        console.log('✅ Профиль сохранён в AsyncStorage');
      } catch (storageErr) {
        console.warn('⚠️ Не удалось сохранить профиль в AsyncStorage');
      }

      // Сохраняем токен в SecureStore (с таймаутом 2 секунды)
      let token = null;
      try {
        console.log('⏳ Получение токена (таймаут 2с)...');
        token = await promiseWithTimeout(
          firebaseUser.getIdToken(),
          2000,
          'firebaseUser.getIdToken'
        );
      } catch (tokenError) {
        console.warn('⚠️ Не удалось получить токен:', tokenError.message);
        // Используем uid как fallback токен
        token = firebaseUser.uid;
      }
      
      await EncryptionService.saveToSecureStore(STORAGE_KEYS.AUTH_TOKEN, token);
      setAuthToken(token);

      setUser(userProfile);
      console.log('⏹️ setIsLoading(false) - завершаем загрузку');
      console.log('📋 Данные пользователя:', {
        name: userProfile.name,
        displayName: userProfile.displayName,
        email: userProfile.email,
        role: userProfile.role,
        id: userProfile.id,
      });
      setIsLoading(false);
      console.log('✅ Вход успешен:', email);
      return true;
    } catch (e) {
      console.error('❌ Ошибка входа:', e);
      
      let errorMessage = 'Ошибка при входе';
      if (e.message && e.message.includes('user-not-found')) {
        errorMessage = 'Пользователь не найден';
      } else if (e.message && e.message.includes('wrong-password')) {
        errorMessage = 'Неверный пароль';
      } else if (e.message && e.message.includes('Timeout')) {
        errorMessage = 'Сервер не отвечает. Попробуйте ещё раз';
      } else if (e.message && e.message.includes('Network')) {
        errorMessage = 'Ошибка сети. Проверьте подключение';
      } else if (e.message && e.message.includes('invalid-email')) {
        errorMessage = 'Email некорректный';
      } else if (e.message && e.message.includes('too-many-requests')) {
        errorMessage = 'Слишком много попыток входа. Попробуйте позже';
      }
      
      setError(errorMessage);

      console.log('⏹️ setIsLoading(false) - ошибка входа');
      setIsLoading(false);
      return false;
    }
  };

  // Выход
  const logout = async () => {
    try {
      const currentUser = FirebaseService.getCurrentUser();
      
      await FirebaseService.logout();
      await EncryptionService.deleteFromSecureStore(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      
      // Удаляем сохранённый профиль из AsyncStorage
      if (currentUser) {
        await AsyncStorage.removeItem(`${STORAGE_KEYS.USER}-${currentUser.uid}`);
        await AsyncStorage.removeItem(`${STORAGE_KEYS.USER}-${currentUser.uid}-role`);
      }
      
      setUser(null);
      setAuthToken(null);
      setError('');
      console.log('✅ Выход выполнен');
    } catch (e) {
      console.error('❌ Ошибка выхода:', e);
      setError('Ошибка при выходе');
    }
  };

  // Сброс пароля
  const resetPassword = async (email) => {
    setError('');
    try {
      await FirebaseService.sendPasswordReset(email);
      console.log('✅ Email для восстановления отправлен');
      return true;
    } catch (e) {
      console.error('❌ Ошибка сброса пароля:', e);
      setError(e.message || 'Ошибка при сбросе пароля');
      return false;
    }
  };

  // Обновить профиль
  const updateProfile = async (updates) => {
    try {
      const currentUser = FirebaseService.getCurrentUser();
      if (!currentUser) throw new Error('Пользователь не авторизован');

      await DatabaseService.updateUser(currentUser.uid, updates);
      setUser({ ...user, ...updates });
      console.log('✅ Профиль обновлён');
      return true;
    } catch (e) {
      console.error('❌ Ошибка обновления профиля:', e);
      setError(e.message);
      return false;
    }
  };

  // Обновить пароль
  const changePassword = async (newPassword) => {
    try {
      await FirebaseService.updateUserPassword(newPassword);
      console.log('✅ Пароль изменён');
      return true;
    } catch (e) {
      console.error('❌ Ошибка изменения пароля:', e);
      setError(e.message);
      return false;
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
    resetPassword,
    updateProfile,
    changePassword,
    isAdmin: user?.role === 'admin',
    isLoggedIn: user !== null,
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
