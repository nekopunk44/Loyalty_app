import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FadeInCard, ScaleInCard } from '../../components/ui/AnimatedCard';
import PropertyCarousel from '../../components/ui/PropertyCarousel';
import VillaBackdrop from '../../components/ui/VillaBackdrop';
import { SkeletonBlock } from '../../components/ui/Skeleton';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const ORANGE = '#FF6B35';

const LEVEL_COLORS = { platinum: '#B366FF', gold: '#F59E0B', silver: '#A9A9A9', bronze: '#CD7F32' };
const LEVEL_NEXT   = { bronze: 'Silver', silver: 'Gold', gold: 'Platinum', platinum: null };
const LEVEL_PTS    = { bronze: 500, silver: 2000, gold: 5000, platinum: null };

const HOME_THEME = {
  light: {
    screenBg: '#E9EFE8',
    heroBg: '#EFE1D0',
    greeting: 'rgba(6,59,92,0.58)',
    name: NAVY,
    avatarBg: 'rgba(255,248,239,0.74)',
    cardBg: '#FFF8EE',
  },
  dark: {
    screenBg: '#07111F',
    heroBg: '#07111F',
    greeting: 'rgba(255,255,255,0.52)',
    name: '#FFFFFF',
    avatarBg: 'rgba(255,255,255,0.08)',
    cardBg: '#1E293B',
  },
};

const LEVEL_PERKS = {
  bronze: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 1%',            desc: 'С каждого бронирования' },
    { icon: 'cake',          color: '#F43F5E', title: 'Бонус в день рождения', desc: 'Дополнительные баллы' },
    { icon: 'history',       color: '#06B6D4', title: 'История броней',        desc: 'Полный архив визитов' },
  ],
  silver: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 1.5%',           desc: '+0.5% к базовому' },
    { icon: 'support-agent', color: '#8B5CF6', title: 'Приоритетная поддержка', desc: 'Быстрый ответ' },
    { icon: 'cake',          color: '#F43F5E', title: 'Бонус в день рождения',  desc: 'Увеличенные баллы' },
  ],
  gold: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 2%',             desc: '+1% к базовому' },
    { icon: 'flash-on',      color: '#F59E0B', title: 'Ранний доступ',          desc: 'Первым видите акции' },
    { icon: 'support-agent', color: '#8B5CF6', title: 'VIP поддержка',          desc: 'Персональный менеджер' },
  ],
  platinum: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 3%',             desc: 'Максимальный' },
    { icon: 'diamond',       color: '#B366FF', title: 'VIP обслуживание',       desc: 'Высший приоритет' },
    { icon: 'person',        color: '#06B6D4', title: 'Личный менеджер',        desc: 'Всегда на связи' },
  ],
};

const EVENT_CATEGORY_COLORS = {
  concert: '#F43F5E', sport: '#10B981', exhibition: '#8B5CF6',
  party: '#F59E0B', other: '#06B6D4',
};

const getLevelColor = (level) => LEVEL_COLORS[(level || 'bronze').toLowerCase()] || LEVEL_COLORS.bronze;

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const { user, isAdmin: _isAdmin } = useAuth();

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [bookingCount, setBookingCount]   = useState(0);
  const [recentBookings, setRecentBookings] = useState([]);
  const [refreshing, setRefreshing]       = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isDataLoading, setIsDataLoading]  = useState(true);

  useEffect(() => { loadData(); }, [user?.id]);
  useFocusEffect(React.useCallback(() => { loadData(); }, [user?.id]));

  const loadBookingCount = async () => {
    try {
      if (!user?.id) return;
      const data = await apiCall(`${getApiUrl()}/bookings/user/${user.id}`);
      if (data.success && Array.isArray(data.bookings)) {
        setBookingCount(data.bookings.filter(b => b.status === 'completed').length);
        const active = data.bookings
          .filter(b => b.status === 'confirmed' || b.status === 'paid' || b.status === 'pending')
          .slice(0, 2);
        setRecentBookings(active.length > 0 ? active : data.bookings.slice(0, 2));
      }
    } catch { setBookingCount(0); }
  };

  const loadEvents = async () => {
    try {
      const data = await apiCall(`${getApiUrl()}/events`);
      if (data.success && Array.isArray(data.events)) {
        const active = data.events.filter(e => {
          const s = (e.status || '').toLowerCase();
          return s === 'active' || s === 'активный' || s === 'upcoming';
        }).slice(0, 6);
        setUpcomingEvents(active);
      }
    } catch { /* silent */ }
  };

  const loadData = async () => {
    setIsDataLoading(true);
    await Promise.all([loadBookingCount(), loadEvents()]);
    setIsDataLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user?.id]);

  const levelKey   = (user?.membershipLevel || 'Bronze').toLowerCase();
  const levelColor = getLevelColor(levelKey);
  const homePalette = isDark ? HOME_THEME.dark : HOME_THEME.light;
  const nextLevel  = LEVEL_NEXT[levelKey];
  const ptsForNext = LEVEL_PTS[levelKey];
  const pts        = user?.loyaltyPoints || 0;
  const progress   = ptsForNext ? Math.min(pts / ptsForNext, 1) : 1;

  const loyaltyStats = [
    { label: 'Баллы',        value: pts,                                icon: 'stars',        color: AMBER },
    { label: 'Уровень',      value: user?.membershipLevel || 'Bronze',  icon: 'emoji-events', color: levelColor },
    { label: 'Бронирований', value: bookingCount,                       icon: 'event-note',   color: TEAL },
  ];


  const properties = [
    { id: '1', name: 'Стандарт',         price: '150 PRB/ночь', image: require('../../assets/property1.png') },
    { id: '2', name: 'Люкс апартаменты', price: '250 PRB/ночь', image: require('../../assets/property2.png') },
    { id: '3', name: 'Задний двор',      price: '200 PRB/ночь', image: require('../../assets/property3.png') },
    { id: '4', name: 'Сауна',            price: '250 PRB/час',  image: require('../../assets/property4.png') },
  ];

  const displayName = user?.displayName || user?.name || 'Пользователь';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: homePalette.screenBg }]}
      contentContainerStyle={[styles.scrollContent, { backgroundColor: homePalette.screenBg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
    >
      {/* ── PREMIUM HERO ── */}
      <View style={[styles.hero, { backgroundColor: homePalette.heroBg }]}>
        <VillaBackdrop isDark={isDark} headerBlendColor={homePalette.heroBg} />

        {/* Content */}
        <View style={styles.heroContent}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroGreeting, { color: homePalette.greeting }]}>Добро пожаловать</Text>
            <Text style={[styles.heroName, { color: homePalette.name }]}>{displayName}!</Text>
            <View style={[styles.heroBadge, { borderColor: `${levelColor}70`, backgroundColor: `${levelColor}20` }]}>
              <MaterialIcons name="emoji-events" size={13} color={levelColor} />
              <Text style={[styles.heroBadgeText, { color: levelColor }]}>
                {user?.membershipLevel || 'Bronze'}
              </Text>
            </View>
          </View>
          <View style={[styles.heroAvatar, { backgroundColor: homePalette.avatarBg, borderColor: levelColor }]}>
            <Text style={[styles.heroAvatarText, { color: levelColor }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* ── LOYALTY CARD (overlaps hero) ── */}
      <ScaleInCard delay={80}>
        <View style={[styles.loyaltyCard, { backgroundColor: homePalette.cardBg }]}>
          <Text style={[styles.loyaltyTitle, { color: colors.text }]}>Ваш статус лояльности</Text>

          <View style={styles.statsRow}>
            {loyaltyStats.map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: `${s.color}12` }]}>
                <MaterialIcons name={s.icon} size={22} color={s.color} />
                <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1}>{String(s.value)}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Progress bar */}
          {nextLevel && (
            <View style={styles.progressWrap}>
              <View style={styles.progressMeta}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  До уровня {nextLevel}
                </Text>
                <Text style={[styles.progressPts, { color: colors.text }]}>
                  {pts} / {ptsForNext}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: levelColor }]} />
              </View>
            </View>
          )}
        </View>
      </ScaleInCard>


      {/* ── PROPERTY CATALOG ── */}
      <FadeInCard delay={220}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Каталог объектов</Text>
        </View>
        <PropertyCarousel
          properties={properties}
          onPropertyPress={(property) => navigation.navigate('Booking', { selectedProperty: property })}
        />
      </FadeInCard>

      {/* ── МОИ ПРИВИЛЕГИИ ── */}
      <FadeInCard delay={300}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Мои привилегии</Text>
          <View style={[styles.levelPill, { backgroundColor: `${levelColor}20`, borderColor: `${levelColor}50` }]}>
            <MaterialIcons name="emoji-events" size={12} color={levelColor} />
            <Text style={[styles.levelPillText, { color: levelColor }]}>
              {user?.membershipLevel || 'Bronze'}
            </Text>
          </View>
        </View>
        <FlatList
          data={LEVEL_PERKS[levelKey] || LEVEL_PERKS.bronze}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.perksRow}
          renderItem={({ item }) => (
            <View style={[styles.perkCard, { backgroundColor: homePalette.cardBg, borderColor: `${item.color}30` }]}>
              <View style={[styles.perkIconBox, { backgroundColor: `${item.color}18` }]}>
                <MaterialIcons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[styles.perkTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.perkDesc,  { color: colors.textSecondary }]}>{item.desc}</Text>
            </View>
          )}
        />
      </FadeInCard>

      {/* ── БЛИЖАЙШИЕ СОБЫТИЯ ── */}
      {isDataLoading && (
        <FadeInCard delay={380}>
          <View style={styles.sectionHeader}>
            <SkeletonBlock width={160} height={18} borderRadius={6} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
            <SkeletonBlock width={180} height={110} borderRadius={12} />
            <SkeletonBlock width={180} height={110} borderRadius={12} />
          </View>
        </FadeInCard>
      )}
      {!isDataLoading && upcomingEvents.length > 0 && (
        <FadeInCard delay={380}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ближайшие события</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Events')}>
              <Text style={[styles.seeAll, { color: TEAL }]}>Все →</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={upcomingEvents}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={e => String(e.id)}
            contentContainerStyle={styles.eventsRow}
            renderItem={({ item }) => {
              const catColor = EVENT_CATEGORY_COLORS[item.category] || EVENT_CATEGORY_COLORS.other;
              return (
                <TouchableOpacity
                  style={[styles.eventCard, { backgroundColor: homePalette.cardBg, borderLeftColor: catColor }]}
                  onPress={() => navigation.navigate('Events')}
                  activeOpacity={0.82}
                >
                  <View style={[styles.eventCatBadge, { backgroundColor: `${catColor}18` }]}>
                    <Text style={[styles.eventCatText, { color: catColor }]}>
                      {item.category || 'Событие'}
                    </Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {!!item.startDate && (
                    <View style={styles.eventDateRow}>
                      <MaterialIcons name="event" size={12} color={colors.textSecondary} />
                      <Text style={[styles.eventDate, { color: colors.textSecondary }]}>
                        {item.startDate}
                      </Text>
                    </View>
                  )}
                  {!!item.location && (
                    <View style={styles.eventDateRow}>
                      <MaterialIcons name="place" size={12} color={colors.textSecondary} />
                      <Text style={[styles.eventDate, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.eventBtn, { backgroundColor: catColor }]}>
                    <Text style={styles.eventBtnText}>Подробнее</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </FadeInCard>
      )}

      {/* ── ПОСЛЕДНИЕ БРОНИРОВАНИЯ ── */}
      {recentBookings.length > 0 && (
        <FadeInCard delay={460}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Последние бронирования</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
              <Text style={[styles.seeAll, { color: TEAL }]}>Все →</Text>
            </TouchableOpacity>
          </View>
          {recentBookings.map((b) => {
            const STATUS = {
              confirmed: { label: 'Активный',       bg: '#D1FAE5', text: '#065F46' },
              paid:      { label: 'Активный',       bg: '#D1FAE5', text: '#065F46' },
              pending:   { label: 'Ожидает',        bg: '#FEF3C7', text: '#B45309' },
              completed: { label: 'Завершено',      bg: '#E5E7EB', text: '#374151' },
              cancelled: { label: 'Отменено',       bg: '#FEE2E2', text: '#B91C1C' },
            };
            const s = STATUS[b.status] || { label: b.status, bg: '#F3F4F6', text: '#6B7280' };
            const propName = b.property || b.propertyId || 'Объект';
            const dateStr  = b.checkIn && b.checkOut ? `${b.checkIn} — ${b.checkOut}` : b.checkIn || '';
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.recentBookingCard, { backgroundColor: homePalette.cardBg }]}
                onPress={() => navigation.navigate('Booking')}
                activeOpacity={0.82}
              >
                <View style={[styles.recentBookingAccent, { backgroundColor: s.text }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recentBookingProperty, { color: colors.text }]} numberOfLines={1}>
                    {propName}
                  </Text>
                  {!!dateStr && (
                    <Text style={[styles.recentBookingDate, { color: colors.textSecondary }]}>{dateStr}</Text>
                  )}
                </View>
                <View style={[styles.recentBookingBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.recentBookingBadgeText, { color: s.text }]}>{s.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </FadeInCard>
      )}

      {/* Photo detail modal (kept for compatibility) */}
      {selectedPhoto && (
        <Modal visible={!!selectedPhoto} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPhoto.title}</Text>
                <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <Image source={{ uri: selectedPhoto.image }} style={styles.photoDetailImage} />
                <View style={styles.photoDetailInfo}>
                  <Text style={[styles.photoDetailTitle, { color: colors.text }]}>{selectedPhoto.title}</Text>
                  <Text style={[styles.photoDetailDescription, { color: colors.textSecondary }]}>{selectedPhoto.description}</Text>
                  <Text style={[styles.photoDetailPrice, { color: ORANGE }]}>{selectedPhoto.price}</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // ── Premium Hero ──
  hero: {
    paddingTop: 24,
    paddingBottom: 52,
    paddingHorizontal: 20,
    overflow: 'hidden',
    minHeight: 170,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTextBlock: { flex: 1 },
  heroGreeting: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroName: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  heroAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  heroAvatarText: { fontSize: 20, fontWeight: '900' },

  // ── Loyalty card ──
  loyaltyCard: {
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  loyaltyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressWrap: {
    marginTop: 14,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressPts: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Sections ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },

  // ── Quick actions ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  actionCard: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },

  // ── Services ──
  servicesRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  serviceCard: {
    width: 150,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Section header extras ──
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  levelPillText: { fontSize: 11, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '700' },

  // ── Privileges ──
  perksRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  perkCard: {
    width: 130, borderRadius: 16, padding: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  perkIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  perkTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  perkDesc:  { fontSize: 11, lineHeight: 15 },

  // ── Events ──
  eventsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  recentBookingCard:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, overflow: 'hidden', paddingVertical: 12, paddingRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  recentBookingAccent:    { width: 4, alignSelf: 'stretch', marginRight: 12 },
  recentBookingProperty:  { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  recentBookingDate:      { fontSize: 12 },
  recentBookingBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  recentBookingBadgeText: { fontSize: 11, fontWeight: '700' },
  eventCard: {
    width: 200, borderRadius: 16, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  eventCatBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  eventCatText:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTitle:    { fontSize: 14, fontWeight: '800', marginBottom: 8, lineHeight: 19 },
  eventDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  eventDate:     { fontSize: 11, fontWeight: '500' },
  eventBtn: {
    marginTop: 10, borderRadius: 10, paddingVertical: 7, alignItems: 'center',
  },
  eventBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Promo banner (kept for legacy) ──
  promoBanner: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 20,
    backgroundColor: NAVY,
    overflow: 'hidden',
  },
  promoContent: {
    padding: 24,
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  promoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 18,
  },
  promoBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  promoBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  photoDetailImage: {
    width: '100%',
    height: 240,
  },
  photoDetailInfo: {
    padding: 20,
  },
  photoDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  photoDetailDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  photoDetailPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
});
