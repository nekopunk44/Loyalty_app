import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

function getDaysUntilCheckIn(checkIn) {
  const [day, month, year] = checkIn.split('.');
  const checkInDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  checkInDate.setHours(0, 0, 0, 0);
  return Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
}

export default function CancelConfirmModal({ visible, cancelBookingId, bookings, onClose, onConfirm }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const booking = bookings.find(b => String(b.id) === String(cancelBookingId));
  const daysUntilCheckIn = booking ? getDaysUntilCheckIn(booking.checkIn) : 0;
  const canCancel = daysUntilCheckIn >= 2;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <View style={{
          backgroundColor: colors.cardBg,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: spacing.lg,
          width: '100%',
          maxHeight: '85%',
          paddingTop: spacing.xl,
        }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
            Отменить бронирование?
          </Text>

          {booking && (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={{
                backgroundColor: `${colors.primary}10`,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.lg,
              }}>
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Номер</Text>
                  <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700', marginTop: spacing.xs }}>{booking.property}</Text>
                </View>
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Дата проживания</Text>
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', marginTop: spacing.xs }}>{booking.date}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Сумма платежа</Text>
                  <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700', marginTop: spacing.xs }}>{booking.total} PRB</Text>
                </View>
              </View>

              {canCancel ? (
                <View style={{ backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: '#4CAF50', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg }}>
                  <Text style={{ fontSize: 13, color: '#2E7D32', fontWeight: '700', marginBottom: spacing.sm }}>Отмена доступна</Text>
                  <Text style={{ fontSize: 12, color: '#2E7D32', lineHeight: 18 }}>
                    При отмене будет произведен возврат с вычетом кэшбека в соответствии с вашим уровнем лояльности.
                  </Text>
                  <Text style={{ fontSize: 11, color: '#2E7D32', marginTop: spacing.sm, fontWeight: '600' }}>
                    Дней до заезда: {daysUntilCheckIn}
                  </Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#FFEBEE', borderLeftWidth: 4, borderLeftColor: '#D32F2F', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg }}>
                  <Text style={{ fontSize: 13, color: '#C62828', fontWeight: '600', marginBottom: spacing.sm }}>Отмена недоступна</Text>
                  <Text style={{ fontSize: 12, color: '#C62828', lineHeight: 18 }}>
                    Отмена возможна только минимум за 3 дня до заезда.
                  </Text>
                  <Text style={{ fontSize: 11, color: '#C62828', marginTop: spacing.sm, fontWeight: '600' }}>
                    {daysUntilCheckIn <= 0
                      ? `Заезд был ${Math.abs(daysUntilCheckIn)} дн. назад`
                      : `До заезда осталось ${daysUntilCheckIn} дн.`}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: spacing.lg, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' }}
              onPress={onClose}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Закрыть</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!canCancel}
              style={{
                flex: 1,
                paddingVertical: spacing.lg,
                backgroundColor: canCancel ? '#D32F2F' : '#BDBDBD',
                borderRadius: borderRadius.lg,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: canCancel ? '#D32F2F' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canCancel ? 0.3 : 0,
                shadowRadius: 8,
                elevation: canCancel ? 5 : 0,
              }}
              onPress={onConfirm}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                {canCancel ? 'Отменить\nбронирование' : 'Отмена\nнедоступна'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
