import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Animated, Easing, Platform, RefreshControl, Dimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { SlideInLeftCard, FadeOutCard } from '../../components/ui/AnimatedCard';
import { useEvents } from '../../context/EventContext';
import { useAuth } from '../../context/AuthContext';

import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';

const EVENT_LEVEL_ORDER = { all: 0, bronze: 0, silver: 1, gold: 2, platinum: 3 };
const LEVEL_LABELS = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const LEVEL_COLORS = { silver: '#C0C0C0', gold: '#FFD700', platinum: '#9B59B6' };

const isEventLocked = (event, user) => {
  const required = (event?.allowedUsers || 'all').toLowerCase();
  if (required === 'all' || required === 'bronze') return false;
  const userLvl = (user?.membershipLevel || 'Bronze').toLowerCase();
  return (EVENT_LEVEL_ORDER[userLvl] ?? 0) < (EVENT_LEVEL_ORDER[required] ?? 0);
};

export default function EventsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const navigation = useNavigation();
  const { events, isLoading: _isLoading, refreshEvents, applyEventLocal } = useEvents(); // ← Получаем события из EventContext
  const { user } = useAuth(); // ← Получаем данные пользователя
  
  const [filter, setFilter] = useState('all');
  const [personalized, setPersonalized] = useState(false);
  const [personalizedHint, setPersonalizedHint] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalMounted, setModalMounted] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const SCREEN_H = Dimensions.get('window').height;
  const [removingEventIds, setRemovingEventIds] = useState(new Set()); // Отслеживаем удаляемые события
  const [successModalVisible, _setSuccessModalVisible] = useState(false); // Модальное окно успеха
  const successFadeAnim = useRef(new Animated.Value(0)).current; // Анимация успеха
  const [refreshing, setRefreshing] = useState(false);
  
  // Состояние для уведомления об ошибке
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info'); // 'info', 'error', 'success'
  const notificationSlideAnim = useRef(new Animated.Value(-60)).current;
  const notificationOpacityAnim = useRef(new Animated.Value(1)).current;

  // Hero animations
  const useNative = Platform.OS !== 'web';
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const hBlob1    = useRef(new Animated.Value(1)).current;
  const hBlob2    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!refreshEvents) return;
    let cancelled = false;
    (async () => {
      const meta = await refreshEvents(personalized ? { personalized: true } : {});
      if (cancelled || !personalized) {
        if (!personalized) setPersonalizedHint(null);
        return;
      }
      if (meta && meta.personalized) {
        setPersonalizedHint(null);
      } else if (meta?.reason === 'no_auth') {
        setPersonalizedHint('Войдите, чтобы получить персональные рекомендации');
        setPersonalized(false);
      } else if (meta?.reason === 'ml_unavailable' || meta?.reason === 'network_error') {
        setPersonalizedHint('Рекомендации временно недоступны — показан общий список');
        setPersonalized(false);
      }
    })();
    return () => { cancelled = true; };
  }, [personalized]);

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: useNative }).start();
    const pulse = (val, to, dur, delay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: to, duration: dur, useNativeDriver: useNative }),
        Animated.timing(val, { toValue: 1,  duration: dur, useNativeDriver: useNative }),
      ]));
    pulse(hBlob1, 1.35, 3200).start();
    pulse(hBlob2, 1.20, 2700, 1400).start();
  }, []);

  // filteredEvents declared early so useEffect below can safely depend on it
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filter === 'all') {
        // show all
      } else if (filter === 'active') {
        if (event.status !== 'Активный' && event.status !== 'active') return false;
      } else if (filter === 'upcoming') {
        if (event.status !== 'Скоро' && event.status !== 'Завтра' && event.status !== 'upcoming') return false;
      } else if (filter === 'joined') {
        return event.id === '1' || event.id === '3';
      }

      const allowedUsers = event.allowedUsers || 'all';
      if (allowedUsers === 'all') return true;

      if (user && user.membershipLevel) {
        const userLevel = user.membershipLevel.toLowerCase();
        const eventLevel = allowedUsers.toLowerCase();
        const levelRank = { bronze: 0, silver: 1, gold: 2, platinum: 3 };
        return (levelRank[userLevel] || 0) >= (levelRank[eventLevel] || 0);
      }

      return false;
    });
  }, [filter, events, user]);

  // Функция для показа уведомления
  const showNotification = (message, type = 'info', duration = 3000) => {
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

  // Обновляем события когда пользователь переходит на этот экран
  useFocusEffect(
    React.useCallback(() => {
      if (refreshEvents) {
        refreshEvents();
      }
    }, [refreshEvents])
  );

  // Отслеживаем удаление событий из списка
  useEffect(() => {
    const previousEventIds = new Set(filteredEvents.map(e => e.id));
    
    return () => {
      const currentEventIds = new Set(filteredEvents.map(e => e.id));
      const removedIds = new Set(
        [...previousEventIds].filter(id => !currentEventIds.has(id))
      );
      
      if (removedIds.size > 0) {
        // Отмечаем события как удаляемые для плавной анимации
        setRemovingEventIds(prev => {
          const newSet = new Set(prev);
          removedIds.forEach(id => newSet.add(id));
          return newSet;
        });
      }
    };
  }, [filteredEvents]);

  const filterTabs = [
    { id: 'all', label: 'Все', icon: 'list' },
    { id: 'active', label: 'Активные', icon: 'flash-on' },
    { id: 'upcoming', label: 'Скоро', icon: 'schedule' },
  ];

  const _mockEvents = [
    {
      id: '1',
      title: 'Аукцион: Картина',
      description: 'Редкая картина от известного художника',
      startBid: 1000,
      status: 'Активный',
      icon: 'gavel',
      color: colors.primary,
      participants: 23,
    },
    {
      id: '2',
      title: 'Двойной кешбек',
      description: 'Сегодня все покупки дают 2% кешбека',
      reward: '2x',
      status: 'Завтра',
      icon: 'star',
      color: colors.accent,
      participants: 1243,
    },
    {
      id: '3',
      title: 'Розыгрыш подарков',
      description: 'Вы участвуете автоматически',
      prize: 'Путешествие',
      status: 'Активный',
      icon: 'card-giftcard',
      color: colors.success,
      participants: 567,
    },
    {
      id: '4',
      title: 'Лимитированный товар',
      description: 'Только для члена platinum',
      price: 'Скидка 50%',
      status: 'Скоро',
      icon: 'local-fire-department',
      color: colors.secondary,
      participants: 89,
    },
  ];


  const openEventDetail = (event) => {
    const eventFromContext = events.find(e => e.id === event.id);
    setSelectedEvent(eventFromContext || event);
    sheetAnim.setValue(0);
    setModalMounted(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 340,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeEventDetail = (onClosed) => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setModalMounted(false);
        if (typeof onClosed === 'function') onClosed();
      }
    });
  };

  const handleEventPress = (event) => {
    if (event.eventType === 'auction') {
      navigation.navigate('AuctionDetail', { eventId: event.id });
      return;
    }
    openEventDetail(event);
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent || !user) return;

    if (isEventLocked(selectedEvent, user)) {
      const required = (selectedEvent.allowedUsers || '').toLowerCase();
      showNotification(`Доступно только для уровня ${LEVEL_LABELS[required] || required} и выше`, 'error');
      return;
    }

    const participantIds = Array.isArray(selectedEvent.participantIds)
      ? selectedEvent.participantIds
      : [];

    if (participantIds.includes(user.id)) {
      showNotification('Вы уже участвуете в этом событии', 'error');
      closeEventDetail();
      return;
    }

    closeEventDetail();

    try {
      const data = await apiCall(`${getApiUrl()}/events/${selectedEvent.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });

      if (data.alreadyJoined) {
        alert('Уже участвуете - Вы уже участвуете в этом событии');
        if (data.event) {
          setSelectedEvent(data.event);
          applyEventLocal(selectedEvent.id, data.event);
        }
        return;
      }

      if (data.error) {
        showNotification(data.error || 'Не удалось присоединиться к событию', 'error');
        return;
      }

      if (data.event) {
        const updatedEvent = {
          ...data.event,
          participantIds: Array.isArray(data.event.participantIds)
            ? data.event.participantIds
            : [user.id],
        };
        setSelectedEvent(updatedEvent);
        applyEventLocal(selectedEvent.id, updatedEvent);

        if (refreshEvents) refreshEvents();

        showNotification(`Вы теперь участвуете в событии "${selectedEvent.title}"`, 'success', 3000);
      }
    } catch (error) {
      showNotification('Не удалось присоединиться к событию', 'error');
    }
  };

  const renderEvent = ({ item, index }) => {
    const eventData = {
      ...item,
      icon: item.icon || 'event',
      color: item.color || '#FF6B35',
      description: item.description || item.title,
      participants: item.participants || 0,
    };
    const locked = isEventLocked(item, user);
    const requiredKey = (item.allowedUsers || 'all').toLowerCase();
    const lockColor = LEVEL_COLORS[requiredKey] || AMBER;
    const isRemoving = removingEventIds.has(item.id);
    
    return (
      <FadeOutCard 
        key={item.id} 
        isRemoving={isRemoving}
        onRemove={() => {
          // После анимации удаляем из списка removingEventIds
          setRemovingEventIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }}
      >
        <SlideInLeftCard delay={100 + (index % 3) * 100}>
          <TouchableOpacity 
            style={[styles.eventCard, { borderLeftColor: eventData.color }]}
            onPress={() => handleEventPress(eventData)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: eventData.color }]}>
              <MaterialIcons name={eventData.icon} size={28} color="#fff" />
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{eventData.title}</Text>
              <Text style={styles.eventDescription} numberOfLines={2}>{eventData.description}</Text>
              
              {/* Информация о приз/награде */}
              <View style={styles.metaInfo}>
                {eventData.prize && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="card-giftcard" size={14} color={eventData.color} />
                    <Text style={styles.metaText}>{eventData.prize}</Text>
                  </View>
                )}
                {eventData.reward && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="trending-up" size={14} color={eventData.color} />
                    <Text style={styles.metaText}>+{eventData.reward}</Text>
                  </View>
                )}
                {eventData.startBid && (
                  <View style={styles.metaItem}>
                    <MaterialIcons name="attach-money" size={14} color={eventData.color} />
                    <Text style={styles.metaText}>От {eventData.startBid} PRB</Text>
                  </View>
                )}
              </View>

              <View style={styles.eventFooter}>
                <Text style={[styles.eventStatus, { color: eventData.color }]}>
                  {eventData.status}
                </Text>
                <View style={styles.participantsInfo}>
                  <MaterialIcons name="people" size={14} color={colors.textSecondary} />
                  <Text style={styles.participantsText}>
                    {eventData.participants}
                  </Text>
                </View>
              </View>
              
              {locked && (
                <View style={[styles.accessRestriction, { borderTopColor: lockColor, backgroundColor: `${lockColor}15` }]}>
                  <MaterialIcons name="lock" size={12} color={lockColor} />
                  <Text style={[styles.accessText, { color: lockColor }]}>
                    Только {LEVEL_LABELS[requiredKey]}+
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </SlideInLeftCard>
      </FadeOutCard>
  );
  };

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // ── Hero ──
  hero: { backgroundColor: NAVY, paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20, overflow: 'hidden' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  heroStats: { flexDirection: 'row', marginTop: 16, gap: 10 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, alignItems: 'center' },
  heroStatVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '600', textTransform: 'uppercase' },
  hBlob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: `${TEAL}18`, top: -60, right: -40 },
  hBlob2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: `${AMBER}12`, bottom: -50, left: -20 },
  hArc: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: `${TEAL}28`, top: -90, left: -60 },
  // ── Filters ──
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  personalizedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: `${AMBER}55`,
    backgroundColor: `${AMBER}10`,
    gap: 8,
  },
  personalizedToggleActive: {
    borderColor: AMBER,
    backgroundColor: AMBER,
  },
  personalizedToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: AMBER,
  },
  personalizedToggleTextActive: {
    color: '#fff',
  },
  personalizedBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  personalizedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  personalizedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${colors.textSecondary}10`,
    borderRadius: 10,
    gap: 6,
  },
  personalizedHintText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  filterPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBg },
  filterPillActive: { borderColor: TEAL, backgroundColor: `${TEAL}14` },
  filterPillText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  filterPillTextActive: { color: TEAL },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  // ── Event cards ──
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    padding: 14,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  accessRestriction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  accessText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyStateText: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6, textAlign: 'center' },
  emptyStateSubtext: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6, 18, 30, 0.46)',
  },
  modalContent: {
    height: '82%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 16,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  modalTitleBlock: {
    flex: 1,
    paddingRight: 14,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: colors.text,
  },
  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  eventHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    marginBottom: 14,
  },
  eventIconLarge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventHeroText: {
    flex: 1,
  },
  eventHeroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  eventHeroSub: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  eventDetailsSection: {
    backgroundColor: colors.cardBg,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 13,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  joinButton: {
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 8,
    elevation: 6,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  successModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    width: '85%',
  },
  successIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  successMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationContainer: {
    position: 'absolute',
    top: 46,
    left: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  }), [colors]);

  return (
    <View style={styles.container}>

      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.filterRow}>
              {filterTabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.filterPill, filter === tab.id && styles.filterPillActive]}
                  onPress={() => setFilter(tab.id)}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={14}
                    color={filter === tab.id ? TEAL : colors.textSecondary}
                  />
                  <Text style={[styles.filterPillText, filter === tab.id && styles.filterPillTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.personalizedToggle, personalized && styles.personalizedToggleActive]}
              onPress={() => {
                setPersonalizedHint(null);
                setPersonalized((v) => !v);
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={personalized ? 'auto-awesome' : 'auto-awesome'}
                size={16}
                color={personalized ? '#fff' : AMBER}
              />
              <Text style={[styles.personalizedToggleText, personalized && styles.personalizedToggleTextActive]}>
                {personalized ? 'Подобрано для вас' : 'Подобрать для меня'}
              </Text>
              {personalized && (
                <View style={styles.personalizedBadge}>
                  <Text style={styles.personalizedBadgeText}>ML</Text>
                </View>
              )}
            </TouchableOpacity>
            {personalizedHint ? (
              <View style={styles.personalizedHint}>
                <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.personalizedHintText}>{personalizedHint}</Text>
              </View>
            ) : null}
          </View>
        }
        data={filteredEvents}
        key={`list-${filter}`}
        keyExtractor={(i) => i.id}
        renderItem={renderEvent}
        scrollEnabled={true}
        nestedScrollEnabled={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        extraData={filter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              if (refreshEvents) {
                const meta = await refreshEvents(personalized ? { personalized: true } : {});
                if (personalized && meta && !meta.personalized) {
                  if (meta.reason === 'ml_unavailable' || meta.reason === 'network_error') {
                    setPersonalizedHint('Рекомендации временно недоступны — показан общий список');
                    setPersonalized(false);
                  }
                }
              }
              setRefreshing(false);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${NAVY}10` }]}>
              <MaterialIcons name="event-busy" size={30} color={NAVY} />
            </View>
            <Text style={styles.emptyStateText}>Нет событий</Text>
            <Text style={styles.emptyStateSubtext}>
              Скоро появятся новые акции и предложения
            </Text>
          </View>
        }
      />

      {/* Модаль деталей события */}
      {selectedEvent && (
        <Modal
          visible={modalMounted}
          animationType="none"
          transparent
          onRequestClose={() => closeEventDetail()}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => closeEventDetail()}
            />
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_H * 0.82, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleBlock}>
                  <Text style={[styles.modalEyebrow, { color: selectedEvent.color }]}>
                    {selectedEvent.status}
                  </Text>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedEvent.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => closeEventDetail()}
                  activeOpacity={0.82}
                >
                  <MaterialIcons name="close" size={22} color={NAVY} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Иконка события */}
                <View style={[styles.eventHeroCard, { borderColor: selectedEvent.color + '33' }]}>
                  <View style={[styles.eventIconLarge, { backgroundColor: selectedEvent.color + '18' }]}>
                    <MaterialIcons name={selectedEvent.icon} size={34} color={selectedEvent.color} />
                  </View>
                  <View style={styles.eventHeroText}>
                    <Text style={styles.eventHeroTitle} numberOfLines={2}>{selectedEvent.title}</Text>
                    <Text style={styles.eventHeroSub} numberOfLines={2}>{selectedEvent.description}</Text>
                  </View>
                </View>

                {/* Описание */}
                <View style={styles.eventDetailsSection}>
                  <Text style={styles.sectionTitle}>Описание</Text>
                  <Text style={styles.sectionText}>{selectedEvent.description}</Text>
                </View>

                {/* Информация */}
                <View style={styles.eventDetailsSection}>
                  <Text style={styles.sectionTitle}>Информация</Text>
                  
                  <View style={styles.infoRow}>
                    <View style={[styles.infoBadge, { backgroundColor: selectedEvent.color + '20' }]}>
                      <MaterialIcons name="flash-on" size={18} color={selectedEvent.color} />
                      <Text style={[styles.infoBadgeText, { color: selectedEvent.color }]}>
                        {selectedEvent.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialIcons name="group" size={18} color={colors.textSecondary} />
                    <Text style={styles.infoText}>
                      {selectedEvent.participants} человек участвуют
                    </Text>
                  </View>

                  {selectedEvent.prize && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="card-giftcard" size={18} color={colors.success} />
                      <Text style={[styles.infoText, { fontWeight: '700' }]}>
                        Приз: {selectedEvent.prize}
                      </Text>
                    </View>
                  )}

                  {selectedEvent.reward && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="percent" size={18} color={colors.accent} />
                      <Text style={[styles.infoText, { fontWeight: '700' }]}>
                        Бонус: +{selectedEvent.reward} кэшбека
                      </Text>
                    </View>
                  )}

                  {selectedEvent.startBid && (
                    <View style={styles.infoRow}>
                      <MaterialIcons name="attach-money" size={18} color={colors.primary} />
                      <Text style={[styles.infoText, { fontWeight: '700' }]}>
                        Стартовая цена: {selectedEvent.startBid} PRB
                      </Text>
                    </View>
                  )}
                </View>

                {/* Кнопка участия */}
                {isEventLocked(selectedEvent, user) ? (
                  <View style={[styles.joinButton, { backgroundColor: '#94A3B8' }]}>
                    <MaterialIcons name="lock" size={20} color="#fff" />
                    <Text style={styles.joinButtonText}>
                      Только {LEVEL_LABELS[(selectedEvent.allowedUsers || '').toLowerCase()] || selectedEvent.allowedUsers}+
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: selectedEvent.color }]}
                    onPress={handleJoinEvent}
                  >
                    <MaterialIcons name="star" size={20} color="#fff" />
                    <Text style={styles.joinButtonText}>Участвовать</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Модальное окно успеха участия */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successModalContainer}>
          <Animated.View 
            style={[
              styles.successModalContent,
              { opacity: successFadeAnim }
            ]}
          >
            <View style={[styles.successIconBox, { backgroundColor: selectedEvent?.color || colors.primary }]}>
              <MaterialIcons name="check-circle" size={80} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Вы участвуете в событии!</Text>
            <Text style={styles.successSubtitle}>
              {selectedEvent?.title || 'События'}
            </Text>
            <Text style={styles.successMessage}>
              Выполняйте условия события{'\n'}и получайте награды
            </Text>
          </Animated.View>
        </View>
      </Modal>
      {/* Модальное окно уведомления */}
      {notificationVisible && (
        <Animated.View 
          style={[
            styles.notificationContainer,
            { 
              opacity: notificationOpacityAnim,
              transform: [{ translateY: notificationSlideAnim }],
              backgroundColor: notificationType === 'error' ? '#FF6B6B' : 
                             notificationType === 'success' ? '#51CF66' : '#4ECDC4'
            }
          ]}
        >
          <MaterialIcons 
            name={notificationType === 'error' ? 'error-outline' : 
                  notificationType === 'success' ? 'check-circle' : 'info'}
            size={20} 
            color="#fff" 
            style={{ marginRight: 10 }}
          />
          <Text style={styles.notificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}
