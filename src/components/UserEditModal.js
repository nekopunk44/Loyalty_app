import React, { useState, useEffect } from 'react';
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
import { spacing, borderRadius } from '../constants/theme';
import * as FirebaseService from '../services/FirebaseService';

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
    { label: 'Bronze', value: 'Bronze', icon: 'shield', color: '#CD7F32' },
    { label: 'Silver', value: 'Silver', icon: 'grade', color: '#C0C0C0' },
    { label: 'Gold', value: 'Gold', icon: 'star', color: '#FFD700' },
    { label: 'Platinum', value: 'Platinum', icon: 'flare', color: '#9999FF' },
  ];

  const statuses = [
    { label: 'Активен', value: 'active' },
    { label: 'Заблокирован', value: 'blocked' },
    { label: 'На паузе', value: 'paused' },
  ];

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

  const handleSaveChanges = async () => {
    console.log('💾 handleSaveChanges called');
    
    if (!formData.displayName) {
      Alert.alert('⚠️ Ошибка', 'Введите имя пользователя');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Отправляю данные на сервер:', {
        userId: user.id,
        displayName: formData.displayName,
        phone: formData.phone,
        role: formData.role,
        membershipLevel: formData.membershipLevel,
        status: formData.status,
      });

      await FirebaseService.updateUserAsAdmin(user.id, {
        displayName: formData.displayName,
        phone: formData.phone,
        role: formData.role,
        membershipLevel: formData.membershipLevel,
        status: formData.status,
      });

      console.log('✅ Обновление успешно!');

      console.log('📬 Вызываю callback onUserUpdated');
      // Вызываем callback для закрытия окна и показа уведомления
      if (onUserUpdated) onUserUpdated({...user, ...formData});
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
          <Text style={[styles.title, { color: colors.text }]}>✏️ Редактировать пользователя</Text>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* Аватар и основная информация */}
          <View style={styles.userHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {formData.displayName.split(' ').map(w => w[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.userBasicInfo}>
              <Text style={[styles.userEmail, { color: colors.text }]}>{user?.email}</Text>
              <Text style={[styles.userId, { color: colors.textSecondary }]}>ID: {user?.id?.substring(0, 8)}...</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Телефон</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Роль</Text>
            <SelectButton 
              options={roles} 
              value={formData.role}
              onChange={(value) => handleInputChange('role', value)}
            />
          </View>

          {/* Уровень членства */}
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

          {/* Статус */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Статус аккаунта</Text>
            <SelectButton 
              options={statuses} 
              value={formData.status}
              onChange={(value) => handleInputChange('status', value)}
            />
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
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
