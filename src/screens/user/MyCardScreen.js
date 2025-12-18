import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Animated, TextInput, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { GradientView } from '../../components/ui/GradientView';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePayment } from '../../context/PaymentContext';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';
import QRCode from 'react-native-qrcode-svg';

const API_BASE_URL = getApiUrl();
const useNative = Platform.OS !== 'web';

const LEVEL_GRADIENT = {
  Platinum: ['#7B2FF7', '#5C16C5', '#3D0085'],
  Gold:     ['#CC8800', '#B07500', '#8A5C00'],
  Silver:   ['#707070', '#505050', '#303030'],
  Bronze:   ['#7A5030', '#5A3818', '#3A2008'],
};
const LEVEL_BORDER = {
  Platinum: '#B366FF', Gold: '#F59E0B', Silver: '#A9A9A9', Bronze: '#CD7F32',
};

const LEVEL_BENEFITS = {
  Bronze:   ['Кэшбек 10% от каждого бронирования'],
  Silver:   ['Кэшбек 20% от каждого бронирования', 'Бесплатный кухонный сервиз'],
  Gold:     ['Кэшбек 30% от каждого бронирования', 'Бесплатный кухонный сервиз', 'Скидка 20% на парилку'],
  Platinum: ['Кэшбек 40% от каждого бронирования', 'Бесплатный кухонный сервиз', 'Скидка 40% на парилку', 'Первый час парилки бесплатно'],
};

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { topUpCard } = usePayment();
  const colors = theme.colors;

  const [balance, setBalance]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [accrued, setAccrued]     = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [topUpAmount, setTopUpAmount]   = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ bookings: 0, nights: 0, totalSpent: 0, nextLevel: 200000 });
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible]   = useState(false);

  // Entrance animations
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const infoAnim   = useRef(new Animated.Value(0)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;
  const levelAnim  = useRef(new Animated.Value(0)).current;
  const cashAnim   = useRef(new Animated.Value(0)).current;

  // Card flip animation
  const flipAnim   = useRef(new Animated.Value(0)).current;

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Stable card number (avoid Math.random() on every render)
  const cardSuffix = useMemo(() => String(Math.floor(Math.random() * 10000)).padStart(4, '0'), []);

  const runEntrance = () => {
    progressAnim.setValue(0);
    const anims = [cardAnim, infoAnim, statsAnim, levelAnim, cashAnim];
    anims.forEach(a => a.setValue(0));
    Animated.stagger(90, anims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: useNative })
    )).start();
    // Progress bar fill after level card appears
    setTimeout(() => {
      const pct = Math.min((stats.totalSpent || 0) / 200000, 1);
      Animated.timing(progressAnim, {
        toValue: pct,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, 500);
  };

  useEffect(() => { loadCardData(); loadUserStats(); }, [user?.id]);

  useFocusEffect(React.useCallback(() => {
    loadCardData();
    loadUserStats();
  }, []));

  useEffect(() => { runEntrance(); }, [loading]);

  const loadCardData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      const card = await LoyaltyCardService.getCard(user.id);
      setBalance(card.balance);
      setAccrued(parseFloat(card.totalEarned) || 0);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные карты');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      if (!user?.id) return;
      const data = await apiCall(`${API_BASE_URL}/bookings/user/${user.id}`);
      if (data.success && Array.isArray(data.bookings)) {
        const done = data.bookings.filter(b => b.status === 'completed');
        let nights = 0, spent = 0;
        done.forEach(b => {
          const [di, mi, yi] = b.checkInDate.split('.');
          const [do_, mo, yo] = b.checkOutDate.split('.');
          nights += Math.ceil((new Date(yo, mo - 1, do_) - new Date(yi, mi - 1, di)) / 86400000);
          spent += parseFloat(b.totalPrice) || 0;
        });
        setStats({ bookings: done.length, nights, totalSpent: spent, nextLevel: 200000 });
      }
    } catch { /* keep defaults */ }
  };

  const handleFlip = () => {
    const toValue = cardFlipped ? 0 : 180;
    Animated.spring(flipAnim, { toValue, friction: 8, tension: 10, useNativeDriver: useNative }).start();
    setCardFlipped(!cardFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const paymentMethods = [
    { id: '1', name: 'Кредитная карта',   desc: 'Visa, MasterCard, Maestro', icon: 'credit-card' },
    { id: '2', name: 'Банковский перевод', desc: 'Перевод на счёт',           icon: 'account-balance' },
    { id: '3', name: 'Цифровой кошелёк',  desc: 'Apple Pay, Google Pay',     icon: 'phone-iphone' },
    { id: '4', name: 'Яндекс.Касса',      desc: 'Быстрая оплата',            icon: 'flash-on' },
  ];

  const isAdmin     = user?.role === 'admin';
  const level       = user?.membershipLevel || 'Bronze';
  const levelColor  = LEVEL_BORDER[level] || LEVEL_BORDER.Bronze;
  const progressPct = Math.min((stats.totalSpent || 0) / 200000, 1);

  const processTopUp = async (amount) => {
    if (!user?.id) return;
    try {
      setIsProcessing(true);
      const label  = selectedPaymentMethod || 'card';
      const result = await topUpCard(user.id, amount, label);
      if (result.success) {
        setBalance(result.newBalance);
        setTopUpModalVisible(false);
        setSelectedPaymentMethod(null);
        setTopUpAmount('');
        Alert.alert('Успешно', `Баланс пополнен на ${amount} PRB`);
      } else {
        Alert.alert('Ошибка', result.message || 'Не удалось пополнить баланс');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTopUp = () => {
    if (!selectedPaymentMethod) { Alert.alert('Выберите способ оплаты'); return; }
    const amt = parseInt(topUpAmount);
    if (!amt || amt <= 0) { Alert.alert('Введите корректную сумму'); return; }
    Alert.alert('Подтверждение', `Пополнить на ${amt} PRB?`, [
      { text: 'Отмена' },
      { text: 'Подтвердить', onPress: () => processTopUp(amt) },
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCardData(), loadUserStats()]);
    setRefreshing(false);
  }, [user?.id]);

  const animStyle = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[S.scroll, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />}
      >

        {/* ── LOYALTY CARD ── */}
        <Animated.View style={[S.cardWrap, animStyle(cardAnim)]}>
          <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} style={{ height: 220, outlineWidth: 0 }}>
            {/* FRONT */}
            <Animated.View style={[S.card, { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }], borderColor: levelColor }]}>
              {/* Base gradient */}
              <GradientView colors={LEVEL_GRADIENT[level] || LEVEL_GRADIENT.Bronze} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

              {/* Diagonal stripe texture */}
              <View style={S.stripeContainer} pointerEvents="none">
                {Array.from({ length: 36 }, (_, i) => (
                  <View key={i} style={S.stripeLine} />
                ))}
              </View>

              {/* Top-left light bloom */}
              <GradientView
                colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={S.cardBloom}
              />
              {/* Bottom-right vignette */}
              <GradientView
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Watermark level text */}
              <Text style={S.cardWatermark}>{level.toUpperCase()}</Text>

              {/* Top row */}
              <View style={S.cardTop}>
                <View>
                  <Text style={S.cardBrandSub}>КАРТА ЛОЯЛЬНОСТИ</Text>
                  <Text style={S.cardBrand}>PRIVILEGE</Text>
                </View>
                <MaterialCommunityIcons name="contactless-payment" size={30} color="rgba(255,255,255,0.9)" />
              </View>

              {/* EMV Chip */}
              <View style={S.chipRow}>
                <View style={S.chip}>
                  <View style={S.chipLineH} />
                  <View style={S.chipLineV} />
                  <View style={S.chipCenter} />
                </View>
              </View>

              {/* Card number */}
              <Text style={S.cardNumber}>•••• •••• •••• {cardSuffix}</Text>

              {/* Bottom */}
              <View style={S.cardBottom}>
                <View style={{ flex: 1 }}>
                  <Text style={S.cardSmallLabel}>ДЕРЖАТЕЛЬ</Text>
                  <Text style={S.cardHolderName} numberOfLines={1}>{(user?.displayName || user?.name || 'Пользователь').toUpperCase()}</Text>
                </View>
                <View style={[S.cardLevelBadge, { borderColor: `${levelColor}80` }]}>
                  <Text style={[S.cardLevelName, { color: levelColor }]}>{level.toUpperCase()}</Text>
                </View>
              </View>
            </Animated.View>

            {/* BACK */}
            <Animated.View style={[S.card, S.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }], borderColor: levelColor }]}>
              <GradientView colors={LEVEL_GRADIENT[level] || LEVEL_GRADIENT.Bronze} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={S.stripeContainer} pointerEvents="none">
                {Array.from({ length: 36 }, (_, i) => (
                  <View key={i} style={S.stripeLine} />
                ))}
              </View>
              <GradientView colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={S.cardBloom} />
              <GradientView colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={S.cardWatermark}>PRB</Text>
              <Text style={S.cardLabel}>БАЛАНС СЧЁТА</Text>
              <View style={S.balanceCenter}>
                <Text style={S.balanceAmount}>{(balance || 0).toLocaleString('ru-RU')}</Text>
                <View style={S.balancePill}>
                  <Text style={S.balanceCurrency}>PRB</Text>
                </View>
                <Text style={S.balanceSub}>Доступно для использования</Text>
              </View>
              <Text style={S.cardFlipHint}>← Нажмите чтобы вернуться</Text>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[S.flipHint, { color: colors.textSecondary }]}>
            {cardFlipped ? '← к информации о карте' : 'Нажмите для просмотра баланса →'}
          </Text>

          <TouchableOpacity style={[S.qrBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => setQrVisible(true)} activeOpacity={0.85}>
            <MaterialIcons name="qr-code" size={20} color={colors.text} />
            <Text style={[S.qrBtnText, { color: colors.text }]}>Показать QR-код</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── USER INFO ── */}
        <Animated.View style={[S.infoCard, { backgroundColor: colors.cardBg }, animStyle(infoAnim)]}>
          {[
            { icon: 'person',  label: 'Полное имя',        value: user?.displayName || user?.name || 'Пользователь', color: '#FF6B35' },
            { icon: 'email',   label: 'Электронная почта', value: user?.email || '—',                                 color: '#3B82F6' },
            { icon: 'phone',   label: 'Номер телефона',    value: user?.phone || '—',                                 color: '#10B981' },
          ].map((row, i, arr) => (
            <View key={row.label} style={[S.infoRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[S.infoIconBox, { backgroundColor: `${row.color}18` }]}>
                <MaterialIcons name={row.icon} size={20} color={row.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[S.infoValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── STATS ── */}
        <Animated.View style={[S.statsCard, { backgroundColor: colors.cardBg }, animStyle(statsAnim)]}>
          {[
            { icon: 'event-note',    label: 'Бронирований', value: stats.bookings,                         color: '#FF6B35' },
            { icon: 'hotel',         label: 'Ночей',        value: stats.nights,                           color: '#F59E0B' },
            { icon: 'attach-money',  label: 'Потрачено',    value: `${(stats.totalSpent/1000).toFixed(1)}K`, color: '#10B981' },
          ].map((s, i, arr) => (
            <View key={s.label} style={[S.statBox, i < arr.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}>
              <View style={[S.statIconCircle, { backgroundColor: `${s.color}18` }]}>
                <MaterialIcons name={s.icon} size={26} color={s.color} />
              </View>
              <Text style={[S.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[S.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── LEVEL PROGRESS ── */}
        {!isAdmin && (
          <Animated.View style={[S.levelCard, { backgroundColor: colors.cardBg }, animStyle(levelAnim)]}>
            {/* Header */}
            <View style={[S.levelHeader, { borderLeftColor: levelColor }]}>
              <Text style={[S.levelHeaderText, { color: colors.text }]}>
                Уровень: {level}
              </Text>
              <View style={[S.levelBadge, { backgroundColor: `${levelColor}20`, borderColor: `${levelColor}50` }]}>
                <Text style={[S.levelBadgeText, { color: levelColor }]}>
                  {Math.round(progressPct * 100)}%
                </Text>
              </View>
            </View>

            {/* Progress */}
            <View style={S.progressWrap}>
              <View style={[S.progressTrack, { backgroundColor: colors.border }]}>
                <Animated.View style={[S.progressFill, {
                  backgroundColor: levelColor,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]} />
              </View>
              <Text style={[S.progressNote, { color: colors.textSecondary }]}>
                Ещё {Math.max(0, 200000 - (stats.totalSpent || 0)).toLocaleString('ru-RU')} PRB до Platinum
              </Text>
            </View>

            {/* Benefits */}
            <View style={[S.benefitsBox, { backgroundColor: `${levelColor}0E` }]}>
              <Text style={[S.benefitsTitle, { color: colors.text }]}>Преимущества уровня</Text>
              {(LEVEL_BENEFITS[level] || LEVEL_BENEFITS.Bronze).map((b, i) => (
                <View key={i} style={S.benefitRow}>
                  <MaterialIcons name="check-circle" size={14} color={levelColor} style={{ marginRight: 8 }} />
                  <Text style={[S.benefitText, { color: colors.textSecondary }]}>{b}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── CASHBACK ── */}
        {!isAdmin && (
          <Animated.View style={[S.cashCard, { backgroundColor: colors.cardBg }, animStyle(cashAnim)]}>
            <View style={S.cashHeader}>
              <View style={[S.cashIconCircle, { backgroundColor: '#10B98118' }]}>
                <MaterialIcons name="savings" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[S.cashTitle, { color: colors.text }]}>Накопленный кэшбек</Text>
                <Text style={[S.cashSub, { color: colors.textSecondary }]}>Уровень: {level}</Text>
              </View>
              <View style={[S.cashBigBadge, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
                <Text style={[S.cashBigValue, { color: '#10B981' }]}>{(accrued || 0).toLocaleString('ru-RU')}</Text>
                <Text style={[S.cashBigUnit, { color: '#10B981' }]}>PRB</Text>
              </View>
            </View>

            <View style={[S.cashFooter, { backgroundColor: colors.background }]}>
              <View style={S.cashFooterItem}>
                <Text style={[S.cashFooterLabel, { color: colors.textSecondary }]}>Начислено</Text>
                <Text style={[S.cashFooterValue, { color: colors.text }]}>+{accrued} PRB</Text>
              </View>
              <View style={[S.cashFooterDivider, { backgroundColor: colors.border }]} />
              <View style={S.cashFooterItem}>
                <Text style={[S.cashFooterLabel, { color: colors.textSecondary }]}>Баланс</Text>
                <Text style={[S.cashFooterValue, { color: colors.text }]}>{balance} PRB</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── FLOATING BUTTON ── */}
      <TouchableOpacity
        style={[S.floatBtn, { backgroundColor: '#063B5C' }]}
        onPress={() => navigation.navigate('CardTopUp')}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={S.floatBtnText}>Пополнить баланс</Text>
      </TouchableOpacity>

      {/* ── TOP-UP MODAL ── */}
      <Modal visible={topUpModalVisible} animationType="slide" transparent>
        <View style={[S.modalWrap, { backgroundColor: colors.background }]}>
          <View style={[S.modalHeader, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
            <Text style={[S.modalTitle, { color: colors.text }]}>Пополнить баланс</Text>
            <TouchableOpacity onPress={() => setTopUpModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }}>
            <Text style={[S.modalSectionTitle, { color: colors.text }]}>Способ оплаты</Text>
            {paymentMethods.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[S.payCard, { backgroundColor: colors.cardBg, borderColor: selectedPaymentMethod === m.name ? colors.primary : 'transparent' }]}
                onPress={() => setSelectedPaymentMethod(m.name)}
              >
                <MaterialIcons name={m.icon} size={24} color={selectedPaymentMethod === m.name ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontWeight: '600', fontSize: 14 }, { color: colors.text }]}>{m.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{m.desc}</Text>
                </View>
                {selectedPaymentMethod === m.name && <MaterialIcons name="check-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            <Text style={[S.modalSectionTitle, { color: colors.text, marginTop: 16 }]}>Сумма</Text>
            <View style={[S.amountRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[S.amountCurrency, { color: colors.primary }]}>PRB</Text>
              <TextInput style={[S.amountInput, { color: colors.text }]} placeholder="Введите сумму" placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={topUpAmount} onChangeText={setTopUpAmount} />
            </View>

            <View style={S.quickRow}>
              {[1000, 5000, 10000, 25000].map(a => (
                <TouchableOpacity key={a} style={[S.quickBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => setTopUpAmount(String(a))}>
                  <Text style={[S.quickBtnText, { color: colors.primary }]}>{a.toLocaleString('ru-RU')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[S.confirmBtn, { backgroundColor: colors.success }]} onPress={handleTopUp}>
              {isProcessing ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={S.confirmBtnText}>{topUpAmount ? `Пополнить на ${parseInt(topUpAmount).toLocaleString('ru-RU')} PRB` : 'Введите сумму'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── QR MODAL ── */}
      <Modal visible={qrVisible} animationType="fade" transparent onRequestClose={() => setQrVisible(false)}>
        <View style={S.qrOverlay}>
          <View style={S.qrPass}>

            {/* ── PASS HEADER ── */}
            <GradientView
              colors={LEVEL_GRADIENT[level] || LEVEL_GRADIENT.Bronze}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={S.qrPassHeader}
            >
              <View style={S.qrPassDecor1} />
              <View style={S.qrPassDecor2} />
              {/* Close */}
              <TouchableOpacity style={S.qrPassCloseBtn} onPress={() => setQrVisible(false)}>
                <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              {/* User info row */}
              <View style={S.qrPassHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={S.qrPassBrandLabel}>КАРТА ЛОЯЛЬНОСТИ</Text>
                  <Text style={S.qrPassName}>{user?.displayName || user?.name || 'Гость'}</Text>
                  <Text style={S.qrPassId}>ID: {user?.id}</Text>
                </View>
                <View style={[S.qrPassLevelBox, { borderColor: `${levelColor}80` }]}>
                  <Text style={[S.qrPassLevelName, { color: levelColor }]}>{level.toUpperCase()}</Text>
                </View>
              </View>
            </GradientView>

            {/* Perforation separator */}
            <View style={S.qrPerfRow}>
              <View style={[S.qrPerfHalf, { backgroundColor: '#0d0d1a' }]} />
              <View style={S.qrPerfDots}>
                {Array(9).fill(0).map((_, i) => (
                  <View key={i} style={[S.qrPerfDot, { backgroundColor: '#0d0d1a' }]} />
                ))}
              </View>
              <View style={[S.qrPerfHalf, { backgroundColor: '#0d0d1a' }]} />
            </View>

            {/* ── PASS BODY ── */}
            <View style={S.qrPassBody}>
              <Text style={S.qrPassInstruction}>Покажите QR-код администратору</Text>
              <View style={S.qrCodeWrap}>
                <QRCode
                  value={JSON.stringify({ type: 'loyalty', userId: user?.id, level, name: user?.displayName || user?.name, balance, bookings: stats.bookings })}
                  size={180}
                  color="#1a1a2e"
                  backgroundColor="#fff"
                />
              </View>

              {/* Stats strip */}
              <View style={S.qrPassStats}>
                {[
                  { label: 'Бронирований', value: stats.bookings,                         icon: 'event-note',   color: '#FF6B35' },
                  { label: 'PRB',          value: (balance || 0).toLocaleString('ru-RU'), icon: 'account-balance-wallet', color: levelColor },
                  { label: 'Ночей',        value: stats.nights,                           icon: 'hotel',        color: '#F59E0B' },
                ].map((s, i, arr) => (
                  <View key={s.label} style={[S.qrPassStatBox, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: '#eee' }]}>
                    <MaterialIcons name={s.icon} size={18} color={s.color} style={{ marginBottom: 4 }} />
                    <Text style={[S.qrPassStatValue, { color: '#1a1a2e' }]}>{s.value}</Text>
                    <Text style={S.qrPassStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 24 },

  // Card
  cardWrap: { marginBottom: 20 },
  card: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
    borderRadius: 22, padding: 20, borderWidth: 1.5,
    backfaceVisibility: 'hidden', overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 14,
  },
  cardBack: { backfaceVisibility: 'hidden' },
  stripeContainer: {
    position: 'absolute', top: -120, left: -80, right: -80, bottom: -120,
    transform: [{ rotate: '38deg' }],
    gap: 13,
  },
  stripeLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cardBloom: {
    position: 'absolute', top: 0, left: 0,
    width: 220, height: 180, borderRadius: 0,
  },
  cardWatermark: { position: 'absolute', bottom: 10, right: 16, fontSize: 68, fontWeight: '900', color: 'rgba(255,255,255,0.06)', letterSpacing: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrandSub: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginBottom: 2 },
  cardBrand: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2.5 },
  cardLabel: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, opacity: 0.85 },
  // Chip
  chipRow: { marginTop: -4 },
  chip: { width: 42, height: 32, backgroundColor: '#D4A843', borderRadius: 5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  chipLineH: { position: 'absolute', width: '100%', height: 1.5, backgroundColor: 'rgba(120,80,0,0.45)' },
  chipLineV: { position: 'absolute', width: 1.5, height: '100%', backgroundColor: 'rgba(120,80,0,0.45)' },
  chipCenter: { width: 18, height: 14, borderRadius: 2, backgroundColor: 'rgba(180,130,20,0.7)', borderWidth: 1, borderColor: 'rgba(120,80,0,0.3)' },
  // Card number + bottom
  cardNumber: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 4, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.3)' },
  cardSmallLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  cardHolderName: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardLevelBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  cardLevelIcon: { fontSize: 16, lineHeight: 18 },
  cardLevelName: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 1 },
  // Back
  balanceCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceAmount: { color: '#fff', fontSize: 44, fontWeight: '900', letterSpacing: 1 },
  balancePill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3, marginTop: 2 },
  balanceCurrency: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  balanceSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 8 },
  cardFlipHint: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'center', fontWeight: '500' },
  flipHint: { textAlign: 'center', fontSize: 11, marginTop: 12, marginBottom: 12 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, marginTop: 4, borderWidth: 1 },
  qrBtnText: { fontWeight: '700', fontSize: 14 },

  // Info card
  infoCard: { borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },

  // Stats
  statsCard: { flexDirection: 'row', borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  // Level card
  levelCard: { borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, paddingLeft: 12, marginBottom: 16 },
  levelHeaderText: { fontSize: 16, fontWeight: '800' },
  levelBadge: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  levelBadgeText: { fontSize: 13, fontWeight: '800' },
  progressWrap: { marginBottom: 16 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressNote: { fontSize: 12, fontWeight: '500' },
  benefitsBox: { borderRadius: 12, padding: 14 },
  benefitsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  benefitText: { fontSize: 13, flex: 1 },

  // Cashback
  cashCard: { borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cashHeader: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  cashIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cashTitle: { fontSize: 15, fontWeight: '800' },
  cashSub: { fontSize: 12, marginTop: 2 },
  cashBigBadge: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  cashBigValue: { fontSize: 22, fontWeight: '900' },
  cashBigUnit: { fontSize: 11, fontWeight: '700' },
  cashFooter: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 18 },
  cashFooterItem: { flex: 1, alignItems: 'center' },
  cashFooterLabel: { fontSize: 11, marginBottom: 4 },
  cashFooterValue: { fontSize: 14, fontWeight: '700' },
  cashFooterDivider: { width: 1, marginVertical: 4 },

  // Float button
  floatBtn: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10, shadowColor: '#063B5C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8, zIndex: 99 },
  floatBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal
  modalWrap: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  payCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginBottom: 16 },
  amountCurrency: { fontSize: 18, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '600' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  quickBtn: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  quickBtnText: { fontSize: 13, fontWeight: '700' },
  confirmBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginBottom: 30 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // QR boarding-pass modal
  qrOverlay: { flex: 1, backgroundColor: 'rgba(10,10,20,0.88)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrPass: { width: '100%', maxWidth: 360, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.55, shadowRadius: 32, elevation: 20 },
  // Header
  qrPassHeader: { paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20, overflow: 'hidden' },
  qrPassDecor1: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  qrPassDecor2: { position: 'absolute', bottom: -30, left: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' },
  qrPassCloseBtn: { alignSelf: 'flex-end', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  qrPassHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  qrPassBrandLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
  qrPassName: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 3 },
  qrPassId: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '500' },
  qrPassLevelBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', marginLeft: 12 },
  qrPassLevelEmoji: { fontSize: 26, lineHeight: 30 },
  qrPassLevelName: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 3 },
  // Perforation
  qrPerfRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 24 },
  qrPerfHalf: { width: 12, height: 24 },
  qrPerfDots: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 4 },
  qrPerfDot: { width: 14, height: 14, borderRadius: 7 },
  // Body
  qrPassBody: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 },
  qrPassInstruction: { fontSize: 12, color: '#888', fontWeight: '500', letterSpacing: 0.3, marginBottom: 16 },
  qrCodeWrap: { padding: 14, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, marginBottom: 20 },
  qrPassStats: { flexDirection: 'row', width: '100%', borderRadius: 14, backgroundColor: '#f8f8f8', overflow: 'hidden' },
  qrPassStatBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  qrPassStatValue: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  qrPassStatLabel: { fontSize: 9, color: '#999', fontWeight: '600', letterSpacing: 0.5 },
});
