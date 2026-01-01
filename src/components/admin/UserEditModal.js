import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { API_ENDPOINTS, apiCall } from '../../utils/api';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;

export default function UserEditModal({ visible, onClose, user, theme, onUserUpdated }) {
  const colors = theme.colors;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    role: 'user',
    membershipLevel: 'Bronze',
    status: 'active',
  });

  // Bottom-sheet анимация в стиле NotificationBell.
  // sheetMounted держит Modal в дереве, пока проигрывается close-анимация;
  // sheetTranslateY двигает контент от SHEET_H к 0 при открытии и обратно при закрытии.
  const [sheetMounted, setSheetMounted] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_H)).current;

  const openSheet = () => {
    sheetTranslateY.setValue(SHEET_H);
    setSheetMounted(true);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    if (loading) return;
    Animated.timing(sheetTranslateY, {
      toValue: SHEET_H,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSheetMounted(false);
        onClose && onClose();
      }
    });
  };

  // Свайп-вниз по drag-handle закрывает sheet — как в NotificationBell.
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          closeSheet();
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  // Открываем sheet при появлении props.visible; закрываем — если родитель сбросил visible.
  useEffect(() => {
    if (visible && !sheetMounted) openSheet();
    if (!visible && sheetMounted) {
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_H,
        duration: 240,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSheetMounted(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || user.name || '',
        phone: user.phone || '',
        role: user.role || 'user',
        membershipLevel: user.membershipLevel || user.level?.toUpperCase() || 'Bronze',
        status: user.status || 'active',
      });
    }
  }, [user, visible]);

  const roles = [
    { label: 'Пользователь', value: 'user' },
    { label: 'Администратор', value: 'admin' },
  ];

  const levels = [
    { label: 'Bronze',   value: 'Bronze',   icon: 'shield', color: '#CD7F32' },
    { label: 'Silver',   value: 'Silver',   icon: 'grade',  color: '#C0C0C0' },
    { label: 'Gold',     value: 'Gold',     icon: 'star',   color: '#FFD700' },
    { label: 'Platinum', value: 'Platinum', icon: 'flare',  color: '#9999FF' },
  ];

  const statuses = [
    { label: 'Активен',      value: 'active' },
    { label: 'Заблокирован', value: 'blocked' },
    { label: 'На паузе',     value: 'paused' },
  ];

  const handleInputChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'role' && value === 'admin') {
      updates.membershipLevel = null;
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSaveChanges = async () => {
    if (!formData.displayName) {
      Alert.alert('⚠️ Ошибка', 'Введите имя пользователя');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall(API_ENDPOINTS.USERS.UPDATE(user.id), {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: formData.displayName,
          phone: formData.phone,
          role: formData.role,
          membershipLevel: formData.membershipLevel,
          status: formData.status,
        }),
      });
      if (!response.success) throw new Error(response.error || 'Не удалось обновить профиль');

      if (onUserUpdated) onUserUpdated({ ...user, ...formData });
    } catch (error) {
      console.error('❌ Ошибка обновления:', error);
      Alert.alert('❌ Ошибка', error.message || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const SelectButton = ({ options, value, onChange }) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
            value === option.value && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.optionText,
              { color: colors.text },
              value === option.value && { color: '#fff', fontWeight: '700' },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal
      visible={sheetMounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.modalContainer}>
        {/* Tap по backdrop закрывает sheet */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={closeSheet}
        />
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.cardBg,
              height: SHEET_H,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag handle — реагирует на свайп вниз */}
          <View style={styles.dragHandleWrap} {...sheetPanResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Заголовок по центру, close-кнопка справа, симметричный spacer слева */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderSpacer} />
            <View style={styles.modalHeaderCenter} pointerEvents="none">
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                Редактировать пользователя
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                Изменение профиля и уровня
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeSheet}
              hitSlop={8}
              disabled={loading}
              style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}
            >
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Шапка пользователя — аватар + email + id */}
            <View style={[styles.userHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {formData.displayName.split(' ').map(w => w[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userBasicInfo}>
                <Text style={[styles.userEmail, { color: colors.text }]} numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text style={[styles.userId, { color: colors.textSecondary }]} numberOfLines={1}>
                  ID: {user?.id?.substring(0, 8)}...
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Имя</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Иван Петров"
                placeholderTextColor={colors.textSecondary}
                value={formData.displayName}
                onChangeText={(text) => handleInputChange('displayName', text)}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Телефон</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="+7 (999) 123-45-67"
                placeholderTextColor={colors.textSecondary}
                value={formData.phone}
                onChangeText={(text) => handleInputChange('phone', text)}
                editable={!loading}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Роль</Text>
              <SelectButton
                options={roles}
                value={formData.role}
                onChange={(value) => handleInputChange('role', value)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Уровень членства</Text>
              <View style={styles.optionsContainer}>
                {levels.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.optionButton,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                      formData.membershipLevel === level.value && { backgroundColor: level.color, borderColor: level.color },
                    ]}
                    onPress={() => handleInputChange('membershipLevel', level.value)}
                  >
                    <MaterialIcons
                      name={level.icon}
                      size={18}
                      color={formData.membershipLevel === level.value ? '#fff' : level.color}
                      style={styles.buttonIcon}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        { color: colors.text },
                        formData.membershipLevel === level.value && { color: '#fff', fontWeight: '700' },
                      ]}
                    >
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Статус аккаунта</Text>
              <SelectButton
                options={statuses}
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={closeSheet}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveChanges}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Сохранить</Text>
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 30, 0.46)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalHeaderSpacer: { width: 32 },
  modalHeaderCenter: { flex: 1, alignItems: 'center', minWidth: 0 },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingBottom: spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  userBasicInfo: {
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  userId: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
