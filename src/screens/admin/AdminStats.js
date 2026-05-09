import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const PERIODS = [
  { id: 'week',    label: 'Неделя',  days: 7   },
  { id: 'month',   label: 'Месяц',   days: 30  },
  { id: 'quarter', label: 'Квартал', days: 90  },
  { id: 'year',    label: 'Год',     days: 365 },
];

const TABS = [
  { id: 'overview',    label: 'Обзор',    icon: 'dashboard'    },
  { id: 'ai',          label: 'AI рынок', icon: 'auto-awesome' },
  { id: 'revenue',     label: 'Оборот',   icon: 'trending-up'  },
  { id: 'users',       label: 'Клиенты',  icon: 'people'       },
  { id: 'properties',  label: 'Объекты',  icon: 'location-city'},
];

const clamp    = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const asNumber = v => Number(v || 0);
const fmtNum   = v => asNumber(v).toLocaleString('ru-RU');
const fmtMoney = v => `PRB ${fmtNum(Math.round(asNumber(v)))}`;
const fmtPct   = v => `${asNumber(v).toFixed(1)}%`;

function MarkdownText({ text, style, boldColor }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ fontWeight: '900', color: boldColor }}>{part}</Text>
          : part
      )}
    </Text>
  );
}

const WEEK_LABELS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTH_LABELS  = ['1н','2н','3н','4н'];
const QUARTER_LABELS= ['Мес 1','Мес 2','Мес 3'];
const MONTH_NAMES   = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

function buildChartBuckets(bookings, periodId) {
  const now = new Date();
  const paid = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');

  if (periodId === 'week') {
    const buckets = Array(7).fill(0);
    const cutoff  = new Date(now - 7 * 86400000);
    paid.forEach(b => {
      const d = new Date(b.createdAt || b.date);
      if (d >= cutoff) {
        const dow = (d.getDay() + 6) % 7; // 0=Пн
        buckets[dow] += asNumber(b.totalPrice);
      }
    });
    return { values: buckets, labels: WEEK_LABELS };
  }

  if (periodId === 'month') {
    const buckets = Array(4).fill(0);
    const cutoff  = new Date(now - 30 * 86400000);
    paid.forEach(b => {
      const d = new Date(b.createdAt || b.date);
      if (d >= cutoff) {
        const daysAgo = Math.floor((now - d) / 86400000);
        const idx = Math.min(3, Math.floor(daysAgo / 7));
        buckets[3 - idx] += asNumber(b.totalPrice);
      }
    });
    return { values: buckets, labels: MONTH_LABELS };
  }

  if (periodId === 'quarter') {
    const buckets = Array(3).fill(0);
    const cutoff  = new Date(now - 90 * 86400000);
    paid.forEach(b => {
      const d = new Date(b.createdAt || b.date);
      if (d >= cutoff) {
        const daysAgo = Math.floor((now - d) / 86400000);
        const idx = Math.min(2, Math.floor(daysAgo / 30));
        buckets[2 - idx] += asNumber(b.totalPrice);
      }
    });
    return { values: buckets, labels: QUARTER_LABELS };
  }

  // year — по месяцам
  const buckets = Array(12).fill(0);
  const cutoff  = new Date(now - 365 * 86400000);
  paid.forEach(b => {
    const d = new Date(b.createdAt || b.date);
    if (d >= cutoff) {
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      const idx = Math.min(11, Math.max(0, 11 - monthsAgo));
      buckets[idx] += asNumber(b.totalPrice);
    }
  });
  const labels = Array(12).fill(0).map((_, i) => {
    const m = new Date(now);
    m.setMonth(now.getMonth() - (11 - i));
    return MONTH_NAMES[m.getMonth()];
  });
  return { values: buckets, labels };
}

const BAR_CHART_H = 180;

export default function AdminStats() {
  const [activeTab,       setActiveTab]       = useState('overview');
  const [selectedPeriod,  setSelectedPeriod]  = useState('month');
  const [statsData,       setStatsData]       = useState(null);
  const [allBookings,     setAllBookings]      = useState([]);
  const [isLoading,       setIsLoading]        = useState(true);
  const [refreshing,      setRefreshing]       = useState(false);
  const [aiAnalysis,      setAiAnalysis]       = useState('');
  const [aiLoading,       setAiLoading]        = useState(false);
  const { theme } = useTheme();

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentSlide   = useRef(new Animated.Value(0)).current;

  const animateSwitch = useCallback((callback) => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(contentSlide,   { toValue: -12, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      callback();
      contentSlide.setValue(14);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(contentSlide,   { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [contentOpacity, contentSlide]);

  const handleTabChange = useCallback((id) => {
    if (id === activeTab) return;
    animateSwitch(() => setActiveTab(id));
  }, [activeTab, animateSwitch]);

  const handlePeriodChange = useCallback((id) => {
    if (id === selectedPeriod) return;
    animateSwitch(() => setSelectedPeriod(id));
  }, [selectedPeriod, animateSwitch]);

  const load = useCallback(async () => {
    try {
      if (!refreshing) setIsLoading(true);
      const [statsRes, bookingsRes] = await Promise.all([
        apiCall(`${getApiUrl()}/admin/stats`),
        apiCall(`${getApiUrl()}/bookings`),
      ]);
      if (statsRes.success)    setStatsData(statsRes);
      if (bookingsRes.success) setAllBookings(bookingsRes.bookings || []);
    } catch (e) {
      console.error('AdminStats load error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const requestAiAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis('');
    try {
      const topProperty = properties.length > 0
        ? properties.reduce((a, b) => asNumber(a.revenue) > asNumber(b.revenue) ? a : b)?.name
        : null;

      const result = await apiCall(`${getApiUrl()}/admin/ai-analysis`, {
        method: 'POST',
        body: JSON.stringify({
          stats: {
            users:           metrics.users,
            purchases:       metrics.purchases,
            revenue:         metrics.revenue,
            premium:         metrics.premium,
            avgBooking:      Math.round(model.avgBooking),
            pendingBookings: model.pendingCount,
            convRate:        model.convRate.toFixed(1),
            propertyCount:   properties.length,
            topProperty,
          },
        }),
      });

      if (result.success) {
        setAiAnalysis(result.analysis);
      } else {
        setAiAnalysis(`Ошибка: ${result.error}`);
      }
    } catch (e) {
      setAiAnalysis(`Ошибка подключения: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Метрики за выбранный период из реальных бронирований ──────────────────
  const metrics = useMemo(() => {
    const periodDays = PERIODS.find(p => p.id === selectedPeriod)?.days || 30;
    const cutoff = new Date(Date.now() - periodDays * 86400000);

    const filtered = allBookings.filter(b => new Date(b.createdAt || b.date) >= cutoff);
    const revenue  = filtered
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + asNumber(b.totalPrice), 0);

    return {
      users:     asNumber(statsData?.statsPerPeriod?.month?.users),
      purchases: filtered.length,
      revenue,
      premium:   asNumber(statsData?.statsPerPeriod?.month?.premium),
    };
  }, [allBookings, selectedPeriod, statsData]);

  const topUsers   = statsData?.topUsers   || [];
  const properties = statsData?.properties || [];

  // ── AI-модель (всё из реальных данных) ────────────────────────────────────
  const model = useMemo(() => {
    const users        = asNumber(metrics.users);
    const purchases    = asNumber(metrics.purchases);
    const revenue      = asNumber(metrics.revenue);
    const premium      = asNumber(metrics.premium);
    const propCount    = Math.max(properties.length, 1);
    const avgBooking   = purchases > 0 ? revenue / purchases : 0;
    const revPerUser   = users   > 0 ? revenue / users   : 0;
    const premiumShare = users   > 0 ? (premium / users) * 100 : 0;
    const utilization  = clamp((purchases / (propCount * 20)) * 100, 0, 100);
    const topRevenue   = properties.reduce((m, p) => Math.max(m, asNumber(p.revenue)), 0);
    const concentration = revenue > 0 ? (topRevenue / revenue) * 100 : 0;

    // Достаточность данных: нет бронирований → нет смысла в оценке
    const hasEnoughBookings = purchases >= 3 || allBookings.length >= 3;
    // Вес premiumShare корректируется по числу пользователей (сглаживает выброс при 1 клиенте)
    const premiumConfidence = clamp(users / 10, 0, 1);
    const demandScore = hasEnoughBookings
      ? clamp((utilization * 0.55) + (premiumShare * 0.6 * premiumConfidence) + (avgBooking / 1200), 8, 95)
      : null; // null = нет данных
    const riskScore = hasEnoughBookings
      ? clamp((concentration * 0.45) + (premiumShare < 12 ? 22 : 8) + (purchases < propCount ? 18 : 4), 5, 92)
      : null;

    const pendingCount = allBookings.filter(b => b.status === 'pending').length;
    const canceledCount = allBookings.filter(b => b.status === 'cancelled').length;
    const convRate = allBookings.length > 0
      ? (allBookings.filter(b => b.status === 'completed').length / allBookings.length) * 100 : 0;

    const marketMood = demandScore === null ? 'недостаточно данных'
      : demandScore >= 70 ? 'рынок горячий'
      : demandScore >= 45 ? 'рынок стабильный' : 'рынок требует стимулов';
    const priceSignal = avgBooking >= 30000 ? 'можно тестировать premium-пакеты' : 'есть место для апсейла';

    const recommendations = [
      {
        title: premiumShare < 15 ? 'Ускорить переход в Gold/Platinum' : 'Удерживать premium-клиентов',
        body: premiumShare < 15
          ? `AI видит низкую долю premium (${fmtPct(premiumShare)}). Запусти бонус за вторую бронь и персональный оффер для клиентов с высоким чеком.`
          : `Premium-сегмент занимает ${fmtPct(premiumShare)}. Давай ранний доступ к лучшим объектам, а не широкие скидки.`,
        impact: premiumShare < 15 ? '+8-14% к повторным броням' : '+4-7% к LTV',
        icon: 'workspace-premium',
        color: '#8B5CF6',
      },
      {
        title: avgBooking < 25000 ? 'Поднять средний чек' : 'Защитить маржу',
        body: avgBooking < 25000
          ? `Средний чек ${fmtMoney(avgBooking)}. Добавь пакеты: поздний выезд, трансфер, upgrade номера.`
          : `Средний чек ${fmtMoney(avgBooking)} — здоровый. Не делай массовые скидки, используй ограниченные бонусы по датам с низкой загрузкой.`,
        impact: avgBooking < 25000 ? '+6-11% к обороту' : 'меньше просадки маржи',
        icon: 'sell',
        color: '#10B981',
      },
      {
        title: pendingCount > 0 ? `${pendingCount} бронирований ждут подтверждения` : 'Конверсия в норме',
        body: pendingCount > 0
          ? `Не откладывай подтверждение — клиенты теряют интерес. Конверсия сейчас ${fmtPct(convRate)}.`
          : `Конверсия ${fmtPct(convRate)}. ${canceledCount > 0 ? `Было ${canceledCount} отмен — проверь причины.` : 'Отмен нет — отличный результат.'}`,
        impact: pendingCount > 0 ? 'ускорить обработку' : `конверсия ${fmtPct(convRate)}`,
        icon: pendingCount > 0 ? 'pending-actions' : 'check-circle',
        color: pendingCount > 0 ? '#F59E0B' : '#06B6D4',
      },
      {
        title: concentration > 45 ? 'Снизить зависимость от одного объекта' : 'Масштабировать лучшие объекты',
        body: concentration > 45
          ? `${fmtPct(concentration)} дохода — один объект. Выведи 2-3 похожих в промо, чтобы снизить риск.`
          : `Доход распределён нормально. Усиль карточки объектов с лучшей конверсией и отзывами.`,
        impact: concentration > 45 ? 'ниже операционный риск' : '+5-9% к продажам',
        icon: 'hub',
        color: '#06B6D4',
      },
    ];

    const scenarios = [
      { name: 'Осторожный',  value: revenue * 1.04, note: 'без скидок, фокус на удержание' },
      { name: 'Базовый',     value: revenue * 1.11, note: 'AI-офферы и апсейл' },
      { name: 'Агрессивный', value: revenue * 1.19, note: 'промо на слабые даты' },
    ];

    return {
      avgBooking, revPerUser, premiumShare, utilization,
      demandScore, riskScore, marketMood, priceSignal,
      recommendations, scenarios, pendingCount, convRate,
    };
  }, [metrics, properties, allBookings]);

  // ── Данные графика оборота ─────────────────────────────────────────────────
  const revenueChart = useMemo(() =>
    buildChartBuckets(allBookings, selectedPeriod),
  [allBookings, selectedPeriod]);

  const periodLabel = PERIODS.find(p => p.id === selectedPeriod)?.label || 'Период';

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Загрузка статистики...</Text>
      </View>
    );
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const StatCard = ({ icon, label, value, color, hint }) => (
    <View style={[styles.statCard, {
      backgroundColor: theme.colors.cardBg,
      borderColor: theme.colors.border,
      borderLeftColor: color,
      borderLeftWidth: 3,
    }]}>
      <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statCardText}>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        {!!hint && <Text style={[styles.statHint, { color }]}>{hint}</Text>}
      </View>
    </View>
  );

  const InsightCard = ({ item }) => (
    <View style={[styles.insightCard, { backgroundColor: theme.colors.cardBg, borderColor: `${item.color}30` }]}>
      <View style={[styles.insightIcon, { backgroundColor: `${item.color}18` }]}>
        <MaterialIcons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.insightText,  { color: theme.colors.textSecondary }]}>{item.body}</Text>
        <View style={[styles.impactBadge, { backgroundColor: `${item.color}18` }]}>
          <Text style={[styles.insightImpact, { color: item.color }]}>{item.impact}</Text>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <>
      <View style={[styles.hero, {
        backgroundColor: theme.colors.cardBg,
        borderColor: theme.colors.border,
        borderLeftColor: theme.colors.primary,
        borderLeftWidth: 4,
      }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={[styles.heroEyebrow, { color: theme.colors.primary }]}>Аналитика за период</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{periodLabel}</Text>
          </View>
          {model.demandScore !== null && (
            <View style={[styles.scoreBadge, { backgroundColor: '#10B98118', borderWidth: 1, borderColor: '#10B98140' }]}>
              <Text style={[styles.scoreBadgeText, { color: '#10B981' }]}>
                {Math.round(model.demandScore)}/100
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.heroText, { color: theme.colors.textSecondary }]}>
          AI оценивает спрос как: <Text style={{ fontWeight: '700', color: theme.colors.text }}>{model.marketMood}</Text>.
          {model.demandScore !== null ? ` Главный сигнал: ${model.priceSignal}.` : ' Добавьте бронирования для анализа.'}
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatCard icon="people"             label="Клиентов"     value={fmtNum(metrics.users)}    color={theme.colors.primary} />
        <StatCard icon="shopping-bag"       label="Бронирований" value={fmtNum(metrics.purchases)} color="#06B6D4" />
        <StatCard icon="payments"           label="Оборот"       value={fmtMoney(metrics.revenue)} color="#10B981" />
        <StatCard icon="workspace-premium"  label="Premium"      value={fmtNum(metrics.premium)}   color="#8B5CF6" />
      </View>

      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Эффективность</Text>
        <MetricRow label="Средний чек"       value={fmtMoney(model.avgBooking)}  progress={clamp(model.avgBooking / 50000 * 100, 3, 100)} color={theme.colors.primary} theme={theme} />
        <MetricRow label="Доход на клиента"  value={fmtMoney(model.revPerUser)}  progress={clamp(model.revPerUser / 12000 * 100, 3, 100)}  color="#06B6D4" theme={theme} />
        <MetricRow label="Доля Premium"      value={fmtPct(model.premiumShare)}  progress={clamp(model.premiumShare, 3, 100)}              color="#8B5CF6" theme={theme} />
        <MetricRow label="Загрузка объектов" value={fmtPct(model.utilization)}   progress={model.utilization}                              color="#10B981" theme={theme} />
      </View>
    </>
  );

  const renderAi = () => (
    <>
      <View style={[styles.aiPanel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.aiHeader}>
          <View style={[styles.aiIcon, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="auto-awesome" size={26} color="#fff" />
          </View>
          <View style={styles.aiTitleBlock}>
            <Text style={[styles.aiTitle, { color: theme.colors.text }]}>AI market analyst</Text>
            <Text style={[styles.aiSubtitle, { color: theme.colors.textSecondary }]}>
              {allBookings.length} бронирований · {properties.length} объектов · {metrics.users} клиентов
            </Text>
          </View>
        </View>
        <View style={styles.signalGrid}>
          <SignalPill label="Спрос"     value={model.demandScore !== null ? Math.round(model.demandScore) : '—'} color="#10B981" theme={theme} />
          <SignalPill label="Риск"      value={model.riskScore   !== null ? Math.round(model.riskScore)   : '—'} color="#F59E0B" theme={theme} />
          <SignalPill label="Premium"   value={`${Math.round(model.premiumShare)}%`}                             color="#8B5CF6" theme={theme} />
          <SignalPill label="Конверсия" value={`${model.convRate.toFixed(0)}%`}                                  color="#06B6D4" theme={theme} />
        </View>

        {/* Кнопка живого AI-анализа */}
        <TouchableOpacity
          style={[styles.aiRequestBtn, { backgroundColor: theme.colors.primary }, aiLoading && { opacity: 0.7 }]}
          onPress={requestAiAnalysis}
          disabled={aiLoading}
          activeOpacity={0.85}
        >
          {aiLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.aiRequestBtnText}>Анализирую данные...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="auto-awesome" size={16} color="#fff" />
              <Text style={styles.aiRequestBtnText}>
                {aiAnalysis ? 'Обновить AI-анализ' : 'Запросить AI-анализ'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Живой ответ от AI */}
        {!!aiAnalysis && (
          <View style={[styles.aiResponse, { backgroundColor: `${theme.colors.primary}0C`, borderColor: `${theme.colors.primary}30` }]}>
            <MarkdownText
              text={aiAnalysis}
              style={[styles.aiResponseText, { color: theme.colors.text }]}
              boldColor={theme.colors.primary}
            />
          </View>
        )}
      </View>

      {metrics.purchases > 0 || metrics.revenue > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.sm }]}>
            Авто-рекомендации по данным
          </Text>
          {model.recommendations.map(item => (
            <InsightCard key={item.title} item={item} />
          ))}

          <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Сценарии оборота</Text>
            <Text style={[styles.scenarioBase, { color: theme.colors.textSecondary }]}>
              База: {fmtMoney(metrics.revenue)} за {periodLabel.toLowerCase()}
            </Text>
            {model.scenarios.map((s, i) => (
              <View key={s.name} style={[
                styles.scenarioRow,
                { borderBottomColor: theme.colors.border },
                i === model.scenarios.length - 1 && { borderBottomWidth: 0 },
              ]}>
                <View>
                  <Text style={[styles.scenarioName, { color: theme.colors.text }]}>{s.name}</Text>
                  <Text style={[styles.scenarioNote, { color: theme.colors.textSecondary }]}>{s.note}</Text>
                </View>
                <Text style={[styles.scenarioValue, { color: theme.colors.primary }]}>{fmtMoney(s.value)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border, alignItems: 'center' }]}>
          <MaterialIcons name="insights" size={42} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginTop: spacing.sm }]}>
            Недостаточно данных за выбранный период
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }]}>
            Рекомендации появятся после первых бронирований
          </Text>
        </View>
      )}
    </>
  );

  const renderRevenue = () => {
    const { values, labels } = revenueChart;
    const maxVal = Math.max(...values, 1);
    const hasData = values.some(v => v > 0);

    return (
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Динамика оборота — {periodLabel}
        </Text>

        {!hasData ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="bar-chart" size={42} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Нет завершённых бронирований за этот период
            </Text>
          </View>
        ) : (
          <View style={[styles.barChart, { height: BAR_CHART_H }]}>
            {values.map((val, index) => {
              const barH = val > 0
                ? Math.max(Math.round((val / maxVal) * (BAR_CHART_H - 28)), 6)
                : 4;
              const isLast = index === values.length - 1;
              return (
                <View key={index} style={styles.barColumn}>
                  <Text style={[styles.barTopLabel, { color: theme.colors.textSecondary }]}>
                    {val > 0 ? fmtNum(Math.round(val / 1000)) + 'k' : ''}
                  </Text>
                  <View style={[styles.bar, {
                    height: barH,
                    backgroundColor: isLast ? theme.colors.primary : '#06B6D4',
                    opacity: isLast ? 1 : val === 0 ? 0.2 : 0.75,
                  }]} />
                  <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{labels[index]}</Text>
                </View>
              );
            })}
          </View>
        )}

        <MetricRow label="Прогноз роста (AI)"   value={metrics.revenue > 0 ? '+11%' : 'нет данных'}                              progress={metrics.revenue > 0 ? 66 : 0}               color="#10B981" theme={theme} />
        <MetricRow label="Риск просадки (AI)"   value={model.riskScore !== null ? fmtPct(model.riskScore) : 'нет данных'}       progress={model.riskScore ?? 0}                       color="#F59E0B" theme={theme} />
      </View>
    );
  };

  const renderUsers = () => (
    <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Топ активных клиентов</Text>
      <FlatList
        data={topUsers}
        keyExtractor={item => String(item.id)}
        scrollEnabled={false}
        ListEmptyComponent={<EmptyState text="Пока нет данных по клиентам" theme={theme} />}
        renderItem={({ item }) => (
          <View style={[styles.listRow, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>{String(item.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.listContent}>
              <Text style={[styles.listTitle,    { color: theme.colors.text }]}>{item.name}</Text>
              <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>{item.status} · {item.purchases} броней</Text>
            </View>
            <Text style={[styles.listValue, { color: theme.colors.primary }]}>{fmtMoney(item.spent)}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderProperties = () => (
    <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Объекты и рыночный потенциал</Text>
      <FlatList
        data={properties}
        keyExtractor={item => String(item.id)}
        scrollEnabled={false}
        ListEmptyComponent={<EmptyState text="Пока нет данных по объектам" theme={theme} />}
        renderItem={({ item }) => {
          const totalRev = properties.reduce((s, p) => s + asNumber(p.revenue), 0);
          const share = totalRev > 0 ? (asNumber(item.revenue) / totalRev) * 100 : 0;
          return (
            <View style={[styles.propertyRow, { borderBottomColor: theme.colors.border }]}>
              <View style={[styles.propertyIcon, { backgroundColor: '#06B6D430' }]}>
                <MaterialIcons name="apartment" size={20} color="#06B6D4" />
              </View>
              <View style={styles.listContent}>
                <Text style={[styles.listTitle,    { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={[styles.listSubtitle, { color: theme.colors.textSecondary }]}>
                  {fmtNum(item.bookings)} броней · {fmtPct(share)} оборота
                </Text>
              </View>
              <Text style={[styles.listValue, { color: theme.colors.primary }]}>{fmtMoney(item.revenue)}</Text>
            </View>
          );
        }}
      />
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'ai':         return renderAi();
      case 'revenue':    return renderRevenue();
      case 'users':      return renderUsers();
      case 'properties': return renderProperties();
      default:           return renderOverview();
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {/* Sticky header: period selector + tabs */}
      <View style={styles.header}>
        <View style={[styles.segmentedControl, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.segmentButton, selectedPeriod === p.id && { backgroundColor: theme.colors.primary }]}
              onPress={() => handlePeriodChange(p.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, { color: selectedPeriod === p.id ? '#fff' : theme.colors.textSecondary }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map(tab => (
            <AnimatedTabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onPress={() => handleTabChange(tab.id)}
              theme={theme}
            />
          ))}
        </ScrollView>
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
      >
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentSlide }] }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function AnimatedTabButton({ tab, active, onPress, theme }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 10, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          active
            ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
            : { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <MaterialIcons name={tab.icon} size={16} color={active ? '#fff' : theme.colors.textSecondary} />
        <Text style={[styles.tabText, { color: active ? '#fff' : theme.colors.text }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MetricRow({ label, value, progress, color, theme }) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
        <View style={[styles.progressFill, { width: `${clamp(progress, 0, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SignalPill({ label, value, color, theme }) {
  return (
    <View style={[styles.signalPill, { backgroundColor: `${color}12`, borderColor: `${color}40`, borderWidth: 1 }]}>
      <Text style={[styles.signalValue, { color }]}>{value}</Text>
      <Text style={[styles.signalLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function EmptyState({ text, theme }) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="inbox" size={42} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1 },
  header:    { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  segmentedControl: {
    flexDirection: 'row', borderWidth: 1, borderRadius: borderRadius.lg, padding: 4, marginBottom: spacing.md,
  },
  segmentButton: { flex: 1, paddingVertical: 9, borderRadius: borderRadius.md, alignItems: 'center' },
  segmentText:   { fontSize: 13, fontWeight: '700' },

  tabRow: { gap: spacing.sm, paddingBottom: spacing.md },
  tabButton: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 9, gap: spacing.xs,
  },
  tabText: { fontSize: 13, fontWeight: '700' },

  hero: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle:   { fontSize: 28, fontWeight: '900', marginTop: spacing.xs },
  heroText:    { fontSize: 14, lineHeight: 21, marginTop: spacing.md },
  scoreBadge:  { borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scoreBadgeText: { fontSize: 15, fontWeight: '900' },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.sm },
  statCard: {
    width: '48.5%', borderWidth: 1, borderRadius: borderRadius.lg,
    padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center',
  },
  iconBox:     { width: 42, height: 42, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, flexShrink: 0 },
  statCardText: { flex: 1 },
  statValue:   { fontSize: 16, fontWeight: '900' },
  statLabel:   { fontSize: 11, marginTop: 2 },
  statHint:    { fontSize: 11, fontWeight: '700', marginTop: spacing.xs },

  panel: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginBottom: spacing.md },

  metricRow:   { marginBottom: spacing.md },
  metricHeader:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  metricLabel: { fontSize: 13, fontWeight: '600' },
  metricValue: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },

  aiPanel:    { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  aiHeader:   { flexDirection: 'row', alignItems: 'center' },
  aiIcon:     { width: 52, height: 52, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  aiTitleBlock: { flex: 1 },
  aiTitle:    { fontSize: 18, fontWeight: '900' },
  aiSubtitle: { fontSize: 13, lineHeight: 18, marginTop: spacing.xs },

  aiRequestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14, marginTop: spacing.lg,
  },
  aiRequestBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  aiResponse: {
    marginTop: spacing.md, borderWidth: 1, borderRadius: 14, padding: spacing.md,
  },
  aiModelTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  aiResponseText: { fontSize: 14, lineHeight: 22 },

  signalGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  signalPill: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  signalValue: { fontSize: 20, fontWeight: '900' },
  signalLabel: { fontSize: 11, marginTop: spacing.xs },

  insightCard: { flexDirection: 'row', borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  insightIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, flexShrink: 0 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 14, fontWeight: '800', marginBottom: spacing.xs },
  insightText:  { fontSize: 13, lineHeight: 18 },
  impactBadge:  { alignSelf: 'flex-start', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.sm },
  insightImpact: { fontSize: 12, fontWeight: '800' },

  scenarioBase: { fontSize: 12, marginBottom: spacing.sm, marginTop: -spacing.sm },
  scenarioRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingVertical: spacing.md },
  scenarioName: { fontSize: 14, fontWeight: '800' },
  scenarioNote: { fontSize: 12, marginTop: spacing.xs },
  scenarioValue: { fontSize: 14, fontWeight: '800' },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: spacing.lg },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barTopLabel: { fontSize: 8, marginBottom: 2 },
  bar:       { width: '100%', borderRadius: borderRadius.sm },
  barLabel:  { marginTop: 4, fontSize: 10, fontWeight: '600' },

  listRow:    { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: spacing.md },
  avatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  listContent: { flex: 1 },
  listTitle:   { fontSize: 14, fontWeight: '700' },
  listSubtitle:{ fontSize: 12, marginTop: spacing.xs },
  listValue:   { fontSize: 13, fontWeight: '800', marginLeft: spacing.sm },

  propertyRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: spacing.md },
  propertyIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText:  { marginTop: spacing.sm, fontSize: 14, textAlign: 'center' },
});
