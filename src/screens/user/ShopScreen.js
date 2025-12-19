import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ScrollView, FlatList, Animated, Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const CORAL = '#FF6B35';
const useNative = Platform.OS !== 'web';

const CATEGORIES = [
  { id: 'all',  label: 'Все',      icon: 'apps' },
  { id: 'food', label: 'Еда',      icon: 'restaurant' },
  { id: 'spa',  label: 'Спа',      icon: 'spa' },
  { id: 'shop', label: 'Сувениры', icon: 'storefront' },
];

const MOCK_PRODUCTS = [
  { id: 1, cat: 'food', name: 'Кофе премиум',    desc: 'Высокосортные зёрна',  price: 450, original: 500,  icon: 'local-cafe',       color: '#92400E' },
  { id: 2, cat: 'food', name: 'Шоколад',         desc: 'Бельгийский',          price: 350, original: null, icon: 'cake',             color: '#7C3AED' },
  { id: 3, cat: 'food', name: 'Чай зелёный',     desc: 'Натуральный вкус',     price: 280, original: 320,  icon: 'emoji-food-beverage', color: '#059669' },
  { id: 4, cat: 'food', name: 'Мёд натуральный', desc: 'Первого сорта',        price: 520, original: null, icon: 'grain',            color: AMBER },
  { id: 5, cat: 'spa',  name: 'Крем для лица',   desc: 'Натуральный',          price: 1200, original: 1500, icon: 'face',            color: CORAL },
  { id: 6, cat: 'spa',  name: 'Ароматерапия',    desc: 'Эфирные масла',        price: 890, original: null, icon: 'spa',             color: TEAL },
  { id: 7, cat: 'shop', name: 'Брелок Villa J.', desc: 'Сувенир',              price: 320, original: null, icon: 'vpn-key',         color: '#0891B2' },
  { id: 8, cat: 'shop', name: 'Открытка',        desc: 'Памятный подарок',     price: 150, original: null, icon: 'card-giftcard',   color: '#DB2777' },
];

// ─── Product card (module-level to avoid remount) ───────────────────────────

function ProductItem({ item, onAdd, colors }) {
  const discount = item.original ? Math.round((1 - item.price / item.original) * 100) : 0;
  return (
    <View style={[prodStyles.card, { backgroundColor: colors.cardBg }]}>
      <View style={[prodStyles.iconBox, { backgroundColor: `${item.color}18` }]}>
        <MaterialIcons name={item.icon} size={28} color={item.color} />
        {discount > 0 && (
          <View style={[prodStyles.badge, { backgroundColor: CORAL }]}>
            <Text style={prodStyles.badgeText}>-{discount}%</Text>
          </View>
        )}
      </View>
      <Text style={[prodStyles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[prodStyles.desc, { color: colors.textSecondary }]} numberOfLines={1}>{item.desc}</Text>
      <View style={prodStyles.priceRow}>
        <Text style={[prodStyles.price, { color: NAVY }]}>{item.price} <Text style={prodStyles.currency}>PRB</Text></Text>
        {item.original && <Text style={prodStyles.original}>{item.original}</Text>}
      </View>
      <TouchableOpacity style={[prodStyles.addBtn, { backgroundColor: TEAL }]} onPress={() => onAdd(item)} activeOpacity={0.8}>
        <MaterialIcons name="add-shopping-cart" size={16} color="#fff" />
        <Text style={prodStyles.addBtnText}>В корзину</Text>
      </TouchableOpacity>
    </View>
  );
}

const prodStyles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconBox: {
    width: 52, height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4, right: -4,
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  name: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  desc: { fontSize: 11, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  price: { fontSize: 15, fontWeight: '800' },
  currency: { fontSize: 11, fontWeight: '600' },
  original: { fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 7, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const { user: _user } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [amount, setAmount]   = useState('');
  const [cat, setCat]         = useState('all');
  const [cartCount, setCartCount] = useState(0);

  const heroAnim   = useRef(new Animated.Value(0)).current;
  const blob1      = useRef(new Animated.Value(1)).current;
  const blob2      = useRef(new Animated.Value(1)).current;
  const sec1Anim   = useRef(new Animated.Value(0)).current;
  const sec2Anim   = useRef(new Animated.Value(0)).current;
  const sec3Anim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: useNative }).start();
    Animated.stagger(90, [
      Animated.spring(sec1Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec2Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec3Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
    ]).start();

    const pulse = (val, to, dur, delay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: to, duration: dur, useNativeDriver: useNative }),
        Animated.timing(val, { toValue: 1,  duration: dur, useNativeDriver: useNative }),
      ]));
    pulse(blob1, 1.4, 3200).start();
    pulse(blob2, 1.25, 2700, 1400).start();
  }, []);

  const filtered = cat === 'all' ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter(p => p.cat === cat);

  const cashback = amount ? (parseFloat(amount) * 0.01).toFixed(2) : null;

  const handlePurchase = () => {
    const sum = parseFloat(amount);
    if (!sum || sum <= 0) {
      Alert.alert('Ошибка', 'Введите корректную сумму');
      return;
    }
    Alert.alert('Покупка оформлена', `Сумма: ${sum.toFixed(2)} PRB\nКешбек: +${(sum * 0.01).toFixed(2)} PRB`, [{ text: 'OK' }]);
    setAmount('');
  };

  const handleAddToCart = (product) => {
    setCartCount(c => c + 1);
    Alert.alert('Добавлено', `${product.name} добавлен в корзину`);
  };

  const slideIn = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, { opacity: heroAnim }]}>
          <Animated.View style={[styles.blob1, { transform: [{ scale: blob1 }] }]} />
          <Animated.View style={[styles.blob2, { transform: [{ scale: blob2 }] }]} />
          <View style={styles.decArc} />

          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>МАГАЗИН</Text>
              <Text style={styles.heroTitle}>Товары и услуги</Text>
              <Text style={styles.heroSub}>Накапливайте баллы с каждой покупкой</Text>
            </View>
            <View style={styles.heroRight}>
              <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <MaterialIcons name="shopping-cart" size={18} color={TEAL} />
                <Text style={styles.heroStatNum}>{cartCount}</Text>
                <Text style={styles.heroStatLbl}>В КОРЗИНЕ</Text>
              </View>
              <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <MaterialIcons name="stars" size={18} color={AMBER} />
                <Text style={styles.heroStatNum}>1%</Text>
                <Text style={styles.heroStatLbl}>КЕШБЕК</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Quick purchase ── */}
        <Animated.View style={[styles.card, { backgroundColor: colors.cardBg }, slideIn(sec1Anim)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: `${CORAL}18` }]}>
              <MaterialIcons name="payment" size={20} color={CORAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Быстрая оплата</Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Введите сумму — получите кешбек</Text>
            </View>
          </View>

          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <MaterialIcons name="attach-money" size={20} color={CORAL} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="Сумма в PRB"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {cashback && (
            <View style={[styles.cashbackRow, { backgroundColor: `${TEAL}12`, borderColor: `${TEAL}30` }]}>
              <MaterialIcons name="stars" size={18} color={TEAL} />
              <Text style={[styles.cashbackText, { color: TEAL }]}>Вы получите <Text style={{ fontWeight: '800' }}>{cashback} PRB</Text> кешбека</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.payBtn, { backgroundColor: CORAL }]} onPress={handlePurchase} activeOpacity={0.85}>
            <MaterialIcons name="payment" size={18} color="#fff" />
            <Text style={styles.payBtnText}>Оплатить</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Benefits ── */}
        <Animated.View style={[styles.card, { backgroundColor: colors.cardBg }, slideIn(sec2Anim)]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Преимущества программы</Text>
          {[
            { icon: 'trending-up', color: TEAL,  text: '1% кешбека с каждой покупки' },
            { icon: 'redeem',      color: AMBER, text: 'Оплата баллами до 50% стоимости' },
            { icon: 'local-offer', color: CORAL, text: 'Эксклюзивные скидки для участников' },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: `${b.color}18` }]}>
                <MaterialIcons name={b.icon} size={18} color={b.color} />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>{b.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── Catalog ── */}
        <Animated.View style={slideIn(sec3Anim)}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: spacing.md, marginBottom: 10 }]}>Каталог</Text>

          {/* Category pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map(c => {
              const active = cat === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catPill, active && styles.catPillActive]}
                  onPress={() => setCat(c.id)}
                  activeOpacity={0.75}
                >
                  <MaterialIcons name={c.icon} size={15} color={active ? '#fff' : NAVY} />
                  <Text style={[styles.catPillText, { color: active ? '#fff' : NAVY }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Product grid */}
          <FlatList
            data={filtered}
            numColumns={2}
            scrollEnabled={false}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <ProductItem item={item} onAdd={handleAddToCart} colors={colors} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={[styles.emptyCircle, { backgroundColor: `${NAVY}10` }]}>
                  <MaterialIcons name="storefront" size={32} color={NAVY} />
                </View>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Нет товаров</Text>
              </View>
            }
          />
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 32 },

  // ── Hero
  hero: {
    backgroundColor: NAVY,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute', width: 220, height: 220,
    borderRadius: 110, backgroundColor: 'rgba(20,184,166,0.12)',
    top: -60, right: -40,
  },
  blob2: {
    position: 'absolute', width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,107,53,0.10)',
    bottom: -30, left: -20,
  },
  decArc: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    bottom: -100, right: -60,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  heroSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  heroRight: { gap: 8 },
  heroStat: {
    alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 14, minWidth: 72,
  },
  heroStatNum: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  heroStatLbl: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },

  // ── Cards
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub:   { fontSize: 12, marginTop: 1 },

  // ── Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  cashbackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12,
  },
  cashbackText: { fontSize: 13 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Benefits
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  benefitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 13 },

  // ── Catalog
  catRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: `${NAVY}30`,
    backgroundColor: 'transparent',
  },
  catPillActive: {
    backgroundColor: TEAL, borderColor: TEAL,
  },
  catPillText: { fontSize: 13, fontWeight: '600' },
  grid: { paddingHorizontal: spacing.md - 5 },

  // ── Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14 },
});
