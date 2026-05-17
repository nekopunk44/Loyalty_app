import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Modal, Image, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FadeInCard, ScaleInCard } from '../../components/ui/AnimatedCard';
import PropertyCarousel from '../../components/ui/PropertyCarousel';
import { SkeletonBlock } from '../../components/ui/Skeleton';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';
import { getSkyMood, pad, STAR_POSITIONS } from '../../utils/skyMood';

const ORANGE = '#FF6B35';
const TEAL   = '#14B8A6';

const LEVEL_COLOR = {
  platinum: '#8B5CF6', gold: '#F59E0B', silver: '#94A3B8', bronze: '#E08B32',
};
const LEVEL_NEXT = { bronze: 'Silver', silver: 'Gold', gold: 'Platinum', platinum: null };
const LEVEL_PTS  = { bronze: 500, silver: 2000, gold: 5000, platinum: null };

const LEVEL_PERKS = {
  bronze: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 1%',             desc: 'С каждого бронирования' },
    { icon: 'cake',          color: '#F43F5E', title: 'Бонус в день рождения',  desc: 'Дополнительные баллы' },
    { icon: 'history',       color: '#06B6D4', title: 'История броней',         desc: 'Полный архив визитов' },
  ],
  silver: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 1.5%',            desc: '+0.5% к базовому' },
    { icon: 'support-agent', color: '#8B5CF6', title: 'Приоритетная поддержка', desc: 'Быстрый ответ' },
    { icon: 'cake',          color: '#F43F5E', title: 'Бонус в день рождения',  desc: 'Увеличенные баллы' },
  ],
  gold: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 2%',              desc: '+1% к базовому' },
    { icon: 'flash-on',      color: '#F59E0B', title: 'Ранний доступ',           desc: 'Первым видите акции' },
    { icon: 'support-agent', color: '#8B5CF6', title: 'VIP поддержка',           desc: 'Персональный менеджер' },
  ],
  platinum: [
    { icon: 'percent',       color: '#10B981', title: 'Кешбек 3%',              desc: 'Максимальный' },
    { icon: 'diamond',       color: '#8B5CF6', title: 'VIP обслуживание',        desc: 'Высший приоритет' },
    { icon: 'person',        color: '#06B6D4', title: 'Личный менеджер',         desc: 'Всегда на связи' },
  ],
};

const EVENT_CATEGORY_COLORS = {
  concert: '#F43F5E', sport: '#10B981', exhibition: '#8B5CF6',
  party: '#F59E0B', other: '#06B6D4',
};

const getLevelColor = (level) => LEVEL_COLOR[(level || 'bronze').toLowerCase()] || LEVEL_COLOR.bronze;

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();

  const [selectedPhoto, setSelectedPhoto]     = useState(null);
  const [bookingCount, setBookingCount]       = useState(0);
  const [recentBookings, setRecentBookings]   = useState([]);
  const [refreshing, setRefreshing]           = useState(false);
  const [upcomingEvents, setUpcomingEvents]   = useState([]);
  const [isDataLoading, setIsDataLoading]     = useState(true);
  const [now, setNow]                         = useState(() => new Date());

  useEffect(() => { loadData(); }, [user?.id]);
  useFocusEffect(React.useCallback(() => { loadData(); }, [user?.id]));

  // Tick every minute so the sky/fact stays current without remounting
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const loadBookingCount = async () => {
    try {
      if (!user?.id) return;
      const data = await apiCall(`${getApiUrl()}/bookings/user/${user.id}`);
      if (data.success && Array.isArray(data.bookings)) {
        setBookingCount(data.bookings.filter(b => b.status === 'completed').length);
        const active = data.bookings
          .filter(b => ['confirmed', 'paid', 'pending'].includes(b.status))
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
  const nextLevel  = LEVEL_NEXT[levelKey];
  const ptsForNext = LEVEL_PTS[levelKey];
  const pts        = user?.loyaltyPoints || 0;
  const progress   = ptsForNext ? Math.min(pts / ptsForNext, 1) : 1;
  const displayName = user?.displayName || user?.name || 'Пользователь';

  const screenBg = isDark ? '#07111F' : '#F1F5F9';
  const cardBg   = isDark ? '#1E293B' : '#FFFFFF';
  const textPri  = colors.text;
  const textSec  = colors.textSecondary;
  const border   = colors.border;

  const properties = [
    { id: '1', name: 'Стандарт',         price: '150 PRB/ночь', image: require('../../assets/property1.png') },
    { id: '2', name: 'Люкс апартаменты', price: '250 PRB/ночь', image: require('../../assets/property2.png') },
    { id: '3', name: 'Задний двор',      price: '200 PRB/ночь', image: require('../../assets/property3.png') },
    { id: '4', name: 'Сауна',            price: '250 PRB/час',  image: require('../../assets/property4.png') },
  ];

  const sky = getSkyMood(now);
  const sunSize = 64;
  const haloSize = 140;
  // Top ~90pt of the hero sits BEHIND the transparent header (status bar +
  // header bar). Sun/halo positions are computed against the visible zone
  // BELOW that, so the disk is never hidden behind the curve.
  const HEADER_OFFSET = 90;
  const HERO_HEIGHT = 280;
  const VISIBLE_H = HERO_HEIGHT - HEADER_OFFSET;
  const sunTop  = HEADER_OFFSET + sky.sunY * VISIBLE_H;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBg }]}
      contentContainerStyle={{ paddingBottom: 100, backgroundColor: screenBg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
    >
      {/* ── TIME-OF-DAY SKY HERO ── */}
      <View style={styles.skyHero}>
        {/* Sky gradient */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"   stopColor={sky.sky[0]} />
              <Stop offset="0.6" stopColor={sky.sky[1]} />
              <Stop offset="1"   stopColor={sky.sky[2]} />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#skyGrad)" />
        </Svg>

        {/* Sun / moon halo */}
        <View style={[
          styles.skyHalo,
          {
            width: haloSize, height: haloSize, borderRadius: haloSize / 2,
            backgroundColor: sky.sunHalo,
            left: `${sky.sunX * 100}%`, top: sunTop,
            marginLeft: -haloSize / 2, marginTop: -haloSize / 2,
          },
        ]} />
        {/* Sun / moon disk */}
        <View style={[
          styles.skySun,
          {
            width: sunSize, height: sunSize, borderRadius: sunSize / 2,
            backgroundColor: sky.sun,
            left: `${sky.sunX * 100}%`, top: sunTop,
            marginLeft: -sunSize / 2, marginTop: -sunSize / 2,
          },
        ]} />

        {/* Stars (twilight/night only) */}
        {sky.stars > 0 && STAR_POSITIONS.slice(0, sky.stars).map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${s.x * 100}%`,
              top: HEADER_OFFSET + s.y * VISIBLE_H,
              width: s.r * 2, height: s.r * 2, borderRadius: s.r,
              backgroundColor: '#fff', opacity: 0.85,
            }}
          />
        ))}

        {/* Soft horizon haze at the bottom */}
        <View style={[styles.skyHaze, { backgroundColor: sky.sky[2], opacity: 0.45 }]} />

        {/* Content */}
        <View style={styles.heroContent}>
          <View style={styles.phaseBadge}>
            <View style={[styles.phaseDot, { backgroundColor: sky.text }]} />
            <Text style={[styles.phaseLabel, { color: sky.text }]}>{sky.phaseLabel}</Text>
            <Text style={[styles.phaseTime, { color: sky.textDim }]}>
              · {pad(now.getHours())}:{pad(now.getMinutes())}
            </Text>
          </View>
          <Text style={[styles.heroGreeting, { color: sky.text }]} numberOfLines={1}>
            {sky.greeting},
          </Text>
          <Text style={[styles.heroName, { color: sky.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.heroFactRow}>
            <MaterialIcons name={sky.icon} size={14} color={sky.textDim} />
            <Text style={[styles.heroFact, { color: sky.textDim }]} numberOfLines={2}>
              {sky.fact}
            </Text>
          </View>
        </View>
      </View>

      {/* ── STATUS CARD (floats over hero) ── */}
      <ScaleInCard delay={80}>
        <View style={[styles.statusCard, { backgroundColor: cardBg }]}>

          {/* Top: points + level */}
          <View style={styles.statusTop}>
            <View style={styles.statusPtsBlock}>
              <Text style={[styles.statusPtsLabel, { color: textSec }]}>Баллов лояльности</Text>
              <Text style={[styles.statusPts, { color: textPri }]}>{pts.toLocaleString('ru-RU')}</Text>
            </View>
            <View style={[styles.statusLevelBadge, { backgroundColor: `${levelColor}15`, borderColor: `${levelColor}35` }]}>
              <MaterialIcons name="emoji-events" size={18} color={levelColor} />
              <Text style={[styles.statusLevelText, { color: levelColor }]}>
                {user?.membershipLevel || 'Bronze'}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.statusDivider, { backgroundColor: border }]} />

          {/* Bottom: bookings + progress */}
          <View style={styles.statusBottom}>
            <View style={styles.statusBookings}>
              <MaterialIcons name="event-available" size={20} color={TEAL} />
              <View style={styles.statusBookingText}>
                <Text style={[styles.statusBookingNum, { color: textPri }]}>{bookingCount}</Text>
                <Text style={[styles.statusBookingLabel, { color: textSec }]}>Бронирований</Text>
              </View>
            </View>

            {nextLevel && (
              <View style={styles.statusProgressBlock}>
                <View style={styles.statusProgressMeta}>
                  <Text style={[styles.statusProgressLabel, { color: textSec }]}>До {nextLevel}</Text>
                  <Text style={[styles.statusProgressPts, { color: textPri }]}>{pts} / {ptsForNext}</Text>
                </View>
                <View style={[styles.statusProgressTrack, { backgroundColor: border }]}>
                  <View style={[styles.statusProgressFill, { width: `${progress * 100}%`, backgroundColor: levelColor }]} />
                </View>
              </View>
            )}
          </View>

        </View>
      </ScaleInCard>

      {/* ── КАТАЛОГ ОБЪЕКТОВ ── */}
      <FadeInCard delay={180}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPri }]}>Каталог объектов</Text>
        </View>
        <PropertyCarousel
          properties={properties}
          onPropertyPress={(property) => navigation.navigate('Booking', { selectedProperty: property })}
        />
      </FadeInCard>

      {/* ── МОИ ПРИВИЛЕГИИ ── */}
      <FadeInCard delay={260}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPri }]}>Мои привилегии</Text>
          <View style={[styles.levelPill, { backgroundColor: `${levelColor}15`, borderColor: `${levelColor}40` }]}>
            <MaterialIcons name="emoji-events" size={11} color={levelColor} />
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
            <View style={[styles.perkCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.perkIconBox, { backgroundColor: `${item.color}15` }]}>
                <MaterialIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.perkTitle, { color: textPri }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.perkDesc, { color: textSec }]} numberOfLines={2}>{item.desc}</Text>
            </View>
          )}
        />
      </FadeInCard>

      {/* ── БЛИЖАЙШИЕ СОБЫТИЯ ── */}
      {isDataLoading && (
        <FadeInCard delay={340}>
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
        <FadeInCard delay={340}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPri }]}>Ближайшие события</Text>
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
                  style={[styles.eventCard, { backgroundColor: cardBg, borderColor: border, borderTopColor: catColor }]}
                  onPress={() => navigation.navigate('Events')}
                  activeOpacity={0.82}
                >
                  <View style={[styles.eventCatBadge, { backgroundColor: `${catColor}15` }]}>
                    <Text style={[styles.eventCatText, { color: catColor }]}>
                      {item.category || 'Событие'}
                    </Text>
                  </View>
                  <Text style={[styles.eventTitle, { color: textPri }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {!!item.startDate && (
                    <View style={styles.eventMeta}>
                      <MaterialIcons name="event" size={11} color={textSec} />
                      <Text style={[styles.eventMetaText, { color: textSec }]}>{item.startDate}</Text>
                    </View>
                  )}
                  {!!item.location && (
                    <View style={styles.eventMeta}>
                      <MaterialIcons name="place" size={11} color={textSec} />
                      <Text style={[styles.eventMetaText, { color: textSec }]} numberOfLines={1}>{item.location}</Text>
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
        <FadeInCard delay={420}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPri }]}>Последние бронирования</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
              <Text style={[styles.seeAll, { color: TEAL }]}>Все →</Text>
            </TouchableOpacity>
          </View>
          {recentBookings.map((b) => {
            const STATUS = {
              confirmed: { label: 'Активный',  bg: '#D1FAE5', text: '#065F46' },
              paid:      { label: 'Активный',  bg: '#D1FAE5', text: '#065F46' },
              pending:   { label: 'Ожидает',   bg: '#FEF3C7', text: '#B45309' },
              completed: { label: 'Завершено', bg: '#E5E7EB', text: '#374151' },
              cancelled: { label: 'Отменено',  bg: '#FEE2E2', text: '#B91C1C' },
            };
            const s = STATUS[b.status] || { label: b.status, bg: '#F3F4F6', text: '#6B7280' };
            const dateStr = b.checkIn && b.checkOut ? `${b.checkIn} — ${b.checkOut}` : b.checkIn || '';
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.bookingCard, { backgroundColor: cardBg }]}
                onPress={() => navigation.navigate('Booking')}
                activeOpacity={0.82}
              >
                <View style={[styles.bookingAccent, { backgroundColor: s.text }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookingProperty, { color: textPri }]} numberOfLines={1}>
                    {b.property || b.propertyId || 'Объект'}
                  </Text>
                  {!!dateStr && <Text style={[styles.bookingDate, { color: textSec }]}>{dateStr}</Text>}
                </View>
                <View style={[styles.bookingBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.bookingBadgeText, { color: s.text }]}>{s.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </FadeInCard>
      )}

      {/* Photo detail modal */}
      {selectedPhoto && (
        <Modal visible={!!selectedPhoto} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={[styles.modalHeader, { borderBottomColor: border }]}>
                <Text style={[styles.modalTitle, { color: textPri }]}>{selectedPhoto.title}</Text>
                <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
                  <MaterialIcons name="close" size={24} color={textPri} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                <Image source={{ uri: selectedPhoto.image }} style={styles.photoDetailImage} />
                <View style={{ padding: 20 }}>
                  <Text style={[{ fontSize: 20, fontWeight: '800', marginBottom: 8, color: textPri }]}>{selectedPhoto.title}</Text>
                  <Text style={[{ fontSize: 14, lineHeight: 20, marginBottom: 12, color: textSec }]}>{selectedPhoto.description}</Text>
                  <Text style={[{ fontSize: 18, fontWeight: '700', color: ORANGE }]}>{selectedPhoto.price}</Text>
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

  // ── Time-of-day sky hero ──
  skyHero: {
    height: 280,
    overflow: 'hidden',
    position: 'relative',
  },
  skyHalo: {
    position: 'absolute',
  },
  skySun: {
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  skyHaze: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
  },
  heroContent: {
    position: 'absolute', left: 20, right: 20, bottom: 44,
  },
  phaseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8,
  },
  phaseDot: {
    width: 5, height: 5, borderRadius: 2.5, opacity: 0.85,
  },
  phaseLabel: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1.4,
  },
  phaseTime: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  heroGreeting: {
    fontSize: 16, fontWeight: '600', letterSpacing: -0.2, opacity: 0.9,
  },
  heroName: {
    fontSize: 30, fontWeight: '900', letterSpacing: -0.8,
    lineHeight: 34, marginTop: 1,
  },
  heroFactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
  },
  heroFact: {
    fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 16,
  },

  // ── Status card ──
  statusCard: {
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  statusTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 16,
  },
  statusPtsBlock: { flex: 1 },
  statusPtsLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  statusPts:      { fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 40 },
  statusLevelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  statusLevelText: { fontSize: 14, fontWeight: '800' },
  statusDivider:   { height: 1, marginBottom: 16 },
  statusBottom:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusBookings:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBookingText: {},
  statusBookingNum:  { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  statusBookingLabel:{ fontSize: 11, fontWeight: '500' },
  statusProgressBlock: { flex: 1 },
  statusProgressMeta:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statusProgressLabel: { fontSize: 11, fontWeight: '500' },
  statusProgressPts:   { fontSize: 11, fontWeight: '700' },
  statusProgressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  statusProgressFill:  { height: '100%', borderRadius: 3 },

  // ── Sections ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  seeAll:       { fontSize: 13, fontWeight: '700' },

  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  levelPillText: { fontSize: 11, fontWeight: '700' },

  // ── Perks ──
  perksRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  perkCard: {
    width: 130, height: 158, borderRadius: 16, padding: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  perkIconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  perkTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4, lineHeight: 18 },
  perkDesc:  { fontSize: 11, lineHeight: 15 },

  // ── Events ──
  eventsRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  eventCard: {
    width: 200, borderRadius: 16, padding: 14,
    borderWidth: 1, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  eventCatBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  eventCatText:  { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventTitle:    { fontSize: 14, fontWeight: '800', marginBottom: 8, lineHeight: 19 },
  eventMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  eventMetaText: { fontSize: 11, fontWeight: '500' },
  eventBtn:      { marginTop: 10, borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  eventBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Recent bookings ──
  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bookingAccent:     { width: 4, alignSelf: 'stretch', marginRight: 14 },
  bookingProperty:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  bookingDate:       { fontSize: 12 },
  bookingBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 10 },
  bookingBadgeText:  { fontSize: 11, fontWeight: '700' },

  // ── Modal ──
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 16 },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle:     { fontSize: 17, fontWeight: '700' },
  photoDetailImage: { width: '100%', height: 240 },
});
