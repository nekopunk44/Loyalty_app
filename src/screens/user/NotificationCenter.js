import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Modal, Animated, Easing, Dimensions, PanResponder,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNotification, NOTIFICATION_CATEGORIES } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { pluralize } from '../../utils/pluralize';

const NAVY   = '#063B5C';
const TEAL   = '#14B8A6';
const SCREEN_H = Dimensions.get('window').height;

export default function NotificationCenter({ onClose, dragHandlers }) {
  const { notifications, markAsRead, deleteNotification } = useNotification();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [filterType, setFilterType]           = useState('payment');
  const [selectedNote, setSelectedNote]       = useState(null);
  const [detailMounted, setDetailMounted]     = useState(false);
  const detailAnim = useRef(new Animated.Value(0)).current;

  const openDetail = (item) => {
    setSelectedNote(item);
    detailAnim.setValue(0);
    setDetailMounted(true);
    Animated.timing(detailAnim, {
      toValue: 1, duration: 340,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeDetail = () => {
    Animated.timing(detailAnim, {
      toValue: 0, duration: 260,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setDetailMounted(false); });
  };

  const detailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) detailAnim.setValue(Math.max(0, 1 - g.dy / (SCREEN_H * 0.8)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          closeDetail();
        } else {
          Animated.spring(detailAnim, {
            toValue: 1, useNativeDriver: true, tension: 80, friction: 12,
          }).start();
        }
      },
    })
  ).current;

  // ── helpers ────────────────────────────────────────────────────────────────
  const getIcon = (type) => {
    switch (type) {
      case 'newBooking': case 'new_booking': case 'bookingPending': case 'admin_event':
        return 'event-note';
      case 'bookingConfirmed':  return 'event-available';
      case 'bookingCompleted':  return 'check-circle';
      case 'bookingCancelled':  return 'event-busy';
      case 'paymentSuccess': case 'topup':
      case 'balance_replenishment': case 'user_balance_replenishment':
        return 'account-balance-wallet';
      case 'paymentFailed':     return 'cancel';
      case 'cashbackReceived':  return 'card-giftcard';
      case 'reviewNotification': case 'newReview': return 'star';
      case 'reviewReply':       return 'chat-bubble';
      default: return 'notifications';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'paymentSuccess': case 'cashbackReceived': case 'topup':
      case 'balance_replenishment': case 'user_balance_replenishment':
      case 'bookingCompleted': return '#10B981';
      case 'paymentFailed': case 'bookingCancelled': return '#EF4444';
      case 'newBooking': case 'new_booking': case 'bookingConfirmed':
      case 'bookingPending': case 'admin_event': return colors.primary;
      case 'reviewNotification': case 'newReview': case 'reviewReply': return '#F59E0B';
      default: return colors.primary;
    }
  };

  const getTitle = (type) => {
    switch (type) {
      case 'newBooking': case 'new_booking': case 'admin_event': return 'Новое бронирование';
      case 'bookingConfirmed':  return 'Бронирование подтверждено';
      case 'bookingCompleted':  return 'Бронирование завершено';
      case 'bookingCancelled':  return 'Бронирование отменено';
      case 'bookingPending':    return 'Ожидание оплаты';
      case 'paymentSuccess':    return 'Платёж прошёл';
      case 'paymentFailed':     return 'Платёж не прошёл';
      case 'cashbackReceived':  return 'Кэшбек получен';
      case 'topup': case 'balance_replenishment': return 'Баланс пополнен';
      case 'user_balance_replenishment': return 'Пополнение баланса';
      case 'reviewNotification': return 'Новый отзыв';
      case 'newReview':         return 'Оставьте отзыв';
      case 'reviewReply':       return 'Ответ на отзыв';
      default: return 'Уведомление';
    }
  };

  const formatTime = (d) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    const diff = Date.now() - date;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (m < 1)   return 'только что';
    if (m < 60)  return `${m}м назад`;
    if (h < 24)  return `${h}ч назад`;
    if (day < 7) return `${day}д назад`;
    return date.toLocaleDateString('ru-RU');
  };

  // ── filter ─────────────────────────────────────────────────────────────────
  const notificationTypes = [
    { id: 'payment', label: 'Платежи',      icon: 'payments' },
    { id: 'booking', label: 'Бронирования', icon: 'event-note' },
    { id: 'system',  label: 'Система',      icon: 'settings' },
  ];

  const filteredNotifications = useMemo(() => {
    const allowed = NOTIFICATION_CATEGORIES[filterType] || [];
    return notifications.filter(n => allowed.includes(n.type));
  }, [notifications, filterType]);

  // ── styles ─────────────────────────────────────────────────────────────────
  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // handle + header (matches booking modal)
    handleArea: {
      paddingTop: 10, paddingBottom: 6,
      alignItems: 'center',
    },
    handle: {
      width: 46, height: 5, borderRadius: 3,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    closeBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.cardBg,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },

    // filter pills
    filterRow: {
      flexDirection: 'row', paddingHorizontal: 16,
      paddingBottom: 12, gap: 6,
    },
    pill: {
      flexGrow: 1, flexShrink: 1, flexBasis: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 4, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 999,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg,
    },
    pillActive: { borderColor: TEAL, backgroundColor: `${TEAL}12` },
    pillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, flexShrink: 1 },
    pillTextActive: { color: TEAL },

    // list
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },

    // card (matches booking card style)
    card: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: colors.cardBg,
      borderRadius: 16, padding: 14,
      borderLeftWidth: 3, borderLeftColor: 'transparent',
    },
    cardUnread: { borderLeftColor: colors.primary },
    iconBox: {
      width: 44, height: 44, borderRadius: 13,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 12, flexShrink: 0,
    },
    cardBody: { flex: 1 },
    cardTop: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 3,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary, marginLeft: 6 },
    cardMsg: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },
    miniRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    miniText: { fontSize: 11, color: colors.textSecondary, flex: 1 },
    cardTime: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    deleteBtn: { padding: 6, marginLeft: 4, marginTop: -3 },
    separator: { height: 8 },

    // empty
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIconBox: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: `${NAVY}0f`,
      justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 5, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

    // inner detail modal
    detailOverlay: {
      flex: 1, justifyContent: 'flex-end',
      backgroundColor: 'rgba(6, 18, 30, 0.46)',
    },
    detailSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      maxHeight: '80%',
      shadowColor: NAVY, shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.18, shadowRadius: 24, elevation: 18,
    },
    dHandleArea: {
      alignItems: 'center', paddingTop: 10, paddingBottom: 6,
    },
    dHandle: {
      width: 46, height: 5, borderRadius: 3,
      backgroundColor: colors.border,
    },
    dHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    },
    dTitleBlock: { flex: 1, paddingRight: 12 },
    dEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 3 },
    dTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    dCloseBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.cardBg,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    dBody: { paddingHorizontal: 20, paddingBottom: 28 },
    dSection: {
      backgroundColor: colors.cardBg, borderRadius: 18,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    dSectionLabel: {
      fontSize: 11, fontWeight: '900', textTransform: 'uppercase',
      color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 12,
    },
    dRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    dRowLast: { borderBottomWidth: 0 },
    dLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    dValue: { fontSize: 13, color: colors.text, fontWeight: '700' },
    priceBadge: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: `${TEAL}12`, borderRadius: 14,
      paddingHorizontal: 18, paddingVertical: 14,
      borderWidth: 1, borderColor: `${TEAL}28`,
    },
    priceLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    priceValue: { fontSize: 20, fontWeight: '900', color: TEAL },
    dTimestamp: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 10 },
  }), [colors]);

  const emptyConfig = {
    payment: { icon: 'account-balance-wallet', title: 'Платежей нет',    sub: 'Операции с балансом и кэшбек появятся здесь' },
    booking: { icon: 'event-note',             title: 'Бронирований нет', sub: 'Подтверждения и обновления появятся здесь' },
    system:  { icon: 'settings',               title: 'Системных уведомлений нет', sub: 'События, действия с пользователями и отзывы появятся здесь' },
  };

  const renderItem = ({ item }) => {
    const color     = getColor(item.type);
    const isBooking = ['newBooking','new_booking','bookingConfirmed','bookingCompleted',
                       'bookingCancelled','bookingPending','admin_event'].includes(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        activeOpacity={0.72}
        onPress={() => {
          markAsRead(item.id);
          if (isBooking && item.data) openDetail(item);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
          <MaterialIcons name={getIcon(item.type)} size={22} color={color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{getTitle(item.type)}</Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          {isBooking && item.data ? (
            <>
              {item.data.guestName && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="person" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText}>{item.data.guestName}</Text>
                </View>
              )}
              {item.data.checkInDate && item.data.checkOutDate && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="calendar-today" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText}>{item.data.checkInDate} — {item.data.checkOutDate}</Text>
                </View>
              )}
              {item.data.totalPrice && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="payments" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText}>{item.data.totalPrice} PRB</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.cardMsg} numberOfLines={2}>{item.message}</Text>
          )}
          <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ec = emptyConfig[filterType] || emptyConfig.payment;
  const noteColor = getColor(selectedNote?.type || '');

  return (
    <View style={styles.root}>

      {/* Handle (drag to dismiss) */}
      <View {...(dragHandlers || {})} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Уведомления</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <MaterialIcons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {notificationTypes.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.pill, filterType === t.id && styles.pillActive]}
            onPress={() => setFilterType(t.id)}
          >
            <MaterialIcons name={t.icon} size={13} color={filterType === t.id ? TEAL : colors.textSecondary} />
            <Text
              style={[styles.pillText, filterType === t.id && styles.pillTextActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List / Empty */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBox}>
            <MaterialIcons name={ec.icon} size={34} color={NAVY} />
          </View>
          <Text style={styles.emptyTitle}>{ec.title}</Text>
          <Text style={styles.emptySubtitle}>{ec.sub}</Text>
        </View>
      )}

      {/* Detail bottom sheet */}
      {selectedNote && (
        <Modal
          visible={detailMounted}
          animationType="none"
          transparent
          statusBarTranslucent
          onRequestClose={closeDetail}
        >
          <View style={styles.detailOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeDetail} />
            <Animated.View
              style={[
                styles.detailSheet,
                {
                  transform: [{
                    translateY: detailAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_H * 0.8, 0],
                    }),
                  }],
                },
              ]}
            >
              <View {...detailPanResponder.panHandlers} style={styles.dHandleArea}>
                <View style={styles.dHandle} />
              </View>
              <View style={styles.dHeader}>
                <View style={styles.dTitleBlock}>
                  <Text style={[styles.dEyebrow, { color: noteColor }]}>{getTitle(selectedNote.type)}</Text>
                  <Text style={styles.dTitle} numberOfLines={2}>
                    {selectedNote.data?.propertyName || selectedNote.message || 'Детали'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.dCloseBtn} onPress={closeDetail} activeOpacity={0.8}>
                  <MaterialIcons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.dBody} showsVerticalScrollIndicator={false}>
                {selectedNote.data && (
                  <>
                    {/* Guest + dates */}
                    {(selectedNote.data.guestName || selectedNote.data.checkInDate || selectedNote.data.guests) && (
                      <View style={styles.dSection}>
                        <Text style={styles.dSectionLabel}>Детали бронирования</Text>
                        {selectedNote.data.guestName && (
                          <View style={styles.dRow}>
                            <Text style={styles.dLabel}>Гость</Text>
                            <Text style={styles.dValue}>{selectedNote.data.guestName}</Text>
                          </View>
                        )}
                        {selectedNote.data.checkInDate && (
                          <View style={styles.dRow}>
                            <Text style={styles.dLabel}>Заезд</Text>
                            <Text style={styles.dValue}>{selectedNote.data.checkInDate}</Text>
                          </View>
                        )}
                        {selectedNote.data.checkOutDate && (
                          <View style={styles.dRow}>
                            <Text style={styles.dLabel}>Выезд</Text>
                            <Text style={styles.dValue}>{selectedNote.data.checkOutDate}</Text>
                          </View>
                        )}
                        {selectedNote.data.guests && (
                          <View style={styles.dRow}>
                            <Text style={styles.dLabel}>Гостей</Text>
                            <Text style={styles.dValue}>
                              {selectedNote.data.guests} {pluralize(selectedNote.data.guests, 'чел.', 'чел.', 'чел.')}
                            </Text>
                          </View>
                        )}
                        {selectedNote.data.saunaHours > 0 && (
                          <View style={styles.dRow}>
                            <Text style={styles.dLabel}>Сауна</Text>
                            <Text style={styles.dValue}>{selectedNote.data.saunaHours}ч</Text>
                          </View>
                        )}
                        {selectedNote.data.kitchenware && (
                          <View style={[styles.dRow, styles.dRowLast]}>
                            <Text style={styles.dLabel}>Посуда и кухня</Text>
                            <Text style={styles.dValue}>✓</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Price */}
                    {selectedNote.data.totalPrice && (
                      <View style={styles.priceBadge}>
                        <Text style={styles.priceLabel}>Итого</Text>
                        <Text style={styles.priceValue}>{selectedNote.data.totalPrice} PRB</Text>
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.dTimestamp}>{formatTime(selectedNote.createdAt)}</Text>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}
