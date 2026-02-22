import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export const BookingCalendar = ({
  propertyId,
  selectedCheckIn,
  selectedCheckOut,
  onDateSelect,
  bookedDates = [],
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);
  const slideAnim = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, slideAnim]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Конвертируем: 0 (Вс) -> 6, 1 (Пн) -> 0, 2 (Вт) -> 1, и т.д.
    return day === 0 ? 6 : day - 1;
  };

  const formatDate = (day, month, year) => {
    return `${String(day).padStart(2, '0')}.${String(month).padStart(
      2,
      '0'
    )}.${year}`;
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('.');
    return new Date(year, month - 1, day);
  };

  const isDateBooked = (day) => {
    const dateStr = formatDate(day, currentDate.getMonth() + 1, currentDate.getFullYear());
    return bookedDates.includes(dateStr);
  };

  const isDateSelected = (day) => {
    const dateStr = formatDate(day, currentDate.getMonth() + 1, currentDate.getFullYear());
    const checkInDate = parseDate(selectedCheckIn);
    const checkOutDate = parseDate(selectedCheckOut);
    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    // Проверяем, является ли это дата check-in или check-out
    if (dateStr === selectedCheckIn || dateStr === selectedCheckOut) {
      return true;
    }

    return false;
  };

  const isDateInRange = (day) => {
    const checkInDate = parseDate(selectedCheckIn);
    const checkOutDate = parseDate(selectedCheckOut);
    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

    if (checkInDate && checkOutDate) {
      // Включаем обе границы (от checkIn включительно до checkOut включительно)
      return currentDay >= checkInDate && currentDay <= checkOutDate;
    }

    return false;
  };

  const handleDatePress = (day) => {
    const dateStr = formatDate(day, currentDate.getMonth() + 1, currentDate.getFullYear());
    const dateObj = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Нельзя выбирать прошлые даты
    if (dateObj < today) return;

    // Нельзя выбирать занятые даты
    if (isDateBooked(day)) return;

    if (!selectingCheckOut) {
      // Выбираем дату заезда
      onDateSelect('checkIn', dateStr);
      setSelectingCheckOut(true);
    } else {
      // Выбираем дату выезда
      const checkInDate = parseDate(selectedCheckIn);
      if (dateObj > checkInDate) {
        onDateSelect('checkOut', dateStr);
        setSelectingCheckOut(false);
        onClose();
      }
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // Пустые клетки до первого дня месяца
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={[styles.day, styles.dayEmpty]} />);
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const isBooked = isDateBooked(day);
      const isSelected = isDateSelected(day);
      const isRange = isDateInRange(day);
      const isFuture = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) >= new Date();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.day,
            { backgroundColor: themeColors.background },
            isBooked && [styles.dayBooked, { backgroundColor: 'rgba(0, 0, 0, 0.2)' }],
            isSelected && [styles.daySelected, { backgroundColor: themeColors.primary }],
            isRange && !isSelected && { opacity: 0.4 },
            !isFuture && styles.dayPast,
          ]}
          onPress={() => handleDatePress(day)}
          disabled={isBooked || !isFuture}
        >
          <Text
            style={[
              styles.dayText,
              { color: themeColors.text },
              isBooked && { color: themeColors.textSecondary },
              isSelected && styles.daySelectedText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    // Форматирование в сетку 7 дней - заполняем последнюю неделю пустыми ячейками
    const totalCells = Math.ceil(days.length / 7) * 7;
    while (days.length < totalCells) {
      days.push(<View key={`empty-end-${days.length}`} style={[styles.day, styles.dayEmpty]} />);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(
        <View key={`week-${i}`} style={styles.weekRow}>
          {days.slice(i, i + 7)}
        </View>
      );
    }

    return (
      <View>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <Text key={day} style={[styles.weekDayText, { color: themeColors.primary }]}>
              {day}
            </Text>
          ))}
        </View>
        <View>
          {weeks}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Animated.View 
          style={[
            styles.container,
            {
              backgroundColor: themeColors.background,
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}
        >
          <View style={[styles.header, { backgroundColor: themeColors.primary }]}>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {selectingCheckOut ? 'Выберите дату выезда' : 'Выберите дату заезда'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : (
            <ScrollView style={[styles.content, { backgroundColor: themeColors.background }]}>
              <View style={styles.monthSelector}>
                <TouchableOpacity onPress={goToPreviousMonth}>
                  <MaterialIcons name="chevron-left" size={24} color={themeColors.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: themeColors.text }]}>
                  {currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={goToNextMonth}>
                  <MaterialIcons name="chevron-right" size={24} color={themeColors.primary} />
                </TouchableOpacity>
              </View>

              <View style={[styles.calendarContainer, { backgroundColor: themeColors.cardBg }]}>
                {renderCalendar()}
              </View>

              <View style={[styles.legend, { backgroundColor: themeColors.cardBg }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: themeColors.primary }]} />
                  <Text style={[styles.legendText, { color: themeColors.text }]}>Выбранная дата</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      { backgroundColor: themeColors.primary + '40' },
                    ]}
                  />
                  <Text style={[styles.legendText, { color: themeColors.text }]}>В диапазоне</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: themeColors.textSecondary }]}
                  />
                  <Text style={[styles.legendText, { color: themeColors.text }]}>Зарезервировано</Text>
                </View>
              </View>

              {selectedCheckIn && (
                <View style={[styles.selectedDates, { backgroundColor: themeColors.cardBg, borderLeftColor: themeColors.primary }]}>
                  <Text style={[styles.selectedDatesLabel, { color: themeColors.textSecondary }]}>Выбранные даты:</Text>
                  <Text style={[styles.selectedDatesValue, { color: themeColors.primary }]}>
                    {selectedCheckIn}
                    {selectedCheckOut && ` — ${selectedCheckOut}`}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calendarContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    width: '14.28%', // 100% / 7 дней = 14.28%
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    aspectRatio: 45.11 / 41.71,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  dayEmpty: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dayPast: {
    opacity: 0.3,
  },
  dayBooked: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  daySelected: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  dayRange: {
    opacity: 0.4,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayBookedText: {
    fontWeight: '600',
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  legend: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: spacing.md,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedDates: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDatesLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDatesValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
