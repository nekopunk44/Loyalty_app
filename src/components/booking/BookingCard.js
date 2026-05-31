import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FadeInCard } from '../ui/AnimatedCard';
import { useTheme } from '../../context/ThemeContext';

const NAVY = '#063B5C';

const STATUS_MAP = {
  pending:         { text: 'Ожидает оплаты',  color: '#FEF3C7', textColor: '#B45309' },
  pending_payment: { text: 'Ожидает депозита', color: '#FEF3C7', textColor: '#B45309' },
  confirmed:       { text: 'Депозит оплачен',  color: '#DBEAFE', textColor: '#1E40AF' },
  paid:            { text: 'Активный',         color: '#D1FAE5', textColor: '#065F46' },
  completed:       { text: 'Завершено',        color: '#E5E7EB', textColor: '#374151' },
  cancelled:       { text: 'Отменено',         color: '#FEE2E2', textColor: '#B91C1C' },
  expired:         { text: 'Истекло',          color: '#E5E7EB', textColor: '#6B7280' },
};

// Возвращает строку «Чч Мм Сс» до истечения дедлайна (или пустую строку).
const formatRemaining = (deadlineMs) => {
  const diff = deadlineMs - Date.now();
  if (diff <= 0) return '00:00';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}ч ${pad(m)}м ${pad(s)}с` : `${pad(m)}:${pad(s)}`;
};

export default function BookingCard({
  item,
  index,
  onCancel,
  onPayDeposit,
  onPayRemaining,
  payingDepositId,
  payingRemainingId,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = makeStyles(colors);

  const statusInfo = STATUS_MAP[item.status] ?? { text: 'Неизвестно', color: '#F3F4F6', textColor: '#6B7280' };

  // Тикающий таймер до paymentDeadline для pending_payment.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (item.status !== 'pending_payment' || !item.paymentDeadline) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [item.status, item.paymentDeadline]);

  const deadlineMs   = item.paymentDeadline ? new Date(item.paymentDeadline).getTime() : 0;
  const isExpired    = deadlineMs > 0 && deadlineMs <= Date.now();
  const remainingStr = deadlineMs > 0 ? formatRemaining(deadlineMs) : '';
  // tick used to force re-render every second
  void tick;

  const depositAmount   = Number(item.depositAmount) || 0;
  const totalAmount     = Number(item.total) || 0;
  const remainingAmount = Math.max(0, totalAmount - depositAmount);
  const isPayingDeposit   = payingDepositId   === item.id;
  const isPayingRemaining = payingRemainingId === item.id;

  return (
    <FadeInCard delay={100 + index * 50}>
      <View style={styles.card}>
        <View style={[styles.accent, { backgroundColor: statusInfo.textColor }]} />
        <View style={styles.body}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.property}>{item.property}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusInfo.color }]}>
              <Text style={[styles.badgeText, { color: statusInfo.textColor }]}>{statusInfo.text}</Text>
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.row}>
              <MaterialIcons name="calendar-today" size={16} color={colors.textSecondary} />
              <Text style={styles.rowText}>{item.checkIn} — {item.checkOut}</Text>
            </View>
            <View style={styles.row}>
              <MaterialIcons name="people" size={16} color={colors.textSecondary} />
              <Text style={styles.rowText}>{item.guests} гостей • {item.nights} ночей</Text>
            </View>
            <View style={styles.row}>
              <MaterialIcons name="payments" size={16} color={colors.primary} />
              <Text style={[styles.rowText, { fontWeight: '700', color: colors.primary }]}>
                {totalAmount.toLocaleString('ru-RU')}PRB
              </Text>
            </View>
            {item.saunaHours > 0 && (
              <View style={styles.row}>
                <MaterialCommunityIcons name="spa" size={16} color={colors.textSecondary} />
                <Text style={styles.rowText}>Парилка: {item.saunaHours} ч.</Text>
              </View>
            )}
            {item.kitchenware && (
              <View style={styles.row}>
                <MaterialIcons name="kitchen" size={16} color={colors.textSecondary} />
                <Text style={styles.rowText}>Кухонный сервиз</Text>
              </View>
            )}
          </View>

          {/* pending_payment: countdown + Оплатить депозит */}
          {item.status === 'pending_payment' && (
            <View style={styles.paySection}>
              <View style={styles.payHeaderRow}>
                <MaterialIcons
                  name={isExpired ? 'timer-off' : 'timer'}
                  size={16}
                  color={isExpired ? '#B91C1C' : '#B45309'}
                />
                <Text style={[styles.payHeaderText, { color: isExpired ? '#B91C1C' : '#B45309' }]}>
                  {isExpired
                    ? 'Время на оплату истекло'
                    : `До истечения брони: ${remainingStr}`}
                </Text>
              </View>

              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountLabel}>Депозит:</Text>
                <Text style={styles.payAmountValue}>{depositAmount.toLocaleString('ru-RU')}PRB</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (isExpired || isPayingDeposit) && styles.btnDisabled]}
                onPress={() => onPayDeposit?.(item)}
                disabled={isExpired || isPayingDeposit}
                activeOpacity={0.8}
              >
                {isPayingDeposit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="credit-card" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Оплатить депозит</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* confirmed: остаток к доплате + Оплатить остаток */}
          {item.status === 'confirmed' && remainingAmount > 0 && (
            <View style={styles.paySection}>
              <View style={styles.payHeaderRow}>
                <MaterialIcons name="check-circle" size={16} color="#065F46" />
                <Text style={[styles.payHeaderText, { color: '#065F46' }]}>
                  Депозит оплачен {depositAmount.toLocaleString('ru-RU')}PRB
                </Text>
              </View>

              <View style={styles.payAmountRow}>
                <Text style={styles.payAmountLabel}>Остаток до заезда:</Text>
                <Text style={styles.payAmountValue}>{remainingAmount.toLocaleString('ru-RU')}PRB</Text>
              </View>

              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, isPayingRemaining && styles.btnDisabled]}
                  onPress={() => onPayRemaining?.(item, 'card')}
                  disabled={isPayingRemaining}
                  activeOpacity={0.8}
                >
                  {isPayingRemaining ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="credit-card" size={16} color={colors.primary} />
                      <Text style={[styles.methodBtnText, { color: colors.primary }]}>Картой</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, isPayingRemaining && styles.btnDisabled]}
                  onPress={() => onPayRemaining?.(item, 'cash')}
                  disabled={isPayingRemaining}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="payments" size={16} color={colors.primary} />
                  <Text style={[styles.methodBtnText, { color: colors.primary }]}>Наличными</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.methodHint}>
                «Картой» — спишется с карты лояльности сейчас. «Наличными» — отметит остаток как принятый при заезде.
              </Text>
            </View>
          )}

          {(item.status === 'pending' || item.status === 'pending_payment' || item.status === 'confirmed') && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(item.id)} activeOpacity={0.7}>
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelText}>Отменить бронирование</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </FadeInCard>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card:      { backgroundColor: colors.cardBg, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  accent:    { height: 3 },
  body:      { padding: 14 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  property:  { fontSize: 15, fontWeight: '800', color: colors.text },
  date:      { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  details:   { backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rowText:   { fontSize: 12, color: colors.text },
  paySection:    { backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  payHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  payHeaderText: { fontSize: 12, fontWeight: '700' },
  payAmountRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  payAmountLabel:{ fontSize: 13, color: colors.textSecondary },
  payAmountValue:{ fontSize: 15, fontWeight: '800', color: colors.text },
  primaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.primary },
  primaryBtnText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  methodRow:     { flexDirection: 'row', gap: 8 },
  methodBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primary + '12' },
  methodBtnText: { fontSize: 13, fontWeight: '700' },
  methodHint:    { fontSize: 11, color: colors.textSecondary, marginTop: 8, lineHeight: 15 },
  btnDisabled:   { opacity: 0.5 },
  cancelBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, backgroundColor: '#EF444410' },
  cancelText:    { color: '#EF4444', fontSize: 13, fontWeight: '700' },
});
