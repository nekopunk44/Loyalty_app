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
import PropertyService from '../../services/PropertyService';

export default function CheckoutScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshBookings } = useBookings();
  const { notifyNewBooking, notifyPaymentSuccess, notifyAdminEvent } = useNotification();
  const { payDeposit, getCardBalance, cardBalance, setCardBalance } = usePayment();

  const [_balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  // Sprint A: депозит — это всё, что списывается сейчас. Остаток — после заезда.
  const [depositAmount, setDepositAmount] = useState(0);

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

  const remainingAmount = Math.max(0, (bookingData.amount || 0) - depositAmount);

  // Загружаем баланс карты лояльности + депозит объекта.
  useEffect(() => {
    const loadCheckoutContext = async () => {
      if (!user?.id) {
        setLoadingBalance(false);
        return;
      }

      try {
        setLoadingBalance(true);

        const [cardData, property] = await Promise.all([
          getCardBalance(user.id),
          PropertyService.getPropertyById(bookingData.propertyId || '1').catch(() => null),
        ]);

        setBalance(cardData.balance);
        setCardBalance(cardData.balance);

        // Депозит = snapshot из Property. Если поле отсутствует/нулевое (legacy)
        // — депозит = весь totalPrice (юзер платит сразу).
        const rawDeposit = parseFloat(property?.depositAmount) || 0;
        const effectiveDeposit = rawDeposit > 0
          ? Math.min(rawDeposit, bookingData.amount || 0)
          : (bookingData.amount || 0);
        setDepositAmount(effectiveDeposit);

        setInsufficientFunds(cardData.balance < effectiveDeposit);
      } catch (error) {
        console.error('❌ Ошибка загрузки данных оплаты:', error);
        // Если property не загрузился — fallback к полной оплате.
        setDepositAmount(bookingData.amount || 0);
        setInsufficientFunds(true);
      } finally {
        setLoadingBalance(false);
      }
    };

    loadCheckoutContext();
  }, [user?.id, bookingData.amount, bookingData.propertyId]);

  const handleConfirmBooking = async () => {
    if (insufficientFunds) {
      Alert.alert('❌ Ошибка', `Недостаточно средств для оплаты депозита (${depositAmount} PRB)`, [
        { text: 'Пополнить карту', onPress: () => navigation.navigate('CardTopUp') },
        { text: 'Отмена' },
      ]);
      return;
    }

    try {
      setIsProcessing(true);
      const userId = user?.id || bookingData.userId;

      // Шаг 1: Создаём бронирование (status='pending_payment', deadline +12ч).
      const booking = await BookingService.createBooking({
        propertyId: bookingData.propertyId || '1',
        userId,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        guests:      bookingData.guests || 1,
        notes:       bookingData.notes || 'Бронирование через мобильное приложение',
        totalPrice:  bookingData.amount || 0,
        saunaHours:  bookingData.saunaHours || 0,
        kitchenware: bookingData.kitchenware || false,
      });

      // Шаг 2: Оплачиваем депозит → status='confirmed'.
      const depositResult = await payDeposit(booking.id);
      const balanceAfter   = depositResult?.payment?.balanceAfter ?? cardBalance;
      const actualDeposit  = depositResult?.payment?.amount        ?? depositAmount;
      const remainingDue   = depositResult?.payment?.remainingAmount ?? remainingAmount;

      setBalance(balanceAfter);
      setCardBalance(balanceAfter);

      // Уведомления.
      await notifyNewBooking(bookingData.serviceType, user?.name || 'Пользователь', bookingData.checkIn, bookingData.checkOut);
      await notifyPaymentSuccess(actualDeposit, 'карта лояльности (депозит)');

      await notifyAdminEvent('new_booking', {
        guestName:    user?.name || 'Пользователь',
        propertyName: bookingData.serviceType,
        checkIn:      bookingData.checkIn,
        checkOut:     bookingData.checkOut,
        guests:       bookingData.guests || 1,
        amount:       bookingData.amount,
        bookingId:    booking.id,
        saunaHours:   bookingData.saunaHours || 0,
        kitchenware:  bookingData.kitchenware || false,
      });

      await refreshBookings();

      setBookingInfo({
        id:           booking.id,
        propertyName: bookingData.serviceType,
        checkIn:      bookingData.checkIn,
        checkOut:     bookingData.checkOut,
        guests:       bookingData.guests || 1,
        totalAmount:  bookingData.amount,
        deposit:      actualDeposit,
        remaining:    remainingDue,
        newBalance:   balanceAfter,
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
      paddingVertical: spacing.xl,
    },
    successModalScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      width: '100%',
    },
    successModal: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      width: '85%',
    },
    checkmarkContainer: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    successTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    bookingDetailsCard: {
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginBottom: spacing.lg,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
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

        {/* Payment Split: deposit (сейчас) + остаток (до заезда) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Порядок оплаты</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>Депозит (сейчас)</Text>
              <Text style={[styles.label, { marginTop: 2 }]}>списывается с карты лояльности</Text>
            </View>
            <Text style={styles.totalValue}>PRB {depositAmount.toLocaleString('ru-RU')}</Text>
          </View>

          <View style={[styles.row, styles.lastRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>Остаток (до заезда)</Text>
              <Text style={[styles.label, { marginTop: 2 }]}>
                {remainingAmount > 0 ? 'картой приложения или наличными при заезде' : 'нет — депозит покрывает всю сумму'}
              </Text>
            </View>
            <Text style={styles.value}>PRB {remainingAmount.toLocaleString('ru-RU')}</Text>
          </View>

          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: spacing.sm, lineHeight: 16 }}>
            Оплатите депозит в течение 12 часов после создания брони, иначе слот освобождается.
          </Text>
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
              <Text style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: spacing.sm }}>⚠️ Недостаточно средств для депозита</Text>
              <Text style={{ color: '#D32F2F', fontSize: 12, lineHeight: 18 }}>
                Требуется на депозит: {depositAmount.toLocaleString('ru-RU')}PRB{'\n'}Доступно: {cardBalance.toLocaleString('ru-RU')}PRB{'\n'}Не хватает: {(depositAmount - cardBalance).toLocaleString('ru-RU')}PRB
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
              {'ℹ️ Для завершения бронирования пополните баланс карты лояльности. Перейдите на вкладку «Мои карты» и пополните необходимую сумму.'}
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

              <Text style={styles.successTitle}>
                {bookingInfo?.remaining > 0 ? 'Депозит принят, бронь подтверждена!' : 'Бронирование оплачено!'}
              </Text>

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
                        <Text style={styles.detailLabel}>Депозит оплачен</Text>
                        <Text style={[styles.detailValue, { color: '#FF6B00' }]}>{bookingInfo.deposit.toLocaleString('ru-RU')} PRB</Text>
                      </View>
                    </View>

                    {bookingInfo.remaining > 0 && (
                      <View style={[styles.detailRow, styles.detailRowBorder]}>
                        <MaterialIcons name="schedule" size={20} color="#1976D2" />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Остаток до заезда</Text>
                          <Text style={[styles.detailValue, { color: '#1976D2' }]}>
                            {bookingInfo.remaining.toLocaleString('ru-RU')} PRB
                          </Text>
                          <Text style={[styles.detailLabel, { marginTop: 2 }]}>
                            картой приложения или наличными при заезде
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <MaterialIcons name="account-balance-wallet" size={20} color="#4CAF50" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Баланс карты</Text>
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
