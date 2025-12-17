import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ScaleInCard, FadeInCard, SlideInBottomCard } from '../components/AnimatedCard';

const mockProperties = [
  {
    id: '1',
    name: 'Люкс апартамент',
    description: 'Полный комфорт, с видом на природу',
    price: '5,500₽/ночь',
    priceNumber: 5500,
    rooms: 2,
    guests: 4,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня'],
    image: 'https://picsum.photos/300/200?random=1',
  },
  {
    id: '2',
    name: 'Стандартная комната',
    description: 'Уютная и удобная для отдыха',
    price: '3,000₽/ночь',
    priceNumber: 3000,
    rooms: 1,
    guests: 2,
    amenities: ['WiFi', 'TV', 'Ванная'],
    image: 'https://picsum.photos/300/200?random=2',
  },
  {
    id: '3',
    name: 'Семейный номер',
    description: 'Просторный номер для семей',
    price: '7,500₽/ночь',
    priceNumber: 7500,
    rooms: 3,
    guests: 6,
    amenities: ['WiFi', 'Кухня', 'TV', 'Кондиционер', 'Сейф'],
    image: 'https://picsum.photos/300/200?random=3',
  },
];

export default function BookingScreen({ navigation }) {
  const { theme } = useTheme();
  const [bookings, setBookings] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: '',
    notes: '',
  });

  const handleSelectProperty = (property) => {
    setSelectedProperty(property);
    setBookingModalVisible(true);
  };

  const calculateNights = () => {
    if (!bookingData.checkIn || !bookingData.checkOut) return 0;
    const [dayIn, monthIn, yearIn] = bookingData.checkIn.split('.');
    const [dayOut, monthOut, yearOut] = bookingData.checkOut.split('.');
    const checkIn = new Date(yearIn, monthIn - 1, dayIn);
    const checkOut = new Date(yearOut, monthOut - 1, dayOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return Math.max(0, nights);
  };

  const calculateTotal = () => {
    if (!selectedProperty) return 0;
    return selectedProperty.priceNumber * calculateNights();
  };

  const handleConfirmBooking = () => {
    if (!bookingData.checkIn || !bookingData.checkOut || !bookingData.guests) {
      Alert.alert('Ошибка', 'Заполните все обязательные поля');
      return;
    }

    const nights = calculateNights();
    if (nights <= 0) {
      Alert.alert('Ошибка', 'Дата выезда должна быть позже даты заезда');
      return;
    }

    const total = calculateTotal();
    
    // Переход на экран оплаты
    setBookingModalVisible(false);
    
    // Передаём данные бронирования в CheckoutScreen
    navigation.navigate('Checkout', {
      serviceType: selectedProperty.name,
      guestName: bookingData.guests,
      amount: total,
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      nights: nights,
      notes: bookingData.notes,
    });

    setSelectedProperty(null);
    setBookingData({
      checkIn: '',
      checkOut: '',
      guests: '',
      notes: '',
    });
  };

  const handleCancelBooking = (id) => {
    Alert.alert(
      'Отменить бронирование',
      'Это действие нельзя отменить.',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Отменить',
          onPress: () => {
            setBookings(bookings.filter((b) => b.id !== id));
            Alert.alert('Готово', 'Бронирование отменено.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderProperty = ({ item, index }) => (
    <FadeInCard delay={200 + index * 50}>
      <TouchableOpacity
        style={[styles.propertyCard, { backgroundColor: theme.colors.cardBg }]}
        onPress={() => handleSelectProperty(item)}
      >
        <View style={styles.propertyHeader}>
          <View>
            <Text style={[styles.propertyName, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.propertyDescription, { color: theme.colors.textSecondary }]}>{item.description}</Text>
          </View>
          <Text style={[styles.propertyPrice, { color: theme.colors.primary }]}>{item.price}</Text>
        </View>

        <View style={styles.propertyFeatures}>
          <View style={styles.featureItem}>
            <MaterialIcons name="door-front" size={16} color={colors.primary} />
            <Text style={styles.featureText}>{item.rooms} комн.</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="group" size={16} color={colors.primary} />
            <Text style={styles.featureText}>до {item.guests} гостей</Text>
          </View>
        </View>

        <View style={styles.amenitiesContainer}>
          {item.amenities.slice(0, 3).map((amenity, index) => (
            <View key={index} style={styles.amenityBadge}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
          {item.amenities.length > 3 && (
            <View style={styles.amenityBadge}>
              <Text style={styles.amenityText}>+{item.amenities.length - 3}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectProperty(item)}>
          <MaterialIcons name="calendar-check" size={18} color="#fff" />
          <Text style={styles.selectButtonText}>Выбрать даты</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </FadeInCard>
  );

  const renderBooking = ({ item, index }) => (
    <FadeInCard delay={100 + index * 50}>
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingProperty}>{item.property}</Text>
            <Text style={styles.bookingDate}>{item.date}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === 'pending'
                    ? colors.accent
                    : item.status === 'confirmed'
                    ? colors.success
                    : colors.textSecondary,
              },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status === 'pending'
                ? 'Ожидание'
                : item.status === 'confirmed'
                ? 'Подтверждено'
                : 'Отменено'}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="calendar-today" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {item.checkIn} — {item.checkOut}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="group" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.guests} гостей • {item.nights} ночей</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={16} color={colors.primary} />
            <Text style={[styles.detailText, { fontWeight: '700', color: colors.primary }]}>
              {item.total.toLocaleString('ru-RU')}₽
            </Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(item.id)}
          >
            <MaterialIcons name="delete" size={16} color={colors.accent} />
            <Text style={styles.cancelButtonText}>Отменить</Text>
          </TouchableOpacity>
        )}
      </View>
    </FadeInCard>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <ScaleInCard delay={100} style={{ marginBottom: spacing.lg }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Бронирование</Text>
              <Text style={styles.subtitle}>Выберите объект и забронируйте свой отпуск</Text>
            </View>
          </View>
        </ScaleInCard>

        {/* Доступные объекты */}
        <Text style={styles.sectionTitle}>Доступные номера</Text>
        <FlatList
          data={mockProperties}
          renderItem={renderProperty}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: spacing.md, marginBottom: spacing.lg }}
        />

        {/* Мои бронирования */}
        {bookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Мои бронирования</Text>
            <FlatList
              data={bookings}
              renderItem={renderBooking}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ gap: spacing.md }}
            />
          </>
        )}

        {bookings.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="calendar-blank" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Нет активных бронирований</Text>
            <Text style={styles.emptyStateSubtext}>
              Выберите номер выше, чтобы создать первое бронирование
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Модаль бронирования */}
      {selectedProperty && (
        <Modal visible={bookingModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Забронировать {selectedProperty.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setBookingModalVisible(false);
                    setSelectedProperty(null);
                  }}
                >
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Информация объекта */}
                <View style={styles.propertyInfoCard}>
                  <Text style={styles.infoTitle}>{selectedProperty.name}</Text>
                  <Text style={styles.infoDesc}>{selectedProperty.description}</Text>
                  <View style={styles.infoRow}>
                    <MaterialIcons name="door-front" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>
                      {selectedProperty.rooms} комнаты • до {selectedProperty.guests} гостей
                    </Text>
                  </View>
                </View>

                {/* Форма бронирования */}
                <Text style={styles.inputLabel}>Дата заезда *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ДД.MM.ГГГГ"
                  placeholderTextColor={colors.textSecondary}
                  value={bookingData.checkIn}
                  onChangeText={(text) =>
                    setBookingData({ ...bookingData, checkIn: text })
                  }
                />

                <Text style={styles.inputLabel}>Дата выезда *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ДД.MM.ГГГГ"
                  placeholderTextColor={colors.textSecondary}
                  value={bookingData.checkOut}
                  onChangeText={(text) =>
                    setBookingData({ ...bookingData, checkOut: text })
                  }
                />

                <Text style={styles.inputLabel}>Количество гостей *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите количество"
                  placeholderTextColor={colors.textSecondary}
                  value={bookingData.guests}
                  onChangeText={(text) =>
                    setBookingData({ ...bookingData, guests: text })
                  }
                  keyboardType="number-pad"
                />

                <Text style={styles.inputLabel}>Дополнительные пожелания</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80 }]}
                  placeholder="Например: детская кровать, вид на природу..."
                  placeholderTextColor={colors.textSecondary}
                  value={bookingData.notes}
                  onChangeText={(text) =>
                    setBookingData({ ...bookingData, notes: text })
                  }
                  multiline
                />

                {/* Расчет стоимости */}
                {calculateNights() > 0 && (
                  <View style={styles.priceCalculation}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Ночей:</Text>
                      <Text style={styles.priceValue}>{calculateNights()}</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>За ночь:</Text>
                      <Text style={styles.priceValue}>
                        {selectedProperty.priceNumber.toLocaleString('ru-RU')}₽
                      </Text>
                    </View>
                    <View
                      style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}
                    >
                      <Text style={[styles.priceLabel, { fontWeight: '700' }]}>
                        К оплате:
                      </Text>
                      <Text style={[styles.priceValue, { color: colors.primary, fontWeight: '700' }]}>
                        {calculateTotal().toLocaleString('ru-RU')}₽
                      </Text>
                    </View>
                  </View>
                )}

                {/* Кнопка подтверждения */}
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmBooking}
                >
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Подтвердить бронирование</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  propertyCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  propertyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  propertyDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  propertyFeatures: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  amenityBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  amenityText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  selectButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingProperty: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bookingDetails: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 12,
    color: colors.text,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    flex: 1,
    padding: spacing.md,
  },
  propertyInfoCard: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  priceCalculation: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
