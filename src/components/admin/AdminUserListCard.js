import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../../constants/theme';

const LEVEL_COLORS = {
  platinum: '#A78BFA',
  gold:     '#F5B301',
  silver:   '#9CA3AF',
  bronze:   '#B97A45',
};

const LEVEL_LABELS = {
  platinum: 'Platinum',
  gold:     'Gold',
  silver:   'Silver',
  bronze:   'Bronze',
};

const ADMIN_BLUE   = '#3B82F6';
const ONLINE_GREEN = '#10B981';
const ICON_MUTED   = '#6B7280';
const DELETE_RED   = '#EF4444';

export const AdminUserListCard = ({
  user,
  onPress,
  onEdit,
  onDelete,
  onQuickBalance,
  theme,
}) => {
  const isAdmin = user.role === 'admin';
  const isOnline = user.status === 'online';
  const levelKey = (user.membershipLevel || user.level || 'bronze').toLowerCase();
  const levelColor = isAdmin ? ADMIN_BLUE : (LEVEL_COLORS[levelKey] || colors.border);
  const levelLabel = isAdmin ? 'Admin' : (LEVEL_LABELS[levelKey] || 'Bronze');

  const initials = String(user.name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBg,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: levelColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
          {isOnline && (
            <View style={[styles.onlineDot, { borderColor: theme.colors.cardBg }]} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            <View style={[
              styles.levelChip,
              { backgroundColor: `${levelColor}1A`, borderColor: `${levelColor}55` },
            ]}>
              {isAdmin && (
                <MaterialIcons name="shield" size={10} color={levelColor} style={{ marginRight: 3 }} />
              )}
              <Text style={[styles.levelChipText, { color: levelColor }]} numberOfLines={1}>
                {levelLabel}
              </Text>
            </View>
          </View>

          <Text
            style={[styles.email, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {user.email}
          </Text>

          <View style={styles.metaRow}>
            {isOnline && (
              <View style={styles.metaItem}>
                <View style={styles.metaDot} />
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  online
                </Text>
              </View>
            )}
            {user.balance != null && (
              <View style={styles.metaItem}>
                <MaterialIcons name="account-balance-wallet" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.metaText, { color: theme.colors.text, fontWeight: '700' }]}>
                  {Number(user.balance).toFixed(0)} <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>PRB</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionsCol}>
          {onQuickBalance && (
            <Pressable
              onPress={onQuickBalance}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? `${levelColor}26` : `${levelColor}14` },
              ]}
            >
              <MaterialIcons name="add" size={18} color={levelColor} />
            </Pressable>
          )}
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? `${ICON_MUTED}26` : 'transparent' },
            ]}
          >
            <MaterialIcons name="edit" size={18} color={ICON_MUTED} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: pressed ? `${DELETE_RED}22` : 'transparent' },
            ]}
          >
            <MaterialIcons name="delete-outline" size={18} color={DELETE_RED} />
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ONLINE_GREEN,
    bottom: -1,
    right: -1,
    borderWidth: 2,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  email: {
    fontSize: 12,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ONLINE_GREEN,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminUserListCard;
