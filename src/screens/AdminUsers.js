import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { lightTheme, darkTheme } from '../context/ThemeContext';
import { FadeInCard, ScaleInCard } from '../components/AnimatedCard';
import { AdminUserListCard } from '../components/AdminUserListCard';
import { UserLevelCard } from '../components/UserLevelCard';
import UserManagementModal from '../components/UserManagementModal';
import UserEditModal from '../components/UserEditModal';
import UserDeleteConfirmModal from '../components/UserDeleteConfirmModal';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiUrl();

const mockUsers = [];

export default function AdminUsers({ navigation }) {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { notifyUserAdded, notifyUserDeleted, notifyUserUpdated } = useNotification();
  const [users, setUsers] = useState(mockUsers);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [userManagementVisible, setUserManagementVisible] = useState(false);
  const [userEditVisible, setUserEditVisible] = useState(false);
  const [userDeleteVisible, setUserDeleteVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    role: 'all', // all, admin, user
    membership: 'all', // all, platinum, gold, silver, bronze
    status: 'all', // all, online, offline
  });
  const [openDropdown, setOpenDropdown] = useState(null); // 'role', 'membership', 'status' или null
  
  // Состояние для уведомления
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success'); // 'success', 'error'
  const notificationSlideAnim = useState(new Animated.Value(-60))[0];
  const notificationOpacityAnim = useState(new Animated.Value(1))[0];

  // Анимация цветов при смене темы
  const [bgColorAnim] = useState(new Animated.Value(0));
  const [cardColorAnim] = useState(new Animated.Value(0));

  // Загружаем пользователей с сервера
  useEffect(() => {
    loadUsers();

    // Обновляем статусы в фоне каждые 3 секунды (без видимого мерцания)
    const refreshInterval = setInterval(updateUserStatuses, 3000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // Инициализируем анимацию цветов при смене темы
  useEffect(() => {
    // Плавная анимация цветов при смене темы
    Animated.parallel([
      Animated.timing(bgColorAnim, {
        toValue: theme.isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(cardColorAnim, {
        toValue: theme.isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  }, [theme.isDark]);

  // Обновляем данные selectedUser пока модалка открыта
  useEffect(() => {
    if (!profileVisible || !selectedUser?.id) {
      return;
    }

    // Загружаем данные сразу при открытии
    loadUserDetails(selectedUser.id);

    // Затем обновляем каждые 2 секунды, пока модалка открыта
    const profileRefreshInterval = setInterval(() => {
      loadUserDetails(selectedUser.id);
    }, 2000);

    return () => {
      clearInterval(profileRefreshInterval);
    };
  }, [profileVisible, selectedUser?.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log(`📡 Запрос к: ${API_BASE_URL}/users`);
      const response = await fetch(`${API_BASE_URL}/users`);
      console.log(`📊 Статус ответа: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      console.log('📦 Ответ сервера:', data);
      
      if (!response.ok) {
        console.warn('⚠️ Ошибка HTTP:', response.status, data);
        setUsers(mockUsers);
        setLoading(false);
        return;
      }
      
      if (data.success && data.users) {
        setUsers(data.users);
        console.log('✅ Загружено пользователей:', data.users.length);
      } else {
        console.warn('⚠️ Ошибка загрузки пользователей:', data.error || 'Неизвестная ошибка');
        setUsers(mockUsers);
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке пользователей:', error);
      console.error('❌ Stack:', error.stack);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  // Фоновое обновление статусов пользователей (без видимого мерцания)
  const updateUserStatuses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      
      if (data.success && data.users) {
        // Обновляем только статусы, чтобы не было мерцания
        setUsers(prevUsers => {
          return prevUsers.map(prevUser => {
            const updatedUser = data.users.find(u => u.id === prevUser.id);
            if (updatedUser && updatedUser.status !== prevUser.status) {
              return { ...prevUser, status: updatedUser.status };
            }
            return prevUser;
          });
        });
      }
    } catch (error) {
      console.warn('⚠️ Ошибка при обновлении статусов:', error);
    }
  };

  const filteredUsers = users.filter((user) => {
    // Фильтр по поисковой строке
    const matchSearch =
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());

    // Фильтр по роли
    let matchRole = true;
    if (activeFilters.role === 'admin') {
      matchRole = user.role === 'admin';
    } else if (activeFilters.role === 'user') {
      matchRole = user.role !== 'admin';
    }

    // Фильтр по уровню членства
    let matchMembership = true;
    if (activeFilters.membership !== 'all') {
      const userLevel = (user.membershipLevel || user.level || 'bronze').toLowerCase();
      matchMembership = userLevel === activeFilters.membership.toLowerCase();
    }

    // Фильтр по статусу
    let matchStatus = true;
    if (activeFilters.status === 'online') {
      matchStatus = user.status === 'online';
    } else if (activeFilters.status === 'offline') {
      matchStatus = user.status === 'offline';
    }

    return matchSearch && matchRole && matchMembership && matchStatus;
  });

  const getLevelColor = (level, role) => {
    // Если администратор, показываем синий цвет
    if (role === 'admin') {
      return '#007AFF';
    }
    
    switch (level?.toLowerCase()) {
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
    // Если администратор, показываем роль
    if (role === 'admin') {
      return 'Администратор';
    }
    
    const labels = {
      platinum: 'Platinum',
      gold: 'Gold',
      silver: 'Silver',
      bronze: 'Bronze',
    };
    return labels[level?.toLowerCase()] || (level || 'Bronze');
  };

  const openProfile = (user) => {
    setSelectedUser(user);
    setProfileVisible(true);
    // Загружаем полные данные пользователя с сервера
    loadUserDetails(user.id);
  };

  const loadUserDetails = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        // Обновляем selectedUser с полными данными
        setSelectedUser(prevUser => ({
          ...prevUser,
          ...data.user,
          // Сохраняем поля, которые могут быть на фронте
          balance: data.user.balance || data.user.walletBalance || 0,
          totalBookings: data.user.totalBookings || 0,
          cashback: data.user.cashback || data.user.loyaltyPoints || 0,
          joinDate: data.user.joinDate || prevUser.joinDate || 'сегодня',
        }));
      }
    } catch (error) {
      console.warn('⚠️ Ошибка при загрузке деталей пользователя:', error);
    }
  };

  // Функция для показа уведомления
  const showNotification = (message, type = 'success', duration = 3000) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setNotificationVisible(true);
    notificationOpacityAnim.setValue(0);
    notificationSlideAnim.setValue(-60);
    
    // Плавное выдвижение и растворение уведомления
    Animated.parallel([
      Animated.timing(notificationSlideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(notificationOpacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Автоматическое скрытие через заданное время
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(notificationSlideAnim, {
          toValue: -60,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(notificationOpacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setNotificationVisible(false);
      });
    }, duration);
  };

  const onlineCount = users.filter((u) => u.status === 'online').length;
  const totalRating = (users.reduce((sum, u) => sum + u.rating, 0) / users.length).toFixed(1);

  // Рендер для администратора - список с подробной информацией
  const renderAdminUserCard = ({ item, index }) => (
    <FadeInCard delay={150 + index * 30}>
      <AdminUserListCard
        user={item}
        theme={theme}
        onPress={() => openProfile(item)}
        onEdit={() => {
          setSelectedUser(item);
          setUserEditVisible(true);
        }}
        onDelete={() => {
          setSelectedUser(item);
          setUserDeleteVisible(true);
        }}
      />
    </FadeInCard>
  );

  // Рендер для обычного пользователя - красивые карточки
  const renderUserCardBeautiful = ({ item, index }) => (
    <FadeInCard delay={150 + index * 30}>
      <UserLevelCard
        user={item}
        onPress={() => openProfile(item)}
        onEdit={() => {
          setSelectedUser(item);
          setUserEditVisible(true);
        }}
        onDelete={() => {
          setSelectedUser(item);
          setUserDeleteVisible(true);
        }}
      />
    </FadeInCard>
  );

  // Выбираем функцию рендера на основе роли текущего пользователя
  const renderUserCard = currentUser?.role === 'admin' ? renderAdminUserCard : renderUserCardBeautiful;

  return (
    <View style={styles.container}>
      {/* Модальное окно уведомления */}
      {notificationVisible && (
        <Animated.View 
          style={[
            styles.notificationContainer,
            { 
              opacity: notificationOpacityAnim,
              transform: [{ translateY: notificationSlideAnim }],
              backgroundColor: notificationType === 'error' ? '#FF6B6B' : '#51CF66'
            }
          ]}
        >
          <MaterialIcons 
            name={notificationType === 'error' ? 'error-outline' : 'check-circle'}
            size={20} 
            color="#fff" 
            style={{ marginRight: 10 }}
          />
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      <Animated.ScrollView 
        contentContainerStyle={[
          styles.content,
          {
            backgroundColor: theme.colors.background,
          }
        ]}
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Header */}
        <ScaleInCard delay={100}>
          <View 
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.background,
              }
            ]}
          >
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Управление пользователями</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
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

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>Загрузка пользователей...</Text>
          </View>
        )}

        {/* Search */}
        {!loading && (
          <FadeInCard delay={150} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.cardBg }]}>
              <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.cardBg }]}
                placeholder="Поиск по имени или email..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </FadeInCard>
        )}

        {/* Filters */}
        {!loading && (
          <FadeInCard delay={200} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg, zIndex: 100, overflow: 'visible' }}>
            <View 
              style={[
                styles.compactFiltersContainer, 
                { 
                  overflow: 'visible',
                  backgroundColor: theme.colors.background,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: 12,
                }
              ]}
            >
              {/* Role Filter Dropdown */}
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'role' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    openDropdown === 'role' && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
                >
                  <MaterialIcons name="person" size={16} color={theme.colors.primary} />
                  <Text style={[styles.compactFilterButtonText, { color: theme.colors.text }]} numberOfLines={1}>
                    {activeFilters.role === 'all'
                      ? 'Роль'
                      : activeFilters.role === 'admin'
                      ? 'Админ'
                      : 'Пользователи'}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'role' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                {openDropdown === 'role' && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.cardBg }]}>
                    {[
                      { label: 'Все', value: 'all' },
                      { label: 'Админ', value: 'admin' },
                      { label: 'Пользователи', value: 'user' },
                    ].map((filter) => (
                      <TouchableOpacity
                        key={filter.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setActiveFilters({ ...activeFilters, role: filter.value });
                          setOpenDropdown(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: theme.colors.text },
                            activeFilters.role === filter.value && {
                              fontWeight: '700',
                              color: theme.colors.primary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {filter.label}
                        </Text>
                        {activeFilters.role === filter.value && (
                          <MaterialIcons name="check" size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Membership Filter Dropdown */}
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'membership' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    openDropdown === 'membership' && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'membership' ? null : 'membership')}
                >
                  <MaterialIcons name="star" size={16} color={theme.colors.primary} />
                  <Text style={[styles.compactFilterButtonText, { color: theme.colors.text }]}>
                    {activeFilters.membership === 'all'
                      ? 'Статус'
                      : activeFilters.membership.charAt(0).toUpperCase() +
                        activeFilters.membership.slice(1)}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'membership' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                {openDropdown === 'membership' && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.cardBg }]}>
                    {[
                      { label: 'Все', value: 'all' },
                      { label: 'Platinum', value: 'platinum' },
                      { label: 'Gold', value: 'gold' },
                      { label: 'Silver', value: 'silver' },
                      { label: 'Bronze', value: 'bronze' },
                    ].map((filter) => (
                      <TouchableOpacity
                        key={filter.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setActiveFilters({ ...activeFilters, membership: filter.value });
                          setOpenDropdown(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: theme.colors.text },
                            activeFilters.membership === filter.value && {
                              fontWeight: '700',
                              color: theme.colors.primary,
                            },
                          ]}
                        >
                          {filter.label}
                        </Text>
                        {activeFilters.membership === filter.value && (
                          <MaterialIcons name="check" size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Status Filter Dropdown */}
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'status' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    openDropdown === 'status' && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                >
                  <MaterialIcons name="signal-cellular-alt" size={16} color={theme.colors.primary} />
                  <Text style={[styles.compactFilterButtonText, { color: theme.colors.text }]}>
                    {activeFilters.status === 'all'
                      ? 'Наличие'
                      : activeFilters.status === 'online'
                      ? 'Онлайн'
                      : 'Офлайн'}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'status' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                {openDropdown === 'status' && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.cardBg }]}>
                    {[
                      { label: 'Все', value: 'all' },
                      { label: 'Онлайн', value: 'online' },
                      { label: 'Офлайн', value: 'offline' },
                    ].map((filter) => (
                      <TouchableOpacity
                        key={filter.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setActiveFilters({ ...activeFilters, status: filter.value });
                          setOpenDropdown(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: theme.colors.text },
                            activeFilters.status === filter.value && {
                              fontWeight: '700',
                              color: theme.colors.primary,
                            },
                          ]}
                        >
                          {filter.label}
                        </Text>
                        {activeFilters.status === filter.value && (
                          <MaterialIcons name="check" size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </FadeInCard>
        )}

        {/* Users List */}
        {!loading && (
          <View 
            style={[
              styles.listContainer,
              {
                backgroundColor: theme.colors.background,
              }
            ]}
          >
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserCard}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* User Management Modal */}
      <UserManagementModal
        visible={userManagementVisible}
        onClose={() => setUserManagementVisible(false)}
        theme={theme}
        onUserCreated={(newUser) => {
          console.log('✅ Новый пользователь создан:', newUser);
          // Добавляем нового пользователя в начало списка
          if (newUser) {
            setUsers([newUser, ...users]);
            // Показываем плавное уведомление
            showNotification(`Пользователь ${newUser.displayName || newUser.name} добавлен`, 'success');
          }
        }}
        onNotify={async (userName, userEmail) => {
          await notifyUserAdded(userName, userEmail);
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
            // Закрываем модальное окно редактирования
            setUserEditVisible(false);
            // Показываем плавное уведомление
            showNotification(`Профиль пользователя ${updatedUser.displayName || updatedUser.name} обновлен`, 'success');
            // Отправляем уведомление об обновлении
            notifyUserUpdated(updatedUser.displayName || updatedUser.name, {
              role: updatedUser.role,
              membershipLevel: updatedUser.membershipLevel,
            });
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
            const deletedUser = users.find(u => u.id === deletedUserId);
            setUsers(users.filter(u => u.id !== deletedUserId));
            setProfileVisible(false);
            setUserDeleteVisible(false);
            // Показываем плавное уведомление
            if (deletedUser) {
              showNotification(`Пользователь ${deletedUser.displayName || deletedUser.name} удален`, 'success');
            }
          }}
          onNotify={async (userName, userEmail) => {
            await notifyUserDeleted(userName, userEmail);
          }}
        />
      )}

      {/* User Profile Modal */}
      <Modal visible={profileVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBg }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Профиль пользователя</Text>
              <TouchableOpacity onPress={() => setProfileVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  {/* Profile Card */}
                  <View style={[styles.profileCard, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.largeAvatar, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.largeAvatarText}>
                        {selectedUser.name.split(' ').map(w => w[0]).join('')}
                      </Text>
                    </View>
                    <Text style={[styles.profileName, { color: theme.colors.text }]}>{selectedUser.name}</Text>
                    <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{selectedUser.email}</Text>
                    
                    <View style={styles.statusBadges}>
                      <View style={[styles.badge, { backgroundColor: selectedUser.status === 'online' ? theme.colors.success : theme.colors.textSecondary }]}>
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
                        { backgroundColor: getLevelColor(selectedUser.membershipLevel || selectedUser.level, selectedUser.role) }
                      ]}>
                        <MaterialIcons name={selectedUser.role === 'admin' ? 'security' : 'star'} size={14} color="#fff" />
                        <Text style={styles.badgeText}>{getLevelLabel(selectedUser.membershipLevel || selectedUser.level, selectedUser.role)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={[styles.statsSection, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Статистика</Text>
                    
                    <View style={styles.statRow}>
                      <View style={styles.statRowLabel}>
                        <MaterialIcons name="calendar-today" size={18} color={theme.colors.primary} />
                        <Text style={[styles.statRowTitle, { color: theme.colors.text }]}>
                          {selectedUser.role === 'admin' ? 'Дата регистрации' : 'Дата присоединения'}
                        </Text>
                      </View>
                      <Text style={[styles.statRowValue, { color: theme.colors.text }]}>{selectedUser.joinDate}</Text>
                    </View>

                    {selectedUser.role !== 'admin' && (
                      <>
                        <View style={styles.statRow}>
                          <View style={styles.statRowLabel}>
                            <MaterialIcons name="account-balance-wallet" size={18} color={theme.colors.accent} />
                            <Text style={[styles.statRowTitle, { color: theme.colors.text }]}>Баланс карты</Text>
                          </View>
                          <Text style={[styles.statRowValue, { color: theme.colors.text }]}>{selectedUser.balance || 0} PRB</Text>
                        </View>

                        <View style={styles.statRow}>
                          <View style={styles.statRowLabel}>
                            <MaterialIcons name="book" size={18} color={theme.colors.secondary} />
                            <Text style={[styles.statRowTitle, { color: theme.colors.text }]}>Количество бронирований</Text>
                          </View>
                          <Text style={[styles.statRowValue, { color: theme.colors.text }]}>{selectedUser.totalBookings || 0}</Text>
                        </View>

                        <View style={styles.statRow}>
                          <View style={styles.statRowLabel}>
                            <MaterialIcons name="trending-up" size={18} color={theme.colors.success} />
                            <Text style={[styles.statRowTitle, { color: theme.colors.text }]}>Накопленный кешбек</Text>
                          </View>
                          <Text style={[styles.statRowValue, { color: theme.colors.text }]}>{selectedUser.cashback || 0} PRB</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Personal Info */}
                  <View style={[styles.infoSection, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Личная информация</Text>
                    
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{selectedUser.email}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>ID пользователя</Text>
                      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{selectedUser.id}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Статус</Text>
                      <Text style={[styles.infoValue, { color: selectedUser.status === 'online' ? theme.colors.success : theme.colors.textSecondary }]}>
                        {selectedUser.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsSection}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        setUserEditVisible(true);
                      }}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Редактировать</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
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
  filtersContainer: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterGroup: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactFiltersContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  compactFilterButtonText: {
    flex: 1,
    marginHorizontal: 4,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenuModal: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    maxWidth: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '500',
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
  // Стили для уведомления
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  notificationText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
