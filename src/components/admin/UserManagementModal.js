import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const API_BASE_URL = getApiUrl();
const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;

const ROLES = [
  { label: 'Пользователь',  value: 'user',  icon: 'person',                color: '#14B8A6' },
  { label: 'Администратор', value: 'admin', icon: 'admin-panel-settings',  color: '#2196F3' },
];

const LEVELS = [
  { label: 'Bronze',   value: 'Bronze',   icon: 'shield', color: '#CD7F32' },
  { label: 'Silver',   value: 'Silver',   icon: 'grade',  color: '#C0C0C0' },
  { label: 'Gold',     value: 'Gold',     icon: 'star',   color: '#FFD700' },
  { label: 'Platinum', value: 'Platinum', icon: 'flare',  color: '#9999FF' },
];

const EMPTY_FORM = {
  email: '',
  displayName: '',
  phone: '',
  role: 'user',
  membershipLevel: 'Bronze',
};

export default function UserManagementModal({ visible, onClose, theme, onUserCreated, onNotify }) {
  const colors = theme.colors;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  // ── открытие/закрытие с анимацией ────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_H);
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: SHEET_H,
        duration: 260,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [visible]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  // ── валидация и submit ───────────────────────────────────────────────────
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      Alert.alert('Ошибка валидации', 'Введите имя пользователя');
      return false;
    }
    if (formData.displayName.length < 2) {
      Alert.alert('Ошибка валидации', 'Имя должно быть минимум 2 символа');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Ошибка валидации', 'Введите email');
      return false;
    }
    if (!validateEmail(formData.email)) {
      Alert.alert('Ошибка валидации', 'Введите корректный email');
      return false;
    }
    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const data = await apiCall(`${API_BASE_URL}/auth/register-admin`, {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          displayName: formData.displayName,
          phone: formData.phone,
          role: formData.role,
          membershipLevel: formData.membershipLevel,
        }),
      });
      if (data.error) {
        throw new Error(data.message || data.error || 'Ошибка при создании пользователя');
      }
      if (onNotify) onNotify(formData.displayName || formData.email, formData.email);
      if (onUserCreated) onUserCreated(data.user);
      setFormData(EMPTY_FORM);
      onClose();
      // Сообщаем админу, что произошло после создания.
      if (data.emailSent) {
        Alert.alert(
          'Пользователь создан',
          `Письмо-приглашение отправлено на ${formData.email}. Пользователь задаст пароль сам по ссылке из письма (код действует 24 часа).`,
        );
      } else if (data.setupToken) {
        // Dev-режим без SMTP: показываем код, чтобы передать вручную.
        Alert.alert(
          'Пользователь создан',
          `Письмо отправить не удалось. Передайте код приглашения вручную:\n\n${data.setupToken}\n\nКод действует 24 часа.`,
        );
      } else {
        Alert.alert(
          'Пользователь создан',
          'Письмо отправить не удалось. Сообщите пользователю код приглашения вручную (см. логи сервера).',
        );
      }
    } catch (error) {
      let msg = 'Не удалось создать пользователя';
      const m = error.message || '';
      if (
        m.includes('email-already-in-use') ||
        m.includes('already registered') ||
        m.includes('уже зарегистрирован')
      ) {
        msg = 'Этот email уже зарегистрирован';
      } else if (m.includes('Network')) {
        msg = 'Ошибка сети. Проверьте подключение';
      } else if (m.includes('Timeout')) {
        msg = 'Время ожидания истекло. Попробуйте ещё раз';
      } else if (m) {
        msg = m;
      }
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'role' && value === 'admin') next.membershipLevel = null;
      if (field === 'role' && value === 'user' && !prev.membershipLevel) next.membershipLevel = 'Bronze';
      return next;
    });
  };

  // ── option pills ─────────────────────────────────────────────────────────
  const OptionPill = ({ active, color, label, icon, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.pill,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        active && { borderColor: color, backgroundColor: `${color}14` },
      ]}
    >
      <MaterialIcons name={icon} size={16} color={active ? color : colors.textSecondary} />
      <Text style={[
        styles.pillText,
        { color: active ? color : colors.textSecondary },
        active && { fontWeight: '800' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_H,
              backgroundColor: colors.background,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* drag handle + header */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Новый пользователь</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  На указанный email будет отправлено приглашение — пользователь задаст пароль сам
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                style={[styles.closeBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              >
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Email */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.email}
                  onChangeText={(t) => handleInputChange('email', t)}
                  editable={!loading}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Имя */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Имя</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Иван Петров"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.displayName}
                  onChangeText={(t) => handleInputChange('displayName', t)}
                  editable={!loading}
                />
              </View>

              {/* Телефон */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Телефон (необязательно)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="+7 (999) 123-45-67"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.phone}
                  onChangeText={(t) => handleInputChange('phone', t)}
                  editable={!loading}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Роль */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Роль в системе</Text>
                <View style={styles.pillRow}>
                  {ROLES.map(r => (
                    <OptionPill
                      key={r.value}
                      active={formData.role === r.value}
                      color={r.color}
                      label={r.label}
                      icon={r.icon}
                      onPress={() => handleInputChange('role', r.value)}
                    />
                  ))}
                </View>
              </View>

              {/* Уровень лояльности */}
              {formData.role === 'user' && (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Уровень лояльности</Text>
                  <View style={styles.pillRow}>
                    {LEVELS.map(l => (
                      <OptionPill
                        key={l.value}
                        active={formData.membershipLevel === l.value}
                        color={l.color}
                        label={l.label}
                        icon={l.icon}
                        onPress={() => handleInputChange('membershipLevel', l.value)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}40` }]}>
                <MaterialIcons name="info" size={18} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  Пользователь сможет войти с указанным email и паролем сразу после создания.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* footer */}
          <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateUser}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="person-add" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Создать</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6, 18, 30, 0.46)',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#063B5C',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  dragArea: {},
  handleArea: {
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },

  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  field: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: '500',
  },
  passwordWrap: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: '500',
  },
  passwordToggle: { padding: spacing.sm },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 12, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  createBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
