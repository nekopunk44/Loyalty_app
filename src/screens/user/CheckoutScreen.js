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

const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');

// Строка чека: подпись слева, значение справа. На уровне модуля, чтобы не
// пересоздавать тип компонента на каждый рендер экрана.
function ReceiptLine({ styles, label, value, valueColor }) {
  return (
    <View style={styles.receiptLineRow}>
      <Text style={styles.receiptLineLabel}>{label}</Text>
      <Text style={[styles.receiptLineValue, valueColor && { color: valueColor }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

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
  const [paidAt, setPaidAt] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  // Sprint A: депозит — это всё, что списывается сейчас. Остаток — после заезда.
  const [depositAmount, setDepositAmount] = useState(0);

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

  const totalAmount    = bookingData.amount || 0;
  const remainingAmount = Math.max(0, totalAmount - depositAmount);

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

        const rawDeposit = parseFloat(property?.depositAmount) || 0;
        const effectiveDeposit = rawDeposit > 0
          ? Math.min(rawDeposit, totalAmount)
          : totalAmount;
        setDepositAmount(effectiveDeposit);
        setInsufficientFunds(cardData.balance < effectiveDeposit);
      } catch (error) {
        console.error('Ошибка загрузки данных оплаты:', error);
        setDepositAmount(totalAmount);
        setInsufficientFunds(true);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadCheckoutContext();
  }, [user?.id, totalAmount, bookingData.propertyId]);

  // Юзер уже создал бронь, но не оплатил депозит — допроходим оплату той же брони.
  const payExistingPending = async (existingBookingId) => {
    try {
      setIsProcessing(true);
      const depositResult = await payDeposit(existingBookingId);
      const balanceAfter  = depositResult?.payment?.balanceAfter   ?? cardBalance;
      const actualDeposit = depositResult?.payment?.amount         ?? depositAmount;
      const remainingDue  = depositResult?.payment?.remainingAmount ?? remainingAmount;

      setBalance(balanceAfter);
      setCardBalance(balanceAfter);

      await notifyPaymentSuccess(actualDeposit, 'карта лояльности (депозит)');
      await refreshBookings();

      setBookingInfo({
        id:           existingBookingId,
        propertyName: bookingData.serviceType,
        checkIn:      bookingData.checkIn,
        checkOut:     bookingData.checkOut,
        guests:       bookingData.guests || 1,
        totalAmount,
        deposit:      actualDeposit,
        remaining:    remainingDue,
        newBalance:   balanceAfter,
      });
      setPaidAt(new Date());
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка оплаты существующей брони:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось оплатить депозит существующей брони.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (insufficientFunds) {
      Alert.alert(
        'Недостаточно средств',
        `На карте лояльности ${fmt(cardBalance)} PRB. Для депозита нужно ${fmt(depositAmount)} PRB.`,
        [
          { text: 'Пополнить карту', onPress: () => navigation.navigate('CardTopUp') },
          { text: 'Отмена', style: 'cancel' },
        ],
      );
      return;
    }

    try {
      setIsProcessing(true);
      const userId = user?.id || bookingData.userId;

      const booking = await BookingService.createBooking({
        propertyId: bookingData.propertyId || '1',
        userId,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        guests:      bookingData.guests || 1,
        notes:       bookingData.notes || 'Бронирование через мобильное приложение',
        totalPrice:  totalAmount,
        saunaHours:  bookingData.saunaHours || 0,
        kitchenware: bookingData.kitchenware || false,
      });

      const depositResult = await payDeposit(booking.id);
      const balanceAfter  = depositResult?.payment?.balanceAfter ?? cardBalance;
      const actualDeposit = depositResult?.payment?.amount       ?? depositAmount;
      const remainingDue  = depositResult?.payment?.remainingAmount ?? remainingAmount;

      setBalance(balanceAfter);
      setCardBalance(balanceAfter);

      await notifyNewBooking(bookingData.serviceType, user?.name || 'Пользователь', bookingData.checkIn, bookingData.checkOut);
      await notifyPaymentSuccess(actualDeposit, 'карта лояльности (депозит)');
      await notifyAdminEvent('new_booking', {
        guestName:    user?.name || 'Пользователь',
        propertyName: bookingData.serviceType,
        checkIn:      bookingData.checkIn,
        checkOut:     bookingData.checkOut,
        guests:       bookingData.guests || 1,
        amount:       totalAmount,
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
        totalAmount,
        deposit:      actualDeposit,
        remaining:    remainingDue,
        newBalance:   balanceAfter,
      });
      setPaidAt(new Date());
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка при бронировании:', error);

      // 409 ownPending: у юзера уже есть pending_payment на эти даты —
      // предлагаем доплатить тот же объект, а не создавать новый.
      if (error.ownPendingBookingId) {
        setIsProcessing(false);
        Alert.alert(
          'У вас уже есть незавершённая бронь',
          `Бронь №${error.ownPendingBookingId} на эти даты ждёт оплаты депозита. Хотите оплатить её сейчас?`,
          [
            { text: 'Закрыть', style: 'cancel' },
            {
              text: 'Оплатить депозит',
              onPress: () => payExistingPending(error.ownPendingBookingId),
            },
          ],
        );
        return;
      }

      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось создать бронирование. Попробуйте позже.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    // Hero
    hero: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl || spacing.xl + spacing.md,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    heroLabel: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    heroProperty: {
      color: '#fff',
      fontSize: 22,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroAmount: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '800',
    },
    heroCurrency: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: spacing.sm,
    },
    heroHint: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 12,
      marginTop: spacing.xs,
    },

    // Pulled-up card area
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: 140,
    },

    card: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    cardTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginLeft: spacing.sm,
    },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: { color: theme.colors.textSecondary, fontSize: 13, flex: 1 },
    value: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },

    // Payment split
    splitBlock: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.background,
      padding: spacing.md,
    },
    splitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    splitLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    splitSubLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    splitAmountPrimary: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: '800',
    },
    splitAmountMuted: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    splitDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.sm,
    },

    // Balance ribbon
    balanceRibbon: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
    },
    balanceTextWrap: { flex: 1, marginLeft: spacing.md },
    balanceLabel: { fontSize: 12, fontWeight: '600' },
    balanceAmount: { fontSize: 18, fontWeight: '800', marginTop: 2 },

    // Info note
    note: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    noteText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginLeft: spacing.sm,
    },

    // Sticky bottom CTA
    ctaBar: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      backgroundColor: theme.colors.cardBg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 8,
    },
    ctaSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.sm,
    },
    ctaSummaryLabel: { color: theme.colors.textSecondary, fontSize: 12 },
    ctaSummaryValue: { color: theme.colors.primary, fontSize: 18, fontWeight: '800' },
    ctaButton: {
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    ctaButtonEnabled: { backgroundColor: theme.colors.primary },
    ctaButtonDisabled: { backgroundColor: '#BFC5CC' },
    ctaButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      marginLeft: spacing.sm,
    },

    loadingContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      backgroundColor: theme.colors.background,
    },

    // Success modal
    successModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    successModalScroll: {
      flexGrow: 1, justifyContent: 'center', alignItems: 'center',
      paddingVertical: spacing.lg, width: '100%',
    },
    // ── Чек об оплате ──
    receiptCard: {
      backgroundColor: theme.colors.cardBg,
      borderRadius: borderRadius.xl,
      width: '88%',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    receiptHeader: {
      backgroundColor: '#10B981',
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    receiptCheckCircle: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: '#fff',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    receiptHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    receiptHeaderSub:   { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
    receiptBody:        { padding: spacing.lg },
    receiptMerchant:    { color: theme.colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    receiptDate:        { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 2 },
    receiptDashed: {
      borderBottomWidth: 1, borderStyle: 'dashed',
      borderBottomColor: theme.colors.border,
      marginVertical: spacing.md,
    },
    receiptLineRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 5, gap: spacing.md,
    },
    receiptLineLabel: { color: theme.colors.textSecondary, fontSize: 13 },
    receiptLineValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
    receiptTotalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: 'rgba(255,107,0,0.08)',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    },
    receiptTotalLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    receiptTotalValue: { color: '#FF6B00', fontSize: 20, fontWeight: '800' },
    receiptHint:       { color: theme.colors.textSecondary, fontSize: 11, textAlign: 'right', marginTop: 2 },
    successButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    successButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  }), [theme.colors, insufficientFunds]);

  if (loadingBalance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const balanceOk     = !insufficientFunds;
  const balanceColor  = balanceOk ? '#2E7D32' : '#C62828';
  const balanceBg     = balanceOk ? '#E8F5E9' : '#FDECEC';

  const receiptDate = (paidAt || new Date()).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Оформление брони</Text>
        <Text style={styles.heroProperty} numberOfLines={2}>
          {bookingData.serviceType}
        </Text>
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount}>{fmt(totalAmount)}</Text>
          <Text style={styles.heroCurrency}>PRB · итого</Text>
        </View>
        <Text style={styles.heroHint}>
          {bookingData.checkIn} → {bookingData.checkOut} · {bookingData.guests || 1} гость(-я)
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance ribbon */}
        <View style={[styles.balanceRibbon, { backgroundColor: balanceBg }]}>
          <MaterialCommunityIcons
            name={balanceOk ? 'wallet-outline' : 'alert-circle-outline'}
            size={28}
            color={balanceColor}
          />
          <View style={styles.balanceTextWrap}>
            <Text style={[styles.balanceLabel, { color: balanceColor }]}>
              Баланс карты лояльности
            </Text>
            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
              {fmt(cardBalance)} PRB
            </Text>
            {!balanceOk && (
              <Text style={{ color: balanceColor, fontSize: 11, marginTop: 2 }}>
                Не хватает {fmt(depositAmount - cardBalance)} PRB для депозита
              </Text>
            )}
          </View>
        </View>

        {/* Order summary */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="receipt-long" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Состав заказа</Text>
          </View>

          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>Заезд</Text>
            <Text style={styles.value}>{bookingData.checkIn}</Text>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>Выезд</Text>
            <Text style={styles.value}>{bookingData.checkOut}</Text>
          </View>
          <View style={[styles.row, (bookingData.saunaHours > 0 || bookingData.kitchenware) && styles.rowDivider]}>
            <Text style={styles.label}>Гостей</Text>
            <Text style={styles.value}>{bookingData.guests || 1}</Text>
          </View>

          {bookingData.saunaHours > 0 && (
            <View style={[styles.row, bookingData.kitchenware && styles.rowDivider]}>
              <Text style={styles.label}>Парилка</Text>
              <Text style={styles.value}>{bookingData.saunaHours} ч. × 250 PRB</Text>
            </View>
          )}

          {bookingData.kitchenware && (
            <View style={styles.row}>
              <Text style={styles.label}>Кухонный сервиз</Text>
              <Text style={styles.value}>100 PRB</Text>
            </View>
          )}
        </View>

        {/* Payment split */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="payments" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Порядок оплаты</Text>
          </View>

          <View style={styles.splitBlock}>
            <View style={styles.splitRow}>
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={styles.splitLabel}>Депозит сейчас</Text>
                <Text style={styles.splitSubLabel}>списывается с карты лояльности</Text>
              </View>
              <Text style={styles.splitAmountPrimary}>{fmt(depositAmount)} PRB</Text>
            </View>

            {remainingAmount > 0 && (
              <>
                <View style={styles.splitDivider} />
                <View style={styles.splitRow}>
                  <View style={{ flex: 1, paddingRight: spacing.md }}>
                    <Text style={styles.splitLabel}>Остаток в день выезда</Text>
                    <Text style={styles.splitSubLabel}>
                      картой автоматически или наличными при заезде
                    </Text>
                  </View>
                  <Text style={styles.splitAmountMuted}>{fmt(remainingAmount)} PRB</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Info note */}
        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.noteText}>
            Депозит закрепит за вами даты. Оплатите его в течение 12 часов — иначе слот освободится.
            {remainingAmount > 0 ? ' Остаток зафиксируется при выборе способа в личном кабинете.' : ''}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaBar}>
        <View style={styles.ctaSummaryRow}>
          <Text style={styles.ctaSummaryLabel}>К списанию сейчас</Text>
          <Text style={styles.ctaSummaryValue}>{fmt(depositAmount)} PRB</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            insufficientFunds ? styles.ctaButtonDisabled : styles.ctaButtonEnabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={insufficientFunds || isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons
                name={insufficientFunds ? 'block' : 'lock'}
                size={20}
                color="#fff"
              />
              <Text style={styles.ctaButtonText}>
                {insufficientFunds ? 'Недостаточно средств' : 'Подтвердить и оплатить депозит'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
            <View style={styles.receiptCard}>

              {/* ── Зелёная шапка чека ── */}
              <View style={styles.receiptHeader}>
                <View style={styles.receiptCheckCircle}>
                  <MaterialCommunityIcons name="check-bold" size={32} color="#10B981" />
                </View>
                <Text style={styles.receiptHeaderTitle}>
                  {bookingInfo?.remaining > 0 ? 'Депозит принят' : 'Оплачено'}
                </Text>
                <Text style={styles.receiptHeaderSub}>
                  {bookingInfo?.remaining > 0 ? 'Бронь подтверждена' : 'Бронирование оплачено'}
                </Text>
              </View>

              {/* ── Тело чека ── */}
              <View style={styles.receiptBody}>
                <Text style={styles.receiptMerchant}>Villa Jaconda · Программа лояльности</Text>
                <Text style={styles.receiptDate}>Чек от {receiptDate}</Text>

                {bookingInfo && (
                  <>
                    <View style={styles.receiptDashed} />

                    <ReceiptLine styles={styles} label="Объект" value={bookingInfo.propertyName} />
                    <ReceiptLine styles={styles} label="Даты" value={`${bookingInfo.checkIn} — ${bookingInfo.checkOut}`} />
                    <ReceiptLine styles={styles} label="Гостей" value={String(bookingInfo.guests)} />
                    <ReceiptLine styles={styles} label="Бронирование" value={`#${bookingInfo.id}`} />

                    <View style={styles.receiptDashed} />

                    {/* Итог депозита — акцент */}
                    <View style={styles.receiptTotalRow}>
                      <Text style={styles.receiptTotalLabel}>Депозит оплачен</Text>
                      <Text style={styles.receiptTotalValue}>{fmt(bookingInfo.deposit)} PRB</Text>
                    </View>

                    {bookingInfo.remaining > 0 && (
                      <>
                        <ReceiptLine styles={styles} label="Остаток до заезда" value={`${fmt(bookingInfo.remaining)} PRB`} valueColor="#1976D2" />
                        <Text style={styles.receiptHint}>картой приложения или наличными при заезде</Text>
                      </>
                    )}

                    <View style={styles.receiptDashed} />

                    <ReceiptLine styles={styles} label="Баланс карты" value={`${fmt(bookingInfo.newBalance)} PRB`} valueColor="#10B981" />
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
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
