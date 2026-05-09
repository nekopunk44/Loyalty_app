import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Image,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { FadeInCard } from '../../components/ui/AnimatedCard';
import HorizontalScrollView from '../../components/ui/HorizontalScrollView';
import { BookingCalendar } from '../../components/booking/BookingCalendar';
import { apiPost, apiGet, apiCall, API_ENDPOINTS } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const CORAL = '#FF6B35';
const EMERALD  = '#065F46';
const EMERALD2 = '#047857';

const mockProperties = [
  {
    id: '2',
    name: 'Стандрат',
    description: 'Студия с терассой и бассейном',
    price: '150PRB/ночь',
    priceNumber: 150,
    rooms: 2,
    guests: 10,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Бассейн', 'Сауна (с доплатой)', 'Мангал', 'Парковочное место'],
    image: 'https://picsum.photos/300/200?random=2',
    photos: [
      require('../../assets/standart/st1.png'),
      require('../../assets/standart/st2.png'),
      require('../../assets/standart/st3.png'),
      require('../../assets/standart/st4.png'),
      require('../../assets/standart/st5.png'),
      require('../../assets/standart/st6.png'),
      require('../../assets/standart/st7.png'),
      require('../../assets/standart/st8.png'),
      require('../../assets/standart/st1.png'),
    ],
  },
  {
    id: '1',
    name: 'Люкс апартамент',
    description: 'Полный комфорт, с видом на природу',
    price: '200PRB/ночь',
    priceNumber: 200,
    rooms: 10,
    guests: 20,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня', 'Бассейн', 'Сауна (с доплатой)', 'Мангал', 'Парковочное место', 'Караоке', 'Большой зал'],
    image: 'https://picsum.photos/300/200?random=1',
    photos: [
      require('../../assets/luks/st1.png'),
      require('../../assets/luks/st2.png'),
      require('../../assets/luks/st3.png'),
      require('../../assets/luks/st4.png'),
      require('../../assets/luks/st5.png'),
      require('../../assets/luks/st6.png'),
      require('../../assets/luks/st7.png'),
      require('../../assets/luks/st8.png'),
      require('../../assets/luks/st9.png'),
      require('../../assets/luks/st10.png'),
      require('../../assets/luks/st1.png'),
    ],
  },
  {
    id: '3',
    name: 'Задний двор',
    description: 'Открытая местность с бассейном и беседкой',
    price: '100PRB/день',
    priceNumber: 100,
    rooms: null,
    guests: 15,
    amenities: ['WiFi', 'Бассейн', 'Мангал', 'Парковочное место', 'Караоке', 'Холодильник', 'Беседка', 'Шезлонги', 'Зонты'],
    image: 'https://picsum.photos/300/200?random=3',
    photos: [
      require('../../assets/zad/zd1.png'),
      require('../../assets/zad/zd2.png'),
      require('../../assets/zad/zd3.png'),
      require('../../assets/zad/zd4.png'),
      require('../../assets/zad/zd5.png'),
      require('../../assets/zad/zd1.png'),
      require('../../assets/zad/zd2.png'),
      require('../../assets/zad/zd3.png'),
    ],
  },
  {
    id: '4',
    name: 'Вся территория',
    description: 'Полный комплекс со всеми удобствами',
    price: '500PRB/ночь',
    priceNumber: 500,
    rooms: 10,
    guests: 30,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня', 'Бассейн', 'Сауна (с доплатой)', 'Мангал', 'Парковочное место', 'Караоке', 'Большой зал', 'Беседка', 'Шезлонги', 'Зонты', 'Холодильник'],
    image: 'https://picsum.photos/300/200?random=4',
    photos: [
      require('../../assets/luks/st1.png'),
      require('../../assets/luks/st2.png'),
      require('../../assets/luks/st3.png'),
      require('../../assets/luks/st4.png'),
      require('../../assets/luks/st5.png'),
      require('../../assets/luks/st6.png'),
      require('../../assets/luks/st7.png'),
      require('../../assets/luks/st8.png'),
      require('../../assets/luks/st9.png'),
      require('../../assets/luks/st10.png'),
      require('../../assets/zad/zd1.png'),
      require('../../assets/zad/zd2.png'),
      require('../../assets/zad/zd3.png'),
      require('../../assets/zad/zd4.png'),
      require('../../assets/zad/zd5.png'),
    ],
  },
];

// Вспомогательная функция для получения названия свойства по ID
const getPropertyName = (propertyId) => {
  const property = mockProperties.find(p => p.id === propertyId?.toString());
  return property?.name || `Номер ${propertyId}`;
};

// Связанные свойства - синхронизированные календари
const relatedProperties = {
  '1': ['1', '2', '4'],  // Люкс связан со Стандартом и Всей территорией
  '2': ['1', '2', '4'],  // Стандарт связан с Люксом и Всей территорией
  '3': ['3', '4'],       // Задний двор связан с Всей территорией
  '4': ['1', '2', '3', '4'],  // Вся территория синхронизирована со всеми
};

// Функция для получения связанных свойств (для синхронизации календарей)
const getRelatedProperties = (propertyId) => {
  const id = propertyId?.toString();
  return relatedProperties[id] || [id];
};

export default function BookingScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = theme.colors;
  const { bookings: contextBookings, refreshBookings } = useBookings();
  const useNative = Platform.OS !== 'web';

  // Entrance animations
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const diamond1Rot = useRef(new Animated.Value(0)).current;
  const diamond2Rot = useRef(new Animated.Value(0)).current;
  const diamond1Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroAnim,    { toValue: 1, duration: 500, useNativeDriver: useNative }),
      Animated.timing(contentAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: useNative }),
    ]).start();
    // Slow rotation for decorative diamonds
    Animated.loop(
      Animated.timing(diamond1Rot, { toValue: 1, duration: 12000, useNativeDriver: useNative })
    ).start();
    Animated.loop(
      Animated.timing(diamond2Rot, { toValue: -1, duration: 9000, useNativeDriver: useNative })
    ).start();
    Animated.loop(Animated.sequence([
      Animated.timing(diamond1Scale, { toValue: 1.15, duration: 2200, useNativeDriver: useNative }),
      Animated.timing(diamond1Scale, { toValue: 1,    duration: 2200, useNativeDriver: useNative }),
    ])).start();
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: spacing.xl },
    // Hero
    hero: { backgroundColor: EMERALD, paddingTop: 22, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 0 },
    heroStats: { flexDirection: 'row', marginTop: 18, gap: 12 },
    heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    heroStatVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
    heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: '600' },
    hDiamond1: { position: 'absolute', width: 140, height: 140, backgroundColor: `${AMBER}20`, top: -40, right: -30 },
    hDiamond2: { position: 'absolute', width: 100, height: 100, backgroundColor: 'rgba(52,211,153,0.15)', bottom: -30, left: -20 },
    hDiamond3: { position: 'absolute', width: 60,  height: 60,  backgroundColor: 'rgba(255,255,255,0.07)', top: 20, right: 80 },
    hArc: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: `${TEAL}28`, top: -100, left: -60 },
    // Filters
    filterRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 18, marginBottom: 6, gap: 8 },
    filterPill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBg },
    filterPillActive: { borderColor: CORAL, backgroundColor: `${CORAL}12` },
    filterPillText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    filterPillTextActive: { color: CORAL },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
    // Property cards
    propertyCard: { backgroundColor: colors.cardBg, borderRadius: 16, marginHorizontal: 16, marginBottom: 14, elevation: 3, shadowColor: NAVY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, overflow: 'hidden' },
    propAccent: { height: 4, backgroundColor: CORAL },
    propBody: { padding: 14 },
    photoGalleryContainer: { position: 'relative', height: 200, marginBottom: spacing.md, borderRadius: borderRadius.lg, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' },
    photoGalleryContent: { paddingHorizontal: spacing.sm, gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
    galleryPhoto: { width: 380, height: 180, borderRadius: borderRadius.md, backgroundColor: colors.border },
    photoCountBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    photoCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    propertyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    propertyName: { fontSize: 16, fontWeight: '800', color: colors.text },
    propertyDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
    propertyPrice: { fontSize: 14, fontWeight: '800', color: CORAL, backgroundColor: `${CORAL}12`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    propertyFeatures: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${TEAL}12`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    featureText: { fontSize: 11, color: TEAL, fontWeight: '700' },
    amenitiesContainer: { height: 40, marginBottom: spacing.md, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' },
    amenitiesContent: { paddingHorizontal: spacing.sm, gap: spacing.sm, alignItems: 'center', justifyContent: 'flex-start' },
    amenityBadge: { backgroundColor: `${NAVY}10`, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.md, borderWidth: 1, borderColor: `${NAVY}18` },
    amenityText: { fontSize: 11, color: NAVY, fontWeight: '600' },
    selectButton: { backgroundColor: CORAL, paddingVertical: 13, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, shadowColor: CORAL, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    selectButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    bookingCard: { backgroundColor: colors.cardBg, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
    bookingAccent: { height: 3 },
    bookingBody: { padding: 14 },
    bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    bookingProperty: { fontSize: 15, fontWeight: '800', color: colors.text },
    bookingDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    bookingDetails: { backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    detailText: { fontSize: 12, color: colors.text },
    cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 10, backgroundColor: '#EF444410' },
    cancelButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
    activeBookingsSection: { marginTop: spacing.xl, marginBottom: spacing.lg },
    activeBookingsTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginHorizontal: spacing.md, marginBottom: spacing.md },
    activeBookingCard: { backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: CORAL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: NAVY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    activeBookingLeft: { flex: 1 },
    activeBookingProperty: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    activeBookingDates: { fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs },
    activeBookingPrice: { fontSize: 12, fontWeight: '700', color: CORAL },
    activeBookingStatus: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.md, marginLeft: spacing.md },
    activeBookingStatusText: { fontSize: 11, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyStateText: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6, textAlign: 'center' },
    emptyStateSubtext: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
    modalContainer: { flex: 1, backgroundColor: colors.background },
    modalContent: { flex: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    modalBody: { flex: 1, padding: spacing.md },
    propertyInfoCard: { backgroundColor: colors.cardBg, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg },
    infoTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    infoDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    infoText: { fontSize: 12, color: colors.text },
    inputLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
    input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 13, color: colors.text, marginBottom: spacing.lg },
    priceCalculation: { backgroundColor: colors.primary + '10', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.lg },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    priceLabel: { fontSize: 12, color: colors.textSecondary },
    priceValue: { fontSize: 12, fontWeight: '600', color: colors.text },
    confirmButton: { backgroundColor: colors.success, paddingVertical: spacing.md, borderRadius: borderRadius.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    dateButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, justifyContent: 'flex-start', gap: spacing.md },
    dateButtonDisabled: { opacity: 0.5 },
    dateButtonText: { fontSize: 14, color: colors.text },
    serviceCard: {},
    quantityButton: { width: 40, height: 40, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    checkbox: { width: 24, height: 24, borderRadius: borderRadius.sm, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  }), [colors]);

  const [bookings, setBookings] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('available'); // 'available', 'my', 'history'
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 0,
    notes: '',
    // Дополнительные услуги
    saunaHours: 0,
    kitchenware: false,
  });
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);

  // Кэш для занятых дат (чтобы не делать повторные запросы)
  const bookedDatesCache = React.useRef(new Map());
  // Отслеживаем время последнего запроса для rate limiting
  const lastRequestTime = React.useRef(0);
  // Отслеживаем текущий загружаемый propertyId
  const currentLoadingPropertyId = React.useRef(null);

  // Функция для обновления статусов завершенных бронирований
  const updateCompletedBookingStatuses = async (bookingsToCheck) => {
    if (!bookingsToCheck || bookingsToCheck.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let hasUpdates = false;

    for (const booking of bookingsToCheck) {
      // Пропускаем уже завершенные и отмененные
      if (booking.status === 'completed' || booking.status === 'cancelled') continue;

      // Парсим дату выезда (checkOutDate в формате ДД.MM.YYYY)
      const [day, month, year] = booking.checkOutDate.split('.');
      const checkOutDate = new Date(year, month - 1, day);
      checkOutDate.setHours(0, 0, 0, 0);

      // Если дата выезда меньше текущей даты, то бронирование завершено
      if (checkOutDate < today && booking.status === 'confirmed') {
        try {
          const data = await apiCall(`${getApiUrl()}/bookings/${booking.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' }),
          });
          if (!data.error) hasUpdates = true;
        } catch (_) {}
      }
    }

    return hasUpdates;
  };

  // Обновляем бронирования при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      // Обновить список бронирований с сервера
      refreshBookings();
      
      // После загрузки проверяем статусы
      setTimeout(() => {
        updateCompletedBookingStatuses(contextBookings).then((hasUpdates) => {
          if (hasUpdates) setTimeout(() => refreshBookings(), 500);
        });
      }, 500);
    }, [refreshBookings])
  );

  // Форматируем бронирования при изменении contextBookings
  React.useEffect(() => {
    if (contextBookings && contextBookings.length > 0) {
      const formattedBookings = contextBookings.map((booking) => {
        const saunaHours = parseInt(booking.saunaHours) || 0;
        const kitchenware = Boolean(booking.kitchenware) || false;
        
        return {
          id: booking.id,
          property: getPropertyName(booking.propertyId),
          date: `${booking.checkInDate} - ${booking.checkOutDate}`,
          checkIn: booking.checkInDate,
          checkOut: booking.checkOutDate,
          guests: booking.guests,
          nights: Math.ceil((new Date(booking.checkOutDate.split('.').reverse().join('-')) - new Date(booking.checkInDate.split('.').reverse().join('-'))) / (1000 * 60 * 60 * 24)),
          total: booking.totalPrice,
          status: booking.status,
          rating: 0,
          review: '',
          saunaHours,
          kitchenware,
        };
      });
      setBookings(formattedBookings);
    } else {
      setBookings([]);
    }
  }, [contextBookings]);

  const handleSelectProperty = (property) => {
    setSelectedProperty(property);
    
    // Автоматически выбираем кухонный сервиз для Silver и выше
    const membershipLevel = user?.membershipLevel || 'Bronze';
    if (membershipLevel !== 'Bronze') {
      setBookingData(prev => ({
        ...prev,
        kitchenware: true,
      }));
    }
    
    setBookingModalVisible(true);
    // Загрузить занятые даты для этого объекта (но с кэшем)
    loadBookedDates(property.id);
  };

  const closeBookingModal = () => {
    setBookingModalVisible(false);
    setCalendarVisible(false);
    setSelectedProperty(null);
    setBookingData({
      checkIn: '',
      checkOut: '',
      guests: 0,
      notes: '',
      saunaHours: 0,
      kitchenware: false,
    });
  };

  const loadBookedDates = async (propertyId) => {
    if (currentLoadingPropertyId.current === propertyId) return;

    if (bookedDatesCache.current.has(propertyId)) {
      setBookedDates(bookedDatesCache.current.get(propertyId));
      return;
    }

    try {
      currentLoadingPropertyId.current = propertyId;
      const relatedIds = getRelatedProperties(propertyId);
      let allUnavailableDates = [];

      for (let index = 0; index < relatedIds.length; index++) {
        const relatedPropertyId = relatedIds[index];
        if (index > 0) await new Promise(resolve => setTimeout(resolve, 500));

        try {
          const response = await apiGet(API_ENDPOINTS.BOOKINGS.PROPERTY_BOOKED_DATES(relatedPropertyId));
          if (response?.success && response.bookedDates) {
            response.bookedDates.forEach(date => {
              if (!allUnavailableDates.includes(date)) allUnavailableDates.push(date);
            });
          }
        } catch (_) {}
      }

      bookedDatesCache.current.set(propertyId, allUnavailableDates);
      setBookedDates(allUnavailableDates);
    } catch (_) {
      setBookedDates([]);
    } finally {
      currentLoadingPropertyId.current = null;
    }
  };

  const handleDateSelect = (type, dateStr) => {
    setBookingData({ ...bookingData, [type]: dateStr });
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
    const basePrice = selectedProperty.priceNumber * calculateNights();
    
    // Расчет дополнительной платы за превышение лимита гостей
    const maxGuests = selectedProperty.guests || 1;
    const actualGuests = parseInt(bookingData.guests) || 0;
    const extraGuests = Math.max(0, actualGuests - maxGuests);
    const extraGuestsFee = extraGuests * 150; // 150 PRB за дополнительного гостя

    // Расчет стоимости дополнительных услуг со скидками
    let saunaFee = (parseInt(bookingData.saunaHours) || 0) * 250; // 250 PRB за час парилки
    let kitchenwareFee = bookingData.kitchenware ? 100 : 0; // 100 PRB за кухонный сервиз
    
    // Применяем скидки в зависимости от уровня лояльности
    const membershipLevel = user?.membershipLevel || 'Bronze';
    
    // Скидки на парилку
    const saunaDiscounts = {
      'Bronze': 0,      // 0%
      'Silver': 0,      // 0%
      'Gold': 0.20,     // 20%
      'Platinum': 0.40, // 40%
    };
    
    const saunaDiscount = saunaDiscounts[membershipLevel] || 0;
    const saunaHours = parseInt(bookingData.saunaHours) || 0;
    
    if (saunaHours > 0) {
      if (membershipLevel === 'Platinum') {
        // Для Platinum: первый час бесплатный, остальное со скидкой 40%
        const remainingHours = Math.max(0, saunaHours - 1);
        saunaFee = remainingHours * 250 * (1 - saunaDiscount);
      } else {
        // Для остальных: просто применяем скидку
        saunaFee = saunaFee * (1 - saunaDiscount);
      }
    }
    
    // Кухонный сервиз бесплатный для Silver и выше
    if ((membershipLevel === 'Silver' || membershipLevel === 'Gold' || membershipLevel === 'Platinum') && bookingData.kitchenware) {
      kitchenwareFee = 0; // Бесплатно для Silver, Gold, Platinum
    }
    
    return basePrice + extraGuestsFee + saunaFee + kitchenwareFee;
  };

  const getExtraGuestsFee = () => {
    if (!selectedProperty) return 0;
    const maxGuests = selectedProperty.guests || 1;
    const actualGuests = parseInt(bookingData.guests) || 0;
    const extraGuests = Math.max(0, actualGuests - maxGuests);
    return extraGuests * 150;
  };

  const getSaunaFee = () => {
    const membershipLevel = user?.membershipLevel || 'Bronze';
    const saunaHours = parseInt(bookingData.saunaHours) || 0;
    
    if (saunaHours === 0) return 0;
    
    // Скидки на парилку
    const saunaDiscounts = {
      'Bronze': 0,      // 0%
      'Silver': 0,      // 0%
      'Gold': 0.20,     // 20%
      'Platinum': 0.40, // 40%
    };
    
    const saunaDiscount = saunaDiscounts[membershipLevel] || 0;
    
    if (membershipLevel === 'Platinum') {
      // Для Platinum: первый час бесплатный, остальное со скидкой 40%
      const remainingHours = Math.max(0, saunaHours - 1);
      return remainingHours * 250 * (1 - saunaDiscount);
    } else {
      // Для остальных: просто применяем скидку
      return saunaHours * 250 * (1 - saunaDiscount);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingData.checkIn || !bookingData.checkOut || !bookingData.guests) {
      Alert.alert('Ошибка', 'Заполните все обязательные поля');
      return;
    }

    const nights = calculateNights();
    if (nights <= 0) {
      Alert.alert('Ошибка', 'Дата выезда должна быть позже даты заезда');
      return;
    }

    setBookingLoading(true);

    try {
      const total = calculateTotal();

      // Отправляем бронирование на сервер
      const response = await apiPost(API_ENDPOINTS.BOOKINGS.CREATE, {
        propertyId: selectedProperty.id,
        userId: user?.id,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        guests: bookingData.guests,
        notes: bookingData.notes,
        totalPrice: total,
      });

      if (response.success) {
        Alert.alert('Успешно', 'Бронирование создано!');
        
        // Очищаем форму
        setBookingData({
          checkIn: '',
          checkOut: '',
          guests: 0,
          notes: '',
          saunaHours: 0,
          kitchenware: false,
        });

        // Закрываем модаль
        setBookingModalVisible(false);
        setSelectedProperty(null);

        // Обновляем список занятых дат
        if (selectedProperty) {
          loadBookedDates(selectedProperty.id);
        }

        // Переход на экран оплаты
        navigation.navigate('Checkout', {
          serviceType: selectedProperty.name,
          guests: parseInt(bookingData.guests) || 1,
          amount: total,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          nights: nights,
          notes: bookingData.notes,
          bookingId: response.bookingId,
          propertyId: selectedProperty.id,
          userId: user?.id,
          // Дополнительные услуги
          saunaHours: bookingData.saunaHours,
          kitchenware: bookingData.kitchenware,
        });
      } else {
        // Бронирование не успешно - перезагружаем занятые даты
        Alert.alert('Ошибка', response.message || 'Не удалось создать бронирование');
        if (selectedProperty) {
          loadBookedDates(selectedProperty.id);
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось создать бронирование. Попробуйте еще раз.'
      );
      // Перезагружаем занятые даты при ошибке
      if (selectedProperty) {
        loadBookedDates(selectedProperty.id);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = (bookingId) => {
    const booking = bookings.find(b => String(b.id) === String(bookingId));
    if (!booking) {
      Alert.alert('Ошибка', 'Бронирование не найдено');
      return;
    }
    
    setCancelBookingId(bookingId);
    setCancelConfirmVisible(true);
  };

  const handleConfirmCancel = async () => {
    try {
      const responseData = await apiCall(`${getApiUrl()}/bookings/${cancelBookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (responseData.error) {
        setCancelConfirmVisible(false);
        Alert.alert('Ошибка', responseData.error || 'Не удалось отменить бронирование');
        return;
      }

      setCancelConfirmVisible(false);
      await refreshBookings();

      if (user?.id) {
        try { await LoyaltyCardService.getCard(user.id); } catch (_) {}
      }
      
      const refund = responseData.refund || { refundAmount: 0, cashbackDeducted: 0 };
      Alert.alert(
        'Бронирование отменено',
        `Возвращено: ${refund.refundAmount}PRB\n(Вычтен кэшбек: ${refund.cashbackDeducted}PRB)\nДней до заезда: ${refund.daysUntilCheckIn}`
      );
    } catch (error) {
      console.error('Ошибка отмены бронирования:', error);
      setCancelConfirmVisible(false);
      Alert.alert('Ошибка', 'Не удалось отменить бронирование. Попробуйте позже.');
    }
  };

  const renderProperty = ({ item, index }) => {
    return (
      <FadeInCard delay={150 + index * 80}>
        <View style={styles.propertyCard}>
          <View style={styles.propAccent} />
          <View style={styles.propBody}>
          <View style={styles.propertyHeader}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.propertyName}>{item.name}</Text>
              <Text style={styles.propertyDescription}>{item.description}</Text>
            </View>
            <Text style={styles.propertyPrice} numberOfLines={1}>{item.price}</Text>
          </View>

          <View style={styles.propertyFeatures}>
            {item.rooms && (
              <View style={styles.featureItem}>
                <MaterialIcons name="meeting-room" size={14} color={TEAL} />
                <Text style={styles.featureText}>{item.rooms} комн.</Text>
              </View>
            )}
            <View style={styles.featureItem}>
              <MaterialIcons name="people" size={14} color={TEAL} />
              <Text style={styles.featureText}>до {item.guests} гостей</Text>
            </View>
          </View>

          <View style={styles.amenitiesContainer}>
            <HorizontalScrollView
              contentContainerStyle={styles.amenitiesContent}
              showNavButtons={Platform.OS === 'web'}
              navButtonColor={theme.colors.primary}
              navButtonSize={16}
            >
              {item.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityBadge}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </HorizontalScrollView>
          </View>

          {/* Галерея фотографий перед кнопкой */}
          {item.photos && item.photos.length > 0 && (
            <View style={styles.photoGalleryContainer}>
              <HorizontalScrollView
                contentContainerStyle={styles.photoGalleryContent}
                showNavButtons={Platform.OS === 'web'}
                navButtonColor={theme.colors.primary}
                navButtonSize={20}
                forceShowButtons={true}
                itemWidth={380}
                itemGap={spacing.sm}
              >
                {item.photos.map((photo, photoIndex) => {
                  const source = typeof photo === 'string' ? { uri: photo } : photo;
                  return (
                    <Image
                      key={photoIndex}
                      source={source}
                      style={styles.galleryPhoto}
                    />
                  );
                })}
              </HorizontalScrollView>
              <View style={styles.photoCountBadge}>
                <MaterialIcons name="image" size={14} color="#fff" />
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectProperty(item)}>
            <MaterialIcons name="date-range" size={18} color="#fff" />
            <Text style={styles.selectButtonText}>Выбрать даты</Text>
          </TouchableOpacity>
          </View>
        </View>
      </FadeInCard>
    );
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'pending':   return { text: 'Ожидает оплаты', color: '#FEF3C7', textColor: '#B45309' };
      case 'confirmed':
      case 'paid':      return { text: 'Активный',       color: '#D1FAE5', textColor: '#065F46' };
      case 'completed': return { text: 'Завершено',       color: '#E5E7EB', textColor: '#374151' };
      case 'cancelled': return { text: 'Отменено',        color: '#FEE2E2', textColor: '#B91C1C' };
      default:          return { text: 'Неизвестно',      color: '#F3F4F6', textColor: '#6B7280' };
    }
  };

  const renderActiveBooking = ({ item, index }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <FadeInCard delay={50 + index * 30}>
        <View style={styles.activeBookingCard}>
          <View style={styles.activeBookingLeft}>
            <Text style={styles.activeBookingProperty} numberOfLines={1}>
              {item.property}
            </Text>
            <Text style={styles.activeBookingDates}>
              {item.checkIn} — {item.checkOut}
            </Text>
            <Text style={styles.activeBookingPrice}>
              {item.total.toLocaleString('ru-RU')} PRB
            </Text>
          </View>
          <View style={[styles.activeBookingStatus, { backgroundColor: statusInfo.color }]}>
            <Text style={[styles.activeBookingStatusText, { color: statusInfo.textColor }]}>
              {statusInfo.text}
            </Text>
          </View>
        </View>
      </FadeInCard>
    );
  };

  const renderBooking = ({ item, index }) => {
    const statusInfo = getStatusInfo(item.status);

    return (
      <FadeInCard delay={100 + index * 50}>
        <View style={styles.bookingCard}>
          <View style={[styles.bookingAccent, { backgroundColor: statusInfo.textColor }]} />
          <View style={styles.bookingBody}>
          <View style={styles.bookingHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.bookingProperty}>{item.property}</Text>
              <Text style={styles.bookingDate}>{item.date}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                {statusInfo.text}
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
              <MaterialIcons name="people" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{item.guests} гостей • {item.nights} ночей</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="payments" size={16} color={colors.primary} />
              <Text style={[styles.detailText, { fontWeight: '700', color: colors.primary }]}>
                {item.total.toLocaleString('ru-RU')}PRB
              </Text>
            </View>

            {item.saunaHours > 0 && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="spa" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>Парилка: {item.saunaHours} ч.</Text>
              </View>
            )}

            {item.kitchenware && (
              <View style={styles.detailRow}>
                <MaterialIcons name="kitchen" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>Кухонный сервиз</Text>
              </View>
            )}
          </View>

          {(item.status === 'pending' || item.status === 'confirmed') && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                handleCancelBooking(item.id);
              }}
              activeOpacity={0.7}
              pointerEvents="auto"
            >
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Отменить бронирование</Text>
            </TouchableOpacity>
          )}
          </View>
        </View>
      </FadeInCard>
    );
  };

  const activeCount = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'paid').length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>


        {/* ── Filters ── */}
        <Animated.View style={[styles.filterRow, { opacity: contentAnim }]}>
          {[
            { key: 'available', label: 'Доступно' },
            { key: 'my',        label: 'Активные' },
            { key: 'history',   label: 'История' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterPillText, activeFilter === f.key && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ========== AVAILABLE PROPERTIES ========== */}
        {activeFilter === 'available' && (
          <Animated.View style={{ opacity: contentAnim }}>
            <Text style={styles.sectionTitle}>Доступные объекты</Text>
            <FlatList
              data={mockProperties}
              renderItem={renderProperty}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            />
          </Animated.View>
        )}

        {/* ========== MY BOOKINGS ========== */}
        {activeFilter === 'my' && (
          <Animated.View style={{ opacity: contentAnim }}>
            {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'paid').length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Активные бронирования</Text>
                <FlatList
                  data={bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'paid')}
                  renderItem={renderBooking}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: spacing.md, paddingHorizontal: 16, paddingBottom: spacing.lg }}
                />
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: `${NAVY}10` }]}>
                  <MaterialIcons name="calendar-today" size={32} color={NAVY} />
                </View>
                <Text style={styles.emptyStateText}>Нет активных бронирований</Text>
                <Text style={styles.emptyStateSubtext}>Перейдите во вкладку «Доступно», чтобы создать бронирование</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ========== BOOKING HISTORY ========== */}
        {activeFilter === 'history' && (
          <Animated.View style={{ opacity: contentAnim }}>
            {bookings.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>История бронирований</Text>
                <FlatList
                  data={bookings}
                  renderItem={renderBooking}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: spacing.md, paddingHorizontal: 16, paddingBottom: spacing.lg }}
                />
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: `${NAVY}10` }]}>
                  <MaterialIcons name="history" size={32} color={NAVY} />
                </View>
                <Text style={styles.emptyStateText}>История пуста</Text>
                <Text style={styles.emptyStateSubtext}>Здесь будут отображаться завершённые бронирования</Text>
              </View>
            )}
          </Animated.View>
        )}

      </ScrollView>

      {/* Модаль бронирования */}
      {selectedProperty && (
        <>
        <Modal visible={bookingModalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Забронировать {selectedProperty.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    closeBookingModal();
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
                    {selectedProperty.rooms && (
                      <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
                    )}
                    <Text style={styles.infoText}>
                      {selectedProperty.rooms ? `${selectedProperty.rooms} комнаты • ` : ''}до {selectedProperty.guests} гостей
                    </Text>
                  </View>
                </View>

                {/* Форма бронирования */}
                <Text style={styles.inputLabel}>Дата заезда</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateButton]}
                  onPress={() => {
                    setCalendarVisible(true);
                  }}
                >
                  <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
                  <Text
                    style={[
                      styles.dateButtonText,
                      !bookingData.checkIn && { color: colors.textSecondary },
                    ]}
                  >
                    {bookingData.checkIn || 'ДД.MM.ГГГГ'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Дата выезда</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.dateButton,
                    !bookingData.checkIn && styles.dateButtonDisabled,
                  ]}
                  onPress={() => bookingData.checkIn && setCalendarVisible(true)}
                  disabled={!bookingData.checkIn}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={bookingData.checkIn ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.dateButtonText,
                      !bookingData.checkOut && { color: colors.textSecondary },
                    ]}
                  >
                    {bookingData.checkOut || 'ДД.MM.ГГГГ'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Количество гостей</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Введите количество"
                  placeholderTextColor={colors.textSecondary}
                  value={bookingData.guests?.toString() || ''}
                  onChangeText={(text) => {
                    const numGuests = parseInt(text) || 0;
                    setBookingData({ ...bookingData, guests: numGuests });
                  }}
                  keyboardType="number-pad"
                />

                {/* ========== ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ ========== */}
                <Text style={[styles.inputLabel, { marginTop: spacing.sm, marginBottom: spacing.md, fontSize: 15, textAlign: 'center' }]}>
                  Дополнительные услуги
                </Text>

                {/* Парилка - Checkbox */}
                <View style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
                  <TouchableOpacity
                    onPress={() => setBookingData({ ...bookingData, saunaHours: bookingData.saunaHours > 0 ? 0 : 1 })}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <View>
                      <Text style={[styles.priceLabel, { fontWeight: '600', fontSize: 14, color: colors.text }]}>
                        Парилка
                      </Text>
                      <Text style={[styles.priceLabel, { fontSize: 12, marginTop: spacing.xs }]}>
                        {(() => {
                          const membershipLevel = user?.membershipLevel || 'Bronze';
                          const basePrice = 250;
                          const discounts = { 'Bronze': 0, 'Silver': 0, 'Gold': 0.20, 'Platinum': 0.40 };
                          const discount = discounts[membershipLevel] || 0;
                          const discountedPrice = Math.round(basePrice * (1 - discount));
                          
                          if (discount > 0) {
                            return `${discountedPrice} PRB за 1 час (скидка ${Math.round(discount * 100)}%)`;
                          }
                          return '250 PRB за 1 час';
                        })()}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: parseInt(bookingData.saunaHours) > 0 ? colors.primary : colors.border, backgroundColor: parseInt(bookingData.saunaHours) > 0 ? colors.primary : 'transparent' }]}>
                      {parseInt(bookingData.saunaHours) > 0 && (
                        <MaterialIcons name="check" size={18} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Выбор часов парилки - показывается только если выбрана */}
                  {parseInt(bookingData.saunaHours) > 0 && (
                    <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}>
                      <Text style={[styles.priceLabel, { fontSize: 12, marginBottom: spacing.md, fontWeight: '600' }]}>
                        Выберите количество часов:
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                        <TouchableOpacity
                          onPress={() => {
                            const current = parseInt(bookingData.saunaHours) || 0;
                            if (current > 1) {
                              setBookingData({ ...bookingData, saunaHours: current - 1 });
                            }
                          }}
                          style={[styles.quantityButton, { backgroundColor: colors.primary + '20' }]}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>−</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 50, textAlign: 'center' }}>
                          {parseInt(bookingData.saunaHours) || 0} ч.
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            const current = parseInt(bookingData.saunaHours) || 0;
                            setBookingData({ ...bookingData, saunaHours: current + 1 });
                          }}
                          style={[styles.quantityButton, { backgroundColor: colors.primary }]}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Кухонный сервиз */}
                <View style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg }]}>
                  <TouchableOpacity
                    onPress={() => {
                      const membershipLevel = user?.membershipLevel || 'Bronze';
                      // Кухонный сервиз бесплатный для Silver+, поэтому не позволяем его отключать
                      if (membershipLevel !== 'Bronze') {
                        return; // Не позволяем отключить для Silver+
                      }
                      setBookingData({ ...bookingData, kitchenware: !bookingData.kitchenware });
                    }}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <View>
                      <Text style={[styles.priceLabel, { fontWeight: '600', fontSize: 14, color: colors.text }]}>
                        Использование кухонного сервиза
                      </Text>
                      <Text style={[styles.priceLabel, { fontSize: 12, marginTop: spacing.xs }]}>
                        {(() => {
                          const membershipLevel = user?.membershipLevel || 'Bronze';
                          if (membershipLevel !== 'Bronze') {
                            return 'Включено в стоимость';
                          }
                          return '100 PRB';
                        })()}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: bookingData.kitchenware ? colors.primary : colors.border, backgroundColor: bookingData.kitchenware ? colors.primary : 'transparent' }]}>
                      {bookingData.kitchenware && (
                        <MaterialIcons name="check" size={18} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

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
                        {selectedProperty.priceNumber.toLocaleString('ru-RU')}PRB
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Базовая стоимость:</Text>
                      <Text style={styles.priceValue}>
                        {(selectedProperty.priceNumber * calculateNights()).toLocaleString('ru-RU')}PRB
                      </Text>
                    </View>

                    {getExtraGuestsFee() > 0 && (
                      <View style={[styles.priceRow, { backgroundColor: '#FFF3E0', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
                        <View>
                          <Text style={[styles.priceLabel, { fontWeight: '600', color: '#E65100' }]}>
                            Доп. плата за гостей:
                          </Text>
                          <Text style={[styles.priceLabel, { fontSize: 11, marginTop: spacing.xs }]}>
                            {parseInt(bookingData.guests) - selectedProperty.guests} × 150PRB
                          </Text>
                        </View>
                        <Text style={[styles.priceValue, { color: '#E65100', fontWeight: '700' }]}>
                          +{getExtraGuestsFee().toLocaleString('ru-RU')}PRB
                        </Text>
                      </View>
                    )}

                    {getSaunaFee() > 0 && (
                      <View style={[styles.priceRow, { backgroundColor: '#F3E5F5', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
                        <View>
                          <Text style={[styles.priceLabel, { fontWeight: '600', color: '#6A1B9A' }]}>
                            Парилка:
                          </Text>
                          <Text style={[styles.priceLabel, { fontSize: 11, marginTop: spacing.xs }]}>
                            {(() => {
                              const membershipLevel = user?.membershipLevel || 'Bronze';
                              const basePrice = 250;
                              const discounts = { 'Bronze': 0, 'Silver': 0, 'Gold': 0.20, 'Platinum': 0.40 };
                              const discount = discounts[membershipLevel] || 0;
                              
                              if (membershipLevel === 'Platinum') {
                                const remainingHours = Math.max(0, parseInt(bookingData.saunaHours) - 1);
                                return `${remainingHours} × ${Math.round(basePrice * (1 - discount))}PRB (1 час бесплатно)`;
                              } else if (discount > 0) {
                                return `${parseInt(bookingData.saunaHours)} × ${Math.round(basePrice * (1 - discount))}PRB (скидка ${Math.round(discount * 100)}%)`;
                              }
                              return `${parseInt(bookingData.saunaHours)} × 250PRB`;
                            })()}
                          </Text>
                        </View>
                        <Text style={[styles.priceValue, { color: '#6A1B9A', fontWeight: '700' }]}>
                          +{getSaunaFee().toLocaleString('ru-RU')}PRB
                        </Text>
                      </View>
                    )}

                    {bookingData.kitchenware && (
                      <View style={[styles.priceRow, { backgroundColor: '#E3F2FD', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
                        <Text style={[styles.priceLabel, { fontWeight: '600', color: '#0D47A1' }]}>
                          Кухонный сервиз
                        </Text>
                        <Text style={[styles.priceValue, { color: '#0D47A1', fontWeight: '700' }]}>
                          {(() => {
                            const membershipLevel = user?.membershipLevel || 'Bronze';
                            if (membershipLevel !== 'Bronze') {
                              return 'Включено';
                            }
                            return '+100PRB';
                          })()}
                        </Text>
                      </View>
                    )}

                    <View
                      style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}
                    >
                      <Text style={[styles.priceLabel, { fontWeight: '700' }]}>
                        К оплате:
                      </Text>
                      <Text style={[styles.priceValue, { color: colors.primary, fontWeight: '700' }]}>
                        {calculateTotal().toLocaleString('ru-RU')}PRB
                      </Text>
                    </View>
                  </View>
                )}

                {/* Кнопка подтверждения */}
                <TouchableOpacity
                  style={[styles.confirmButton, bookingLoading && { opacity: 0.6 }]}
                  onPress={handleConfirmBooking}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.confirmButtonText}>Подтвердить бронирование</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Модальное окно календаря */}
        <BookingCalendar
          propertyId={selectedProperty.id}
          selectedCheckIn={bookingData.checkIn}
          selectedCheckOut={bookingData.checkOut}
          onDateSelect={handleDateSelect}
          bookedDates={bookedDates}
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
        />
        </>
      )}

      {/* ДИАЛОГ ПОДТВЕРЖДЕНИЯ ОТМЕНЫ */}
      <Modal visible={cancelConfirmVisible} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' }}>
          <View style={{ 
            backgroundColor: colors.cardBg, 
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: spacing.lg, 
            width: '100%',
            maxHeight: '85%',
            paddingTop: spacing.xl
          }}>
            {/* Индикатор свайпа вверх */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            </View>
            
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
              Отменить бронирование?
            </Text>
            
            {cancelBookingId && bookings.find(b => String(b.id) === String(cancelBookingId)) && (() => {
              const currentBooking = bookings.find(b => String(b.id) === String(cancelBookingId));
              const [dayIn, monthIn, yearIn] = currentBooking.checkIn.split('.');
              const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              checkInDate.setHours(0, 0, 0, 0);
              const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
              const canCancel = daysUntilCheckIn >= 2;
              
              return (
                <View style={{ marginBottom: spacing.xl }}>
                  {/* Карточка информации о бронировании */}
                  <View style={{ 
                    backgroundColor: `${colors.primary}10`,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.primary,
                    padding: spacing.md, 
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg
                  }}>
                    <View style={{ marginBottom: spacing.md }}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Номер
                      </Text>
                      <Text style={{ fontSize: 16, color: colors.text, fontWeight: '700', marginTop: spacing.xs }}>
                        {currentBooking.property}
                      </Text>
                    </View>
                    
                    <View style={{ marginBottom: spacing.md }}>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Дата проживания
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', marginTop: spacing.xs }}>
                        {currentBooking.date}
                      </Text>
                    </View>
                    
                    <View>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Сумма платежа
                      </Text>
                      <Text style={{ fontSize: 20, color: colors.primary, fontWeight: '700', marginTop: spacing.xs }}>
                        {currentBooking.total} PRB
                      </Text>
                    </View>
                  </View>
                  
                  {/* Статус отмены */}
                  {canCancel ? (
                    <View style={{ 
                      backgroundColor: '#E8F5E9', 
                      borderLeftWidth: 4,
                      borderLeftColor: '#4CAF50',
                      padding: spacing.md, 
                      borderRadius: borderRadius.md, 
                      marginBottom: spacing.lg
                    }}>
                      <Text style={{ fontSize: 13, color: '#2E7D32', fontWeight: '700', marginBottom: spacing.sm }}>
                        Отмена доступна
                      </Text>
                      <Text style={{ fontSize: 12, color: '#2E7D32', lineHeight: 18 }}>
                        При отмене будет произведен возврат с вычетом кэшбека в соответствии с вашим уровнем лояльности.
                      </Text>
                      <Text style={{ fontSize: 11, color: '#2E7D32', marginTop: spacing.sm, fontWeight: '600' }}>
                        Дней до заезда: {daysUntilCheckIn}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ 
                      backgroundColor: '#FFEBEE', 
                      borderLeftWidth: 4,
                      borderLeftColor: '#D32F2F',
                      padding: spacing.md, 
                      borderRadius: borderRadius.md, 
                      marginBottom: spacing.lg
                    }}>
                      <Text style={{ fontSize: 13, color: '#C62828', fontWeight: '600', marginBottom: spacing.sm }}>
                        Отмена недоступна
                      </Text>
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
              );
            })()}
            
            {/* Кнопки */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: spacing.lg, 
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg, 
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={() => {
                  setCancelConfirmVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Закрыть</Text>
              </TouchableOpacity>
              
              {cancelBookingId && bookings.find(b => String(b.id) === String(cancelBookingId)) && (() => {
                const currentBooking = bookings.find(b => String(b.id) === String(cancelBookingId));
                const [dayIn, monthIn, yearIn] = currentBooking.checkIn.split('.');
                const checkInDate = new Date(yearIn, monthIn - 1, dayIn);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                checkInDate.setHours(0, 0, 0, 0);
                const daysUntilCheckIn = Math.floor((checkInDate - today) / (1000 * 60 * 60 * 24));
                const canCancel = daysUntilCheckIn >= 2;
                
                return (
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
                      elevation: canCancel ? 5 : 0
                    }}
                    onPress={handleConfirmCancel}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                      {canCancel ? 'Отменить\nбронирование' : 'Отмена\nнедоступна'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
