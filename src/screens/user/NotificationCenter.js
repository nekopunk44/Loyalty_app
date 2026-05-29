import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  ScrollView, Modal, Animated, Easing, Dimensions, PanResponder, Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNotification, NOTIFICATION_CATEGORIES } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { pluralize } from '../../utils/pluralize';

const SCREEN_H = Dimensions.get('window').height;

const ALL_DISPLAYED_TYPES = Object.values(NOTIFICATION_CATEGORIES).flat();

export default function NotificationCenter({ onClose, dragHandlers }) {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotification();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [filterType, setFilterType]       = useState('all');
  const [selectedNote, setSelectedNote]   = useState(null);
  const [detailMounted, setDetailMounted] = useState(false);
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
      case 'eventCreated':      return 'add-circle-outline';
      case 'eventUpdated':      return 'edit';
      case 'eventDeleted':      return 'delete-outline';
      case 'userAdded':         return 'person-add';
      case 'userDeleted':       return 'person-remove';
      case 'userUpdated':       return 'manage-accounts';
      default: return 'notifications';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'paymentSuccess': case 'cashbackReceived': case 'topup':
      case 'balance_replenishment': case 'user_balance_replenishment':
      case 'bookingCompleted': case 'userAdded': case 'eventCreated':
        return colors.success;
      case 'paymentFailed': case 'bookingCancelled':
      case 'userDeleted': case 'eventDeleted':
        return colors.danger;
      case 'newBooking': case 'new_booking': case 'bookingConfirmed':
      case 'bookingPending': case 'admin_event':
        return colors.primary;
      case 'reviewNotification': case 'newReview': case 'reviewReply':
      case 'eventUpdated': case 'userUpdated':
        return colors.warning;
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
      case 'eventCreated':      return 'Событие создано';
      case 'eventUpdated':      return 'Событие обновлено';
      case 'eventDeleted':      return 'Событие удалено';
      case 'userAdded':         return 'Пользователь добавлен';
      case 'userDeleted':       return 'Пользователь удалён';
      case 'userUpdated':       return 'Пользователь обновлён';
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

  // ── filter + count badges ─────────────────────────────────────────────────
  const notificationTypes = [
    { id: 'all',     label: 'Все',         icon: 'notifications' },
    { id: 'payment', label: 'Платежи',     icon: 'payments' },
    { id: 'booking', label: 'Брони',       icon: 'event-note' },
    { id: 'system',  label: 'Система',     icon: 'settings' },
  ];

  const unreadByCategory = useMemo(() => {
    const counts = { all: 0, payment: 0, booking: 0, system: 0 };
    for (const n of notifications) {
      if (n.read) continue;
      let matched = false;
      for (const [cat, types] of Object.entries(NOTIFICATION_CATEGORIES)) {
        if (types.includes(n.type)) {
          counts[cat] += 1;
          matched = true;
          break;
        }
      }
      if (matched) counts.all += 1;
    }
    return counts;
  }, [notifications]);

  const totalUnread = unreadByCategory.all;
  const totalVisible = useMemo(
    () => notifications.filter((n) => ALL_DISPLAYED_TYPES.includes(n.type)).length,
    [notifications]
  );

  // ── sections by date (Сегодня / Вчера / Раньше) ───────────────────────────
  const sections = useMemo(() => {
    const allowed = filterType === 'all'
      ? ALL_DISPLAYED_TYPES
      : NOTIFICATION_CATEGORIES[filterType] || [];
    const filtered = notifications.filter((n) => allowed.includes(n.type));
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const today = [], yesterday = [], earlier = [];
    for (const n of sorted) {
      const t = new Date(n.createdAt).getTime();
      if (t >= todayStart) today.push(n);
      else if (t >= yesterdayStart) yesterday.push(n);
      else earlier.push(n);
    }
    const result = [];
    if (today.length)     result.push({ title: 'Сегодня', data: today });
    if (yesterday.length) result.push({ title: 'Вчера',   data: yesterday });
    if (earlier.length)   result.push({ title: 'Раньше',  data: earlier });
    return result;
  }, [notifications, filterType]);

  const confirmClearAll = () => {
    Alert.alert(
      'Очистить все уведомления?',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Очистить', style: 'destructive', onPress: () => clearAllNotifications() },
      ]
    );
  };

  // ── styles ─────────────────────────────────────────────────────────────────
  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    handleArea: {
      paddingTop: 10, paddingBottom: 6,
      alignItems: 'center',
    },
    handle: {
      width: 46, height: 5, borderRadius: 3,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, gap: 8,
    },
    headerTitleWrap: { flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    headerSubtitle: {
      fontSize: 11, fontWeight: '600',
      color: colors.textSecondary, marginTop: 2,
    },
    iconBtn: {
      width: 36, height: 36, borderRadius: 18,
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
    pillActive: {
      borderColor: `${colors.primary}80`,
      backgroundColor: `${colors.primary}14`,
    },
    pillText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, flexShrink: 1 },
    pillTextActive: { color: colors.primary },
    pillBadge: {
      minWidth: 16, height: 16, borderRadius: 8,
      paddingHorizontal: 4, marginLeft: 2,
      backgroundColor: colors.danger,
      alignItems: 'center', justifyContent: 'center',
    },
    pillBadgeActive: { backgroundColor: colors.primary },
    pillBadgeText: {
      color: '#fff', fontSize: 9, fontWeight: '900',
      lineHeight: 12, letterSpacing: 0.2,
    },

    // section header
    sectionHeader: {
      paddingHorizontal: 22, paddingTop: 12, paddingBottom: 6,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 10, fontWeight: '900', letterSpacing: 1.2,
      textTransform: 'uppercase', color: colors.textSecondary,
    },

    // list
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },

    // notification row
    card: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: colors.cardBg,
      borderRadius: 14, padding: 12,
      borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    cardUnread: {
      borderColor: `${colors.primary}55`,
      backgroundColor: `${colors.primary}08`,
    },
    iconBox: {
      width: 40, height: 40, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 12, flexShrink: 0,
      borderWidth: 1,
    },
    cardBody: { flex: 1, minWidth: 0 },
    cardTop: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 3, gap: 6,
    },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
    unreadDot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: colors.primary,
    },
    cardMsg: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },
    miniRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
    miniText: { fontSize: 11, color: colors.textSecondary, flex: 1 },
    cardTime: {
      fontSize: 10, color: colors.textSecondary,
      fontWeight: '700', marginTop: 4,
      letterSpacing: 0.3, textTransform: 'uppercase',
    },
    deleteBtn: { padding: 6, marginLeft: 4, marginTop: -3 },
    separator: { height: 8 },

    // empty
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 60 },
    emptyIconBox: {
      width: 72, height: 72, borderRadius: 24,
      backgroundColor: `${colors.primary}14`,
      borderWidth: 1, borderColor: `${colors.primary}33`,
      justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 5, textAlign: 'center' },
    emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

    // inner detail modal
    detailOverlay: {
      flex: 1, justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.46)',
    },
    detailSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      maxHeight: '80%',
      shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.18, shadowRadius: 24, elevation: 18,
    },
    dHandleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    dHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: colors.border },
    dHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    },
    dTitleBlock: { flex: 1, paddingRight: 12 },
    dEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.4 },
    dTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
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
      backgroundColor: `${colors.success}14`, borderRadius: 14,
      paddingHorizontal: 18, paddingVertical: 14,
      borderWidth: 1, borderColor: `${colors.success}33`,
    },
    priceLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    priceValue: { fontSize: 20, fontWeight: '900', color: colors.success },
    dTimestamp: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 10 },
  }), [colors]);

  const emptyConfig = {
    all:     { icon: 'notifications-none',  title: 'Уведомлений пока нет',     sub: 'Здесь появятся все события — платежи, бронирования, системные' },
    payment: { icon: 'account-balance-wallet', title: 'Платежей нет',          sub: 'Операции с балансом и кэшбек появятся здесь' },
    booking: { icon: 'event-note',          title: 'Бронирований нет',         sub: 'Подтверждения и обновления появятся здесь' },
    system:  { icon: 'settings',            title: 'Системных уведомлений нет', sub: 'События, пользователи и отзывы появятся здесь' },
  };

  const renderItem = ({ item }) => {
    const color     = getColor(item.type);
    const isBooking = NOTIFICATION_CATEGORIES.booking.includes(item.type);
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        activeOpacity={0.75}
        onPress={() => {
          if (!item.read) markAsRead(item.id);
          if (isBooking && item.data) openDetail(item);
        }}
      >
        <View style={[
          styles.iconBox,
          { backgroundColor: `${color}1F`, borderColor: `${color}40` },
        ]}>
          <MaterialIcons name={getIcon(item.type)} size={20} color={color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{getTitle(item.type)}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          {isBooking && item.data ? (
            <>
              {item.data.guestName && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="person" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText} numberOfLines={1}>{item.data.guestName}</Text>
                </View>
              )}
              {item.data.checkInDate && item.data.checkOutDate && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="calendar-today" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText} numberOfLines={1}>
                    {item.data.checkInDate} — {item.data.checkOutDate}
                  </Text>
                </View>
              )}
              {item.data.totalPrice && (
                <View style={styles.miniRow}>
                  <MaterialIcons name="payments" size={12} color={colors.textSecondary} />
                  <Text style={styles.miniText} numberOfLines={1}>{item.data.totalPrice} PRB</Text>
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

  const ec = emptyConfig[filterType] || emptyConfig.all;
  const noteColor = getColor(selectedNote?.type || '');

  return (
    <View style={styles.root}>

      {/* Handle (drag to dismiss) */}
      <View {...(dragHandlers || {})} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>Уведомления</Text>
          {totalVisible > 0 && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {totalUnread > 0
                ? `${totalUnread} новых · ${totalVisible} всего`
                : `${totalVisible} ${pluralize(totalVisible, 'уведомление', 'уведомления', 'уведомлений')}`}
            </Text>
          )}
        </View>

        {totalUnread > 0 && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={markAllAsRead}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <MaterialIcons name="done-all" size={18} color={colors.text} />
          </TouchableOpacity>
        )}

        {totalVisible > 0 && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={confirmClearAll}
            activeOpacity={0.8}
            hitSlop={6}
          >
            <MaterialIcons name="delete-sweep" size={18} color={colors.text} />
          </TouchableOpacity>
        )}

        {onClose && (
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.8}>
            <MaterialIcons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {notificationTypes.map((t) => {
          const active = filterType === t.id;
          const badge  = unreadByCategory[t.id] || 0;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setFilterType(t.id)}
              activeOpacity={0.85}
            >
              <MaterialIcons name={t.icon} size={13} color={active ? colors.primary : colors.textSecondary} />
              <Text
                style={[styles.pillText, active && styles.pillTextActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t.label}
              </Text>
              {badge > 0 && (
                <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
                  <Text style={styles.pillBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List / Empty */}
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBox}>
            <MaterialIcons name={ec.icon} size={34} color={colors.primary} />
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
                <TouchableOpacity style={styles.iconBtn} onPress={closeDetail} activeOpacity={0.8}>
                  <MaterialIcons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.dBody} showsVerticalScrollIndicator={false}>
                {selectedNote.data && (
                  <>
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
