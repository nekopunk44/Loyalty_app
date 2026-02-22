import React, { useState, useEffect } from 'react';
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
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../context/PaymentContext';
import { useNotification } from '../context/NotificationContext';

export default function CardTopUpScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { topUpCard, getCardBalance, cardBalance, setCardBalance, isProcessing, paymentError } = usePayment();
  const { notifyPaymentSuccess } = useNotification();

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recentTopUps, setRecentTopUps] = useState([]);

  const paymentMethods = [
    { id: 'card', label: 'Кредитная/дебетовая карта', icon: 'credit-card', color: '#2196F3' },
    { id: 'paypal', label: 'PayPal', icon: 'paypal', color: '#003087' },
    { id: 'bank_transfer', label: 'Банковский перевод', icon: 'bank', color: '#4CAF50' },
    { id: 'crypto', label: 'Криптовалюта', icon: 'bitcoin', color: '#F7931A' },
  ];

  const presetAmounts = [100, 500, 1000, 5000, 10000];

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const data = await getCardBalance(user.id);
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить баланс карты');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmount = (amount) => {
    setTopUpAmount(amount.toString());
  };

  const handleCustomAmount = (text) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setTopUpAmount(cleaned);
  };

  const validateAmount = () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      Alert.alert('Ошибка', 'Пожалуйста, введите сумму больше 0');
      return false;
    }
    if (parseFloat(topUpAmount) > 1000000) {
      Alert.alert('Ошибка', 'Максимальная сумма пополнения: 1,000,000₽');
      return false;
    }
    return true;
  };

  const handleConfirmTopUp = async () => {
    if (!validateAmount()) return;

    setShowConfirmModal(false);

    try {
      await topUpCard(user.id, parseFloat(topUpAmount), selectedMethod);
      
      Alert.alert('✅ Успешно', `Ваша карта пополнена на ${topUpAmount}₽`, [
        {
          text: 'Ок',
          onPress: () => {
            setTopUpAmount('');
            loadBalance();
            notifyPaymentSuccess?.();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('❌ Ошибка', error.message || 'Не удалось пополнить карту');
    }
  };

  const getMethodInfo = (methodId) => {
    return paymentMethods.find(m => m.id === methodId) || paymentMethods[0];
  };

  const currentMethod = getMethodInfo(selectedMethod);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <MaterialIcons name="account-balance-wallet" size={50} color="#fff" />
        <Text style={styles.headerTitle}>Пополнение карты</Text>
        <Text style={styles.headerSubtitle}>Добавьте средства на свой счет</Text>
      </View>

      {/* Current Balance */}
      <View style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.balanceContent}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
            Текущий баланс
          </Text>
          <Text style={[styles.balanceAmount, { color: theme.colors.primary }]}>
            {balance.toLocaleString('ru-RU')}₽
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
          onPress={loadBalance}
          disabled={loadingBalance}
        >
          {loadingBalance ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="refresh" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {paymentError ? (
        <View style={[styles.errorBox, { backgroundColor: '#ffebee' }]}>
          <MaterialIcons name="error-outline" size={20} color="#c62828" />
          <Text style={[styles.errorText, { color: '#c62828' }]}>{paymentError}</Text>
        </View>
      ) : null}

      {/* Amount Selection */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Выберите сумму пополнения
        </Text>

        {/* Preset Amounts */}
        <View style={styles.presetsGrid}>
          {presetAmounts.map(amount => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.presetButton,
                {
                  backgroundColor:
                    topUpAmount === amount.toString() ? theme.colors.primary : theme.colors.background,
                  borderColor: theme.colors.primary,
                },
              ]}
              onPress={() => handleSelectAmount(amount)}
            >
              <Text
                style={[
                  styles.presetText,
                  {
                    color: topUpAmount === amount.toString() ? '#fff' : theme.colors.text,
                    fontWeight: '600',
                  },
                ]}
              >
                {amount.toLocaleString('ru-RU')}₽
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Amount Input */}
        <View style={[styles.customAmountBox, { backgroundColor: theme.colors.background }]}>
          <MaterialIcons name="input" size={20} color={theme.colors.primary} />
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            placeholder="Или введите свою сумму"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={topUpAmount}
            onChangeText={handleCustomAmount}
          />
          <Text style={[styles.currencyLabel, { color: theme.colors.textSecondary }]}>
            ₽
          </Text>
        </View>
      </View>

      {/* Payment Method Selection */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Способ оплаты
        </Text>

        <TouchableOpacity
          style={[styles.methodSelector, { borderColor: theme.colors.border }]}
          onPress={() => setShowMethodPicker(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <MaterialCommunityIcons
              name={currentMethod.icon}
              size={24}
              color={currentMethod.color}
              style={{ marginRight: spacing.sm }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.methodName, { color: theme.colors.text }]}>
                {currentMethod.label}
              </Text>
              <Text style={[styles.methodDescription, { color: theme.colors.textSecondary }]}>
                {selectedMethod === 'card' && 'Карты Visa, MasterCard, Maestro'}
                {selectedMethod === 'paypal' && 'Быстрая и безопасная оплата'}
                {selectedMethod === 'bank_transfer' && 'Прямой перевод на банковский счет'}
                {selectedMethod === 'crypto' && 'Bitcoin, Ethereum и другие'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: '#e3f2fd' }]}>
        <MaterialIcons name="info" size={20} color="#1976d2" />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[styles.infoTitle, { color: '#1976d2' }]}>
            Безопасная транзакция
          </Text>
          <Text style={[styles.infoText, { color: '#0d47a1' }]}>
            Все платежи защищены шифрованием. Ваши данные не будут переданы третьим лицам.
          </Text>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: topUpAmount ? theme.colors.primary : theme.colors.disabled,
            },
          ]}
          onPress={() => setShowConfirmModal(true)}
          disabled={!topUpAmount || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
              <Text style={styles.buttonText}>Продолжить</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
            Отмена
          </Text>
        </TouchableOpacity>
      </View>

      {/* Method Picker Modal */}
      <Modal
        visible={showMethodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMethodPicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Выберите способ оплаты
              </Text>
              <TouchableOpacity onPress={() => setShowMethodPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={paymentMethods}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    {
                      backgroundColor: selectedMethod === item.id ? '#f5f5f5' : 'transparent',
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedMethod(item.id);
                    setShowMethodPicker(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={28}
                    color={item.color}
                    style={{ marginRight: spacing.md }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodOptionName, { color: theme.colors.text }]}>
                      {item.label}
                    </Text>
                  </View>
                  {selectedMethod === item.id && (
                    <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.confirmModal, { backgroundColor: theme.colors.surface }]}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <MaterialIcons name="check-circle" size={60} color={theme.colors.primary} />
              <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>
                Подтверждение пополнения
              </Text>
            </View>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: theme.colors.textSecondary }]}>
                  Сумма:
                </Text>
                <Text style={[styles.confirmValue, { color: theme.colors.primary }]}>
                  {parseFloat(topUpAmount).toLocaleString('ru-RU')}₽
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmLabel, { color: theme.colors.textSecondary }]}>
                  Способ оплаты:
                </Text>
                <Text style={[styles.confirmValue, { color: theme.colors.text }]}>
                  {currentMethod.label}
                </Text>
              </View>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleConfirmTopUp}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Подтвердить</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelConfirmButton, { borderColor: theme.colors.border }]}
                onPress={() => setShowConfirmModal(false)}
                disabled={isProcessing}
              >
                <Text style={[styles.cancelConfirmButtonText, { color: theme.colors.text }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.md,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  balanceCard: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  balanceContent: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    marginLeft: spacing.md,
    flex: 1,
    fontSize: 14,
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  presetButton: {
    width: '48%',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 14,
  },
  customAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  methodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodDescription: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  infoBox: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtons: {
    margin: spacing.md,
    marginBottom: spacing.lg,
  },
  continueButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  methodOptionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModal: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: 'auto',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  confirmDetails: {
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  confirmLabel: {
    fontSize: 14,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtons: {
    marginTop: spacing.lg,
  },
  confirmButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelConfirmButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
