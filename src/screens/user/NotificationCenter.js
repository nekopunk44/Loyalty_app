import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import HorizontalScrollView from '../../components/ui/HorizontalScrollView';
import { pluralize } from '../../utils/pluralize';

export default function NotificationCenter({ onClose }) {
  const { notifications, markAsRead, deleteNotification, notificationsEnabled } = useNotification();
  const { isDark, theme } = useTheme();
  const [filterType, setFilterType] = useState('payment');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const colors = theme.colors;

  // Стили с доступом к переменным компонента
  const styles = useMemo(() => StyleSheet.create({
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
    // Новые стили для структурированного вида бронирований
    bookingDetails: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginVertical: spacing.xs,
      gap: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    detailText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
      flex: 1,
    },
    // Модальные стили
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalSection: {
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
      letterSpacing: 0.5,
    },
    detailItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
  }), [colors]);

  const notificationTypes = [
    { id: 'payment', label: 'Платежи', icon: 'payment' },
    { id: 'booking', label: 'Бронирование', icon: 'event' },
    { id: 'referral', label: 'Рефералы', icon: 'group' },
    { id: 'review', label: 'Отзывы', icon: 'star' },
  ];

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'payment') {
      return ['paymentSuccess', 'paymentFailed', 'cashbackReceived', 'topup', 'balance_replenishment', 'user_balance_replenishment'].includes(n.type);
    }
    if (filterType === 'booking') {
      return ['newBooking', 'bookingConfirmed', 'bookingCompleted', 'bookingCancelled', 'bookingPending', 'new_booking', 'admin_event'].includes(n.type);
    }
    if (filterType === 'referral') {
      return ['referralNotification', 'referralBonus', 'friendJoined'].includes(n.type);
    }
    if (filterType === 'review') {
      return ['reviewNotification', 'newReview', 'reviewReply'].includes(n.type);
    }
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      // Бронирования
      case 'newBooking':
      case 'new_booking':
      case 'bookingConfirmed':
      case 'bookingPending':
      case 'admin_event':
        return 'event-note';
      case 'bookingCompleted':
        return 'event-available';
      case 'bookingCancelled':
        return 'event-busy';
      // Платежи
      case 'paymentSuccess':
      case 'topup':
      case 'balance_replenishment':
      case 'user_balance_replenishment':
        return 'check-circle';
      case 'paymentFailed':
        return 'cancel';
      case 'cashbackReceived':
        return 'card-giftcard';
      // Рефералы
      case 'referralNotification':
      case 'referralBonus':
      case 'friendJoined':
        return 'people';
      // Отзывы
      case 'reviewNotification':
      case 'newReview':
      case 'reviewReply':
        return 'star';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      // Платежи - зеленый
      case 'paymentSuccess':
      case 'cashbackReceived':
      case 'topup':
      case 'balance_replenishment':
      case 'user_balance_replenishment':
        return colors.success;
      case 'paymentFailed':
        return '#ff6b6b';
      // Бронирования - первичный цвет
      case 'newBooking':
      case 'new_booking':
      case 'bookingConfirmed':
      case 'bookingPending':
      case 'admin_event':
        return colors.primary;
      case 'bookingCompleted':
        return colors.success;
      case 'bookingCancelled':
        return '#ff6b6b';
      // Рефералы - акцент
      case 'referralNotification':
      case 'referralBonus':
      case 'friendJoined':
        return colors.accent;
      // Отзывы - вторичный цвет
      case 'reviewNotification':
      case 'newReview':
      case 'reviewReply':
        return colors.secondary;
      default:
        return colors.primary;
    }
  };

  const getNotificationTitle = (type) => {
    switch (type) {
      // Бронирования
      case 'newBooking':
      case 'new_booking':
      case 'admin_event':
        return 'Новое бронирование';
      case 'bookingConfirmed':
        return 'Бронирование подтверждено';
      case 'bookingCompleted':
        return 'Бронирование завершено';
      case 'bookingCancelled':
        return 'Бронирование отменено';
      case 'bookingPending':
        return 'Ожидание оплаты';
      // Платежи
      case 'paymentSuccess':
        return 'Платёж успешен';
      case 'paymentFailed':
        return 'Платёж не прошел';
      case 'cashbackReceived':
        return 'Кэшбек получен';
      case 'topup':
        return 'Баланс пополнен';
      case 'balance_replenishment':
        return 'Баланс пополнен';
      case 'user_balance_replenishment':
        return 'Пополнение баланса пользователем';
      // Рефералы
      case 'referralNotification':
        return 'Бонус реферала';
      case 'referralBonus':
        return 'Вы получили бонус';
      case 'friendJoined':
        return 'Друг присоединился';
      // Отзывы
      case 'reviewNotification':
        return 'Новый отзыв';
      case 'newReview':
        return 'Оставьте отзыв';
      case 'reviewReply':
        return 'Ответ на ваш отзыв';
      default:
        return 'Уведомление';
    }
  };

  const formatTime = (dateInput) => {
    // Преобразуем строку в объект Date если необходимо
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
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

  const renderNotificationItem = ({ item }) => {
    // Для бронирований показываем структурированный вид
    const isBookingNotification = ['newBooking', 'new_booking', 'bookingConfirmed', 'bookingCompleted', 'bookingCancelled', 'bookingPending', 'admin_event'].includes(item.type);

    return (
      <TouchableOpacity 
        style={[
          styles.notificationCard,
          !item.read && styles.notificationCardUnread,
        ]}
        onPress={() => {
          markAsRead(item.id);
          if (isBookingNotification) {
            setSelectedNotification(item);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
          <MaterialIcons name={getNotificationIcon(item.type)} size={20} color="#fff" />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{getNotificationTitle(item.type)}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          
          {/* Структурированный вид для бронирований */}
          {isBookingNotification ? (
            <View style={styles.bookingDetails}>
              {/* Если есть структурированные данные, показываем их */}
              {item.data && (
                <>
                  {item.data.guestName && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="person" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{item.data.guestName}</Text>
                    </View>
                  )}
                  {item.data.checkInDate && item.data.checkOutDate && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="calendar-today" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{item.data.checkInDate} - {item.data.checkOutDate}</Text>
                    </View>
                  )}
                  {item.data.guests && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="group" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{item.data.guests} {pluralize(item.data.guests, 'гость', 'гостя', 'гостей')}</Text>
                    </View>
                  )}
                  {item.data.totalPrice && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="attach-money" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{item.data.totalPrice} PRB</Text>
                    </View>
                  )}
                  {item.data.saunaHours > 0 && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="hot-tub" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Сауна: {item.data.saunaHours}ч</Text>
                    </View>
                  )}
                  {item.data.kitchenware && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="kitchen" size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>Посуда и кухня</Text>
                    </View>
                  )}
                </>
              )}
              
              {/* Если нет структурированных данных, показываем сообщение */}
              {!item.data && item.message && (
                <Text style={styles.detailText}>{item.message}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.message}>{item.message}</Text>
          )}
          
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
  };

  const emptyState = (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyText}>Уведомлений нет</Text>
      <Text style={styles.emptySubtext}>Вы на связи с актуальной информацией</Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadLabel = pluralize(unreadCount, 'новое', 'новых', 'новых');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Уведомления</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} {unreadLabel}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={styles.enabledBadge}>
            <MaterialIcons 
              name={notificationsEnabled ? 'notifications' : 'notifications-off'} 
              size={20} 
              color={notificationsEnabled ? colors.success : colors.textSecondary}
            />
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
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
              color={filterType === type.id ? '#fff' : colors.textSecondary}
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

      {/* Detail Modal for Booking Notifications */}
      {selectedNotification && (
        <Modal
          visible={!!selectedNotification}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedNotification(null)}
        >
          <View style={styles.modalBackdrop}>
            <ScrollView style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getNotificationTitle(selectedNotification.type)}</Text>
                <TouchableOpacity onPress={() => setSelectedNotification(null)}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Booking Details */}
              {selectedNotification.data && (
                <>
                  {/* Property Info */}
                  {selectedNotification.data.propertyName && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>Объект</Text>
                      <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                        <MaterialIcons name="home" size={16} color={colors.primary} />
                        <Text style={styles.detailValue}>{selectedNotification.data.propertyName}</Text>
                      </View>
                    </View>
                  )}

                  {/* Guest Info */}
                  {selectedNotification.data.guestName && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>Гость</Text>
                      <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                        <MaterialIcons name="person" size={16} color={colors.primary} />
                        <Text style={styles.detailValue}>{selectedNotification.data.guestName}</Text>
                      </View>
                    </View>
                  )}

                  {/* Dates */}
                  {selectedNotification.data.checkInDate && selectedNotification.data.checkOutDate && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>Даты проживания</Text>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Заезд</Text>
                        <Text style={styles.detailValue}>{selectedNotification.data.checkInDate}</Text>
                      </View>
                      <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                        <Text style={styles.detailLabel}>Выезд</Text>
                        <Text style={styles.detailValue}>{selectedNotification.data.checkOutDate}</Text>
                      </View>
                    </View>
                  )}

                  {/* Guests and Services */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>Детали бронирования</Text>
                    {selectedNotification.data.guests && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Гостей</Text>
                        <Text style={styles.detailValue}>{selectedNotification.data.guests} {pluralize(selectedNotification.data.guests, 'чел.', 'чел.', 'чел.')}</Text>
                      </View>
                    )}
                    {selectedNotification.data.saunaHours > 0 && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Сауна</Text>
                        <Text style={styles.detailValue}>{selectedNotification.data.saunaHours}ч</Text>
                      </View>
                    )}
                    {selectedNotification.data.kitchenware && (
                      <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                        <Text style={styles.detailLabel}>Посуда и кухня</Text>
                        <Text style={styles.detailValue}>✓</Text>
                      </View>
                    )}
                  </View>

                  {/* Price */}
                  {selectedNotification.data.totalPrice && (
                    <View style={[styles.modalSection, { borderTopWidth: 1, borderTopColor: colors.border, paddingTopStyle: spacing.lg }]}>
                      <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.detailLabel, { fontSize: 14, fontWeight: '700' }]}>Сумма</Text>
                        <Text style={[styles.detailValue, { fontSize: 16, color: colors.primary }]}>{selectedNotification.data.totalPrice} PRB</Text>
                      </View>
                    </View>
                  )}

                  {/* Timestamp */}
                  <View style={[styles.modalSection, { marginTop: spacing.xl }]}>
                    <Text style={[styles.detailText, { textAlign: 'center', color: colors.textSecondary }]}>
                      {formatTime(selectedNotification.createdAt)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}
