import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { GradientView } from './GradientView';
import { colors, spacing, borderRadius } from '../constants/theme';

/**
 * Компонент карточки пользователя для списка администратора
 */
export const AdminUserListCard = ({
  user,
  onPress,
  onEdit,
  onDelete,
  theme,
}) => {
  const getLevelColor = (level, role) => {
    if (role === 'admin') return '#007AFF';
    // Проверяем оба варианта поля (membershipLevel или level)
    const userLevel = level?.toLowerCase() || 'bronze';
    switch (userLevel) {
      case 'platinum':
        return '#E5D4FF';
      case 'gold':
        return '#FFD700';
      case 'silver':
        return '#C0C0C0';
      case 'bronze':
        return '#CD7F32';
      default:
        return colors.border;
    }
  };

  const getLevelLabel = (level, role) => {
    if (role === 'admin') return 'Admin';
    const userLevel = level?.toLowerCase() || 'bronze';
    const labels = {
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      bronze: 'Bronze',
    };
    return labels[userLevel] || 'Bronze';
  };

  // Используем membershipLevel если есть, иначе level
  const levelColor = getLevelColor(user.membershipLevel || user.level, user.role);
  const isAdmin = user.role === 'admin';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderLeftColor: levelColor,
          backgroundColor: theme.colors.cardBg,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Фоновый градиент для админов - отключен для темной темы */}
      {false && (
        <GradientView
          colors={[theme.isDark ? '#1E3A8A' : '#E3F2FD', theme.isDark ? '#1E293B' : '#F5FBFF']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top Accent Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: levelColor },
        ]}
      />

      {/* Content Container */}
      <View style={styles.content}>
        {/* Left - Avatar */}
        <View
          style={[
            styles.avatar,
            { backgroundColor: levelColor },
          ]}
        >
          <Text style={styles.avatarText}>
            {user.name.split(' ').map(w => w[0]).join('').toUpperCase()}
          </Text>
          {user.status === 'online' && (
            <View
              style={[
                styles.onlineIndicator,
                { borderColor: theme.colors.cardBg },
              ]}
            />
          )}
        </View>

        {/* Center - User Info */}
        <View style={styles.userInfo}>
          {/* Name and Badge Row */}
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.userName,
                { color: theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <MaterialIcons name="shield" size={13} color="#fff" />
              </View>
            )}
          </View>

          {/* Email */}
          <Text
            style={[
              styles.userEmail,
              { color: theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {user.email}
          </Text>

          {/* Meta Info Row */}
          <View style={styles.metaRow}>
            {/* Role/Level Badge */}
            <View style={[styles.badge, { backgroundColor: isAdmin ? '#007AFF' : 'transparent', borderColor: levelColor, borderWidth: isAdmin ? 0 : 1 }]}>
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isAdmin ? '#fff' : levelColor,
                    fontWeight: isAdmin ? '600' : '500',
                  },
                ]}
              >
                {getLevelLabel(user.membershipLevel || user.level, user.role)}
              </Text>
            </View>

            {/* Status Badge - Always Show */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: user.status === 'online' ? '#4CAF50' : '#9E9E9E' }
            ]}>
              <Text style={styles.statusText}>
                {user.status === 'online' ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right - Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={onEdit}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderLeftWidth: 5,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  topBar: {
    height: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    bottom: -2,
    right: -2,
    borderWidth: 2.5,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  adminBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFB800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});

export default AdminUserListCard;
