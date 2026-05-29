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

const RISK_FILTERS = [
  { id: 'all',    label: 'Все',     icon: 'list' },
  { id: 'high',   label: 'Высокий', icon: 'priority-high' },
  { id: 'medium', label: 'Средний', icon: 'warning' },
  { id: 'low',    label: 'Низкий',  icon: 'check-circle' },
];

const formatPct = (p) => `${Math.round((Number(p) || 0) * 100)}%`;

export default function AdminChurnRisk({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const riskColor = (risk) => {
    if (risk === 'high')   return colors.danger;
    if (risk === 'medium') return colors.warning;
    return colors.success;
  };
  const riskLabel = (risk) => {
    if (risk === 'high')   return 'высокий';
    if (risk === 'medium') return 'средний';
    return 'низкий';
  };

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

  const total = counts.high + counts.medium + counts.low;
  const pct = (n) => (total > 0 ? Math.max(2, (n / total) * 100) : 0);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const renderItem = ({ item }) => {
    const rc = riskColor(item.risk);
    const initial = (item.displayName || item.email || '?').trim().charAt(0).toUpperCase();
    return (
      <View style={[styles.row, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: `${rc}1F`, borderColor: `${rc}55` }]}>
          <Text style={[styles.avatarText, { color: rc }]}>{initial}</Text>
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
        <View style={[styles.riskPill, { backgroundColor: `${rc}14`, borderColor: `${rc}55` }]}>
          <View style={[styles.riskPillDot, { backgroundColor: rc }]} />
          <View>
            <Text style={[styles.riskPct, { color: rc }]}>{formatPct(item.probability)}</Text>
            <Text style={[styles.riskLabel, { color: rc }]}>{riskLabel(item.risk)}</Text>
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
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Риск оттока
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {meta?.scanned
              ? `${meta.scanned} активных за ${meta.windowDays || 90} дн`
              : 'ML-прогноз по активным клиентам'}
          </Text>
        </View>
        <View style={[styles.mlBadge, { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}55` }]}>
          <MaterialIcons name="auto-awesome" size={11} color={colors.primary} />
          <Text style={[styles.mlBadgeText, { color: colors.primary }]}>ML</Text>
        </View>
      </View>

      {/* Hero card with stats strip + distribution bar */}
      <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.statsStrip}>
          <View style={styles.statsCell}>
            <View style={styles.statsValueRow}>
              <View style={[styles.statsDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.statsValue, { color: colors.text }]}>{counts.high}</Text>
            </View>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Высокий</Text>
          </View>

          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statsCell}>
            <View style={styles.statsValueRow}>
              <View style={[styles.statsDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.statsValue, { color: colors.text }]}>{counts.medium}</Text>
            </View>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Средний</Text>
          </View>

          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statsCell}>
            <View style={styles.statsValueRow}>
              <View style={[styles.statsDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statsValue, { color: colors.text }]}>{counts.low}</Text>
            </View>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Низкий</Text>
          </View>

          <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statsCell}>
            <View style={styles.statsValueRow}>
              <MaterialIcons name="people" size={13} color={colors.textSecondary} />
              <Text style={[styles.statsValue, { color: colors.text }]}>{total}</Text>
            </View>
            <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Всего</Text>
          </View>
        </View>

        {/* Distribution bar */}
        <View style={[styles.distBar, { backgroundColor: colors.background }]}>
          {total > 0 ? (
            <>
              {counts.high   > 0 && <View style={{ width: `${pct(counts.high)}%`,   backgroundColor: colors.danger }} />}
              {counts.medium > 0 && <View style={{ width: `${pct(counts.medium)}%`, backgroundColor: colors.warning }} />}
              {counts.low    > 0 && <View style={{ width: `${pct(counts.low)}%`,    backgroundColor: colors.success }} />}
            </>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.border }} />
          )}
        </View>
      </View>

      {/* Filter pills */}
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

      {error === 'ml_unavailable' ? (
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
      ) : items.length === 0 ? (
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
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.userId)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
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

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
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
    borderWidth: 1,
  },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  mlBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  heroCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsCell: { flex: 1, alignItems: 'center' },
  statsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statsDot: { width: 6, height: 6, borderRadius: 3 },
  statsValue: { fontSize: 16, fontWeight: '800' },
  statsLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
  statsDivider: { width: 1, height: 24, opacity: 0.6 },

  distBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
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

  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 86,
  },
  riskPillDot: { width: 8, height: 8, borderRadius: 4 },
  riskPct: { fontSize: 14, fontWeight: '900', lineHeight: 16 },
  riskLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
