import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRoute } from '@react-navigation/native';
import { spacing, borderRadius } from '../../constants/theme';
import { AMBER, LOGIN_THEME, NAVY, TEAL } from '../../constants/loginPalette';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import VJMonogram from '../../components/auth/VJMonogram';

// Требования к паролю должны совпадать с серверной политикой (server/validation.js):
// минимум 8 символов, хотя бы одна заглавная буква и одна цифра.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8,   label: 'Минимум 8 символов' },
  { test: (p) => /[A-Z]/.test(p), label: 'Заглавная буква (A–Z)' },
  { test: (p) => /\d/.test(p),    label: 'Цифра (0–9)' },
];
const validatePassword = (pwd) => {
  const failed = PASSWORD_RULES.find((r) => !r.test(pwd));
  return failed ? failed.label : null;
};

function HeroGradientBackdrop({ palette, id }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`heroBase${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.gradient[0]} />
          <Stop offset="0.58" stopColor={palette.gradient[1]} />
          <Stop offset="1" stopColor={palette.gradient[2]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#heroBase${id})`} />
    </Svg>
  );
}

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetVisible, setResetVisible]         = useState(false);
  const [resetStep, setResetStep]               = useState(1); // 1 = email, 2 = token+password
  const [setupMode, setSetupMode]               = useState(false); // true = установка пароля по приглашению
  const [resetEmail, setResetEmail]             = useState('');
  const [resetToken, setResetToken]             = useState('');
  const [resetNewPwd, setResetNewPwd]           = useState('');
  const [resetConfirm, setResetConfirm]         = useState('');
  const [resetLoading, setResetLoading]         = useState(false);
  const [showResetPwd, setShowResetPwd]         = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const topOpacity  = useRef(new Animated.Value(0)).current;
  const topScale    = useRef(new Animated.Value(0.92)).current;
  const formY       = useRef(new Animated.Value(80)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const gradientShift = useRef(new Animated.Value(0)).current;
  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const {
    login, error, requestPasswordReset, setNewPassword,
    biometricAvailable, biometricEnabled, loginWithBiometric,
  } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const colors = theme.colors;
  const useNative = false;
  const themePalette = isDark ? LOGIN_THEME.dark : LOGIN_THEME.light;
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const lightGradientOpacity = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const darkGradientOpacity = themeAnim;
  const gradientX = gradientShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 28],
  });
  const gradientY = gradientShift.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -18],
  });

  useEffect(() => {
    // Entrance
    Animated.parallel([
      Animated.timing(topOpacity, { toValue: 1, duration: 600, useNativeDriver: useNative }),
      Animated.spring(topScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: useNative }),
      Animated.sequence([
        Animated.delay(250),
        Animated.parallel([
          Animated.timing(formY, { toValue: 0, duration: 480, useNativeDriver: useNative }),
          Animated.timing(formOpacity, { toValue: 1, duration: 480, useNativeDriver: useNative }),
        ]),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientShift, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientShift, {
          toValue: 0,
          duration: 9000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [isDark, themeAnim]);

  const handleForgotPassword = () => {
    setSetupMode(false);
    setResetEmail(username);
    setResetToken('');
    setResetNewPwd('');
    setResetConfirm('');
    setResetStep(1);
    setResetVisible(true);
  };

  const handleSetupInvite = (prefilledToken = '') => {
    setSetupMode(true);
    setResetToken(typeof prefilledToken === 'string' ? prefilledToken : '');
    setResetNewPwd('');
    setResetConfirm('');
    setResetStep(2); // сразу к вводу кода и пароля
    setResetVisible(true);
  };

  // Deep-link villajaconda://setup?token=XXX из welcome-письма автоматически
  // открывает модалку установки пароля с предзаполненным токеном.
  const route = useRoute();
  const setupTokenFromLink = route?.params?.token;
  useEffect(() => {
    if (setupTokenFromLink && typeof setupTokenFromLink === 'string') {
      handleSetupInvite(setupTokenFromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupTokenFromLink]);

  const handleCloseReset = () => {
    setResetVisible(false);
    setResetStep(1);
    setSetupMode(false);
    setResetToken('');
    setResetNewPwd('');
    setResetConfirm('');
  };

  // Шаг 1: отправить письмо с токеном
  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Ошибка', 'Введите email'); return;
    }
    setResetLoading(true);
    try {
      await requestPasswordReset(resetEmail.trim());
      setResetStep(2);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось отправить письмо');
    } finally {
      setResetLoading(false);
    }
  };

  // Шаг 2: применить новый пароль по токену из письма
  const handleResetSubmit = async () => {
    if (!resetToken.trim()) {
      Alert.alert('Ошибка', 'Введите код из письма'); return;
    }
    const pwdError = validatePassword(resetNewPwd);
    if (pwdError) {
      Alert.alert('Пароль не подходит', pwdError); return;
    }
    if (resetNewPwd !== resetConfirm) {
      Alert.alert('Ошибка', 'Пароли не совпадают'); return;
    }
    setResetLoading(true);
    try {
      const result = await setNewPassword(resetToken.trim(), resetNewPwd, setupMode ? 'setup' : 'reset');
      // Сохраняем до очистки полей в handleCloseReset.
      const accountEmail = result?.email;
      const newPwd = resetNewPwd;
      handleCloseReset();

      // Автоматический вход с тем же email, что был указан при создании
      // пользователя (его возвращает сервер) — без повторного ручного входа.
      if (accountEmail) {
        const res = await login(accountEmail, newPwd);
        if (res?.success) return; // приложение само перейдёт в основной поток
      }
      Alert.alert('Готово', 'Пароль сохранён. Войдите с новым паролем.');
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось сменить пароль');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async () => {
    usernameInputRef.current?.blur();
    passwordInputRef.current?.blur();
    Keyboard.dismiss();

    if (!username.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите пароль');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim())) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (!result?.success) {
      Alert.alert('Ошибка входа', error || 'Неверные учётные данные. Попробуйте ещё раз');
    }
  };

  const handleBiometricLogin = async () => {
    const res = await loginWithBiometric();
    if (res?.success || res?.error === 'cancelled') return;
    if (res?.error === 'expired') {
      Alert.alert('Сессия истекла', 'Войдите по паролю — вход по биометрии отключён.');
    } else if (res?.error === 'no-credentials') {
      Alert.alert('Недоступно', 'Сначала войдите по паролю и включите вход по биометрии в настройках.');
    } else {
      Alert.alert('Ошибка', 'Не удалось войти по биометрии');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: themePalette.rootBg }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gradientPlane,
          {
            opacity: lightGradientOpacity,
            transform: [{ translateX: gradientX }, { translateY: gradientY }],
          },
        ]}
      >
        <HeroGradientBackdrop palette={LOGIN_THEME.light} id="Light" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gradientPlane,
          {
            opacity: darkGradientOpacity,
            transform: [{ translateX: gradientX }, { translateY: gradientY }],
          },
        ]}
      >
        <HeroGradientBackdrop palette={LOGIN_THEME.dark} id="Dark" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* ── Top navy hero ── */}
        <Animated.View style={[
          styles.topSection,
          { backgroundColor: 'transparent' },
          { opacity: topOpacity, transform: [{ scale: topScale }] },
        ]}>
          {/* Logo */}
          <TouchableOpacity style={styles.logoWrap} onPress={toggleTheme} activeOpacity={0.82}>
            <VJMonogram
              size={128}
              mainColor={isDark ? '#FFFFFF' : NAVY}
              accentColor={AMBER}
              animate
            />
          </TouchableOpacity>

          {/* App name */}
          <Text style={[styles.appName, { color: themePalette.brandText }]}>Villa Jaconda</Text>
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: themePalette.line }]} />
            <Text style={[styles.appSubtitle, { color: themePalette.secondaryText }]}>Программа лояльности</Text>
            <View style={[styles.pill, { backgroundColor: themePalette.line }]} />
          </View>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View style={[
          styles.formCard,
          { backgroundColor: themePalette.cardBg },
          { opacity: formOpacity, transform: [{ translateY: formY }] },
        ]}>
          <View
            pointerEvents="none"
            style={[styles.formBottomFill, { backgroundColor: themePalette.cardBg }]}
          />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.welcomeTitle, { color: themePalette.brandText }]}>Добро пожаловать</Text>
            <Text style={[styles.welcomeSub, { color: themePalette.secondaryText }]}>
              Войдите в аккаунт, чтобы продолжить
            </Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themePalette.text }]}>Email</Text>
              <View style={[styles.inputRow, { backgroundColor: themePalette.inputBg, borderColor: themePalette.inputBorder }]}>
                <View style={[styles.inputIconBox, { backgroundColor: `${NAVY}12` }]}>
                  <MaterialIcons name="email" size={18} color={NAVY} />
                </View>
                <TextInput
                  ref={usernameInputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Введите email"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themePalette.text }]}>Пароль</Text>
              <View style={[styles.inputRow, { backgroundColor: themePalette.inputBg, borderColor: themePalette.inputBorder }]}>
                <View style={[styles.inputIconBox, { backgroundColor: `${NAVY}12` }]}>
                  <MaterialIcons name="lock" size={18} color={NAVY} />
                </View>
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Введите пароль"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  disabled={!password}
                  style={styles.eyeBtn}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={password ? NAVY : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>Войти</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Biometric login — показывается, если включено в настройках */}
            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity
                style={[styles.biometricBtn, { borderColor: themePalette.inputBorder }]}
                onPress={handleBiometricLogin}
                activeOpacity={0.85}
              >
                <MaterialIcons name="fingerprint" size={22} color={themePalette.brandText} style={{ marginRight: 8 }} />
                <Text style={[styles.biometricBtnText, { color: themePalette.brandText }]}>
                  Войти по биометрии
                </Text>
              </TouchableOpacity>
            )}

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: themePalette.linkText }]}>Забыли пароль?</Text>
            </TouchableOpacity>

            {/* Setup invite — для новых пользователей с кодом из welcome-письма */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleSetupInvite}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: themePalette.linkText }]}>Есть код приглашения?</Text>
            </TouchableOpacity>

            {loading && (
              <View style={[styles.loadingHint, { backgroundColor: `${NAVY}0E` }]}>
                <ActivityIndicator size="small" color={NAVY} style={{ marginRight: 8 }} />
                <Text style={[styles.loadingHintText, { color: NAVY }]}>
                  Подключение к приложению...
                </Text>
              </View>
            )}

            {/* Bottom label */}
            <View style={styles.footerHint}>
              <MaterialIcons name="lock" size={13} color={colors.textSecondary} />
              <Text style={[styles.footerHintText, { color: themePalette.secondaryText }]}>
                Доступ только для зарегистрированных участников
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Reset password modal ── */}
      <Modal
        visible={resetVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseReset}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: `${NAVY}12` }]}>
                <MaterialIcons name="lock-reset" size={22} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {setupMode
                    ? 'Установка пароля'
                    : (resetStep === 1 ? 'Сброс пароля' : 'Новый пароль')}
                </Text>
                <Text style={styles.modalSub}>
                  {setupMode
                    ? 'Введите код из письма-приглашения и придумайте пароль'
                    : (resetStep === 1
                        ? 'Введите email — отправим код подтверждения'
                        : 'Введите код из письма и новый пароль')}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseReset} style={styles.modalClose}>
                <MaterialIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Индикатор шагов — только в режиме сброса (в setup один шаг). */}
            {!setupMode && (
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, { backgroundColor: NAVY }]} />
                <View style={[styles.stepLine, { backgroundColor: resetStep === 2 ? NAVY : '#E2E8F0' }]} />
                <View style={[styles.stepDot, { backgroundColor: resetStep === 2 ? NAVY : '#E2E8F0' }]} />
              </View>
            )}

            {resetStep === 1 ? (
              <>
                {/* Шаг 1: email */}
                <View style={[styles.modalInputRow, { borderColor: '#E2E8F0' }]}>
                  <MaterialIcons name="email" size={18} color={NAVY} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!resetLoading}
                    returnKeyType="send"
                    onSubmitEditing={handleSendResetEmail}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, resetLoading && { opacity: 0.7 }]}
                  onPress={handleSendResetEmail}
                  disabled={resetLoading}
                  activeOpacity={0.85}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalBtnText}>Отправить код</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Шаг 2: токен + пароль */}
                <View style={[styles.modalInputRow, { borderColor: '#E2E8F0' }]}>
                  <MaterialIcons name="vpn-key" size={18} color={NAVY} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Код из письма"
                    placeholderTextColor="#94A3B8"
                    value={resetToken}
                    onChangeText={setResetToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!resetLoading}
                  />
                </View>

                <View style={[styles.modalInputRow, { borderColor: '#E2E8F0' }]}>
                  <MaterialIcons name="lock" size={18} color={NAVY} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Новый пароль"
                    placeholderTextColor="#94A3B8"
                    value={resetNewPwd}
                    onChangeText={setResetNewPwd}
                    secureTextEntry={!showResetPwd}
                    editable={!resetLoading}
                  />
                  <TouchableOpacity onPress={() => setShowResetPwd(v => !v)} disabled={!resetNewPwd}>
                    <MaterialIcons name={showResetPwd ? 'visibility' : 'visibility-off'} size={18} color={resetNewPwd ? NAVY : '#CBD5E1'} />
                  </TouchableOpacity>
                </View>

                {/* Требования к паролю — подсказка снизу, отмечается по мере ввода */}
                <View style={styles.pwdRules}>
                  {PASSWORD_RULES.map((r) => {
                    const ok = r.test(resetNewPwd);
                    return (
                      <View key={r.label} style={styles.pwdRuleRow}>
                        <MaterialIcons
                          name={ok ? 'check-circle' : 'radio-button-unchecked'}
                          size={14}
                          color={ok ? '#10B981' : '#CBD5E1'}
                        />
                        <Text style={[styles.pwdRuleText, { color: ok ? '#10B981' : '#94A3B8' }]}>
                          {r.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={[styles.modalInputRow, { borderColor: '#E2E8F0' }]}>
                  <MaterialIcons name="lock-outline" size={18} color={NAVY} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Повторите пароль"
                    placeholderTextColor="#94A3B8"
                    value={resetConfirm}
                    onChangeText={setResetConfirm}
                    secureTextEntry={!showResetConfirm}
                    editable={!resetLoading}
                  />
                  <TouchableOpacity onPress={() => setShowResetConfirm(v => !v)} disabled={!resetConfirm}>
                    <MaterialIcons name={showResetConfirm ? 'visibility' : 'visibility-off'} size={18} color={resetConfirm ? NAVY : '#CBD5E1'} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.modalBtn, resetLoading && { opacity: 0.7 }]}
                  onPress={handleResetSubmit}
                  disabled={resetLoading}
                  activeOpacity={0.85}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalBtnText}>
                        {setupMode ? 'Установить пароль' : 'Сменить пароль'}
                      </Text>
                  }
                </TouchableOpacity>

                {/* Назад на шаг 1 — только в режиме сброса. */}
                {!setupMode && (
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => { setResetStep(1); setResetToken(''); setResetNewPwd(''); setResetConfirm(''); }}
                    disabled={resetLoading}
                  >
                    <MaterialIcons name="arrow-back" size={14} color="#64748B" />
                    <Text style={styles.backBtnText}>Изменить email</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    overflow: 'hidden',
  },
  gradientPlane: {
    position: 'absolute',
    top: '-12%',
    left: '-12%',
    width: '124%',
    height: '124%',
  },
  flex: {
    flex: 1,
  },

  // ── Top hero ──
  topSection: {
    flex: 0.42,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingBottom: 16,
  },
  // Logo
  logoWrap: {
    position: 'relative',
    marginBottom: spacing.lg,
  },

  appName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  pill: {
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: `${TEAL}80`,
  },
  appSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Form card ──
  formCard: {
    flex: 0.58,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  formBottomFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -160,
    height: 160,
  },
  formContent: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 13,
    marginBottom: 24,
  },

  // Inputs
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  inputIconBox: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 10,
    paddingRight: 12,
    fontSize: 14,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  forgotBtn: {
    alignSelf: 'center',
    marginTop: 14,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Button
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  biometricBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  loadingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  loadingHintText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Reset modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalIconBox: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
  modalSub:   { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  modalClose: { padding: 4 },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 12,
  },
  modalInput: {
    flex: 1, fontSize: 14, color: '#1E293B',
    paddingVertical: 12,
  },
  pwdRules: {
    marginTop: -2,
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  pwdRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pwdRuleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    borderRadius: 1,
  },
  modalBtn: {
    backgroundColor: NAVY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  backBtnText: { fontSize: 13, color: '#64748B' },

  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 5,
  },
  footerHintText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
