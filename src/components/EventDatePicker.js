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
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';

/**
 * Компонент календаря для выбора даты события
 * Показывает календарь для выбора одной даты
 */
export const EventDatePicker = ({
  selectedDate,
  onDateSelect,
  visible,
  onClose,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
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
    return day === 0 ? 6 : day - 1;
  };

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    // Convert JS day (0=Sunday) to our format (0=Monday)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(null);
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
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

  const isDateSelected = (day) => {
    const dateStr = formatDate(day, currentDate.getMonth() + 1, currentDate.getFullYear());
    return dateStr === selectedDate;
  };

  const isDateDisabled = (day) => {
    // Проверяем, находится ли дата в прошлом (до сегодня)
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Убираем время для корректного сравнения
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  };

  const handleDatePress = (day) => {
    if (isDateDisabled(day)) {
      return; // Не позволяем выбрать прошлую дату
    }
    const dateStr = formatDate(day, currentDate.getMonth() + 1, currentDate.getFullYear());
    onDateSelect(dateStr);
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const renderCalendar = () => {
    const calendarDays = getCalendarDays();
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    const days = calendarDays.map((day, index) => {
      if (day === null) {
        return <View key={`empty-${index}`} style={[styles.day, styles.dayEmpty]} />;
      }

      const isSelected = isDateSelected(day);
      const isDisabled = isDateDisabled(day);
      
      return (
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.day,
            isSelected && styles.daySelected,
            isDisabled && styles.dayDisabled,
          ]}
          onPress={() => handleDatePress(day)}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.dayText,
              isSelected && styles.daySelectedText,
              isDisabled && styles.dayDisabledText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    });

    // Форматирование в сетку 7 дней
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      
      // Добавляем пустые элементы в конец неполной недели
      while (weekDays.length < 7) {
        weekDays.push(
          <View key={`empty-end-${weekDays.length}`} style={[styles.day, styles.dayEmpty]} />
        );
      }
      
      weeks.push(
        <View key={`week-${i}`} style={styles.weekRow}>
          {weekDays}
        </View>
      );
    }

    return (
      <>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>
        {weeks}
      </>
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
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}
        >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Выберите дату события</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content}>
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={goToNextMonth}>
                <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendar}>
              {renderCalendar()}
            </View>
          </ScrollView>
        )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    height: '65%',
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: colors.secondary,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  calendar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  weekDayText: {
    width: '14%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  day: {
    width: '14%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  dayEmpty: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  daySelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  daySelectedText: {
    color: '#fff',
    fontWeight: '700',
  },
  dayDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  dayDisabledText: {
    color: '#ccc',
  },
});
