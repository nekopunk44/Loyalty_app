/**
 * MyBidsScreen — экран «Мои ставки» (Stage 2 ВКР, Sprint C).
 *
 * Грузит GET /api/events/me/bids, группирует по статусу:
 *   active   — текущие активные ставки (юзер сейчас лидирует или участвует),
 *   outbid   — ставки, которые перебили,
 *   won      — выигранные аукционы (PRB уже списан),
 *   returned — аукцион закрыт, lock возвращён.
 *
 * Клик по строке → AuctionDetailScreen с тем же eventId.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';
import { spacing, borderRadius } from '../../constants/theme';

const API_BASE_URL = getApiUrl();

const STATUS_META = {
  active:   { label: 'Активные',  icon: 'gavel',      color: '#3B82F6' },
  outbid:   { label: 'Перебиты',  icon: 'trending-down', color: '#F59E0B' },
  won:      { label: 'Выиграны',  icon: 'emoji-events',  color: '#10B981' },
  returned: { label: 'Возвращены', icon: 'undo',         color: '#6B7280' },
};

const FILTERS = ['active', 'outbid', 'won', 'returned'];

const formatRu = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_e) {
    return '';
  }
};

export default function MyBidsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [bids, setBids]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [filter, setFilter]         = useState('active');

  const fetchBids = useCallback(async () => {
    setError(null);
    try {
      const data = await apiCall(`${API_BASE_URL}/events/me/bids`);
      if (data?.success) {
        setBids(Array.isArray(data.bids) ? data.bids : []);
      } else {
        setError(data?.error || 'Не удалось загрузить ставки');
      }
    } catch (e) {
      setError(e?.message || 'Ошибка сети');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      fetchBids().finally(() => { if (alive) setLoading(false); });
      return () => { alive = false; };
    }, [fetchBids])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBids();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c = { active: 0, outbid: 0, won: 0, returned: 0 };
    for (const b of bids) {
      if (c[b.status] != null) c[b.status]++;
    }
    return c;
  }, [bids]);

  const filtered = useMemo(
    () => bids.filter(b => b.status === filter),
    [bids, filter]
  );

  const renderItem = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.returned;
    const ev   = item.event;
    const isLeading = item.status === 'active'
      && ev?.currentBid != null
      && Number(ev.currentBid) === Number(item.amount);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AuctionDetail', { eventId: item.eventId })}
      >
        <View style={[styles.statusStrip, { backgroundColor: meta.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.topRow}>
            <View style={[styles.iconBox, { backgroundColor: `${meta.color}1F` }]}>
              <MaterialIcons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {ev?.title || `Аукцион #${item.eventId}`}
              </Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
                Ставка: {Number(item.amount).toFixed(0)} PRB · {formatRu(item.createdAt)}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.metaRow}>
            {item.status === 'active' && isLeading && (
              <View style={[styles.chip, { backgroundColor: '#10B98122', borderColor: '#10B981' }]}>
                <MaterialIcons name="trending-up" size={12} color="#10B981" />
                <Text style={[styles.chipText, { color: '#10B981' }]}>Вы лидируете</Text>
              </View>
            )}
            {item.status === 'active' && !isLeading && ev?.currentBid != null && (
              <View style={[styles.chip, { backgroundColor: `${colors.border}22`, borderColor: colors.border }]}>
                <MaterialIcons name="info-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                  Текущая: {Number(ev.currentBid).toFixed(0)} PRB
                </Text>
              </View>
            )}
            {item.status === 'won' && ev?.prize ? (
              <View style={[styles.chip, { backgroundColor: '#10B98114', borderColor: '#10B98155' }]}>
                <MaterialIcons name="card-giftcard" size={12} color="#10B981" />
                <Text style={[styles.chipText, { color: '#10B981' }]} numberOfLines={1}>
                  {ev.prize}
                </Text>
              </View>
            ) : null}
            {item.resolvedAt && item.status !== 'active' && (
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatRu(item.resolvedAt)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const meta   = STATUS_META[f];
          const active = filter === f;
          const count  = counts[f] || 0;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                { borderColor: colors.border },
                active && { backgroundColor: `${meta.color}1F`, borderColor: meta.color },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={meta.icon}
                size={14}
                color={active ? meta.color : colors.textSecondary}
              />
              <Text style={[
                styles.filterText,
                { color: active ? meta.color : colors.text },
              ]}>
                {meta.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countDot, { backgroundColor: active ? meta.color : colors.textSecondary }]}>
                  <Text style={styles.countText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setLoading(true); fetchBids().finally(() => setLoading(false)); }}
          >
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="gavel" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {filter === 'active' ? 'У вас нет активных ставок' : 'Список пуст'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  countDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  list: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },

  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  statusStrip: { width: 4 },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700' },
  sub:   { fontSize: 12, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 11, marginLeft: 'auto' },
});
