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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line as SvgLine } from 'react-native-svg';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const NAVY  = '#063B5C';
const NAVY2 = '#0B5C7A';
const TEAL  = '#14B8A6';
const TEAL2 = '#0F766E';
const AMBER = '#F59E0B';
const RED   = '#DC2626';
const GREEN = '#10B981';

// Dark "AI command center" палитра — одинаково смотрится в светлой и тёмной теме
const HERO = {
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
};

const SCREEN_W = Dimensions.get('window').width;
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
const formatNumber = (value) => asNumber(value).toLocaleString('ru-RU');

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
  const { theme } = useTheme();
  const { user } = useAuth();

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

  const renderSummary = () => (
    <>
      {/* Wallet split */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Распределение средств</Text>
          <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
            ликвидность {formatPercent(model.liquidityRatio)}
          </Text>
        </View>

        <View style={[styles.splitBar, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.splitSegment, { width: `${clamp(model.availableShare, 0, 100)}%`, backgroundColor: GREEN }]} />
          <View style={[styles.splitSegment, { width: `${clamp(model.pendingShare,   0, 100)}%`, backgroundColor: AMBER }]} />
        </View>

        <View style={styles.splitLegend}>
          <SplitLegendItem color={GREEN} label="Доступно" value={formatMoney(model.availableBalance)} theme={theme} />
          <SplitLegendItem color={AMBER} label="В ожидании" value={formatMoney(model.pendingBalance)} theme={theme} />
        </View>

        <View style={styles.splitFooter}>
          <SmallStat label="Всего получено"  value={formatMoney(model.totalReceived)}  theme={theme} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <SmallStat label="Всего выведено"  value={formatMoney(model.totalWithdrawn)} theme={theme} />
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <SmallStat label="Выведено доля"   value={formatPercent(model.withdrawRatio)} theme={theme} />
        </View>
      </View>

      {/* Action row */}
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
              <Text style={[styles.withdrawalDate, { color: theme.colors.textSecondary }]}>
                {formatTimeAgo(w.createdAt)}
              </Text>
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
        {/* ── Dark AI Command Center ── */}
        <View style={styles.cmdCard}>
          <View style={styles.cmdHeaderRow}>
            <View style={styles.cmdEyebrowGroup}>
              <PulseDot color={HERO.good} />
              <Text style={styles.cmdEyebrow}>AI FINANCE COMMAND</Text>
            </View>
            {model.forecastMethod && (
              <View style={styles.cmdMethodPill}>
                <MaterialIcons name="model-training" size={11} color={HERO.inkDim} />
                <Text style={styles.cmdMethodText}>{methodLabel(model.forecastMethod)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.cmdHeroLabel}>Прогноз выручки · {horizon} дн</Text>
          <Text style={styles.cmdHeroValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(model.forecast30)}
          </Text>

          {hasForecast ? (
            <View style={{ marginTop: spacing.md, marginHorizontal: -spacing.sm }}>
              <ForecastChart
                daily={forecast.daily}
                lower={forecast.lower}
                upper={forecast.upper}
                width={CHART_W}
              />
            </View>
          ) : (
            <View style={styles.cmdNoChart}>
              <MaterialIcons name="cloud-off" size={20} color={HERO.inkFaint} />
              <Text style={styles.cmdNoChartText}>
                ML-сервис недоступен, показан эвристический прогноз
              </Text>
            </View>
          )}

          <View style={styles.cmdStatsRow}>
            <CmdStat
              label="Нижняя граница"
              value={model.forecastConfidence ? formatMoney(model.forecastConfidence.lower) : '—'}
              color={HERO.warn}
            />
            <CmdStat
              label="Верхняя граница"
              value={model.forecastConfidence ? formatMoney(model.forecastConfidence.upper) : '—'}
              color={HERO.good}
            />
            <CmdStat
              label="История"
              value={historyDays ? `${historyDays} дн` : '—'}
              color={HERO.ink}
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
              <View style={[styles.anomalyStripWrap, { backgroundColor: HERO.bg }]}>
                <AnomalyStrip items={anomalyItems} width={CHART_W - spacing.md} />
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
        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>Финансы администратора</Text>
              <Text style={styles.heroBalance}>{formatMoney(model.availableBalance)}</Text>
              <Text style={styles.heroSubtitle}>доступно к выводу</Text>
            </View>
            {model.healthScore !== null && (
              <View style={styles.heroHealth}>
                <Text style={styles.heroHealthValue}>{Math.round(model.healthScore)}</Text>
                <Text style={styles.heroHealthLabel}>HEALTH</Text>
              </View>
            )}
          </View>

          <View style={styles.heroFooter}>
            <HeroStat label="Всего" value={formatMoney(model.totalBalance)} />
            <View style={styles.heroDivider} />
            <HeroStat label="В ожидании" value={formatMoney(model.pendingBalance)} />
          </View>
        </View>

        {/* ── KPI strip ── */}
        <View style={styles.kpiStrip}>
          <KpiPill label="Сегодня"        value={formatMoney(model.todayAmount)}       color={TEAL}  theme={theme} compact />
          <KpiPill label="Платежей сегодня" value={formatNumber(model.todayPayments)}  color={NAVY2} theme={theme} />
          <KpiPill label="Средний чек"    value={formatMoney(model.averagePayment)}    color={AMBER} theme={theme} compact />
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

function HeroStat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function KpiPill({ label, value, color, theme, compact }) {
  return (
    <View style={[styles.kpiPill, {
      backgroundColor: theme.colors.cardBg,
      borderColor: theme.colors.border,
    }]}>
      <View style={[styles.kpiBar, { backgroundColor: color }]} />
      <Text
        style={[styles.kpiPillValue, { color: theme.colors.text, fontSize: compact ? 14 : 16 }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.kpiPillLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function SplitLegendItem({ color, label, value, theme }) {
  return (
    <View style={styles.splitLegendItem}>
      <View style={[styles.splitDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.splitLegendLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.splitLegendValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function SmallStat({ label, value, theme }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
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
function ForecastChart({ daily, lower, upper, width = CHART_W, height = 150 }) {
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
          <Stop offset="0" stopColor={HERO.good} stopOpacity="0.35" />
          <Stop offset="1" stopColor={HERO.accent} stopOpacity="0.04" />
        </LinearGradient>
        <LinearGradient id="fc-line" x1={padL} y1="0" x2={padL + w} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={HERO.good} />
          <Stop offset="1" stopColor={HERO.accent} />
        </LinearGradient>
      </Defs>

      {/* Базовая ось */}
      <SvgLine x1={padL} y1={baseLineY} x2={padL + w} y2={baseLineY} stroke={HERO.cardLine} strokeWidth={1} />

      {/* Доверительный интервал */}
      <Path d={band} fill="url(#fc-band)" />

      {/* Линия прогноза */}
      <Path d={line} stroke="url(#fc-line)" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Маркер последней точки */}
      <Circle cx={lastX} cy={lastY} r={8}   fill={HERO.accent} fillOpacity={0.18} />
      <Circle cx={lastX} cy={lastY} r={4.5} fill={HERO.accent} />
      <Circle cx={lastX} cy={lastY} r={1.8} fill="#fff" />
    </Svg>
  );
}

/**
 * Полоса аномалий: точки по оси X = время транзакции, по Y = anomaly_score.
 * `isAnomaly=true` рисуется крупным красным маркером с подсветкой, остальные — мелкими нейтральными.
 */
function AnomalyStrip({ items, width = CHART_W, height = 56 }) {
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
      <SvgLine x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke={HERO.cardLine} strokeWidth={1} />
      {points.map((p, i) =>
        p.flagged ? (
          <React.Fragment key={i}>
            <Circle cx={xAt(p.t)} cy={yAt(p.score)} r={7}   fill={HERO.bad} fillOpacity={0.22} />
            <Circle cx={xAt(p.t)} cy={yAt(p.score)} r={3.6} fill={HERO.bad} />
          </React.Fragment>
        ) : (
          <Circle key={i} cx={xAt(p.t)} cy={yAt(p.score)} r={1.6} fill="rgba(255,255,255,0.28)" />
        ),
      )}
    </Svg>
  );
}

/**
 * Маленький стат под графиком: подпись + значение, тёмный фон.
 */
function CmdStat({ label, value, color = HERO.ink }) {
  return (
    <View style={{ flex: 1, alignItems: 'flex-start' }}>
      <Text style={[styles.cmdStatLabel, { color: HERO.inkDim }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.cmdStatValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/**
 * Пульсирующая точка-индикатор работы модели.
 */
function PulseDot({ color = HERO.good }) {
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.cardBg }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Запрос на вывод</Text>

          <View style={[styles.availableBox, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.availableLabel, { color: theme.colors.textSecondary }]}>Доступно к выводу</Text>
            <Text style={[styles.availableValue, { color: TEAL }]}>
              {formatMoney(financeSummary?.wallet?.availableBalance)}
            </Text>
          </View>

          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Сумма"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
            value={withdrawAmount}
            onChangeText={onChangeAmount}
            editable={!isWithdrawing}
          />

          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Банковский счёт"
            placeholderTextColor={theme.colors.textSecondary}
            value={bankAccount}
            onChangeText={onChangeBankAccount}
            editable={!isWithdrawing}
          />

          <TextInput
            style={[styles.input, styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Причина вывода"
            placeholderTextColor={theme.colors.textSecondary}
            value={withdrawReason}
            onChangeText={onChangeReason}
            multiline
            editable={!isWithdrawing}
          />

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: TEAL }]}
            onPress={onSubmit}
            disabled={isWithdrawing}
          >
            {isWithdrawing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.modalButtonText}>Создать запрос</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalCancelButton, { borderColor: theme.colors.border }]}
            onPress={onClose}
            disabled={isWithdrawing}
          >
            <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
        </View>
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

  // Hero
  heroCard: {
    backgroundColor: NAVY,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroBalance: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 6 },
  heroSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  heroHealth: {
    backgroundColor: 'rgba(20,184,166,0.18)',
    borderWidth: 1, borderColor: 'rgba(20,184,166,0.5)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    alignItems: 'center',
    minWidth: 64,
  },
  heroHealthValue: { color: TEAL, fontSize: 22, fontWeight: '900' },
  heroHealthLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  heroFooter: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  heroDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: spacing.sm },
  heroStatValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  // KPI strip
  kpiStrip: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  kpiPill: {
    flex: 1, borderWidth: 1, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    overflow: 'hidden', position: 'relative',
  },
  kpiBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  kpiPillValue: { fontWeight: '900', marginTop: 4 },
  kpiPillLabel: { fontSize: 10, fontWeight: '600', marginTop: 4, lineHeight: 13 },

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
  splitBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.md },
  splitSegment: { height: '100%' },
  splitLegend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  splitLegendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitLegendLabel: { fontSize: 10, fontWeight: '600' },
  splitLegendValue: { fontSize: 13, fontWeight: '900', marginTop: 1 },
  splitFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statDivider: { width: 1, height: 24, marginHorizontal: 2 },
  smallStatValue: { fontSize: 12, fontWeight: '900' },
  smallStatLabel: { fontSize: 10, marginTop: 2, fontWeight: '600' },

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
  withdrawalDate: { fontSize: 11, marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 10, fontWeight: '800' },

  // AI command center (dark)
  cmdCard: {
    backgroundColor: HERO.bg,
    borderWidth: 1, borderColor: HERO.cardLine,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cmdHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cmdEyebrowGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  anomalyStripWrap: {
    borderRadius: borderRadius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: HERO.cardLine,
  },
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

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { width: '90%', borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: spacing.md },
  availableBox: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  availableLabel: { fontSize: 11, marginBottom: 4, fontWeight: '600' },
  availableValue: { fontSize: 20, fontWeight: '900' },
  input: {
    borderWidth: 1, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md, fontSize: 14,
  },
  textArea: { height: 84, textAlignVertical: 'top' },
  modalButton: {
    borderRadius: borderRadius.lg, paddingVertical: spacing.md,
    alignItems: 'center', marginBottom: spacing.sm,
  },
  modalButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  modalCancelButton: {
    borderRadius: borderRadius.lg, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1,
  },
  modalCancelText: { fontSize: 13, fontWeight: '700' },
});
