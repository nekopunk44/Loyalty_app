import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import HorizontalScrollView from '../components/HorizontalScrollView';

export default function NotificationCenter() {
  const { notifications, markAsRead, deleteNotification, notificationsEnabled } = useNotification();
  const { isDark, theme } = useTheme();
  const [filterType, setFilterType] = useState('all');
  const colors = theme.colors;

  // Стили с доступом к переменным компонента
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    unreadCount: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    enabledBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.cardBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterScroll: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
      marginRight: spacing.sm,
      height: 36,
      minWidth: 100,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      height: 36,
    },
    filterButtonText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterButtonTextActive: {
      color: '#fff',
    },
    listContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xl,
    },
    notificationCard: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'flex-start',
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    notificationCardUnread: {
      borderLeftColor: colors.primary,
      backgroundColor: isDark ? colors.cardBg : '#f8f9fa',
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      flexShrink: 0,
    },
    contentContainer: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginLeft: spacing.sm,
    },
    message: {
      fontSize: 13,
      color: colors.text,
      marginBottom: spacing.xs,
      lineHeight: 18,
    },
    time: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    deleteButton: {
      padding: spacing.sm,
      marginLeft: spacing.sm,
      marginTop: -spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.lg,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });

  const notificationTypes = [
    { id: 'all', label: 'Все', icon: 'inbox' },
    { id: 'payment', label: 'Платежи', icon: 'payment' },
    { id: 'booking', label: 'Бронирование', icon: 'event' },
    { id: 'referral', label: 'Рефералы', icon: 'group' },
    { id: 'review', label: 'Отзывы', icon: 'star' },
  ];

  const filteredNotifications = filterType === 'all' 
    ? notifications 
    : notifications.filter(n => {
        if (filterType === 'payment') return n.type === 'paymentSuccess';
        if (filterType === 'booking') return n.type === 'newBooking';
        if (filterType === 'referral') return n.type === 'referralNotification';
        if (filterType === 'review') return n.type === 'reviewNotification';
        return true;
      });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'newBooking':
        return 'event-note';
      case 'paymentSuccess':
        return 'check-circle';
      case 'eventNotification':
        return 'notifications-active';
      case 'referralNotification':
        return 'people';
      case 'reviewNotification':
        return 'comment';
      case 'adminEvent':
        return 'admin-panel-settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'paymentSuccess':
        return colors.success;
      case 'newBooking':
        return colors.primary;
      case 'referralNotification':
        return colors.accent;
      case 'reviewNotification':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      case 'newBooking':
        return 'Новое бронирование';
      case 'paymentSuccess':
        return 'Платёж успешен';
      case 'eventNotification':
        return 'Событие';
      case 'referralNotification':
        return 'Бонус реферала';
      case 'reviewNotification':
        return 'Новый отзыв';
      case 'adminEvent':
        return 'Уведомление администратора';
      default:
        return 'Уведомление';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes}м назад`;
    if (hours < 24) return `${hours}ч назад`;
    if (days < 7) return `${days}д назад`;
    
    return date.toLocaleDateString('ru-RU');
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationCard,
        !item.read && styles.notificationCardUnread,
      ]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
        <MaterialIcons name={getNotificationIcon(item.type)} size={20} color="#fff" />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{getNotificationTitle(item.type)}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>

      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => deleteNotification(item.id)}
      >
        <MaterialIcons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const emptyState = (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyText}>Уведомлений нет</Text>
      <Text style={styles.emptySubtext}>Вы на связи с актуальной информацией</Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Уведомления</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} новых</Text>
          )}
        </View>
        <View style={styles.enabledBadge}>
          <MaterialIcons 
            name={notificationsEnabled ? 'notifications' : 'notifications-off'} 
            size={20} 
            color={notificationsEnabled ? colors.success : colors.textSecondary}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <HorizontalScrollView
        contentContainerStyle={styles.filterScroll}
        showNavButtons={true}
        navButtonColor={colors.primary}
      >
        {notificationTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.filterButton,
              filterType === type.id && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(type.id)}
          >
            <MaterialIcons 
              name={type.icon} 
              size={16} 
              color={filterType === type.id ? colors.primary : colors.textSecondary}
            />
            <Text 
              style={[
                styles.filterButtonText,
                filterType === type.id && styles.filterButtonTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </HorizontalScrollView>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : (
        emptyState
      )}
    </View>
  );
}
