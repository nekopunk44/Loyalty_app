import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import * as FirebaseService from '../services/FirebaseService';

export default function UserDeleteConfirmModal({ visible, onClose, user, theme, onUserDeleted }) {
  const colors = theme.colors;
  const [loading, setLoading] = useState(false);

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      await FirebaseService.deleteUserAsAdmin(user.id);
      
      Alert.alert(
        '✅ Удалено',
        `Пользователь ${user.displayName || user.name} успешно удален`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onUserDeleted) onUserDeleted(user.id);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Ошибка удаления:', error);
      Alert.alert('❌ Ошибка', error.message || 'Не удалось удалить пользователя');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.cardBg }]}>
          {/* Иконка предупреждения */}
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
            <MaterialIcons name="warning" size={48} color={colors.secondary} />
          </View>

          {/* Заголовок */}
          <Text style={[styles.title, { color: colors.text }]}>Удалить пользователя?</Text>

          {/* Описание */}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.displayName || user?.name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          {/* Предупреждение */}
          <View style={[styles.warningBox, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}>
            <MaterialIcons name="info" size={18} color={colors.secondary} />
            <Text style={[styles.warningText, { color: colors.text }]}>
              Это действие нельзя отменить. Профиль пользователя будет удален из системы.
            </Text>
          </View>

          {/* Кнопки */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, { backgroundColor: colors.secondary }]}
              onPress={handleDeleteUser}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="delete" size={18} color="#fff" />
                  <Text style={styles.deleteButtonText}>Удалить</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    width: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 13,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
