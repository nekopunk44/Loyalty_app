import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { spacing, borderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const LEVEL_GRADIENT_TOP = {
  Platinum: '#7B2FF7', Gold: '#CC8800', Silver: '#606060', Bronze: '#7A5030',
};

const asNumber = value => Number(value || 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const formatNumber = value => asNumber(value).toLocaleString('ru-RU');
const formatMoney = value => `${Math.round(asNumber(value)).toLocaleString('ru-RU')} PRB`;

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const TEAL2 = '#0F766E';
const AMBER = '#F59E0B';
const NAVY2 = '#0B5C7A';

const BAR_HEIGHT = 120;

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [stats,      setStats]      = useState(null);
  const [bookings,   setBookings]   = useState([]);
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedUser,    setScannedUser]    = useState(null);
  const [scanned,        setScanned]        = useState(false);
  const [camPermission,  requestCamPerm]    = useCameraPermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!scannerVisible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scannerVisible]);

  const openScanner = async () => {
    if (!camPermission?.granted) {
      const result = await requestCamPerm();
      if (!result.granted) return;
    }
    setScanned(false);
    setScannedUser(null);
    setScannerVisible(true);
  };

  const handleQrScanned = ({ data }) => {
    if (scanned) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'loyalty') {
        setScanned(true);
        setScannedUser(parsed);
      }
    } catch { /* ignore non-loyalty QR */ }
  };

  const load = useCallback(async () => {
    try {
      const [statsRes, bookingsRes, eventsRes] = await Promise.all([
        apiCall(`${getApiUrl()}/admin/stats`),
        apiCall(`${getApiUrl()}/bookings`),
        apiCall(`${getApiUrl()}/events`),
      ]);

      if (statsRes.success)   setStats(statsRes);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
      if (eventsRes.success)   setEvents(eventsRes.events || []);
    } catch (e) {
      console.error('AdminDashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const dashboard = useMemo(() => {
    const period = stats?.statsPerPeriod?.month || {};
    const totalUsers    = asNumber(period.users);
    const totalBookings = asNumber(period.purchases);
    const totalRevenue  = asNumber(period.revenue);
    const premiumUsers  = asNumber(period.premium);

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const recentBookings = bookings.filter(b => new Date(b.createdAt || b.date) > twelveHoursAgo).length;

    const conversionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const averageBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const activeEvents = events.filter(e => {
      const s = (e.status || '').toLowerCase();
      return s === 'active' || s === 'активный';
    }).length;
    const activeEventsRate = events.length > 0 ? (activeEvents / events.length) * 100 : 0;

    // Пульс бизнеса — оборот по объектам
    const propertyRevMap = {};
    bookings.forEach(b => {
      if (b.status === 'completed' || b.status === 'confirmed') {
        const key = b.propertyId || 'other';
        propertyRevMap[key] = (propertyRevMap[key] || 0) + asNumber(b.totalPrice);
      }
    });
    const barValues = stats?.properties?.length
      ? stats.properties.map(p => asNumber(p.revenue))
      : Object.values(propertyRevMap);
    const chartValues = barValues.length > 0 ? barValues.slice(0, 7) : [0];
    const chartMax = Math.max(...chartValues, 1);

    const hasActivity = totalBookings > 0 || activeEvents > 0;
    const healthScore = hasActivity
      ? clamp(conversionRate * 0.55 + activeEventsRate * 0.25 + (totalRevenue > 0 ? 20 : 0) - pendingBookings * 2, 5, 96)
      : null;

    // AI рекомендации = количество реальных сигналов (ожидающие + нет событий)
    let aiCount = 0;
    if (pendingBookings > 0) aiCount++;
    if (activeEvents === 0) aiCount++;
    if (premiumUsers > 0 && totalBookings === 0) aiCount++;

    return {
      totalUsers, totalBookings, totalRevenue, premiumUsers,
      averageBooking, conversionRate, activeEventsRate,
      healthScore, pendingBookings, recentBookings,
      activeEvents, chartValues, chartMax, aiCount,
    };
  }, [stats, bookings, events]);

  const focusItems = [
    dashboard.pendingBookings > 0
      ? { title: 'Бронирований на проверку', value: dashboard.pendingBookings, icon: 'priority-high', color: AMBER, route: 'AdminBooking' }
      : { title: 'Платежи без критики', value: 'OK', icon: 'verified', color: TEAL2, route: 'AdminFinance' },
    dashboard.activeEvents > 0
      ? { title: 'Активных событий', value: dashboard.activeEvents, icon: 'local-fire-department', color: NAVY2, route: 'AdminEvents' }
      : { title: 'Нет активных событий', value: '0', icon: 'campaign', color: NAVY2, route: 'AdminEvents' },
    { title: 'AI сигналов', value: dashboard.aiCount, icon: 'auto-awesome', color: TEAL, route: 'AdminStats' },
  ];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Загрузка данных...</Text>
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
      {/* ── Hero command card ── */}
      <View style={styles.commandCard}>
        <View style={styles.commandTop}>
          <View style={styles.commandText}>
            <View style={styles.commandEyebrowRow}>
              <View style={styles.eyebrowAccent} />
              <Text style={styles.commandEyebrow}>Операционный центр</Text>
            </View>
            <Text style={styles.commandTitle}>{user?.displayName || 'Администратор'}</Text>
            <Text style={styles.commandSubtitle}>Быстрый контроль продаж, событий и финансов</Text>
          </View>
          {dashboard.healthScore !== null && (
            <View style={styles.commandScore}>
              <Text style={styles.scoreValue}>{Math.round(dashboard.healthScore)}</Text>
              <Text style={styles.scoreLabel}>SCORE</Text>
            </View>
          )}
        </View>

        <View style={styles.commandStatsDivider} />
        <View style={styles.commandStats}>
          <SmallStat label="Оборот"    value={formatMoney(dashboard.totalRevenue)} />
          <View style={styles.commandStatDivider} />
          <SmallStat label="Конверсия" value={`${dashboard.conversionRate.toFixed(1)}%`} />
          <View style={styles.commandStatDivider} />
          <SmallStat label="Событий"   value={`${dashboard.activeEvents}`} />
        </View>
      </View>

      {/* ── KPI grid ── */}
      <View style={styles.kpiRow}>
        <KpiCard icon="people"   label="Клиенты"       value={formatNumber(dashboard.totalUsers)}    color={NAVY2} theme={theme} />
        <KpiCard icon="bookmark" label="Бронирования"  value={formatNumber(dashboard.totalBookings)} color={TEAL}  theme={theme} />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard icon="payments" label="Средний чек"   value={formatMoney(dashboard.averageBooking)} color={TEAL2} theme={theme} />
        <KpiCard icon="workspace-premium" label="Премиум клиентов" value={formatNumber(dashboard.premiumUsers)} color={AMBER} theme={theme} />
      </View>

      {/* ── Focus panel ── */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Фокус администратора</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminStats')}>
            <View style={[styles.aiChip, { backgroundColor: `${TEAL}18`, borderColor: `${TEAL}40` }]}>
              <MaterialIcons name="auto-awesome" size={14} color={TEAL} />
              <Text style={[styles.aiChipText, { color: TEAL }]}>AI</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.focusGrid}>
          {focusItems.map(item => (
            <TouchableOpacity
              key={item.title}
              style={[styles.focusCard, { backgroundColor: `${item.color}10`, borderColor: `${item.color}30` }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={[styles.focusIcon, { backgroundColor: item.color }]}>
                <MaterialIcons name={item.icon} size={20} color="#fff" />
              </View>
              <Text style={[styles.focusValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[styles.focusTitle, { color: theme.colors.text }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── ML: панель риска оттока ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminChurnRisk')}
        style={[styles.panel, {
          backgroundColor: theme.colors.cardBg,
          borderColor: `${AMBER}50`,
          borderLeftWidth: 4,
          borderLeftColor: AMBER,
        }]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Риск оттока клиентов</Text>
          <View style={[styles.aiChip, { backgroundColor: `${AMBER}20`, borderColor: `${AMBER}50` }]}>
            <MaterialIcons name="auto-awesome" size={14} color={AMBER} />
            <Text style={[styles.aiChipText, { color: AMBER }]}>ML</Text>
          </View>
        </View>
        <Text style={[styles.sectionHint, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          Прогноз ухода клиентов от градиентного бустинга. Откройте таблицу — отправьте ретеншн-предложение по группе риска.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: AMBER }}>Открыть панель</Text>
          <MaterialIcons name="arrow-forward" size={14} color={AMBER} />
        </View>
      </TouchableOpacity>

      {/* ── Business pulse panel ── */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Пульс бизнеса</Text>
          <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>по объектам</Text>
        </View>

        {/* Bar chart — pixel heights, no string % */}
        <View style={[styles.chart, { height: BAR_HEIGHT }]}>
          {dashboard.chartValues.map((value, index) => {
            const barH = Math.max(
              Math.round((value / dashboard.chartMax) * (BAR_HEIGHT - 8)),
              value > 0 ? 10 : 4
            );
            const isLast = index === dashboard.chartValues.length - 1;
            const label = stats?.properties?.[index]?.name
              ? stats.properties[index].name.slice(0, 5)
              : `#${index + 1}`;
            return (
              <View key={index} style={styles.chartColumn}>
                <View style={[
                  styles.chartBar,
                  {
                    height: barH,
                    backgroundColor: isLast ? AMBER : TEAL,
                    opacity: isLast ? 1 : 0.75,
                  },
                ]} />
                <Text style={[styles.chartLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <MetricRow
          label="Активность событий"
          value={`${dashboard.activeEventsRate.toFixed(1)}%`}
          progress={dashboard.activeEventsRate}
          color={TEAL2}
          theme={theme}
        />
        <MetricRow
          label="Конверсия бронирований"
          value={`${dashboard.conversionRate.toFixed(1)}%`}
          progress={dashboard.conversionRate}
          color={NAVY2}
          theme={theme}
        />
      </View>

      {/* ── Recent activity ── */}
      <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: spacing.md }]}>
          Последняя активность
        </Text>
        <ActivityRow
          color={NAVY2}
          title={`${dashboard.recentBookings} бронирований`}
          subtitle="за последние 12 часов"
          theme={theme}
        />
        <ActivityRow
          color={AMBER}
          title={`${dashboard.pendingBookings} ожидают подтверждения`}
          subtitle="требуют внимания"
          theme={theme}
        />
        <ActivityRow
          color={TEAL2}
          title={`${dashboard.activeEvents} активных событий`}
          subtitle="проводятся сейчас"
          theme={theme}
          last
        />
      </View>

      <View style={{ height: 90 }} />
    </ScrollView>

    {/* ── Floating scan button ── */}
    <TouchableOpacity style={styles.scanFab} onPress={openScanner} activeOpacity={0.85}>
      <MaterialIcons name="qr-code-scanner" size={22} color="#fff" />
      <Text style={styles.scanFabText}>Сканировать QR</Text>
    </TouchableOpacity>

    {/* ── QR Scanner Modal ── */}
    <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
      <View style={styles.scanScreen}>
        {!scannedUser ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleQrScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            {/* Dark vignette overlay */}
            <View style={styles.scanVignette} pointerEvents="none" />

            {/* Reticle */}
            <View style={styles.scanReticleWrap} pointerEvents="none">
              <Animated.View style={[styles.scanReticle, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[styles.scanCorner, styles.scanCornerTL]} />
                <View style={[styles.scanCorner, styles.scanCornerTR]} />
                <View style={[styles.scanCorner, styles.scanCornerBL]} />
                <View style={[styles.scanCorner, styles.scanCornerBR]} />
              </Animated.View>
              <Text style={styles.scanHint}>Наведите камеру на QR-код клиента</Text>
            </View>

            {/* Close */}
            <TouchableOpacity style={styles.scanCloseBtn} onPress={() => setScannerVisible(false)}>
              <MaterialIcons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          /* ── Scan result ── */
          <View style={styles.scanResult}>
            <View style={[styles.scanResultHeader, { backgroundColor: LEVEL_GRADIENT_TOP[scannedUser.level] || LEVEL_GRADIENT_TOP.Bronze }]}>
              <View style={styles.scanResultDecor1} />
              <View style={styles.scanResultDecor2} />
              <View style={styles.scanResultCheckRow}>
                <View style={styles.scanResultCheck}>
                  <MaterialIcons name="check" size={22} color="#fff" />
                </View>
                <Text style={styles.scanResultVerified}>Клиент идентифицирован</Text>
              </View>
              <Text style={styles.scanResultName}>{scannedUser.name || 'Пользователь'}</Text>
              <Text style={styles.scanResultId}>ID: {scannedUser.userId}</Text>
              <View style={styles.scanResultLevelRow}>
                <Text style={styles.scanResultLevelText}>{(scannedUser.level || 'Bronze').toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.scanResultBody}>
              <View style={styles.scanResultStats}>
                {[
                  { label: 'Бронирований', value: scannedUser.bookings ?? '—', icon: 'event-note',           color: '#FF6B35' },
                  { label: 'Баланс PRB',   value: scannedUser.balance  != null ? Number(scannedUser.balance).toLocaleString('ru-RU') : '—', icon: 'account-balance-wallet', color: TEAL },
                ].map((s, i, arr) => (
                  <View key={s.label} style={[styles.scanResultStatBox, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: '#eee' }]}>
                    <View style={[styles.scanResultStatIcon, { backgroundColor: `${s.color}15` }]}>
                      <MaterialIcons name={s.icon} size={22} color={s.color} />
                    </View>
                    <Text style={[styles.scanResultStatValue, { color: '#1a1a2e' }]}>{s.value}</Text>
                    <Text style={styles.scanResultStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.scanResultBtn, { backgroundColor: TEAL }]}
                onPress={() => { setScannedUser(null); setScanned(false); }}
              >
                <MaterialIcons name="qr-code-scanner" size={18} color="#fff" />
                <Text style={styles.scanResultBtnText}>Сканировать следующего</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanResultClose}
                onPress={() => setScannerVisible(false)}
              >
                <Text style={styles.scanResultCloseText}>Закрыть</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
    </View>
  );
}

function SmallStat({ label, value }) {
  return (
    <View style={styles.commandStat}>
      <Text style={styles.commandStatValue}>{value}</Text>
      <Text style={styles.commandStatLabel}>{label}</Text>
    </View>
  );
}

function KpiCard({ icon, label, value, color, theme }) {
  return (
    <View style={[styles.kpiCard, {
      backgroundColor: theme.colors.cardBg,
      borderColor: theme.colors.border,
      borderBottomColor: color,
      borderBottomWidth: 3,
    }]}>
      <View style={[styles.kpiIconCircle, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
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

function ActivityRow({ color, title, subtitle, theme, last }) {
  return (
    <View style={[
      styles.activityRow,
      { borderLeftColor: color, backgroundColor: `${color}0D` },
      !last && { marginBottom: spacing.sm },
    ]}>
      <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  commandCard: {
    backgroundColor: NAVY,
    borderRadius: borderRadius.lg,
    borderTopWidth: 4,
    borderTopColor: TEAL,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 6,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  commandTop: { flexDirection: 'row', alignItems: 'flex-start' },
  commandText: { flex: 1, paddingRight: spacing.md },
  commandEyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  eyebrowAccent: { width: 18, height: 2, backgroundColor: TEAL, borderRadius: 1, marginRight: spacing.sm },
  commandEyebrow: { color: AMBER, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  commandTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: spacing.xs },
  commandSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 18, marginTop: spacing.sm },
  commandScore: {
    width: 72, borderRadius: borderRadius.md, backgroundColor: AMBER,
    alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    elevation: 2, shadowColor: AMBER, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
  },
  scoreValue: { color: '#fff', fontSize: 26, fontWeight: '900' },
  scoreLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  commandStatsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: spacing.md },
  commandStats: { flexDirection: 'row', alignItems: 'center' },
  commandStat: { flex: 1 },
  commandStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: spacing.sm },
  commandStatValue: { color: '#fff', fontSize: 13, fontWeight: '900' },
  commandStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  kpiCard: {
    flex: 1, borderWidth: 1, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center',
  },
  kpiIconCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { fontSize: 17, fontWeight: '900', textAlign: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 3 },

  panel: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  sectionHint: { fontSize: 12 },
  aiChip: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 4, gap: 4,
  },
  aiChipText: { fontSize: 12, fontWeight: '900' },

  focusGrid: { flexDirection: 'row', gap: spacing.sm },
  focusCard: { flex: 1, borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, minHeight: 120 },
  focusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  focusValue: { fontSize: 22, fontWeight: '900' },
  focusTitle: { fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: spacing.xs },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: borderRadius.sm },
  chartLabel: { fontSize: 9, marginTop: 3, fontWeight: '600' },

  metricRow: { marginTop: spacing.sm },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  metricLabel: { fontSize: 13, fontWeight: '700' },
  metricValue: { fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  activityRow: { borderRadius: borderRadius.sm, padding: spacing.md, borderLeftWidth: 4, marginBottom: spacing.sm },
  activityTitle: { fontSize: 13, fontWeight: '800' },
  activitySubtitle: { fontSize: 11, marginTop: spacing.xs },

  // Floating scan button
  scanFab: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: TEAL, paddingVertical: 15, borderRadius: 16,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  scanFabText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Scanner screen
  scanScreen: { flex: 1, backgroundColor: '#000' },
  scanVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
  },
  scanReticleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanReticle: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scanCorner: { position: 'absolute', width: 36, height: 36, borderColor: TEAL, borderWidth: 3 },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
  scanCloseBtn: {
    position: 'absolute', top: 52, right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },

  // Scan result
  scanResult: { flex: 1, backgroundColor: '#fff' },
  scanResultHeader: { paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24, overflow: 'hidden' },
  scanResultDecor1: { position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  scanResultDecor2: { position: 'absolute', bottom: -30, left: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.07)' },
  scanResultCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  scanResultCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  scanResultVerified: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scanResultName: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  scanResultId: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '500', marginBottom: 14 },
  scanResultLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  scanResultLevelEmoji: { fontSize: 18 },
  scanResultLevelText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  scanResultBody: { flex: 1, padding: 24 },
  scanResultStats: { flexDirection: 'row', borderRadius: 16, backgroundColor: '#f8f8f8', overflow: 'hidden', marginBottom: 24 },
  scanResultStatBox: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  scanResultStatIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scanResultStatValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  scanResultStatLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  scanResultBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginBottom: 12 },
  scanResultBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  scanResultClose: { alignItems: 'center', paddingVertical: 12 },
  scanResultCloseText: { color: '#999', fontSize: 14, fontWeight: '600' },
});
