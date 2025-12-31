/**
 * UserTransactionsModal — история транзакций пользователя для админа.
 * Грузит /api/card/transactions/:userId (Sprint B обогащение: performedByInfo, bookingInfo).
 * Клик по строке → TransactionDetailModal с разбивкой.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';
import TransactionDetailModal from './TransactionDetailModal';

const API_BASE_URL = getApiUrl();
const PAGE_LIMIT   = 50;

const CATEGORY_LABEL = {
  topup:             'Пополнение',
  booking_deposit:   'Депозит',
  booking_remaining: 'Остаток брони',
  cashback:          'Кэшбэк',
  admin_adjustment:  'Корректировка',
  bid_lock:          'Аукцион',
  bid_unlock:        'Возврат ставки',
  refund:            'Возврат',
};

const CATEGORY_ICON = {
  topup:             'account-balance-wallet',
  booking_deposit:   'event-available',
  booking_remaining: 'event-note',
  cashback:          'redeem',
  admin_adjustment:  'admin-panel-settings',
  bid_lock:          'gavel',
  bid_unlock:        'undo',
  refund:            'replay',
};

const formatShort = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_e) {
    return '';
  }
};

export default function UserTransactionsModal({ visible, onClose, theme, user }) {
  const colors = theme.colors;
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError]               = useState(null);
  const [selectedTx, setSelectedTx]     = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!user?.userId) return;
    setError(null);
    try {
      const data = await apiCall(
        `${API_BASE_URL}/card/transactions/${user.userId}?limit=${PAGE_LIMIT}`,
      );
      if (data?.success) {
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      } else {
        setError(data?.error || 'Не удалось загрузить историю');
      }
    } catch (e) {
      setError(e?.message || 'Ошибка сети');
    }
  }, [user?.userId]);

  useEffect(() => {
    if (visible && user?.userId) {
      setLoading(true);
      fetchHistory().finally(() => setLoading(false));
    } else if (!visible) {
      setTransactions([]);
      setSelectedTx(null);
    }
  }, [visible, user?.userId, fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isCredit = item.type === 'credit';
    const sign     = isCredit ? '+' : '−';
    const amtColor = isCredit ? '#10B981' : '#EF4444';
    const label    = CATEGORY_LABEL[item.category] || (isCredit ? 'Зачисление' : 'Списание');
    const icon     = CATEGORY_ICON[item.category]  || 'swap-horiz';

    return (
      <TouchableOpacity
        style={[styles.row, { borderColor: colors.border }]}
        onPress={() => setSelectedTx(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: `${amtColor}18` }]}>
          <MaterialIcons name={icon} size={18} color={amtColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.description || formatShort(item.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, { color: amtColor }]}>
            {sign}{Number(item.amount).toFixed(0)}
          </Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatShort(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>История транзакций</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user?.name || user?.email}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.centerBlock}>
                <MaterialIcons name="error-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setLoading(true); fetchHistory().finally(() => setLoading(false)); }}
                >
                  <Text style={styles.retryText}>Повторить</Text>
                </TouchableOpacity>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.centerBlock}>
                <MaterialIcons name="receipt-long" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Транзакций пока нет
                </Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: spacing.md }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      <TransactionDetailModal
        visible={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        theme={theme}
        transaction={selectedTx}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '80%',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title:    { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSub:   { fontSize: 12, marginTop: 2 },
  amount:   { fontSize: 14, fontWeight: '700' },
  time:     { fontSize: 11, marginTop: 2 },
});
