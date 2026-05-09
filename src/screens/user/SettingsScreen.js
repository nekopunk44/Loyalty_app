import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Animated, Platform, Image, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from './NotificationCenter';
import * as ImagePicker from 'expo-image-picker';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const AMBER = '#F59E0B';
const CORAL = '#FF6B35';
const AVATAR_KEY   = '@user_avatar_uri';
const RULES_KEY    = '@loyalty_rules_v2';
const CONTACT_KEY  = '@loyalty_contact_v1';

const DEFAULT_RULES = {
  levels: [
    { name: 'Bronze',   range: '0 – 10 000 PRB',       bonus: '+0% кешбек',   color: '#CD7F32', icon: 'military-tech' },
    { name: 'Silver',   range: '10 000 – 50 000 PRB',  bonus: '+0.5% кешбек', color: '#94A3B8', icon: 'workspace-premium' },
    { name: 'Gold',     range: '50 000 – 200 000 PRB', bonus: '+1% кешбек',   color: '#F59E0B', icon: 'star' },
    { name: 'Platinum', range: '200 000+ PRB',          bonus: '+2% кешбек',   color: '#8B5CF6', icon: 'diamond' },
  ],
  rules: [
    { text: 'Каждая покупка даёт 1% кешбека',                             icon: 'percent',        color: '#10B981' },
    { text: 'Накопленные бонусы можно использовать как оплату',            icon: 'payment',         color: '#06B6D4' },
    { text: 'Статус участника зависит от накопленной суммы',               icon: 'trending-up',     color: '#F59E0B' },
    { text: 'Кешбек не накапливается на возвраты',                         icon: 'block',           color: '#EF4444' },
    { text: 'Статус снижается при отсутствии активности 12 месяцев',       icon: 'schedule',        color: '#8B5CF6' },
    { text: 'Бонусы не переводятся другим пользователям',                  icon: 'person-off',      color: '#64748B' },
    { text: 'В день рождения начисляется дополнительный бонус',            icon: 'cake',            color: '#F43F5E' },
  ],
};

const DEFAULT_CONTACT = {
  instagram: 'villajaconda',
  email:     'support@villajaconda.ru',
  phone:     '+7 000 000-00-00',
};

const LEVELS = {
  bronze:   { label: 'Bronze',   color: '#CD7F32', next: 10000  },
  silver:   { label: 'Silver',   color: '#A0A0A0', next: 50000  },
  gold:     { label: 'Gold',     color: '#F59E0B', next: 200000 },
  platinum: { label: 'Platinum', color: '#8B5CF6', next: null   },
};

// ─────────────────────────────────────────────────────────────
// Sub-components defined OUTSIDE the main component so React
// never remounts them on parent re-renders.
// ─────────────────────────────────────────────────────────────

function ToggleSwitch({ value, onToggle, activeColor }) {
  const slide = useRef(new Animated.Value(value ? 24 : 2)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: value ? 24 : 2,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const trackColor = value ? (activeColor || TEAL) : '#CBD5E1';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(!value)}
      style={[styles.toggleTrack, { backgroundColor: trackColor }]}
    >
      <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: slide }] }]}>
        <MaterialIcons
          name={value ? 'check' : 'close'}
          size={13}
          color={value ? (activeColor || TEAL) : '#94A3B8'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

function SettingRow({ icon, iconBg, title, desc, onPress, right, last, borderColor, colors }) {
  const titleColor = right === undefined && !onPress
    ? '#94A3B8'
    : (colors?.text || '#1E293B');
  return (
    <TouchableOpacity
      style={[
        styles.row,
        last && styles.rowLast,
        { borderBottomColor: borderColor || (colors?.border || '#E2E8F0') },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <MaterialIcons name={icon} size={20} color="#fff" />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: titleColor }]}>{title}</Text>
        {desc ? <Text style={[styles.rowDesc, { color: colors?.textSecondary || '#94A3B8' }]}>{desc}</Text> : null}
      </View>
      {right !== undefined
        ? right
        : <MaterialIcons name="chevron-right" size={22} color={colors?.textSecondary || '#94A3B8'} />}
    </TouchableOpacity>
  );
}

function SectionLabel({ label, colors }) {
  return <Text style={[styles.sectionLabel, { color: colors?.textSecondary || '#94A3B8' }]}>{label}</Text>;
}

function SettingCard({ animVal, children, cardBg }) {
  const slideStyle = {
    opacity: animVal,
    transform: [{ translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
  };
  return (
    <Animated.View style={[styles.card, { backgroundColor: cardBg || '#fff' }, slideStyle]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [notifications, setNotifications]           = useState(true);
  const [rulesModalVisible, setRulesModalVisible]   = useState(false);
  const [notifCenterVisible, setNotifCenterVisible] = useState(false);
  const [platformInfo, setPlatformInfo]             = useState(
    'Программа лояльности Villa Jaconda v1.0.0\n\nОригинальное приложение для управления бронированиями и программой лояльности.'
  );
  const [platformInfoVisible, setPlatformInfoVisible]     = useState(false);
  const [isEditingPlatformInfo, setIsEditingPlatformInfo] = useState(false);
  const [avatarUri, setAvatarUri]                         = useState(null);
  const [avatarLoading, setAvatarLoading]                 = useState(false);
  const [contactVisible, setContactVisible]               = useState(false);
  const [rulesData, setRulesData]                         = useState(DEFAULT_RULES);
  const [isEditingRules, setIsEditingRules]               = useState(false);
  const [rulesDraft, setRulesDraft]                       = useState(null);
  const [contactData, setContactData]                     = useState(DEFAULT_CONTACT);
  const [isEditingContact, setIsEditingContact]           = useState(false);
  const [avatarPickerVisible, setAvatarPickerVisible]     = useState(false);

  const { logout, isAdmin, user } = useAuth();
  const { isDark, toggleTheme, theme } = useTheme();
  const colors = theme.colors;
  const useNative = Platform.OS !== 'web';

  // Entrance animations
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.4)).current;
  const sec1Anim    = useRef(new Animated.Value(0)).current;
  const sec2Anim    = useRef(new Animated.Value(0)).current;
  const sec3Anim    = useRef(new Animated.Value(0)).current;
  const sec4Anim    = useRef(new Animated.Value(0)).current;
  const sec5Anim    = useRef(new Animated.Value(0)).current;
  const btnAnim     = useRef(new Animated.Value(0)).current;
  const blob1       = useRef(new Animated.Value(1)).current;
  const blob2       = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_KEY)
      .then(uri => { if (uri) setAvatarUri(uri); })
      .catch(() => {});
    AsyncStorage.getItem(RULES_KEY)
      .then(v => { if (v) setRulesData(JSON.parse(v)); })
      .catch(() => {});
    AsyncStorage.getItem(CONTACT_KEY)
      .then(v => { if (v) setContactData(JSON.parse(v)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Animated.timing(heroAnim, { toValue: 1, duration: 500, useNativeDriver: useNative }).start();
    Animated.spring(avatarScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: useNative }).start();

    Animated.stagger(80, [
      Animated.spring(sec1Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec2Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec3Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec4Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(sec5Anim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
      Animated.spring(btnAnim,  { toValue: 1, tension: 65, friction: 9, useNativeDriver: useNative }),
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

  const accentColor = isAdmin ? TEAL : CORAL;

  const userInitials = useMemo(() => {
    const name = user?.name || user?.displayName || '';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'VJ';
  }, [user]);

  const levelKey  = (user?.membershipLevel || 'bronze').toLowerCase();
  const levelInfo = LEVELS[levelKey] || LEVELS.bronze;
  const balance   = user?.loyaltyBalance || 0;
  const levelProgress = levelInfo.next
    ? Math.min(100, Math.round((balance / levelInfo.next) * 100))
    : 100;
  const nextLevelName = levelInfo.label === 'Bronze' ? 'Silver'
    : levelInfo.label === 'Silver' ? 'Gold'
    : levelInfo.label === 'Gold' ? 'Platinum'
    : null;

  // ── Avatar picker ──
  const pickFromLibrary = async () => {
    setAvatarPickerVisible(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках'); return; }
      setAvatarLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      setAvatarLoading(false);
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem(AVATAR_KEY, uri);
      }
    } catch {
      setAvatarLoading(false);
    }
  };

  const pickFromCamera = async () => {
    setAvatarPickerVisible(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках'); return; }
      setAvatarLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      setAvatarLoading(false);
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await AsyncStorage.setItem(AVATAR_KEY, uri);
      }
    } catch {
      setAvatarLoading(false);
    }
  };

  const handlePickAvatar = () => setAvatarPickerVisible(true);

  const handleDeleteAvatar = async () => {
    setAvatarUri(null);
    setAvatarPickerVisible(false);
    await AsyncStorage.removeItem(AVATAR_KEY);
  };

  const handleNotifToggle = (value) => {
    setNotifications(value);
    Alert.alert(
      value ? 'Push-уведомления включены' : 'Push-уведомления отключены',
      value
        ? 'Вы будете получать уведомления о бронированиях и акциях.'
        : 'Вы не будете получать push-уведомления.',
      [{ text: 'OK' }]
    );
  };

  const saveRules = async (draft) => {
    setRulesData(draft);
    setRulesDraft(null);
    setIsEditingRules(false);
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(draft));
  };

  const saveContact = async (draft) => {
    setContactData(draft);
    setIsEditingContact(false);
    await AsyncStorage.setItem(CONTACT_KEY, JSON.stringify(draft));
  };

  const btnSlideStyle = {
    opacity: btnAnim,
    transform: [{ translateY: btnAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, { opacity: heroAnim }]}>
          <Animated.View style={[styles.blob1, { transform: [{ scale: blob1 }] }]} />
          <Animated.View style={[styles.blob2, { transform: [{ scale: blob2 }] }]} />
          <View style={styles.decArc} />

          <Animated.View style={[styles.avatarOuter, { transform: [{ scale: avatarScale }] }]}>
            <TouchableOpacity
              style={[styles.avatarRing, { borderColor: `${TEAL}60` }]}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
            >
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                : (
                  <View style={[styles.avatarInner, { backgroundColor: `${TEAL}22` }]}>
                    <Text style={styles.avatarInitials}>{userInitials}</Text>
                  </View>
                )
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarCamBtn, { backgroundColor: accentColor }]}
              onPress={handlePickAvatar}
            >
              <MaterialIcons
                name={avatarLoading ? 'hourglass-top' : 'photo-camera'}
                size={12}
                color="#fff"
              />
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.heroName}>{user?.name || user?.displayName || 'Пользователь'}</Text>

          <View style={[styles.heroBadge, {
            backgroundColor: `${isAdmin ? NAVY : CORAL}22`,
            borderColor: `${isAdmin ? NAVY : CORAL}55`,
          }]}>
            <MaterialIcons
              name={isAdmin ? 'admin-panel-settings' : 'star'}
              size={12}
              color={isAdmin ? TEAL : AMBER}
            />
            <Text style={[styles.heroBadgeText, { color: isAdmin ? TEAL : AMBER }]}>
              {isAdmin ? 'Администратор' : `${levelInfo.label} участник`}
            </Text>
          </View>

          <Text style={styles.heroEmail}>{user?.email || ''}</Text>

          {!isAdmin && (
            <View style={styles.levelMini}>
              <View style={styles.levelMiniRow}>
                <View style={[styles.levelDot, { backgroundColor: levelInfo.color }]} />
                <Text style={styles.levelMiniLabel}>{levelInfo.label}</Text>
                <Text style={styles.levelMiniBalance}>{balance.toLocaleString('ru-RU')} PRB</Text>
              </View>
              <View style={styles.levelTrack}>
                <View style={[styles.levelFill, { width: `${levelProgress}%`, backgroundColor: levelInfo.color }]} />
              </View>
              {nextLevelName && levelInfo.next && (
                <Text style={styles.levelMiniNext}>
                  до {nextLevelName}: {(levelInfo.next - balance).toLocaleString('ru-RU')} PRB
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── Notifications ── */}
        <SectionLabel label="УВЕДОМЛЕНИЯ" colors={colors} />
        <SettingCard animVal={sec1Anim} cardBg={colors.cardBg}>
          <SettingRow
            icon="notifications-active"
            iconBg={AMBER}
            title="Push-уведомления"
            desc="Получайте уведомления о событиях"
            borderColor={colors.border}
            colors={colors}
            right={
              <ToggleSwitch
                value={notifications}
                onToggle={handleNotifToggle}
                activeColor={TEAL}
              />
            }
          />
          <SettingRow
            icon="notifications"
            iconBg="#EF4444"
            title="Центр уведомлений"
            desc="Просмотрите все уведомления"
            borderColor={colors.border}
            colors={colors}
            onPress={() => setNotifCenterVisible(true)}
            last
          />
        </SettingCard>

        {/* ── Appearance ── */}
        <SectionLabel label="ОФОРМЛЕНИЕ" colors={colors} />
        <SettingCard animVal={sec2Anim} cardBg={colors.cardBg}>
          <SettingRow
            icon={isDark ? 'brightness-4' : 'brightness-7'}
            iconBg="#6366F1"
            title="Тёмный режим"
            desc={isDark ? 'Включён' : 'Выключен'}
            borderColor={colors.border}
            colors={colors}
            right={
              <ToggleSwitch
                value={isDark}
                onToggle={toggleTheme}
                activeColor="#6366F1"
              />
            }
            last
          />
        </SettingCard>

        {/* ── Loyalty (user only) ── */}
        {!isAdmin && (
          <>
            <SectionLabel label="ПРОГРАММА ЛОЯЛЬНОСТИ" colors={colors} />
            <SettingCard animVal={sec3Anim} cardBg={colors.cardBg}>
              <SettingRow
                icon="book"
                iconBg="#10B981"
                title="Правила программы"
                desc="Как работает наша программа"
                borderColor={colors.border}
                colors={colors}
                onPress={() => setRulesModalVisible(true)}
              />
              <SettingRow
                icon="card-membership"
                iconBg={levelInfo.color}
                title={`Мой уровень: ${levelInfo.label}`}
                desc={
                  levelInfo.next
                    ? `До следующего: ${(levelInfo.next - balance).toLocaleString('ru-RU')} PRB`
                    : 'Максимальный уровень'
                }
                borderColor={colors.border}
                colors={colors}
                last
              />
            </SettingCard>
          </>
        )}

        {/* ── Platform (admin only) ── */}
        {isAdmin && (
          <>
            <SectionLabel label="ПЛАТФОРМА" colors={colors} />
            <SettingCard animVal={sec3Anim} cardBg={colors.cardBg}>
              <SettingRow
                icon="info"
                iconBg="#3B82F6"
                title="О платформе"
                desc="Информация и версия"
                borderColor={colors.border}
                colors={colors}
                onPress={() => setPlatformInfoVisible(true)}
              />
              <SettingRow
                icon="book"
                iconBg="#10B981"
                title="Правила программы"
                desc="Просмотр и редактирование"
                borderColor={colors.border}
                colors={colors}
                onPress={() => setRulesModalVisible(true)}
                last
              />
            </SettingCard>
          </>
        )}

        {/* ── Account ── */}
        <SectionLabel label="АККАУНТ" colors={colors} />
        <SettingCard animVal={sec4Anim} cardBg={colors.cardBg}>
          <SettingRow
            icon="person"
            iconBg={NAVY}
            title="Имя профиля"
            desc={user?.name || user?.displayName || 'Не указано'}
            borderColor={colors.border}
            colors={colors}
            right={null}
          />
          <SettingRow
            icon="photo-camera"
            iconBg={TEAL}
            title="Фото профиля"
            desc={avatarUri ? 'Установлено — нажмите для замены' : 'Нажмите для добавления фото'}
            borderColor={colors.border}
            colors={colors}
            onPress={handlePickAvatar}
            last
          />
        </SettingCard>

        {/* ── Help ── */}
        <SectionLabel label="ПОМОЩЬ" colors={colors} />
        <SettingCard animVal={sec5Anim} cardBg={colors.cardBg}>
          <SettingRow
            icon="help"
            iconBg="#8B5CF6"
            title="FAQ"
            desc="Часто задаваемые вопросы"
            borderColor={colors.border}
            colors={colors}
          />
          <SettingRow
            icon="mail"
            iconBg="#E67E22"
            title="Связаться с нами"
            desc="Выберите удобный способ"
            borderColor={colors.border}
            colors={colors}
            onPress={() => setContactVisible(true)}
            last
          />
        </SettingCard>

        {/* ── Logout ── */}
        <Animated.View style={[btnSlideStyle, styles.logoutWrap]}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => logout()}
            activeOpacity={0.85}
          >
            <MaterialIcons name="logout" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Выход из аккаунта</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Villa Jaconda v1.0.0
          </Text>
        </Animated.View>
      </ScrollView>

      {/* ── Rules Bottom Sheet ── */}
      <BottomSheet
        visible={rulesModalVisible}
        onClose={() => { setRulesModalVisible(false); setIsEditingRules(false); setRulesDraft(null); }}
        title="Правила программы"
        colors={colors}
        headerRight={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && !isEditingRules && (
              <TouchableOpacity
                style={[styles.editChip, { backgroundColor: `${TEAL}18` }]}
                onPress={() => { setRulesDraft(JSON.parse(JSON.stringify(rulesData))); setIsEditingRules(true); }}
              >
                <MaterialIcons name="edit" size={15} color={TEAL} />
                <Text style={[styles.editChipText, { color: TEAL }]}>Изменить</Text>
              </TouchableOpacity>
            )}
            {isEditingRules ? (
              <>
                <TouchableOpacity
                  style={[styles.editChip, { backgroundColor: '#10B98118' }]}
                  onPress={() => saveRules(rulesDraft)}
                >
                  <MaterialIcons name="check" size={15} color="#10B981" />
                  <Text style={[styles.editChipText, { color: '#10B981' }]}>Сохранить</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setIsEditingRules(false); setRulesDraft(null); }}>
                  <MaterialIcons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setRulesModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        }
      >
        <ScrollView contentContainerStyle={styles.modalBody}>
          <RulesContent
            colors={colors}
            data={rulesData}
            isEditing={isEditingRules}
            draft={rulesDraft}
            onDraftChange={setRulesDraft}
          />
        </ScrollView>
      </BottomSheet>

      {/* ── Contact Bottom Sheet ── */}
      <BottomSheet
        visible={contactVisible}
        onClose={() => { setContactVisible(false); setIsEditingContact(false); }}
        title="Связаться с нами"
        colors={colors}
        headerRight={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && !isEditingContact && (
              <TouchableOpacity
                style={[styles.editChip, { backgroundColor: `${TEAL}18` }]}
                onPress={() => setIsEditingContact(true)}
              >
                <MaterialIcons name="edit" size={15} color={TEAL} />
                <Text style={[styles.editChipText, { color: TEAL }]}>Изменить</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setContactVisible(false); setIsEditingContact(false); }}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        }
      >
        <ContactSheet
          colors={colors}
          data={contactData}
          isEditing={isEditingContact}
          onSave={saveContact}
          onCancel={() => setIsEditingContact(false)}
        />
      </BottomSheet>

      {/* ── Platform Info Bottom Sheet (admin only) ── */}
      <BottomSheet
        visible={platformInfoVisible}
        onClose={() => { setPlatformInfoVisible(false); setIsEditingPlatformInfo(false); }}
        title="О платформе"
        colors={colors}
      >
        <ScrollView contentContainerStyle={styles.modalBody}>
          {!isEditingPlatformInfo ? (
            <>
              <Text style={[styles.platformText, { color: colors.text }]}>{platformInfo}</Text>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: TEAL }]}
                onPress={() => setIsEditingPlatformInfo(true)}
              >
                <MaterialIcons name="edit" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Редактировать</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.platformInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                multiline
                value={platformInfo}
                onChangeText={setPlatformInfo}
                placeholder="Информация о платформе"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setIsEditingPlatformInfo(false)}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.modalBtnText}>Сохранить</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </BottomSheet>

      {/* ── Avatar Picker Bottom Sheet ── */}
      <BottomSheet
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        title="Фото профиля"
        colors={colors}
      >
        <View style={styles.modalBody}>
          <TouchableOpacity
            style={[styles.contactOption, { backgroundColor: `${TEAL}10`, borderColor: `${TEAL}30` }]}
            onPress={pickFromLibrary}
            activeOpacity={0.75}
          >
            <View style={[styles.contactOptionIcon, { backgroundColor: TEAL }]}>
              <MaterialIcons name="photo-library" size={22} color="#fff" />
            </View>
            <Text style={[styles.contactOptionLabel, { color: colors.text }]}>Выбрать из галереи</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.contactOption, { backgroundColor: `${NAVY}10`, borderColor: `${NAVY}30` }]}
            onPress={pickFromCamera}
            activeOpacity={0.75}
          >
            <View style={[styles.contactOptionIcon, { backgroundColor: NAVY }]}>
              <MaterialIcons name="photo-camera" size={22} color="#fff" />
            </View>
            <Text style={[styles.contactOptionLabel, { color: colors.text }]}>Сделать фото</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {avatarUri && (
            <TouchableOpacity
              style={[styles.contactOption, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}
              onPress={handleDeleteAvatar}
              activeOpacity={0.75}
            >
              <View style={[styles.contactOptionIcon, { backgroundColor: '#EF4444' }]}>
                <MaterialIcons name="delete" size={22} color="#fff" />
              </View>
              <Text style={[styles.contactOptionLabel, { color: '#EF4444' }]}>Удалить фото</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheet>

      {/* ── Notification Center Modal ── */}
      <Modal
        visible={notifCenterVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setNotifCenterVisible(false)}
      >
        <NotificationCenter onClose={() => setNotifCenterVisible(false)} />
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Static sub-components (outside main component)
// ─────────────────────────────────────────────────────────────

function BottomSheet({ visible, onClose, title, headerRight, children, colors }) {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const slideY    = useRef(new Animated.Value(500)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideY,    { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 190, useNativeDriver: true }),
        Animated.timing(slideY,    { toValue: 500, duration: 210, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible animationType="none" transparent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: bgOpacity }]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[
          styles.modalSheet,
          { backgroundColor: colors.cardBg, position: 'absolute', bottom: 0, left: 0, right: 0, transform: [{ translateY: slideY }] },
        ]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            {headerRight ?? (
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function RulesContent({ colors, data, isEditing, draft, onDraftChange }) {
  const display = data || DEFAULT_RULES;
  const editData = draft || display;

  const updateRuleText = (i, text) => {
    const next = JSON.parse(JSON.stringify(editData));
    next.rules[i].text = text;
    onDraftChange(next);
  };
  const updateLevelField = (i, field, text) => {
    const next = JSON.parse(JSON.stringify(editData));
    next.levels[i][field] = text;
    onDraftChange(next);
  };

  return (
    <>
      <Text style={[styles.rulesSectionTitle, { color: colors.text, borderBottomColor: TEAL }]}>
        Уровни программы
      </Text>
      {display.levels.map((l, i) => (
        <View key={l.name} style={[styles.levelCard, { backgroundColor: `${l.color}12`, borderColor: `${l.color}40` }]}>
          <View style={[styles.levelIconBox, { backgroundColor: `${l.color}25` }]}>
            <MaterialIcons name={l.icon || 'star'} size={26} color={l.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.levelName, { color: colors.text }]}>{l.name}</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.levelBonusInput, { color: l.color, borderColor: `${l.color}50` }]}
                  value={editData.levels[i].bonus}
                  onChangeText={t => updateLevelField(i, 'bonus', t)}
                />
              ) : (
                <View style={[styles.levelBonusBadge, { backgroundColor: `${l.color}20` }]}>
                  <Text style={[styles.levelBonusText, { color: l.color }]}>{l.bonus}</Text>
                </View>
              )}
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.levelRangeInput, { color: colors.textSecondary, borderColor: colors.border }]}
                value={editData.levels[i].range}
                onChangeText={t => updateLevelField(i, 'range', t)}
              />
            ) : (
              <Text style={[styles.levelRange, { color: colors.textSecondary }]}>{l.range}</Text>
            )}
          </View>
        </View>
      ))}

      <Text style={[styles.rulesSectionTitle, { color: colors.text, borderBottomColor: TEAL, marginTop: 20 }]}>
        Основные правила
      </Text>
      {display.rules.map((r, i) => (
        <View key={i} style={[styles.ruleRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.ruleIconBox, { backgroundColor: `${r.color}18` }]}>
            <MaterialIcons name={r.icon || 'check-circle'} size={18} color={r.color} />
          </View>
          {isEditing ? (
            <TextInput
              style={[styles.ruleInput, { color: colors.text, borderColor: colors.border }]}
              value={editData.rules[i].text}
              onChangeText={t => updateRuleText(i, t)}
              multiline
            />
          ) : (
            <Text style={[styles.ruleText, { color: colors.text }]}>{r.text}</Text>
          )}
        </View>
      ))}
    </>
  );
}

function ContactSheet({ colors, data, isEditing, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...data });

  useEffect(() => { setDraft({ ...data }); }, [data]);

  const open = (url) => Linking.openURL(url).catch(() => Alert.alert('Ошибка', 'Не удалось открыть ссылку'));

  const contacts = [
    {
      key: 'instagram',
      label: 'Instagram',
      icon: 'photo-camera',
      color: '#E1306C',
      value: data.instagram,
      onPress: () => open(`https://instagram.com/${data.instagram}`),
    },
    {
      key: 'email',
      label: data.email,
      icon: 'email',
      color: '#3B82F6',
      value: data.email,
      onPress: () => open(`mailto:${data.email}`),
    },
    {
      key: 'phone',
      label: data.phone,
      icon: 'phone',
      color: '#10B981',
      value: data.phone,
      onPress: () => open(`tel:${data.phone.replace(/\s|-/g, '')}`),
    },
  ];

  if (isEditing) {
    return (
      <ScrollView contentContainerStyle={styles.modalBody}>
        {[
          { key: 'instagram', label: 'Instagram (без @)', icon: 'photo-camera', color: '#E1306C' },
          { key: 'email',     label: 'Email',              icon: 'email',        color: '#3B82F6' },
          { key: 'phone',     label: 'Телефон',            icon: 'phone',        color: '#10B981' },
        ].map(f => (
          <View key={f.key} style={styles.contactEditRow}>
            <View style={[styles.contactEditIcon, { backgroundColor: `${f.color}18` }]}>
              <MaterialIcons name={f.icon} size={20} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactEditLabel, { color: colors.textSecondary }]}>{f.label}</Text>
              <TextInput
                style={[styles.contactEditInput, { color: colors.text, borderColor: colors.border }]}
                value={draft[f.key]}
                onChangeText={t => setDraft(d => ({ ...d, [f.key]: t }))}
                autoCapitalize="none"
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#10B981', marginTop: 8 }]} onPress={() => onSave(draft)}>
          <MaterialIcons name="check" size={18} color="#fff" />
          <Text style={styles.modalBtnText}>Сохранить</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border, marginTop: 8 }]} onPress={onCancel}>
          <Text style={[styles.modalBtnText, { color: colors.text }]}>Отмена</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.modalBody}>
      <Text style={[styles.contactHint, { color: colors.textSecondary }]}>
        Выберите удобный способ связи
      </Text>
      {contacts.map(c => (
        <TouchableOpacity
          key={c.key}
          style={[styles.contactOption, { backgroundColor: `${c.color}10`, borderColor: `${c.color}30` }]}
          onPress={c.onPress}
          activeOpacity={0.75}
        >
          <View style={[styles.contactOptionIcon, { backgroundColor: c.color }]}>
            <MaterialIcons name={c.icon} size={22} color="#fff" />
          </View>
          <Text style={[styles.contactOptionLabel, { color: colors.text }]}>{c.label}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Hero
  hero: { backgroundColor: NAVY, alignItems: 'center', paddingTop: 28, paddingBottom: 28, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: `${TEAL}18`, top: -60, left: -60 },
  blob2: { position: 'absolute', width: 160, height: 160, borderRadius: 80,  backgroundColor: `${AMBER}12`, bottom: -40, right: -40 },
  decArc: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: `${TEAL}25`, top: -100, right: -80 },

  // Avatar
  avatarOuter: { position: 'relative', marginBottom: 12 },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, padding: 4, overflow: 'hidden' },
  avatarInner: { flex: 1, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
  avatarInitials: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  avatarCamBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: NAVY,
  },

  heroName:      { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
  heroBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginBottom: 5 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },
  heroEmail:     { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500', marginBottom: 12 },

  // Level mini-bar
  levelMini:        { width: '80%', marginTop: 4 },
  levelMiniRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  levelDot:         { width: 8, height: 8, borderRadius: 4 },
  levelMiniLabel:   { fontSize: 11, fontWeight: '800', color: '#fff', flex: 1 },
  levelMiniBalance: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  levelTrack:       { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  levelFill:        { height: '100%', borderRadius: 2 },
  levelMiniNext:    { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4, textAlign: 'right' },

  // Section labels
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginHorizontal: 18, marginTop: 18, marginBottom: 6 },

  // Cards
  card: { marginHorizontal: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, overflow: 'hidden' },

  // Rows
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLast:    { borderBottomWidth: 0 },
  rowIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowText:    { flex: 1 },
  rowTitle:   { fontSize: 15, fontWeight: '600' },
  rowDesc:    { fontSize: 12, marginTop: 1 },

  // Toggle
  toggleTrack: { width: 50, height: 28, borderRadius: 14, padding: 2 },
  toggleThumb: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },

  // Logout
  logoutWrap: { marginHorizontal: 16, marginTop: 24, alignItems: 'center' },
  logoutBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EF4444', paddingVertical: 15, borderRadius: 16, width: '100%',
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  logoutText:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  versionText: { fontSize: 11, marginTop: 14 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle:   { fontSize: 18, fontWeight: '800' },
  modalBody:    { padding: 20, paddingBottom: 36 },
  modalBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 16 },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  platformText:  { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  platformInput: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, fontSize: 14, lineHeight: 20 },

  // Rules modal content
  rulesSectionTitle: { fontSize: 15, fontWeight: '800', paddingBottom: 8, marginBottom: 12, borderBottomWidth: 2 },
  levelCard:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  levelIconBox:     { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  levelName:        { fontSize: 15, fontWeight: '900' },
  levelRange:       { fontSize: 12, marginTop: 3 },
  levelBonusBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  levelBonusText:   { fontSize: 12, fontWeight: '800' },
  levelBonusInput:  { fontSize: 12, fontWeight: '800', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, minWidth: 80, textAlign: 'right' },
  levelRangeInput:  { fontSize: 12, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },

  ruleRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, gap: 10 },
  ruleIconBox:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleText:     { flex: 1, fontSize: 13, lineHeight: 18 },
  ruleInput:    { flex: 1, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 6, padding: 6 },

  // Edit chips
  editChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  editChipText: { fontSize: 13, fontWeight: '700' },

  // Contact sheet
  contactHint:        { fontSize: 13, marginBottom: 16, textAlign: 'center' },
  contactOption:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  contactOptionIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactOptionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  contactEditRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  contactEditIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18, flexShrink: 0 },
  contactEditLabel:   { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  contactEditInput:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
});
