import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Alert, Animated, Platform, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius, colors as themeColors } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { FadeInCard, SlideInLeftCard, FadeOutCard } from '../../components/ui/AnimatedCard';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
import { useEvents } from '../../context/EventContext';
import { useAuth } from '../../context/AuthContext';
import { getEventStyleByType } from '../../utils/eventStyles';
import { joinEvent } from '../../services/DatabaseService';

import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

export default function EventsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { events, isLoading, refreshEvents, updateEvent } = useEvents(); // ← Получаем события из EventContext
  const { user } = useAuth(); // ← Получаем данные пользователя
  
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailModalVisible, setEventDetailModalVisible] = useState(false);
  const [removingEventIds, setRemovingEventIds] = useState(new Set()); // Отслеживаем удаляемые события
  const [successModalVisible, setSuccessModalVisible] = useState(false); // Модальное окно успеха
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

  const mockEvents = [
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


  const handleEventPress = (event) => {
    // 🔄 Сразу берем обновленное событие из контекста если оно там есть
    const eventFromContext = events.find(e => e.id === event.id);
    const eventToShow = eventFromContext || event;
    
    setSelectedEvent(eventToShow);
    setEventDetailModalVisible(true);
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent || !user) return;

    const participantIds = Array.isArray(selectedEvent.participantIds)
      ? selectedEvent.participantIds
      : [];

    if (participantIds.includes(user.id)) {
      showNotification('Вы уже участвуете в этом событии', 'error');
      setEventDetailModalVisible(false);
      return;
    }

    setEventDetailModalVisible(false);

    try {
      const data = await apiCall(`${getApiUrl()}/events/${selectedEvent.id}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });

      if (data.alreadyJoined) {
        alert('Уже участвуете - Вы уже участвуете в этом событии');
        if (data.event) {
          setSelectedEvent(data.event);
          updateEvent(selectedEvent.id, data.event);
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
        updateEvent(selectedEvent.id, updatedEvent);

        if (refreshEvents) refreshEvents();

        showNotification(`Вы теперь участвуете в событии "${selectedEvent.title}"`, 'success', 3000);
      }
    } catch (error) {
      showNotification('Не удалось присоединиться к событию', 'error');
    }
  };

  const renderEvent = ({ item, index }) => {
    // Используем цвет и иконку которые уже содержатся в событии
    const eventData = {
      ...item,
      icon: item.icon || 'event',
      color: item.color || '#FF6B35',
      description: item.description || item.title,
      participants: item.participants || 0,
    };
    
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
              
              {/* Информация о требуемом уровне доступа */}
              {item.allowedUsers && item.allowedUsers !== 'all' && (
                <View style={[styles.accessRestriction, { borderTopColor: eventData.color }]}>
                  <MaterialIcons name="shield" size={12} color={eventData.color} />
                  <Text style={[styles.accessText, { color: eventData.color }]}>
                    Только для {item.allowedUsers}
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
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    padding: spacing.md,
  },
  eventIconLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  eventDetailsSection: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
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
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
              if (refreshEvents) await refreshEvents();
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
            <Text style={styles.emptyStateSubtext}>Скоро появятся новые акции и предложения</Text>
          </View>
        }
      />

      {/* Модаль деталей события */}
      {selectedEvent && (
        <Modal visible={eventDetailModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setEventDetailModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Иконка события */}
                <View style={[styles.eventIconLarge, { backgroundColor: selectedEvent.color }]}>
                  <MaterialIcons name={selectedEvent.icon} size={64} color="#fff" />
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

                {/* Условия участия */}
                <View style={styles.eventDetailsSection}>
                  <Text style={styles.sectionTitle}>Как участвовать</Text>
                  <Text style={styles.sectionText}>
                    1. Нажмите кнопку "Участвовать"{'\n'}
                    2. Выполняйте условия события{'\n'}
                    3. Получите награду при победе{'\n'}
                    4. Используйте бонусы в следующий раз
                  </Text>
                </View>

                {/* Кнопка участия */}
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: selectedEvent.color }]}
                  onPress={handleJoinEvent}
                >
                  <MaterialIcons name="star" size={20} color="#fff" />
                  <Text style={styles.joinButtonText}>Участвовать</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
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

