/**
 * Encryption Service
 * Шифрование чувствительных данных (пароли, платежи, токены и т.д.)
 */

import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Генерируем или берем из environment переменных
const SECRET_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;

if (!SECRET_KEY) {
  console.warn('⚠️  EXPO_PUBLIC_ENCRYPTION_KEY переменная окружения не установлена. Используйте .env файл для безопасности!');
}

/**
 * Симметричное шифрование (AES)
 */

// Шифровать строку
export const encryptString = (text) => {
  try {
    if (!text) return null;

    const encrypted = CryptoJS.AES.encrypt(text.toString(), SECRET_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('❌ Ошибка шифрования:', error);
    return null;
  }
};

// Расшифровать строку
export const decryptString = (encryptedText) => {
  try {
    if (!encryptedText) return null;

    const decrypted = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY).toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('❌ Ошибка расшифровки:', error);
    return null;
  }
};

// Шифровать объект
export const encryptObject = (obj) => {
  try {
    const jsonString = JSON.stringify(obj);
    return encryptString(jsonString);
  } catch (error) {
    console.error('❌ Ошибка шифрования объекта:', error);
    return null;
  }
};

// Расшифровать объект
export const decryptObject = (encryptedText) => {
  try {
    const decrypted = decryptString(encryptedText);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Ошибка расшифровки объекта:', error);
    return null;
  }
};

/**
 * Хеширование (однонаправленное)
 */

// Хешировать пароль
export const hashPassword = (password) => {
  try {
    const hash = CryptoJS.SHA256(password).toString();
    return hash;
  } catch (error) {
    console.error('❌ Ошибка хеширования пароля:', error);
    return null;
  }
};

// Проверить пароль
export const verifyPassword = (password, hash) => {
  try {
    return hashPassword(password) === hash;
  } catch (error) {
    console.error('❌ Ошибка проверки пароля:', error);
    return false;
  }
};

// Хешировать данные (например, для идентификаторов)
export const hashData = (data, iterations = 1) => {
  try {
    let hash = data.toString();
    for (let i = 0; i < iterations; i++) {
      hash = CryptoJS.SHA256(hash).toString();
    }
    return hash;
  } catch (error) {
    console.error('❌ Ошибка хеширования данных:', error);
    return null;
  }
};

/**
 * Безопасное хранилище (SecureStore)
 * Используется для критичных данных (токены, ключи и т.д.)
 */

// Сохранить в SecureStore
export const saveToSecureStore = async (key, value) => {
  try {
    const encrypted = encryptString(value);
    // На web используем localStorage, на мобильных - SecureStore
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web окружение
      window.localStorage.setItem(`secure_${key}`, encrypted);
    } else {
      // Мобильное окружение
      await SecureStore.setItemAsync(key, encrypted);
    }
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения в SecureStore:', error);
    return false;
  }
};

// Получить из SecureStore
export const getFromSecureStore = async (key) => {
  try {
    // На web используем localStorage, на мобильных - SecureStore
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web окружение
      const encrypted = window.localStorage.getItem(`secure_${key}`);
      if (!encrypted) return null;
      const decrypted = decryptString(encrypted);
      return decrypted;
    } else {
      // Мобильное окружение
      if (!key || key.trim() === '') {
        return null;
      }
      const encrypted = await SecureStore.getItemAsync(key);
      if (!encrypted) return null;
      const decrypted = decryptString(encrypted);
      return decrypted;
    }
  } catch (error) {
    console.error('❌ Ошибка получения из SecureStore:', error);
    return null;
  }
};

// Удалить из SecureStore
export const deleteFromSecureStore = async (key) => {
  try {
    // На web используем localStorage, на мобильных - SecureStore
    if (typeof window !== 'undefined' && window.localStorage) {
      // Web окружение
      window.localStorage.removeItem(`secure_${key}`);
    } else {
      // Мобильное окружение
      await SecureStore.deleteItemAsync(key);
    }
    return true;
  } catch (error) {
    console.error('❌ Ошибка удаления из SecureStore:', error);
    return false;
  }
};

/**
 * Защищённое AsyncStorage
 * Для неполностью критичных данных (можно использовать локальное шифрование)
 */

// Сохранить в защищённое AsyncStorage
export const saveToProtectedAsyncStorage = async (key, value) => {
  try {
    const encrypted = encryptString(typeof value === 'string' ? value : JSON.stringify(value));
    await AsyncStorage.setItem(key, encrypted);
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения в AsyncStorage:', error);
    return false;
  }
};

// Получить из защищённого AsyncStorage
export const getFromProtectedAsyncStorage = async (key, parseJson = false) => {
  try {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const decrypted = decryptString(encrypted);
    return parseJson ? JSON.parse(decrypted) : decrypted;
  } catch (error) {
    console.error('❌ Ошибка получения из AsyncStorage:', error);
    return null;
  }
};

/**
 * Платёжные данные (специальная защита)
 */

// Шифровать платёжные данные
export const encryptPaymentData = (paymentData) => {
  try {
    // Не сохраняем полный CVV/PIN в нормальном виде
    const sanitized = {
      cardLastFour: paymentData.cardLastFour, // Только последние 4 цифры
      cardBrand: paymentData.cardBrand,
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      holderName: paymentData.holderName,
    };

    return encryptObject(sanitized);
  } catch (error) {
    console.error('❌ Ошибка шифрования платёжных данных:', error);
    return null;
  }
};

// Расшифровать платёжные данные
export const decryptPaymentData = (encryptedData) => {
  return decryptObject(encryptedData);
};

// Сохранить платёжные данные в SecureStore
export const savePaymentDataSecurely = async (key, paymentData) => {
  try {
    const encrypted = encryptPaymentData(paymentData);
    if (!encrypted) throw new Error('Encryption failed');

    await SecureStore.setItemAsync(key, encrypted);
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения платёжных данных:', error);
    return false;
  }
};

// Получить платёжные данные из SecureStore
export const getPaymentDataSecurely = async (key) => {
  try {
    const encrypted = await SecureStore.getItemAsync(key);
    if (!encrypted) return null;

    const decrypted = decryptPaymentData(encrypted);
    return decrypted;
  } catch (error) {
    console.error('❌ Ошибка получения платёжных данных:', error);
    return null;
  }
};

/**
 * Генерация токенов и ключей
 */

// Генерировать случайный токен
export const generateToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Генерировать UUID
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Генерировать OTP (одноразовый пароль)
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
};

/**
 * Проверка целостности данных
 */

// Генерировать контрольную сумму
export const generateChecksum = (data) => {
  try {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  } catch (error) {
    console.error('❌ Ошибка генерации контрольной суммы:', error);
    return null;
  }
};

// Проверить контрольную сумму
export const verifyChecksum = (data, checksum) => {
  try {
    return generateChecksum(data) === checksum;
  } catch (error) {
    console.error('❌ Ошибка проверки контрольной суммы:', error);
    return false;
  }
};

/**
 * Sanitization (очистка данных)
 */

// Удалить чувствительные данные
export const sanitizeData = (obj, sensitiveFields = []) => {
  try {
    const sanitized = { ...obj };
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        delete sanitized[field];
      }
    });
    return sanitized;
  } catch (error) {
    console.error('❌ Ошибка очистки данных:', error);
    return obj;
  }
};

// Скрыть чувствительные данные (маскировка)
export const maskSensitiveData = (data, type = 'email') => {
  try {
    if (type === 'email') {
      const [name, domain] = data.split('@');
      const maskedName = name.substring(0, 1) + '*'.repeat(name.length - 1);
      return `${maskedName}@${domain}`;
    }

    if (type === 'phone') {
      return data.substring(0, 3) + '*'.repeat(data.length - 6) + data.substring(data.length - 3);
    }

    if (type === 'card') {
      return '*'.repeat(data.length - 4) + data.substring(data.length - 4);
    }

    return data;
  } catch (error) {
    console.error('❌ Ошибка маскировки данных:', error);
    return data;
  }
};

export default {
  // Encryption
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,

  // Hashing
  hashPassword,
  verifyPassword,
  hashData,

  // SecureStore
  saveToSecureStore,
  getFromSecureStore,
  deleteFromSecureStore,

  // Protected AsyncStorage
  saveToProtectedAsyncStorage,
  getFromProtectedAsyncStorage,

  // Payment Data
  encryptPaymentData,
  decryptPaymentData,
  savePaymentDataSecurely,
  getPaymentDataSecurely,

  // Token Generation
  generateToken,
  generateUUID,
  generateOTP,

  // Data Integrity
  generateChecksum,
  verifyChecksum,

  // Sanitization
  sanitizeData,
  maskSensitiveData,
};
