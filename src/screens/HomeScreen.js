import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Modal, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FadeInCard,
  ScaleInCard,
  SlideInBottomCard,
  SlideInLeftCard,
  SlideInRightCard,
} from '../components/AnimatedCard';
import PropertyCarousel from '../components/PropertyCarousel';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiUrl();

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [addPhotoModalVisible, setAddPhotoModalVisible] = useState(false);
  const [bookingCount, setBookingCount] = useState(0);
  const { isAdmin } = useAuth();

  // Загружаем количество бронирований при загрузке компонента
  useEffect(() => {
    loadBookingCount();
  }, [user?.id]);

  // Обновляем бронирования при фокусе на экран
  useFocusEffect(
    React.useCallback(() => {
      loadBookingCount();
    }, [user?.id])
  );

  const loadBookingCount = async () => {
    try {
      if (!user?.id) return;
      const response = await fetch(`${API_BASE_URL}/bookings/user/${user.id}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.bookings)) {
        // Считаем только завершенные бронирования
        const completedBookings = data.bookings.filter(booking => booking.status === 'completed');
        setBookingCount(completedBookings.length);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки бронирований:', error);
      setBookingCount(0);
    }
  };

  // Функция для получения цвета в зависимости от уровня лояльности
  const getLevelColor = (level) => {
    const userLevel = (level || 'Bronze').toLowerCase();
    switch (userLevel) {
      case 'platinum':
        return '#B366FF';
      case 'gold':
        return '#FFA500';
      case 'silver':
        return '#A9A9A9';
      case 'bronze':
      default:
        return '#CD7F32';
    }
  };

  const amenities = [
    {
      id: '1',
      title: 'Комната',
      icon: 'hotel',
      image: 'https://picsum.photos/300/200?random=4',
      description: 'Уютная комната с видом на природу',
      price: '3,500PRB/ночь',
    },
    {
      id: '2',
      title: 'Бассейн',
      icon: 'pool',
      image: 'https://picsum.photos/300/200?random=5',
      description: 'Открытый бассейн с подогревом',
      price: 'Включен в стоимость',
    },
    {
      id: '3',
      title: 'Ресторан',
      icon: 'restaurant',
      image: 'https://picsum.photos/300/200?random=6',
      description: 'Традиционная кухня и местные деликатесы',
      price: 'Средний чек 1,200PRB',
    },
    {
      id: '4',
      title: 'Спа',
      icon: 'spa',
      image: 'https://picsum.photos/300/200?random=7',
      description: 'Релаксация и оздоровительные процедуры',
      price: 'От 2,000PRB',
    },
    {
      id: '5',
      title: 'Парк',
      icon: 'park',
      image: 'https://picsum.photos/300/200?random=8',
      description: 'Зелёные зоны и прогулочные дорожки',
      price: 'Свободный доступ',
    },
  ];

  const properties = [
    {
      id: '1',
      name: 'Стадарт',
      price: '150PRB за ночь',
      image: require('../assets/property1.png'),
    },
    {
      id: '2',
      name: 'Люкс апартаменты',
      price: '250PRB за ночь',
      image: require('../assets/property2.png'),
    },
    {
      id: '3',
      name: 'Задний двор',
      price: '200PRB за ночь',
      image: require('../assets/property3.png'),
    },
    {
      id: '4',
      name: 'Сауна',
      price: '250PRB за час',
      image: require('../assets/property4.png'),
    },
  ];

  const loyaltyStats = [
    { label: 'Баллы', value: user?.loyaltyPoints || 0, icon: 'stars', color: '#FFD700' },
    { label: 'Уровень', value: user?.membershipLevel || 'Bronze', icon: 'emoji-events', color: getLevelColor(user?.membershipLevel) },
    { label: 'Бронирования', value: bookingCount, icon: 'event-note', color: colors.primary },
  ];

  // Стили с доступом к переменным компонента
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    
    // ========== HEADER SECTION ==========
    headerSection: {
      backgroundColor: colors.cardBg,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      position: 'relative',
    },
    headerGreeting: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    greetingName: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      right: 0,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },

    // ========== LOYALTY STATUS SECTION ==========
    loyaltyContainer: {
      marginHorizontal: spacing.md,
      marginVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 5,
    },
    loyaltyCard: {
      backgroundColor: colors.cardBg,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderLeftWidth: 5,
      borderLeftColor: colors.primary,
    },
    loyaltyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    statBox: {
      flex: 1,
      backgroundColor: isDark ? colors.background : colors.primary + '10',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary + '20',
    },
    statIcon: {
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },

    // ========== QUICK ACTIONS SECTION ==========
    actionsContainer: {
      marginHorizontal: spacing.md,
      marginVertical: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'space-between',
    },
    actionCard: {
      flex: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    actionIcon: {
      marginBottom: spacing.sm,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
    },

    // ========== RECENT BOOKINGS SECTION ==========
    recentBookingsSection: {
      marginHorizontal: spacing.md,
      marginVertical: spacing.lg,
    },
    recentBookingsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    bookingCard: {
      backgroundColor: colors.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    bookingCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    bookingCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    bookingStatus: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    bookingStatusPending: {
      backgroundColor: '#FEF3C7',
      color: '#B45309',
    },
    bookingStatusConfirmed: {
      backgroundColor: '#D1FAE5',
      color: '#065F46',
    },
    bookingCardDates: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    bookingCardPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },

    // ========== CATALOG SECTION ==========
    catalogSection: {
      marginVertical: spacing.lg,
    },
    catalogTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    },

    // ========== GALLERY SECTION ==========
    gallerySection: {
      marginVertical: spacing.lg,
    },
    gallerySectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    gallerySectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      flex: 1,
    },
    addButton: {
      backgroundColor: colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    photosGallery: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    photoCard: {
      width: 200,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.cardBg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    photoImage: {
      width: '100%',
      height: 140,
      backgroundColor: colors.border,
    },
    photoInfo: {
      padding: spacing.md,
    },
    photoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    photoPrice: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
      maxWidth: '100%',
    },

    // ========== MODAL STYLES ==========
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: '85%',
      paddingTop: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    photoDetailImage: {
      width: '100%',
      height: 250,
      backgroundColor: colors.border,
    },
    photoDetailInfo: {
      padding: spacing.lg,
    },
    photoDetailTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    photoDetailDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    photoDetailPrice: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.lg,
    },
    bookingButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.sm,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    bookingButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  }), [colors]);

  const handlePhotoSelect = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleClosePhotoDetail = () => {
    setSelectedPhoto(null);
  };

  const handleAddPhoto = () => {
    if (isAdmin) {
      setAddPhotoModalVisible(true);
    } else {
      Alert.alert('⚠️ Только для администраторов', 'Только администратор может добавлять фотографии.');
    }
  };

  const renderPhotoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => handlePhotoSelect(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.photoImage}
      />
      <View style={styles.photoInfo}>
        <Text style={styles.photoTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.photoPrice} numberOfLines={1}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* ========== HEADER SECTION ========== */}
      <ScaleInCard delay={0}>
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View style={styles.headerGreeting}>
              <Text style={styles.greetingLabel}>Добро пожаловать</Text>
              <Text style={styles.greetingName}>
                {user?.name || user?.displayName || 'Пользователь'}!
              </Text>
            </View>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>
                {(user?.name || user?.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </ScaleInCard>

      {/* ========== LOYALTY STATUS SECTION ========== */}
      <FadeInCard delay={100}>
        <View style={styles.loyaltyContainer}>
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyTitle}>Ваш статус лояльности</Text>
            <View style={styles.statsRow}>
              {loyaltyStats.map((stat, index) => (
                <View key={stat.label} style={styles.statBox}>
                  <MaterialIcons 
                    name={stat.icon} 
                    size={24} 
                    color={stat.color} 
                    style={styles.statIcon}
                  />
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </FadeInCard>

      {/* ========== QUICK ACTIONS 1 ========== */}
      <FadeInCard delay={200}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MyCard')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="card-membership" size={32} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Моя карта</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="settings" size={32} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Настройки</Text>
          </TouchableOpacity>
        </View>
      </FadeInCard>

      {/* ========== QUICK ACTIONS 2 ========== */}
      <FadeInCard delay={250}>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('Events')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="event" size={32} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionText}>События</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('Booking')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="calendar-today" size={32} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Бронь</Text>
          </TouchableOpacity>
        </View>
      </FadeInCard>

      {/* ========== PROPERTIES CATALOG ========== */}
      <FadeInCard delay={300}>
        <View style={styles.catalogSection}>
          <Text style={styles.catalogTitle}>Каталог объектов</Text>
          <PropertyCarousel 
            properties={properties}
            onPropertyPress={(property) => {
              navigation.navigate('Booking', { selectedProperty: property });
            }}
          />
        </View>
      </FadeInCard>

      {/* ========== PHOTO DETAIL MODAL ========== */}
      {selectedPhoto && (
        <Modal visible={!!selectedPhoto} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedPhoto.title}</Text>
                <TouchableOpacity onPress={handleClosePhotoDetail}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedPhoto.image }}
                  style={styles.photoDetailImage}
                />
                <View style={styles.photoDetailInfo}>
                  <Text style={styles.photoDetailTitle}>{selectedPhoto.title}</Text>
                  <Text style={styles.photoDetailDescription}>{selectedPhoto.description}</Text>
                  <Text style={styles.photoDetailPrice}>{selectedPhoto.price}</Text>
                  <TouchableOpacity 
                    style={styles.bookingButton}
                    onPress={handleClosePhotoDetail}
                  >
                    <MaterialIcons name="calendar-today" size={20} color="#fff" />
                    <Text style={styles.bookingButtonText}>Забронировать</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}