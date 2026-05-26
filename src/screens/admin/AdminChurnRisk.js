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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';

const RISK_FILTERS = [
  { id: 'all',    label: 'Все',     icon: 'list' },
  { id: 'high',   label: 'Высокий', icon: 'priority-high' },
  { id: 'medium', label: 'Средний', icon: 'warning' },
  { id: 'low',    label: 'Низкий',  icon: 'check-circle' },
];

const RISK_PALETTE = {
  high:   { bg: '#FEE2E2', fg: '#B91C1C', border: '#FCA5A5' },
  medium: { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  low:    { bg: '#DCFCE7', fg: '#166534', border: '#86EFAC' },
};

const formatPct = (p) => `${Math.round((Number(p) || 0) * 100)}%`;

export default function AdminChurnRisk({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async (riskFilter) => {
    try {
      const qs = riskFilter && riskFilter !== 'all' ? `?risk=${riskFilter}` : '';
      const data = await apiCall(`${getApiUrl()}/admin/churn-risk${qs}`);
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
    fetchData(filter).finally(() => {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [filter, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(filter);
    setRefreshing(false);
  }, [filter, fetchData]);

  const counts = useMemo(() => {
    if (meta?.counts) return meta.counts;
    const c = { high: 0, medium: 0, low: 0 };
    items.forEach((it) => { if (c[it.risk] !== undefined) c[it.risk]++; });
    return c;
  }, [items, meta]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const renderItem = ({ item }) => {
    const pal = RISK_PALETTE[item.risk] || RISK_PALETTE.low;
    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.displayName || item.email || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.displayName || 'Без имени'}
            </Text>
            <Text style={styles.rowEmail} numberOfLines={1}>
              {item.email || '—'}
              {item.membershipLevel ? `  ·  ${item.membershipLevel}` : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.riskPill, { backgroundColor: pal.bg, borderColor: pal.border }]}>
          <Text style={[styles.riskPct, { color: pal.fg }]}>{formatPct(item.probability)}</Text>
          <Text style={[styles.riskLabel, { color: pal.fg }]}>
            {item.risk === 'high' ? 'высокий' : item.risk === 'medium' ? 'средний' : 'низкий'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Запрашиваем прогноз у ML-сервиса…</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Риск оттока</Text>
          <Text style={styles.subtitle}>
            {meta?.scanned ? `${meta.scanned} активных за ${meta.windowDays || 90} дн` : 'ML-прогноз по активным клиентам'}
          </Text>
        </View>
        <View style={styles.badge}>
          <MaterialIcons name="auto-awesome" size={12} color="#fff" />
          <Text style={styles.badgeText}>ML</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <SummaryCard label="Высокий"  value={counts.high}   color="#B91C1C" bg="#FEE2E2" />
        <SummaryCard label="Средний"  value={counts.medium} color="#92400E" bg="#FEF3C7" />
        <SummaryCard label="Низкий"   value={counts.low}    color="#166534" bg="#DCFCE7" />
      </View>

      <View style={styles.filters}>
        {RISK_FILTERS.map((rf) => (
          <TouchableOpacity
            key={rf.id}
            style={[styles.filterPill, filter === rf.id && styles.filterPillActive]}
            onPress={() => setFilter(rf.id)}
          >
            <MaterialIcons name={rf.icon} size={14} color={filter === rf.id ? TEAL : colors.textSecondary} />
            <Text style={[styles.filterText, filter === rf.id && styles.filterTextActive]}>
              {rf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error === 'ml_unavailable' ? (
        <View style={styles.empty}>
          <MaterialIcons name="cloud-off" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>ML-сервис временно недоступен</Text>
          <Text style={styles.emptyHint}>
            Прогноз оттока вернётся, как только сервис восстановит работу. Это не влияет на остальные функции системы.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <MaterialIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : error === 'fetch_error' ? (
        <View style={styles.empty}>
          <MaterialIcons name="error-outline" size={40} color="#B91C1C" />
          <Text style={styles.emptyTitle}>Не удалось загрузить данные</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="sentiment-satisfied" size={40} color={TEAL} />
          <Text style={styles.emptyTitle}>В этом сегменте пусто</Text>
          <Text style={styles.emptyHint}>Попробуйте сменить фильтр риска.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.userId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </Animated.View>
  );
}

function SummaryCard({ label, value, color, bg }) {
  return (
    <View style={[summaryStyles.card, { backgroundColor: bg }]}>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={[summaryStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  value: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 13 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: AMBER, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  summary: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },

  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  filterPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBg,
  },
  filterPillActive: { borderColor: TEAL, backgroundColor: `${TEAL}14` },
  filterText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  filterTextActive: { color: TEAL },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cardBg, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowEmail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  riskPill: {
    minWidth: 78, alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1,
  },
  riskPct: { fontSize: 14, fontWeight: '900' },
  riskLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8 },
  emptyHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TEAL, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
