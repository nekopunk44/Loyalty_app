import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const ACCENT_OK   = '#10B981';
const ACCENT_WARN = '#EF4444';
const DANGER_BG   = '#EF4444';

function getDaysUntilCheckIn(checkIn) {
  const [day, month, year] = checkIn.split('.');
  const checkInDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);
  return Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
}

function pluralizeDays(n) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}

export default function CancelConfirmModal({ visible, cancelBookingId, bookings, onClose, onConfirm }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  const booking = bookings.find(b => String(b.id) === String(cancelBookingId));
  const daysUntilCheckIn = booking ? getDaysUntilCheckIn(booking.checkIn) : 0;
  const canCancel = daysUntilCheckIn >= 2;

  const okBg   = isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.10)';
  const warnBg = isDark ? 'rgba(239,68,68,0.14)'  : 'rgba(239,68,68,0.08)';

  const statusLine = !booking
    ? ''
    : daysUntilCheckIn < 0
      ? `Заезд был ${Math.abs(daysUntilCheckIn)} ${pluralizeDays(daysUntilCheckIn)} назад`
      : daysUntilCheckIn === 0
        ? 'Заезд сегодня'
        : `До заезда ${daysUntilCheckIn} ${pluralizeDays(daysUntilCheckIn)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.cardBg }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: canCancel ? okBg : warnBg }]}>
              <MaterialIcons
                name={canCancel ? 'event-busy' : 'block'}
                size={22}
                color={canCancel ? ACCENT_OK : ACCENT_WARN}
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {canCancel ? 'Отменить бронирование?' : 'Отмена недоступна'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {canCancel
                ? 'Сумма вернётся на карту с учётом удержания кэшбека по вашему уровню.'
                : 'Отмена возможна минимум за 3 дня до заезда.'}
            </Text>
          </View>

          {booking && (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
              <View style={styles.row}>
                <MaterialIcons name="hotel" size={18} color={colors.textSecondary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Номер</Text>
                <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
                  {booking.property}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.row}>
                <MaterialIcons name="event" size={18} color={colors.textSecondary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Даты</Text>
                <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
                  {booking.date}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.row}>
                <MaterialIcons name="payments" size={18} color={colors.textSecondary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Сумма</Text>
                <Text style={[styles.rowValuePrimary, { color: colors.primary }]} numberOfLines={1}>
                  {booking.total} PRB
                </Text>
              </View>
            </View>
          )}

          <View style={[
            styles.statusPill,
            { backgroundColor: canCancel ? okBg : warnBg, borderColor: canCancel ? `${ACCENT_OK}55` : `${ACCENT_WARN}55` },
          ]}>
            <MaterialIcons
              name={canCancel ? 'schedule' : 'error-outline'}
              size={14}
              color={canCancel ? ACCENT_OK : ACCENT_WARN}
            />
            <Text style={[styles.statusText, { color: canCancel ? ACCENT_OK : ACCENT_WARN }]}>
              {statusLine}
            </Text>
          </View>

          {canCancel ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnSecondary, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.text }]}>Закрыть</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDanger]}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <MaterialIcons name="cancel" size={16} color="#fff" />
                <Text style={styles.btnDangerText}>Подтвердить отмену</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnFull, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.btnFullText}>Понятно</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 64,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  rowValuePrimary: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: 6,
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: DANGER_BG,
    shadowColor: DANGER_BG,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  btnFull: {
    flex: 0,
  },
  btnFullText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
