import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ScaleInCard, FadeInCard, SlideInBottomCard } from '../components/AnimatedCard';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [balance, setBalance] = useState(12500);
  const [cashback, setCashback] = useState(65); // процент накопленного кэшбека
  const [cardFlipped, setCardFlipped] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  const stats = {
    bookings: 12,
    nights: 47,
    totalSpent: 156400,
    nextLevel: 200000,
    currentLevel: 'Gold',
  };

  const paymentMethods = [
    { id: '1', name: '💳 Кредитная карта', description: 'Visa, MasterCard, Maestro' },
    { id: '2', name: '🏦 Банковский перевод', description: 'Перевод на счет' },
    { id: '3', name: '📱 Цифровой кошелек', description: 'Apple Pay, Google Pay' },
    { id: '4', name: '🎫 Яндекс.Касса', description: 'Быстрая оплата' },
  ];

  const levelColors = {
    Silver: { color: '#C0C0C0', icon: '🥈' },
    Gold: { color: '#FFD700', icon: '🥇' },
    Platinum: { color: '#E5D4FF', icon: '👑' },
    Bronze: { color: '#CD7F32', icon: '🥉' },
  };

  const handleTopUp = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('⚠️ Выберите способ оплаты', 'Пожалуйста, выберите один из доступных способов');
      return;
    }
    if (!topUpAmount || isNaN(topUpAmount) || parseInt(topUpAmount) <= 0) {
      Alert.alert('⚠️ Введите сумму', 'Пожалуйста, введите корректную сумму');
      return;
    }

    const amount = parseInt(topUpAmount);
    Alert.alert(
      '✅ Подтверждение',
      `Вы хотите пополнить баланс на ${amount}₽ через ${selectedPaymentMethod}?`,
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Подтвердить',
          onPress: () => {
            setBalance(balance + amount);
            setTopUpModalVisible(false);
            setSelectedPaymentMethod(null);
            setTopUpAmount('');
            Alert.alert('✅ Успешно', `Баланс пополнен на ${amount}₽`);
          },
        },
      ]
    );
  };

  const levelData = levelColors[stats.currentLevel];
  const progressPercent = (stats.totalSpent / stats.nextLevel) * 100;

  const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    paddingBottom: spacing.lg,
  },
  cardContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    height: 220,
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    justifyContent: 'space-between',
    flex: 1,
  },
  cardBackContent: {
    justifyContent: 'space-between',
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  cardMiddle: {
    paddingVertical: spacing.lg,
  },
  cardNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardSmallLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  cardHolderName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardStatus: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardBackTop: {
    alignItems: 'center',
  },
  cardBackLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  balanceDisplay: {
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  balanceSmallText: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    marginTop: spacing.sm,
  },
  cardBackBottom: {
    alignItems: 'center',
  },
  cardBackSmallText: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.7,
  },
  cardFlipHint: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  userInfoCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  userInfoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  levelCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  levelHeader: {
    marginBottom: spacing.md,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  levelSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  levelBenefits: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  cashbackCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cashbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cashbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cashbackProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cashbackCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  cashbackPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
  },
  cashbackInfo: {
    flex: 1,
  },
  cashbackInfoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cashbackInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  cashbackInfoSmall: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cashbackDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  topUpButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  topUpButtonTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topUpButtonSubtitle: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    marginTop: spacing.xs,
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
  },
  modalBody: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentMethodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  paymentMethodDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmTopUpButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  confirmTopUpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Карта */}
      <ScaleInCard delay={100} style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity
          style={[
            styles.cardContainer,
            { backgroundColor: levelData.color || colors.primary },
          ]}
          onPress={() => setCardFlipped(!cardFlipped)}
          activeOpacity={0.8}
        >
          {!cardFlipped ? (
            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.cardLabel}>КАРТА ЛОЯЛЬНОСТИ</Text>
                <MaterialCommunityIcons name="contactless" size={32} color="#fff" />
              </View>

              <View style={styles.cardMiddle}>
                <Text style={styles.cardNumber}>•••• •••• •••• {String(Math.floor(Math.random() * 10000)).padStart(4, '0')}</Text>
              </View>

              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.cardSmallLabel}>Держатель</Text>
                  <Text style={styles.cardHolderName}>{user?.name || 'Иван Петров'}</Text>
                </View>
                <View>
                  <Text style={styles.cardSmallLabel}>Статус</Text>
                  <Text style={styles.cardStatus}>{levelData.icon} {stats.currentLevel}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cardBackContent}>
              <View style={styles.cardBackTop}>
                <Text style={styles.cardBackLabel}>БАЛАНС СЧЕТА</Text>
              </View>
              <View style={styles.balanceDisplay}>
                <Text style={styles.balanceAmount}>{balance.toLocaleString('ru-RU')}₽</Text>
                <Text style={styles.balanceSmallText}>Доступно для использования</Text>
              </View>
              <View style={styles.cardBackBottom}>
                <Text style={styles.cardBackSmallText}>Нажмите для информации о карте</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.cardFlipHint}>{cardFlipped ? '← Коснитесь для обратной стороны' : 'Коснитесь для баланса →'}</Text>
      </ScaleInCard>

      {/* ФИО и основная информация */}
      <FadeInCard delay={150} style={{ marginBottom: spacing.lg }}>
        <View style={styles.userInfoCard}>
          <View style={styles.userInfoRow}>
            <MaterialIcons name="person" size={20} color={colors.primary} />
            <View style={styles.userInfoText}>
              <Text style={styles.infoLabel}>Полное имя</Text>
              <Text style={styles.infoValue}>{user?.name || user?.displayName || 'Пользователь'}</Text>
            </View>
          </View>
          <View style={[styles.userInfoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <MaterialIcons name="email" size={20} color={colors.primary} />
            <View style={styles.userInfoText}>
              <Text style={styles.infoLabel}>Электронная почта</Text>
              <Text style={styles.infoValue}>{user?.email || 'email@example.com'}</Text>
            </View>
          </View>
          <View style={[styles.userInfoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <MaterialIcons name="phone" size={20} color={colors.primary} />
            <View style={styles.userInfoText}>
              <Text style={styles.infoLabel}>Номер телефона</Text>
              <Text style={styles.infoValue}>{user?.phone || '+7 (XXX) XXX-XX-XX'}</Text>
            </View>
          </View>
        </View>
      </FadeInCard>

      {/* Статистика бронирований */}
      <SlideInBottomCard delay={200} style={{ marginBottom: spacing.lg }}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <MaterialIcons name="event-note" size={24} color={colors.primary} />
            <Text style={styles.statNumber}>{stats.bookings}</Text>
            <Text style={styles.statLabel}>Бронирований</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: colors.border, borderRightWidth: 1 }]}>
            <MaterialIcons name="hotel" size={24} color={colors.accent} />
            <Text style={styles.statNumber}>{stats.nights}</Text>
            <Text style={styles.statLabel}>Ночей</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons name="payments" size={24} color={colors.success} />
            <Text style={styles.statNumber}>{(stats.totalSpent / 1000).toFixed(0)}К</Text>
            <Text style={styles.statLabel}>Потрачено</Text>
          </View>
        </View>
      </SlideInBottomCard>

      {/* Прогресс уровня */}
      <ScaleInCard delay={250} style={{ marginBottom: spacing.lg }}>
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>
              {levelData.icon} Ваш уровень: {stats.currentLevel}
            </Text>
            <Text style={styles.levelSubtext}>Еще {(stats.nextLevel - stats.totalSpent).toLocaleString('ru-RU')}₽ до Platinum</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercent, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progressPercent)}%</Text>
          </View>

          <View style={styles.levelBenefits}>
            <Text style={styles.benefitTitle}>🎁 Преимущества уровня:</Text>
            <Text style={styles.benefitText}>• +1% дополнительный кэшбек на покупки</Text>
            <Text style={styles.benefitText}>• Приоритет при бронировании</Text>
            <Text style={styles.benefitText}>• Скидки на услуги СПА</Text>
            <Text style={styles.benefitText}>• Персональный менеджер</Text>
          </View>
        </View>
      </ScaleInCard>

      {/* Кэшбек */}
      <FadeInCard delay={300} style={{ marginBottom: spacing.lg }}>
        <View style={styles.cashbackCard}>
          <View style={styles.cashbackHeader}>
            <Text style={styles.cashbackTitle}>💰 Накопленный кэшбек</Text>
            <MaterialIcons name="info" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.cashbackProgress}>
            <View style={styles.cashbackCircle}>
              <Text style={styles.cashbackPercent}>{cashback}%</Text>
            </View>
            <View style={styles.cashbackInfo}>
              <Text style={styles.cashbackInfoLabel}>Можно использовать</Text>
              <Text style={styles.cashbackInfoValue}>
                {Math.round((cashback / 100) * balance)}₽ из {balance}₽
              </Text>
              <Text style={styles.cashbackInfoSmall}>достигнет 100% через ~{Math.round(((100 - cashback) / 100) * 30)} дней</Text>
            </View>
          </View>

          <View style={styles.cashbackDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Начислено:</Text>
              <Text style={styles.detailValue}>+{Math.round((stats.totalSpent * 0.01))}₽</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Использовано:</Text>
              <Text style={styles.detailValue}>-{Math.round((stats.totalSpent * 0.01 * (100 - cashback) / 100))}₽</Text>
            </View>
          </View>
        </View>
      </FadeInCard>

      {/* Кнопка пополнения */}
      <SlideInBottomCard delay={350} style={{ marginBottom: spacing.lg }}>
        <TouchableOpacity
          style={styles.topUpButton}
          onPress={() => setTopUpModalVisible(true)}
        >
          <MaterialIcons name="add-circle" size={24} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.topUpButtonTitle}>Пополнить баланс</Text>
            <Text style={styles.topUpButtonSubtitle}>Выберите удобный способ оплаты</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
      </SlideInBottomCard>

      {/* Модаль пополнения */}
      <Modal visible={topUpModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Пополнить баланс</Text>
              <TouchableOpacity onPress={() => setTopUpModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Способы оплаты */}
              <Text style={styles.sectionTitle}>Выберите способ оплаты:</Text>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentMethodCard,
                    selectedPaymentMethod === method.name && styles.paymentMethodCardSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method.name)}
                >
                  <View style={styles.paymentMethodRadio}>
                    {selectedPaymentMethod === method.name && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDesc}>{method.description}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}

              {/* Сумма пополнения */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Сумма пополнения:</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencyLabel}>₽</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Введите сумму"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={topUpAmount}
                  onChangeText={setTopUpAmount}
                />
              </View>

              {/* Быстрые суммы */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Популярные суммы:</Text>
              <View style={styles.quickAmountsContainer}>
                {[1000, 5000, 10000, 25000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setTopUpAmount(String(amount))}
                  >
                    <Text style={styles.quickAmountText}>{amount.toLocaleString('ru-RU')}₽</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Кнопка подтверждения */}
              <TouchableOpacity
                style={styles.confirmTopUpButton}
                onPress={handleTopUp}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.confirmTopUpButtonText}>
                  {topUpAmount ? `Пополнить на ${parseInt(topUpAmount).toLocaleString('ru-RU')}₽` : 'Введите сумму'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
