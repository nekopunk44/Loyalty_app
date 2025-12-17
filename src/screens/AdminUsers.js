import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { FadeInCard, ScaleInCard } from '../components/AnimatedCard';
import UserManagementModal from '../components/UserManagementModal';
import UserEditModal from '../components/UserEditModal';
import UserDeleteConfirmModal from '../components/UserDeleteConfirmModal';
import { useTheme } from '../context/ThemeContext';

const mockUsers = [
  {
    id: '1',
    name: 'Иван Петров',
    email: 'ivan@example.com',
    status: 'online',
    rating: 4.8,
    level: 'platinum',
    joinDate: '15.01.2024',
    purchases: 45,
    cashback: 2340,
  },
  {
    id: '2',
    name: 'Мария Сидорова',
    email: 'maria@example.com',
    status: 'online',
    rating: 4.5,
    level: 'gold',
    joinDate: '22.03.2024',
    purchases: 32,
    cashback: 1680,
  },
  {
    id: '3',
    name: 'Сергей Иванов',
    email: 'sergey@example.com',
    status: 'offline',
    rating: 4.2,
    level: 'silver',
    joinDate: '10.05.2024',
    purchases: 18,
    cashback: 890,
  },
  {
    id: '4',
    name: 'Анна Смирнова',
    email: 'anna@example.com',
    status: 'online',
    rating: 4.9,
    level: 'platinum',
    joinDate: '05.02.2024',
    purchases: 68,
    cashback: 3520,
  },
  {
    id: '5',
    name: 'Дмитрий Козлов',
    email: 'dmitry@example.com',
    status: 'offline',
    rating: 3.8,
    level: 'bronze',
    joinDate: '28.06.2024',
    purchases: 7,
    cashback: 340,
  },
];

export default function AdminUsers({ navigation }) {
  const { theme } = useTheme();
  const [users, setUsers] = useState(mockUsers);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [userManagementVisible, setUserManagementVisible] = useState(false);
  const [userEditVisible, setUserEditVisible] = useState(false);
  const [userDeleteVisible, setUserDeleteVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const getLevelColor = (level) => {
    switch (level) {
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

  const getLevelLabel = (level) => {
    const labels = {
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      bronze: 'Bronze',
    };
    return labels[level] || level;
  };

  const openProfile = (user) => {
    setSelectedUser(user);
    setProfileVisible(true);
  };

  const onlineCount = users.filter((u) => u.status === 'online').length;
  const totalRating = (users.reduce((sum, u) => sum + u.rating, 0) / users.length).toFixed(1);

  const renderUserCard = ({ item, index }) => (
    <FadeInCard delay={150 + index * 30}>
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => openProfile(item)}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {item.name.split(' ').map(w => w[0]).join('')}
              </Text>
              {item.status === 'online' && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.levelBadge,
              { backgroundColor: getLevelColor(item.level) },
            ]}
          >
            <Text style={styles.levelText}>{getLevelLabel(item.level)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <MaterialIcons name="star" size={16} color={colors.accent} />
            <Text style={styles.statValue}>{item.rating}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="shopping-bag" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{item.purchases}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={16} color={colors.success} />
            <Text style={styles.statValue}>₽{item.cashback}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </FadeInCard>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <ScaleInCard delay={100}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Управление пользователями</Text>
              <Text style={styles.subtitle}>
                Онлайн: {onlineCount} | Рейтинг: {totalRating}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setUserManagementVisible(true)}
            >
              <MaterialIcons name="person-add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScaleInCard>

        {/* Search */}
        <FadeInCard delay={150} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Поиск по имени или email..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </FadeInCard>

        {/* Users List */}
        <View style={styles.listContainer}>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserCard}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </ScrollView>

      {/* User Management Modal */}
      <UserManagementModal
        visible={userManagementVisible}
        onClose={() => setUserManagementVisible(false)}
        theme={theme}
        onUserCreated={(newUser) => {
          // Можно добавить нового пользователя в список, если нужно
          console.log('✅ Новый пользователь создан:', newUser);
        }}
      />

      {/* User Edit Modal */}
      {selectedUser && (
        <UserEditModal
          visible={userEditVisible}
          onClose={() => setUserEditVisible(false)}
          user={selectedUser}
          theme={theme}
          onUserUpdated={(updatedUser) => {
            setSelectedUser(updatedUser);
            const updatedUsers = users.map(u => u.id === updatedUser.id ? {...u, ...updatedUser} : u);
            setUsers(updatedUsers);
          }}
        />
      )}

      {/* User Delete Confirm Modal */}
      {selectedUser && (
        <UserDeleteConfirmModal
          visible={userDeleteVisible}
          onClose={() => setUserDeleteVisible(false)}
          user={selectedUser}
          theme={theme}
          onUserDeleted={(deletedUserId) => {
            setUsers(users.filter(u => u.id !== deletedUserId));
            setProfileVisible(false);
            setUserDeleteVisible(false);
          }}
        />
      )}

      {/* User Profile Modal */}
      <Modal visible={profileVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Профиль пользователя</Text>
              <TouchableOpacity onPress={() => setProfileVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  {/* Profile Card */}
                  <View style={styles.profileCard}>
                    <View style={[styles.largeAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.largeAvatarText}>
                        {selectedUser.name.split(' ').map(w => w[0]).join('')}
                      </Text>
                    </View>
                    <Text style={styles.profileName}>{selectedUser.name}</Text>
                    <Text style={styles.profileEmail}>{selectedUser.email}</Text>
                    
                    <View style={styles.statusBadges}>
                      <View style={[styles.badge, { backgroundColor: selectedUser.status === 'online' ? colors.success : colors.textSecondary }]}>
                        <MaterialIcons 
                          name={selectedUser.status === 'online' ? 'check-circle' : 'radio-button-off'} 
                          size={14} 
                          color="#fff" 
                        />
                        <Text style={styles.badgeText}>
                          {selectedUser.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                        </Text>
                      </View>
                      <View style={[
                        styles.badge, 
                        { backgroundColor: getLevelColor(selectedUser.level) }
                      ]}>
                        <MaterialIcons name="star" size={14} color="#fff" />
                        <Text style={styles.badgeText}>{getLevelLabel(selectedUser.level)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Статистика</Text>
                    
                    <View style={styles.statRow}>
                      <View style={styles.statRowLabel}>
                        <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
                        <Text style={styles.statRowTitle}>Дата присоединения</Text>
                      </View>
                      <Text style={styles.statRowValue}>{selectedUser.joinDate}</Text>
                    </View>

                    <View style={styles.statRow}>
                      <View style={styles.statRowLabel}>
                        <MaterialIcons name="shopping-bag" size={18} color={colors.accent} />
                        <Text style={styles.statRowTitle}>Покупки</Text>
                      </View>
                      <Text style={styles.statRowValue}>{selectedUser.purchases}</Text>
                    </View>

                    <View style={styles.statRow}>
                      <View style={styles.statRowLabel}>
                        <MaterialIcons name="trending-up" size={18} color={colors.success} />
                        <Text style={styles.statRowTitle}>Накопленный кешбек</Text>
                      </View>
                      <Text style={styles.statRowValue}>₽{selectedUser.cashback}</Text>
                    </View>

                    <View style={styles.statRow}>
                      <View style={styles.statRowLabel}>
                        <MaterialIcons name="star" size={18} color={colors.secondary} />
                        <Text style={styles.statRowTitle}>Рейтинг</Text>
                      </View>
                      <Text style={styles.statRowValue}>{selectedUser.rating}⭐</Text>
                    </View>
                  </View>

                  {/* Personal Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Личная информация</Text>
                    
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{selectedUser.email}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>ID пользователя</Text>
                      <Text style={styles.infoValue}>{selectedUser.id}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Статус</Text>
                      <Text style={[styles.infoValue, { color: selectedUser.status === 'online' ? colors.success : colors.textSecondary }]}>
                        {selectedUser.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsSection}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setUserEditVisible(true);
                      }}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Редактировать</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        setUserDeleteVisible(true);
                      }}
                    >
                      <MaterialIcons name="delete" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Удалить</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingVertical: spacing.md,
  },
  header: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  userCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarText: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.cardBg,
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: spacing.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsSection: {
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statRowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  infoSection: {
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
  },
  infoRow: {
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  actionsSection: {
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
