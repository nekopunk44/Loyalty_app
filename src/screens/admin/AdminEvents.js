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
  Dimensions,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { lightTheme, darkTheme } from '../../context/ThemeContext';
import { EventCardAdmin } from '../../components/ui/Cards';
import { FadeInCard, ScaleInCard } from '../../components/ui/AnimatedCard';
import { EventDatePicker } from '../../components/ui/EventDatePicker';
import { useEvents } from '../../context/EventContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { getEventStyleByType, getAllEventTypes, calculateEventStatus } from '../../utils/eventStyles';


export default function AdminEvents() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { theme, isDark } = useTheme();
  const { notifyEventCreated, notifyEventUpdated, notifyEventDeleted } = useNotification();
  
  // Анимация цветов при смене темы
  const bgColorAnim = useRef(new Animated.Value(0)).current;
  const cardColorAnim = useRef(new Animated.Value(0)).current;
  
  const [modalVisible, setModalVisible] = useState(false);
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
    eventType: 'auction', // Новое поле для типа события
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
      const eventTypeInfo = eventTypes.find(t => t.value === eventType);
      
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
      });
    }
    setModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      Alert.alert('❌ Ошибка', 'Введите название события');
      return;
    }

    try {
      // Вычисляем статус автоматически на основе дат
      const calculatedStatus = calculateEventStatus(formData.startDate, formData.endDate);

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
        });
        setEditingEvent(null);
        setModalVisible(false);
        
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
          });
          
          setModalVisible(false);
          
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
        {/* Header */}
        <ScaleInCard delay={100}>
          <View 
            style={[
              styles.header,
              {
                backgroundColor: theme.colors.cardBg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: 12,
                marginBottom: 0,
              }
            ]}
          >
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Управление событиями</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Всего событий: {events.length}</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => handleOpenModal()}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScaleInCard>

        {/* Статистика */}
        <ScaleInCard delay={150}>
          <View 
            style={[
              styles.statsContainer,
              {
                backgroundColor: theme.colors.background,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                borderRadius: borderRadius.lg,
                marginBottom: 0,
              }
            ]}
          >
            <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="check-circle" size={32} color={theme.colors.primary} />
                <Text style={[styles.statNumber, { color: theme.colors.primary, marginTop: spacing.sm }]}>
                  {events.filter((e) => e.status === 'Активный' || e.status === 'active').length}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Активные</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.colors.background }]}>
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="group" size={32} color={theme.colors.accent} />
                <Text style={[styles.statNumber, { color: theme.colors.accent, marginTop: spacing.sm }]}>
                  {events.reduce((sum, e) => sum + (e.participants || e.participantsCount || 0), 0)}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Участников</Text>
            </View>
          </View>
        </ScaleInCard>

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
              return (
                <FadeInCard key={event.id} delay={delay}>
                  <TouchableOpacity 
                    style={[styles.eventCard, { borderLeftColor: event.color || theme.colors.primary, borderLeftWidth: 5, backgroundColor: theme.colors.cardBg }]}
                    onPress={() => handleOpenModal(event)}
                  >
                    {/* Top Bar with Status and Actions */}
                    <View style={styles.eventHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                        <MaterialIcons 
                          name={
                            event.status === 'active' || event.status === 'Активный' ? 'check-circle' : 
                            event.status === 'upcoming' || event.status === 'Скоро' ? 'schedule' : 'done'
                          } 
                          size={14} 
                          color="#fff" 
                        />
                        <Text style={styles.statusText}>{getStatusLabel(event.status)}</Text>
                      </View>
                      
                      {/* Type badge */}
                      {event.eventType && (
                        <View style={[styles.typeBadge, { backgroundColor: event.color || theme.colors.primary }]}>
                          <Text style={styles.typeText}>
                            {eventTypes.find(t => t.value === event.eventType)?.label || event.eventType}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.eventActions}>
                        <TouchableOpacity onPress={() => handleOpenModal(event)}>
                          <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                          <MaterialIcons name="delete" size={20} color={theme.colors.accent} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Event Title and Description */}
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventTitle, { color: theme.colors.text }]}>{event.title}</Text>
                      <Text style={[styles.eventDescription, { color: theme.colors.textSecondary }]} numberOfLines={2}>{event.description}</Text>
                    </View>

                    {/* Event Stats */}
                    <View style={styles.eventStats}>
                      <View style={[styles.statBlock, { backgroundColor: theme.colors.background }]}>
                        <MaterialIcons name="group" size={16} color={theme.colors.primary} />
                        <View>
                          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Участники</Text>
                          <Text style={[styles.statValue, { color: theme.colors.text }]}>{event.participants || event.participantsCount || 0}</Text>
                        </View>
                      </View>

                      <View style={[styles.statBlock, { backgroundColor: theme.colors.background }]}>
                        <MaterialIcons name="calendar-today" size={16} color={theme.colors.accent} />
                        <View style={{flex: 1}}>
                          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Период</Text>
                          <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                            {event.startDate && event.endDate ? `${event.startDate} - ${event.endDate}` : (event.startDate || event.endDate || '-')}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.statBlock, { backgroundColor: theme.colors.background }]}>
                        <MaterialIcons name="shield" size={16} color={theme.colors.secondary} />
                        <View style={{flex: 1}}>
                          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Доступ</Text>
                          <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                            {getAllowedUsersLabel(event.allowedUsers)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Prize */}
                    {event.prize && (
                      <View style={[styles.prizeSection, { borderTopColor: theme.colors.border }]}>
                        <MaterialIcons name="card-giftcard" size={18} color={theme.colors.success} />
                        <Text style={[styles.prizeText, { color: theme.colors.success }]}>{event.prize}</Text>
                      </View>
                    )}
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

      {/* Modal для создания/редактирования события */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBg }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingEvent ? 'Редактировать событие' : 'Новое событие'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Название события */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Название события</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Например: Двойной кешбек"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
              />

              {/* Описание */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Описание события</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Напишите подробное описание..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
              />

              {/* Приз */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Приз</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Например: 50 000 PRB"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.prize}
                onChangeText={(text) =>
                  setFormData({ ...formData, prize: text })
                }
              />

              {/* Дата начала события */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Дата начала события</Text>
              <TouchableOpacity 
                style={[styles.datePickerButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => setStartDatePickerVisible(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                <Text style={[
                  styles.datePickerButtonText,
                  !formData.startDate && { color: theme.colors.textSecondary },
                  { color: theme.colors.text }
                ]}>
                  {formData.startDate || 'ДД.МММ.ГГГГ'}
                </Text>
              </TouchableOpacity>

              {/* Дата окончания события */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Дата окончания события</Text>
              <TouchableOpacity 
                style={[styles.datePickerButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                onPress={() => setEndDatePickerVisible(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                <Text style={[
                  styles.datePickerButtonText,
                  !formData.endDate && { color: theme.colors.textSecondary },
                  { color: theme.colors.text }
                ]}>
                  {formData.endDate || 'ДД.МММ.ГГГГ'}
                </Text>
              </TouchableOpacity>

              {/* Тип события */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Тип события</Text>
              <View style={styles.eventTypesGrid}>
                {eventTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.eventTypeButton,
                      { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      formData.eventType === type.value && {
                        ...styles.optionButtonActive,
                        backgroundColor: type.color,
                        borderColor: type.color,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, eventType: type.value })
                    }
                  >
                    <MaterialIcons 
                      name={type.icon} 
                      size={18} 
                      color={formData.eventType === type.value ? '#fff' : type.color}
                    />
                    <Text
                      style={[
                        styles.gridOptionButtonText,
                        { color: theme.colors.text },
                        formData.eventType === type.value && {
                          ...styles.optionButtonTextActive,
                        },
                      ]}
                      numberOfLines={2}
                      textAlign="center"
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Доступно для */}
              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Доступно для</Text>
              <View style={styles.userAccessGrid}>
                {userTypes.map((type, index) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.userAccessButton,
                      { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                      index === userTypes.length - 1 && { marginLeft: 'auto', marginRight: 'auto' },
                      formData.allowedUsers === type.value && {
                        ...styles.optionButtonActive,
                        backgroundColor: type.color,
                        borderColor: type.color,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, allowedUsers: type.value })
                    }
                  >
                    <MaterialIcons 
                      name={type.icon} 
                      size={18} 
                      color={formData.allowedUsers === type.value ? '#fff' : type.color}
                    />
                    <Text
                      style={[
                        styles.gridOptionButtonText,
                        { color: theme.colors.text },
                        formData.allowedUsers === type.value && {
                          ...styles.optionButtonTextActive,
                        },
                      ]}
                      numberOfLines={2}
                      textAlign="center"
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Сохранить кнопку */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveEvent}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {editingEvent ? 'Обновить' : 'Создать'} событие
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowOpacity: 0.2,
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
  statLabel: {
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
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  typeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    flex: 1,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  eventActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eventContent: {
    marginBottom: spacing.md,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  eventDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  eventStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
    flex: 1,
  },
  prizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prizeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: '90%',
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
  modalBody: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  datePickerButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
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
