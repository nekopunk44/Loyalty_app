import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Animated, Easing,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GradientView } from '../../components/ui/GradientView';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';
import QRCode from 'react-native-qrcode-svg';
import CardTopUpScreen from './CardTopUpScreen';

const API_BASE_URL = getApiUrl();
const useNative = Platform.OS !== 'web';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOPUP_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.88);

const LEVEL_GRADIENT = {
  Bronze:   ['#082C3A', '#10313B', '#4B3322', '#B06A2F'],
  Silver:   ['#17212C', '#596672', '#B8C2CC', '#313B47'],
  Gold:     ['#24180B', '#634215', '#B78325', '#F2C96D'],
  Platinum: ['#090D20', '#241B4D', '#6650B8', '#B9A8FF'],
};
const LEVEL_BORDER = {
  Bronze: '#C7772C', Silver: '#D6DEE7', Gold: '#F2C96D', Platinum: '#B9A8FF',
};
const LEVEL_CARD_THEME = {
  Bronze: {
    accent: '#E08B32',
    border: '#C7772C',
    chip: '#D29A3A',
    rail: 'rgba(224,139,50,0.82)',
    textSoft: 'rgba(255,246,234,0.76)',
    watermark: 'rgba(255,246,234,0.052)',
    plate: 'rgba(255,255,255,0.075)',
    plateBorder: 'rgba(255,255,255,0.10)',
    badgeBg: 'rgba(8,24,31,0.62)',
    stripe: 'rgba(255,255,255,0.048)',
    glow: 'rgba(224,139,50,0.18)',
    shadow: '#3B210F',
  },
  Silver: {
    accent: '#E6EEF7',
    border: '#D6DEE7',
    chip: '#C9D1D9',
    rail: 'rgba(214,222,231,0.86)',
    textSoft: 'rgba(247,250,252,0.78)',
    watermark: 'rgba(255,255,255,0.065)',
    plate: 'rgba(255,255,255,0.13)',
    plateBorder: 'rgba(255,255,255,0.18)',
    badgeBg: 'rgba(23,33,44,0.58)',
    stripe: 'rgba(255,255,255,0.06)',
    glow: 'rgba(230,238,247,0.16)',
    shadow: '#16202B',
  },
  Gold: {
    accent: '#F8D67A',
    border: '#F2C96D',
    chip: '#F6C453',
    rail: 'rgba(248,214,122,0.88)',
    textSoft: 'rgba(255,249,226,0.78)',
    watermark: 'rgba(255,249,226,0.07)',
    plate: 'rgba(255,255,255,0.12)',
    plateBorder: 'rgba(255,255,255,0.16)',
    badgeBg: 'rgba(36,24,11,0.56)',
    stripe: 'rgba(255,255,255,0.052)',
    glow: 'rgba(248,214,122,0.20)',
    shadow: '#3A2509',
  },
  Platinum: {
    accent: '#D9CEFF',
    border: '#B9A8FF',
    chip: '#C4B5FD',
    rail: 'rgba(185,168,255,0.88)',
    textSoft: 'rgba(245,243,255,0.80)',
    watermark: 'rgba(245,243,255,0.072)',
    plate: 'rgba(255,255,255,0.12)',
    plateBorder: 'rgba(255,255,255,0.17)',
    badgeBg: 'rgba(9,13,32,0.58)',
    stripe: 'rgba(255,255,255,0.058)',
    glow: 'rgba(185,168,255,0.20)',
    shadow: '#171033',
  },
};

const LEVEL_BENEFITS = {
  Bronze:   ['Кэшбек 10% от каждого бронирования'],
  Silver:   ['Кэшбек 20% от каждого бронирования', 'Бесплатный кухонный сервиз'],
  Gold:     ['Кэшбек 30% от каждого бронирования', 'Бесплатный кухонный сервиз', 'Скидка 20% на парилку'],
  Platinum: ['Кэшбек 40% от каждого бронирования', 'Бесплатный кухонный сервиз', 'Скидка 40% на парилку', 'Первый час парилки бесплатно'],
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [balance, setBalance]     = useState(0);
  const [_loading, setLoading]    = useState(true);
  const [accrued, setAccrued]     = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [stats, setStats] = useState({ bookings: 0, nights: 0, totalSpent: 0, nextLevel: 200000 });
  const [monthlySpending, setMonthlySpending] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible]   = useState(false);

  // Entrance animations
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const infoAnim   = useRef(new Animated.Value(0)).current;
  const statsAnim  = useRef(new Animated.Value(0)).current;
  const levelAnim  = useRef(new Animated.Value(0)).current;
  const cashAnim   = useRef(new Animated.Value(0)).current;

  // Top-up sheet
  const [topUpSheetVisible, setTopUpSheetVisible] = useState(false);
  const topUpSheetAnim = useRef(new Animated.Value(1)).current;

  const openTopUpSheet = () => {
    setTopUpSheetVisible(true);
    topUpSheetAnim.setValue(1);
    Animated.timing(topUpSheetAnim, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
  };

  const closeTopUpSheet = () => {
    Animated.timing(topUpSheetAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: useNative,
    }).start(() => setTopUpSheetVisible(false));
  };

  // Card flip animation
  const flipAnim   = useRef(new Animated.Value(0)).current;
  const cardPressAnim = useRef(new Animated.Value(1)).current;

  // Progress bar animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loadingCardRef = useRef(false);

  // Stable card number (avoid Math.random() on every render)
  const cardSuffix = useMemo(() => String(Math.floor(Math.random() * 10000)).padStart(4, '0'), []);

  const runEntrance = (currentStats) => {
    const anims = [cardAnim, infoAnim, statsAnim, levelAnim, cashAnim];
    Animated.stagger(90, anims.map(a =>
      Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: useNative })
    )).start();
    setTimeout(() => {
      const pct = Math.min(((currentStats || stats).totalSpent || 0) / 200000, 1);
      Animated.timing(progressAnim, {
        toValue: pct,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, 500);
  };

  useFocusEffect(React.useCallback(() => {
    let cancelled = false;
    const anims = [cardAnim, infoAnim, statsAnim, levelAnim, cashAnim];
    anims.forEach(a => a.setValue(0));
    progressAnim.setValue(0);

    Promise.all([loadCardData(), loadUserStats()])
      .then(([, freshStats]) => { if (!cancelled) runEntrance(freshStats); });

    return () => { cancelled = true; };
  }, [user?.id]));

  const loadCardData = async () => {
    if (!user?.id) { setLoading(false); return; }
    if (loadingCardRef.current) return;
    try {
      loadingCardRef.current = true;
      setLoading(true);
      const card = await LoyaltyCardService.getCard(user.id);
      setBalance(card.balance || 0);
      setAccrued(parseFloat(card.totalEarned) || 0);
    } catch (e) {
      setBalance(user?.loyaltyBalance || user?.balance || 0);
      setAccrued(user?.totalEarned || 0);
    } finally {
      loadingCardRef.current = false;
      setLoading(false);
    }
  };


  const loadUserStats = async () => {
    try {
      if (!user?.id) return null;
      const data = await apiCall(`${API_BASE_URL}/bookings/user/${user.id}`);
      if (data.success && Array.isArray(data.bookings)) {
        const done = data.bookings.filter(b => b.status === 'completed');
        let nights = 0, spent = 0;
        const monthMap = {};
        done.forEach(b => {
          const [di, mi, yi] = b.checkInDate.split('.');
          const [do_, mo, yo] = b.checkOutDate.split('.');
          nights += Math.ceil((new Date(yo, mo - 1, do_) - new Date(yi, mi - 1, di)) / 86400000);
          const amount = parseFloat(b.totalPrice) || 0;
          spent += amount;
          const key = `${yi}-${mi}`;
          monthMap[key] = (monthMap[key] || 0) + amount;
        });
        const newStats = { bookings: done.length, nights, totalSpent: spent, nextLevel: 200000 };
        setStats(newStats);
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const y = String(d.getFullYear());
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const label = d.toLocaleString('ru-RU', { month: 'short' });
          months.push({ label, value: monthMap[`${y}-${m}`] || 0 });
        }
        setMonthlySpending(months);
        return newStats;
      }
    } catch { /* keep defaults */ }
    return null;
  };

  const handleFlip = () => {
    const next = cardFlipped ? 0 : 1;
    setCardFlipped(!cardFlipped);
    flipAnim.stopAnimation();
    Animated.spring(flipAnim, {
      toValue: next,
      damping: 18,
      stiffness: 140,
      mass: 0.9,
      useNativeDriver: useNative,
    }).start();
  };

  const handleCardPressIn = () => {
    Animated.spring(cardPressAnim, { toValue: 0.985, damping: 18, stiffness: 260, useNativeDriver: useNative }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardPressAnim, { toValue: 1, damping: 16, stiffness: 220, useNativeDriver: useNative }).start();
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  const isAdmin     = user?.role === 'admin';
  const level       = user?.membershipLevel || 'Bronze';
  const levelColor  = LEVEL_BORDER[level] || LEVEL_BORDER.Bronze;
  const cardTheme   = LEVEL_CARD_THEME[level] || LEVEL_CARD_THEME.Bronze;
  const cardGradient = LEVEL_GRADIENT[level] || LEVEL_GRADIENT.Bronze;
  const progressPct = Math.min((stats.totalSpent || 0) / 200000, 1);
  const maskedCardGroups = useMemo(() => ['\u2022\u2022\u2022\u2022', '\u2022\u2022\u2022\u2022', '\u2022\u2022\u2022\u2022', cardSuffix], [cardSuffix]);

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
          <TouchableOpacity
            onPress={handleFlip}
            onPressIn={handleCardPressIn}
            onPressOut={handleCardPressOut}
            activeOpacity={1}
            style={{ height: 214, outlineWidth: 0 }}
          >
            <Animated.View style={[S.cardPressLayer, { transform: [{ scale: cardPressAnim }] }]}>
              <Animated.View style={[S.card, { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }], borderColor: cardTheme.border }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: cardGradient[0] }]} />
                <View style={[S.cardToneLayer, { backgroundColor: cardGradient[1] }]} pointerEvents="none" />
                <View style={[S.cardDepthLayer, { backgroundColor: cardGradient[2] }]} pointerEvents="none" />
                <View style={[S.cardMaterialSheen, { backgroundColor: cardTheme.accent }]} pointerEvents="none" />
                <View style={[S.cardRail, { backgroundColor: cardTheme.rail }]} />

                <View style={S.stripeContainer} pointerEvents="none">
                  {Array.from({ length: 36 }, (_, i) => (
                    <View key={i} style={[S.stripeLine, { backgroundColor: cardTheme.stripe }]} />
                  ))}
                </View>

                <View style={[S.cardBloom, { backgroundColor: cardTheme.glow }]} pointerEvents="none" />
                <Text style={[S.cardWatermark, { color: cardTheme.watermark }]}>{level.toUpperCase()}</Text>
                <View style={S.cardTop}>
                  <View>
                    <Text style={[S.cardBrandSub, { color: cardTheme.textSoft }]}>VILLA JACONDA</Text>
                    <Text style={S.cardBrand}>PRIVILEGE</Text>
                  </View>
                  <View style={[S.contactlessBadge, { borderColor: cardTheme.accent + '66', backgroundColor: cardTheme.badgeBg }]}>
                    <MaterialCommunityIcons name="contactless-payment" size={26} color={cardTheme.accent} />
                  </View>
                </View>

                <View style={S.cardMiddle}>
                  <View style={[S.chip, { backgroundColor: cardTheme.chip }]}>
                    <View style={S.chipLineH} />
                    <View style={S.chipLineV} />
                    <View style={S.chipCenter} />
                  </View>
                  <Text style={[S.cardProgramLabel, { color: cardTheme.textSoft }]}>LOYALTY CARD</Text>
                </View>

                <View style={S.cardNumberRow}>
                  {maskedCardGroups.map((group, index) => (
                    <Text key={`${group}-${index}`} style={S.cardNumberGroup} numberOfLines={1} allowFontScaling={false}>
                      {group}
                    </Text>
                  ))}
                </View>

                <View style={S.cardBottom}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.cardSmallLabel, { color: cardTheme.textSoft }]}>{'\u0414\u0415\u0420\u0416\u0410\u0422\u0415\u041b\u042c'}</Text>
                    <Text style={S.cardHolderName} numberOfLines={1}>{(user?.displayName || user?.name || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c').toUpperCase()}</Text>
                  </View>
                  <View style={[S.cardLevelBadge, { borderColor: cardTheme.accent + '88', backgroundColor: cardTheme.badgeBg }]}>
                    <Text style={[S.cardLevelName, { color: cardTheme.accent }]}>{level.toUpperCase()}</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[S.card, S.cardBack, { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backInterpolate }], borderColor: cardTheme.border }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: cardGradient[0] }]} />
                <Text style={[S.backBrand, { color: cardTheme.textSoft }]}>VILLA JACONDA</Text>
                <View style={S.backStripeContainer} pointerEvents="none">
                  {Array.from({ length: 36 }, (_, i) => (
                    <View key={i} style={[S.backStripeLine, { backgroundColor: cardTheme.stripe }]} />
                  ))}
                </View>
                <View style={S.backMagStripe}>
                  <View style={S.backMagStripeShade} />
                  <View style={S.backMagStripeHighlight} />
                  <View style={S.backMagStripeBottom} />
                </View>
                <View style={[S.cardRailRight, { backgroundColor: cardTheme.rail }]} />

                <View style={S.backBalanceCenter}>
                  <View style={S.balanceRow}>
                    <Text style={S.balanceAmount}>{(balance || 0).toLocaleString('ru-RU')}</Text>
                    <Text style={[S.balanceCurrencyInline, { color: cardTheme.accent }]}>PRB</Text>
                  </View>
                </View>
              </Animated.View>
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

        {/* ── SPENDING CHART ── */}
        {monthlySpending.length > 0 && monthlySpending.some(m => m.value > 0) && (
          <Animated.View style={[S.chartCard, { backgroundColor: colors.cardBg }, animStyle(statsAnim)]}>
            <Text style={[S.chartTitle, { color: colors.text }]}>Траты по месяцам</Text>
            <SpendingChart data={monthlySpending} accentColor={levelColor} textColor={colors.textSecondary} />
          </Animated.View>
        )}

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


        <View style={{ height: 92 }} />
      </ScrollView>


      <TouchableOpacity
        style={[S.floatBtn, { backgroundColor: '#063B5C' }]}
        onPress={openTopUpSheet}
      >
        <MaterialIcons name="add-circle" size={24} color="#fff" />
        <Text style={S.floatBtnText}>Пополнить баланс</Text>
      </TouchableOpacity>

      {/* ── TOP-UP BOTTOM SHEET ── */}
      <Modal visible={topUpSheetVisible} animationType="none" transparent statusBarTranslucent onRequestClose={closeTopUpSheet}>
        <Animated.View style={[S.topUpOverlay, {
          opacity: topUpSheetAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeTopUpSheet} activeOpacity={1} />
          <Animated.View style={[S.topUpSheet, {
            backgroundColor: colors.background,
            transform: [{ translateY: topUpSheetAnim.interpolate({
              inputRange: [0, 1], outputRange: [0, TOPUP_SHEET_HEIGHT + 40],
            }) }],
          }]}>
            <View style={S.topUpHandle} />
            <CardTopUpScreen onClose={closeTopUpSheet} />
          </Animated.View>
        </Animated.View>
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

const SCREEN_W = Dimensions.get('window').width - 64;

function SpendingChart({ data, accentColor, textColor }) {
  const chartH = 120;
  const barW = Math.floor((SCREEN_W - 16) / data.length) - 6;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <Svg width={SCREEN_W} height={chartH + 30}>
      {/* Baseline */}
      <Line x1={0} y1={chartH} x2={SCREEN_W} y2={chartH} stroke={textColor} strokeWidth={0.5} opacity={0.3} />

      {data.map((item, i) => {
        const barH = Math.max(4, (item.value / maxVal) * chartH);
        const x = i * ((SCREEN_W - 16) / data.length) + 3;
        const y = chartH - barH;
        return (
          <React.Fragment key={item.label}>
            <Rect x={x} y={y} width={barW} height={barH} fill={accentColor} rx={3} opacity={item.value > 0 ? 0.85 : 0.15} />
            <SvgText x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill={textColor}>
              {item.label}
            </SvgText>
            {item.value > 0 && (
              <SvgText x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={accentColor}>
                {item.value >= 1000 ? `${(item.value / 1000).toFixed(0)}K` : item.value}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const S = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 92 },

  // Card
  cardWrap: { marginBottom: 20 },
  cardPressLayer: { height: 214 },
  card: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 214,
    borderRadius: 22, padding: 18, borderWidth: 1.3,
    backfaceVisibility: 'hidden', overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardBack: { backfaceVisibility: 'hidden' },
  cardToneLayer: {
    position: 'absolute',
    top: -34,
    bottom: -34,
    right: 36,
    width: 128,
    opacity: 0.20,
    transform: [{ rotate: '-12deg' }],
  },
  cardToneLayerBack: {
    left: 24,
    right: undefined,
    width: 150,
    opacity: 0.18,
  },
  cardDepthLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    opacity: 0.10,
  },
  cardMaterialSheen: {
    position: 'absolute',
    right: 22,
    top: -42,
    width: 128,
    height: 260,
    opacity: 0.06,
    transform: [{ rotate: '18deg' }],
  },
  cardRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardRailRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  stripeContainer: {
    position: 'absolute', top: -120, left: -80, right: -80, bottom: -120,
    transform: [{ rotate: '38deg' }],
    gap: 16,
  },
  stripeLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  cardBloom: {
    position: 'absolute',
    top: -34,
    left: -30,
    width: 170,
    height: 86,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    transform: [{ rotate: '-16deg' }],
  },
  cardWatermark: { position: 'absolute', bottom: 18, right: 18, fontSize: 72, fontWeight: '900', color: 'rgba(255,255,255,0.05)', letterSpacing: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrandSub: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '800', letterSpacing: 1.7, marginBottom: 2 },
  cardBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2.4 },
  cardLabel: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, opacity: 0.85 },
  contactlessBadge: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Chip
  cardMiddle: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { width: 42, height: 32, backgroundColor: '#D4A843', borderRadius: 5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  chipLineH: { position: 'absolute', width: '100%', height: 1.5, backgroundColor: 'rgba(120,80,0,0.45)' },
  chipLineV: { position: 'absolute', width: 1.5, height: '100%', backgroundColor: 'rgba(120,80,0,0.45)' },
  chipCenter: { width: 18, height: 14, borderRadius: 2, backgroundColor: 'rgba(180,130,20,0.7)', borderWidth: 1, borderColor: 'rgba(120,80,0,0.3)' },
  // Card number + bottom
  cardNumberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingRight: 4 },
  cardNumberGroup: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 2.1, lineHeight: 24 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  cardSmallLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  cardHolderName: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardLevelBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  cardLevelIcon: { fontSize: 16, lineHeight: 18 },
  cardLevelName: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 1 },
  cardProgramLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  // Back
  backMagStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    height: 28,
    justifyContent: 'center',
  },
  backMagStripeShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  backMagStripeHighlight: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 4,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backMagStripeBottom: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 4,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  backStripeContainer: {
    position: 'absolute',
    top: -130,
    left: -86,
    right: -86,
    bottom: -130,
    transform: [{ rotate: '38deg' }],
    gap: 17,
    opacity: 0.72,
  },
  backStripeLine: {
    height: 1,
  },
  backBalanceCenter: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 88,
    bottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBrand: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.6,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  balanceAmount: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 0.4, lineHeight: 54 },
  balanceCurrencyInline: { fontSize: 15, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  balanceSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
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
  chartCard: { borderRadius: 18, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  chartTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
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

  // Transactions
  txCard: { borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  txHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  txTitle: { fontSize: 15, fontWeight: '800' },
  txEmpty: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  txIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  txDate: { fontSize: 11 },
  txAmount: { fontSize: 14, fontWeight: '800' },

  // Float button
  floatBtn: { position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'ios' ? 110 : 102, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10, shadowColor: '#063B5C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 12, elevation: 8, zIndex: 99 },
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

  // Top-up bottom sheet
  topUpOverlay: { flex: 1, backgroundColor: 'rgba(6,18,30,0.55)', justifyContent: 'flex-end' },
  topUpSheet: {
    height: TOPUP_SHEET_HEIGHT,
    backgroundColor: '#060C1A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  topUpHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 10, marginBottom: 2 },
});
