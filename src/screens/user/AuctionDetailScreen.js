/**
 * AuctionDetailScreen — экран отдельного аукциона (Stage 2 ВКР).
 *
 * Показывает:
 *  - заголовок, описание, приз, окно проведения, оставшееся время;
 *  - текущую ставку (или стартовую, если ставок ещё нет);
 *  - доступный баланс (balance - lockedBalance) и заблокированную сумму;
 *  - CTA «Сделать ставку» — открывает bottom-sheet с вводом amount;
 *  - историю последних ставок.
 *
 * Серверный контракт см. [server/routes/events.js](server/routes/events.js)
 * и [server/services/auctionService.js](server/services/auctionService.js).
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Animated, Easing, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import LoyaltyCardService from '../../services/LoyaltyCardService';
import { spacing, borderRadius } from '../../constants/theme';

const NAVY = '#063B5C';

const LEVEL_LABELS = { silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };
const LEVEL_ORDER  = { bronze: 0, silver: 1, gold: 2, platinum: 3 };

const userMeetsLevel = (userLevel, requiredLevel) => {
  const u = (userLevel || 'Bronze').toLowerCase();
  const r = (requiredLevel || 'all').toLowerCase();
  if (r === 'all' || r === 'bronze') return true;
  return (LEVEL_ORDER[u] ?? 0) >= (LEVEL_ORDER[r] ?? 0);
};

const parseRuDate = (str) => {
  if (!str || typeof str !== 'string') return null;
  const [d, m, y] = str.split('.');
  if (!d || !m || !y) return null;
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const formatTimeLeft = (ms) => {
  if (ms <= 0) return 'Завершён';
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins  = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}д ${hours}ч`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
};

// Машинно-читаемые коды ошибок placeBid → человеческие тексты.
const BID_ERROR_MESSAGES = {
  event_not_found:        'Аукцион не найден',
  not_auction:            'Это событие не является аукционом',
  not_active:             'Аукцион сейчас неактивен',
  already_closed:         'Аукцион уже завершён',
  outside_window:         'Аукцион ещё не начался или уже завершился',
  level_required:         'Доступно только для участников вашего уровня и выше',
  bid_below_start:        'Ставка ниже стартовой',
  bid_below_min_increment: 'Ставка должна быть больше текущей минимум на минимальный шаг',
  self_outbid:            'Вы уже лидируете — поднять ставку нужно как минимум на шаг',
  insufficient_available: 'Недостаточно доступных средств на карте',
  invalid_amount:         'Сумма ставки некорректна',
  loyalty_card_missing:   'Карта лояльности не найдена',
  network_error:          'Не удалось связаться с сервером',
  unknown:                'Не удалось сделать ставку',
};

export default function AuctionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params || {};
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();
  const { events, placeBid, getAuctionBids, refreshEvents } = useEvents();

  const event = useMemo(
    () => events.find((e) => String(e.id) === String(eventId)),
    [events, eventId]
  );

  const [card, setCard] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(null);
  const [now, setNow] = useState(Date.now());

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const SCREEN_H = Dimensions.get('window').height;

  // Часы каждую секунду — для отсчёта оставшегося времени.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadCard = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await LoyaltyCardService.getCard(user.id);
      setCard(data);
      setCardError(null);
    } catch (e) {
      setCardError(e.message);
    }
  }, [user?.id]);

  const loadBids = useCallback(async () => {
    if (!eventId) return;
    setBidsLoading(true);
    try {
      const list = await getAuctionBids(eventId);
      setBids(list);
    } finally {
      setBidsLoading(false);
    }
  }, [eventId, getAuctionBids]);

  useEffect(() => { loadCard(); }, [loadCard]);
  useEffect(() => { loadBids(); }, [loadBids]);

  const endDateObj   = parseRuDate(event?.endDate);
  const endMs        = endDateObj ? endDateObj.getTime() + 24 * 3600 * 1000 - 1 : 0;
  const startDateObj = parseRuDate(event?.startDate);
  const startMs      = startDateObj ? startDateObj.getTime() : 0;
  const isUpcoming   = startMs > now;
  const isClosed     = Boolean(event?.closedAt) || endMs < now;
  const timeLeftMs   = isUpcoming ? startMs - now : Math.max(0, endMs - now);

  const currentBid    = event?.currentBid != null ? Number(event.currentBid) : null;
  const startBid      = event?.startBid != null ? Number(event.startBid) : 0;
  const increment     = event?.minBidIncrement != null ? Number(event.minBidIncrement) : 100;
  const nextMinBid    = currentBid != null ? currentBid + increment : startBid;
  const userIsLeading = currentBid != null && event?.currentBidUserId === user?.id;
  const userIsWinner  = event?.winnerUserId === user?.id;

  const balance       = card ? Number(card.balance) : 0;
  const lockedBalance = card ? Number(card.lockedBalance || 0) : 0;
  const available     = card ? Number(card.availableBalance ?? (balance - lockedBalance)) : 0;

  const levelOk = userMeetsLevel(user?.membershipLevel, event?.allowedUsers);

  const openBidSheet = () => {
    setBidAmount(String(nextMinBid));
    setBidError(null);
    setBidSuccess(null);
    setBidModalVisible(true);
    sheetAnim.setValue(0);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const closeBidSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setBidModalVisible(false);
    });
  };

  const handleSubmitBid = async () => {
    setBidError(null);
    setBidSuccess(null);
    const num = parseFloat(bidAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setBidError('Введите положительную сумму');
      return;
    }
    if (num < nextMinBid) {
      setBidError(`Минимальная ставка — ${nextMinBid} PRB`);
      return;
    }
    if (num > available) {
      setBidError(`Доступно только ${available} PRB`);
      return;
    }

    setBidSubmitting(true);
    try {
      const result = await placeBid(eventId, num);
      if (!result.success) {
        const msg = BID_ERROR_MESSAGES[result.code] || result.error || BID_ERROR_MESSAGES.unknown;
        const extra = result.deficit != null
          ? ` Не хватает: ${result.deficit} PRB.`
          : (result.requiredAmount != null
            ? ` Требуется: ${result.requiredAmount} PRB.`
            : '');
        setBidError(msg + extra);
        return;
      }
      setBidSuccess(`Ставка ${num} PRB принята`);
      await Promise.all([loadCard(), loadBids(), refreshEvents()]);
      setTimeout(() => closeBidSheet(), 700);
    } finally {
      setBidSubmitting(false);
    }
  };

  // ─── Загрузка / отсутствие события ─────────────────────────────────────────
  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={[styles.note, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Загрузка аукциона...
        </Text>
      </View>
    );
  }

  if (event.eventType !== 'auction') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialIcons name="info-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.note, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Это событие не является аукционом
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const cta = (() => {
    if (isClosed) {
      if (userIsWinner) {
        return { label: 'Вы выиграли аукцион', disabled: true, tone: 'success' };
      }
      return { label: 'Аукцион завершён', disabled: true, tone: 'muted' };
    }
    if (isUpcoming) {
      return { label: 'Аукцион ещё не начался', disabled: true, tone: 'muted' };
    }
    if (!levelOk) {
      const lvl = LEVEL_LABELS[(event.allowedUsers || '').toLowerCase()] || event.allowedUsers;
      return { label: `Только для ${lvl}+`, disabled: true, tone: 'locked' };
    }
    if (userIsLeading) {
      return { label: 'Поднять ставку', disabled: false, tone: 'primary' };
    }
    return { label: 'Сделать ставку', disabled: false, tone: 'primary' };
  })();

  const ctaBg = cta.tone === 'success' ? colors.success
    : cta.tone === 'locked'  ? '#94A3B8'
    : cta.tone === 'muted'   ? '#94A3B8'
    : (event.color || NAVY);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 4 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { borderColor: (event.color || NAVY) + '33', backgroundColor: colors.cardBg }]}>
          <View style={[styles.heroIcon, { backgroundColor: (event.color || NAVY) + '18' }]}>
            <MaterialIcons name={event.icon || 'gavel'} size={32} color={event.color || NAVY} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroEyebrow, { color: event.color || NAVY }]}>
              Аукцион · {event.status}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
              {event.title}
            </Text>
            {Boolean(event.prize) && (
              <Text style={[styles.heroPrize, { color: colors.success }]} numberOfLines={1}>
                Приз: {event.prize}
              </Text>
            )}
          </View>
        </View>

        {/* Описание */}
        {Boolean(event.description) && (
          <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Описание</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{event.description}</Text>
          </View>
        )}

        {/* Состояние аукциона */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Текущая ставка</Text>
          <Text style={[styles.bigBid, { color: colors.text }]}>
            {currentBid != null ? `${currentBid} PRB` : `${startBid} PRB (старт)`}
          </Text>
          {userIsLeading && !isClosed && (
            <View style={styles.leaderPill}>
              <MaterialIcons name="emoji-events" size={14} color="#fff" />
              <Text style={styles.leaderPillText}>Вы лидируете</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="trending-up" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Шаг {increment} PRB
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name={isClosed ? 'event-busy' : 'schedule'} size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {isUpcoming ? `Через ${formatTimeLeft(timeLeftMs)}` : `Осталось ${formatTimeLeft(timeLeftMs)}`}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {event.startDate} — {event.endDate}
              </Text>
            </View>
          </View>
        </View>

        {/* Баланс */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Ваши средства</Text>
          {cardError && (
            <Text style={[styles.error, { color: colors.danger }]}>{cardError}</Text>
          )}
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Доступно</Text>
            <Text style={[styles.balanceValue, { color: colors.text }]}>{available} PRB</Text>
          </View>
          {lockedBalance > 0 && (
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Заблокировано в ставках</Text>
              <Text style={[styles.balanceValue, { color: colors.warning }]}>{lockedBalance} PRB</Text>
            </View>
          )}
        </View>

        {/* История ставок */}
        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <View style={styles.bidsHeader}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>История ставок</Text>
            <TouchableOpacity onPress={loadBids} disabled={bidsLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="refresh" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {bidsLoading ? (
            <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: spacing.md }} />
          ) : bids.length === 0 ? (
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Ставок пока нет — будьте первым
            </Text>
          ) : (
            bids.map((b) => (
              <View key={b.id} style={[styles.bidRow, { borderColor: colors.border }]}>
                <View style={styles.bidLeft}>
                  <MaterialIcons
                    name={b.status === 'won' ? 'emoji-events' : b.status === 'active' ? 'flash-on' : 'history'}
                    size={16}
                    color={b.status === 'won' ? colors.success : b.status === 'active' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.bidUser, { color: b.userId === user?.id ? colors.primary : colors.text }]} numberOfLines={1}>
                    {b.userId === user?.id ? 'Вы' : `Пользователь ${String(b.userId).slice(0, 6)}…`}
                  </Text>
                </View>
                <Text style={[styles.bidAmount, { color: colors.text }]}>{Number(b.amount)} PRB</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* CTA fixed at bottom */}
      <View style={[styles.ctaWrap, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: ctaBg, opacity: cta.disabled ? 0.85 : 1 }]}
          onPress={cta.disabled ? undefined : openBidSheet}
          disabled={cta.disabled}
          activeOpacity={0.85}
        >
          <MaterialIcons name={cta.disabled ? 'lock' : 'gavel'} size={20} color="#fff" />
          <Text style={styles.ctaText}>{cta.label}</Text>
        </TouchableOpacity>
        {!cta.disabled && (
          <Text style={[styles.ctaHint, { color: colors.textSecondary }]}>
            Минимум {nextMinBid} PRB · доступно {available} PRB
          </Text>
        )}
      </View>

      {/* Bid bottom sheet */}
      {bidModalVisible && (
        <Modal visible transparent animationType="none" onRequestClose={closeBidSheet}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeBidSheet}
            />
            <Animated.View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.cardBg,
                  transform: [{
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_H * 0.8, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalEyebrow, { color: event.color || NAVY }]}>
                    Ставка
                  </Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={closeBidSheet}>
                  <MaterialIcons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Сумма ставки, PRB</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  value={bidAmount}
                  onChangeText={(v) => { setBidAmount(v.replace(/[^\d.,]/g, '').replace(',', '.')); setBidError(null); }}
                  editable={!bidSubmitting}
                  placeholder={String(nextMinBid)}
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.modalRow}>
                  <Text style={[styles.modalRowText, { color: colors.textSecondary }]}>Минимум</Text>
                  <Text style={[styles.modalRowText, { color: colors.text }]}>{nextMinBid} PRB</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalRowText, { color: colors.textSecondary }]}>Доступно</Text>
                  <Text style={[styles.modalRowText, { color: colors.text }]}>{available} PRB</Text>
                </View>
                {Boolean(bidError) && (
                  <Text style={[styles.error, { color: colors.danger, marginTop: spacing.sm }]}>{bidError}</Text>
                )}
                {Boolean(bidSuccess) && (
                  <Text style={[styles.success, { color: colors.success, marginTop: spacing.sm }]}>{bidSuccess}</Text>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: event.color || NAVY, opacity: bidSubmitting ? 0.7 : 1 }]}
                  onPress={handleSubmitBid}
                  disabled={bidSubmitting}
                  activeOpacity={0.85}
                >
                  {bidSubmitting
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.submitBtnText}>Поставить</Text>}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  hero:         {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1,
    marginBottom: spacing.md,
  },
  heroIcon:     { width: 56, height: 56, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  heroEyebrow:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  heroTitle:    { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  heroPrize:    { fontSize: 13, fontWeight: '600' },
  card:         { padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.md },
  cardLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  cardText:     { fontSize: 14, lineHeight: 20 },
  bigBid:       { fontSize: 28, fontWeight: '800', marginBottom: spacing.sm },
  leaderPill:   {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#10B981', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
  },
  leaderPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  metaItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 13 },
  balanceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontSize: 15, fontWeight: '700' },
  bidsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  bidRow:       {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bidLeft:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  bidUser:      { fontSize: 14, flex: 1 },
  bidAmount:    { fontSize: 14, fontWeight: '700' },
  note:         { fontSize: 13, textAlign: 'center' },
  error:        { fontSize: 13, fontWeight: '600' },
  success:      { fontSize: 13, fontWeight: '600' },
  ctaWrap:      {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta:          {
    flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', alignItems: 'center',
    paddingVertical: spacing.md, borderRadius: borderRadius.lg,
  },
  ctaText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaHint:      { fontSize: 11, textAlign: 'center', marginTop: spacing.xs },
  backBtn:      { marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: NAVY },
  backBtnText:  { color: '#fff', fontWeight: '700' },
  // ─── Modal ─────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContent:   {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.sm,
    maxHeight: '80%',
  },
  sheetHandle:    { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  modalEyebrow:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  modalTitle:     { fontSize: 16, fontWeight: '800' },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalBody:      { paddingBottom: spacing.md },
  inputLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  input:          {
    borderWidth: 1, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 18, fontWeight: '700', marginBottom: spacing.md,
  },
  modalRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  modalRowText:   { fontSize: 13 },
  submitBtn:      {
    marginTop: spacing.lg,
    paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center',
  },
  submitBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
