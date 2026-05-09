import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useNotification } from '../../context/NotificationContext';
import { usePayment } from '../../context/PaymentContext';
import BookingService from '../../services/BookingService';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { getApiUrl } from '../../utils/apiUrl';

export default function CheckoutScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshBookings } = useBookings();
  const { notifyNewBooking, notifyPaymentSuccess, notifyAdminEvent } = useNotification();
  const { payBookingFromCard, getCardBalance, cardBalance, setCardBalance } = usePayment();

  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);

  // Get booking data from route params
  const bookingData = route.params || {
    serviceType: 'Бронирование номера',
    guestName: 'Гость',
    amount: 5000,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    guests: 1,
    propertyId: '1',
    userId: 'web_user',
    saunaHours: 0,
    kitchenware: false,
  };

  // Загружаем баланс карты лояльности при загрузке экрана
  useEffect(() => {
    const loadBalance = async () => {
      if (!user?.id) {
        setLoadingBalance(false);
        return;
      }

      try {
        setLoadingBalance(true);
        const data = await getCardBalance(user.id);
        setBalance(data.balance);
        setCardBalance(data.balance);
        setInsufficientFunds(data.balance < bookingData.amount);
      } catch (error) {
        console.error('❌ Ошибка загрузки баланса:', error);
        setInsufficientFunds(true);
      } finally {
        setLoadingBalance(false);
      }
    };

    loadBalance();
  }, [user?.id, bookingData.amount]);

  const handleConfirmBooking = async () => {
    if (insufficientFunds) {
      Alert.alert('❌ Ошибка', 'Недостаточно средств на карте лояльности', [
        {
          text: 'Пополнить карту',
          onPress: () => {
            navigation.navigate('CardTopUp');
          },
        },
        {
          text: 'Отмена',
        },
      ]);
      return;
    }

    try {
      setIsProcessing(true);
      const userId = user?.id || bookingData.userId;

      // Шаг 1: Создаем бронирование (статус: pending, деньги НЕ списываются)
      const booking = await BookingService.createBooking({
        propertyId: bookingData.propertyId || '1',
        userId: userId,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        guests: bookingData.guests || 1,
        notes: bookingData.notes || `Бронирование через мобильное приложение`,
        totalPrice: bookingData.amount || 0,
        // Дополнительные услуги
        saunaHours: bookingData.saunaHours || 0,
        kitchenware: bookingData.kitchenware || false,
      });
      
      // Шаг 2: Оплачиваем бронирование с карты лояльности
      const paymentResult = await payBookingFromCard(booking.id, userId);

      // Обновляем баланс
      setBalance(paymentResult.newBalance);
      setCardBalance(paymentResult.newBalance);

      // Отправляем уведомления
      await notifyNewBooking(bookingData.serviceType, user?.name || 'Пользователь', bookingData.checkIn, bookingData.checkOut);
      await notifyPaymentSuccess(bookingData.amount, 'карта лояльности');
      
      // Уведомляем администратора о новом бронировании
      await notifyAdminEvent('new_booking', {
        guestName: user?.name || 'Пользователь',
        propertyName: bookingData.serviceType,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests || 1,
        amount: bookingData.amount,
        bookingId: booking.id,
        saunaHours: bookingData.saunaHours || 0,
        kitchenware: bookingData.kitchenware || false,
      });

      // Обновляем список бронирований в контексте
      await refreshBookings();

      // Сохраняем информацию о бронировании и показываем красивый modal
      setBookingInfo({
        id: booking.id,
        propertyName: bookingData.serviceType,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests || 1,
        amount: bookingData.amount,
        newBalance: paymentResult.newBalance,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Ошибка при бронировании:', error);
      Alert.alert(
        '❌ Ошибка',
        error.message || 'Не удалось создать бронирование. Попробуйте позже.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.primary,
      padding: spacing.lg,
      paddingTop: spacing.xl,
    },
    headerTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '700',
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    section: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
    value: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    totalValue: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: '700',
    },
    balanceSection: {
      backgroundColor: insufficientFunds ? '#FFE5E5' : '#E8F5E9',
      borderLeftWidth: 4,
      borderLeftColor: insufficientFunds ? '#FF4444' : '#4CAF50',
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceInfo: {
      flex: 1,
    },
    balanceLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    balanceAmount: {
      color: insufficientFunds ? '#FF4444' : '#4CAF50',
      fontSize: 20,
      fontWeight: '700',
    },
    balanceIcon: {
      marginLeft: spacing.md,
    },
    warningText: {
      color: '#FF4444',
      fontSize: 12,
      marginTop: spacing.md,
    },
    button: {
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
    },
    buttonEnabled: {
      backgroundColor: theme.colors.primary,
    },
    buttonDisabled: {
      backgroundColor: '#CCC',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    successModalScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    successModal: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      width: '85%',
      maxHeight: '90%',
    },
    checkmarkContainer: {
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    successTitle: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    bookingDetailsCard: {
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.md,
    },
    detailRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailContent: {
      marginLeft: spacing.md,
      flex: 1,
    },
    detailLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      marginBottom: spacing.xs,
    },
    detailValue: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    successButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    successButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  }), [theme.colors]);

  if (loadingBalance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Booking Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Сводка заказа</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Услуга</Text>
            <Text style={styles.value}>{bookingData.serviceType}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Дата заезда</Text>
            <Text style={styles.value}>{bookingData.checkIn}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Дата выезда</Text>
            <Text style={styles.value}>{bookingData.checkOut}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Гостей</Text>
            <Text style={styles.value}>{bookingData.guests || 1}</Text>
          </View>

          {bookingData.saunaHours > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Парилка</Text>
              <Text style={styles.value}>{bookingData.saunaHours} ч. × 250PRB</Text>
            </View>
          )}

          {bookingData.kitchenware && (
            <View style={styles.row}>
              <Text style={styles.label}>Кухонный сервиз</Text>
              <Text style={styles.value}>100PRB</Text>
            </View>
          )}

          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Итого</Text>
            <Text style={styles.totalValue}>PRB {bookingData.amount.toLocaleString('ru-RU')}</Text>
          </View>
        </View>

        {/* Loyalty Card Balance */}
        <View style={[styles.section, { backgroundColor: insufficientFunds ? '#FEE4E4' : '#E8F5E9', borderLeftWidth: 4, borderLeftColor: insufficientFunds ? '#FF6B6B' : '#4CAF50' }]}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Баланс карты лояльности</Text>
              {loadingBalance ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={[styles.balanceAmount, { color: insufficientFunds ? '#FF6B6B' : '#4CAF50' }]}>
                  {cardBalance.toLocaleString('ru-RU')}PRB
                </Text>
              )}
            </View>
            <MaterialIcons
              name={insufficientFunds ? 'error-outline' : 'check-circle'}
              size={32}
              color={insufficientFunds ? '#FF6B6B' : '#4CAF50'}
              style={styles.balanceIcon}
            />
          </View>

          {insufficientFunds && (
            <View style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: '#FFB3B3' }}>
              <Text style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: spacing.sm }}>⚠️ Недостаточно средств</Text>
              <Text style={{ color: '#D32F2F', fontSize: 12, lineHeight: 18 }}>
                Требуется: {bookingData.amount.toLocaleString('ru-RU')}PRB{'\n'}Доступно: {cardBalance.toLocaleString('ru-RU')}PRB{'\n'}Не хватает: {(bookingData.amount - cardBalance).toLocaleString('ru-RU')}PRB
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.button,
            insufficientFunds ? styles.buttonDisabled : styles.buttonEnabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={insufficientFunds || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons
                name={insufficientFunds ? 'block' : 'check-circle'}
                size={24}
                color="#fff"
              />
              <Text style={styles.buttonText}>
                Подтвердить оплату
              </Text>
            </>
          )}
        </TouchableOpacity>

        {insufficientFunds && (
          <View style={[styles.section, { backgroundColor: '#FFF3CD' }]}>
            <Text style={{ color: '#856404', fontSize: 13, lineHeight: 20 }}>
              ℹ️ Для завершения бронирования пополните баланс карты лояльности. Перейдите на вкладку "Мои карты" и пополните необходимую сумму.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.successModalOverlay}>
          <ScrollView contentContainerStyle={styles.successModalScroll} style={{ flex: 1 }}>
            <View style={styles.successModal}>
              {/* Checkmark Animation */}
              <View style={styles.checkmarkContainer}>
                <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
              </View>

              <Text style={styles.successTitle}>Бронирование подтверждено!</Text>

              {bookingInfo && (
                <>
                  <View style={styles.bookingDetailsCard}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="apartment" size={20} color={theme.colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Объект</Text>
                        <Text style={styles.detailValue}>{bookingInfo.propertyName}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                      <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Даты</Text>
                        <Text style={styles.detailValue}>{bookingInfo.checkIn} - {bookingInfo.checkOut}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                      <MaterialIcons name="people" size={20} color={theme.colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Гостей</Text>
                        <Text style={styles.detailValue}>{bookingInfo.guests}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                      <MaterialIcons name="confirmation-number" size={20} color={theme.colors.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Номер бронирования</Text>
                        <Text style={styles.detailValue}>#{bookingInfo.id}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailRow, styles.detailRowBorder]}>
                      <MaterialIcons name="payments" size={20} color="#FF9800" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Оплачено</Text>
                        <Text style={[styles.detailValue, { color: '#FF6B00' }]}>{bookingInfo.amount.toLocaleString('ru-RU')} PRB</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="account-balance-wallet" size={20} color="#4CAF50" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Остаток на карте</Text>
                        <Text style={[styles.detailValue, { color: '#4CAF50' }]}>{bookingInfo.newBalance.toLocaleString('ru-RU')} PRB</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.successButtonText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
