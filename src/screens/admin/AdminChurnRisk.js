/**
 * AdminChurnRisk — экран панели риска оттока.
 *
 * Источник данных: GET /api/admin/churn-risk (см. server/routes/admin.js)
 * При недоступности ML-сервиса бэк возвращает 503 с partial:true —
 * экран показывает состояние "модель временно недоступна", не ошибку.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

// Premium "command center" palette — две версии для тёмной/светлой темы.
// Тёмный hero — оригинальный «cockpit», светлый — мягкая лазурно-белая карточка,
// чтобы на светлой теме hero не выпадал чужеродным пятном.
const buildHero = (isDark) => isDark ? {
  bg:        '#0B1426',
  bgLayer:   '#10203A',
  cardLine:  'rgba(255,255,255,0.08)',
  ink:       '#F8FAFC',
  inkDim:    '#94A3B8',
  inkFaint:  '#64748B',
  trackBg:   'rgba(255,255,255,0.06)',
} : {
  bg:        '#FFFFFF',
  bgLayer:   '#EFF4FB',
  cardLine:  'rgba(15,23,42,0.08)',
  ink:       '#0F172A',
  inkDim:    '#475569',
  inkFaint:  '#94A3B8',
  trackBg:   'rgba(15,23,42,0.06)',
};

const RISK_HUES = {
  high:   '#F87171',
  medium: '#FBBF24',
  low:    '#34D399',
};

const RISK_FILTERS = [
  { id: 'all',    label: 'Все',     icon: 'list' },
  { id: 'high',   label: 'Высокий', icon: 'priority-high' },
  { id: 'medium', label: 'Средний', icon: 'warning' },
  { id: 'low',    label: 'Низкий',  icon: 'check-circle' },
];

const formatPct = (p) => `${Math.round((Number(p) || 0) * 100)}%`;

/**
 * Semicircle gauge with green→amber→red gradient stroke.
 * Fill proportional to `percent` (0–100).
 */
function GaugeArc({ percent, size = 220, trackBg, centerColor }) {
  const stroke = 16;
  const r = (size - stroke) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const arcLen = Math.PI * r;
  const safePct = Math.min(100, Math.max(0, percent));
  const filled = (arcLen * safePct) / 100;
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const height = cy + stroke / 2 + 4;

  // needle position along the arc (angle from -180° to 0°)
  const angle = Math.PI + (Math.PI * safePct) / 100; // π → 2π
  const tipR = r;
  const tipX = cx + tipR * Math.cos(angle);
  const tipY = cy + tipR * Math.sin(angle);

  return (
    <Svg width={size} height={height}>
      <Defs>
        <LinearGradient id="gaugeGrad" x1="0" y1="0" x2={size} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0"    stopColor={RISK_HUES.low} />
          <Stop offset="0.55" stopColor={RISK_HUES.medium} />
          <Stop offset="1"    stopColor={RISK_HUES.high} />
        </LinearGradient>
        <LinearGradient id="gaugeGlow" x1="0" y1="0" x2={size} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0"    stopColor={RISK_HUES.low}    stopOpacity="0.4" />
          <Stop offset="0.55" stopColor={RISK_HUES.medium} stopOpacity="0.4" />
          <Stop offset="1"    stopColor={RISK_HUES.high}   stopOpacity="0.4" />
        </LinearGradient>
      </Defs>
      {/* Background track */}
      <Path
        d={path}
        stroke={trackBg}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
      {/* Soft glow underlay */}
      {filled > 0 && (
        <Path
          d={path}
          stroke="url(#gaugeGlow)"
          strokeWidth={stroke + 8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${filled} ${arcLen}`}
          opacity={0.55}
        />
      )}
      {/* Foreground filled arc */}
      <Path
        d={path}
        stroke="url(#gaugeGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${filled} ${arcLen}`}
      />
      {/* Needle tip dot */}
      <Circle cx={tipX} cy={tipY} r={6} fill="#fff" />
      <Circle cx={tipX} cy={tipY} r={3.5} fill={centerColor} />
    </Svg>
  );
}

/**
 * Horizontal probability strip showing where `prob` (0–1) falls
 * on the global low→high gradient.
 */
function ProbStrip({ prob, height = 4 }) {
  const safe = Math.min(1, Math.max(0, prob));
  // SVG-атрибут d принимает только числовые координаты — проценты ломают парсер
  // ("Invalid number formating character '%'"). Поэтому замеряем ширину через onLayout.
  const [width, setWidth] = useState(0);
  return (
    <View
      style={{ width: '100%', height, justifyContent: 'center' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="stripGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0"   stopColor={RISK_HUES.low}    stopOpacity="0.3" />
              <Stop offset="0.5" stopColor={RISK_HUES.medium} stopOpacity="0.3" />
              <Stop offset="1"   stopColor={RISK_HUES.high}   stopOpacity="0.3" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M 0 ${height / 2} L ${width} ${height / 2}`}
            stroke="url(#stripGrad)"
            strokeWidth={height}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      )}
      {/* Position marker */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${safe * 100}%`,
          top: -3,
          width: 2,
          height: height + 6,
          marginLeft: -1,
          backgroundColor: prob >= 0.5 ? RISK_HUES.high : prob >= 0.3 ? RISK_HUES.medium : RISK_HUES.low,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

export default function AdminChurnRisk({ navigation }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const HERO = useMemo(() => buildHero(isDark), [isDark]);

  const riskHue = (risk) => RISK_HUES[risk] || RISK_HUES.low;
  const riskLabel = (risk) =>
    risk === 'high' ? 'высокий' : risk === 'medium' ? 'средний' : 'низкий';

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Запрос всегда без ?risk= — сервер всё равно скорит всех активных и потом фильтрует,
  // так что серверная фильтрация сетевую нагрузку не уменьшает, а вот клиентская
  // делает переключение фильтров мгновенным (без reload-индикатора).
  const fetchData = useCallback(async () => {
    try {
      const data = await apiCall(`${getApiUrl()}/admin/churn-risk`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setMeta(data?.meta || null);
      setError(null);
    } catch (e) {
      const message = e?.response?.data?.error || e?.message || '';
      if (e?.response?.status === 503 || /503|partial/i.test(message)) {
        setItems([]);
        setMeta(e?.response?.data?.meta || null);
        setError('ml_unavailable');
      } else {
        setError('fetch_error');
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  }, [fetchData]);

  // "Model active" pulsing dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Клиентская фильтрация — мгновенная, без сетевых запросов.
  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((it) => it.risk === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    if (meta?.counts) return meta.counts;
    const c = { high: 0, medium: 0, low: 0 };
    items.forEach((it) => { if (c[it.risk] !== undefined) c[it.risk]++; });
    return c;
  }, [items, meta]);

  const total = counts.high + counts.medium + counts.low;
  // Weighted risk index: high=1.0, medium=0.5, low=0
  const riskIndex = total > 0
    ? Math.round(((counts.high * 1.0 + counts.medium * 0.5) / total) * 100)
    : 0;

  // Spotlight: most at-risk user with probability ≥ 0.6
  const spotlight = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.probability || 0) - (a.probability || 0));
    const top = sorted[0];
    return top && top.probability >= 0.6 ? top : null;
  }, [items]);

  const styles = useMemo(() => makeStyles(colors, HERO), [colors, HERO]);

  const renderItem = ({ item }) => {
    const hue = riskHue(item.risk);
    const initial = (item.displayName || item.email || '?').trim().charAt(0).toUpperCase();
    return (
      <View style={[styles.row, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.rowAccent, { backgroundColor: hue }]} />
        <View style={styles.rowContent}>
          <View style={styles.rowTopLine}>
            <View style={[styles.avatar, { backgroundColor: `${hue}1F`, borderColor: `${hue}55` }]}>
              <Text style={[styles.avatarText, { color: hue }]}>{initial}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                {item.displayName || 'Без имени'}
              </Text>
              <Text style={[styles.rowEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.email || '—'}
                {item.membershipLevel ? ` · ${item.membershipLevel}` : ''}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowPct, { color: hue }]}>{formatPct(item.probability)}</Text>
              <Text style={[styles.rowRiskLabel, { color: colors.textSecondary }]}>
                {riskLabel(item.risk)}
              </Text>
            </View>
          </View>
          <View style={styles.rowStripWrap}>
            <ProbStrip prob={item.probability || 0} />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Запрашиваем прогноз у ML-сервиса…</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {navigation && (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Риск оттока
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            ML-прогноз по активным клиентам
          </Text>
        </View>
        {/* Симметричная распорка справа, чтобы заголовок встал ровно по центру */}
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(it) => String(it.userId)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 130 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* === Hero: command center === */}
            <View style={styles.heroCard}>
              <View style={styles.heroLayer} pointerEvents="none" />

              {/* Model status badge */}
              <View style={styles.heroTopRow}>
                <View style={styles.modelStatus}>
                  <View style={styles.statusDotWrap}>
                    <Animated.View
                      style={[
                        styles.statusDotPulse,
                        {
                          opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
                          transform: [
                            {
                              scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }),
                            },
                          ],
                        },
                      ]}
                    />
                    <View style={styles.statusDot} />
                  </View>
                  <Text style={styles.modelStatusText}>MODEL ACTIVE</Text>
                </View>
                <Text style={styles.scanCount}>
                  {meta?.scanned ? `${meta.scanned} clients · ${meta.windowDays || 90}d` : 'live scan'}
                </Text>
              </View>

              {/* Gauge */}
              <View style={styles.gaugeWrap}>
                <GaugeArc
                  percent={riskIndex}
                  size={240}
                  trackBg={HERO.trackBg}
                  centerColor={HERO.bg}
                />
                <View style={styles.gaugeCenter} pointerEvents="none">
                  <Text style={styles.gaugeBig}>
                    {riskIndex}
                    <Text style={styles.gaugeBigUnit}>%</Text>
                  </Text>
                  <Text style={styles.gaugeCaption}>Churn Risk Index</Text>
                </View>
              </View>

              {/* Risk chips — вертикальная компоновка: значение крупно, лейбл подписью.
                  Горизонтальная не помещается на узких экранах (letter-spacing съедает место). */}
              <View style={styles.heroChipsRow}>
                <View style={[styles.heroChip, { borderColor: `${RISK_HUES.high}66`, backgroundColor: `${RISK_HUES.high}1A` }]}>
                  <View style={styles.chipHeader}>
                    <View style={[styles.chipDot, { backgroundColor: RISK_HUES.high }]} />
                    <Text style={[styles.chipLabel, { color: HERO.inkDim }]} numberOfLines={1}>высокий</Text>
                  </View>
                  <Text style={[styles.chipValue, { color: HERO.ink }]}>{counts.high}</Text>
                </View>
                <View style={[styles.heroChip, { borderColor: `${RISK_HUES.medium}66`, backgroundColor: `${RISK_HUES.medium}1A` }]}>
                  <View style={styles.chipHeader}>
                    <View style={[styles.chipDot, { backgroundColor: RISK_HUES.medium }]} />
                    <Text style={[styles.chipLabel, { color: HERO.inkDim }]} numberOfLines={1}>средний</Text>
                  </View>
                  <Text style={[styles.chipValue, { color: HERO.ink }]}>{counts.medium}</Text>
                </View>
                <View style={[styles.heroChip, { borderColor: `${RISK_HUES.low}66`, backgroundColor: `${RISK_HUES.low}1A` }]}>
                  <View style={styles.chipHeader}>
                    <View style={[styles.chipDot, { backgroundColor: RISK_HUES.low }]} />
                    <Text style={[styles.chipLabel, { color: HERO.inkDim }]} numberOfLines={1}>низкий</Text>
                  </View>
                  <Text style={[styles.chipValue, { color: HERO.ink }]}>{counts.low}</Text>
                </View>
              </View>
            </View>

            {/* === Spotlight: top at-risk user === */}
            {spotlight && (
              <View style={[
                styles.spotlightCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: `${RISK_HUES.high}55`,
                },
              ]}>
                <View style={[styles.spotlightStripe, { backgroundColor: RISK_HUES.high }]} />
                <View style={styles.spotlightInner}>
                  <View style={styles.spotlightHeader}>
                    <MaterialIcons name="warning-amber" size={14} color={RISK_HUES.high} />
                    <Text style={[styles.spotlightLabel, { color: RISK_HUES.high }]}>
                      ГЛАВНАЯ УГРОЗА
                    </Text>
                  </View>
                  <View style={styles.spotlightRow}>
                    <View style={[
                      styles.spotlightAvatar,
                      { backgroundColor: `${RISK_HUES.high}1F`, borderColor: `${RISK_HUES.high}66` },
                    ]}>
                      <Text style={[styles.spotlightAvatarText, { color: RISK_HUES.high }]}>
                        {(spotlight.displayName || spotlight.email || '?').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.spotlightName, { color: colors.text }]} numberOfLines={1}>
                        {spotlight.displayName || 'Без имени'}
                      </Text>
                      <Text style={[styles.spotlightEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                        {spotlight.email || '—'}
                        {spotlight.membershipLevel ? ` · ${spotlight.membershipLevel}` : ''}
                      </Text>
                    </View>
                    <View style={styles.spotlightPctBlock}>
                      <Text style={[styles.spotlightPct, { color: RISK_HUES.high }]}>
                        {formatPct(spotlight.probability)}
                      </Text>
                      <Text style={[styles.spotlightPctLabel, { color: colors.textSecondary }]}>
                        вероятность
                      </Text>
                    </View>
                  </View>
                  <View style={styles.spotlightStripWrap}>
                    <ProbStrip prob={spotlight.probability || 0} height={5} />
                  </View>
                </View>
              </View>
            )}

            {/* === Filter chips === */}
            <View style={styles.filters}>
              {RISK_FILTERS.map((rf) => {
                const active = filter === rf.id;
                return (
                  <TouchableOpacity
                    key={rf.id}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? `${colors.primary}14` : colors.cardBg,
                        borderColor: active ? `${colors.primary}80` : colors.border,
                      },
                    ]}
                    onPress={() => setFilter(rf.id)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name={rf.icon}
                      size={13}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.filterText,
                        { color: active ? colors.primary : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {rf.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section label + count */}
            {visibleItems.length > 0 && (
              <View style={styles.listHeaderRow}>
                <Text style={[styles.listHeaderLabel, { color: colors.textSecondary }]}>
                  Клиенты
                </Text>
                <Text style={[styles.listHeaderCount, { color: colors.textSecondary }]}>
                  {visibleItems.length}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          error === 'ml_unavailable' ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.warning}1F` }]}>
                <MaterialIcons name="cloud-off" size={28} color={colors.warning} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                ML-сервис временно недоступен
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Прогноз оттока вернётся, как только сервис восстановит работу. Это не влияет на остальные функции системы.
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={onRefresh}
                activeOpacity={0.85}
              >
                <MaterialIcons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : error === 'fetch_error' ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.danger}1F` }]}>
                <MaterialIcons name="error-outline" size={28} color={colors.danger} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Не удалось загрузить данные
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={onRefresh}
                activeOpacity={0.85}
              >
                <MaterialIcons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIconWrap, { backgroundColor: `${colors.success}1F` }]}>
                <MaterialIcons name="sentiment-satisfied" size={28} color={colors.success} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                В этом сегменте пусто
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Попробуйте сменить фильтр риска.
              </Text>
            </View>
          )
        }
      />
    </Animated.View>
  );
}

const makeStyles = (colors, HERO) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 13 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  // Симметричная распорка справа — той же ширины, что backBtn + gap,
  // чтобы заголовок встал ровно по центру при flex-row раскладке.
  headerSpacer: { width: 36 },
  headerTitleWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2, textAlign: 'center' },

  /* === HERO === */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    backgroundColor: HERO.bg,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HERO.cardLine,
  },
  heroLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HERO.bgLayer,
    opacity: 0.5,
    borderRadius: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RISK_HUES.low,
  },
  statusDotPulse: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RISK_HUES.low,
  },
  modelStatusText: {
    color: HERO.ink,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  scanCount: {
    color: HERO.inkFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  gaugeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  gaugeCenter: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
  },
  gaugeBig: {
    color: HERO.ink,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 56,
  },
  gaugeBigUnit: {
    fontSize: 26,
    fontWeight: '800',
    color: HERO.inkDim,
    letterSpacing: 0,
  },
  gaugeCaption: {
    color: HERO.inkDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  heroChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  heroChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, textAlign: 'center' },
  chipLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* === SPOTLIGHT === */
  spotlightCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  spotlightStripe: {
    width: 4,
  },
  spotlightInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  spotlightLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spotlightAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  spotlightAvatarText: { fontSize: 18, fontWeight: '800' },
  spotlightName: { fontSize: 15, fontWeight: '800' },
  spotlightEmail: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  spotlightPctBlock: { alignItems: 'flex-end' },
  spotlightPct: { fontSize: 22, fontWeight: '900', letterSpacing: -0.8, lineHeight: 24 },
  spotlightPctLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  spotlightStripWrap: { marginTop: 12 },

  /* === FILTERS === */
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
  },
  filterPill: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 11, fontWeight: '700' },

  /* === LIST === */
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  listHeaderCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowAccent: { width: 3 },
  rowContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowEmail: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', minWidth: 60 },
  rowPct: { fontSize: 16, fontWeight: '900', letterSpacing: -0.4, lineHeight: 18 },
  rowRiskLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  rowStripWrap: {
    marginTop: 10,
    marginLeft: 50,
  },

  /* === EMPTY === */
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 4,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  emptyHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 12,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
