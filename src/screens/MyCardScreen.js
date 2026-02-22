import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../constants/theme';
import { GradientView } from '../components/GradientView';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePayment } from '../context/PaymentContext';
import LoyaltyCardService from '../services/LoyaltyCardService';
import { ScaleInCard, FadeInCard, SlideInBottomCard } from '../components/AnimatedCard';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiUrl();

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { topUpCard, getCardBalance } = usePayment();
  const colors = theme.colors;
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accrued, setAccrued] = useState(0); // начислено рублей (totalEarned из БД)
  const [cardFlipped, setCardFlipped] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    bookings: 0,
    nights: 0,
    totalSpent: 0,
    nextLevel: 200000,
  });

  // Загружаем баланс карты лояльности при загрузке экрана
  useEffect(() => {
    loadCardData();
    loadUserStats();
  }, [user?.id]);

  // Обновляем данные каждый раз, когда экран приходит в фокус
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 MyCardScreen: useFocusEffect вызвана');
      loadCardData();
      loadUserStats();
    }, [])
  );

  const loadCardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const card = await LoyaltyCardService.getCard(user.id);
      setBalance(card.balance);
      // Берем накопленный кэшбек из БД
      setAccrued(parseFloat(card.totalEarned) || 0);
    } catch (error) {
      console.error('❌ Ошибка загрузки карты:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные карты');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      if (!user?.id) return;
      
      // Загружаем бронирования для расчета статистики
      const response = await fetch(`${API_BASE_URL}/bookings/user/${user.id}`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.bookings)) {
        // Фильтруем только завершенные бронирования
        const completedBookings = data.bookings.filter(booking => booking.status === 'completed');
        const bookingCount = completedBookings.length;
        
        // Считаем общее количество ночей и потраченную сумму
        let totalNights = 0;
        let totalSpent = 0;
        
        completedBookings.forEach(booking => {
          // Вычисляем количество ночей из дат (ДД.MM.YYYY)
          const [dayIn, monthIn, yearIn] = booking.checkInDate.split('.');
          const [dayOut, monthOut, yearOut] = booking.checkOutDate.split('.');
          
          const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
          const checkOutDate = new Date(yearOut, monthOut - 1, dayOut);
          
          const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
          const price = parseFloat(booking.totalPrice) || 0;
          
          totalNights += nights;
          totalSpent += price;
        });
        
        setStats({
          bookings: bookingCount,
          nights: totalNights,
          totalSpent: totalSpent,
          nextLevel: 200000,
        });
        
        // Примечание: кэшбек (accrued) уже загружается из БД в loadCardData()
        // через LoyaltyCardService и хранит totalEarned от сервера.
        // Не пересчитываем его здесь, так как на сервере он рассчитывается
        // как процент от цены каждого бронирования в зависимости от membership level
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
      // Используем значения по умолчанию если ошибка
      setStats(prev => ({ ...prev }));
    }
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

  // Преимущества каждого уровня
  const levelBenefits = {
    Bronze: [
      '• Кэшбек 10% от успешного бронирования',
    ],
    Silver: [
      '• Кэшбек 20% от успешного бронирования',
      '• Бесплатное пользование кухонным сервизом',
    ],
    Gold: [
      '• Кэшбек 30% от успешного бронирования',
      '• Бесплатное пользование кухонным сервизом',
      '• Скидка 20% на услугу парилки',
    ],
    Platinum: [
      '• Кэшбек 40% от успешного бронирования',
      '• Бесплатное пользование кухонным сервизом',
      '• Скидка 40% на услугу парилки',
      '• Первый час парилки бесплатный',
    ],
  };

  const getBenefitsForLevel = (level) => {
    return levelBenefits[level] || levelBenefits['Bronze'];
  };

  const handleTopUp = async () => {
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
      `Вы хотите пополнить баланс на ${amount}PRB через ${selectedPaymentMethod}?`,
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Подтвердить',
          onPress: () => processTopUp(amount),
        },
      ]
    );
  };

  const processTopUp = async (amount) => {
    if (!user?.id) {
      Alert.alert('Ошибка', 'Пользователь не авторизован');
      return;
    }

    try {
      setIsProcessing(true);
      const paymentMethodLabel = selectedPaymentMethod?.split(' - ')[0] || 'card';
      
      // Используем новый PaymentContext API
      const result = await topUpCard(user.id, amount, paymentMethodLabel);
      
      if (result.success) {
        setBalance(result.newBalance);
        setTopUpModalVisible(false);
        setSelectedPaymentMethod(null);
        setTopUpAmount('');
        
        Alert.alert('✅ Успешно', `Баланс пополнен на ${amount}₽\nНовый баланс: ${result.newBalance}₽`);
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось пополнить баланс');
      }
    } catch (error) {
      console.error('❌ Ошибка пополнения:', error);
      Alert.alert('Ошибка', 'Не удалось пополнить баланс: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const userMembershipLevel = user?.membershipLevel || stats.currentLevel;
  const levelData = levelColors[userMembershipLevel];
  const progressPercent = stats.totalSpent && stats.nextLevel ? (stats.totalSpent / stats.nextLevel) * 100 : 0;

  const getRoleLabel = (role) => {
    const roles = {
      'user': 'Пользователь',
      'admin': 'Администратор',
    };
    return roles[role] || 'Пользователь';
  };

  const getLevelGradient = (level) => {
    const gradients = {
      'Platinum': ['#8B5FBF', '#6B3FA0', '#4A1F7F'],
      'Gold': ['#CC8800', '#B87500', '#A66600'],
      'Silver': ['#8B8B8B', '#6B6B6B', '#4A4A4A'],
      'Bronze': ['#8B6F47', '#6B4F2F', '#4B3F1F'],
    };
    return gradients[level] || ['#CC4C0A', '#AA3C00', '#8A2C00'];
  };

  const getLevelBorderColor = (level) => {
    const colors_map = {
      'Platinum': '#B366FF',
      'Gold': '#FFA500',
      'Silver': '#A9A9A9',
      'Bronze': '#8B4513',
    };
    return colors_map[level] || colors.primary;
  };

  const styles = useMemo(() => StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    paddingBottom: 50, // Место для плавающей кнопки
  },
  cardContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    height: 240,
    justifyContent: 'space-between',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    borderWidth: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardDecor1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardDecor2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardDecor3: {
    position: 'absolute',
    top: '50%',
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.95,
    letterSpacing: 1.2,
  },
  cardMiddle: {
    paddingVertical: spacing.lg,
  },
  cardNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 3,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardSmallLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.85,
    marginBottom: spacing.xs,
  },
  cardHolderName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardStatus: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBackTop: {
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardBackLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.95,
    letterSpacing: 1.2,
  },
  balanceDisplay: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  balanceSmallText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.85,
    marginTop: spacing.md,
  },
  cardBackBottom: {
    alignItems: 'center',
  },
  cardBackSmallText: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.75,
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
    padding: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 0,
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  cashbackValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  cashbackValueLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  floatingTopUpButton: {
    position: 'absolute',
    bottom: 20, // отступ от нижней панели навигации
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  floatingTopUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
}), [colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Карта */}
        <ScaleInCard delay={100} style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={[
              styles.cardContainer,
              { 
                borderColor: getLevelBorderColor(userMembershipLevel),
                overflow: 'hidden',
              }
            ]}
            onPress={() => setCardFlipped(!cardFlipped)}
            activeOpacity={0.8}
          >
            <GradientView
              colors={getLevelGradient(userMembershipLevel)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Декоративные элементы */}
            <View style={styles.cardDecor1} />
            <View style={styles.cardDecor2} />
            <View style={styles.cardDecor3} />

            {!cardFlipped ? (
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardLabel}>КАРТА ЛОЯЛЬНОСТИ</Text>
                  <MaterialCommunityIcons name="credit-card-wireless" size={36} color="#fff" />
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
                    <Text style={styles.cardStatus}>
                      {isAdmin ? '⚙️ ' + getRoleLabel(user?.role) : levelData.icon + ' ' + userMembershipLevel}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.cardBackContent}>
                <View style={styles.cardBackTop}>
                  <Text style={styles.cardBackLabel}>БАЛАНС СЧЕТА</Text>
                </View>
                <View style={styles.balanceDisplay}>
                  <Text style={styles.balanceAmount}>{balance.toLocaleString('ru-RU')}PRB</Text>
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
      <FadeInCard delay={200} style={{ marginBottom: spacing.lg }}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <View style={{ backgroundColor: '#FF6B35' + '20', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
              <MaterialIcons name="event-note" size={28} color="#FF6B35" />
            </View>
            <Text style={styles.statNumber}>{stats.bookings}</Text>
            <Text style={styles.statLabel}>Бронирований</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ backgroundColor: '#FF9F43' + '20', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
              <MaterialIcons name="hotel" size={28} color="#FF9F43" />
            </View>
            <Text style={styles.statNumber}>{stats.nights}</Text>
            <Text style={styles.statLabel}>Ночей</Text>
          </View>
          <View style={styles.statBox}>
            <View style={{ backgroundColor: '#10B981' + '20', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }}>
              <MaterialIcons name="attach-money" size={28} color="#10B981" />
            </View>
            <Text style={styles.statNumber}>{(stats.totalSpent / 1000).toFixed(1)}К</Text>
            <Text style={styles.statLabel}>Потрачено</Text>
          </View>
        </View>
      </FadeInCard>

      {/* Прогресс уровня */}
      {!isAdmin && (
      <ScaleInCard delay={250} style={{ marginBottom: spacing.lg }}>
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelTitle}>
              {levelData.icon} Ваш уровень: {userMembershipLevel}
            </Text>
            <Text style={styles.levelSubtext}>Еще {Math.max(0, stats.nextLevel - (stats.totalSpent || 0)).toLocaleString('ru-RU')}PRB до Platinum</Text>
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

          <View style={[styles.levelBenefits, { backgroundColor: `${colors.primary}10` }]}>
            <Text style={styles.benefitTitle}>🎁 Преимущества уровня:</Text>
            {getBenefitsForLevel(userMembershipLevel).map((benefit, index) => (
              <Text key={index} style={styles.benefitText}>{benefit}</Text>
            ))}
          </View>
        </View>
      </ScaleInCard>
      )}

      {/* Кэшбек */}
      {!isAdmin && (
      <FadeInCard delay={300} style={{ marginBottom: spacing.lg }}>
        <View style={styles.cashbackCard}>
          <View style={styles.cashbackHeader}>
            <Text style={styles.cashbackTitle}>💰 Накопленный кэшбек</Text>
            <MaterialIcons name="info" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.cashbackProgress}>
            <View style={[styles.cashbackCircle, { backgroundColor: `${colors.success}20` }]}>
              <Text style={styles.cashbackValue}>{accrued.toLocaleString('ru-RU')}</Text>
              <Text style={styles.cashbackValueLabel}>PRB</Text>
            </View>
            <View style={styles.cashbackInfo}>
              <Text style={styles.cashbackInfoLabel}>Всего начислено</Text>
              <Text style={styles.cashbackInfoValue}>
                {accrued.toLocaleString('ru-RU')}PRB
              </Text>
              <Text style={styles.cashbackInfoSmall}>Уровень лояльности: {userMembershipLevel}</Text>
            </View>
          </View>

          <View style={styles.cashbackDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Всего начислено:</Text>
              <Text style={styles.detailValue}>+{isNaN(accrued) ? 0 : accrued}PRB</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Текущий баланс:</Text>
              <Text style={styles.detailValue}>{isNaN(balance) ? 0 : balance}PRB</Text>
            </View>
          </View>
        </View>
      </FadeInCard>
      )}
      </ScrollView>

      {/* Зафиксированная кнопка пополнения */}
      <TouchableOpacity
        style={[styles.floatingTopUpButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('CardTopUp')}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={styles.floatingTopUpButtonText}>Пополнить баланс</Text>
      </TouchableOpacity>

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
                    selectedPaymentMethod === method.name && [
                      styles.paymentMethodCardSelected,
                      { backgroundColor: `${colors.primary}10` },
                    ],
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
                <Text style={styles.currencyLabel}>PRB</Text>
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
                    <Text style={styles.quickAmountText}>{amount.toLocaleString('ru-RU')}PRB</Text>
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
                  {topUpAmount ? `Пополнить на ${parseInt(topUpAmount).toLocaleString('ru-RU')}PRB` : 'Введите сумму'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
