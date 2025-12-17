import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { EventCardAdmin } from '../components/Cards';
import { FadeInCard, ScaleInCard } from '../components/AnimatedCard';
import { useEvents } from '../context/EventContext';

const initialMockEvents = [
  {
    id: '1',
    title: 'Аукцион: Картина',
    description: 'Редкая картина от известного художника',
    startBid: 1000,
    status: 'active',
    prize: '50 000 ₽',
    endDate: '20.12.2025',
    participantsCount: 23,
    allowedUsers: 'all',
  },
  {
    id: '2',
    title: 'Двойной кешбек',
    description: '2x кешбека на все покупки',
    status: 'active',
    endDate: '15.12.2025',
    participantsCount: 1243,
    allowedUsers: 'platinum',
  },
  {
    id: '3',
    title: 'Розыгрыш подарков',
    description: 'Автоматическое участие для активных пользователей',
    prize: 'Путешествие в Европу',
    status: 'ended',
    endDate: '10.12.2025',
    participantsCount: 567,
    allowedUsers: 'gold',
  },
];

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
  });

  const userTypes = [
    { value: 'all', label: 'Все пользователи' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
  ];

  const statuses = [
    { value: 'upcoming', label: 'Скоро' },
    { value: 'active', label: 'Активно' },
    { value: 'ended', label: 'Завершено' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'upcoming':
        return colors.accent;
      case 'ended':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  const getStatusLabel = (status) => {
    const label = statuses.find((s) => s.value === status);
    return label ? label.label : status;
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        prize: event.prize || '',
        endDate: event.endDate || '',
        allowedUsers: event.allowedUsers || 'all',
        status: event.status || 'active',
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
      });
    }
    setModalVisible(true);
  };

  const handleSaveEvent = () => {
    if (!formData.title.trim()) {
      Alert.alert('❌ Ошибка', 'Введите название события');
      return;
    }

    if (editingEvent) {
      // Редактирование существующего события
      updateEvent(editingEvent.id, {
        title: formData.title,
        description: formData.description,
        prize: formData.prize,
        endDate: formData.endDate,
        status: formData.status,
        allowedUsers: formData.allowedUsers,
      });
      setModalVisible(false);
      setEditingEvent(null);
      Alert.alert('✅ Успех', 'Событие обновлено!');
    } else {
      // Создание нового события
      addEvent({
        title: formData.title,
        description: formData.description,
        prize: formData.prize,
        endDate: formData.endDate,
        status: formData.status,
        allowedUsers: formData.allowedUsers,
      });
      setModalVisible(false);
      Alert.alert('✅ Успех', 'Событие создано!');
    }
  };

  const handleDeleteEvent = (id) => {
    setEventToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete);
      setDeleteModalVisible(false);
      setEventToDelete(null);
      Alert.alert('✅ Удалено', 'Событие удалено успешно.');
    }
  };

  const getAllowedUsersLabel = (value) => {
    const found = userTypes.find((t) => t.value === value);
    return found ? found.label : value;
  };

  const renderEvent = ({ item, index }) => {
    return (
    <FadeInCard delay={200 + index * 50}>
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => handleOpenModal(item)}
      >
        {/* Top Bar with Status and Actions */}
        <View style={styles.eventHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <MaterialIcons 
              name={
                item.status === 'active' ? 'check-circle' : 
                item.status === 'upcoming' ? 'schedule' : 'done'
              } 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
          <View style={styles.eventActions}>
            <TouchableOpacity onPress={() => handleOpenModal(item)}>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteEvent(item.id)}>
              <MaterialIcons name="delete" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Title and Description */}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
        </View>

        {/* Event Stats */}
        <View style={styles.eventStats}>
          <View style={styles.statBlock}>
            <MaterialIcons name="group" size={16} color={colors.primary} />
            <View>
              <Text style={styles.statLabel}>Участники</Text>
              <Text style={styles.statValue}>{item.participantsCount}</Text>
            </View>
          </View>

          <View style={styles.statBlock}>
            <MaterialIcons name="calendar-today" size={16} color={colors.accent} />
            <View>
              <Text style={styles.statLabel}>Завершение</Text>
              <Text style={styles.statValue}>{item.endDate}</Text>
            </View>
          </View>

          <View style={styles.statBlock}>
            <MaterialIcons name="shield" size={16} color={colors.secondary} />
            <View>
              <Text style={styles.statLabel}>Доступ</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {getAllowedUsersLabel(item.allowedUsers)}
              </Text>
            </View>
          </View>
        </View>

        {/* Prize */}
        {item.prize && (
          <View style={styles.prizeSection}>
            <MaterialIcons name="card-giftcard" size={18} color={colors.success} />
            <Text style={styles.prizeText}>{item.prize}</Text>
          </View>
        )}
      </TouchableOpacity>
    </FadeInCard>
  );
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
                {events.filter((e) => e.status === 'active').length}
              </Text>
              <Text style={styles.statLabel}>Активные</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {events.reduce((sum, e) => sum + e.participantsCount, 0)}
              </Text>
              <Text style={styles.statLabel}>Участников</Text>
            </View>
          </View>
        </ScaleInCard>

        {/* События */}
        {events.length > 0 ? (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            scrollEnabled={false}
            contentContainerStyle={styles.eventsList}
            extraData={events}
          />
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
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    gap: spacing.md,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
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
