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
 * Компонент карточки пользователя с дизайном по уровню
 */
export const UserLevelCard = ({ user, onPress, onEdit, onDelete }) => {
  // Получаем конфигурацию уровня
  const getLevelConfig = (level, role) => {
    if (role === 'admin') {
      return {
        label: 'Администратор',
        icon: 'shield-admin',
        colors: ['#007AFF', '#0051D5'],
        accentColor: '#007AFF',
        textColor: '#fff',
        borderColor: '#0051D5',
        shadowColor: '#007AFF',
        badge: 'ADMIN',
      };
    }

    const configs = {
      platinum: {
        label: 'Platinum',
        icon: 'diamond',
        colors: ['#E5D4FF', '#D8B8FF'],
        accentColor: '#B366FF',
        textColor: '#6B00CC',
        borderColor: '#B366FF',
        shadowColor: '#D8B8FF',
        badge: '★★★★',
      },
      gold: {
        label: 'Gold',
        icon: 'star',
        colors: ['#FFE66D', '#FFD700'],
        accentColor: '#FFA500',
        textColor: '#8B6914',
        borderColor: '#FFA500',
        shadowColor: '#FFD700',
        badge: '★★★',
      },
      silver: {
        label: 'Silver',
        icon: 'star-half',
        colors: ['#E8E8E8', '#C0C0C0'],
        accentColor: '#A9A9A9',
        textColor: '#4A4A4A',
        borderColor: '#A9A9A9',
        shadowColor: '#C0C0C0',
        badge: '★★',
      },
      bronze: {
        label: 'Bronze',
        icon: 'shield',
        colors: ['#D4A574', '#CD7F32'],
        accentColor: '#8B4513',
        textColor: '#fff',
        borderColor: '#8B4513',
        shadowColor: '#CD7F32',
        badge: '★',
      },
    };

    return configs[level?.toLowerCase()] || configs.bronze;
  };

  const levelConfig = getLevelConfig(user.membershipLevel || user.level, user.role);

  const getAvatarBackground = () => {
    const level = user.membershipLevel || user.level;
    if (user.role === 'admin') return '#007AFF';
    switch (level?.toLowerCase()) {
      case 'platinum': return '#B366FF';
      case 'gold': return '#FFA500';
      case 'silver': return '#A9A9A9';
      case 'bronze': return '#8B4513';
      default: return colors.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          shadowColor: levelConfig.shadowColor,
          borderColor: levelConfig.borderColor,
        }
      ]}
      onPress={onPress}
    >
      {/* Фоновый градиент */}
      <GradientView
        colors={levelConfig.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Контент карточки */}
      <View style={styles.content}>
        {/* Заголовок с аватаром и уровнем */}
        <View style={styles.header}>
          <View style={styles.avatarSection}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: getAvatarBackground() }
              ]}
            >
              <Text style={styles.avatarText}>
                {user.name.split(' ').map(w => w[0]).join('').toUpperCase()}
              </Text>
              {user.status === 'online' && (
                <View style={[styles.onlineIndicator, { borderColor: levelConfig.accentColor }]} />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>

          {/* Уровень бейдж */}
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: levelConfig.accentColor }
            ]}
          >
            <MaterialIcons 
              name={levelConfig.icon} 
              size={16} 
              color={levelConfig.textColor} 
            />
            <Text style={[styles.levelLabel, { color: levelConfig.textColor }]}>
              {levelConfig.label}
            </Text>
          </View>
        </View>

        {/* Звезды */}
        <View style={styles.starsContainer}>
          <Text style={[styles.stars, { color: levelConfig.accentColor }]}>
            {levelConfig.badge}
          </Text>
        </View>

        {/* Статистика */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <MaterialIcons 
              name="star" 
              size={14} 
              color={levelConfig.accentColor} 
            />
            <Text style={[styles.statText, { color: levelConfig.textColor }]}>
              {user.rating || 0}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <MaterialIcons 
              name="shopping-bag" 
              size={14} 
              color={levelConfig.accentColor} 
            />
            <Text style={[styles.statText, { color: levelConfig.textColor }]}>
              {user.purchases || 0}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <MaterialIcons 
              name="trending-up" 
              size={14} 
              color={levelConfig.accentColor} 
            />
            <Text style={[styles.statText, { color: levelConfig.textColor }]}>
              {user.loyaltyPoints || 0}
            </Text>
          </View>
        </View>

        {/* Действия */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: levelConfig.accentColor }]}
            onPress={onEdit}
          >
            <MaterialIcons name="edit" size={16} color={levelConfig.textColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
            onPress={onDelete}
          >
            <MaterialIcons name="delete" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: '#fff',
    elevation: 5,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  starsContainer: {
    marginBottom: spacing.sm,
  },
  stars: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
