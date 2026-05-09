import React, { useState } from 'react';
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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const API_BASE_URL = getApiUrl();

export default function UserManagementModal({ visible, onClose, theme, onUserCreated, onNotify }) {
  const colors = theme.colors;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    phone: '',
    role: 'user', // 'user', 'admin', 'manager'
    membershipLevel: 'Bronze', // 'Bronze', 'Silver', 'Gold', 'Platinum'
  });

  const roles = [
    { label: 'Пользователь', value: 'user', icon: 'person', color: colors.primary },
    { label: 'Администратор', value: 'admin', icon: 'admin-panel-settings', color: '#2196F3' },
  ];

  const levels = [
    { label: 'Bronze', value: 'Bronze', icon: 'shield', color: '#CD7F32' },
    { label: 'Silver', value: 'Silver', icon: 'grade', color: '#C0C0C0' },
    { label: 'Gold', value: 'Gold', icon: 'star', color: '#FFD700' },
    { label: 'Platinum', value: 'Platinum', icon: 'flare', color: '#9999FF' },
  ];

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите имя пользователя');
      return false;
    }

    if (formData.displayName.length < 2) {
      Alert.alert('⚠️ Ошибка валидации', 'Имя должно быть минимум 2 символа');
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите email');
      return false;
    }

    if (!validateEmail(formData.email)) {
      Alert.alert('⚠️ Ошибка валидации', 'Введите корректный email (например: user@example.com)');
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert('⚠️ Ошибка валидации', 'Пожалуйста, введите пароль');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('⚠️ Ошибка валидации', 'Пароль должен быть минимум 6 символов');
      return false;
    }

    if (!/[a-zA-Zа-яА-Я]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      Alert.alert('⚠️ Слабый пароль', 'Пароль должен содержать буквы и цифры (например: Pass123)');
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
          password: formData.password,
          displayName: formData.displayName,
          phone: formData.phone,
          role: formData.role,
          membershipLevel: formData.membershipLevel,
        }),
      });

      if (data.error) {
        throw new Error(data.message || data.error || 'Ошибка при создании пользователя');
      }

      // Отправляем уведомление
      if (onNotify) {
        onNotify(formData.displayName || formData.email, formData.email);
      }
      
      // Вызываем callback для обновления списка и закрываем окно
      if (onUserCreated) onUserCreated(data.user);
      
      // Очищаем форму и закрываем модаль
      setFormData({
        email: '',
        password: '',
        displayName: '',
        phone: '',
        role: 'user',
        membershipLevel: 'Bronze',
      });
      onClose();
    } catch (error) {
      console.error('❌ Ошибка создания пользователя:', error);
      
      let errorMessage = 'Не удалось создать пользователя';
      if (error.message && error.message.includes('email-already-in-use')) {
        errorMessage = 'Этот email уже зарегистрирован. Используйте другой email';
      } else if (error.message && error.message.includes('already registered')) {
        errorMessage = 'Этот email уже зарегистрирован. Используйте другой email';
      } else if (error.message && error.message.includes('Network')) {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету и что сервер запущен на localhost:5002';
      } else if (error.message && error.message.includes('Timeout')) {
        errorMessage = 'Время ожидания истекло. Попробуйте ещё раз';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('❌ Ошибка создания пользователя', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    const updates = { [field]: value };
    
    // Если меняем роль на администратора, очищаем membershipLevel
    if (field === 'role' && value === 'admin') {
      updates.membershipLevel = null;
    }
    
    setFormData(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const RoleButton = ({ label, value, icon, color }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        formData.role === value && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => handleInputChange('role', value)}
    >
      <MaterialIcons 
        name={icon} 
        size={18} 
        color={formData.role === value ? '#fff' : color}
        style={styles.buttonIcon}
      />
      <Text
        style={[
          styles.optionText,
          { color: colors.text },
          formData.role === value && { color: '#fff', fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const LevelButton = ({ label, value, icon, color }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
        formData.membershipLevel === value && { backgroundColor: color, borderColor: color },
      ]}
      onPress={() => handleInputChange('membershipLevel', value)}
    >
      <MaterialIcons 
        name={icon} 
        size={18} 
        color={formData.membershipLevel === value ? '#fff' : color}
        style={styles.buttonIcon}
      />
      <Text
        style={[
          styles.optionText,
          { color: colors.text },
          formData.membershipLevel === value && { color: '#fff', fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Заголовок */}
        <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Добавить пользователя</Text>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* Email */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              placeholder="user@example.com"
              placeholderTextColor={colors.textSecondary}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Пароль */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Пароль (мин. 6 символов)</Text>
            <View style={[styles.passwordInputWrapper, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <TextInput
                style={[styles.inputPassword, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                editable={!loading}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={!formData.password}
                style={styles.passwordToggle}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={formData.password ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Имя */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Имя</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Иван Петров"
              placeholderTextColor={colors.textSecondary}
              value={formData.displayName}
              onChangeText={(text) => handleInputChange('displayName', text)}
              editable={!loading}
            />
          </View>

          {/* Телефон */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Телефон (опционально)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
              placeholder="+7 (999) 123-45-67"
              placeholderTextColor={colors.textSecondary}
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              editable={!loading}
              keyboardType="phone-pad"
            />
          </View>

          {/* Роль */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Роль в системе</Text>
            <View style={styles.optionsContainer}>
              {roles.map((role) => (
                <RoleButton 
                  key={role.value} 
                  label={role.label} 
                  value={role.value}
                  icon={role.icon}
                  color={role.color}
                />
              ))}
            </View>
          </View>

          {/* Статус лояльности - только для обычных пользователей */}
          {formData.role === 'user' && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Статус лояльности</Text>
              <View style={styles.optionsContainer}>
                {levels.map((level) => (
                  <LevelButton 
                    key={level.value} 
                    label={level.label} 
                    value={level.value}
                    icon={level.icon}
                    color={level.color}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Информационное сообщение */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Пользователь сможет логиниться с указанными email и паролем сразу после создания.
            </Text>
          </View>
        </ScrollView>

        {/* Кнопки */}
        <View style={[styles.footer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="person-add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Создать</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
  passwordInputWrapper: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  inputPassword: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: '500',
  },
  passwordToggle: {
    padding: spacing.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  createButton: {
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
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
