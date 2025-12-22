import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius, colors as themeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { FadeInCard, SlideInLeftCard, ScaleInCard } from '../components/AnimatedCard';
import { useEvents } from '../context/EventContext';
import { getEventStyleByType } from '../utils/eventStyles';

export default function EventsScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { events, isLoading } = useEvents(); // ← Получаем события из EventContext
  
  const [filter, setFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailModalVisible, setEventDetailModalVisible] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'Все', icon: 'list' },
    { id: 'active', label: 'Активные', icon: 'flash-on' },
    { id: 'upcoming', label: 'Скоро', icon: 'schedule' },
    { id: 'joined', label: 'Мои события', icon: 'bookmark' },
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
    console.log('🔍 EventsScreen: filteredEvents, всего событий:', events.length, 'фильтр:', filter);
    
    const filtered = events.filter(event => {
      if (filter === 'all') return true;
      if (filter === 'active') return event.status === 'Активный';
      if (filter === 'upcoming') return event.status === 'Скоро' || event.status === 'Завтра';
      if (filter === 'joined') return event.id === '1' || event.id === '3'; // Фиксированные события
      return true;
    });
    
    console.log('🔍 EventsScreen: отфильтровано событий:', filtered.length);
    return filtered;
  }, [filter, events]);

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setEventDetailModalVisible(true);
  };

  const handleJoinEvent = () => {
    Alert.alert('✅ Готово', 'Вы успешно присоединились к событию!');
    setEventDetailModalVisible(false);
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
    
    return (
    <SlideInLeftCard key={item.id} delay={100 + (index % 3) * 100}>
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
                <Text style={styles.metaText}>От {eventData.startBid} ₽</Text>
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
        </View>
      </TouchableOpacity>
    </SlideInLeftCard>
  );
  };

  const styles = StyleSheet.create({
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
    paddingTop: spacing.md,
    paddingBottom: 16,
    gap: spacing.sm,
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
  });

  return (
    <View style={styles.container}>
      {/* Заголовок - вне FlatList, чтобы не обновлялся */}
      <ScaleInCard delay={50} style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
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
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterContainer}
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
            </ScrollView>
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
                        Стартовая цена: {selectedEvent.startBid} ₽
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
                  <Text style={styles.joinButtonText}>Участвовать в событии</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

