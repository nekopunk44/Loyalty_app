import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FadeInCard } from '../ui/AnimatedCard';
import { useTheme } from '../../context/ThemeContext';

const NAVY = '#063B5C';

const STATUS_MAP = {
  pending:   { text: 'Ожидает оплаты', color: '#FEF3C7', textColor: '#B45309' },
  confirmed: { text: 'Активный',       color: '#D1FAE5', textColor: '#065F46' },
  paid:      { text: 'Активный',       color: '#D1FAE5', textColor: '#065F46' },
  completed: { text: 'Завершено',      color: '#E5E7EB', textColor: '#374151' },
  cancelled: { text: 'Отменено',       color: '#FEE2E2', textColor: '#B91C1C' },
};

export default function BookingCard({ item, index, onCancel }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = makeStyles(colors);

  const statusInfo = STATUS_MAP[item.status] ?? { text: 'Неизвестно', color: '#F3F4F6', textColor: '#6B7280' };

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
                {item.total.toLocaleString('ru-RU')}PRB
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

          {(item.status === 'pending' || item.status === 'confirmed') && (
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
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, backgroundColor: '#EF444410' },
  cancelText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
});
