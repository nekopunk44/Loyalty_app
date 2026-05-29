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
import { properties as PROPERTY_CATALOG } from '../../constants/properties';

const LEVEL_GRADIENT_TOP = {
  Platinum: '#7B2FF7', Gold: '#CC8800', Silver: '#606060', Bronze: '#7A5030',
};

const asNumber = value => Number(value || 0);
const formatNumber = value => asNumber(value).toLocaleString('ru-RU');
const formatMoney = value => `${Math.round(asNumber(value)).toLocaleString('ru-RU')} PRB`;

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const TEAL2 = '#0F766E';
const AMBER = '#F59E0B';
const NAVY2 = '#0B5C7A';
const RED   = '#DC2626';

// Dark «command center» — те же значения, что в AdminFinanceDashboard,
// чтобы ML-карточки на разных экранах визуально складывались в один язык.
const HERO = {
  bg:       '#0B1426',
  bgLayer:  '#10203A',
  cardLine: 'rgba(255,255,255,0.08)',
  ink:      '#F8FAFC',
  inkDim:   '#94A3B8',
  inkFaint: '#64748B',
};
const HERO_INK_DIM = HERO.inkDim;

const propertyNameById = (id) => {
  if (id == null) return null;
  const found = PROPERTY_CATALOG.find(p => String(p.id) === String(id));
  return found?.name || null;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
};

const formatTodayDate = () => {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const d = new Date();
  return `${d.getDate()} ${months[d.getMonth()]}`;
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

const STATUS_META = {
  pending:   { color: AMBER, label: 'Ожидает' },
  confirmed: { color: NAVY2, label: 'Подтверждено' },
  completed: { color: TEAL2, label: 'Завершено' },
  cancelled: { color: RED,   label: 'Отменено' },
  canceled:  { color: RED,   label: 'Отменено' },
};

export default function AdminDashboard({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [stats,      setStats]      = useState(null);
  const [bookings,   setBookings]   = useState([]);
  const [events,     setEvents]     = useState([]);
  const [churnMeta,  setChurnMeta]  = useState(null); // { counts: {high, medium, low}, scanned, predicted, partial }
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
      const [statsRes, bookingsRes, eventsRes, churnRes] = await Promise.all([
        apiCall(`${getApiUrl()}/admin/stats`),
        apiCall(`${getApiUrl()}/bookings`),
        apiCall(`${getApiUrl()}/events`),
        // Только мета — счётчики high/medium/low. Сами имена клиентов нужны лишь на AdminChurnRisk.
        apiCall(`${getApiUrl()}/admin/churn-risk?limit=200&windowDays=90`).catch(() => null),
      ]);

      if (statsRes.success)    setStats(statsRes);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
      if (eventsRes.success)   setEvents(eventsRes.events || []);
      // Принимаем и success-ответ, и partial-ответ от 503 (ML offline, но meta всё равно может прийти).
      if (churnRes && (churnRes.success || churnRes.partial)) {
        setChurnMeta({
          counts:    churnRes.meta?.counts || null,
          scanned:   churnRes.meta?.scanned ?? null,
          predicted: churnRes.meta?.predicted ?? null,
          partial:   !!churnRes.partial || !churnRes.success,
        });
      } else {
        setChurnMeta(null);
      }
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
    const period       = stats?.statsPerPeriod?.month || {};
    const totalUsers   = asNumber(period.users);
    const premiumUsers = asNumber(period.premium);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const isToday  = (raw) => raw && new Date(raw) >= startOfDay;
    const isPaid   = (b) => b.status === 'completed' || b.status === 'confirmed';

    const todayBookings = bookings.filter(b => isToday(b.createdAt || b.date)).length;
    const todayRevenue  = bookings
      .filter(b => isToday(b.createdAt || b.date) && isPaid(b))
      .reduce((sum, b) => sum + asNumber(b.totalPrice), 0);

    const pendingBookings = bookings.filter(b => b.status === 'pending').length;

    const activeEvents = events.filter(e => {
      const s = (e.status || '').toLowerCase();
      return s === 'active' || s === 'активный';
    }).length;

    const recentBookings = [...bookings]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 6);

    return {
      totalUsers, premiumUsers,
      todayBookings, todayRevenue,
      pendingBookings, activeEvents,
      recentBookings,
    };
  }, [stats, bookings, events]);

  // Индекс оттока: взвешенная доля high+medium от опрошенных клиентов.
  // Формула совпадает с AdminChurnRisk, чтобы цифра не «гуляла» между экранами.
  const churnSummary = useMemo(() => {
    if (!churnMeta?.counts) return null;
    const { high = 0, medium = 0, low = 0 } = churnMeta.counts;
    const total = high + medium + low;
    if (total === 0) return { index: 0, total: 0, high, medium, low, partial: churnMeta.partial };
    const index = Math.round(((high * 1.0 + medium * 0.5) / total) * 100);
    return { index, total, high, medium, low, partial: churnMeta.partial };
  }, [churnMeta]);

  const alerts = useMemo(() => {
    const list = [];
    if (dashboard.pendingBookings > 0) {
      list.push({
        key: 'pending',
        icon: 'pending-actions',
        color: AMBER,
        title: `${dashboard.pendingBookings} ${pluralRu(dashboard.pendingBookings, 'бронирование', 'бронирования', 'бронирований')} ждут подтверждения`,
        sub: 'Проверьте и подтвердите оплату',
        route: 'AdminFinance',
      });
    }
    if (dashboard.activeEvents === 0 && events.length > 0) {
      list.push({
        key: 'no-events',
        icon: 'campaign',
        color: NAVY2,
        title: 'Нет активных событий',
        sub: 'Опубликуйте следующее, чтобы поддержать вовлечённость',
        route: 'AdminEvents',
      });
    }
    return list;
  }, [dashboard, events]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
      >
        {/* ── Hero greeting ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>
                {getGreeting()}, {formatTodayDate()}
              </Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.displayName || user?.name || 'Администратор'}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialIcons name="shield" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>ADMIN</Text>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>
            {dashboard.todayBookings > 0
              ? `Сегодня уже ${dashboard.todayBookings} ${pluralRu(dashboard.todayBookings, 'бронирование', 'бронирования', 'бронирований')} · ${formatMoney(dashboard.todayRevenue)}`
              : 'Сегодня пока без активности — самое время связаться с клиентами'}
          </Text>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actionsRow}>
          <ActionTile theme={theme} icon="qr-code-scanner" label="Сканировать" sub="QR клиента" color={TEAL}   onPress={openScanner} />
          <ActionTile theme={theme} icon="payments"        label="Платёж"      sub="новый"     color={NAVY2}  onPress={() => navigation.navigate('AdminFinance')} />
          <ActionTile theme={theme} icon="event-available" label="Событие"     sub="создать"   color={AMBER}  onPress={() => navigation.navigate('AdminEvents')} />
          <ActionTile theme={theme} icon="person-search"   label="Клиент"      sub="найти"     color={TEAL2}  onPress={() => navigation.navigate('AdminUsers')} />
        </View>

        {/* ── KPI strip ── */}
        <View style={styles.kpiStrip}>
          <KpiPill label="Сегодня броней"   value={formatNumber(dashboard.todayBookings)} color={NAVY2} theme={theme} />
          <KpiPill label="Сегодня оборот"   value={formatMoney(dashboard.todayRevenue)}   color={TEAL}  theme={theme} compact />
          <KpiPill label="Всего клиентов"   value={formatNumber(dashboard.totalUsers)}    color={AMBER} theme={theme} />
        </View>

        {/* ── Alerts ── */}
        {alerts.length > 0 && (
          <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
            {alerts.map(a => (
              <TouchableOpacity
                key={a.key}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(a.route)}
                style={[styles.alertCard, {
                  backgroundColor: theme.colors.cardBg,
                  borderColor: theme.colors.border,
                  borderLeftColor: a.color,
                }]}
              >
                <View style={[styles.alertIcon, { backgroundColor: `${a.color}18` }]}>
                  <MaterialIcons name={a.icon} size={20} color={a.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: theme.colors.text }]} numberOfLines={2}>{a.title}</Text>
                  <Text style={[styles.alertSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{a.sub}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── ML: Churn Risk Index (живой) ── */}
        <ChurnRiskCard
          summary={churnSummary}
          theme={theme}
          onPress={() => navigation.navigate('AdminChurnRisk')}
        />

        {/* ── Recent activity feed ── */}
        <View style={[styles.panel, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Последние бронирования</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminFinance')}>
              <Text style={[styles.linkText, { color: TEAL }]}>Все →</Text>
            </TouchableOpacity>
          </View>

          {dashboard.recentBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Пока ничего не происходит
              </Text>
            </View>
          ) : (
            dashboard.recentBookings.map((b, i) => (
              <BookingItem
                key={b.id || i}
                booking={b}
                theme={theme}
                last={i === dashboard.recentBookings.length - 1}
              />
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

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
              <View style={styles.scanVignette} pointerEvents="none" />

              <View style={styles.scanReticleWrap} pointerEvents="none">
                <Animated.View style={[styles.scanReticle, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={[styles.scanCorner, styles.scanCornerTL]} />
                  <View style={[styles.scanCorner, styles.scanCornerTR]} />
                  <View style={[styles.scanCorner, styles.scanCornerBL]} />
                  <View style={[styles.scanCorner, styles.scanCornerBR]} />
                </Animated.View>
                <Text style={styles.scanHint}>Наведите камеру на QR-код клиента</Text>
              </View>

              <TouchableOpacity style={styles.scanCloseBtn} onPress={() => setScannerVisible(false)}>
                <MaterialIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
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

function pluralRu(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function ActionTile({ icon, label, sub, color, onPress, theme }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.actionTile, {
        backgroundColor: theme.colors.cardBg,
        borderColor: theme.colors.border,
      }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={22} color="#fff" />
      </View>
      <Text style={[styles.actionLabel, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.actionSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

function KpiPill({ label, value, color, theme, compact }) {
  return (
    <View style={[styles.kpiPill, {
      backgroundColor: theme.colors.cardBg,
      borderColor: theme.colors.border,
    }]}>
      <View style={[styles.kpiBar, { backgroundColor: color }]} />
      <Text style={[styles.kpiPillValue, { color: theme.colors.text, fontSize: compact ? 14 : 16 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.kpiPillLabel, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Карточка ML-индекса оттока. Принимает уже посчитанный summary, считает цвет по
 * текущему значению и показывает разбивку high/medium/low прямо на главном экране,
 * чтобы админу не нужно было лезть в отдельный отчёт ради цифры.
 */
function ChurnRiskCard({ summary, theme, onPress }) {
  // ML недоступен — показываем off-state, но всё равно даём пройти на детали
  if (!summary) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={[styles.churnCard, {
          backgroundColor: theme.colors.cardBg,
          borderColor: theme.colors.border,
        }]}
      >
        <View style={[styles.alertIcon, { backgroundColor: `${theme.colors.textSecondary}18` }]}>
          <MaterialIcons name="cloud-off" size={20} color={theme.colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
            Риск оттока · ML offline
          </Text>
          <Text style={[styles.alertSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            Открыть отчёт вручную
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  // Цвет индикатора по индексу: >=50 опасно, >=25 пограничный, иначе спокойно
  const idx = summary.index;
  const accent =
    idx >= 50 ? '#F87171' :
    idx >= 25 ? '#FBBF24' :
                '#34D399';
  const label =
    idx >= 50 ? 'высокий риск' :
    idx >= 25 ? 'умеренный риск' :
                'низкий риск';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.churnCardPremium, { borderColor: HERO.cardLine }]}
    >
      <View style={styles.churnLeft}>
        <Text style={styles.churnEyebrow}>ML · CHURN INDEX</Text>
        <View style={styles.churnValueRow}>
          <Text style={[styles.churnValue, { color: accent }]}>{idx}</Text>
          <Text style={styles.churnValueUnit}>/100</Text>
        </View>
        <Text style={[styles.churnLabel, { color: accent }]}>{label}</Text>
        {summary.partial && (
          <Text style={styles.churnPartial}>
            данные частичные · ML отвечал не на всех
          </Text>
        )}
      </View>

      <View style={styles.churnRight}>
        <ChurnBucket count={summary.high}   color="#F87171" letter="H" theme={theme} />
        <ChurnBucket count={summary.medium} color="#FBBF24" letter="M" theme={theme} />
        <ChurnBucket count={summary.low}    color="#34D399" letter="L" theme={theme} />
      </View>

      <MaterialIcons name="chevron-right" size={20} color={HERO_INK_DIM} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

function ChurnBucket({ count, color, letter }) {
  return (
    <View style={styles.churnBucket}>
      <Text style={[styles.churnBucketCount, { color }]}>{count}</Text>
      <Text style={styles.churnBucketLetter}>{letter}</Text>
    </View>
  );
}

function BookingItem({ booking, theme, last }) {
  const meta = STATUS_META[booking.status] || { color: NAVY2, label: booking.status || 'Бронь' };
  const propertyName = booking.property || propertyNameById(booking.propertyId) || (booking.propertyId ? `Объект #${booking.propertyId}` : 'Объект');
  const clientName   = booking.userName || booking.user?.name || booking.guestName || booking.name || 'Гость';
  const amount       = asNumber(booking.totalPrice);

  return (
    <View style={[styles.bookingItem, !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
      <View style={[styles.bookingDot, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.bookingTopRow}>
          <Text style={[styles.bookingClient, { color: theme.colors.text }]} numberOfLines={1}>
            {clientName}
          </Text>
          <Text style={[styles.bookingAmount, { color: theme.colors.text }]} numberOfLines={1}>
            {amount > 0 ? formatMoney(amount) : '—'}
          </Text>
        </View>
        <View style={styles.bookingBottomRow}>
          <Text style={[styles.bookingProp, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {propertyName}
          </Text>
          <View style={styles.bookingMetaRight}>
            <View style={[styles.statusChip, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.bookingTime, { color: theme.colors.textSecondary }]}>
              {formatTimeAgo(booking.createdAt || booking.date)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: spacing.md, paddingBottom: 130 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

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
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: TEAL, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionTile: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  actionLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  actionSub: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 1 },

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

  // Alerts
  alertCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
    padding: spacing.md, gap: spacing.sm,
  },
  alertIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 13, fontWeight: '800' },
  alertSub: { fontSize: 11, marginTop: 2 },

  // Churn ML card (off-state)
  churnCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md, gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // Churn ML card (premium — тёмный «command center»)
  churnCardPremium: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: HERO.bg,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  churnLeft: { flex: 1, minWidth: 0 },
  churnEyebrow: {
    color: HERO.inkDim, fontSize: 9, fontWeight: '900', letterSpacing: 1.4,
  },
  churnValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  churnValue: { fontSize: 30, fontWeight: '900', lineHeight: 32 },
  churnValueUnit: { color: HERO.inkFaint, fontSize: 12, fontWeight: '800' },
  churnLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  churnPartial: { color: HERO.inkFaint, fontSize: 10, marginTop: 6 },

  churnRight: { flexDirection: 'row', gap: 6 },
  churnBucket: {
    backgroundColor: HERO.bgLayer,
    borderWidth: 1, borderColor: HERO.cardLine,
    borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 9,
    alignItems: 'center',
    minWidth: 36,
  },
  churnBucketCount: { fontSize: 14, fontWeight: '900' },
  churnBucketLetter: { color: HERO.inkFaint, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },

  // Activity panel
  panel: { borderWidth: 1, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  linkText: { fontSize: 12, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: spacing.lg, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },

  // Booking row
  bookingItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, gap: spacing.sm },
  bookingDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  bookingTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bookingClient: { flex: 1, fontSize: 14, fontWeight: '800' },
  bookingAmount: { fontSize: 13, fontWeight: '900' },
  bookingBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, gap: spacing.sm },
  bookingProp: { flex: 1, fontSize: 12, fontWeight: '500' },
  bookingMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  bookingTime: { fontSize: 11, fontWeight: '500' },

  // Scanner screen
  scanScreen: { flex: 1, backgroundColor: '#000' },
  scanVignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', shadowColor: '#000' },
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
