import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, borderRadius } from '../../constants/theme';
import { GradientView } from '../../components/ui/GradientView';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useAnalytics } from '../../context/AnalyticsContext';

const BALANCE_KEY = '@loyalty_balance';

export default function ProfileScreen() {
  const [balance, setBalance] = useState(0);
  const [tier, setTier] = useState('Bronze');
  const [activeTab, setActiveTab] = useState('profile');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { bookings, addBooking: _addBooking, updateBookingReview } = useBookings();
  const { trackEvent } = useAnalytics();

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load balance
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BALANCE_KEY);
        if (raw) setBalance(parseFloat(raw));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Update tier based on balance
  useEffect(() => {
    if (balance < 500) setTier('Bronze');
    else if (balance < 2000) setTier('Silver');
    else if (balance < 5000) setTier('Gold');
    else setTier('Platinum');
  }, [balance]);

  const getTierGradient = () => {
    switch (tier) {
      case 'Platinum': return ['#E5D4FF', '#D8B8FF', '#B366FF'];
      case 'Gold': return ['#FFE66D', '#FFD700', '#FFA500'];
      case 'Silver': return ['#E8E8E8', '#C0C0C0', '#A9A9A9'];
      case 'Bronze': return ['#D4A574', '#CD7F32', '#8B4513'];
      default: return ['#FF6B35', '#FF8C42', '#FF6B35'];
    }
  };

  const getTierBorderColor = () => {
    switch (tier) {
      case 'Bronze': return '#8B4513';
      case 'Silver': return '#A9A9A9';
      case 'Gold': return '#FFA500';
      case 'Platinum': return '#B366FF';
      default: return theme.colors.primary;
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setRating(booking.rating || 0);
    setReviewText(booking.review || '');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedBooking) return;
    try {
      await updateBookingReview(selectedBooking.id, rating, reviewText);
      trackEvent('review_submitted', {
        bookingId: selectedBooking.id,
        rating: rating,
        hasText: reviewText.length > 0,
      });
      setShowReviewModal(false);
      setRating(0);
      setReviewText('');
      Alert.alert('Успешно', 'Ваш отзыв был добавлен!');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось добавить отзыв');
    }
  };

  const pickAvatarFromSource = async (useCamera) => {
    try {
      const permResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permResult.status !== 'granted') {
        Alert.alert('Нет доступа', useCamera ? 'Разрешите доступ к камере' : 'Разрешите доступ к галерее');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Ошибка', 'Не удалось получить изображение');
        return;
      }

      setAvatarUploading(true);
      try {
        const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
        await updateProfile({ avatar: dataUrl });
        setAvatarModalVisible(false);
      } catch (e) {
        Alert.alert('Ошибка', 'Не удалось обновить аватар');
      } finally {
        setAvatarUploading(false);
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось открыть выбор изображения');
    }
  };

  const getInitials = () => {
    const name = user?.displayName || user?.name || '';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  // Profile Tab Content
  const ProfileContent = () => (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* Аватар и данные пользователя */}
      <View style={[styles.userInfoSection, { backgroundColor: theme.colors.cardBg }]}>
        <View style={styles.avatarRow}>
          <TouchableOpacity onPress={() => setAvatarModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                </View>
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.primary }]}>
                <MaterialIcons name="camera-alt" size={14} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.userTextInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.displayName || user?.name || 'Пользователь'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
              {user?.email || ''}
            </Text>
            {user?.phone ? (
              <Text style={[styles.userPhone, { color: theme.colors.textSecondary }]}>
                {user.phone}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Card Display */}
      <View style={[styles.cardDisplay, { borderLeftColor: getTierBorderColor(), borderColor: getTierBorderColor(), overflow: 'hidden' }]}>
        <GradientView
          colors={getTierGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.cardGradientDecor1]} />
        <View style={[styles.cardGradientDecor2]} />
        
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardNumber, { color: '#fff', fontWeight: '500' }]}>•••• •••• •••• 7249</Text>
            <Text style={[styles.cardHolder, { color: '#fff', fontWeight: '600' }]}>Villa Jaconda</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)', borderWidth: 1, borderColor: '#fff' }]}>
            <MaterialIcons name="star" size={16} color="#fff" />
            <Text style={[styles.tierText, { color: '#fff' }]}>{tier}</Text>
          </View>
        </View>

        {/* Balance Section */}
        <View style={[styles.balanceSection, { borderTopColor: 'rgba(255, 255, 255, 0.3)' }]}>
          <Text style={[styles.balanceLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Ваш баланс</Text>
          <Text style={[styles.balanceValue, { color: '#fff', fontWeight: '700' }]}>{balance.toFixed(2)} PRB</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.cardBg }]}>
          <MaterialIcons name="trending-up" size={28} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{Math.floor(balance / 10)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Покупок</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.colors.cardBg }]}>
          <MaterialIcons name="card-giftcard" size={28} color={theme.colors.accent} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{balance.toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Баллов</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.colors.cardBg }]}>
          <MaterialIcons name="emoji-events" size={28} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{tier}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Уровень</Text>
        </View>
      </View>

      {/* Tier Info */}
      <View style={[styles.tierInfo, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.tierInfoTitle, { color: theme.colors.text }]}>Статусы членства</Text>
        <View style={[styles.tierItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.tierName, { color: theme.colors.text }]}>🥉 Bronze</Text>
          <Text style={[styles.tierRequirement, { color: theme.colors.textSecondary }]}>0 - 499 PRB</Text>
        </View>
        <View style={[styles.tierItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.tierName, { color: theme.colors.text }]}>🥈 Silver</Text>
          <Text style={[styles.tierRequirement, { color: theme.colors.textSecondary }]}>500 - 1999 PRB</Text>
        </View>
        <View style={[styles.tierItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.tierName, { color: theme.colors.text }]}>🥇 Gold</Text>
          <Text style={[styles.tierRequirement, { color: theme.colors.textSecondary }]}>2000 - 4999 PRB</Text>
        </View>
        <View style={styles.tierItem}>
          <Text style={[styles.tierName, { color: theme.colors.text }]}>💎 Platinum</Text>
          <Text style={[styles.tierRequirement, { color: theme.colors.textSecondary }]}>5000+ PRB</Text>
        </View>
      </View>
    </ScrollView>
  );

  // Bookings Tab Content
  const BookingsContent = () => (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>История бронирований</Text>
      {bookings.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.cardBg }]}>
          <MaterialIcons name="calendar-today" size={40} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>У вас нет бронирований</Text>
        </View>
      ) : (
        bookings.map(booking => (
          <View key={booking.id} style={[styles.bookingCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
            <View style={styles.bookingHeader}>
              <Text style={[styles.bookingTitle, { color: theme.colors.text }]}>{booking.serviceType || 'Услуга'}</Text>
              <Text style={[styles.bookingDate, { color: theme.colors.textSecondary }]}>
                {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
              </Text>
            </View>
            {booking.guestName && (
              <Text style={[styles.bookingDetail, { color: theme.colors.text }]}>Гость: {booking.guestName}</Text>
            )}
            {booking.amount && (
              <Text style={[styles.bookingAmount, { color: theme.colors.success }]}>Сумма: {booking.amount} PRB</Text>
            )}
            {booking.rating > 0 && (
              <View style={styles.ratingDisplay}>
                <Text style={[styles.ratingLabel, { color: theme.colors.text }]}>Ваша оценка:</Text>
                <View style={styles.starsDisplay}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <MaterialIcons
                      key={star}
                      name="star"
                      size={16}
                      color={star <= booking.rating ? '#FFD700' : theme.colors.textSecondary}
                    />
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => openReviewModal(booking)}
            >
              <MaterialIcons name="rate-review" size={16} color="#fff" />
              <Text style={styles.reviewButtonText}>
                {booking.rating > 0 ? 'Изменить отзыв' : 'Оставить отзыв'}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Tab Navigation */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.colors.cardBg, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('profile')}
        >
          <MaterialIcons name="person" size={20} color={activeTab === 'profile' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'profile' ? theme.colors.primary : theme.colors.textSecondary }]}>Профиль</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('bookings')}
        >
          <MaterialIcons name="calendar-today" size={20} color={activeTab === 'bookings' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'bookings' ? theme.colors.primary : theme.colors.textSecondary }]}>Бронирования</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'profile' && <ProfileContent />}
      {activeTab === 'bookings' && <BookingsContent />}

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Оставить отзыв</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.ratingPrompt, { color: theme.colors.text }]}>Оцените услугу (1-5 звёзд)</Text>
            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <MaterialIcons
                    name="star"
                    size={32}
                    color={star <= rating ? '#FFD700' : theme.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.reviewLabel, { color: theme.colors.text }]}>Ваш отзыв</Text>
            <TextInput
              style={[styles.reviewInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Расскажите о вашем опыте..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                onPress={submitReview}
              >
                <Text style={styles.submitButtonText}>Отправить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модал смены аватара */}
      <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={() => setAvatarModalVisible(false)}>
        <View style={styles.avatarModalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.cardBg }]}>
            <Text style={[styles.avatarModalTitle, { color: theme.colors.text }]}>Изменить фото профиля</Text>
            {avatarUploading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.avatarPickerButtons}>
                <TouchableOpacity
                  style={[styles.avatarPickerBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => pickAvatarFromSource(false)}
                >
                  <MaterialIcons name="photo-library" size={24} color="#fff" />
                  <Text style={styles.avatarPickerBtnText}>Галерея</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.avatarPickerBtn, { backgroundColor: theme.colors.accent || '#10B981' }]}
                  onPress={() => pickAvatarFromSource(true)}
                >
                  <MaterialIcons name="camera-alt" size={24} color="#fff" />
                  <Text style={styles.avatarPickerBtnText}>Камера</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: theme.colors.border, marginTop: 8 }]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flexGrow: 1,
  },
  tabNavigation: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDisplay: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  cardGradientDecor1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardGradientDecor2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 2,
  },
  cardHolder: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  tierBadge: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 4,
  },
  tierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceSection: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    position: 'relative',
    zIndex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tierInfo: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  tierInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  tierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierRequirement: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  bookingCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bookingDate: {
    fontSize: 12,
  },
  bookingDetail: {
    fontSize: 13,
    marginVertical: spacing.xs,
  },
  bookingAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginVertical: spacing.sm,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reviewButton: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: '50%',
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
  },
  ratingPrompt: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  userInfoSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userTextInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
  },
  userPhone: {
    fontSize: 13,
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  avatarModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  avatarPickerButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  avatarPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  avatarPickerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

