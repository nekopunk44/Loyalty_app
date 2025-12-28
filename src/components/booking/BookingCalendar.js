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
  PanResponder,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';

const NAVY = '#063B5C';
const TEAL = '#14B8A6';
const CORAL = '#FF6B35';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CALENDAR_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);
const DAY_GAP = 6;
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 72 - DAY_GAP * 6) / 7);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const BookingCalendar = ({
  propertyId: _propertyId,
  selectedCheckIn,
  selectedCheckOut,
  onDateSelect,
  bookedDates = [],
  visible,
  selectionMode = 'checkIn',
  onClose,
}) => {
  const { theme } = useTheme();
  const themeColors = theme.colors;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading] = useState(false);
  const [selectingCheckOut, setSelectingCheckOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(visible);
  const slideAnim = useRef(new Animated.Value(CALENDAR_SHEET_HEIGHT + 40)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const selectedPulse = useRef(new Animated.Value(1)).current;
  const checkInPillAnim = useRef(new Animated.Value(selectedCheckIn ? 1 : 0)).current;
  const checkOutPillAnim = useRef(new Animated.Value(selectedCheckOut ? 1 : 0)).current;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          onCloseRef.current?.();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    slideAnim.stopAnimation();
    backdropAnim.stopAnimation();

    if (visible) {
      setSelectingCheckOut(selectionMode === 'checkOut');
      setShouldRender(true);
      slideAnim.setValue(CALENDAR_SHEET_HEIGHT + 48);
      backdropAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 24,
            stiffness: 190,
            mass: 0.9,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else if (shouldRender) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: CALENDAR_SHEET_HEIGHT + 48,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, selectionMode, slideAnim, backdropAnim]);

  useEffect(() => {
    Animated.timing(checkInPillAnim, {
      toValue: selectedCheckIn ? 1 : 0,
      duration: selectedCheckIn ? 420 : 200,
      useNativeDriver: true,
    }).start();
  }, [selectedCheckIn, checkInPillAnim]);

  useEffect(() => {
    Animated.timing(checkOutPillAnim, {
      toValue: selectedCheckOut ? 1 : 0,
      duration: selectedCheckOut ? 420 : 200,
      useNativeDriver: true,
    }).start();
  }, [selectedCheckOut, checkOutPillAnim]);

  useEffect(() => {
    if (!visible || (!selectedCheckIn && !selectedCheckOut)) return;

    selectedPulse.setValue(0.82);
    Animated.spring(selectedPulse, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [selectedCheckIn, selectedCheckOut, visible, selectedPulse]);

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
    const weekDays = ['\u041f\u043d', '\u0412\u0442', '\u0421\u0440', '\u0427\u0442', '\u041f\u0442', '\u0421\u0431', '\u0412\u0441'];

    // Пустые клетки до первого дня месяца
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={[styles.day, styles.dayEmpty]} />);
    }

    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const isBooked = isDateBooked(day);
      const isSelected = isDateSelected(day);
      const isRange = isDateInRange(day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFuture = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) >= today;

      days.push(
        <AnimatedTouchableOpacity
          key={day}
          style={[
            styles.day,
            { backgroundColor: themeColors.cardBg },
            isRange && !isSelected && styles.dayRange,
            isBooked && styles.dayBooked,
            isSelected && styles.daySelected,
            !isFuture && styles.dayPast,
            isSelected && { transform: [{ scale: selectedPulse }] },
          ]}
          onPress={() => handleDatePress(day)}
          disabled={isBooked || !isFuture}
        >
          <Text
            style={[
              styles.dayText,
              { color: themeColors.text },
              isRange && !isSelected && styles.dayRangeText,
              isBooked && styles.dayBookedText,
              !isFuture && styles.dayPastText,
              isSelected && styles.daySelectedText,
            ]}
          >
            {day}
          </Text>
        </AnimatedTouchableOpacity>
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
            <Text key={day} style={styles.weekDayText}>
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

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropScrim, { opacity: backdropAnim }]}
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
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>
                {selectingCheckOut ? '\u0428\u0430\u0433 2 \u0438\u0437 2' : '\u0428\u0430\u0433 1 \u0438\u0437 2'}
              </Text>
              <Text style={styles.title}>
                {selectingCheckOut ? '\u0414\u0430\u0442\u0430 \u0432\u044b\u0435\u0437\u0434\u0430' : '\u0414\u0430\u0442\u0430 \u0437\u0430\u0435\u0437\u0434\u0430'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>
          <View style={styles.selectionStrip}>
            <View style={[styles.selectionPill, selectedCheckIn && styles.selectionPillActive]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.selectionPillFill,
                  {
                    opacity: checkInPillAnim,
                  },
                ]}
              />
              <MaterialIcons
                name="login"
                size={16}
                color={selectedCheckIn ? '#fff' : NAVY}
                style={styles.selectionPillIcon}
              />
              <Text style={[styles.selectionText, selectedCheckIn && styles.selectionTextActive]}>
                {selectedCheckIn || '\u0417\u0430\u0435\u0437\u0434'}
              </Text>
            </View>
            <View style={[styles.selectionPill, selectedCheckOut && styles.selectionPillActive]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.selectionPillFill,
                  {
                    opacity: checkOutPillAnim,
                  },
                ]}
              />
              <MaterialIcons
                name="logout"
                size={16}
                color={selectedCheckOut ? '#fff' : NAVY}
                style={styles.selectionPillIcon}
              />
              <Text style={[styles.selectionText, selectedCheckOut && styles.selectionTextActive]}>
                {selectedCheckOut || '\u0412\u044b\u0435\u0437\u0434'}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
              <View style={styles.monthSelector}>
                <TouchableOpacity style={styles.monthButton} onPress={goToPreviousMonth}>
                  <MaterialIcons name="chevron-left" size={24} color={CORAL} />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  {currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity style={styles.monthButton} onPress={goToNextMonth}>
                  <MaterialIcons name="chevron-right" size={24} color={CORAL} />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarContainer}>
                {renderCalendar()}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: CORAL }]} />
                  <Text style={styles.legendText}>{'\u0412\u044b\u0431\u0440\u0430\u043d\u043e'}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: `${TEAL}28` }]} />
                  <Text style={styles.legendText}>{'\u0414\u0438\u0430\u043f\u0430\u0437\u043e\u043d'}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#6B7280' }]} />
                  <Text style={styles.legendText}>{'\u0417\u0430\u043d\u044f\u0442\u043e'}</Text>
                </View>
              </View>

              {selectedCheckIn && (
                <View style={styles.selectedDates}>
                  <Text style={styles.selectedDatesLabel}>{'\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u0434\u0430\u0442\u044b'}</Text>
                  <Text style={styles.selectedDatesValue}>
                    {selectedCheckIn}
                    {selectedCheckOut && ` \u2014 ${selectedCheckOut}`}
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
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6, 18, 30, 0.44)' },
  container: { height: CALENDAR_SHEET_HEIGHT, backgroundColor: '#F6F8FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', shadowColor: NAVY, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.18, shadowRadius: 22, elevation: 16 },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 46, height: 5, borderRadius: 3, backgroundColor: '#DDE3EA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14 },
  titleBlock: { flex: 1, paddingRight: 14 },
  eyebrow: { fontSize: 11, fontWeight: '900', color: CORAL, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 23, fontWeight: '900', color: NAVY },
  closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5EAF0' },
  selectionStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 22, marginBottom: 16, gap: 10 },
  selectionPill: { flex: 1, minHeight: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF0', overflow: 'hidden' },
  selectionPillFill: { ...StyleSheet.absoluteFillObject, backgroundColor: NAVY, borderRadius: 23 },
  selectionPillIcon: { position: 'relative', zIndex: 2 },
  selectionPillActive: { borderColor: NAVY, shadowColor: NAVY, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  selectionText: { position: 'relative', zIndex: 2, fontSize: 13, color: NAVY, fontWeight: '800' },
  selectionTextActive: { color: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 22, paddingBottom: 26 },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
  monthButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5EAF0' },
  monthText: { fontSize: 21, fontWeight: '900', color: '#1F2937', textTransform: 'capitalize' },
  calendarContainer: { borderRadius: 24, padding: 12, marginBottom: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF0' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9, gap: DAY_GAP },
  weekDayText: { fontSize: 11, fontWeight: '900', width: DAY_SIZE, textAlign: 'center', textTransform: 'uppercase', color: CORAL },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7, gap: DAY_GAP },
  day: { width: DAY_SIZE, height: DAY_SIZE, justifyContent: 'center', alignItems: 'center', borderRadius: DAY_SIZE / 2, borderWidth: 1, borderColor: '#EEF2F6' },
  dayEmpty: { width: DAY_SIZE, height: DAY_SIZE, backgroundColor: 'transparent', borderWidth: 0 },
  dayPast: { backgroundColor: '#FAFBFC', borderColor: '#F3F4F6' },
  dayBooked: { backgroundColor: '#6B7280', borderColor: '#6B7280' },
  daySelected: { backgroundColor: CORAL, borderColor: CORAL, borderRadius: DAY_SIZE / 2, shadowColor: CORAL, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 5 },
  dayRange: { backgroundColor: TEAL + '18', borderColor: TEAL + '34' },
  dayText: { fontSize: 14, fontWeight: '800' },
  dayBookedText: { color: '#fff', fontWeight: '900' },
  dayPastText: { color: '#B8C0CA' },
  dayRangeText: { color: TEAL },
  daySelectedText: { color: '#fff', fontWeight: '900' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 14 },
  legendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF0', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6 },
  legendColor: { width: 9, height: 9, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 11, color: '#4B5563', fontWeight: '800' },
  selectedDates: { borderRadius: 18, padding: 16, marginBottom: 14, backgroundColor: NAVY },
  selectedDatesLabel: { fontSize: 11, color: 'rgba(255,255,255,0.66)', marginBottom: 5, fontWeight: '900', textTransform: 'uppercase' },
  selectedDatesValue: { fontSize: 16, color: '#fff', fontWeight: '900' },
});
