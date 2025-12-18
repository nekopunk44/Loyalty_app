import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Alert, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius, colors as themeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { FadeInCard, SlideInLeftCard, ScaleInCard, FadeOutCard } from '../components/AnimatedCard';
import { useEvents } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { getEventStyleByType } from '../utils/eventStyles';
import { joinEvent } from '../services/DatabaseService';

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
  const [successFadeAnim] = useState(new Animated.Value(0)); // Анимация успеха
  
  // Состояние для уведомления об ошибке
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info'); // 'info', 'error', 'success'
  const notificationSlideAnim = useState(new Animated.Value(-60))[0];
  const notificationOpacityAnim = useState(new Animated.Value(1))[0];

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
        console.log('👁️ EventsScreen: обнаружены удаленные события:', Array.from(removedIds));
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

  const filteredEvents = useMemo(() => {
    // Используем события из EventContext (которые включают Firebase + локальные)
    const filtered = events.filter(event => {
      // 1️⃣ Фильтруем по статусу события (активные, скоро, завершены)
      if (filter === 'all') {
        // Показываем все события
      } else if (filter === 'active') {
        if (event.status !== 'Активный' && event.status !== 'active') return false;
      } else if (filter === 'upcoming') {
        if (event.status !== 'Скоро' && event.status !== 'Завтра' && event.status !== 'upcoming') return false;
      } else if (filter === 'joined') {
        return event.id === '1' || event.id === '3'; // Фиксированные события
      }
      
      // 2️⃣ Фильтруем по уровню доступа пользователя (allowedUsers)
      const allowedUsers = event.allowedUsers || 'all';
      
      // Если событие доступно для всех
      if (allowedUsers === 'all') {
        return true;
      }
      
      // Если событие для конкретного уровня, проверяем уровень пользователя
      if (user && user.membershipLevel) {
        // Нормализуем уровень (может быть 'Platinum' или 'platinum')
        const userLevel = user.membershipLevel.toLowerCase();
        const eventLevel = allowedUsers.toLowerCase();
        
        // Пользователь видит события своего уровня и выше
        const levelRank = { 'bronze': 0, 'silver': 1, 'gold': 2, 'platinum': 3 };
        const userRank = levelRank[userLevel] || 0;
        const eventRank = levelRank[eventLevel] || 0;
        
        return userRank >= eventRank;
      }
      
      // Если пользователь не авторизован, не показываем события с ограничениями
      return allowedUsers === 'all';
    });
    
    return filtered;
  }, [filter, events, user]);

  const handleEventPress = (event) => {
    // 🔄 Сразу берем обновленное событие из контекста если оно там есть
    const eventFromContext = events.find(e => e.id === event.id);
    const eventToShow = eventFromContext || event;
    
    console.log('📍 handleEventPress: event.id =', event.id);
    console.log('📍 handleEventPress: eventFromContext =', eventFromContext);
    console.log('📍 handleEventPress: eventToShow.participantIds =', eventToShow.participantIds);
    
    setSelectedEvent(eventToShow);
    setEventDetailModalVisible(true);
  };

  const handleJoinEvent = async () => {
    console.log('🎯 handleJoinEvent: клик на кнопку');
    
    if (!selectedEvent || !user) {
      console.warn('⚠️ handleJoinEvent: selectedEvent или user отсутствуют', { selectedEvent, user });
      return;
    }
    
    console.log('📍 handleJoinEvent: selectedEvent.id =', selectedEvent.id);
    console.log('📍 handleJoinEvent: user.id =', user.id);
    console.log('📍 handleJoinEvent: selectedEvent.participantIds =', selectedEvent.participantIds);
    
    // ✅ Проверка на клиенте: уже ли пользователь участвует
    const participantIds = Array.isArray(selectedEvent.participantIds) 
      ? selectedEvent.participantIds 
      : [];
    
    console.log('✅ handleJoinEvent: participantIds =', participantIds);
    console.log('✅ handleJoinEvent: includes(user.id) =', participantIds.includes(user.id));
    
    if (participantIds.includes(user.id)) {
      console.warn('⚠️ handleJoinEvent: пользователь уже участвует! Показываю уведомление');
      showNotification('Вы уже участвуете в этом событии', 'error');
      setEventDetailModalVisible(false);
      return;
    }
    
    console.log('🔄 handleJoinEvent: закрываю модальное окно');
    // Закрываем модальное окно деталей события
    setEventDetailModalVisible(false);
    
    // Отправляем запрос на сервер
    try {
      console.log('📤 handleJoinEvent: отправляю запрос на сервер...');
      const response = await fetch(`http://localhost:5002/api/events/${selectedEvent.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      console.log('📥 handleJoinEvent: получен ответ. status =', response.status);
      
      const data = await response.json();
      console.log('📥 handleJoinEvent: data =', data);

      if (response.status === 409) {
        // Сервер вернул 409 - уже участвует
        console.warn('⚠️ handleJoinEvent: статус 409 - уже участвует. Показываю алерт');
        alert('Уже участвуете - Вы уже участвуете в этом событии');
        // Обновляем событие из ответа сервера для синхронизации
        if (data.event) {
          console.log('🔄 handleJoinEvent: обновляю selectedEvent из ответа 409');
          setSelectedEvent(data.event);
          updateEvent(selectedEvent.id, data.event);
        }
        return;
      }

      if (!response.ok) {
        console.error('❌ handleJoinEvent: ошибка от сервера', data.error);
        showNotification(data.error || 'Не удалось присоединиться к событию', 'error');
        return;
      }

      // Только если успех - обновляем событие и показываем анимацию
      if (data.event) {
        console.log('✅ handleJoinEvent: успех! Получено обновленное событие');
        console.log('✅ handleJoinEvent: data.event.participantIds =', data.event.participantIds);
        
        // 🔥 Сразу же обновляем локальное состояние и контекст
        // Это гарантирует, что при повторном клике проверка пройдёт
        const updatedEvent = {
          ...data.event,
          participantIds: Array.isArray(data.event.participantIds) 
            ? data.event.participantIds 
            : [user.id],
        };
        console.log('🔄 handleJoinEvent: обновляю selectedEvent:', updatedEvent.participantIds);
        setSelectedEvent(updatedEvent);
        updateEvent(selectedEvent.id, updatedEvent);
        
        // 🔄 Сразу же загружаем обновленные события с сервера
        if (refreshEvents) {
          console.log('🔄 handleJoinEvent: загружаю обновленные события с сервера');
          refreshEvents();
        }
        
        // Показываем уведомление об успехе
        showNotification(`Вы теперь участвуете в событии "${selectedEvent.title}"`, 'success', 3000);
      }
    } catch (error) {
      console.error('❌ handleJoinEvent: ошибка при присоединении:', error);
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 16,
    gap: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    marginHorizontal: 0,
    padding: spacing.md,
    alignItems: 'flex-start',
    borderLeftWidth: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
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
      {/* Заголовок - вне FlatList, чтобы не обновлялся */}
      <ScaleInCard delay={50} style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>События и акции</Text>
          <Text style={styles.headerSubtitle}>
            Участвуйте в эксклюзивных предложениях
          </Text>
        </View>
      </ScaleInCard>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Фильтры */}
            <View 
              style={styles.filterContainer}
            >
              {filterTabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterTab,
                    filter === tab.id && styles.filterTabActive,
                  ]}
                  onPress={() => setFilter(tab.id)}
                >
                  <MaterialIcons 
                    name={tab.icon} 
                    size={16} 
                    color={filter === tab.id ? '#fff' : colors.textSecondary}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={[
                    styles.filterTabText,
                    filter === tab.id && styles.filterTabTextActive,
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
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
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Нет событий</Text>
            <Text style={styles.emptyStateSubtext}>Скоро появятся новые акции</Text>
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

