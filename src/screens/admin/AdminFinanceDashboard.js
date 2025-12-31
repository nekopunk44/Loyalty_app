import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line as SvgLine } from 'react-native-svg';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const NAVY2 = '#0B5C7A';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const RED   = '#DC2626';
const GREEN = '#10B981';

// Палитра "пластика" для финансовой карты администратора — повторяет
// слоёный градиент-эффект из MyCardScreen (LEVEL_GRADIENT), но в финансовой
// бирюзовой гамме.
const ADMIN_CARD = {
  gradient: ['#0B1E2E', '#0E2C45', '#0F4F4F', '#14B8A6'],
  accent:    '#22D3EE',
  border:    '#14B8A6',
  chip:      '#D4A843',
  rail:      'rgba(34,211,238,0.85)',
  textSoft:  'rgba(255,255,255,0.66)',
  watermark: 'rgba(255,255,255,0.055)',
  badgeBg:   'rgba(8,24,31,0.62)',
  stripe:    'rgba(255,255,255,0.045)',
  glow:      'rgba(34,211,238,0.18)',
};

// "AI command center" палитра — две версии под тёмную/светлую тему.
// Семантические тона (good/warn/bad/accent) одинаковы для обеих, чтобы
// SVG-графики читались одинаково. Меняются только bg / ink / cardLine.
const buildHero = (isDark) => isDark ? {
  bg:        '#0B1426',
  bgLayer:   '#10203A',
  cardLine:  'rgba(255,255,255,0.08)',
  ink:       '#F8FAFC',
  inkDim:    '#94A3B8',
  inkFaint:  '#64748B',
  trackBg:   'rgba(255,255,255,0.06)',
  good:      '#34D399',
  warn:      '#FBBF24',
  bad:       '#F87171',
  accent:    '#22D3EE',
} : {
  bg:        '#FFFFFF',
  bgLayer:   '#EFF4FB',
  cardLine:  'rgba(15,23,42,0.08)',
  ink:       '#0F172A',
  inkDim:    '#475569',
  inkFaint:  '#94A3B8',
  trackBg:   'rgba(15,23,42,0.05)',
  good:      '#10B981',
  warn:      '#D97706',
  bad:       '#DC2626',
  accent:    '#0891B2',
};

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = Math.min(SCREEN_H * 0.86, 720);
const CHART_W  = SCREEN_W - spacing.md * 2 - spacing.md * 2; // паддинг контейнера + панели

const TABS = [
  { id: 'summary',      label: 'Сводка',     icon: 'dashboard' },
  { id: 'transactions', label: 'Транзакции', icon: 'receipt-long' },
  { id: 'withdrawals',  label: 'Выводы',     icon: 'account-balance' },
  { id: 'insights',     label: 'AI план',    icon: 'auto-awesome' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const asNumber = (value) => Number(value || 0);
const formatMoney = (value) => `${Math.round(asNumber(value)).toLocaleString('ru-RU')} PRB`;
const formatPercent = (value) => `${asNumber(value).toFixed(1)}%`;

const TX_TYPE_LABEL = {
  booking_payment: 'Платёж за бронирование',
  topup_commission: 'Комиссия с пополнения',
  withdrawal: 'Вывод средств',
  refund: 'Возврат',
  adjustment: 'Корректировка',
};

const WITHDRAWAL_STATUS = {
  pending:   { color: AMBER, label: 'Ожидает' },
  approved:  { color: NAVY2, label: 'Одобрено' },
  completed: { color: GREEN, label: 'Завершено' },
  rejected:  { color: RED,   label: 'Отклонено' },
};

const methodLabel = (m) => {
  if (!m) return '';
  if (m.startsWith('holt')) return 'Holt-Winters';
  if (m === 'linear_trend') return 'линейный тренд';
  return m;
};

const formatTimeAgo = (input) => {
  if (!input) return '';
  const d = new Date(input);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'только что';
  if (m < 60)  return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'вчера';
  if (days < 7)   return `${days} дн назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

export default function AdminFinanceDashboard({ navigation }) {
  const { theme, isDark } = useTheme();
  const HERO = useMemo(() => buildHero(isDark), [isDark]);
  const heroStyles = useMemo(() => makeHeroStyles(HERO), [HERO]);
  const { user } = useAuth();
  const {
    notifyWithdrawalCreated,
    notifyWithdrawalCompleted,
    notifyWithdrawalCancelled,
  } = useNotification();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [forecast, setForecast] = useState(null);     // /admin/forecast-revenue
  const [anomalies, setAnomalies] = useState(null);   // /admin/anomalies summary
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('summary');

  // Анимация flip-эффекта карточки — баланс прячется на оборотной стороне.
  const [cardFlipped, setCardFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const handleCardFlip = () => {
    const next = cardFlipped ? 0 : 1;
    setCardFlipped(!cardFlipped);
    flipAnim.stopAnimation();
    Animated.spring(flipAnim, {
      toValue: next,
      damping: 18,
      stiffness: 140,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  };
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  const isFinanceAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role, user?.adminLevel]);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);

      if (!isFinanceAdmin) {
        setLoading(false);
        return;
      }

      const [summaryData, transData, withdrawData, forecastData, anomalyData] = await Promise.all([
        apiCall(`${getApiUrl()}/admin/finances/summary`),
        apiCall(`${getApiUrl()}/admin/finances/transactions?limit=100`),
        apiCall(`${getApiUrl()}/admin/finances/withdrawals`),
        apiCall(`${getApiUrl()}/admin/forecast-revenue?horizon=30&windowDays=180`).catch(() => null),
        apiCall(`${getApiUrl()}/admin/anomalies?limit=300&windowDays=30`).catch(() => null),
      ]);

      if (!summaryData.success && summaryData.error) {
        throw new Error(summaryData.error || 'Ошибка при загрузке финансов');
      }

      setFinanceSummary(summaryData);
      setTransactions(transData.transactions || []);
      setWithdrawals(withdrawData.withdrawals || []);
      setForecast(forecastData && forecastData.success ? forecastData : null);
      setAnomalies(anomalyData && anomalyData.success ? anomalyData : null);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить финансовые данные');
      console.error('Error loading admin finances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const model = useMemo(() => {
    const wallet = financeSummary?.wallet || {};
    const statistics = financeSummary?.statistics || {};
    const totalBalance = asNumber(wallet.totalBalance);
    const availableBalance = asNumber(wallet.availableBalance);
    const pendingBalance = asNumber(wallet.pendingBalance);
    const totalReceived = asNumber(wallet.totalReceived);
    const totalWithdrawn = asNumber(wallet.totalWithdrawn);
    const totalPayments = asNumber(statistics.totalPayments);
    const todayPayments = asNumber(statistics.todayPayments);
    const todayAmount = asNumber(statistics.todayAmount);
    const averagePayment = asNumber(statistics.averagePayment);

    const withdrawRatio = totalReceived > 0 ? (totalWithdrawn / totalReceived) * 100 : 0;
    const liquidityRatio = totalBalance > 0 ? (availableBalance / totalBalance) * 100 : 0;
    const dailyPace = Math.max(todayAmount, averagePayment * Math.max(todayPayments, 1), 1);
    const runwayDays = clamp(availableBalance / dailyPace, 0, 90);

    // Реальный прогноз ML: total — суммарная выручка за horizon дней.
    // Fallback на эвристику, если ML недоступен.
    const forecastFromMl = forecast && Array.isArray(forecast.daily)
      ? asNumber(forecast.total)
      : null;
    const forecast30 = forecastFromMl !== null
      ? forecastFromMl
      : (availableBalance + dailyPace * 30 * 0.45 - pendingBalance * 0.2);
    const forecastMethod = forecast?.method || null;
    const forecastConfidence = forecast && Array.isArray(forecast.lower) && Array.isArray(forecast.upper)
      ? {
          lower: forecast.lower.reduce((s, v) => s + asNumber(v), 0),
          upper: forecast.upper.reduce((s, v) => s + asNumber(v), 0),
        }
      : null;

    const anomaliesCount = anomalies ? asNumber(anomalies.nAnomalies) : null;
    const anomaliesTotal = anomalies ? asNumber(anomalies.nTotal) : null;

    const hasFinanceData = totalPayments > 0 || totalReceived > 0 || todayAmount > 0;
    const healthScore = hasFinanceData
      ? clamp(
          (liquidityRatio * 0.4) + (todayPayments * 2.5) - (withdrawRatio * 0.18) - (pendingBalance > availableBalance * 0.4 ? 10 : 0),
          5, 98
        )
      : null;

    const splitTotal = Math.max(availableBalance + pendingBalance, 1);
    const availableShare = (availableBalance / splitTotal) * 100;
    const pendingShare   = (pendingBalance   / splitTotal) * 100;

    const recommendations = [
      {
        title: runwayDays < 7 ? 'Удержать резерв' : 'Можно планировать вывод',
        text: runwayDays < 7
          ? 'AI видит короткий запас ликвидности. Лучше оставить деньги на балансе до стабилизации дневного потока.'
          : 'Запас ликвидности выглядит комфортно. Можно вывести часть средств, оставив рабочий резерв.',
        value: runwayDays < 7 ? 'резерв важнее' : `до ${formatMoney(availableBalance * 0.25)}`,
        icon: 'savings',
        color: runwayDays < 7 ? AMBER : GREEN,
      },
      {
        title: averagePayment < 25000 ? 'Разогнать средний чек' : 'Защитить высокий чек',
        text: averagePayment < 25000
          ? 'Добавьте платные улучшения и bundle-предложения для популярных объектов.'
          : 'Средний чек сильный. Точечные бонусы вместо широких скидок.',
        value: averagePayment < 25000 ? '+6–10% к обороту' : 'маржа стабильна',
        icon: 'trending-up',
        color: TEAL,
      },
      {
        title: pendingBalance > 0 ? 'Проверить зависшие суммы' : 'Поток чистый',
        text: pendingBalance > 0
          ? 'Есть ожидающие средства. Проверьте статусы платежей, чтобы не завышать cashflow.'
          : 'Ожидающих средств нет. Финансовая картина читается чисто.',
        value: formatMoney(pendingBalance),
        icon: 'rule',
        color: pendingBalance > 0 ? AMBER : NAVY2,
      },
    ];

    return {
      totalBalance, availableBalance, pendingBalance,
      totalReceived, totalWithdrawn,
      totalPayments, todayPayments, todayAmount, averagePayment,
      withdrawRatio, liquidityRatio, runwayDays,
      forecast30, forecastMethod, forecastConfidence,
      anomaliesCount, anomaliesTotal,
      healthScore, recommendations,
      availableShare, pendingShare,
    };
  }, [financeSummary, forecast, anomalies]);

  const handleCreateWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || !bankAccount.trim()) {
      Alert.alert('Ошибка', 'Заполните сумму и банковский счет');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Ошибка', 'Сумма должна быть больше 0');
      return;
    }
    if (amount > model.availableBalance) {
      Alert.alert('Ошибка', 'Недостаточно средств на доступном балансе');
      return;
    }

    setIsWithdrawing(true);

    try {
      const data = await apiCall(`${getApiUrl()}/admin/finances/withdrawal`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          bankAccount: bankAccount.trim(),
          reason: withdrawReason.trim() || 'Запрос на вывод средств',
        }),
      });

      if (!data.success && data.error) {
        throw new Error(data.error || 'Ошибка при создании запроса');
      }

      notifyWithdrawalCreated(amount.toFixed(0), bankAccount.trim());

      Alert.alert('Успешно', 'Запрос на вывод создан', [{
        text: 'Ок',
        onPress: () => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          setBankAccount('');
          setWithdrawReason('');
          loadData();
        },
      }]);
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ─── Withdrawal actions (single-admin: pending → completed | cancelled) ───
  // Действия идут через подтверждение, чтобы случайный тап не двинул деньги.
  // После запроса перезагружаем сводку, потому что pending/available меняются.
  const [actioningId, setActioningId] = useState(null);

  const runWithdrawalAction = async (w, path, confirmTitle, confirmBody, destructive) => {
    if (actioningId) return;
    Alert.alert(confirmTitle, confirmBody, [
      { text: 'Назад', style: 'cancel' },
      {
        text: 'Подтвердить',
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          setActioningId(w.id);
          try {
            const data = await apiCall(`${getApiUrl()}/admin/finances/withdrawals/${w.id}/${path}`, {
              method: 'PATCH',
            });
            if (!data.success && data.error) {
              throw new Error(data.error);
            }
            const amount = Number(w.amount).toFixed(0);
            if (path === 'complete') notifyWithdrawalCompleted(amount, w.bankAccount);
            if (path === 'cancel')   notifyWithdrawalCancelled(amount);
            loadData();
          } catch (e) {
            Alert.alert('Ошибка', e.message || 'Не удалось выполнить действие');
          } finally {
            setActioningId(null);
          }
        },
      },
    ]);
  };

  const handleCancelWithdrawal = (w) =>
    runWithdrawalAction(
      w,
      'cancel',
      'Отменить заявку',
      `Отменить заявку на ${formatMoney(w.amount)}? Средства вернутся в доступный баланс.`,
      true,
    );

  const handleCompleteWithdrawal = (w) =>
    runWithdrawalAction(
      w,
      'complete',
      'Подтвердить выплату',
      `Деньги ${formatMoney(w.amount)} переведены на счёт ${w.bankAccount || '—'}?`,
      false,
    );

  const renderSummary = () => (
    <>
      {/* Wallet split */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.splitHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Распределение средств</Text>
            <Text style={[styles.splitHeaderSub, { color: theme.colors.textSecondary }]}>
              как разложены активы кошелька
            </Text>
          </View>
          <View style={[styles.splitLiquidityChip, { backgroundColor: `${TEAL}14`, borderColor: `${TEAL}55` }]}>
            <Text style={[styles.splitLiquidityValue, { color: TEAL }]}>{formatPercent(model.liquidityRatio)}</Text>
            <Text style={[styles.splitLiquidityLabel, { color: theme.colors.textSecondary }]}>ликвидность</Text>
          </View>
        </View>

        <View style={[styles.splitBar, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.splitSegment, { width: `${clamp(model.availableShare, 0, 100)}%`, backgroundColor: GREEN }]} />
          <View style={[styles.splitSegment, { width: `${clamp(model.pendingShare,   0, 100)}%`, backgroundColor: AMBER }]} />
        </View>

        <View style={styles.splitLegendRow}>
          <SplitLegendCard
            color={GREEN}
            icon="check-circle"
            label="Доступно"
            value={formatMoney(model.availableBalance)}
            share={model.availableShare}
            theme={theme}
          />
          <SplitLegendCard
            color={AMBER}
            icon="schedule"
            label="В ожидании"
            value={formatMoney(model.pendingBalance)}
            share={model.pendingShare}
            theme={theme}
          />
        </View>

        <View style={[styles.splitFooter, { borderTopColor: theme.colors.border }]}>
          <SplitFooterStat
            icon="south-west"
            color={GREEN}
            label="Всего получено"
            value={formatMoney(model.totalReceived)}
            theme={theme}
          />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <SplitFooterStat
            icon="north-east"
            color={RED}
            label="Всего выведено"
            value={formatMoney(model.totalWithdrawn)}
            theme={theme}
          />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <SplitFooterStat
            icon="percent"
            color={TEAL}
            label="Выведено доля"
            value={formatPercent(model.withdrawRatio)}
            theme={theme}
          />
        </View>
      </View>

      {/* Recent transactions preview */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Последние транзакции</Text>
          <TouchableOpacity onPress={() => setSelectedTab('transactions')}>
            <Text style={[styles.linkText, { color: TEAL }]}>Все →</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <EmptyState text="Транзакций пока нет" theme={theme} />
        ) : (
          transactions.slice(0, 5).map((t, i, arr) => (
            <TransactionItem
              key={t.id || i}
              item={t}
              theme={theme}
              last={i === Math.min(arr.length, 5) - 1}
            />
          ))
        )}
      </View>
    </>
  );

  const renderTransactions = () => (
    <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.md }]}>
        Все транзакции
      </Text>
      {transactions.length === 0 ? (
        <EmptyState text="Транзакций пока нет" theme={theme} />
      ) : (
        transactions.map((t, i) => (
          <TransactionItem
            key={t.id || i}
            item={t}
            theme={theme}
            last={i === transactions.length - 1}
          />
        ))
      )}
    </View>
  );

  const renderWithdrawals = () => (
    <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.md }]}>
        Запросы на вывод
      </Text>
      {withdrawals.length === 0 ? (
        <EmptyState text="Запросов на вывод пока нет" theme={theme} />
      ) : (
        withdrawals.map((w, i) => {
          const meta = WITHDRAWAL_STATUS[w.status] || { color: NAVY2, label: w.status };
          const isBusy = actioningId === w.id;

          return (
            <View
              key={w.id || i}
              style={[
                styles.withdrawalItem,
                i < withdrawals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={styles.withdrawalTopRow}>
                <Text style={[styles.withdrawalAmount, { color: theme.colors.text }]}>{formatMoney(w.amount)}</Text>
                <View style={[styles.statusChip, { backgroundColor: `${meta.color}18` }]}>
                  <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={[styles.withdrawalAccount, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {w.bankAccount || '—'}
              </Text>
              <View style={styles.withdrawalMetaRow}>
                <Text style={[styles.withdrawalDate, { color: theme.colors.textSecondary }]}>
                  {formatTimeAgo(w.createdAt)}
                </Text>
              </View>

              {/* Single-admin: владелец сам подтверждает или отменяет свою же заявку. */}
              {w.status === 'pending' && (
                <View style={styles.withdrawalActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: TEAL, opacity: isBusy ? 0.6 : 1 }]}
                    onPress={() => handleCompleteWithdrawal(w)}
                    disabled={isBusy}
                    activeOpacity={0.85}
                  >
                    {isBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : (
                        <>
                          <MaterialIcons name="task-alt" size={16} color="#fff" />
                          <Text style={styles.actionBtnText}>Подтвердить выплату</Text>
                        </>
                      )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGhost, { borderColor: RED }]}
                    onPress={() => handleCancelWithdrawal(w)}
                    disabled={isBusy}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="close" size={16} color={RED} />
                    <Text style={[styles.actionBtnText, { color: RED }]}>Отменить</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderInsights = () => {
    const horizon = forecast?.horizon || (Array.isArray(forecast?.daily) ? forecast.daily.length : 30);
    const historyDays = forecast?.history_days ?? forecast?.historyDays ?? null;
    const hasForecast = Array.isArray(forecast?.daily) && forecast.daily.length >= 2;
    const anomalyItems = Array.isArray(anomalies?.items) ? anomalies.items : [];
    const flaggedAnomalies = anomalyItems.filter((it) => it.isAnomaly).slice(0, 3);

    return (
      <>
        {/* ── AI Command Center ── */}
        <View style={heroStyles.cmdCard}>
          <View style={styles.cmdHeaderRow}>
            <View style={styles.cmdEyebrowGroup}>
              <PulseDot color={HERO.good} />
              <Text style={heroStyles.cmdEyebrow}>AI FINANCE COMMAND</Text>
            </View>
            {model.forecastMethod && (
              <View style={heroStyles.cmdMethodPill}>
                <MaterialIcons name="model-training" size={11} color={HERO.inkDim} />
                <Text style={heroStyles.cmdMethodText}>{methodLabel(model.forecastMethod)}</Text>
              </View>
            )}
          </View>

          <Text style={heroStyles.cmdHeroLabel}>Прогноз выручки · {horizon} дн</Text>
          <Text style={heroStyles.cmdHeroValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(model.forecast30)}
          </Text>

          {hasForecast ? (
            <View style={{ marginTop: spacing.md, marginHorizontal: -spacing.sm }}>
              <ForecastChart
                daily={forecast.daily}
                lower={forecast.lower}
                upper={forecast.upper}
                width={CHART_W}
                hero={HERO}
              />
            </View>
          ) : (
            <View style={heroStyles.cmdNoChart}>
              <MaterialIcons name="cloud-off" size={20} color={HERO.inkFaint} />
              <Text style={heroStyles.cmdNoChartText}>
                ML-сервис недоступен, показан эвристический прогноз
              </Text>
            </View>
          )}

          <View style={heroStyles.cmdStatsRow}>
            <CmdStat
              label="Нижняя граница"
              value={model.forecastConfidence ? formatMoney(model.forecastConfidence.lower) : '—'}
              color={HERO.warn}
              hero={HERO}
              heroStyles={heroStyles}
            />
            <CmdStat
              label="Верхняя граница"
              value={model.forecastConfidence ? formatMoney(model.forecastConfidence.upper) : '—'}
              color={HERO.good}
              hero={HERO}
              heroStyles={heroStyles}
            />
            <CmdStat
              label="История"
              value={historyDays ? `${historyDays} дн` : '—'}
              hero={HERO}
              heroStyles={heroStyles}
            />
          </View>
        </View>

        {/* ── Operational signals ── */}
        <View style={styles.signalRow}>
          <Signal
            label="Здоровье"
            value={model.healthScore !== null ? Math.round(model.healthScore) : '—'}
            color={GREEN}
            theme={theme}
          />
          <Signal
            label="Резерв"
            value={Math.round(model.runwayDays)}
            color={AMBER}
            suffix=" дн"
            theme={theme}
          />
          <Signal
            label="Сегодня"
            value={formatMoney(model.todayAmount)}
            color={TEAL}
            small
            theme={theme}
          />
        </View>

        {/* ── Anomaly detector ── */}
        {model.anomaliesCount !== null && (
          <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
            <View style={styles.anomalyHeader}>
              <View style={[styles.anomalyHeroIcon, {
                backgroundColor: model.anomaliesCount > 0 ? `${RED}18` : `${GREEN}18`,
              }]}>
                <MaterialIcons
                  name={model.anomaliesCount > 0 ? 'radar' : 'verified'}
                  size={20}
                  color={model.anomaliesCount > 0 ? RED : GREEN}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.anomalyHeaderTitle, { color: theme.colors.text }]}>
                  Детектор аномалий
                </Text>
                <Text style={[styles.anomalyHeaderSub, { color: theme.colors.textSecondary }]}>
                  IsolationForest · окно 30 дн
                </Text>
              </View>
              <View style={[styles.anomalyCountPill, {
                backgroundColor: model.anomaliesCount > 0 ? `${RED}18` : `${GREEN}18`,
              }]}>
                <Text style={[styles.anomalyCountValue, {
                  color: model.anomaliesCount > 0 ? RED : GREEN,
                }]}>
                  {model.anomaliesCount}
                </Text>
                <Text style={[styles.anomalyCountTotal, { color: theme.colors.textSecondary }]}>
                  /{model.anomaliesTotal || 0}
                </Text>
              </View>
            </View>

            {anomalyItems.length > 0 ? (
              <View style={[heroStyles.anomalyStripWrap, { backgroundColor: HERO.bg }]}>
                <AnomalyStrip items={anomalyItems} width={CHART_W - spacing.md} hero={HERO} />
              </View>
            ) : (
              <Text style={[styles.anomalyEmpty, { color: theme.colors.textSecondary }]}>
                {model.anomaliesCount > 0
                  ? 'Сервис вернул только счётчик аномалий'
                  : 'Транзакций за окно нет — детектор спит'}
              </Text>
            )}

            {flaggedAnomalies.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                {flaggedAnomalies.map((it, i) => (
                  <View
                    key={`${it.userId}-${i}`}
                    style={[
                      styles.anomalyRow,
                      i < flaggedAnomalies.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
                    ]}
                  >
                    <View style={[styles.anomalyDot, { backgroundColor: RED }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.anomalyRowTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {it.displayName || it.email || it.userId}
                      </Text>
                      <Text style={[styles.anomalyRowSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {formatMoney(Math.abs(it.amount))} · score {Number(it.anomalyScore).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[styles.anomalyRowTime, { color: theme.colors.textSecondary }]}>
                      {formatTimeAgo(it.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Recommendations ── */}
        <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.md }]}>
            Рекомендации
          </Text>
          {model.recommendations.map((item, i) => (
            <View
              key={item.title}
              style={[
                styles.recommendation,
                i < model.recommendations.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={[styles.recommendationIcon, { backgroundColor: `${item.color}18` }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recommendationTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.recommendationText, { color: theme.colors.textSecondary }]}>{item.text}</Text>
                <Text style={[styles.recommendationValue, { color: item.color }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </>
    );
  };

  const renderTab = () => {
    switch (selectedTab) {
      case 'transactions': return renderTransactions();
      case 'withdrawals':  return renderWithdrawals();
      case 'insights':     return renderInsights();
      default:             return renderSummary();
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!isFinanceAdmin) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.noAccessContainer}>
          <MaterialIcons name="lock" size={58} color={TEAL} />
          <Text style={[styles.noAccessTitle, { color: theme.colors.text }]}>Доступ запрещён</Text>
          <Text style={[styles.noAccessText, { color: theme.colors.textSecondary }]}>
            Только администратор с финансовым доступом может просматривать эту страницу.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: TEAL, alignSelf: 'stretch' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Вернуться</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[TEAL]} tintColor={TEAL} />}
      >
        {/* ── Hero ── Финансовый «пластик» администратора с flip-эффектом.
            Лицевая сторона: брендинг, чип, держатель — без баланса.
            Оборотная сторона: магнитная полоса и крупная сумма.
            Структурно повторяет LOYALTY CARD из MyCardScreen. */}
        <View style={styles.heroCardWrap}>
          <TouchableOpacity activeOpacity={1} onPress={handleCardFlip} style={styles.heroCardPressLayer}>
            {/* FRONT */}
            <Animated.View
              style={[
                styles.heroCard,
                {
                  borderColor: ADMIN_CARD.border,
                  opacity: frontOpacity,
                  transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
                },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: ADMIN_CARD.gradient[0] }]} />
              <View style={[styles.heroToneLayer, { backgroundColor: ADMIN_CARD.gradient[1] }]} pointerEvents="none" />
              <View style={[styles.heroDepthLayer, { backgroundColor: ADMIN_CARD.gradient[2] }]} pointerEvents="none" />
              <View style={[styles.heroSheen, { backgroundColor: ADMIN_CARD.accent }]} pointerEvents="none" />
              <View style={[styles.heroRail, { backgroundColor: ADMIN_CARD.rail }]} />

              <View style={styles.heroStripeContainer} pointerEvents="none">
                {Array.from({ length: 36 }, (_, i) => (
                  <View key={i} style={[styles.heroStripeLine, { backgroundColor: ADMIN_CARD.stripe }]} />
                ))}
              </View>

              <View style={[styles.heroBloom, { backgroundColor: ADMIN_CARD.glow }]} pointerEvents="none" />

              <View style={styles.heroBrandRow}>
                <View>
                  <Text style={[styles.heroBrandSub, { color: ADMIN_CARD.textSoft }]}>VILLA JACONDA</Text>
                  <Text style={styles.heroBrand}>ADMIN</Text>
                </View>
                <View style={[styles.heroContactless, { borderColor: ADMIN_CARD.accent + '66', backgroundColor: ADMIN_CARD.badgeBg }]}>
                  <MaterialCommunityIcons name="contactless-payment" size={26} color={ADMIN_CARD.accent} />
                </View>
              </View>

              <View style={styles.heroChipRow}>
                <View style={[styles.heroChip, { backgroundColor: ADMIN_CARD.chip }]}>
                  <View style={styles.heroChipLineH} />
                  <View style={styles.heroChipLineV} />
                  <View style={styles.heroChipCenter} />
                </View>
                <Text style={[styles.heroProgramLabel, { color: ADMIN_CARD.textSoft }]}>ADMIN BALANCE</Text>
              </View>

              {/* Маскированный «номер карты», чтобы фронт не выглядел пустым */}
              <View style={styles.heroNumberRow}>
                {['••••', '••••', '••••', 'ADMN'].map((group, i) => (
                  <Text key={i} style={styles.heroNumberGroup} numberOfLines={1} allowFontScaling={false}>
                    {group}
                  </Text>
                ))}
              </View>

              <View style={styles.heroBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroSmallLabel, { color: ADMIN_CARD.textSoft }]}>ДЕРЖАТЕЛЬ</Text>
                  <Text style={styles.heroHolderName} numberOfLines={1}>
                    {(user?.displayName || user?.name || 'Администратор').toUpperCase()}
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* BACK */}
            <Animated.View
              style={[
                styles.heroCard,
                styles.heroCardBack,
                {
                  borderColor: ADMIN_CARD.border,
                  opacity: backOpacity,
                  transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                },
              ]}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: ADMIN_CARD.gradient[0] }]} />
              <Text style={[styles.heroBackBrand, { color: ADMIN_CARD.textSoft }]}>VILLA JACONDA</Text>
              <View style={styles.heroBackStripeContainer} pointerEvents="none">
                {Array.from({ length: 36 }, (_, i) => (
                  <View key={i} style={[styles.heroBackStripeLine, { backgroundColor: ADMIN_CARD.stripe }]} />
                ))}
              </View>
              <View style={styles.heroBackMagStripe}>
                <View style={styles.heroBackMagStripeShade} />
                <View style={styles.heroBackMagStripeHighlight} />
                <View style={styles.heroBackMagStripeBottom} />
              </View>
              <View style={[styles.heroRailRight, { backgroundColor: ADMIN_CARD.rail }]} />

              <View style={styles.heroBackBalanceCenter}>
                <Text style={[styles.heroBackCaption, { color: ADMIN_CARD.textSoft }]}>доступно к выводу</Text>
                <View style={styles.heroBackBalanceRow}>
                  <Text style={styles.heroBackBalanceAmount} numberOfLines={1} allowFontScaling={false}>
                    {Math.round(asNumber(model.availableBalance)).toLocaleString('ru-RU')}
                  </Text>
                  <Text style={[styles.heroBackBalanceCurrency, { color: ADMIN_CARD.accent }]}>PRB</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.heroFlipHint, { color: theme.colors.textSecondary }]}>
            {cardFlipped ? '← к информации о карте' : 'Нажмите для просмотра баланса →'}
          </Text>
        </View>

        {/* ── Action row (Вывести / Обновить) — сразу под картой ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.primaryButton, { backgroundColor: TEAL }]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <MaterialIcons name="south-west" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Вывести</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.secondaryButton, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}
            onPress={loadData}
          >
            <MaterialIcons name="refresh" size={20} color={TEAL} />
            <Text style={[styles.secondaryButtonText, { color: TEAL }]}>Обновить</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map(tab => {
            const active = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.85}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: active ? TEAL : theme.colors.cardBg,
                    borderColor: active ? TEAL : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedTab(tab.id)}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={16}
                  color={active ? '#fff' : theme.colors.textSecondary}
                />
                <Text style={[styles.tabText, { color: active ? '#fff' : theme.colors.text }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderTab()}

        <View style={{ height: 20 }} />

        <WithdrawModal
          visible={showWithdrawModal}
          theme={theme}
          financeSummary={financeSummary}
          withdrawAmount={withdrawAmount}
          bankAccount={bankAccount}
          withdrawReason={withdrawReason}
          isWithdrawing={isWithdrawing}
          onChangeAmount={setWithdrawAmount}
          onChangeBankAccount={setBankAccount}
          onChangeReason={setWithdrawReason}
          onSubmit={handleCreateWithdrawal}
          onClose={() => !isWithdrawing && setShowWithdrawModal(false)}
        />
      </ScrollView>
    </View>
  );
}

function SplitLegendCard({ color, icon, label, value, share, theme }) {
  return (
    <View
      style={[
        styles.splitLegendCard,
        { backgroundColor: `${color}10`, borderColor: `${color}33` },
      ]}
    >
      <View style={styles.splitLegendTop}>
        <View style={[styles.splitLegendIcon, { backgroundColor: `${color}22` }]}>
          <MaterialIcons name={icon} size={14} color={color} />
        </View>
        <Text style={[styles.splitLegendLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.splitLegendShare, { color }]} numberOfLines={1}>
          {`${Math.round(clamp(asNumber(share), 0, 100))}%`}
        </Text>
      </View>
      <Text style={[styles.splitLegendValue, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function SplitFooterStat({ icon, color, label, value, theme }) {
  return (
    <View style={styles.splitFooterStat}>
      <View style={[styles.splitFooterIcon, { backgroundColor: `${color}1A` }]}>
        <MaterialIcons name={icon} size={14} color={color} />
      </View>
      <Text style={[styles.smallStatValue, { color: theme.colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.smallStatLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function TransactionItem({ item, theme, last }) {
  const isOut = item.type === 'withdrawal' || asNumber(item.amount) < 0;
  const color = isOut ? RED : GREEN;
  return (
    <View style={[
      styles.txItem,
      !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    ]}>
      <View style={[styles.txIcon, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={isOut ? 'south-west' : 'north-east'} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.txTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {TX_TYPE_LABEL[item.type] || item.type}
        </Text>
        <Text style={[styles.txTime, { color: theme.colors.textSecondary }]}>
          {formatTimeAgo(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {isOut ? '−' : '+'}{formatMoney(Math.abs(asNumber(item.amount)))}
      </Text>
    </View>
  );
}

function Signal({ label, value, color, suffix = '', theme, small }) {
  return (
    <View style={[styles.signal, { backgroundColor: `${color}14`, borderColor: `${color}55` }]}>
      <Text
        style={[styles.signalValue, { color, fontSize: small ? 14 : 22 }]}
        numberOfLines={1}
      >
        {value}{suffix}
      </Text>
      <Text style={[styles.signalLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function EmptyState({ text, theme }) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="inbox" size={40} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

/**
 * Прогноз выручки: линия `daily` поверх доверительного интервала `lower..upper`.
 * Координаты в userSpaceOnUse, градиент идёт по горизонтали — слева зелёный,
 * справа более «прохладный», чтобы будущее визуально отличалось от истории.
 */
function ForecastChart({ daily, lower, upper, width = CHART_W, height = 150, hero }) {
  if (!Array.isArray(daily) || daily.length < 2) return null;
  const lo = Array.isArray(lower) && lower.length === daily.length ? lower : daily;
  const up = Array.isArray(upper) && upper.length === daily.length ? upper : daily;

  const padL = 6, padR = 6, padT = 10, padB = 18;
  const w = Math.max(40, width - padL - padR);
  const h = Math.max(40, height - padT - padB);
  const n = daily.length;

  const minV = Math.min(...lo, ...daily);
  const maxV = Math.max(...up, ...daily);
  const range = (maxV - minV) || 1;

  const xAt = (i) => padL + (i / (n - 1)) * w;
  const yAt = (v) => padT + h - ((v - minV) / range) * h;

  // Полигон доверительного интервала: lower вперёд, upper назад
  let band = `M ${xAt(0)} ${yAt(lo[0])}`;
  for (let i = 1; i < n; i++) band += ` L ${xAt(i)} ${yAt(lo[i])}`;
  for (let i = n - 1; i >= 0; i--) band += ` L ${xAt(i)} ${yAt(up[i])}`;
  band += ' Z';

  // Линия прогноза
  let line = `M ${xAt(0)} ${yAt(daily[0])}`;
  for (let i = 1; i < n; i++) line += ` L ${xAt(i)} ${yAt(daily[i])}`;

  const lastX = xAt(n - 1);
  const lastY = yAt(daily[n - 1]);
  const baseLineY = padT + h;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="fc-band" x1="0" y1={padT} x2="0" y2={padT + h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={hero.good} stopOpacity="0.35" />
          <Stop offset="1" stopColor={hero.accent} stopOpacity="0.04" />
        </LinearGradient>
        <LinearGradient id="fc-line" x1={padL} y1="0" x2={padL + w} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={hero.good} />
          <Stop offset="1" stopColor={hero.accent} />
        </LinearGradient>
      </Defs>

      {/* Базовая ось */}
      <SvgLine x1={padL} y1={baseLineY} x2={padL + w} y2={baseLineY} stroke={hero.cardLine} strokeWidth={1} />

      {/* Доверительный интервал */}
      <Path d={band} fill="url(#fc-band)" />

      {/* Линия прогноза */}
      <Path d={line} stroke="url(#fc-line)" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Маркер последней точки */}
      <Circle cx={lastX} cy={lastY} r={8}   fill={hero.accent} fillOpacity={0.18} />
      <Circle cx={lastX} cy={lastY} r={4.5} fill={hero.accent} />
      <Circle cx={lastX} cy={lastY} r={1.8} fill="#fff" />
    </Svg>
  );
}

/**
 * Полоса аномалий: точки по оси X = время транзакции, по Y = anomaly_score.
 * `isAnomaly=true` рисуется крупным красным маркером с подсветкой, остальные — мелкими нейтральными.
 */
function AnomalyStrip({ items, width = CHART_W, height = 56, hero }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const padL = 6, padR = 6, padT = 4, padB = 8;
  const w = Math.max(40, width - padL - padR);
  const h = Math.max(20, height - padT - padB);

  const points = items
    .map((it) => ({
      t: new Date(it.createdAt).getTime(),
      score: Math.max(0, Math.min(1, Number(it.anomalyScore) || 0)),
      flagged: !!it.isAnomaly,
    }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  if (points.length === 0) return null;

  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const tRange = (tMax - tMin) || 1;

  const xAt = (t) => padL + ((t - tMin) / tRange) * w;
  const yAt = (s) => padT + h - s * h;

  return (
    <Svg width={width} height={height}>
      <SvgLine x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke={hero.cardLine} strokeWidth={1} />
      {points.map((p, i) =>
        p.flagged ? (
          <React.Fragment key={i}>
            <Circle cx={xAt(p.t)} cy={yAt(p.score)} r={7}   fill={hero.bad} fillOpacity={0.22} />
            <Circle cx={xAt(p.t)} cy={yAt(p.score)} r={3.6} fill={hero.bad} />
          </React.Fragment>
        ) : (
          <Circle key={i} cx={xAt(p.t)} cy={yAt(p.score)} r={1.6} fill={hero.inkFaint} fillOpacity={0.5} />
        ),
      )}
    </Svg>
  );
}

/**
 * Маленький стат под графиком: подпись + значение, тёмный фон.
 */
function CmdStat({ label, value, color, hero, heroStyles }) {
  return (
    <View style={{ flex: 1, alignItems: 'flex-start' }}>
      <Text style={[heroStyles.cmdStatLabel, { color: hero.inkDim }]} numberOfLines={1}>{label}</Text>
      <Text style={[heroStyles.cmdStatValue, { color: color || hero.ink }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/**
 * Пульсирующая точка-индикатор работы модели.
 */
function PulseDot({ color = '#34D399' }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  const scale   = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.2, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 0,                                       useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity, transform: [{ scale }] }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function WithdrawModal({
  visible,
  theme,
  financeSummary,
  withdrawAmount,
  bankAccount,
  withdrawReason,
  isWithdrawing,
  onChangeAmount,
  onChangeBankAccount,
  onChangeReason,
  onSubmit,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  const close = React.useCallback(() => {
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 260,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose && onClose();
      }
    });
  }, [translateY, onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SHEET_H);
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 360,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(translateY, {
        toValue: SHEET_H,
        duration: 260,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const isDark = theme.dark || theme.mode === 'dark';
  const sheetBg = theme.colors.cardBg;
  const fieldBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,42,72,0.04)';
  const fieldBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,42,72,0.08)';
  const available = financeSummary?.wallet?.availableBalance ?? 0;

  const handleMax = () => {
    if (isWithdrawing) return;
    onChangeAmount(String(Math.floor(Number(available) || 0)));
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={close}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              transform: [{ translateY }],
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View {...panResponder.panHandlers} style={styles.sheetGrip}>
              <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,42,72,0.18)' }]} />
            </View>

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderSide} />
              <View style={styles.sheetHeaderCenter}>
                <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Запрос на вывод</Text>
                <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                  Заявка на перевод средств в банк
                </Text>
              </View>
              <View style={styles.sheetHeaderSide}>
                <Pressable
                  onPress={close}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.sheetCloseBtn,
                    {
                      backgroundColor: pressed
                        ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,42,72,0.08)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,42,72,0.04)'),
                    },
                  ]}
                >
                  <MaterialIcons name="close" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.balancePanel, { borderColor: `${TEAL}33`, backgroundColor: `${TEAL}10` }]}>
                <View style={[styles.balanceIcon, { backgroundColor: `${TEAL}22` }]}>
                  <MaterialIcons name="account-balance-wallet" size={22} color={TEAL} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Доступно к выводу</Text>
                  <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
                    {formatMoney(available)}
                  </Text>
                </View>
                <Pressable
                  onPress={handleMax}
                  hitSlop={6}
                  disabled={isWithdrawing}
                  style={({ pressed }) => [
                    styles.balanceMaxBtn,
                    {
                      backgroundColor: pressed ? `${TEAL}33` : `${TEAL}1F`,
                      borderColor: `${TEAL}55`,
                    },
                  ]}
                >
                  <Text style={[styles.balanceMaxText, { color: TEAL }]}>MAX</Text>
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Сумма</Text>
                <View style={[styles.fieldWrap, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                  <MaterialIcons name="payments" size={18} color={theme.colors.textSecondary} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.fieldInput, { color: theme.colors.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="decimal-pad"
                    value={withdrawAmount}
                    onChangeText={onChangeAmount}
                    editable={!isWithdrawing}
                  />
                  <Text style={[styles.fieldSuffix, { color: theme.colors.textSecondary }]}>PRB</Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Банковский счёт</Text>
                <View style={[styles.fieldWrap, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                  <MaterialIcons name="account-balance" size={18} color={theme.colors.textSecondary} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.fieldInput, { color: theme.colors.text }]}
                    placeholder="Номер счёта получателя"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={bankAccount}
                    onChangeText={onChangeBankAccount}
                    editable={!isWithdrawing}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Причина вывода</Text>
                <View style={[styles.fieldWrap, styles.fieldWrapMulti, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
                  <MaterialIcons name="notes" size={18} color={theme.colors.textSecondary} style={[styles.fieldIcon, { marginTop: 2 }]} />
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti, { color: theme.colors.text }]}
                    placeholder="Например: операционные расходы за май"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={withdrawReason}
                    onChangeText={onChangeReason}
                    multiline
                    editable={!isWithdrawing}
                  />
                </View>
              </View>

              <View style={[styles.hintRow, { backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)' }]}>
                <MaterialIcons name="info-outline" size={16} color={AMBER} />
                <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                  Запрос будет обработан в течение 1–3 рабочих дней.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.sheetFooter, { borderTopColor: fieldBorder }]}>
              <TouchableOpacity
                style={[styles.footerCancel, { borderColor: fieldBorder }]}
                onPress={close}
                disabled={isWithdrawing}
                activeOpacity={0.75}
              >
                <Text style={[styles.footerCancelText, { color: theme.colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerSubmit, { backgroundColor: TEAL, opacity: isWithdrawing ? 0.7 : 1 }]}
                onPress={onSubmit}
                disabled={isWithdrawing}
                activeOpacity={0.85}
              >
                {isWithdrawing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="south-west" size={18} color="#fff" />
                    <Text style={styles.footerSubmitText}>Создать запрос</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: spacing.md, paddingBottom: 130 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noAccessContainer: { alignItems: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  noAccessTitle: { fontSize: 21, fontWeight: '800' },
  noAccessText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Hero — Admin Finance Card (bank-card mockup с flip-эффектом)
  heroCardWrap: { marginBottom: spacing.md },
  heroCardPressLayer: { height: 214 },
  heroCard: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 214,
    borderRadius: 22,
    borderWidth: 1.3,
    padding: 18,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
  },
  heroCardBack: { backfaceVisibility: 'hidden' },
  heroToneLayer: {
    position: 'absolute',
    top: -34,
    bottom: -34,
    right: 36,
    width: 128,
    opacity: 0.20,
    transform: [{ rotate: '-12deg' }],
  },
  heroDepthLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    opacity: 0.10,
  },
  heroSheen: {
    position: 'absolute',
    right: 22,
    top: -42,
    width: 128,
    height: 260,
    opacity: 0.06,
    transform: [{ rotate: '18deg' }],
  },
  heroRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  heroRailRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4 },
  heroStripeContainer: {
    position: 'absolute',
    top: -120, left: -80, right: -80, bottom: -120,
    transform: [{ rotate: '38deg' }],
    gap: 16,
  },
  heroStripeLine: { height: 1 },
  heroBloom: {
    position: 'absolute',
    top: -34,
    left: -30,
    width: 170,
    height: 86,
    borderRadius: 18,
    transform: [{ rotate: '-16deg' }],
  },
  heroBrandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroBrandSub: { fontSize: 9, fontWeight: '800', letterSpacing: 1.7, marginBottom: 2 },
  heroBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2.4 },
  heroContactless: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  heroChipRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroChip: {
    width: 42, height: 32, borderRadius: 5,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  heroChipLineH: { position: 'absolute', width: '100%', height: 1.5, backgroundColor: 'rgba(120,80,0,0.45)' },
  heroChipLineV: { position: 'absolute', width: 1.5, height: '100%', backgroundColor: 'rgba(120,80,0,0.45)' },
  heroChipCenter: {
    width: 18, height: 14, borderRadius: 2,
    backgroundColor: 'rgba(180,130,20,0.7)',
    borderWidth: 1, borderColor: 'rgba(120,80,0,0.3)',
  },
  heroProgramLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingRight: 4,
  },
  heroNumberGroup: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2.1,
    lineHeight: 24,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroSmallLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  heroHolderName: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },

  // Back side
  heroBackBrand: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.6,
  },
  heroBackStripeContainer: {
    position: 'absolute',
    top: -130,
    left: -86,
    right: -86,
    bottom: -130,
    transform: [{ rotate: '38deg' }],
    gap: 17,
    opacity: 0.72,
  },
  heroBackStripeLine: { height: 1 },
  heroBackMagStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 52,
    height: 28,
    justifyContent: 'center',
  },
  heroBackMagStripeShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  heroBackMagStripeHighlight: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 4,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBackMagStripeBottom: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 4,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  heroBackBalanceCenter: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 96,
    bottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBackCaption: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'lowercase',
  },
  heroBackBalanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  heroBackBalanceAmount: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 50,
  },
  heroBackBalanceCurrency: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },

  heroFlipHint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
  },

  // KPI strip
  // Tabs
  tabsRow: { gap: spacing.sm, paddingBottom: spacing.md, alignItems: 'center' },
  tabButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  tabText: { fontSize: 12, fontWeight: '800' },

  // Panel
  panel: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  sectionHint: { fontSize: 11, fontWeight: '600' },
  linkText: { fontSize: 12, fontWeight: '800' },

  // Split bar
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  splitHeaderSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  splitLiquidityChip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 78,
  },
  splitLiquidityValue: { fontSize: 14, fontWeight: '900' },
  splitLiquidityLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },

  splitBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: spacing.md },
  splitSegment: { height: '100%' },

  splitLegendRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  splitLegendCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  splitLegendTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  splitLegendIcon: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  splitLegendLabel: { flex: 1, fontSize: 11, fontWeight: '700' },
  splitLegendShare: { fontSize: 11, fontWeight: '900' },
  splitLegendValue: { fontSize: 15, fontWeight: '900' },

  splitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  splitFooterStat: { flex: 1, alignItems: 'center', gap: 4 },
  splitFooterIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  statDivider: { width: 1, height: 36, marginHorizontal: 2 },
  smallStatValue: { fontSize: 12, fontWeight: '900' },
  smallStatLabel: { fontSize: 10, marginTop: 1, fontWeight: '600' },

  // Actions
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  primaryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: borderRadius.lg, paddingVertical: spacing.md, gap: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: borderRadius.lg, paddingVertical: spacing.md, gap: 6,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '900' },

  // Transaction item
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '800' },
  txTime: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '900' },

  // Withdrawal
  withdrawalItem: { paddingVertical: spacing.md },
  withdrawalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  withdrawalAmount: { fontSize: 15, fontWeight: '900' },
  withdrawalAccount: { fontSize: 12, marginTop: 2 },
  withdrawalDate: { fontSize: 11 },
  withdrawalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  withdrawalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  actionBtnPrimary: {},
  actionBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 10, fontWeight: '800' },

  // AI command center: theme-independent layout; цвета поднимаются через heroStyles.
  cmdHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cmdEyebrowGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  signalRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  signal: {
    flex: 1, borderWidth: 1, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, paddingHorizontal: 6,
    alignItems: 'center',
  },
  signalValue: { fontWeight: '900' },
  signalLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },

  // Anomaly detector card
  anomalyHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md,
  },
  anomalyHeroIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  anomalyHeaderTitle: { fontSize: 14, fontWeight: '900' },
  anomalyHeaderSub: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  anomalyCountPill: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  anomalyCountValue: { fontSize: 16, fontWeight: '900' },
  anomalyCountTotal: { fontSize: 11, fontWeight: '700' },
  anomalyEmpty: { fontSize: 12, textAlign: 'center', paddingVertical: spacing.sm },
  anomalyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  anomalyDot: { width: 8, height: 8, borderRadius: 4 },
  anomalyRowTitle: { fontSize: 13, fontWeight: '800' },
  anomalyRowSub: { fontSize: 11, marginTop: 2 },
  anomalyRowTime: { fontSize: 11, fontWeight: '600' },

  // Recommendations
  recommendation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  recommendationIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  recommendationTitle: { fontSize: 13, fontWeight: '900', marginBottom: 4 },
  recommendationText: { fontSize: 12, lineHeight: 17 },
  recommendationValue: { fontSize: 11, fontWeight: '900', marginTop: 6 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },

  // Withdraw bottom-sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6, 18, 30, 0.55)',
  },
  sheet: {
    width: '100%',
    height: SHEET_H,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  sheetGrip: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.sm + 2,
  },
  sheetHeaderSide: {
    width: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheetHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  balancePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderRadius: 18,
    borderWidth: 1,
  },
  balanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  balanceMaxBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  balanceMaxText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md - 2,
    minHeight: 50,
  },
  fieldWrapMulti: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm + 2,
    minHeight: 96,
  },
  fieldIcon: {
    marginRight: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontWeight: '600',
  },
  fieldInputMulti: {
    paddingVertical: 0,
    minHeight: 64,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  fieldSuffix: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: spacing.sm,
    letterSpacing: 0.4,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg + 6 : spacing.md,
    borderTopWidth: 1,
  },
  footerCancel: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  footerCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerSubmit: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  footerSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

// Стили, цвета которых зависят от темы (AI command center + anomaly strip).
// Считаются на каждое переключение темы через useMemo в компоненте.
const makeHeroStyles = (HERO) => StyleSheet.create({
  cmdCard: {
    backgroundColor: HERO.bg,
    borderWidth: 1, borderColor: HERO.cardLine,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cmdEyebrow: { color: HERO.inkDim, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  cmdMethodPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: HERO.bgLayer,
    borderWidth: 1, borderColor: HERO.cardLine,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  cmdMethodText: { color: HERO.inkDim, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  cmdHeroLabel: { color: HERO.inkDim, fontSize: 11, fontWeight: '700', marginTop: spacing.md, letterSpacing: 0.3 },
  cmdHeroValue: { color: HERO.ink, fontSize: 28, fontWeight: '900', marginTop: 2 },
  cmdStatsRow: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: HERO.cardLine,
  },
  cmdStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  cmdStatValue: { fontSize: 13, fontWeight: '900', marginTop: 3 },
  cmdNoChart: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md, padding: spacing.sm,
    backgroundColor: HERO.trackBg, borderRadius: borderRadius.md,
  },
  cmdNoChartText: { color: HERO.inkFaint, fontSize: 11, flex: 1 },
  anomalyStripWrap: {
    borderRadius: borderRadius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: HERO.cardLine,
  },
});
