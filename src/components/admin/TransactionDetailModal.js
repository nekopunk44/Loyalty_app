/**
 * TransactionDetailModal — детальная разбивка одной записи Transaction.
 *
 * Принимает запись прямо из GET /api/card/transactions/:userId (Sprint B обогащение):
 *   - category:        'topup' | 'booking_deposit' | 'booking_remaining' |
 *                      'cashback' | 'admin_adjustment' | 'bid_lock' | 'refund' | null
 *   - performedByInfo: { displayName, email } — резолвится сервером для admin_adjustment
 *   - bookingInfo:     { id, propertyId, checkInDate, checkOutDate } — для bookingId-транзакций
 *   - metadata:        свободный JSON-аудит
 *
 * Компонента общая: подходит и для пользователя, и для админа.
 */
import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';

const CATEGORY_META = {
  topup:             { label: 'Пополнение карты',      icon: 'account-balance-wallet', color: '#10B981' },
  booking_deposit:   { label: 'Депозит за бронирование', icon: 'event-available',      color: '#3B82F6' },
  booking_remaining: { label: 'Оплата остатка',         icon: 'event-note',           color: '#3B82F6' },
  cashback:          { label: 'Кэшбэк',                 icon: 'redeem',               color: '#F59E0B' },
  admin_adjustment:  { label: 'Корректировка администратором', icon: 'admin-panel-settings', color: '#8B5CF6' },
  bid_lock:          { label: 'Победа в аукционе',      icon: 'gavel',                color: '#EF4444' },
  bid_unlock:        { label: 'Возврат ставки',         icon: 'undo',                 color: '#10B981' },
  refund:            { label: 'Возврат средств',        icon: 'replay',               color: '#10B981' },
};

const REASON_LABEL = {
  compensation: 'Компенсация',
  promo_bonus:  'Промо-бонус',
  correction:   'Корректировка',
  penalty:      'Штраф',
  other:        'Другое',
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_e) {
    return String(iso);
  }
};

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function TransactionDetailModal({ visible, onClose, theme, transaction }) {
  const colors = theme.colors;
  const tx     = transaction || {};
  const meta   = CATEGORY_META[tx.category] || {
    label: tx.type === 'credit' ? 'Зачисление' : 'Списание',
    icon:  'swap-horiz',
    color: tx.type === 'credit' ? '#10B981' : '#EF4444',
  };

  const isCredit  = tx.type === 'credit';
  const sign      = isCredit ? '+' : '−';
  const amount    = Number(tx.amount || 0);
  const auditMeta = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: meta.color + '22' }]}>
                <MaterialIcons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                  {meta.label}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {formatDateTime(tx.createdAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.amountBlock, { borderColor: colors.border }]}>
            <Text style={[styles.amountValue, { color: meta.color }]}>
              {sign}{fmtMoney(amount)} PRB
            </Text>
            {(tx.balanceBefore != null || tx.balanceAfter != null) && (
              <Text style={[styles.balanceLine, { color: colors.textSecondary }]}>
                Баланс: {fmtMoney(tx.balanceBefore)} → {fmtMoney(tx.balanceAfter)} PRB
              </Text>
            )}
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
            {tx.description ? (
              <Row label="Описание" value={tx.description} colors={colors} multiline />
            ) : null}

            {tx.category === 'admin_adjustment' && auditMeta?.reason ? (
              <Row label="Причина" value={REASON_LABEL[auditMeta.reason] || auditMeta.reason} colors={colors} />
            ) : null}

            {tx.performedByInfo ? (
              <Row
                label="Выполнено администратором"
                value={`${tx.performedByInfo.displayName || tx.performedByInfo.email}`}
                colors={colors}
              />
            ) : null}

            {tx.bookingInfo ? (
              <Row
                label="Бронирование"
                value={`#${tx.bookingInfo.id} · ${tx.bookingInfo.checkInDate || '—'} → ${tx.bookingInfo.checkOutDate || '—'}`}
                colors={colors}
              />
            ) : null}

            {tx.category === 'cashback' && auditMeta ? (
              <>
                {auditMeta.method ? <Row label="Метод оплаты" value={auditMeta.method === 'cash' ? 'Наличные (только депозит)' : 'Картой'} colors={colors} /> : null}
                {auditMeta.cashbackBase != null ? <Row label="База для кэшбэка" value={`${fmtMoney(auditMeta.cashbackBase)} PRB`} colors={colors} /> : null}
                {auditMeta.membershipLevel ? <Row label="Уровень лояльности" value={auditMeta.membershipLevel} colors={colors} /> : null}
                {auditMeta.birthdayBonus ? <Row label="Бонус ко дню рождения" value={`x${auditMeta.multiplier || 2}`} colors={colors} /> : null}
                {Array.isArray(auditMeta.promotionApplied) && auditMeta.promotionApplied.length
                  ? <Row label="Применённые промо-акции" value={auditMeta.promotionApplied.join(', ')} colors={colors} multiline />
                  : null}
              </>
            ) : null}

            {tx.category === 'topup' && auditMeta?.paymentMethod ? (
              <Row label="Способ оплаты" value={String(auditMeta.paymentMethod)} colors={colors} />
            ) : null}

            {tx.relatedType && tx.relatedId ? (
              <Row label="Связано с" value={`${tx.relatedType} #${tx.relatedId}`} colors={colors} />
            ) : null}

            <Row label="ID транзакции" value={`#${tx.id}`} colors={colors} />
          </ScrollView>

          <TouchableOpacity
            style={[styles.closeAction, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeActionText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, colors, multiline = false }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: colors.text }]}
        numberOfLines={multiline ? undefined : 2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:    { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 4 },
  amountBlock: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountValue: { fontSize: 22, fontWeight: '800' },
  balanceLine: { fontSize: 12, marginTop: 4 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rowValue: { fontSize: 14, fontWeight: '500' },
  closeAction: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
