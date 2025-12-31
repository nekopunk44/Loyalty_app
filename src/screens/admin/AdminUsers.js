import React, { useState, useEffect, useRef } from 'react';
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
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../../constants/theme';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;
import { FadeInCard, ScaleInCard } from '../../components/ui/AnimatedCard';
import { AdminUserListCard } from '../../components/admin/AdminUserListCard';
import { UserLevelCard } from '../../components/admin/UserLevelCard';
import UserManagementModal from '../../components/admin/UserManagementModal';
import UserEditModal from '../../components/admin/UserEditModal';
import UserDeleteConfirmModal from '../../components/admin/UserDeleteConfirmModal';
import BalanceAdjustModal from '../../components/admin/BalanceAdjustModal';
import UserTransactionsModal from '../../components/admin/UserTransactionsModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const API_BASE_URL = getApiUrl();

export default function AdminUsers({ navigation: _navigation }) {
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuth();
  const { notifyUserAdded, notifyUserDeleted, notifyUserUpdated } = useNotification();
  const [users, setUsers] = useState([]);
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
  const [openDropdown, setOpenDropdown] = useState(null);
  const [balanceAdjustVisible, setBalanceAdjustVisible] = useState(false);
  const [balanceAdjustUser, setBalanceAdjustUser]       = useState(null);
  const [txHistoryVisible, setTxHistoryVisible]         = useState(false);
  const [txHistoryUser, setTxHistoryUser]               = useState(null);
  
  // Состояние для уведомления
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success'); // 'success', 'error'
  const notificationSlideAnim = useRef(new Animated.Value(-60)).current;
  const notificationOpacityAnim = useRef(new Animated.Value(1)).current;

  // Анимация цветов при смене темы
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const cardColorAnim = useRef(new Animated.Value(0)).current;

  // Bottom-sheet анимация профиля пользователя в стиле NotificationBell.
  // profileVisible держит Modal в дереве, profileTranslateY двигает контент.
  const profileTranslateY = useRef(new Animated.Value(SHEET_H)).current;

  const openProfileSheet = () => {
    profileTranslateY.setValue(SHEET_H);
    setProfileVisible(true);
    Animated.timing(profileTranslateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeProfileSheet = () => {
    Animated.timing(profileTranslateY, {
      toValue: SHEET_H,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setProfileVisible(false);
    });
  };

  // Свайп-вниз по drag-handle закрывает sheet — как в NotificationBell.
  const profilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) profileTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          closeProfileSheet();
        } else {
          Animated.spring(profileTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  // Загружаем пользователей с сервера
  useEffect(() => {
    loadUsers();

    // Обновляем статусы в фоне каждые 30 секунд
    const refreshInterval = setInterval(updateUserStatuses, 30000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // Инициализируем анимацию цветов при смене темы
  useEffect(() => {
    // Плавная анимация цветов при смене темы
    Animated.parallel([
      Animated.timing(bgColorAnim, {
        toValue: isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(cardColorAnim, {
        toValue: isDark ? 1 : 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isDark]);

  // Обновляем данные selectedUser пока модалка открыта
  useEffect(() => {
    if (!profileVisible || !selectedUser?.id) {
      return;
    }

    // Загружаем данные сразу при открытии
    loadUserDetails(selectedUser.id);

    // Затем обновляем каждые 15 секунд, пока модалка открыта
    const profileRefreshInterval = setInterval(() => {
      loadUserDetails(selectedUser.id);
    }, 15000);

    return () => {
      clearInterval(profileRefreshInterval);
    };
  }, [profileVisible, selectedUser?.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiCall(`${API_BASE_URL}/users`);
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Фоновое обновление статусов пользователей (без видимого мерцания)
  const updateUserStatuses = async () => {
    try {
      const data = await apiCall(`${API_BASE_URL}/users`);
      
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
    openProfileSheet();
    // Загружаем полные данные пользователя с сервера
    loadUserDetails(user.id);
  };

  const loadUserDetails = async (userId) => {
    try {
      const data = await apiCall(`${API_BASE_URL}/users/${userId}`);
      
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
  const totalUsers = users.length;

  // Распределение по уровням — для hero-полоски статистики над списком.
  // Порядок сегментов фиксирован: admin → platinum → gold → silver → bronze.
  // Считаем admin отдельно от уровня, остальные нормализуем к lowercase.
  const levelStats = (() => {
    const stats = { admin: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 };
    users.forEach((u) => {
      if (u.role === 'admin') { stats.admin += 1; return; }
      const k = (u.membershipLevel || u.level || 'bronze').toLowerCase();
      if (k in stats) stats[k] += 1; else stats.bronze += 1;
    });
    return stats;
  })();
  const LEVEL_PALETTE = {
    admin:    '#3B82F6',
    platinum: '#A78BFA',
    gold:     '#F5B301',
    silver:   '#9CA3AF',
    bronze:   '#B97A45',
  };
  const LEVEL_LABEL = {
    admin: 'Admin', platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze',
  };
  const levelOrder = ['admin', 'platinum', 'gold', 'silver', 'bronze'];
  const totalForBar = levelOrder.reduce((s, k) => s + levelStats[k], 0) || 1;

  const handleOpenBalanceAdjust = (user) => {
    setBalanceAdjustUser(user);
    setBalanceAdjustVisible(true);
  };

  const handleBalanceAdjusted = ({ userId, newBalance }) => {
    setUsers(prev => prev.map(u => (u.userId === userId ? { ...u, balance: newBalance } : u)));
  };

  const handleShowTransactions = (user) => {
    setTxHistoryUser(user);
    setTxHistoryVisible(true);
  };

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
        onQuickBalance={() => handleOpenBalanceAdjust(item)}
        onShowTransactions={() => handleShowTransactions(item)}
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
            <View style={styles.headerSpacer} />
            <View style={styles.headerTextWrap}>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Управление пользователями
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Онлайн: {onlineCount} из {totalUsers}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setUserManagementVisible(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="person-add" size={22} color="#fff" />
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

        {/* Hero stats: KPI + распределение по уровням */}
        {!loading && totalUsers > 0 && (
          <FadeInCard delay={120} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.lg }}>
            <View style={[styles.heroCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
              {/* KPI-строка: всего + онлайн + админов */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiItem}>
                  <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{totalUsers}</Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Всего</Text>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.kpiItem}>
                  <View style={styles.kpiValueRow}>
                    <View style={[styles.kpiDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{onlineCount}</Text>
                  </View>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Онлайн</Text>
                </View>
                <View style={[styles.kpiDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.kpiItem}>
                  <View style={styles.kpiValueRow}>
                    <MaterialIcons name="shield" size={14} color={LEVEL_PALETTE.admin} />
                    <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{levelStats.admin}</Text>
                  </View>
                  <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>Админов</Text>
                </View>
              </View>

              {/* Сегментированный бар распределения по уровням */}
              <View style={[styles.segBarTrack, { backgroundColor: theme.colors.background }]}>
                {levelOrder.map((k) => {
                  const w = (levelStats[k] / totalForBar) * 100;
                  if (w <= 0) return null;
                  return (
                    <View
                      key={k}
                      style={{
                        width: `${w}%`,
                        backgroundColor: LEVEL_PALETTE[k],
                        height: '100%',
                      }}
                    />
                  );
                })}
              </View>

              {/* Легенда — компактные чипы с количеством */}
              <View style={styles.legendRow}>
                {levelOrder.map((k) => (
                  <View key={k} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: LEVEL_PALETTE[k] }]} />
                    <Text style={[styles.legendLabel, { color: theme.colors.textSecondary }]}>
                      {LEVEL_LABEL[k]}
                    </Text>
                    <Text style={[styles.legendValue, { color: theme.colors.text }]}>
                      {levelStats[k]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeInCard>
        )}

        {/* Search */}
        {!loading && (
          <FadeInCard delay={150} style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.cardBg,
                  borderColor: searchText ? `${theme.colors.primary}55` : theme.colors.border,
                },
              ]}
            >
              <View style={[styles.searchIconWrap, { backgroundColor: `${theme.colors.primary}14` }]}>
                <MaterialIcons name="search" size={18} color={theme.colors.primary} />
              </View>
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Поиск по имени или email"
                placeholderTextColor={theme.colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  hitSlop={8}
                  style={[styles.searchClearBtn, { backgroundColor: theme.colors.background }]}
                >
                  <MaterialIcons name="close" size={14} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
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
              {(() => {
                const active = activeFilters.role !== 'all';
                const fg = active ? '#fff' : theme.colors.primary;
                return (
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'role' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.cardBg,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                    openDropdown === 'role' && !active && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="person" size={15} color={fg} />
                  <Text
                    style={[
                      styles.compactFilterButtonText,
                      { color: active ? '#fff' : theme.colors.text, fontWeight: active ? '800' : '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {activeFilters.role === 'all'
                      ? 'Роль'
                      : activeFilters.role === 'admin'
                      ? 'Админ'
                      : 'Юзеры'}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'role' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={fg}
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
              );})()}

              {/* Membership Filter Dropdown */}
              {(() => {
                const active = activeFilters.membership !== 'all';
                const fg = active ? '#fff' : theme.colors.primary;
                return (
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'membership' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.cardBg,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                    openDropdown === 'membership' && !active && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'membership' ? null : 'membership')}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="star" size={15} color={fg} />
                  <Text
                    style={[
                      styles.compactFilterButtonText,
                      { color: active ? '#fff' : theme.colors.text, fontWeight: active ? '800' : '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {activeFilters.membership === 'all'
                      ? 'Уровень'
                      : activeFilters.membership.charAt(0).toUpperCase() +
                        activeFilters.membership.slice(1)}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'membership' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={fg}
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
              );})()}

              {/* Status Filter Dropdown */}
              {(() => {
                const active = activeFilters.status !== 'all';
                const fg = active ? '#fff' : theme.colors.primary;
                return (
              <View style={{ flex: 1, position: 'relative', zIndex: openDropdown === 'status' ? 1000 : 1 }}>
                <TouchableOpacity
                  style={[
                    styles.compactFilterButton,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.cardBg,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                    openDropdown === 'status' && !active && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="signal-cellular-alt" size={15} color={fg} />
                  <Text
                    style={[
                      styles.compactFilterButtonText,
                      { color: active ? '#fff' : theme.colors.text, fontWeight: active ? '800' : '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {activeFilters.status === 'all'
                      ? 'Статус'
                      : activeFilters.status === 'online'
                      ? 'Онлайн'
                      : 'Офлайн'}
                  </Text>
                  <MaterialIcons
                    name={openDropdown === 'status' ? 'expand-less' : 'expand-more'}
                    size={16}
                    color={fg}
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
              );})()}
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
            closeProfileSheet();
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

      {/* User Profile Modal — bottom-sheet в стиле NotificationBell */}
      <Modal
        visible={profileVisible}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closeProfileSheet}
      >
        <View style={styles.modalContainer}>
          {/* Tap по backdrop закрывает sheet */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeProfileSheet}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.cardBg,
                height: SHEET_H,
                transform: [{ translateY: profileTranslateY }],
              },
            ]}
          >
            {/* Drag handle — реагирует на свайп вниз */}
            <View style={styles.dragHandleWrap} {...profilePanResponder.panHandlers}>
              <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Заголовок по центру, close-кнопка справа, симметричный spacer слева */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderSpacer} />
              <View style={styles.modalHeaderCenter} pointerEvents="none">
                <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  Профиль пользователя
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {selectedUser?.role === 'admin' ? 'Карточка администратора' : 'Карточка клиента'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeProfileSheet}
                hitSlop={8}
                style={[styles.modalCloseBtn, { backgroundColor: theme.colors.background }]}
              >
                <MaterialIcons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
          </Animated.View>
        </View>
      </Modal>

      {/* Balance Adjust Modal (Sprint B) */}
      <BalanceAdjustModal
        visible={balanceAdjustVisible}
        onClose={() => setBalanceAdjustVisible(false)}
        theme={theme}
        user={balanceAdjustUser}
        onAdjusted={handleBalanceAdjusted}
        onNotify={showNotification}
      />

      {/* User Transactions History Modal (Sprint B) */}
      <UserTransactionsModal
        visible={txHistoryVisible}
        onClose={() => setTxHistoryVisible(false)}
        theme={theme}
        user={txHistoryUser}
      />
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
    paddingBottom: 130,
  },
  header: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kpiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiDivider: {
    width: 1,
    height: 28,
    opacity: 0.6,
  },
  segBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  searchClearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
    gap: 8,
  },
  compactFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 4,
  },
  compactFilterButtonText: {
    flex: 1,
    marginHorizontal: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
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
  // Modal styles — bottom-sheet в стиле NotificationBell
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 30, 0.46)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
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
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
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
  modalBody: {
    paddingTop: 0,
    paddingHorizontal: 0,
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
