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
  Image,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { SkeletonBookingRow } from '../../components/ui/Skeleton';
import { BookingCalendar } from '../../components/booking/BookingCalendar';
import PropertyCard from '../../components/booking/PropertyCard';
import BookingCard from '../../components/booking/BookingCard';
import CancelConfirmModal from '../../components/booking/CancelConfirmModal';
import { apiPost, apiGet, apiCall, API_ENDPOINTS } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';
import { properties as mockProperties } from '../../constants/properties';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const CORAL = '#FF6B35';
const EMERALD  = '#065F46';
const _EMERALD2 = '#047857';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PROPERTY_CARD_HORIZONTAL_MARGIN = 16;
const GALLERY_PHOTO_WIDTH = Math.min(SCREEN_WIDTH - PROPERTY_CARD_HORIZONTAL_MARGIN * 2, 430);
const GALLERY_PHOTO_HEIGHT = 214;
const BOOKING_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);


// Вспомогательная функция для получения названия свойства по ID
const getPhotoSource = (photo) => (typeof photo === 'string' ? { uri: photo } : photo);

let bookingPhotosPreloadPromise = null;

export const preloadBookingImages = () => {
  if (bookingPhotosPreloadPromise) return bookingPhotosPreloadPromise;

  const uniqueUris = new Set();

  mockProperties.forEach((property) => {
    (property.photos || []).forEach((photo) => {
      const resolved = Image.resolveAssetSource(getPhotoSource(photo));
      if (resolved?.uri) uniqueUris.add(resolved.uri);
    });
  });

  bookingPhotosPreloadPromise = Promise.all(
    Array.from(uniqueUris).map((uri) => Image.prefetch(uri).catch(() => false))
  );

  return bookingPhotosPreloadPromise;
};

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
    preloadBookingImages();
  }, []);

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
    content: { paddingBottom: 132 },
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
    filterRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 18, marginBottom: 18, gap: 8 },
    filterPill: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBg },
    filterPillActive: { borderColor: CORAL, backgroundColor: `${CORAL}12` },
    filterPillText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
    filterPillTextActive: { color: CORAL },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
    // Property cards
    propertyCard: { backgroundColor: colors.cardBg, borderRadius: 20, marginHorizontal: PROPERTY_CARD_HORIZONTAL_MARGIN, marginBottom: 18, elevation: 5, shadowColor: NAVY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    propAccent: { height: 3, backgroundColor: TEAL },
    propBody: { padding: 16 },
    photoGalleryContainer: { position: 'relative', height: GALLERY_PHOTO_HEIGHT, marginBottom: 0, backgroundColor: colors.border, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' },
    photoGalleryContent: { paddingHorizontal: 0, gap: 0, alignItems: 'center', justifyContent: 'center' },
    galleryPhoto: { width: GALLERY_PHOTO_WIDTH, height: GALLERY_PHOTO_HEIGHT, backgroundColor: colors.border },
    propertyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    propertyName: { fontSize: 19, fontWeight: '900', color: colors.text, letterSpacing: 0 },
    propertyDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
    propertyPrice: { fontSize: 15, fontWeight: '900', color: CORAL, backgroundColor: `${CORAL}10`, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, overflow: 'hidden' },
    propertyFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${TEAL}12`, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
    featureText: { fontSize: 11, color: TEAL, fontWeight: '700' },
    amenitiesScroller: { marginBottom: 16, maxHeight: 42 },
    amenitiesGrid: { flexDirection: 'row', gap: 8, paddingRight: 8 },
    amenitiesContainer: { height: 42, marginBottom: 16, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' },
    amenitiesContent: { paddingHorizontal: 0, gap: 8, alignItems: 'center', justifyContent: 'flex-start' },
    amenityBadge: { backgroundColor: colors.background, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    amenityText: { fontSize: 12, color: NAVY, fontWeight: '700' },
    amenityMoreBadge: { backgroundColor: `${TEAL}12`, borderColor: `${TEAL}24` },
    amenityMoreText: { color: TEAL },
    selectButton: { backgroundColor: NAVY, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, shadowColor: NAVY, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 5 },
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
    modalContainer: { flex: 1, backgroundColor: 'rgba(6, 18, 30, 0.42)', justifyContent: 'flex-end' },
    modalContent: { height: BOOKING_SHEET_HEIGHT, width: '100%', alignSelf: 'stretch', backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', shadowColor: NAVY, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 18 },
    modalHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: colors.background },
    modalTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
    modalCloseBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    modalBody: { flex: 1, paddingHorizontal: 20 },
    modalBodyContent: { paddingBottom: 24 },
    propertyInfoCard: { backgroundColor: NAVY, borderRadius: 24, padding: 18, marginBottom: 18, overflow: 'hidden', shadowColor: NAVY, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 7 },
    infoAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: TEAL },
    infoCornerLine: { position: 'absolute', right: -24, top: 34, width: 120, height: 2, backgroundColor: 'rgba(255,255,255,0.16)', transform: [{ rotate: '35deg' }] },
    infoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
    infoTitleBlock: { flex: 1 },
    infoTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
    infoDesc: { fontSize: 13, color: 'rgba(255,255,255,0.74)', lineHeight: 18 },
    infoPriceBadge: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
    infoPriceText: { fontSize: 12, color: CORAL, fontWeight: '900' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.10)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
    infoText: { fontSize: 12, color: '#fff', fontWeight: '700' },
    formSectionTitle: { fontSize: 13, fontWeight: '900', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
    dateGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    dateField: { flex: 1 },
    inputLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
    input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 14, color: colors.text, marginBottom: 16 },
    guestCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 14, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    guestWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: `${CORAL}10`, borderWidth: 1, borderColor: `${CORAL}28`, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: -6, marginBottom: 18 },
    guestWarningText: { flex: 1, fontSize: 12, lineHeight: 17, color: CORAL, fontWeight: '800' },
    guestValue: { minWidth: 40, textAlign: 'center', fontSize: 18, fontWeight: '900', color: colors.text },
    guestStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    priceCalculation: { backgroundColor: colors.cardBg, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    priceLabel: { fontSize: 12, color: colors.textSecondary },
    priceValue: { fontSize: 13, fontWeight: '800', color: colors.text },
    confirmButton: { backgroundColor: NAVY, paddingVertical: 16, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, shadowColor: NAVY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14, elevation: 7 },
    confirmButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    dateButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, justifyContent: 'flex-start', gap: 10, minHeight: 58 },
    dateButtonDisabled: { opacity: 0.5 },
    dateButtonText: { fontSize: 14, color: colors.text },
    serviceCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 18, marginBottom: 12 },
    serviceCardActive: { borderColor: `${TEAL}70`, backgroundColor: `${TEAL}10` },
    quantityButton: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    checkbox: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  }), [colors]);

  const [bookings, setBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarSelectionMode, setCalendarSelectionMode] = useState('checkIn');
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
  const bookingSheetAnim = useRef(new Animated.Value(1)).current;

  // Кэш для занятых дат (чтобы не делать повторные запросы)
  const bookedDatesCache = React.useRef(new Map());
  // Отслеживаем время последнего запроса для rate limiting
  const _lastRequestTime = React.useRef(0);
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
    setIsBookingsLoading(false);
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
    bookingSheetAnim.stopAnimation();
    bookingSheetAnim.setValue(1);
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
    Animated.timing(bookingSheetAnim, {
      toValue: 0,
      duration: 320,
      useNativeDriver: useNative,
    }).start(({ finished }) => {
      if (finished) {
        loadBookedDates(property.id);
      }
    });
    // Загрузить занятые даты для этого объекта (но с кэшем)
  };

  const closeBookingModal = () => {
    setCalendarVisible(false);
    bookingSheetAnim.stopAnimation();
    Animated.timing(bookingSheetAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: useNative,
    }).start(() => {
      setBookingModalVisible(false);
      setSelectedProperty(null);
      setBookingData({
        checkIn: '',
        checkOut: '',
        guests: 0,
        notes: '',
        saunaHours: 0,
        kitchenware: false,
      });
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
      const allUnavailableDates = [];

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

  const renderProperty = ({ item }) => (
    <PropertyCard item={item} onSelect={handleSelectProperty} />
  );

  const renderBooking = ({ item, index }) => (
    <BookingCard item={item} index={index} onCancel={handleCancelBooking} />
  );



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
            {isBookingsLoading ? (
              <View style={{ paddingHorizontal: 16, gap: 12 }}>
                <SkeletonBookingRow />
                <SkeletonBookingRow />
                <SkeletonBookingRow />
              </View>
            ) : bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'paid').length > 0 ? (
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
        <Modal visible={bookingModalVisible} animationType="none" transparent statusBarTranslucent>
          <View style={styles.modalContainer}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{
                    translateY: bookingSheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, BOOKING_SHEET_HEIGHT + 40],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{'\u0411\u0440\u043e\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435'}</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    closeBookingModal();
                  }}
                >
                  <MaterialIcons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.propertyInfoCard}>
                  <View style={styles.infoAccentBar} />
                  <View style={styles.infoCornerLine} />
                  <View style={styles.infoHeader}>
                    <View style={styles.infoTitleBlock}>
                      <Text style={styles.infoTitle}>{selectedProperty.name}</Text>
                      <Text style={styles.infoDesc}>{selectedProperty.description}</Text>
                    </View>
                    <View style={styles.infoPriceBadge}>
                      <Text style={styles.infoPriceText}>{selectedProperty.price}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    {selectedProperty.rooms && (
                      <MaterialIcons name="meeting-room" size={16} color="#fff" />
                    )}
                    <Text style={styles.infoText}>
                      {selectedProperty.rooms ? `${selectedProperty.rooms} ` : ''}
                      {selectedProperty.rooms ? '\u043a\u043e\u043c\u043d. \u2022 ' : ''}
                      {'\u0434\u043e'} {selectedProperty.guests} {'\u0433\u043e\u0441\u0442\u0435\u0439'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.formSectionTitle}>{'\u0414\u0430\u0442\u044b \u0438 \u0433\u043e\u0441\u0442\u0438'}</Text>
                <View style={styles.dateGrid}>
                  <View style={styles.dateField}>
                    <Text style={styles.inputLabel}>{'\u0417\u0430\u0435\u0437\u0434'}</Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton]}
                      onPress={() => {
                        setCalendarSelectionMode('checkIn');
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
                        {bookingData.checkIn || '\u0414\u0414.\u041c\u041c.\u0413\u0413\u0413\u0413'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateField}>
                    <Text style={styles.inputLabel}>{'\u0412\u044b\u0435\u0437\u0434'}</Text>
                    <TouchableOpacity
                      style={[
                        styles.input,
                        styles.dateButton,
                        !bookingData.checkIn && styles.dateButtonDisabled,
                      ]}
                      onPress={() => {
                        if (!bookingData.checkIn) return;
                        setCalendarSelectionMode('checkOut');
                        setCalendarVisible(true);
                      }}
                      disabled={!bookingData.checkIn}
                    >
                      <MaterialIcons
                        name="event-available"
                        size={20}
                        color={bookingData.checkIn ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.dateButtonText,
                          !bookingData.checkOut && { color: colors.textSecondary },
                        ]}
                      >
                        {bookingData.checkOut || '\u0414\u0414.\u041c\u041c.\u0413\u0413\u0413\u0413'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.guestCard}>
                  <View>
                    <Text style={styles.inputLabel}>{'\u0413\u043e\u0441\u0442\u0438'}</Text>
                  </View>
                  <View style={styles.guestStepper}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: colors.primary + '18' }]}
                      onPress={() => setBookingData({ ...bookingData, guests: Math.max(0, (parseInt(bookingData.guests) || 0) - 1) })}
                    >
                      <MaterialIcons name="remove" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.guestValue}>{parseInt(bookingData.guests) || 0}</Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: colors.primary }]}
                      onPress={() => setBookingData({ ...bookingData, guests: (parseInt(bookingData.guests) || 0) + 1 })}
                    >
                      <MaterialIcons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {getExtraGuestsFee() > 0 && (
                  <View style={styles.guestWarning}>
                    <MaterialIcons name="info-outline" size={18} color={CORAL} />
                    <Text style={styles.guestWarningText}>
                      {'\u0417\u0430'} {Math.max(0, (parseInt(bookingData.guests) || 0) - selectedProperty.guests)} {'\u0434\u043e\u043f. \u0433\u043e\u0441\u0442\u0435\u0439 \u0431\u0443\u0434\u0435\u0442 \u0434\u043e\u043f\u043b\u0430\u0442\u0430'} +{getExtraGuestsFee().toLocaleString('ru-RU')}PRB
                    </Text>
                  </View>
                )}

                {/* ========== ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ ========== */}
                <Text style={styles.formSectionTitle}>
                  {'\u0414\u043e\u043f. \u0443\u0441\u043b\u0443\u0433\u0438'}
                </Text>

                {/* Парилка - Checkbox */}
                <View style={[styles.serviceCard, parseInt(bookingData.saunaHours) > 0 && styles.serviceCardActive]}>
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
                <View style={[styles.serviceCard, bookingData.kitchenware && styles.serviceCardActive, { marginBottom: spacing.lg }]}>
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
            </Animated.View>
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
          selectionMode={calendarSelectionMode}
          onClose={() => setCalendarVisible(false)}
        />
        </>
      )}

      <CancelConfirmModal
        visible={cancelConfirmVisible}
        cancelBookingId={cancelBookingId}
        bookings={bookings}
        onClose={() => setCancelConfirmVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}
