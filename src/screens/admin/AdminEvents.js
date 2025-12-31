import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { FadeInCard, ScaleInCard } from '../../components/ui/AnimatedCard';
import { EventDatePicker } from '../../components/ui/EventDatePicker';
import { useEvents } from '../../context/EventContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { getAllEventTypes, calculateEventStatus } from '../../utils/eventStyles';


export default function AdminEvents() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { theme, isDark } = useTheme();
  const { notifyEventCreated, notifyEventUpdated, notifyEventDeleted } = useNotification();
  
  // Анимация цветов при смене темы
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const cardColorAnim = useRef(new Animated.Value(0)).current;
  
  // Bottom-sheet анимация в стиле NotificationBell:
  // sheetMounted держит Modal в дереве, пока проигрывается close-анимация,
  // sheetTranslateY двигает контент от SHEET_H к 0 при открытии и обратно при закрытии.
  const [sheetMounted, setSheetMounted] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_H)).current;

  const openEventModal = () => {
    sheetTranslateY.setValue(SHEET_H);
    setSheetMounted(true);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeEventModal = () => {
    Animated.timing(sheetTranslateY, {
      toValue: SHEET_H,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSheetMounted(false);
    });
  };

  // PanResponder для свайпа-вниз по drag-handle — закрывает sheet, как в NotificationBell.
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          closeEventModal();
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Состояние для уведомления
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success'); // 'success', 'error'
  const notificationSlideAnim = useRef(new Animated.Value(-60)).current;
  const notificationOpacityAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    // Events updated, component will re-render
  }, [events]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize: '',
    startDate: '',
    endDate: '',
    allowedUsers: 'all',
    status: 'active',
    eventType: 'auction',
    cashbackBoostPercent: '',
    discountPercent: '',
    startBid: '',
    minBidIncrement: '',
  });


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

  const userTypes = [
    { value: 'bronze', label: 'Bronze', icon: 'shield', color: '#CD7F32' },
    { value: 'silver', label: 'Silver', icon: 'grade', color: '#C0C0C0' },
    { value: 'gold', label: 'Gold', icon: 'star', color: '#FFD700' },
    { value: 'platinum', label: 'Platinum', icon: 'flare', color: '#9999FF' },
    { value: 'all', label: 'Все пользователи', icon: 'group', color: colors.primary },
  ];

  const eventTypes = getAllEventTypes();

  // Какие промо-поля разрешены для каждого типа события.
  // Аукцион/розыгрыш — приз достаётся одному, цену брони не трогает.
  // Кэшбек/скидка — узкоспециализированные, только одно поле.
  // Акция/спец. — open-ended, оба поля.
  const promoFieldsByType = {
    auction:   { boost: false, discount: false },
    giveaway:  { boost: false, discount: false },
    cashback:  { boost: true,  discount: false },
    discount:  { boost: false, discount: true  },
    promotion: { boost: true,  discount: true  },
    special:   { boost: true,  discount: true  },
  };
  const promoCfg = promoFieldsByType[formData.eventType] || { boost: true, discount: true };

  const statuses = [
    { value: 'upcoming', label: 'Скоро' },
    { value: 'active', label: 'Активно' },
    { value: 'ended', label: 'Завершено' },
  ];

  const getStatusColor = (status) => {
    // Нормализуем статус: поддерживаем оба формата (английский и русский)
    const normalizedStatus = status?.toLowerCase() || '';
    
    if (normalizedStatus === 'active' || normalizedStatus === 'активный') {
      return colors.success;
    } else if (normalizedStatus === 'upcoming' || normalizedStatus === 'скоро') {
      return colors.accent;
    } else if (normalizedStatus === 'ended' || normalizedStatus === 'завершен' || normalizedStatus === 'завершён') {
      return colors.textSecondary;
    }
    return colors.primary;
  };

  const getStatusLabel = (status) => {
    // Нормализуем статус: поддерживаем оба формата (английский и русский)
    const normalizedStatus = status?.toLowerCase() || '';
    
    // Если это русский статус, верн все как есть
    if (normalizedStatus === 'активный') return 'Активно';
    if (normalizedStatus === 'скоро') return 'Скоро';
    if (normalizedStatus === 'завершен' || normalizedStatus === 'завершён') return 'Завершено';
    
    // Если это английский статус, найдем в массиве
    const label = statuses.find((s) => s.value === status);
    return label ? label.label : (status || 'Неизвестно');
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      // Конвертируем русский статус в английский для формы
      let statusValue = event.status || 'active';
      if (statusValue === 'Активный') statusValue = 'active';
      else if (statusValue === 'Скоро') statusValue = 'upcoming';
      else if (statusValue === 'Завершён' || statusValue === 'Завершено') statusValue = 'ended';
      
      // Определяем eventType из события или используем default
      const eventType = event.eventType || 'auction';
      
      // Находим иконку и цвет для этого типа события
      const _eventTypeInfo = eventTypes.find(t => t.value === eventType);
      
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        prize: event.prize || '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        allowedUsers: event.allowedUsers || 'all',
        status: statusValue,
        eventType: eventType,
        cashbackBoostPercent: event.cashbackBoostPercent ? String(event.cashbackBoostPercent) : '',
        discountPercent: event.discountPercent ? String(event.discountPercent) : '',
        startBid: event.startBid != null ? String(event.startBid) : '',
        minBidIncrement: event.minBidIncrement != null ? String(event.minBidIncrement) : '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        prize: '',
        startDate: '',
        endDate: '',
        allowedUsers: 'all',
        status: 'active',
        eventType: 'auction',
        cashbackBoostPercent: '',
        discountPercent: '',
        startBid: '',
        minBidIncrement: '',
      });
    }
    openEventModal();
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      Alert.alert('❌ Ошибка', 'Введите название события');
      return;
    }

    try {
      // Вычисляем статус автоматически на основе дат
      const calculatedStatus = calculateEventStatus(formData.startDate, formData.endDate);

      // Кэпы валидируем на клиенте, чтобы не отправлять заведомо невалидное значение —
      // сервер всё равно зажмёт повторно в clampPercent (см. server/routes/events.js).
      const parsePercent = (raw, max) => {
        const n = parseFloat(String(raw).replace(',', '.'));
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(n, max);
      };
      const cashbackBoostPercent = parsePercent(formData.cashbackBoostPercent, 20);
      const discountPercent = parsePercent(formData.discountPercent, 80);

      // Параметры аукциона: только для type='auction', иначе игнорируем.
      // Если поле пустое — отдаём null, сервер подставит дефолт (minBidIncrement=100).
      const parseAuctionField = (raw) => {
        if (raw === '' || raw == null) return null;
        const n = parseFloat(String(raw).replace(',', '.'));
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const isAuction = formData.eventType === 'auction';
      const startBid        = isAuction ? parseAuctionField(formData.startBid) : null;
      const minBidIncrement = isAuction ? parseAuctionField(formData.minBidIncrement) : null;

      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: calculatedStatus,
          allowedUsers: formData.allowedUsers,
          eventType: formData.eventType,
          participantIds: editingEvent.participantIds || [],
          participants: editingEvent.participants || editingEvent.participantsCount || 0,
          cashbackBoostPercent,
          discountPercent,
          startBid,
          minBidIncrement,
          targetUserIds: Array.isArray(editingEvent.targetUserIds) ? editingEvent.targetUserIds : [],
        });

        // Отправляем уведомление
        await notifyEventUpdated(formData.title, {
          eventType: formData.eventType,
          startDate: formData.startDate,
          endDate: formData.endDate,
        });
        
        // Показываем уведомление на экране
        showNotification(`Событие "${formData.title}" обновлено`, 'success');
        
        // Очищаем форму и закрываем модальное окно
        setFormData({
          title: '',
          description: '',
          prize: '',
          startDate: '',
          endDate: '',
          status: 'active',
          allowedUsers: 'all',
          eventType: 'auction',
          cashbackBoostPercent: '',
          discountPercent: '',
          startBid: '',
          minBidIncrement: '',
        });
        setEditingEvent(null);
        closeEventModal();

        Alert.alert('✅ Успех', 'Событие обновлено!');
      } else {
        const newEvent = await addEvent({
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          startDate: formData.startDate,
          endDate: formData.endDate,
          status: calculatedStatus,
          allowedUsers: formData.allowedUsers,
          eventType: formData.eventType,
          cashbackBoostPercent,
          discountPercent,
          startBid,
          minBidIncrement,
          targetUserIds: [],
        });
        
        if (newEvent) {
          // Отправляем уведомление
          await notifyEventCreated(formData.title, formData.eventType);
          
          // Показываем уведомление на экране
          showNotification(`Событие "${formData.title}" создано`, 'success');
          
          // Очищаем форму и закрываем модальное окно
          setFormData({
            title: '',
            description: '',
            prize: '',
            startDate: '',
            endDate: '',
            status: 'active',
            allowedUsers: 'all',
            eventType: 'auction',
            cashbackBoostPercent: '',
            discountPercent: '',
            startBid: '',
            minBidIncrement: '',
          });

          closeEventModal();

          // Показываем Alert
          Alert.alert('✅ Успех', 'Событие создано!');
        } else {
          Alert.alert('⚠️ Внимание', 'Событие с таким названием уже существует');
        }
      }
    } catch (error) {
      console.error('AdminEvents: ошибка при сохранении события:', error);
      Alert.alert('❌ Ошибка', `Не удалось сохранить событие: ${error.message}`);
    }
  };

  const handleDeleteEvent = (id) => {
    setEventToDelete(id);
    setDeleteModalVisible(true);
  };

  const handleToggleStatus = async (event) => {
    const nextStatus = event.status === 'completed' ? 'active' : 'completed';
    try {
      await updateEvent(event.id, { ...event, status: nextStatus });
      showNotification(`"${event.title}" → ${nextStatus === 'active' ? 'Активно' : 'Завершено'}`, 'success');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleDuplicateEvent = async (event) => {
    try {
      const copy = {
        title: `${event.title} (копия)`,
        description: event.description,
        prize: event.prize,
        startDate: event.startDate,
        endDate: event.endDate,
        status: 'upcoming',
        allowedUsers: event.allowedUsers,
        eventType: event.eventType,
        color: event.color,
        participants: 0,
        participantIds: [],
        cashbackBoostPercent: event.cashbackBoostPercent || 0,
        discountPercent: event.discountPercent || 0,
        targetUserIds: Array.isArray(event.targetUserIds) ? event.targetUserIds : [],
      };
      await addEvent(copy);
      showNotification(`Событие "${event.title}" продублировано`, 'success');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось дублировать событие');
    }
  };

  const handleDateSelect = (date) => {
    setFormData({ ...formData, endDate: date });
  };

  const handleStartDateSelect = (date) => {
    setFormData({ ...formData, startDate: date });
  };

  const handleEndDateSelect = (date) => {
    setFormData({ ...formData, endDate: date });
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      try {
        // Получаем название события перед удалением
        const eventToDeleteData = events.find(e => e.id === eventToDelete);
        const eventName = eventToDeleteData?.title || 'Событие';
        
        // Закрываем модальное окно ПЕРЕД удалением
        setDeleteModalVisible(false);
        
        // Затем удаляем событие
        await deleteEvent(eventToDelete);
        setEventToDelete(null);
        
        // Отправляем уведомление
        await notifyEventDeleted(eventName);
        
        // Показываем уведомление на экране
        showNotification(`Событие "${eventName}" удалено`, 'success');
        
        // Показываем Alert после закрытия модального окна
        setTimeout(() => {
          Alert.alert('✅ Успешно', 'Событие удалено и синхронизировано с клиентами.');
        }, 500);
      } catch (error) {
        console.error('❌ AdminEvents: Ошибка при удалении события:', error);
        console.error('Stack:', error.stack);
        setEventToDelete(null);
        
        setTimeout(() => {
          Alert.alert('❌ Ошибка', `Не удалось удалить событие: ${error.message || 'Неизвестная ошибка'}`);
        }, 500);
      }
    }
  };

  const getAllowedUsersLabel = (value) => {
    const found = userTypes.find((t) => t.value === value);
    return found ? found.label : (value || 'Все пользователи');
  };

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
        {(() => {
          const isActive = (s) => {
            const v = (s || '').toLowerCase();
            return v === 'active' || v === 'активный' || v === 'активно';
          };
          const isUpcoming = (s) => {
            const v = (s || '').toLowerCase();
            return v === 'upcoming' || v === 'скоро';
          };
          const isEnded = (s) => {
            const v = (s || '').toLowerCase();
            return v === 'ended' || v === 'completed' || v === 'завершён' || v === 'завершен' || v === 'завершено';
          };
          const activeCount   = events.filter(e => isActive(e.status)).length;
          const upcomingCount = events.filter(e => isUpcoming(e.status)).length;
          const endedCount    = events.filter(e => isEnded(e.status)).length;
          const participantsTotal = events.reduce(
            (sum, e) => sum + (e.participants || e.participantsCount || 0),
            0
          );

          return (
            <ScaleInCard delay={100}>
              <View style={[
                styles.headerCard,
                { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border },
              ]}>
                {/* Title row */}
                <View style={styles.headerTopRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.headerTitle, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      Управление событиями
                    </Text>
                    <Text
                      style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      Всего: {events.length} {(() => {
                        const n = events.length % 100;
                        const n1 = events.length % 10;
                        if (n > 10 && n < 20) return 'событий';
                        if (n1 > 1 && n1 < 5) return 'события';
                        if (n1 === 1) return 'событие';
                        return 'событий';
                      })()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => handleOpenModal()}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Создать</Text>
                  </TouchableOpacity>
                </View>

                {/* Stats strip */}
                <View style={[styles.statsStrip, { borderTopColor: theme.colors.border }]}>
                  <View style={styles.statsCell}>
                    <View style={styles.statsValueRow}>
                      <View style={[styles.statsDot, { backgroundColor: theme.colors.success }]} />
                      <Text style={[styles.statsValue, { color: theme.colors.text }]}>
                        {activeCount}
                      </Text>
                    </View>
                    <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
                      Активные
                    </Text>
                  </View>

                  <View style={[styles.statsDivider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.statsCell}>
                    <View style={styles.statsValueRow}>
                      <View style={[styles.statsDot, { backgroundColor: theme.colors.accent }]} />
                      <Text style={[styles.statsValue, { color: theme.colors.text }]}>
                        {upcomingCount}
                      </Text>
                    </View>
                    <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
                      Скоро
                    </Text>
                  </View>

                  <View style={[styles.statsDivider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.statsCell}>
                    <View style={styles.statsValueRow}>
                      <View style={[styles.statsDot, { backgroundColor: theme.colors.textSecondary }]} />
                      <Text style={[styles.statsValue, { color: theme.colors.text }]}>
                        {endedCount}
                      </Text>
                    </View>
                    <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
                      Завершено
                    </Text>
                  </View>

                  <View style={[styles.statsDivider, { backgroundColor: theme.colors.border }]} />

                  <View style={styles.statsCell}>
                    <View style={styles.statsValueRow}>
                      <MaterialIcons name="group" size={13} color={theme.colors.primary} />
                      <Text style={[styles.statsValue, { color: theme.colors.text }]}>
                        {participantsTotal}
                      </Text>
                    </View>
                    <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
                      Участников
                    </Text>
                  </View>
                </View>
              </View>
            </ScaleInCard>
          );
        })()}

        {/* События */}
        {events.length > 0 ? (
          <View 
            style={[
              styles.eventsList,
              {
                backgroundColor: theme.colors.background,
              }
            ]}
          >
            {events.map((event, index) => {
              // Новые локальные события (local_*) показываются без задержки, старые с задержкой
              const isNewEvent = typeof event.id === 'string' && event.id.startsWith('local_');
              const delay = isNewEvent ? 0 : (200 + index * 50);
              const eventColor = event.color || theme.colors.primary;
              const statusColor = getStatusColor(event.status);
              const typeInfo = event.eventType
                ? eventTypes.find(t => t.value === event.eventType)
                : null;
              const typeLabel = typeInfo?.label || event.eventType;
              const typeIcon = typeInfo?.icon || 'event';
              const isDone = event.status === 'completed';

              return (
                <FadeInCard key={event.id} delay={delay}>
                  <TouchableOpacity
                    style={[
                      styles.eventCard,
                      {
                        backgroundColor: theme.colors.cardBg,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => handleOpenModal(event)}
                  >
                    {/* Top row: type icon + title block + actions */}
                    <View style={styles.eventTop}>
                      <View style={[
                        styles.typeIconCircle,
                        { backgroundColor: `${eventColor}1F`, borderColor: `${eventColor}40` },
                      ]}>
                        <MaterialIcons name={typeIcon} size={18} color={eventColor} />
                      </View>

                      <View style={styles.titleBlock}>
                        <Text
                          style={[styles.eventTitle, { color: theme.colors.text }]}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <View style={styles.titleSubRow}>
                          {!!typeLabel && (
                            <Text style={[styles.typeLabel, { color: eventColor }]} numberOfLines={1}>
                              {typeLabel}
                            </Text>
                          )}
                          {!!typeLabel && (
                            <Text style={[styles.dotSep, { color: theme.colors.textSecondary }]}>·</Text>
                          )}
                          <View style={styles.statusInline}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusInlineText, { color: theme.colors.textSecondary }]}>
                              {getStatusLabel(event.status)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.eventActions}>
                        <TouchableOpacity
                          onPress={() => handleToggleStatus(event)}
                          hitSlop={6}
                          style={styles.iconAction}
                        >
                          <MaterialIcons
                            name={isDone ? 'replay' : 'check'}
                            size={16}
                            color={isDone ? theme.colors.primary : theme.colors.success}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDuplicateEvent(event)}
                          hitSlop={6}
                          style={styles.iconAction}
                        >
                          <MaterialIcons name="content-copy" size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(event.id)}
                          hitSlop={6}
                          style={styles.iconAction}
                        >
                          <MaterialIcons name="delete-outline" size={18} color={'#EF4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Description */}
                    {!!event.description && (
                      <Text
                        style={[styles.eventDescription, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {event.description}
                      </Text>
                    )}

                    {/* Prize hero */}
                    {!!event.prize && (
                      <View style={[
                        styles.prizeBanner,
                        {
                          backgroundColor: `${theme.colors.success}14`,
                          borderColor: `${theme.colors.success}33`,
                        },
                      ]}>
                        <View style={styles.prizeLeft}>
                          <MaterialIcons name="emoji-events" size={16} color={theme.colors.success} />
                          <Text style={[styles.prizeLabel, { color: theme.colors.textSecondary }]}>Приз</Text>
                        </View>
                        <Text
                          style={[styles.prizeValue, { color: theme.colors.success }]}
                          numberOfLines={1}
                        >
                          {event.prize}
                        </Text>
                      </View>
                    )}

                    {/* Meta footer */}
                    <View style={[styles.metaFooter, { borderTopColor: theme.colors.border }]}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="group" size={13} color={theme.colors.textSecondary} />
                        <Text style={[styles.metaText, { color: theme.colors.text }]}>
                          {event.participants || event.participantsCount || 0}
                        </Text>
                      </View>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.border }]} />
                      <View style={[styles.metaItem, { flex: 1, minWidth: 0 }]}>
                        <MaterialIcons name="calendar-today" size={13} color={theme.colors.textSecondary} />
                        <Text
                          style={[styles.metaText, { color: theme.colors.text, flexShrink: 1 }]}
                          numberOfLines={1}
                        >
                          {event.startDate && event.endDate
                            ? `${event.startDate} – ${event.endDate}`
                            : (event.startDate || event.endDate || '—')}
                        </Text>
                      </View>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.border }]} />
                      <View style={[styles.metaItem, { flexShrink: 1 }]}>
                        <MaterialIcons name="shield" size={13} color={theme.colors.textSecondary} />
                        <Text
                          style={[styles.metaText, { color: theme.colors.text }]}
                          numberOfLines={1}
                        >
                          {getAllowedUsersLabel(event.allowedUsers)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </FadeInCard>
              );
            })}
          </View>
        ) : (
          <View 
            style={[
              styles.emptyState,
              {
                backgroundColor: theme.colors.background,
              }
            ]}
          >
            <MaterialIcons name="event-note" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>Нет событий</Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
              Создайте первое событие, нажав кнопку выше
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      {/* Modal для создания/редактирования события — bottom-sheet в стиле NotificationBell */}
      <Modal
        visible={sheetMounted}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closeEventModal}
      >
        <View style={styles.modalContainer}>
          {/* Tap по backdrop закрывает sheet */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeEventModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.cardBg,
                height: SHEET_H,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* Drag handle — реагирует на свайп вниз */}
            <View style={styles.dragHandleWrap} {...sheetPanResponder.panHandlers}>
              <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Modal Header — заголовок по центру, close-кнопка справа */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderSpacer} />
              <View style={styles.modalHeaderCenter} pointerEvents="none">
                <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                  {editingEvent ? 'Редактировать событие' : 'Новое событие'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {editingEvent ? 'Изменение параметров события' : 'Заполните параметры для запуска'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeEventModal}
                hitSlop={8}
                style={[styles.modalCloseBtn, { backgroundColor: theme.colors.background }]}
              >
                <MaterialIcons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* === Секция: Основное === */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Основное</Text>
              <View style={[styles.groupCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                {/* Название */}
                <View style={styles.groupRow}>
                  <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Название</Text>
                  <TextInput
                    style={[styles.rowInput, { color: theme.colors.text }]}
                    placeholder="Например: Двойной кешбек"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                  />
                </View>

                <View style={[styles.hairline, { backgroundColor: theme.colors.border }]} />

                {/* Описание */}
                <View style={[styles.groupRow, { paddingBottom: 10 }]}>
                  <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>Описание</Text>
                  <TextInput
                    style={[styles.rowInputMultiline, { color: theme.colors.text }]}
                    placeholder="Краткое описание..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    textAlignVertical="top"
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                  />
                </View>

                <View style={[styles.hairline, { backgroundColor: theme.colors.border }]} />

                {/* Приз */}
                <View style={[styles.groupRow, styles.prizeRow]}>
                  <View style={styles.prizeLeftBlock}>
                    <View style={[styles.prizeIconWrap, { backgroundColor: `${theme.colors.success}22` }]}>
                      <MaterialIcons name="emoji-events" size={16} color={theme.colors.success} />
                    </View>
                    <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Приз</Text>
                  </View>
                  <TextInput
                    style={[styles.prizeInput, { color: theme.colors.success }]}
                    placeholder="50 000 PRB"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.prize}
                    onChangeText={(text) => setFormData({ ...formData, prize: text })}
                  />
                </View>
              </View>

              {/* === Секция: Промо-эффект (только для типов, где это имеет смысл) === */}
              {(promoCfg.boost || promoCfg.discount) && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 18 }]}>Промо-эффект</Text>
                  <View style={[styles.groupCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    {promoCfg.boost && (
                      <View style={[styles.groupRow, styles.prizeRow]}>
                        <View style={styles.prizeLeftBlock}>
                          <View style={[styles.prizeIconWrap, { backgroundColor: `${theme.colors.primary}22` }]}>
                            <MaterialIcons name="trending-up" size={16} color={theme.colors.primary} />
                          </View>
                          <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Кэшбек +, п.п.</Text>
                        </View>
                        <TextInput
                          style={[styles.prizeInput, { color: theme.colors.primary }]}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="decimal-pad"
                          value={String(formData.cashbackBoostPercent ?? '')}
                          onChangeText={(text) => setFormData({ ...formData, cashbackBoostPercent: text })}
                        />
                      </View>
                    )}

                    {promoCfg.boost && promoCfg.discount && (
                      <View style={[styles.hairline, { backgroundColor: theme.colors.border }]} />
                    )}

                    {promoCfg.discount && (
                      <View style={[styles.groupRow, styles.prizeRow]}>
                        <View style={styles.prizeLeftBlock}>
                          <View style={[styles.prizeIconWrap, { backgroundColor: `${theme.colors.accent}22` }]}>
                            <MaterialIcons name="local-offer" size={16} color={theme.colors.accent} />
                          </View>
                          <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Скидка, %</Text>
                        </View>
                        <TextInput
                          style={[styles.prizeInput, { color: theme.colors.accent }]}
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSecondary}
                          keyboardType="decimal-pad"
                          value={String(formData.discountPercent ?? '')}
                          onChangeText={(text) => setFormData({ ...formData, discountPercent: text })}
                        />
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* === Секция: Параметры аукциона (только для type='auction') === */}
              {formData.eventType === 'auction' && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 18 }]}>Параметры аукциона</Text>
                  <View style={[styles.groupCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    <View style={[styles.groupRow, styles.prizeRow]}>
                      <View style={styles.prizeLeftBlock}>
                        <View style={[styles.prizeIconWrap, { backgroundColor: `${theme.colors.primary}22` }]}>
                          <MaterialIcons name="gavel" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Стартовая ставка, PRB</Text>
                      </View>
                      <TextInput
                        style={[styles.prizeInput, { color: theme.colors.primary }]}
                        placeholder="0"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={String(formData.startBid ?? '')}
                        onChangeText={(text) => setFormData({ ...formData, startBid: text })}
                      />
                    </View>

                    <View style={[styles.hairline, { backgroundColor: theme.colors.border }]} />

                    <View style={[styles.groupRow, styles.prizeRow]}>
                      <View style={styles.prizeLeftBlock}>
                        <View style={[styles.prizeIconWrap, { backgroundColor: `${theme.colors.accent}22` }]}>
                          <MaterialIcons name="trending-up" size={16} color={theme.colors.accent} />
                        </View>
                        <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Шаг ставки, PRB</Text>
                      </View>
                      <TextInput
                        style={[styles.prizeInput, { color: theme.colors.accent }]}
                        placeholder="100"
                        placeholderTextColor={theme.colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={String(formData.minBidIncrement ?? '')}
                        onChangeText={(text) => setFormData({ ...formData, minBidIncrement: text })}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* === Секция: Сроки === */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 18 }]}>Сроки</Text>
              <View style={[styles.groupCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.groupRowInline}
                  activeOpacity={0.7}
                  onPress={() => setStartDatePickerVisible(true)}
                >
                  <View style={styles.dateRowLeft}>
                    <View style={[styles.dateIconWrap, { backgroundColor: `${theme.colors.primary}22` }]}>
                      <MaterialIcons name="calendar-today" size={14} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Начало</Text>
                  </View>
                  <View style={styles.dateRowRight}>
                    <Text style={[
                      styles.dateRowValue,
                      { color: formData.startDate ? theme.colors.text : theme.colors.textSecondary },
                    ]}>
                      {formData.startDate || 'выбрать'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <View style={[styles.hairline, { backgroundColor: theme.colors.border }]} />

                <TouchableOpacity
                  style={styles.groupRowInline}
                  activeOpacity={0.7}
                  onPress={() => setEndDatePickerVisible(true)}
                >
                  <View style={styles.dateRowLeft}>
                    <View style={[styles.dateIconWrap, { backgroundColor: `${theme.colors.accent}22` }]}>
                      <MaterialIcons name="event" size={14} color={theme.colors.accent} />
                    </View>
                    <Text style={[styles.rowLabelInline, { color: theme.colors.text }]}>Окончание</Text>
                  </View>
                  <View style={styles.dateRowRight}>
                    <Text style={[
                      styles.dateRowValue,
                      { color: formData.endDate ? theme.colors.text : theme.colors.textSecondary },
                    ]}>
                      {formData.endDate || 'выбрать'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* === Секция: Тип === */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 18 }]}>Тип события</Text>
              <View style={styles.tileGrid3}>
                {eventTypes.map((type) => {
                  const active = formData.eventType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.tile,
                        {
                          backgroundColor: active ? `${type.color}1F` : theme.colors.background,
                          borderColor: active ? type.color : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        const nextCfg = promoFieldsByType[type.value] || { boost: true, discount: true };
                        const willBeAuction = type.value === 'auction';
                        setFormData({
                          ...formData,
                          eventType: type.value,
                          cashbackBoostPercent: nextCfg.boost ? formData.cashbackBoostPercent : '',
                          discountPercent: nextCfg.discount ? formData.discountPercent : '',
                          startBid:        willBeAuction ? formData.startBid : '',
                          minBidIncrement: willBeAuction ? formData.minBidIncrement : '',
                        });
                      }}
                    >
                      <MaterialIcons
                        name={type.icon}
                        size={16}
                        color={active ? type.color : theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.tileText,
                          { color: active ? type.color : theme.colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* === Секция: Доступ === */}
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 18 }]}>Доступ</Text>
              {(() => {
                const allOption = userTypes.find(t => t.value === 'all');
                const levelOptions = userTypes.filter(t => t.value !== 'all');
                const allActive = formData.allowedUsers === 'all';

                return (
                  <>
                    {allOption && (
                      <TouchableOpacity
                        style={[
                          styles.wideTile,
                          {
                            backgroundColor: allActive ? `${allOption.color}1F` : theme.colors.background,
                            borderColor: allActive ? allOption.color : theme.colors.border,
                          },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => setFormData({ ...formData, allowedUsers: 'all' })}
                      >
                        <View style={styles.wideTileLeft}>
                          <View style={[styles.wideTileIcon, { backgroundColor: `${allOption.color}22` }]}>
                            <MaterialIcons name={allOption.icon} size={16} color={allOption.color} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.wideTileTitle, { color: allActive ? allOption.color : theme.colors.text }]}>
                              Все пользователи
                            </Text>
                            <Text style={[styles.wideTileHint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                              Событие видно всем уровням
                            </Text>
                          </View>
                        </View>
                        <MaterialIcons
                          name={allActive ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={20}
                          color={allActive ? allOption.color : theme.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}

                    <View style={styles.tileGrid2}>
                      {levelOptions.map((type) => {
                        const active = formData.allowedUsers === type.value;
                        return (
                          <TouchableOpacity
                            key={type.value}
                            style={[
                              styles.tile,
                              styles.tileHalf,
                              {
                                backgroundColor: active ? `${type.color}1F` : theme.colors.background,
                                borderColor: active ? type.color : theme.colors.border,
                              },
                            ]}
                            activeOpacity={0.85}
                            onPress={() => setFormData({ ...formData, allowedUsers: type.value })}
                          >
                            <MaterialIcons
                              name={type.icon}
                              size={16}
                              color={active ? type.color : theme.colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.tileText,
                                { color: active ? type.color : theme.colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {type.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                );
              })()}
            </ScrollView>

            {/* Sticky footer */}
            <View style={[styles.modalFooter, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.cardBg }]}>
              <TouchableOpacity
                style={[styles.footerSecondary, { borderColor: theme.colors.border }]}
                onPress={closeEventModal}
                activeOpacity={0.85}
              >
                <Text style={[styles.footerSecondaryText, { color: theme.colors.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerPrimary, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveEvent}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.footerPrimaryText}>
                  {editingEvent ? 'Сохранить' : 'Создать'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.deleteModalContainer}>
          <View style={[styles.deleteModalContent, { backgroundColor: theme.colors.cardBg }]}>
            <MaterialIcons name="warning" size={48} color={theme.colors.accent} />
            <Text style={[styles.deleteModalTitle, { color: theme.colors.text }]}>Удалить событие?</Text>
            <Text style={[styles.deleteModalText, { color: theme.colors.textSecondary }]}>Это действие нельзя отменить.</Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancel, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setEventToDelete(null);
                }}
              >
                <Text style={[styles.deleteModalCancelText, { color: theme.colors.text }]}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalConfirm]}
                onPress={confirmDelete}
              >
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.deleteModalConfirmText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Date Picker для даты начала */}
      <EventDatePicker
        selectedDate={formData.startDate}
        onDateSelect={handleStartDateSelect}
        visible={startDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
      />

      {/* Event Date Picker для даты окончания */}
      <EventDatePicker
        selectedDate={formData.endDate}
        onDateSelect={handleEndDateSelect}
        visible={endDatePickerVisible}
        onClose={() => setEndDatePickerVisible(false)}
      />

      {/* Event Date Picker (старый, для совместимости) */}
      <EventDatePicker
        selectedDate={formData.endDate}
        onDateSelect={handleDateSelect}
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
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
    paddingHorizontal: spacing.md,
    paddingBottom: 130,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 0,
    marginBottom: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
  },
  statsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  statsDivider: {
    width: 1,
    height: 24,
    opacity: 0.6,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardBg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statBoxLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  eventsList: {
    paddingBottom: spacing.lg,
  },
  eventCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 0,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  typeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  titleSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  dotSep: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.6,
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusInlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  iconAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  prizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  prizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prizeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  prizeValue: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  metaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  metaDivider: {
    width: 1,
    height: 12,
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
    marginTop: spacing.xs,
    textAlign: 'center',
  },
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
  // Распорка слева той же ширины, что закрывающая кнопка справа —
  // заголовок встаёт ровно по центру при flex-row раскладке.
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
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  groupRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  groupRowInline: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14,
    opacity: 0.8,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rowLabelInline: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowInput: {
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  rowInputMultiline: {
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
    minHeight: 48,
    lineHeight: 18,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  prizeLeftBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prizeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '800',
    padding: 0,
  },
  dateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateRowValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tileGrid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    minWidth: 0,
  },
  tileHalf: {
    flexBasis: '47%',
  },
  tileText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  wideTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  wideTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  wideTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideTileTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  wideTileHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
  },
  footerSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerPrimary: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  optionsContainer: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  userAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  gridOptionButton: {
    width: '48%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  eventTypeButton: {
    width: '31%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  userAccessButton: {
    width: '48%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  gridOptionButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  typeIcon: {
    marginRight: 4,
  },
  statusInfoBox: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  statusInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  deleteModalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  deleteModalCancel: {
    backgroundColor: colors.border,
  },
  deleteModalCancelText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    backgroundColor: colors.accent,
  },
  deleteModalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  notificationContainer: {
    position: 'absolute',
    top: 40,
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
});
