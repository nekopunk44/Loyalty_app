/**
 * Биометрический вход (Face ID / отпечаток) через expo-local-authentication.
 *
 * Модель безопасности (Option A): пароль НЕ хранится. В защищённом хранилище
 * (expo-secure-store → iOS Keychain / Android Keystore) держим refresh-токен и
 * снимок профиля. По биометрии refresh-токен обменивается на новую пару токенов
 * (POST /auth/refresh), и сессия восстанавливается. Если токен протух/отозван —
 * чистим хранилище и откатываемся на вход по паролю.
 *
 * Требует пакет: npx expo install expo-local-authentication
 * (нативный модуль — нужна пересборка EAS).
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_REFRESH = 'biometric_refresh_token';
const KEY_USER    = 'biometric_user';
const KEY_ENABLED = 'biometric_enabled';

export async function isBiometricAvailable() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

// Человекочитаемое название метода для подписей кнопок.
export async function getBiometricLabel() {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'отпечатку';
    return 'биометрии';
  } catch {
    return 'биометрии';
  }
}

export async function authenticate(reason = 'Подтвердите личность') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Отмена',
      disableDeviceFallback: false,
    });
    return !!result.success;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled() {
  try {
    return (await SecureStore.getItemAsync(KEY_ENABLED)) === '1';
  } catch {
    return false;
  }
}

// Включение: сохраняем refresh-токен + снимок профиля под биометрией.
export async function saveBiometricCredentials(refreshToken, user) {
  await SecureStore.setItemAsync(KEY_REFRESH, refreshToken);
  await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user));
  await SecureStore.setItemAsync(KEY_ENABLED, '1');
}

// Обновление refresh-токена при ротации — только если биометрия включена.
export async function updateBiometricToken(refreshToken) {
  try {
    if ((await SecureStore.getItemAsync(KEY_ENABLED)) === '1' && refreshToken) {
      await SecureStore.setItemAsync(KEY_REFRESH, refreshToken);
    }
  } catch { /* не критично */ }
}

export async function getBiometricCredentials() {
  try {
    const [refreshToken, userRaw] = await Promise.all([
      SecureStore.getItemAsync(KEY_REFRESH),
      SecureStore.getItemAsync(KEY_USER),
    ]);
    if (!refreshToken || !userRaw) return null;
    return { refreshToken, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export async function clearBiometric() {
  try {
    await SecureStore.deleteItemAsync(KEY_REFRESH);
    await SecureStore.deleteItemAsync(KEY_USER);
    await SecureStore.deleteItemAsync(KEY_ENABLED);
  } catch { /* не критично */ }
}
