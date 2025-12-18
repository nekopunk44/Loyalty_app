import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Modal, Image, Alert, RefreshControl, Animated, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FadeInCard, ScaleInCard, SlideInLeftCard } from '../../components/ui/AnimatedCard';
import PropertyCarousel from '../../components/ui/PropertyCarousel';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const ORANGE = '#FF6B35';

const LEVEL_COLORS = { platinum: '#B366FF', gold: '#F59E0B', silver: '#A9A9A9', bronze: '#CD7F32' };
const LEVEL_NEXT   = { bronze: 'Silver', silver: 'Gold', gold: 'Platinum', platinum: null };
const LEVEL_PTS    = { bronze: 500, silver: 2000, gold: 5000, platinum: null };

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

const useNative = Platform.OS !== 'web';

export default function HomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const { user, isAdmin } = useAuth();

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [bookingCount, setBookingCount]   = useState(0);
  const [refreshing, setRefreshing]       = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  // Ambient glow stars
  const GLOW_CFG = useMemo(() => [
    { x: '6%',  y: 22,  dot: 3, halo: 18, dur: 3200, delay: 0,    peak: 0.95, color: '#F59E0B', dx:  8, dy: -10 },
    { x: '20%', y: 90,  dot: 2, halo: 14, dur: 4600, delay: 800,  peak: 0.8,  color: '#14B8A6', dx: -6, dy:   8 },
    { x: '34%', y: 38,  dot: 4, halo: 22, dur: 3600, delay: 1400, peak: 0.9,  color: '#fff',    dx: 10, dy:   6 },
    { x: '50%', y: 108, dot: 2, halo: 12, dur: 5100, delay: 400,  peak: 0.75, color: '#B366FF', dx: -8, dy: -12 },
    { x: '63%', y: 52,  dot: 3, halo: 18, dur: 4000, delay: 1200, peak: 0.9,  color: '#F59E0B', dx: 11, dy:   7 },
    { x: '76%', y: 18,  dot: 2, halo: 14, dur: 3500, delay: 2000, peak: 0.8,  color: '#14B8A6', dx: -9, dy:  16 },
    { x: '88%', y: 80,  dot: 3, halo: 16, dur: 4800, delay: 600,  peak: 0.85, color: '#fff',    dx:  6, dy: -8  },
    { x: '44%', y: 14,  dot: 2, halo: 12, dur: 3900, delay: 2200, peak: 0.7,  color: '#B366FF', dx:-11, dy:   9 },
    { x: '14%', y: 118, dot: 3, halo: 16, dur: 4300, delay: 1700, peak: 0.85, color: '#F59E0B', dx:  7, dy: -9  },
    { x: '72%', y: 130, dot: 2, halo: 12, dur: 3700, delay: 1000, peak: 0.75, color: '#14B8A6', dx: -5, dy:  11 },
    { x: '58%', y: 70,  dot: 4, halo: 22, dur: 5400, delay: 2800, peak: 0.9,  color: '#fff',    dx:  9, dy:  -7 },
    { x: '28%', y: 55,  dot: 2, halo: 12, dur: 4100, delay: 350,  peak: 0.8,  color: '#B366FF', dx: -7, dy:  13 },
  ], []);

  const glowAnims = useRef(
    GLOW_CFG.map(() => ({
      op: new Animated.Value(0),
      tx: new Animated.Value(0),
      ty: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    GLOW_CFG.forEach((cfg, i) => {
      const { op, tx, ty } = glowAnims[i];
      // Pulse opacity in loop
      const pulseOp = Animated.loop(Animated.sequence([
        Animated.delay(cfg.delay),
        Animated.timing(op, { toValue: cfg.peak, duration: cfg.dur * 0.45, useNativeDriver: useNative }),
        Animated.timing(op, { toValue: cfg.peak * 0.25, duration: cfg.dur * 0.35, useNativeDriver: useNative }),
        Animated.timing(op, { toValue: cfg.peak, duration: cfg.dur * 0.20, useNativeDriver: useNative }),
      ]));
      // Slow drift back and forth
      const driftX = Animated.loop(Animated.sequence([
        Animated.timing(tx, { toValue:  cfg.dx, duration: cfg.dur * 1.2, useNativeDriver: useNative }),
        Animated.timing(tx, { toValue: -cfg.dx * 0.5, duration: cfg.dur, useNativeDriver: useNative }),
      ]));
      const driftY = Animated.loop(Animated.sequence([
        Animated.timing(ty, { toValue:  cfg.dy, duration: cfg.dur * 0.9, useNativeDriver: useNative }),
        Animated.timing(ty, { toValue: -cfg.dy * 0.6, duration: cfg.dur * 1.1, useNativeDriver: useNative }),
      ]));
      pulseOp.start();
      driftX.start();
      driftY.start();
    });
  }, []);

  useEffect(() => { loadData(); }, [user?.id]);
  useFocusEffect(React.useCallback(() => { loadData(); }, [user?.id]));

  const loadBookingCount = async () => {
    try {
      if (!user?.id) return;
      const data = await apiCall(`${getApiUrl()}/bookings/user/${user.id}`);
      if (data.success && Array.isArray(data.bookings)) {
        setBookingCount(data.bookings.filter(b => b.status === 'completed').length);
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
    await Promise.all([loadBookingCount(), loadEvents()]);
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

  const loyaltyStats = [
    { label: 'Баллы',        value: pts,                                icon: 'stars',        color: AMBER },
    { label: 'Уровень',      value: user?.membershipLevel || 'Bronze',  icon: 'emoji-events', color: levelColor },
    { label: 'Бронирований', value: bookingCount,                       icon: 'event-note',   color: TEAL },
  ];


  const amenities = [
    { id: '1', title: 'Комната',   icon: 'hotel',      image: 'https://picsum.photos/300/200?random=4',  price: '3 500 PRB/ночь' },
    { id: '2', title: 'Бассейн',   icon: 'pool',       image: 'https://picsum.photos/300/200?random=5',  price: 'Включён' },
    { id: '3', title: 'Ресторан',  icon: 'restaurant', image: 'https://picsum.photos/300/200?random=6',  price: '1 200 PRB' },
    { id: '4', title: 'Спа',       icon: 'spa',        image: 'https://picsum.photos/300/200?random=7',  price: 'от 2 000 PRB' },
    { id: '5', title: 'Парк',      icon: 'park',       image: 'https://picsum.photos/300/200?random=8',  price: 'Свободно' },
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
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} />}
    >
      {/* ── PREMIUM HERO ── */}
      <View style={styles.hero}>
        {/* Static soft depth halos */}
        <View style={styles.depthHalo1} />
        <View style={styles.depthHalo2} />

        {/* Ambient glow stars */}
        {GLOW_CFG.map((cfg, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: cfg.y,
              left: cfg.x,
              opacity: glowAnims[i].op,
              transform: [{ translateX: glowAnims[i].tx }, { translateY: glowAnims[i].ty }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Outer halo */}
            <View style={{ position: 'absolute', width: cfg.halo, height: cfg.halo, borderRadius: cfg.halo, backgroundColor: cfg.color, opacity: 0.18 }} />
            {/* Mid halo */}
            <View style={{ position: 'absolute', width: cfg.halo * 0.55, height: cfg.halo * 0.55, borderRadius: cfg.halo, backgroundColor: cfg.color, opacity: 0.35 }} />
            {/* Bright core */}
            <View style={{ width: cfg.dot, height: cfg.dot, borderRadius: cfg.dot, backgroundColor: cfg.color }} />
          </Animated.View>
        ))}

        {/* VJ monogram */}
        <Text style={styles.heroMonogram}>VJ</Text>

        {/* Content */}
        <View style={styles.heroContent}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroGreeting}>Добро пожаловать</Text>
            <Text style={styles.heroName}>{displayName}!</Text>
            <View style={[styles.heroBadge, { borderColor: `${levelColor}70`, backgroundColor: `${levelColor}20` }]}>
              <MaterialIcons name="emoji-events" size={13} color={levelColor} />
              <Text style={[styles.heroBadgeText, { color: levelColor }]}>
                {user?.membershipLevel || 'Bronze'}
              </Text>
            </View>
          </View>
          <View style={[styles.heroAvatar, { backgroundColor: `${levelColor}30`, borderColor: levelColor }]}>
            <Text style={[styles.heroAvatarText, { color: levelColor }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* ── LOYALTY CARD (overlaps hero) ── */}
      <ScaleInCard delay={80}>
        <View style={[styles.loyaltyCard, { backgroundColor: colors.cardBg }]}>
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
            <View style={[styles.perkCard, { backgroundColor: colors.cardBg, borderColor: `${item.color}30` }]}>
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
      {upcomingEvents.length > 0 && (
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
                  style={[styles.eventCard, { backgroundColor: colors.cardBg, borderLeftColor: catColor }]}
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
    backgroundColor: '#060C1A',
    paddingTop: 24,
    paddingBottom: 52,
    paddingHorizontal: 20,
    overflow: 'hidden',
    minHeight: 170,
  },
  depthHalo1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#F59E0B08', top: -80, right: -60,
  },
  depthHalo2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#7B2FF70A', bottom: -60, left: -40,
  },
  heroMonogram: {
    position: 'absolute', bottom: 8, right: 16,
    fontSize: 72, fontWeight: '900', color: 'rgba(255,255,255,0.04)',
    letterSpacing: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTextBlock: { flex: 1 },
  heroGreeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
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
