import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useTheme } from '../../context/ThemeContext';

const useNative = Platform.OS !== 'web';

const ACCENT  = '#FF6B35';
const ACCENT2 = '#FF8C5A';

const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 25000];

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

// Курсы PRB ↔ внешние валюты (синхронизированы со server/.env: PRB_RATE_*).
// На клиенте используются только для превью конвертации; авторитетный
// курс — на сервере при создании Stripe-сессии.
const PRB_RATES = {
  RUB: 0.18,
  USD: 16.10,
};

export default function CardTopUpScreen({ navigation, onClose }) {
  const isSheet = !!onClose;
  const { user } = useAuth();
  const { topUpCard, topUpCardStripe, getCardBalance, isProcessing, paymentError } = usePayment();
  const { notifyTopup } = useNotification();
  const { isDark, theme } = useTheme();

  const {
    background: bg,
    cardBg,
    border: line,
    text: textPri,
    textSecondary: textSec,
  } = theme.colors;

  const styles = useMemo(
    () => makeStyles({ bg, cardBg, line, textPri, textSec, isDark }),
    [isDark],
  );

  const confirmHeaderGrad = isDark ? ['#1A0A3C', '#0D1628'] : ['#FFF7F0', '#FFECD6'];
  const bankHeaderGrad    = isDark ? ['#052e16', '#0D1628'] : ['#F0FDF4', '#ECFDF5'];

  const [balance, setBalance]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [currency, setCurrency]       = useState('RUB');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBankDetails, setShowBankDetails]   = useState(false);

  const headerAnim  = useRef(new Animated.Value(0)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const amountAnim  = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
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
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  const currentMethod  = PAYMENT_METHODS.find(m => m.id === selectedMethod) || PAYMENT_METHODS[0];
  const parsedAmount   = parseFloat(topUpAmount) || 0;
  const amountValid    = parsedAmount > 0 && parsedAmount <= 1000000;
  const isBankTransfer = currentMethod.bankDetails != null;
  const isOnlineGateway = selectedMethod === 'card' || selectedMethod === 'paypal';

  // Конвертация PRB → внешняя валюта (для превью; авторитет — сервер)
  const providerAmount = parsedAmount > 0
    ? +(parsedAmount / PRB_RATES[currency]).toFixed(2)
    : 0;
  const currencySymbol = currency === 'USD' ? '$' : '₽';

  const handleContinue = () => {
    if (!amountValid) return;
    if (isBankTransfer) { setShowBankDetails(true); return; }
    setShowConfirmModal(true);
  };

  const handleTopUp = async () => {
    setShowConfirmModal(false);
    try {
      if (selectedMethod === 'card') {
        const result = await topUpCardStripe(user.id, parsedAmount, currency);
        if (result?.success) {
          notifyTopup?.(parsedAmount, 'Stripe');
          Alert.alert(
            'Готово',
            `Баланс пополнен на ${parsedAmount.toLocaleString('ru-RU')} PRB`,
            [{ text: 'OK', onPress: () => { setTopUpAmount(''); loadBalance(); } }],
          );
        } else if (result?.status === 'cancelled') {
          // Пользователь закрыл браузер — молча, ничего не показываем
        } else if (result?.status === 'failed') {
          Alert.alert('Ошибка', 'Платёж был отклонён или истёк. Попробуйте ещё раз.');
        } else {
          Alert.alert(
            'Платёж в обработке',
            'Не удалось подтвердить оплату за отведённое время. Если средства списаны — баланс обновится в ближайшее время.',
            [{ text: 'OK', onPress: () => loadBalance() }],
          );
        }
        return;
      }

      // PayPal и банковские переводы — старый flow (демо/manual)
      await topUpCard(user.id, parsedAmount, selectedMethod);
      notifyTopup?.(parsedAmount, selectedMethod === 'paypal' ? 'PayPal' : 'банковский перевод');
      Alert.alert('Готово', `Баланс пополнен на ${parsedAmount.toLocaleString('ru-RU')} PRB`, [
        { text: 'OK', onPress: () => { setTopUpAmount(''); loadBalance(); } },
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

      {/* ── SHEET HEADER ── */}
      {isSheet && (
        <Animated.View style={[styles.sheetHeader, animStyle(headerAnim)]}>
          <View style={styles.sheetHeaderIcon}>
            <MaterialIcons name="account-balance-wallet" size={22} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetHeaderTitle}>Пополнение счёта</Text>
            <Text style={styles.sheetHeaderSub}>Безопасные платежи</Text>
          </View>
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
            <MaterialIcons name="close" size={20} color={textSec} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HERO (full-screen only) ── */}
        {!isSheet && (
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
        )}

        {/* ── BALANCE CARD ── */}
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
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetBtn, active && styles.presetBtnActive]}
                  onPress={() => setTopUpAmount(amt.toString())}
                  activeOpacity={0.7}
                >
                  {active && (
                    <GradientView
                      colors={[ACCENT, ACCENT2]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>
                    {amt.toLocaleString('ru-RU')} PRB
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── CUSTOM INPUT ── */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>PRB</Text>
            <TextInput
              style={styles.input}
              placeholder="Другая сумма"
              placeholderTextColor={textSec}
              keyboardType="decimal-pad"
              value={topUpAmount}
              onChangeText={t => setTopUpAmount(t.replace(/[^0-9.]/g, ''))}
            />
            {topUpAmount !== '' && (
              <TouchableOpacity onPress={() => setTopUpAmount('')} style={styles.inputClear}>
                <MaterialIcons name="close" size={17} color={textSec} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── CURRENCY TOGGLE + CONVERSION (только для онлайн-шлюзов) ── */}
          {isOnlineGateway && (
            <View style={styles.currencyRow}>
              <View style={styles.currencyToggle}>
                {['RUB', 'USD'].map(c => {
                  const active = currency === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.currencyChip, active && styles.currencyChipActive]}
                      onPress={() => setCurrency(c)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.currencyChipText, active && styles.currencyChipTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {parsedAmount > 0 && (
                <Text style={styles.conversionText}>
                  ≈ <Text style={styles.conversionValue}>
                    {providerAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currencySymbol}
                  </Text>
                </Text>
              )}
            </View>
          )}

          {/* ── PAYMENT METHOD ── */}
          <Text style={styles.sectionLabel}>Способ оплаты</Text>
          <TouchableOpacity style={styles.methodRow} onPress={openSheet} activeOpacity={0.8}>
            <View style={[styles.methodIcon, { backgroundColor: `${currentMethod.color}18` }]}>
              <MaterialIcons name={currentMethod.icon} size={20} color={currentMethod.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodName}>{currentMethod.label}</Text>
              <Text style={styles.methodSub}>{currentMethod.sub}</Text>
            </View>
            <View style={[styles.methodTag, { backgroundColor: `${currentMethod.tagColor}20` }]}>
              <Text style={[styles.methodTagText, { color: currentMethod.color }]}>{currentMethod.tag}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={textSec} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {isBankTransfer && (
            <View style={styles.noticeRow}>
              <MaterialIcons name="info-outline" size={14} color="#F59E0B" />
              <Text style={styles.noticeText}>Зачисление в течение 1–2 рабочих дней</Text>
            </View>
          )}

          <View style={styles.secureRow}>
            <MaterialIcons name="lock" size={12} color={textSec} />
            <Text style={styles.secureText}>
              {selectedMethod === 'card'    && 'Платёж через Stripe — данные карты не хранятся'}
              {selectedMethod === 'paypal'  && 'Официальный шлюз PayPal'}
              {selectedMethod === 'agrprom' && 'Реквизиты Агропромбанка откроются после нажатия кнопки'}
              {selectedMethod === 'eximbank'&& 'Реквизиты Эксимбанка откроются после нажатия кнопки'}
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
            colors={amountValid ? [ACCENT, ACCENT2] : (isDark ? ['#1e2a3a', '#1e2a3a'] : ['#D1D5DB', '#D1D5DB'])}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons
                name={isBankTransfer ? 'receipt-long' : 'add'}
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.payBtnText}>
                {!amountValid
                  ? 'Введите сумму'
                  : isBankTransfer
                    ? `Получить реквизиты — ${parsedAmount.toLocaleString('ru-RU')} PRB`
                    : `Оплатить ${providerAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${currencySymbol}`
                }
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── METHOD PICKER SHEET ── */}
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
                <View style={[styles.methodIcon, { backgroundColor: `${m.color}18` }]}>
                  <MaterialIcons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetMethodName}>{m.label}</Text>
                  <Text style={styles.sheetMethodSub}>{m.sub}</Text>
                </View>
                <View style={[styles.methodTag, { backgroundColor: `${m.tagColor}20` }]}>
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
            <GradientView colors={bankHeaderGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmHeader}>
              <View style={[styles.confirmIconWrap, { backgroundColor: `${currentMethod.color}20`, borderColor: `${currentMethod.color}40` }]}>
                <MaterialIcons name="account-balance" size={28} color={currentMethod.color} />
              </View>
              <Text style={styles.confirmTitle}>Реквизиты для перевода</Text>
              <Text style={styles.confirmSubtitle}>{parsedAmount.toLocaleString('ru-RU')} PRB</Text>
            </GradientView>
            <View style={styles.confirmBody}>
              {currentMethod.bankDetails && Object.entries({
                'Банк':       currentMethod.bankDetails.bank,
                'Название':   currentMethod.bankDetails.name,
                'IBAN':       currentMethod.bankDetails.iban,
                'БИК':        currentMethod.bankDetails.bic,
                'Счёт':       currentMethod.bankDetails.account,
                'Назначение': `Пополнение карты лояльности ID ${user?.id}`,
              }).map(([label, value], i, arr) => (
                <View key={label} style={[styles.confirmRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.confirmLabel}>{label}</Text>
                  <Text style={[styles.confirmValue, { flex: 1, textAlign: 'right', fontSize: 13 }]}>{value}</Text>
                </View>
              ))}
              <View style={styles.bankNotice}>
                <MaterialIcons name="info-outline" size={14} color="#F59E0B" />
                <Text style={styles.bankNoticeText}>После перевода отправьте скриншот чека администратору</Text>
              </View>
            </View>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmPay} onPress={() => { setShowBankDetails(false); setTopUpAmount(''); }} activeOpacity={0.85}>
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

      {/* ── CONFIRM MODAL ── */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <GradientView colors={confirmHeaderGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmHeader}>
              <View style={styles.confirmIconWrap}>
                <MaterialIcons name={selectedMethod === 'paypal' ? 'language' : 'credit-card'} size={28} color={currentMethod.color} />
              </View>
              <Text style={styles.confirmTitle}>Подтверждение</Text>
              <Text style={styles.confirmSubtitle}>{parsedAmount.toLocaleString('ru-RU')} PRB</Text>
            </GradientView>
            <View style={styles.confirmBody}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Зачислится на баланс</Text>
                <Text style={[styles.confirmValue, { color: ACCENT }]}>{parsedAmount.toLocaleString('ru-RU')} PRB</Text>
              </View>
              {isOnlineGateway && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>К оплате</Text>
                  <Text style={styles.confirmValue}>
                    {providerAmount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currencySymbol}
                  </Text>
                </View>
              )}
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

function makeStyles({ bg, cardBg, line, textPri, textSec, isDark }) {
  const handleColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const bottomBarBg = isDark ? `${bg}F0` : `${bg}F8`;

  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: bg },
    loadingWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 120 },

    // Sheet header
    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: line,
      backgroundColor: bg,
    },
    sheetHeaderIcon: {
      width: 42, height: 42, borderRadius: 13,
      backgroundColor: `${ACCENT}12`,
      justifyContent: 'center', alignItems: 'center',
    },
    sheetHeaderTitle: { fontSize: 16, fontWeight: '700', color: textPri },
    sheetHeaderSub:   { fontSize: 12, color: textSec, marginTop: 1 },
    sheetCloseBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center', alignItems: 'center',
    },

    // Full-screen hero
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
    heroTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.55)' },

    // Balance card
    balanceCard: {
      marginHorizontal: spacing.lg, marginTop: spacing.lg,
      backgroundColor: cardBg, borderRadius: borderRadius.xl,
      padding: spacing.lg, flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: line,
    },
    balanceLeft:       { flex: 1 },
    balanceLabel:      { fontSize: 12, color: textSec, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    balanceAmount:     { fontSize: 36, fontWeight: '800', color: textPri, lineHeight: 42 },
    balanceCurrency:   { fontSize: 13, color: ACCENT, fontWeight: '700', marginTop: 2 },
    balanceRefreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${ACCENT}15`, justifyContent: 'center', alignItems: 'center' },

    // Sections
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: textSec,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg,
    },

    // Preset grid
    presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: 8 },
    presetBtn: {
      width: '31%', paddingVertical: 14,
      borderRadius: 14, backgroundColor: cardBg,
      borderWidth: 1.5, borderColor: line,
      alignItems: 'center', overflow: 'hidden',
      shadowColor: isDark ? '#000' : '#94A3B8',
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 1,
    },
    presetBtnActive:  { borderColor: ACCENT },
    presetText:       { fontSize: 14, fontWeight: '700', color: textPri },
    presetTextActive: { color: '#fff' },

    // Custom input
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: spacing.lg, marginTop: 8,
      backgroundColor: cardBg, borderRadius: 14,
      borderWidth: 1.5, borderColor: line,
      paddingHorizontal: spacing.md,
    },
    inputPrefix: { fontSize: 14, fontWeight: '700', color: ACCENT, marginRight: spacing.sm, letterSpacing: 0.5 },
    input:       { flex: 1, fontSize: 17, fontWeight: '600', color: textPri, paddingVertical: 14 },
    inputClear:  { padding: 6 },

    // Currency toggle row
    currencyRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: spacing.lg, marginTop: spacing.sm,
      gap: spacing.md,
    },
    currencyToggle: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderRadius: 10, padding: 3,
      borderWidth: 1, borderColor: line,
    },
    currencyChip: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 8,
    },
    currencyChipActive: { backgroundColor: cardBg, borderWidth: 1, borderColor: `${ACCENT}40` },
    currencyChipText: { fontSize: 12, fontWeight: '700', color: textSec, letterSpacing: 0.4 },
    currencyChipTextActive: { color: ACCENT },
    conversionText: { fontSize: 13, color: textSec, flexShrink: 1, textAlign: 'right' },
    conversionValue: { fontWeight: '700', color: textPri },

    // Method row
    methodRow: {
      flexDirection: 'row', alignItems: 'center',
      marginHorizontal: spacing.lg, backgroundColor: cardBg,
      borderRadius: 14, borderWidth: 1.5, borderColor: line,
      padding: spacing.md, gap: spacing.sm,
    },
    methodIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    methodName:    { fontSize: 15, fontWeight: '600', color: textPri, marginBottom: 2 },
    methodSub:     { fontSize: 12, color: textSec },
    methodTag:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
    methodTagText: { fontSize: 11, fontWeight: '700' },

    noticeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginHorizontal: spacing.lg, marginTop: spacing.sm,
    },
    noticeText: { fontSize: 12, color: '#F59E0B', flex: 1, lineHeight: 17 },

    secureRow: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      marginHorizontal: spacing.lg, marginTop: spacing.md,
    },
    secureText: { fontSize: 12, color: textSec, flex: 1, lineHeight: 17 },

    errorRow:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.sm, gap: 6 },
    errorText: { fontSize: 13, color: '#F87171', flex: 1 },

    // Bottom bar
    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: spacing.lg, paddingBottom: spacing.xl,
      backgroundColor: bottomBarBg, borderTopWidth: 1, borderTopColor: line,
    },
    payBtn:         { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', overflow: 'hidden' },
    payBtnDisabled: { opacity: 0.5 },
    payBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },

    // Method picker sheet
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: spacing.xl + 8, paddingTop: spacing.md, paddingHorizontal: spacing.lg,
    },
    sheetHandle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: handleColor, alignSelf: 'center', marginBottom: spacing.lg },
    sheetTitle:        { fontSize: 17, fontWeight: '700', color: textPri, marginBottom: spacing.lg },
    sheetMethod:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 12, paddingHorizontal: spacing.sm, gap: spacing.sm, marginBottom: 4 },
    sheetMethodActive: { backgroundColor: `${ACCENT}10` },
    sheetMethodName:   { fontSize: 15, fontWeight: '600', color: textPri, marginBottom: 2 },
    sheetMethodSub:    { fontSize: 12, color: textSec },

    // Confirm modals
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', paddingHorizontal: spacing.lg },
    confirmCard:    { backgroundColor: cardBg, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: line },
    confirmHeader:  { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
    confirmIconWrap: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: `${ACCENT}20`, borderWidth: 1, borderColor: `${ACCENT}40`,
      justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
    },
    confirmTitle:    { fontSize: 18, fontWeight: '700', color: textPri },
    confirmSubtitle: { fontSize: 15, fontWeight: '700', color: ACCENT, marginTop: 4 },
    confirmBody:     { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    confirmRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: line },
    confirmLabel:    { fontSize: 13, color: textSec },
    confirmValue:    { fontSize: 14, fontWeight: '700', color: textPri },
    confirmBtns:     { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
    confirmPay:      { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    confirmPayText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
    confirmCancel:   { height: 44, justifyContent: 'center', alignItems: 'center' },
    confirmCancelText: { fontSize: 15, color: textSec },

    bankNotice:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md, padding: spacing.md, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10 },
    bankNoticeText: { fontSize: 12, color: '#F59E0B', flex: 1, lineHeight: 17 },
  });
}
