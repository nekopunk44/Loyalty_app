import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { usePayment } from '../context/PaymentContext';
import { useBookings } from '../context/BookingContext';

const PAYMENT_METHODS = {
  PAYPAL: 'paypal',
  VISA: 'visa',
  CRYPTO: 'crypto',
};

const CRYPTO_OPTIONS = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
  usdt: { name: 'Tether (USDT)', symbol: 'USDT', icon: '₮' },
};

export default function CheckoutScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { processPayPalPayment, processVisaPayment, processCryptoPayment, isProcessing } = usePayment();
  const { addBooking } = useBookings();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoPayment, setCryptoPayment] = useState(null);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  // Get booking data from route params
  const bookingData = route.params || {
    serviceType: 'Бронирование номера',
    guestName: 'Гость',
    amount: 5000,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  };

  const handlePayPalPayment = async () => {
    try {
      Alert.alert('PayPal', 'Перенаправляем на PayPal...');
      const payment = await processPayPalPayment(
        bookingData.amount,
        'booking_' + Date.now(),
        bookingData.serviceType
      );

      if (payment.status === 'completed') {
        // Добавляем бронирование в историю
        await addBooking({
          serviceType: bookingData.serviceType,
          guestName: bookingData.guestName,
          amount: bookingData.amount,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          paymentMethod: 'PayPal',
          paymentId: payment.id,
        });

        Alert.alert(
          'Успешно!',
          `Платёж на сумму ${bookingData.amount} ₽ прошел успешно!\n\nID транзакции: ${payment.transactionId}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Платёж не прошёл: ' + error.message);
    }
  };

  const handleVisaPayment = async () => {
    if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
      Alert.alert('Ошибка', 'Заполните все поля карты');
      return;
    }

    try {
      const payment = await processVisaPayment(
        cardData.number,
        bookingData.amount,
        'booking_' + Date.now(),
        bookingData.serviceType
      );

      if (payment.status === 'completed') {
        await addBooking({
          serviceType: bookingData.serviceType,
          guestName: bookingData.guestName,
          amount: bookingData.amount,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          paymentMethod: 'Visa',
          paymentId: payment.id,
        });

        Alert.alert(
          'Успешно!',
          `Платёж на сумму ${bookingData.amount} ₽ прошел успешно!\n\nID транзакции: ${payment.transactionId}`,
          [{ text: 'OK', onPress: () => {
            setCardData({ number: '', expiry: '', cvv: '', name: '' });
            navigation.goBack();
          }}]
        );
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Платёж не прошёл: ' + error.message);
    }
  };

  const handleCryptoPayment = async () => {
    try {
      const payment = await processCryptoPayment(
        selectedCrypto,
        bookingData.amount,
        'booking_' + Date.now(),
        bookingData.serviceType
      );

      setCryptoPayment(payment);
      setShowCryptoModal(true);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подготовить платёж: ' + error.message);
    }
  };

  const handleCryptoConfirm = async () => {
    try {
      await addBooking({
        serviceType: bookingData.serviceType,
        guestName: bookingData.guestName,
        amount: bookingData.amount,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        paymentMethod: `${CRYPTO_OPTIONS[selectedCrypto].name} (QR)`,
        paymentId: cryptoPayment.id,
      });

      Alert.alert(
        'Платёж инициирован',
        `Отправьте ${bookingData.amount / 100000} ${CRYPTO_OPTIONS[selectedCrypto].symbol} на адрес из QR-кода.\n\nПосле подтверждения в блокчейне ваше бронирование будет активировано.`,
        [{ text: 'OK', onPress: () => {
          setShowCryptoModal(false);
          navigation.goBack();
        }}]
      );
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать бронирование: ' + error.message);
    }
  };

  const renderPaymentMethodButton = (method, icon, title, description, onPress) => (
    <TouchableOpacity
      style={[
        styles.methodButton,
        {
          backgroundColor: theme.colors.cardBg,
          borderColor: selectedPaymentMethod === method ? theme.colors.primary : theme.colors.border,
          borderWidth: selectedPaymentMethod === method ? 2 : 1,
        }
      ]}
      onPress={onPress}
    >
      <View style={[styles.methodIcon, { backgroundColor: theme.colors.primary }]}>
        <MaterialIcons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.methodInfo}>
        <Text style={[styles.methodTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.methodDesc, { color: theme.colors.textSecondary }]}>{description}</Text>
      </View>
      {selectedPaymentMethod === method && (
        <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Order Summary */}
      <View style={[styles.orderCard, { backgroundColor: theme.colors.cardBg }]}>
        <Text style={[styles.orderTitle, { color: theme.colors.text }]}>Сводка заказа</Text>

        <View style={[styles.orderItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>Услуга</Text>
          <Text style={[styles.orderValue, { color: theme.colors.text }]}>{bookingData.serviceType}</Text>
        </View>

        <View style={[styles.orderItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>Гость</Text>
          <Text style={[styles.orderValue, { color: theme.colors.text }]}>{bookingData.guestName}</Text>
        </View>

        <View style={[styles.orderItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>Дата заезда</Text>
          <Text style={[styles.orderValue, { color: theme.colors.text }]}>{bookingData.checkIn}</Text>
        </View>

        <View style={[styles.orderItem, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.orderLabel, { color: theme.colors.textSecondary }]}>Дата выезда</Text>
          <Text style={[styles.orderValue, { color: theme.colors.text }]}>{bookingData.checkOut}</Text>
        </View>

        <View style={styles.orderItem}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Итого</Text>
          <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>₽ {bookingData.amount.toLocaleString('ru-RU')}</Text>
        </View>
      </View>

      {/* Payment Methods */}
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Способ оплаты</Text>

      {renderPaymentMethodButton(
        PAYMENT_METHODS.PAYPAL,
        'payment',
        'PayPal',
        'Быстрая и безопасная оплата',
        () => setSelectedPaymentMethod(PAYMENT_METHODS.PAYPAL)
      )}

      {renderPaymentMethodButton(
        PAYMENT_METHODS.VISA,
        'credit-card',
        'Visa / Mastercard',
        'Оплата по банковской карте',
        () => setSelectedPaymentMethod(PAYMENT_METHODS.VISA)
      )}

      {renderPaymentMethodButton(
        PAYMENT_METHODS.CRYPTO,
        'currency-btc',
        'Криптовалюта',
        'Bitcoin, Ethereum, USDT',
        () => setSelectedPaymentMethod(PAYMENT_METHODS.CRYPTO)
      )}

      {/* PayPal Payment Form */}
      {selectedPaymentMethod === PAYMENT_METHODS.PAYPAL && (
        <View style={[styles.formCard, { backgroundColor: theme.colors.cardBg }]}>
          <MaterialIcons name="info" size={20} color={theme.colors.primary} />
          <Text style={[styles.formInfo, { color: theme.colors.text }]}>
            Вы будете перенаправлены на безопасный сервер PayPal для завершения платежа.
          </Text>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePayPalPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="payment" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Оплатить через PayPal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Visa Payment Form */}
      {selectedPaymentMethod === PAYMENT_METHODS.VISA && (
        <View style={[styles.formCard, { backgroundColor: theme.colors.cardBg }]}>
          <Text style={[styles.formLabel, { color: theme.colors.text }]}>Номер карты</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={theme.colors.textSecondary}
            value={cardData.number}
            onChangeText={(text) => setCardData({ ...cardData, number: text })}
            keyboardType="numeric"
            maxLength={19}
          />

          <Text style={[styles.formLabel, { color: theme.colors.text }]}>Имя держателя</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Ivan Petrov"
            placeholderTextColor={theme.colors.textSecondary}
            value={cardData.name}
            onChangeText={(text) => setCardData({ ...cardData, name: text })}
          />

          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>Срок действия</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="MM/YY"
                placeholderTextColor={theme.colors.textSecondary}
                value={cardData.expiry}
                onChangeText={(text) => setCardData({ ...cardData, expiry: text })}
                maxLength={5}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.formLabel, { color: theme.colors.text }]}>CVV</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="123"
                placeholderTextColor={theme.colors.textSecondary}
                value={cardData.cvv}
                onChangeText={(text) => setCardData({ ...cardData, cvv: text })}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleVisaPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Оплатить {bookingData.amount} ₽</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.securityNote, { color: theme.colors.textSecondary }]}>
            ✓ Ваши данные защищены шифрованием SSL
          </Text>
        </View>
      )}

      {/* Crypto Payment Form */}
      {selectedPaymentMethod === PAYMENT_METHODS.CRYPTO && (
        <View style={[styles.formCard, { backgroundColor: theme.colors.cardBg }]}>
          <Text style={[styles.formLabel, { color: theme.colors.text }]}>Выберите криптовалюту</Text>
          {Object.entries(CRYPTO_OPTIONS).map(([key, crypto]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.cryptoOption,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: selectedCrypto === key ? theme.colors.primary : theme.colors.border,
                  borderWidth: selectedCrypto === key ? 2 : 1,
                }
              ]}
              onPress={() => setSelectedCrypto(key)}
            >
              <Text style={styles.cryptoIcon}>{crypto.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cryptoName, { color: theme.colors.text }]}>{crypto.name}</Text>
                <Text style={[styles.cryptoSymbol, { color: theme.colors.textSecondary }]}>{crypto.symbol}</Text>
              </View>
              {selectedCrypto === key && (
                <MaterialIcons name="check-circle" size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleCryptoPayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="qr-code" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Получить QR-код</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>

    <CryptoQRModal
      visible={showCryptoModal}
      cryptoPayment={cryptoPayment}
      selectedCrypto={selectedCrypto}
      onConfirm={handleCryptoConfirm}
      onClose={() => setShowCryptoModal(false)}
      theme={theme}
    />
  </>
  );
}

// Crypto QR Modal
function CryptoQRModal({ visible, cryptoPayment, selectedCrypto, onConfirm, onClose, theme }) {
  if (!cryptoPayment) return null;

  const crypto = CRYPTO_OPTIONS[selectedCrypto];
  const qrValue = JSON.stringify({
    address: cryptoPayment.walletAddress,
    amount: cryptoPayment.amount / 100000,
    currency: selectedCrypto.toUpperCase(),
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Оплата в {crypto.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.qrLabel, { color: theme.colors.text }]}>Сумма:</Text>
            <Text style={[styles.qrAmount, { color: theme.colors.primary }]}>
              {(cryptoPayment.amount / 100000).toFixed(6)} {crypto.symbol}
            </Text>

            <Text style={[styles.qrLabel, { color: theme.colors.text, marginTop: spacing.lg }]}>QR-код для оплаты:</Text>
            <View style={[styles.qrContainer, { backgroundColor: theme.colors.background }]}>
              <QRCode
                value={qrValue}
                size={250}
                color={theme.colors.text}
                backgroundColor={theme.colors.background}
              />
            </View>

            <Text style={[styles.qrLabel, { color: theme.colors.text, marginTop: spacing.lg }]}>Адрес кошелька:</Text>
            <View style={[styles.addressBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <Text style={[styles.addressText, { color: theme.colors.text }]}>{cryptoPayment.walletAddress}</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Скопировано', 'Адрес скопирован в буфер обмена')}
              >
                <MaterialIcons name="content-copy" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.warning, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent }]}>
              <MaterialIcons name="warning" size={20} color={theme.colors.accent} />
              <Text style={[styles.warningText, { color: theme.colors.text }]}>
                Убедитесь, что вы отправляете ровно указанную сумму на этот адрес
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>Я отправил платёж</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flexGrow: 1,
  },
  orderCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  orderLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  orderValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodDesc: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  formCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formInfo: {
    fontSize: 13,
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
  },
  payButton: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 12,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  cryptoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cryptoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    width: 30,
    textAlign: 'center',
  },
  cryptoName: {
    fontSize: 14,
    fontWeight: '600',
  },
  cryptoSymbol: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: spacing.lg,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  qrContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.lg,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  warning: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  confirmButton: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: spacing.lg,
    marginBottom: spacing.xl,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export { CryptoQRModal };
