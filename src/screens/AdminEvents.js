import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { EventCardAdmin } from '../components/Cards';
import { FadeInCard, ScaleInCard } from '../components/AnimatedCard';
import { useEvents } from '../context/EventContext';
import { getEventStyleByType, getAllEventTypes } from '../utils/eventStyles';

export default function AdminEvents() {
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prize: '',
    endDate: '',
    allowedUsers: 'all',
    status: 'active',
    eventType: 'auction', // Новое поле для типа события
  });

  // Логирование обновления событий
  useEffect(() => {
    console.log('📊 AdminEvents: события обновлены, всего:', events.length);
    console.log('📊 AdminEvents: события:', events.map(e => ({ id: e.id, title: e.title, status: e.status })));
  }, [events]);

  const userTypes = [
    { value: 'all', label: 'Все пользователи' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
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
    return label ? label.label : status;
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
      console.log('🟡 AdminEvents: начинаю сохранение события');
      
      if (editingEvent) {
        // Редактирование существующего события
        console.log('🟡 AdminEvents: редактирую существующее событие');
        await updateEvent(editingEvent.id, {
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          endDate: formData.endDate,
          status: formData.status,
          allowedUsers: formData.allowedUsers,
          eventType: formData.eventType,
        });
        console.log('🟢 AdminEvents: событие обновлено');
        
        // Очищаем форму и закрываем модальное окно
        setFormData({
          title: '',
          description: '',
          prize: '',
          endDate: '',
          status: 'active',
          allowedUsers: 'all',
          eventType: 'auction',
        });
        setEditingEvent(null);
        setModalVisible(false);
        
        Alert.alert('✅ Успех', 'Событие обновлено!');
      } else {
        // Создание нового события
        console.log('🟡 AdminEvents: создаю новое событие');
        const newEvent = await addEvent({
          title: formData.title,
          description: formData.description,
          prize: formData.prize,
          endDate: formData.endDate,
          status: formData.status,
          allowedUsers: formData.allowedUsers,
          eventType: formData.eventType,
        });
        
        if (newEvent) {
          console.log('🟢 AdminEvents: событие создано:', newEvent.id);
          
          // Очищаем форму и закрываем модальное окно
          setFormData({
            title: '',
            description: '',
            prize: '',
            endDate: '',
            status: 'active',
            allowedUsers: 'all',
            eventType: 'auction',
          });
          
          setModalVisible(false);
          
          // Показываем Alert
          Alert.alert('✅ Успех', 'Событие создано!');
        } else {
          console.warn('⚠️ AdminEvents: попытка создать дубликат события');
          Alert.alert('⚠️ Внимание', 'Событие с таким названием уже существует');
        }
      }
    } catch (error) {
      console.error('❌ AdminEvents: ошибка при сохранении события:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('❌ Ошибка', `Не удалось сохранить событие: ${error.message}`);
    }
  };

  const handleDeleteEvent = (id) => {
    setEventToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      try {
        console.log('🗑️ AdminEvents: подтверждаю удаление события:', eventToDelete);
        
        // Закрываем модальное окно ПЕРЕД удалением
        setDeleteModalVisible(false);
        
        // Затем удаляем событие
        await deleteEvent(eventToDelete);
        
        console.log('✅ AdminEvents: событие успешно удалено');
        setEventToDelete(null);
        
        // Показываем Alert после закрытия модального окна
        Alert.alert('Удалено', 'Событие удалено успешно.');
      } catch (error) {
        console.error('AdminEvents: Ошибка при удалении события:', error);
        setEventToDelete(null);
        Alert.alert('Ошибка', 'Не удалось удалить событие');
      }
    }
  };

  const getAllowedUsersLabel = (value) => {
    const found = userTypes.find((t) => t.value === value);
    return found ? found.label : value;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <ScaleInCard delay={100}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Управление событиями</Text>
              <Text style={styles.subtitle}>Всего событий: {events.length}</Text>
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
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {events.filter((e) => e.status === 'Активный' || e.status === 'active').length}
              </Text>
              <Text style={styles.statLabel}>Активные</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {events.reduce((sum, e) => sum + (e.participants || e.participantsCount || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Участников</Text>
            </View>
          </View>
        </ScaleInCard>

        {/* События */}
        {events.length > 0 ? (
          <View style={styles.eventsList}>
            {events.map((event, index) => {
              // Новые локальные события (local_*) показываются без задержки, старые с задержкой
              const isNewEvent = typeof event.id === 'string' && event.id.startsWith('local_');
              const delay = isNewEvent ? 0 : (200 + index * 50);
              return (
                <FadeInCard key={event.id} delay={delay}>
                  <TouchableOpacity 
                    style={[styles.eventCard, { borderLeftColor: event.color || colors.primary, borderLeftWidth: 5 }]}
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
                        <View style={[styles.typeBadge, { backgroundColor: event.color || colors.primary }]}>
                          <Text style={styles.typeText}>
                            {eventTypes.find(t => t.value === event.eventType)?.label || event.eventType}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.eventActions}>
                        <TouchableOpacity onPress={() => handleOpenModal(event)}>
                          <MaterialIcons name="edit" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                          <MaterialIcons name="delete" size={20} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Event Title and Description */}
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>
                    </View>

                    {/* Event Stats */}
                    <View style={styles.eventStats}>
                      <View style={styles.statBlock}>
                        <MaterialIcons name="group" size={16} color={colors.primary} />
                        <View>
                          <Text style={styles.statLabel}>Участники</Text>
                          <Text style={styles.statValue}>{event.participants || event.participantsCount || 0}</Text>
                        </View>
                      </View>

                      <View style={styles.statBlock}>
                        <MaterialIcons name="calendar-today" size={16} color={colors.accent} />
                        <View>
                          <Text style={styles.statLabel}>Завершение</Text>
                          <Text style={styles.statValue}>{event.endDate}</Text>
                        </View>
                      </View>

                      <View style={styles.statBlock}>
                        <MaterialIcons name="shield" size={16} color={colors.secondary} />
                        <View>
                          <Text style={styles.statLabel}>Доступ</Text>
                          <Text style={styles.statValue} numberOfLines={1}>
                            {getAllowedUsersLabel(event.allowedUsers)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Prize */}
                    {event.prize && (
                      <View style={styles.prizeSection}>
                        <MaterialIcons name="card-giftcard" size={18} color={colors.success} />
                        <Text style={styles.prizeText}>{event.prize}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </FadeInCard>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Нет событий</Text>
            <Text style={styles.emptyStateSubtext}>
              Создайте первое событие, нажав кнопку выше
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal для создания/редактирования события */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Редактировать событие' : 'Новое событие'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Название события */}
              <Text style={styles.inputLabel}>Название события *</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: Двойной кешбек"
                placeholderTextColor={colors.textSecondary}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
              />

              {/* Описание */}
              <Text style={styles.inputLabel}>Описание события</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Напишите подробное описание..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
              />

              {/* Приз */}
              <Text style={styles.inputLabel}>Приз/Награда</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: 50 000 ₽"
                placeholderTextColor={colors.textSecondary}
                value={formData.prize}
                onChangeText={(text) =>
                  setFormData({ ...formData, prize: text })
                }
              />

              {/* Дата окончания */}
              <Text style={styles.inputLabel}>Срок действия (дата)</Text>
              <TextInput
                style={styles.input}
                placeholder="ДД.МММ.ГГГГ (например: 20.12.2025)"
                placeholderTextColor={colors.textSecondary}
                value={formData.endDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, endDate: text })
                }
              />

              {/* Тип события */}
              <Text style={styles.inputLabel}>Тип события</Text>
              <View style={styles.optionsContainer}>
                {eventTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
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
                      size={16} 
                      color={formData.eventType === type.value ? '#fff' : type.color}
                      style={styles.typeIcon}
                    />
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.eventType === type.value && {
                          ...styles.optionButtonTextActive,
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Статус */}
              <Text style={styles.inputLabel}>Статус события</Text>
              <View style={styles.optionsContainer}>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.optionButton,
                      formData.status === status.value &&
                        styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, status: status.value })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.status === status.value &&
                          styles.optionButtonTextActive,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Доступно для */}
              <Text style={styles.inputLabel}>Доступно для</Text>
              <View style={styles.optionsContainer}>
                {userTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionButton,
                      formData.allowedUsers === type.value &&
                        styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, allowedUsers: type.value })
                    }
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        formData.allowedUsers === type.value &&
                          styles.optionButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Сохранить кнопку */}
              <TouchableOpacity
                style={styles.submitButton}
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
          <View style={styles.deleteModalContent}>
            <MaterialIcons name="warning" size={48} color={colors.accent} />
            <Text style={styles.deleteModalTitle}>Удалить событие?</Text>
            <Text style={styles.deleteModalText}>Это действие нельзя отменить.</Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.deleteModalCancel]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setEventToDelete(null);
                }}
              >
                <Text style={styles.deleteModalCancelText}>Отмена</Text>
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
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
    marginBottom: spacing.xs,
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
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  typeIcon: {
    marginRight: 4,
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
});
