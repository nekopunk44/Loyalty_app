import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { GradientView } from '../../components/ui/GradientView';
import { useAuth } from '../../context/AuthContext';
import { usePayment } from '../../context/PaymentContext';
import { useNotification } from '../../context/NotificationContext';

const useNative = Platform.OS !== 'web';

const DARK_BG   = '#060C1A';
const DARK_CARD = '#0D1628';
const DARK_LINE = 'rgba(255,255,255,0.07)';
const ACCENT    = '#FF6B35';
const ACCENT2   = '#FF8C5A';
const TEXT_PRI  = '#FFFFFF';
const TEXT_SEC  = 'rgba(255,255,255,0.5)';

const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 25000];

// ─── Payment method definitions ───────────────────────────────────────────────
// Integration notes per method:
//   card    → Stripe (stripe.com/docs/payments/accept-a-payment)
//             Server creates a PaymentIntent; client uses @stripe/stripe-react-native
//   paypal  → PayPal SDK (developer.paypal.com/sdk/js)
//             Server creates an order, client opens PayPal checkout in a WebView/browser
//   agrprom → Агропромбанк bank transfer — show IBAN/BIC details for manual wire
//   eximbank→ Эксимбанк bank transfer — same approach
const PAYMENT_METHODS = [
  {
    id:    'card',
    label: 'Visa / Mastercard',
    sub:   'Онлайн-оплата картой',
    icon:  'credit-card',
    color: '#3B82F6',
    tag:   'Stripe',
    tagColor: '#635BFF',
  },
  {
    id:    'paypal',
    label: 'PayPal',
    sub:   'Быстрая оплата через PayPal',
    icon:  'language',
    color: '#009CDE',
    tag:   'PayPal',
    tagColor: '#003087',
  },
  {
    id:    'agrprom',
    label: 'Агропромбанк',
    sub:   'Банковский перевод',
    icon:  'account-balance',
    color: '#10B981',
    tag:   'Перевод',
    tagColor: '#065F46',
    bankDetails: {
      bank:    'Агропромбанк',
      iban:    'TJ02 0340 0000 0000 0000 0000',
      bic:     'AGROTJDT',
      account: '20206840300000000001',
      name:    'ООО «Вилла Джаконда»',
    },
  },
  {
    id:    'eximbank',
    label: 'Эксимбанк',
    sub:   'Банковский перевод',
    icon:  'account-balance',
    color: '#8B5CF6',
    tag:   'Перевод',
    tagColor: '#4C1D95',
    bankDetails: {
      bank:    'Эксимбанк Таджикистана',
      iban:    'TJ02 0500 0000 0000 0000 0000',
      bic:     'EXIBTJDT',
      account: '20206840500000000001',
      name:    'ООО «Вилла Джаконда»',
    },
  },
];

export default function CardTopUpScreen({ navigation }) {
  const { user } = useAuth();
  const { topUpCard, getCardBalance, isProcessing, paymentError } = usePayment();
  const { notifyPaymentSuccess } = useNotification();

  const [balance, setBalance]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBankDetails, setShowBankDetails]   = useState(false);

  // Entrance animations
  const headerAnim  = useRef(new Animated.Value(0)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const amountAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;

  // Sheet animation (overlay + sheet move together to avoid staggered darkening)
  const sheetAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadBalance(); }, []);

  const runEntrance = () => {
    [headerAnim, balanceAnim, amountAnim, btnAnim].forEach(a => a.setValue(0));
    Animated.stagger(80, [headerAnim, balanceAnim, amountAnim, btnAnim].map(a =>
      Animated.spring(a, { toValue: 1, tension: 55, friction: 8, useNativeDriver: useNative })
    )).start();
  };

  const loadBalance = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const data = await getCardBalance(user.id);
        setBalance(data?.balance ?? 0);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить баланс');
    } finally {
      setLoading(false);
      runEntrance();
    }
  };

  const openSheet = () => {
    setShowMethodPicker(true);
    sheetAnim.setValue(0);
    Animated.spring(sheetAnim, { toValue: 1, tension: 65, friction: 12, useNativeDriver: useNative }).start();
  };

  const closeSheet = (cb) => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: useNative }).start(() => {
      setShowMethodPicker(false);
      cb?.();
    });
  };

  const animStyle = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
  });

  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod) || PAYMENT_METHODS[0];
  const parsedAmount  = parseFloat(topUpAmount) || 0;
  const amountValid   = parsedAmount > 0 && parsedAmount <= 1000000;
  const isBankTransfer = currentMethod.bankDetails != null;

  const handleContinue = () => {
    if (!amountValid) return;
    if (isBankTransfer) { setShowBankDetails(true); return; }
    setShowConfirmModal(true);
  };

  const handleTopUp = async () => {
    setShowConfirmModal(false);
    try {
      await topUpCard(user.id, parsedAmount, selectedMethod);
      Alert.alert('Готово', `Баланс пополнен на ${parsedAmount.toLocaleString('ru-RU')} ₽`, [
        { text: 'OK', onPress: () => { setTopUpAmount(''); loadBalance(); notifyPaymentSuccess?.(); } },
      ]);
    } catch (e) {
      Alert.alert('Ошибка', e.message || 'Не удалось пополнить счёт');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <Animated.View style={animStyle(headerAnim)}>
          <GradientView colors={['#1A0A3C', '#0D1628', '#060C1A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <View style={styles.heroIconWrap}>
              <View style={styles.heroIconGlow} />
              <View style={styles.heroIconRing}>
                <MaterialIcons name="account-balance-wallet" size={32} color={ACCENT} />
              </View>
            </View>
            <Text style={styles.heroTitle}>Пополнение счёта</Text>
            <Text style={styles.heroSub}>Безопасные платежи</Text>
          </GradientView>
        </Animated.View>

        {/* ── BALANCE ── */}
        <Animated.View style={[styles.balanceCard, animStyle(balanceAnim)]}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceLabel}>Текущий баланс</Text>
            <Text style={styles.balanceAmount}>{balance.toLocaleString('ru-RU')}</Text>
            <Text style={styles.balanceCurrency}>PRB</Text>
          </View>
          <TouchableOpacity style={styles.balanceRefreshBtn} onPress={loadBalance}>
            <MaterialIcons name="refresh" size={20} color={ACCENT} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={animStyle(amountAnim)}>
          {/* ── PRESET AMOUNTS ── */}
          <Text style={styles.sectionLabel}>Выберите сумму</Text>
          <View style={styles.presetsGrid}>
            {PRESET_AMOUNTS.map(amt => {
              const active = topUpAmount === amt.toString();
              return (
                <TouchableOpacity key={amt} style={[styles.presetBtn, active && styles.presetBtnActive]} onPress={() => setTopUpAmount(amt.toString())} activeOpacity={0.75}>
                  {active && <GradientView colors={[ACCENT, ACCENT2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>{amt.toLocaleString('ru-RU')} ₽</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── CUSTOM INPUT ── */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputCurrencyPfx}>₽</Text>
            <TextInput
              style={styles.input}
              placeholder="Другая сумма"
              placeholderTextColor={TEXT_SEC}
              keyboardType="decimal-pad"
              value={topUpAmount}
              onChangeText={t => setTopUpAmount(t.replace(/[^0-9.]/g, ''))}
            />
            {topUpAmount !== '' && (
              <TouchableOpacity onPress={() => setTopUpAmount('')} style={styles.inputClear}>
                <MaterialIcons name="close" size={18} color={TEXT_SEC} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── PAYMENT METHOD ── */}
          <Text style={styles.sectionLabel}>Способ оплаты</Text>
          <TouchableOpacity style={styles.methodRow} onPress={openSheet} activeOpacity={0.8}>
            <View style={[styles.methodIcon, { backgroundColor: `${currentMethod.color}20` }]}>
              <MaterialIcons name={currentMethod.icon} size={20} color={currentMethod.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{currentMethod.label}</Text>
              <Text style={styles.methodSub}>{currentMethod.sub}</Text>
            </View>
            <View style={[styles.methodTag, { backgroundColor: `${currentMethod.tagColor}30` }]}>
              <Text style={[styles.methodTagText, { color: currentMethod.color }]}>{currentMethod.tag}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={TEXT_SEC} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {/* Bank transfer notice */}
          {isBankTransfer && (
            <View style={styles.noticeRow}>
              <MaterialIcons name="info-outline" size={15} color="#F59E0B" />
              <Text style={styles.noticeText}>После оплаты баланс будет зачислен в течение 1–2 рабочих дней</Text>
            </View>
          )}

          {/* Real integration note */}
          <View style={styles.integrationRow}>
            <MaterialIcons name="lock" size={13} color={TEXT_SEC} />
            <Text style={styles.integrationText}>
              {selectedMethod === 'card'    && 'Платёж через Stripe — данные карты не хранятся на сервере'}
              {selectedMethod === 'paypal'  && 'Платёж через официальный шлюз PayPal'}
              {selectedMethod === 'agrprom' && 'Перевод на счёт Агропромбанка — реквизиты откроются после нажатия кнопки'}
              {selectedMethod === 'eximbank'&& 'Перевод на счёт Эксимбанка — реквизиты откроются после нажатия кнопки'}
            </Text>
          </View>

          {!!paymentError && (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color="#F87171" />
              <Text style={styles.errorText}>{paymentError}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* ── BOTTOM BUTTON ── */}
      <Animated.View style={[styles.bottomBar, animStyle(btnAnim)]}>
        <TouchableOpacity
          style={[styles.payBtn, !amountValid && styles.payBtnDisabled]}
          onPress={handleContinue}
          disabled={!amountValid || isProcessing}
          activeOpacity={0.85}
        >
          <GradientView
            colors={amountValid ? [ACCENT, ACCENT2] : ['#1e2a3a', '#1e2a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name={isBankTransfer ? 'receipt-long' : 'add'} size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>
                {!amountValid
                  ? 'Введите сумму'
                  : isBankTransfer
                    ? `Получить реквизиты — ${parsedAmount.toLocaleString('ru-RU')} ₽`
                    : `Оплатить ${parsedAmount.toLocaleString('ru-RU')} ₽`
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── METHOD PICKER (animated manually so overlay + sheet move together) ── */}
      <Modal visible={showMethodPicker} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[styles.sheetOverlay, { opacity: sheetAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeSheet()} activeOpacity={1} />
          <Animated.View style={[styles.sheet, {
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
          }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Способ оплаты</Text>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.sheetMethod, selectedMethod === m.id && styles.sheetMethodActive]}
                onPress={() => closeSheet(() => setSelectedMethod(m.id))}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIcon, { backgroundColor: `${m.color}20` }]}>
                  <MaterialIcons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetMethodName}>{m.label}</Text>
                  <Text style={styles.sheetMethodSub}>{m.sub}</Text>
                </View>
                <View style={[styles.methodTag, { backgroundColor: `${m.tagColor}30` }]}>
                  <Text style={[styles.methodTagText, { color: m.color }]}>{m.tag}</Text>
                </View>
                {selectedMethod === m.id && (
                  <MaterialIcons name="check-circle" size={20} color={ACCENT} style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── BANK DETAILS MODAL ── */}
      <Modal visible={showBankDetails} transparent animationType="fade" onRequestClose={() => setShowBankDetails(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <GradientView colors={['#052e16', '#0D1628']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmHeader}>
              <View style={[styles.confirmIconWrap, { backgroundColor: `${currentMethod.color}20`, borderColor: `${currentMethod.color}40` }]}>
                <MaterialIcons name="account-balance" size={28} color={currentMethod.color} />
              </View>
              <Text style={styles.confirmTitle}>Реквизиты для перевода</Text>
              <Text style={styles.confirmSubtitle}>{parsedAmount.toLocaleString('ru-RU')} ₽</Text>
            </GradientView>

            <View style={styles.confirmBody}>
              {currentMethod.bankDetails && Object.entries({
                'Банк':     currentMethod.bankDetails.bank,
                'Название': currentMethod.bankDetails.name,
                'IBAN':     currentMethod.bankDetails.iban,
                'БИК':      currentMethod.bankDetails.bic,
                'Счёт':     currentMethod.bankDetails.account,
                'Назначение': `Пополнение карты лояльности ID ${user?.id}`,
              }).map(([label, value], i, arr) => (
                <View key={label} style={[styles.confirmRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.confirmLabel}>{label}</Text>
                  <Text style={[styles.confirmValue, { flex: 1, textAlign: 'right', fontSize: 13 }]}>{value}</Text>
                </View>
              ))}

              <View style={styles.bankNotice}>
                <MaterialIcons name="info-outline" size={14} color="#F59E0B" />
                <Text style={styles.bankNoticeText}>После перевода отправьте скриншот чека администратору для ручного зачисления</Text>
              </View>
            </View>

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={styles.confirmPay}
                onPress={() => { setShowBankDetails(false); setTopUpAmount(''); }}
                activeOpacity={0.85}
              >
                <GradientView colors={[currentMethod.color, currentMethod.color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmPayText}>Понятно</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowBankDetails(false)}>
                <Text style={styles.confirmCancelText}>Назад</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CONFIRM MODAL (card / paypal) ── */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <GradientView colors={['#1A0A3C', '#0D1628']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmHeader}>
              <View style={styles.confirmIconWrap}>
                <MaterialIcons name={selectedMethod === 'paypal' ? 'language' : 'credit-card'} size={28} color={currentMethod.color} />
              </View>
              <Text style={styles.confirmTitle}>Подтверждение</Text>
              <Text style={styles.confirmSubtitle}>{parsedAmount.toLocaleString('ru-RU')} ₽</Text>
            </GradientView>

            <View style={styles.confirmBody}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Сумма</Text>
                <Text style={[styles.confirmValue, { color: ACCENT }]}>{parsedAmount.toLocaleString('ru-RU')} ₽</Text>
              </View>
              <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.confirmLabel}>Способ оплаты</Text>
                <Text style={styles.confirmValue}>{currentMethod.label}</Text>
              </View>
            </View>

            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmPay} onPress={handleTopUp} disabled={isProcessing} activeOpacity={0.85}>
                <GradientView colors={[ACCENT, ACCENT2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                {isProcessing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmPayText}>Оплатить</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowConfirmModal(false)} disabled={isProcessing}>
                <Text style={styles.confirmCancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: DARK_BG },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG },
  scroll:      { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  // Hero
  hero: { paddingTop: spacing.xl + 8, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  backBtn: {
    position: 'absolute', top: spacing.lg, left: spacing.lg,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center',
  },
  heroIconWrap: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  heroIconGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 36, backgroundColor: `${ACCENT}25`, transform: [{ scale: 1.4 }] },
  heroIconRing: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 1.5, borderColor: `${ACCENT}50`,
    backgroundColor: `${ACCENT}15`, justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: TEXT_PRI, marginBottom: 4 },
  heroSub:   { fontSize: 13, color: TEXT_SEC },

  // Balance
  balanceCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: DARK_CARD, borderRadius: borderRadius.xl,
    padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: DARK_LINE,
  },
  balanceLeft:       { flex: 1 },
  balanceLabel:      { fontSize: 12, color: TEXT_SEC, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  balanceAmount:     { fontSize: 36, fontWeight: '800', color: TEXT_PRI, lineHeight: 42 },
  balanceCurrency:   { fontSize: 13, color: ACCENT, fontWeight: '700', marginTop: 2 },
  balanceRefreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${ACCENT}15`, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: TEXT_SEC,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg,
  },

  // Presets
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  presetBtn: {
    width: '31%', paddingVertical: 14,
    borderRadius: borderRadius.lg, backgroundColor: DARK_CARD,
    borderWidth: 1, borderColor: DARK_LINE, alignItems: 'center', overflow: 'hidden',
  },
  presetBtnActive: { borderColor: ACCENT },
  presetText:      { fontSize: 13, fontWeight: '600', color: TEXT_SEC },
  presetTextActive:{ color: '#fff', fontWeight: '700' },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: DARK_CARD, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: DARK_LINE, paddingHorizontal: spacing.md,
  },
  inputCurrencyPfx: { fontSize: 20, fontWeight: '700', color: ACCENT, marginRight: spacing.sm },
  input:            { flex: 1, fontSize: 18, fontWeight: '600', color: TEXT_PRI, paddingVertical: spacing.md },
  inputClear:       { padding: 6 },

  // Method row
  methodRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, backgroundColor: DARK_CARD,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: DARK_LINE,
    padding: spacing.md, gap: spacing.sm,
  },
  methodIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  methodName: { fontSize: 15, fontWeight: '600', color: TEXT_PRI, marginBottom: 2 },
  methodSub:  { fontSize: 12, color: TEXT_SEC },
  methodTag:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  methodTagText: { fontSize: 11, fontWeight: '700' },

  noticeRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
  },
  noticeText: { fontSize: 12, color: '#F59E0B', flex: 1, lineHeight: 17 },

  integrationRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
  },
  integrationText: { fontSize: 12, color: TEXT_SEC, flex: 1, lineHeight: 17 },

  errorRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.sm, gap: 6 },
  errorText: { fontSize: 13, color: '#F87171', flex: 1 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: spacing.xl,
    backgroundColor: `${DARK_BG}EE`, borderTopWidth: 1, borderTopColor: DARK_LINE,
  },
  payBtn:         { height: 54, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', overflow: 'hidden' },
  payBtnDisabled: { opacity: 0.45 },
  payBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Sheet (method picker)
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: DARK_CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: spacing.xl + 8, paddingTop: spacing.md, paddingHorizontal: spacing.lg,
  },
  sheetHandle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: DARK_LINE, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: TEXT_PRI, marginBottom: spacing.lg },
  sheetMethod:     { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.lg, paddingHorizontal: spacing.sm, gap: spacing.sm, marginBottom: spacing.xs },
  sheetMethodActive: { backgroundColor: `${ACCENT}10` },
  sheetMethodName: { fontSize: 15, fontWeight: '600', color: TEXT_PRI, marginBottom: 2 },
  sheetMethodSub:  { fontSize: 12, color: TEXT_SEC },

  // Confirm / bank details modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', paddingHorizontal: spacing.lg },
  confirmCard:    { backgroundColor: DARK_CARD, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: DARK_LINE },
  confirmHeader:  { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  confirmIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: `${ACCENT}20`, borderWidth: 1, borderColor: `${ACCENT}40`,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  confirmTitle:    { fontSize: 18, fontWeight: '700', color: TEXT_PRI },
  confirmSubtitle: { fontSize: 15, fontWeight: '700', color: ACCENT, marginTop: 4 },
  confirmBody:     { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  confirmRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: DARK_LINE },
  confirmLabel:    { fontSize: 13, color: TEXT_SEC },
  confirmValue:    { fontSize: 14, fontWeight: '700', color: TEXT_PRI },
  confirmBtns:     { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  confirmPay:      { height: 50, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  confirmPayText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
  confirmCancel:   { height: 44, justifyContent: 'center', alignItems: 'center' },
  confirmCancelText: { fontSize: 15, color: TEXT_SEC },

  bankNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md, padding: spacing.md, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: borderRadius.md },
  bankNoticeText: { fontSize: 12, color: '#F59E0B', flex: 1, lineHeight: 17 },
});
