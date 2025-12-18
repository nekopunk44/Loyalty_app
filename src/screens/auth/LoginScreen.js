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
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAVY = '#063B5C';
const TEAL = '#14B8A6';
const AMBER = '#F59E0B';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetVisible, setResetVisible]         = useState(false);
  const [resetStep, setResetStep]               = useState(1); // 1 = email, 2 = token+password
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

  // Hero background pulse animations
  const blob1 = useRef(new Animated.Value(1)).current;
  const blob2 = useRef(new Animated.Value(1)).current;
  const blob3 = useRef(new Animated.Value(1)).current;

  const { login, error, requestPasswordReset, setNewPassword } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const useNative = Platform.OS !== 'web';

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

    // Background blob pulses
    const pulse = (val, toVal, dur, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: toVal, duration: dur, useNativeDriver: useNative }),
          Animated.timing(val, { toValue: 1,     duration: dur, useNativeDriver: useNative }),
        ])
      );
    pulse(blob1, 1.35, 3400).start();
    pulse(blob2, 1.20, 2800, 1200).start();
    pulse(blob3, 1.28, 3800, 2400).start();
  }, []);

  const handleForgotPassword = () => {
    setResetEmail(username);
    setResetToken('');
    setResetNewPwd('');
    setResetConfirm('');
    setResetStep(1);
    setResetVisible(true);
  };

  const handleCloseReset = () => {
    setResetVisible(false);
    setResetStep(1);
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
    if (resetNewPwd.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 8 символов'); return;
    }
    if (resetNewPwd !== resetConfirm) {
      Alert.alert('Ошибка', 'Пароли не совпадают'); return;
    }
    setResetLoading(true);
    try {
      await setNewPassword(resetToken.trim(), resetNewPwd);
      handleCloseReset();
      Alert.alert('Готово', 'Пароль успешно изменён. Войдите с новым паролем.');
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось сменить пароль');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите пароль');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 6 символов');
      return;
    }
    if (username.includes('@') && !username.includes('.')) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);

    if (!success) {
      Alert.alert('Ошибка входа', error || 'Неверные учётные данные. Попробуйте ещё раз');
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* ── Top navy hero ── */}
        <Animated.View style={[
          styles.topSection,
          { opacity: topOpacity, transform: [{ scale: topScale }] },
        ]}>
          {/* Animated background blobs */}
          <Animated.View style={[styles.blob1, { transform: [{ scale: blob1 }] }]} />
          <Animated.View style={[styles.blob2, { transform: [{ scale: blob2 }] }]} />
          <Animated.View style={[styles.blob3, { transform: [{ scale: blob3 }] }]} />

          {/* Decorative arcs */}
          <View style={styles.decArc1} />
          <View style={styles.decArc2} />
          <View style={styles.decArc3} />

          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoFrame}>
              <View style={styles.logoBox}>
                <Text style={styles.logoMonogram}>VJ</Text>
                <View style={styles.logoLine} />
              </View>
            </View>
            <View style={styles.logoBadge} />
          </View>

          {/* App name */}
          <Text style={styles.appName}>Villa Jaconda</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill} />
            <Text style={styles.appSubtitle}>Программа лояльности</Text>
            <View style={styles.pill} />
          </View>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View style={[
          styles.formCard,
          { backgroundColor: colors.cardBg, opacity: formOpacity, transform: [{ translateY: formY }] },
        ]}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.welcomeTitle, { color: NAVY }]}>Добро пожаловать</Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
              Войдите в аккаунт, чтобы продолжить
            </Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.inputIconBox, { backgroundColor: `${NAVY}12` }]}>
                  <MaterialIcons name="email" size={18} color={NAVY} />
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Введите email"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Пароль</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.inputIconBox, { backgroundColor: `${NAVY}12` }]}>
                  <MaterialIcons name="lock" size={18} color={NAVY} />
                </View>
                <TextInput
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

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotText, { color: NAVY }]}>Забыли пароль?</Text>
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
              <Text style={[styles.footerHintText, { color: colors.textSecondary }]}>
                Доступ только для зарегистрированных участников
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Reset password modal ── */}
      <Modal visible={resetVisible} transparent animationType="fade" onRequestClose={handleCloseReset}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: `${NAVY}12` }]}>
                <MaterialIcons name="lock-reset" size={22} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {resetStep === 1 ? 'Сброс пароля' : 'Новый пароль'}
                </Text>
                <Text style={styles.modalSub}>
                  {resetStep === 1
                    ? 'Введите email — отправим код подтверждения'
                    : 'Введите код из письма и новый пароль'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCloseReset} style={styles.modalClose}>
                <MaterialIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Индикатор шагов */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: NAVY }]} />
              <View style={[styles.stepLine, { backgroundColor: resetStep === 2 ? NAVY : '#E2E8F0' }]} />
              <View style={[styles.stepDot, { backgroundColor: resetStep === 2 ? NAVY : '#E2E8F0' }]} />
            </View>

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
                    : <Text style={styles.modalBtnText}>Сменить пароль</Text>
                  }
                </TouchableOpacity>

                {/* Назад на шаг 1 */}
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => { setResetStep(1); setResetToken(''); setResetNewPwd(''); setResetConfirm(''); }}
                  disabled={resetLoading}
                >
                  <MaterialIcons name="arrow-back" size={14} color="#64748B" />
                  <Text style={styles.backBtnText}>Изменить email</Text>
                </TouchableOpacity>
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
  blob1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${TEAL}1A`,
    top: -50,
    left: -40,
  },
  blob2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${AMBER}14`,
    bottom: 0,
    right: -30,
  },
  blob3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,53,0.10)',
    top: '30%',
    right: '20%',
  },
  decArc1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: `${TEAL}30`,
    top: -80,
    left: -60,
  },
  decArc2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: `${AMBER}25`,
    bottom: -30,
    right: -40,
  },
  decArc3: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${TEAL}12`,
    top: 20,
    right: 30,
  },

  // Logo
  logoWrap: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: `${TEAL}55`,
    padding: 6,
  },
  logoBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: `${TEAL}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMonogram: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  logoLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: AMBER,
    marginTop: 5,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AMBER,
    borderWidth: 2,
    borderColor: NAVY,
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
