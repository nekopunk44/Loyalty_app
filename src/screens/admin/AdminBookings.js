import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert,
  Animated, Modal, Pressable, ScrollView,
  Dimensions, PanResponder, Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { spacing, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../utils/api';
import { getApiUrl } from '../../utils/apiUrl';
import { PropertyService } from '../../services/PropertyService';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;

const API = getApiUrl();

const STATUS_META = {
  pending:   { label: 'Ожидает',   color: '#F59E0B', icon: 'schedule'       },
  confirmed: { label: 'Активно',   color: '#10B981', icon: 'check-circle'   },
  completed: { label: 'Завершено', color: '#6366F1', icon: 'done-all'       },
  cancelled: { label: 'Отменено',  color: '#EF4444', icon: 'cancel'         },
};

const FILTERS = [
  { id: 'all',       label: 'Все'       },
  { id: 'pending',   label: 'Ожидают'  },
  { id: 'confirmed', label: 'Активные' },
  { id: 'completed', label: 'Завершено' },
  { id: 'cancelled', label: 'Отменено' },
];

const asNumber = v => Number(v || 0);
// Даты хранятся в формате DD.MM.YYYY — возвращаем как есть
const fmtDate = v => v || '—';
const fmtMoney = v => `${asNumber(v).toLocaleString('ru-RU')} PRB`;

const PAY_METHOD = { card: 'Картой лояльности', cash: 'Наличными' };

/**
 * Парсит подпись пользователя из JSON-снапшота (rules_signature).
 * Возвращает { paths: string[], signedAt: ISO, viewBox: string } либо null.
 * viewBox считается по min/max координат — чтобы корректно отрисовать в любом контейнере.
 */
const parseSignature = (raw) => {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const paths = Array.isArray(obj?.paths) ? obj.paths : [];
    if (!paths.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const numRe = /-?\d+(?:\.\d+)?/g;
    for (const d of paths) {
      const nums = d.match(numRe);
      if (!nums) continue;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (Number.isFinite(x)) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
        if (Number.isFinite(y)) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;
    const pad = 6;
    const x = Math.floor(minX) - pad;
    const y = Math.floor(minY) - pad;
    const w = Math.max(1, Math.ceil(maxX - minX) + pad * 2);
    const h = Math.max(1, Math.ceil(maxY - minY) + pad * 2);
    return { paths, signedAt: obj?.signedAt || null, viewBox: `${x} ${y} ${w} ${h}` };
  } catch {
    return null;
  }
};
const fmtDateTime = iso => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return '—'; }
};

export default function AdminBookings() {
  const { theme } = useTheme();
  const [bookings,   setBookings]   = useState([]);
  const [propertyMap, setPropertyMap] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // bookingId
  const [cancelTarget, setCancelTarget] = useState(null);   // booking to cancel

  // Bottom sheet detail
  const [sheetMounted,  setSheetMounted]  = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_H)).current;

  const openDetail = (booking) => {
    setDetailBooking(booking);
    sheetTranslateY.setValue(SHEET_H);
    setSheetMounted(true);
    Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeDetail = () => {
    Animated.timing(sheetTranslateY, { toValue: SHEET_H, duration: 280, useNativeDriver: true }).start(() => {
      setSheetMounted(false);
      setDetailBooking(null);
    });
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => { if (g.dy > 0) sheetTranslateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) closeDetail();
        else Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      },
    })
  ).current;

  const loadBookings = useCallback(async () => {
    try {
      const [data, props] = await Promise.all([
        apiCall(`${API}/bookings`),
        PropertyService.getAllForAdmin().catch(() => []),
      ]);
      if (data.success) setBookings(data.bookings || []);
      if (Array.isArray(props)) {
        const map = {};
        props.forEach(p => { map[String(p.id)] = p.name; });
        setPropertyMap(map);
      }
    } catch (e) {
      console.error('AdminBookings load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadBookings();
  }, [loadBookings]));

  const onRefresh = () => { setRefreshing(true); loadBookings(); };

  // Counts for filter pills
  const counts = useMemo(() => {
    const c = { all: bookings.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach(b => { if (b.status in c) c[b.status]++; });
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bookings.filter(b => {
      if (filter !== 'all' && b.status !== filter) return false;
      if (!q) return true;
      const name     = (b.userName || b.user?.name || b.guestName || '').toLowerCase();
      const email    = (b.userEmail || b.user?.email || '').toLowerCase();
      const property = (b.property || b.propertyName || '').toLowerCase();
      return name.includes(q) || email.includes(q) || property.includes(q);
    });
  }, [bookings, filter, search]);

  const handleConfirm = (booking) => {
    Alert.alert(
      'Подтвердить бронирование?',
      `${booking.userName || 'Гость'} · ${booking.property || `Объект #${booking.propertyId}`}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Подтвердить',
          onPress: async () => {
            setActionLoading(booking.id);
            try {
              const data = await apiCall(`${API}/bookings/${booking.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'confirmed' }),
              });
              if (data.success || data.booking) {
                setBookings(prev => prev.map(b =>
                  b.id === booking.id ? { ...b, status: 'confirmed' } : b
                ));
              } else {
                Alert.alert('Ошибка', data.error || 'Не удалось обновить статус');
              }
            } catch (e) {
              Alert.alert('Ошибка', e.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleCancel = (booking) => setCancelTarget(booking);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const booking = cancelTarget;
    setCancelTarget(null);
    setActionLoading(booking.id);
    try {
      const data = await apiCall(`${API}/bookings/${booking.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (data.success || data.booking) {
        setBookings(prev => prev.map(b =>
          b.id === booking.id ? { ...b, status: 'cancelled' } : b
        ));
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось отменить');
      }
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const renderBooking = ({ item }) => {
    const meta     = STATUS_META[item.status] || STATUS_META.pending;
    const name     = item.userName || item.user?.displayName || item.user?.name || 'Гость';
    const property = propertyMap[String(item.propertyId)] || item.propertyName || item.property?.name || `Объект #${item.propertyId}`;
    const avatar   = item.userAvatar || null;
    const isActing = actionLoading === item.id;

    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => openDetail({ ...item, userName: name, propertyName: property, userAvatar: avatar })}
      >
      <View style={[styles.card, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
        {/* Цветная шапка */}
        <View style={[styles.cardHeader, { backgroundColor: `${meta.color}12` }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.cardAvatar} />
          ) : (
            <View style={[styles.cardAvatar, { backgroundColor: `${meta.color}25` }]}>
              <Text style={[styles.cardAvatarText, { color: meta.color }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
            <View style={styles.cardPropertyRow}>
              <MaterialIcons name="home" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.cardProperty, { color: theme.colors.textSecondary }]} numberOfLines={1}>{property}</Text>
            </View>
          </View>
          <View style={[styles.statusChip, { backgroundColor: `${meta.color}20`, borderColor: `${meta.color}50` }]}>
            <MaterialIcons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Детали */}
          <View style={styles.cardDetails}>
            <View style={[styles.detailItem, { flex: 1 }]}>
              <MaterialIcons name="calendar-today" size={14} color={theme.colors.textSecondary} />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Заезд — Выезд</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text, fontSize: 11 }]} numberOfLines={1}>
                  {fmtDate(item.checkInDate)} → {fmtDate(item.checkOutDate)}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="people" size={14} color={theme.colors.textSecondary} />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Гостей</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>{item.guests || 1}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="payments" size={14} color={theme.colors.textSecondary} />
              <View>
                <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Сумма</Text>
                <Text style={[styles.detailValue, { color: theme.colors.primary, fontWeight: '900' }]}>{fmtMoney(item.totalPrice)}</Text>
              </View>
            </View>
          </View>

          {/* Actions for pending */}
          {item.status === 'pending' && (
            <View style={[styles.cardDivider, { borderColor: theme.colors.border }]} />
          )}
          {item.status === 'pending' && (
            <View style={styles.cardActions}>
              {isActing ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleConfirm(item)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="check" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Подтвердить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: `#EF444415`, borderWidth: 1, borderColor: '#EF444440' }]}
                    onPress={() => handleCancel(item)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="close" size={16} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Отменить</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Cancel action for confirmed */}
          {item.status === 'confirmed' && (
            <View style={[styles.cardDivider, { borderColor: theme.colors.border }]} />
          )}
          {item.status === 'confirmed' && (
            <View style={styles.cardActions}>
              {isActing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, backgroundColor: `#EF444412`, borderWidth: 1, borderColor: '#EF444430' }]}
                  onPress={() => handleCancel(item)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="cancel" size={16} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Отменить бронь</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>

      {/* Модалка отмены бронирования */}
      <Modal
        transparent
        visible={!!cancelTarget}
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCancelTarget(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.cardBg }]} onPress={() => {}}>
            {/* Иконка */}
            <View style={styles.modalIconWrap}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#EF444415' }]}>
                <MaterialIcons name="event-busy" size={38} color="#EF4444" />
              </View>
            </View>
            {/* Текст */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Отменить бронирование?</Text>
            {cancelTarget && (
              <Text style={[styles.modalGuest, { color: theme.colors.textSecondary }]}>
                {cancelTarget.userName || 'Гость'} · {propertyMap[String(cancelTarget.propertyId)] || cancelTarget.propertyName || `Объект #${cancelTarget.propertyId}`}
              </Text>
            )}
            <Text style={[styles.modalDesc, { color: theme.colors.textSecondary }]}>
              Средства будут возвращены на карту клиента.
            </Text>
            {/* Кнопки */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={confirmCancel}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnCancelText}>Отменить бронь</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnBack}
                onPress={() => setCancelTarget(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalBtnBackText, { color: theme.colors.textSecondary }]}>Назад</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, {
          backgroundColor: theme.colors.cardBg,
          borderColor: search ? `${theme.colors.primary}55` : theme.colors.border,
        }]}>
          <View style={[styles.searchIcon, { backgroundColor: `${theme.colors.primary}14` }]}>
            <MaterialIcons name="search" size={18} color={theme.colors.primary} />
          </View>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Поиск по гостю или объекту"
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}
              style={[styles.clearBtn, { backgroundColor: theme.colors.background }]}>
              <MaterialIcons name="close" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filter pills */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          const meta   = STATUS_META[f.id];
          const color  = meta ? meta.color : theme.colors.primary;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              activeOpacity={0.8}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? color : theme.colors.cardBg,
                  borderColor: active ? color : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[styles.filterPillText, { color: active ? '#fff' : theme.colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {f.label}
              </Text>
              {counts[f.id] > 0 && (
                <View style={[styles.filterCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : `${color}20` }]}>
                  <Text style={[styles.filterCountText, { color: active ? '#fff' : color }]}>
                    {counts[f.id]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="event-busy" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {search || filter !== 'all' ? 'Ничего не найдено' : 'Бронирований пока нет'}
            </Text>
          </View>
        }
      />

      {/* ── Detail bottom sheet ── */}
      <Modal
        visible={sheetMounted}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={closeDetail}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeDetail} />
          <Animated.View style={[styles.sheetContent, { backgroundColor: theme.colors.cardBg, transform: [{ translateY: sheetTranslateY }] }]}>

            {/* Drag handle */}
            <View style={styles.dragHandleWrap} {...sheetPanResponder.panHandlers}>
              <View style={[styles.dragHandle, { backgroundColor: theme.colors.border }]} />
            </View>

            {detailBooking && <DetailContent
              booking={detailBooking}
              theme={theme}
              onBookingChange={b => {
                setDetailBooking(b);
                setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: b.status } : x));
              }}
              onClose={closeDetail}
            />}

          </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

function DetailContent({ booking, theme, onBookingChange, onClose }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelVisible,  setCancelVisible]  = useState(false);
  const API = getApiUrl();

  const meta     = STATUS_META[booking.status] || STATUS_META.pending;
  const name     = booking.userName || 'Гость';
  const email    = booking.userEmail || null;
  const avatar   = booking.userAvatar || null;
  const property = booking.propertyName || `Объект #${booking.propertyId}`;
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const fmtMoney = v => v != null ? `${Number(v).toLocaleString('ru-RU')} PRB` : '—';

  const handleConfirm = () => {
    Alert.alert('Подтвердить бронирование?', `${name} · ${property}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Подтвердить', onPress: async () => {
        setActionLoading(true);
        try {
          const data = await apiCall(`${API}/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) });
          if (data.success || data.booking) onBookingChange({ ...booking, status: 'confirmed' });
          else Alert.alert('Ошибка', data.error);
        } catch (e) { Alert.alert('Ошибка', e.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  };

  const confirmCancel = async () => {
    setCancelVisible(false);
    setActionLoading(true);
    try {
      const data = await apiCall(`${API}/bookings/${booking.id}/cancel`, { method: 'POST', body: JSON.stringify({}) });
      if (data.success || data.booking) onBookingChange({ ...booking, status: 'cancelled' });
      else Alert.alert('Ошибка', data.error);
    } catch (e) { Alert.alert('Ошибка', e.message); }
    finally { setActionLoading(false); }
  };

  const nights = (() => {
    try {
      const [d1, m1, y1] = (booking.checkInDate || '').split('.').map(Number);
      const [d2, m2, y2] = (booking.checkOutDate || '').split('.').map(Number);
      const diff = (new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000;
      return diff > 0 ? diff : null;
    } catch { return null; }
  })();

  return (
    <>
      {/* Cancel modal */}
      <Modal transparent visible={cancelVisible} animationType="fade" onRequestClose={() => setCancelVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCancelVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.cardBg }]} onPress={() => {}}>
            <View style={[styles.modalIconCircle, { backgroundColor: '#EF444415' }]}>
              <MaterialIcons name="event-busy" size={38} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Отменить бронирование?</Text>
            <Text style={[styles.modalGuest, { color: theme.colors.textSecondary }]}>{name} · {property}</Text>
            <Text style={[styles.modalDesc, { color: theme.colors.textSecondary }]}>Средства будут возвращены на карту клиента.</Text>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={confirmCancel} activeOpacity={0.85}>
              <Text style={styles.modalBtnCancelText}>Отменить бронь</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnBack} onPress={() => setCancelVisible(false)} activeOpacity={0.7}>
              <Text style={[styles.modalBtnBackText, { color: theme.colors.textSecondary }]}>Назад</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sheet header */}
      <View style={[styles.dHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.dHeaderTitle, { color: theme.colors.text }]}>Бронирование #{booking.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
          <MaterialIcons name={meta.icon} size={11} color={meta.color} />
          <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.dContent} showsVerticalScrollIndicator={false}>

        {/* ── Гость (hero) ── */}
        <View style={[styles.dHero, { backgroundColor: `${meta.color}12`, borderColor: `${meta.color}25` }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.dHeroAvatar} />
          ) : (
            <View style={[styles.dHeroAvatar, { backgroundColor: meta.color, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.dHeroAvatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.dHeroInfo}>
            <Text style={[styles.dHeroName, { color: theme.colors.text }]}>{name}</Text>
            {email
              ? <Text style={[styles.dHeroEmail, { color: theme.colors.textSecondary }]}>{email}</Text>
              : <Text style={[styles.dHeroEmail, { color: theme.colors.textSecondary, opacity: 0.5 }]}>email не указан</Text>
            }
          </View>
          <View style={[styles.dHeroPropBadge, { backgroundColor: theme.colors.cardBg }]}>
            <MaterialIcons name="hotel" size={12} color={meta.color} />
            <Text style={[styles.dHeroPropText, { color: meta.color }]}>{property}</Text>
          </View>
        </View>

        {/* ── Период проживания ── */}
        <View style={[styles.dCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          <View style={styles.dDateRow}>
            <View style={styles.dDateCol}>
              <View style={styles.dDateHead}>
                <MaterialIcons name="login" size={13} color="#10B981" />
                <Text style={[styles.dDateLabel, { color: theme.colors.textSecondary }]}>ЗАЕЗД</Text>
              </View>
              <Text style={[styles.dDateVal, { color: theme.colors.text }]}>{fmtDate(booking.checkInDate)}</Text>
            </View>
            <View style={[styles.dDateSep, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.dDateCol, { alignItems: 'flex-end' }]}>
              <View style={styles.dDateHead}>
                <Text style={[styles.dDateLabel, { color: theme.colors.textSecondary }]}>ВЫЕЗД</Text>
                <MaterialIcons name="logout" size={13} color="#EF4444" />
              </View>
              <Text style={[styles.dDateVal, { color: theme.colors.text }]}>{fmtDate(booking.checkOutDate)}</Text>
            </View>
          </View>
          <View style={[styles.dDateFoot, { borderTopColor: theme.colors.border }]}>
            <View style={styles.dPill}>
              <MaterialIcons name="bedtime" size={12} color="#8B5CF6" />
              <Text style={[styles.dPillText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '800' }}>{nights ?? '—'}</Text> ноч.
              </Text>
            </View>
            <View style={styles.dPill}>
              <MaterialIcons name="people" size={12} color="#06B6D4" />
              <Text style={[styles.dPillText, { color: theme.colors.text }]}>
                <Text style={{ fontWeight: '800' }}>{booking.guests || 1}</Text> гост.
              </Text>
            </View>
            {booking.notes ? (
              <View style={[styles.dPill, { flex: 1, minWidth: 0 }]}>
                <MaterialIcons name="notes" size={12} color={theme.colors.primary} />
                <Text style={[styles.dPillText, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
                  {booking.notes}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Доп. услуги (чипы) ── */}
        <View style={[styles.dCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          <Text style={[styles.dCardLabel, { color: theme.colors.textSecondary }]}>ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ</Text>
          <View style={styles.dChips}>
            <View style={[styles.dChip, {
              backgroundColor: booking.saunaHours > 0 ? '#F97316' + '15' : theme.colors.background,
              borderColor:     booking.saunaHours > 0 ? '#F97316' + '50' : theme.colors.border,
            }]}>
              <MaterialIcons name="hot-tub" size={16} color={booking.saunaHours > 0 ? '#F97316' : theme.colors.textSecondary} />
              <View>
                <Text style={[styles.dChipTitle, { color: booking.saunaHours > 0 ? '#F97316' : theme.colors.textSecondary }]}>Парилка</Text>
                <Text style={[styles.dChipSub, { color: booking.saunaHours > 0 ? '#F97316' : theme.colors.textSecondary }]}>
                  {booking.saunaHours > 0 ? `${booking.saunaHours} ч` : 'Не выбрана'}
                </Text>
              </View>
            </View>
            <View style={[styles.dChip, {
              backgroundColor: booking.kitchenware ? '#6366F1' + '15' : theme.colors.background,
              borderColor:     booking.kitchenware ? '#6366F1' + '50' : theme.colors.border,
            }]}>
              <MaterialIcons name="restaurant" size={16} color={booking.kitchenware ? '#6366F1' : theme.colors.textSecondary} />
              <View>
                <Text style={[styles.dChipTitle, { color: booking.kitchenware ? '#6366F1' : theme.colors.textSecondary }]}>Кухонный сервиз</Text>
                <Text style={[styles.dChipSub, { color: booking.kitchenware ? '#6366F1' : theme.colors.textSecondary }]}>
                  {booking.kitchenware ? 'Включён' : 'Не выбран'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Оплата ── */}
        <View style={[styles.dCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
          <Text style={[styles.dCardLabel, { color: theme.colors.textSecondary }]}>ОПЛАТА</Text>

          {/* Итого */}
          <View style={[styles.dTotalRow, { backgroundColor: `${theme.colors.primary}10`, borderRadius: 12 }]}>
            <Text style={[styles.dTotalLabel, { color: theme.colors.textSecondary }]}>Итого</Text>
            <Text style={[styles.dTotalVal, { color: theme.colors.primary }]}>{fmtMoney(booking.totalPrice)}</Text>
          </View>

          {/* Депозит + остаток */}
          <View style={styles.dPaySplit}>
            <View style={[styles.dPayBox, { backgroundColor: booking.depositPaidAt ? '#10B98110' : theme.colors.background, borderColor: booking.depositPaidAt ? '#10B98140' : theme.colors.border }]}>
              <View style={styles.dPayBoxTop}>
                <MaterialIcons name="account-balance-wallet" size={15} color={booking.depositPaidAt ? '#10B981' : theme.colors.textSecondary} />
                <Text style={[styles.dPayBoxTitle, { color: booking.depositPaidAt ? '#10B981' : theme.colors.textSecondary }]}>Депозит</Text>
              </View>
              <Text style={[styles.dPayBoxVal, { color: theme.colors.text }]}>{fmtMoney(booking.depositAmount)}</Text>
              {booking.depositPaidAt
                ? <Text style={[styles.dPayBoxStatus, { color: '#10B981' }]}>✓ Оплачен</Text>
                : <Text style={[styles.dPayBoxStatus, { color: theme.colors.textSecondary }]}>Ожидается</Text>
              }
            </View>
            <View style={[styles.dPayBox, { backgroundColor: booking.remainingPaidAt ? '#10B98110' : theme.colors.background, borderColor: booking.remainingPaidAt ? '#10B98140' : theme.colors.border }]}>
              <View style={styles.dPayBoxTop}>
                <MaterialIcons name="receipt-long" size={15} color={booking.remainingPaidAt ? '#10B981' : theme.colors.textSecondary} />
                <Text style={[styles.dPayBoxTitle, { color: booking.remainingPaidAt ? '#10B981' : theme.colors.textSecondary }]}>Остаток</Text>
              </View>
              <Text style={[styles.dPayBoxVal, { color: theme.colors.text }]}>{fmtMoney(booking.remainingAmount)}</Text>
              {booking.remainingPaidAt
                ? <Text style={[styles.dPayBoxStatus, { color: '#10B981' }]}>✓ Оплачен</Text>
                : <Text style={[styles.dPayBoxStatus, { color: theme.colors.textSecondary }]}>При заезде</Text>
              }
            </View>
          </View>

          {/* Способ оплаты остатка */}
          {booking.remainingPaymentMethod && (
            <View style={styles.dPayMethod}>
              <MaterialIcons
                name={booking.remainingPaymentMethod === 'cash' ? 'money' : 'credit-card'}
                size={15} color={theme.colors.primary}
              />
              <Text style={[styles.dPayMethodText, { color: theme.colors.textSecondary }]}>Способ оплаты остатка:</Text>
              <Text style={[styles.dPayMethodVal, { color: theme.colors.text }]}>
                {PAY_METHOD[booking.remainingPaymentMethod] || '—'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Правила дома + подпись ── */}
        {(() => {
          const sig = parseSignature(booking.userRulesSignature);
          const signedAt = sig?.signedAt || booking.userRulesSignedAt || null;
          return (
            <View style={[styles.dCard, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
              <View style={styles.dRulesHead}>
                <View style={[styles.dRulesIcon, { backgroundColor: '#10B98120' }]}>
                  <MaterialIcons name="verified" size={17} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dRulesTitle, { color: '#10B981' }]}>Правила дома приняты</Text>
                  <Text style={[styles.dRulesAgreeText, { color: theme.colors.textSecondary }]}>
                    {signedAt
                      ? `Подписано ${fmtDateTime(signedAt)}`
                      : 'Гость подтвердил согласие при создании бронирования'}
                  </Text>
                </View>
              </View>

              {sig ? (
                <View style={[styles.dSigPad, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Svg width="100%" height="100%" viewBox={sig.viewBox} preserveAspectRatio="xMidYMid meet">
                    {sig.paths.map((d, i) => (
                      <SvgPath
                        key={i}
                        d={d}
                        stroke={theme.colors.text}
                        strokeWidth={2.4}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </Svg>
                  <Text style={[styles.dSigCaption, { color: theme.colors.textSecondary }]}>Подпись гостя</Text>
                </View>
              ) : (
                <Text style={[styles.dSigEmpty, { color: theme.colors.textSecondary }]}>
                  Подпись не сохранена (старое бронирование)
                </Text>
              )}
            </View>
          );
        })()}

        {/* ── Кнопки ── */}
        {(booking.status === 'pending' || booking.status === 'pending_payment') && (
          <View style={styles.dActions}>
            {actionLoading ? <ActivityIndicator color={theme.colors.primary} /> : (
              <>
                <TouchableOpacity style={[styles.dActionBtn, { backgroundColor: '#10B981' }]} onPress={handleConfirm} activeOpacity={0.85}>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={styles.dActionBtnText}>Подтвердить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dActionBtn, { backgroundColor: '#EF444412', borderWidth: 1, borderColor: '#EF444440' }]} onPress={() => setCancelVisible(true)} activeOpacity={0.85}>
                  <MaterialIcons name="close" size={18} color="#EF4444" />
                  <Text style={[styles.dActionBtnText, { color: '#EF4444' }]}>Отменить</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        {booking.status === 'confirmed' && (
          <View style={styles.dActions}>
            {actionLoading ? <ActivityIndicator color="#EF4444" /> : (
              <TouchableOpacity style={[styles.dActionBtn, { flex: 1, backgroundColor: '#EF444412', borderWidth: 1, borderColor: '#EF444440' }]} onPress={() => setCancelVisible(true)} activeOpacity={0.85}>
                <MaterialIcons name="cancel" size={18} color="#EF4444" />
                <Text style={[styles.dActionBtnText, { color: '#EF4444' }]}>Отменить бронь</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingLeft: 8, paddingRight: 6, paddingVertical: 6,
  },
  searchIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, paddingVertical: spacing.sm, marginLeft: spacing.sm, fontSize: 14 },
  clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  filterPill: {
    flexGrow: 1, flexShrink: 1, flexBasis: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  filterCount: { minWidth: 18, borderRadius: 999, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  filterCountText: { fontSize: 10, fontWeight: '900' },

  list: { paddingHorizontal: spacing.md, paddingBottom: 130 },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1, marginBottom: 10, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  cardAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardAvatarText: { fontSize: 15, fontWeight: '800' },
  cardHeaderInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardPropertyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardProperty: { fontSize: 12, flexShrink: 1 },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1, flexShrink: 0,
  },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBody: { paddingHorizontal: 14, paddingBottom: 12 },
  cardDetails: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 16, marginBottom: 10, paddingTop: 4,
  },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  detailLabel: { fontSize: 9, marginBottom: 1 },
  detailValue: { fontSize: 11, fontWeight: '700' },

  cardDivider: { borderTopWidth: 1, marginBottom: 10 },

  cardActions: {
    flexDirection: 'row', gap: 8,
    justifyContent: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600' },

  // Cancel modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', borderRadius: 24,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22, shadowRadius: 32, elevation: 16,
  },
  modalIconWrap: { marginBottom: 20 },
  modalIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  modalGuest: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  modalDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28, opacity: 0.7 },
  modalActions: { width: '100%', gap: 8 },
  modalBtnCancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#EF4444', width: '100%',
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  modalBtnBack: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
  },
  modalBtnBackText: { fontSize: 14, fontWeight: '600' },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  sheetContent: {
    height: SHEET_H, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandleWrap: { alignItems: 'center', paddingVertical: 12 },
  dragHandle: { width: 40, height: 4, borderRadius: 2 },

  // Detail content
  dHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.md, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  closeBtn: { padding: 4 },

  dContent: { padding: spacing.md, gap: 10 },

  // Hero guest card
  dHero: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  dHeroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dHeroAvatarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  dHeroInfo: { flex: 1, minWidth: 0 },
  dHeroName: { fontSize: 15, fontWeight: '800' },
  dHeroEmail: { fontSize: 11, marginTop: 2 },
  dHeroPropBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 9, flexShrink: 0,
  },
  dHeroPropText: { fontSize: 11, fontWeight: '700' },

  // Generic card
  dCard: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
    gap: 8,
  },
  dCardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  // Date row (Заезд / Выезд)
  dDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dDateCol: { flex: 1, gap: 3 },
  dDateHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dDateLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  dDateVal: { fontSize: 15, fontWeight: '800' },
  dDateSep: { width: 1, height: 28 },
  dDateFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, paddingTop: 8,
  },
  dPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dPillText: { fontSize: 12 },

  // Stat grid (Заезд/Выезд/Ночей/Гостей)
  dStatGrid: { flexDirection: 'row', gap: 10 },
  dStatBox: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12, gap: 4,
    alignItems: 'flex-start',
  },
  dStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  dStatVal: { fontSize: 15, fontWeight: '800' },

  // Notes block
  dNotes: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  dNotesText: { fontSize: 13, lineHeight: 17 },

  // Service chips
  dChips: { flexDirection: 'row', gap: 8 },
  dChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9,
  },
  dChipTitle: { fontSize: 11, fontWeight: '700' },
  dChipSub: { fontSize: 10, marginTop: 1 },

  // Payment
  dTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  dTotalLabel: { fontSize: 12, fontWeight: '600' },
  dTotalVal: { fontSize: 17, fontWeight: '900' },
  dPaySplit: { flexDirection: 'row', gap: 8 },
  dPayBox: {
    flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 3,
  },
  dPayBoxTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dPayBoxTitle: { fontSize: 10, fontWeight: '700' },
  dPayBoxVal: { fontSize: 13, fontWeight: '800' },
  dPayBoxStatus: { fontSize: 10, fontWeight: '600' },
  dPayMethod: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingTop: 2,
  },
  dPayMethodText: { fontSize: 11 },
  dPayMethodVal: { fontSize: 11, fontWeight: '700' },

  // House rules
  dRulesAgree: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 10,
  },
  dRulesHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dRulesIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dRulesTitle: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  dRulesAgreeText: { fontSize: 11, lineHeight: 14 },
  dSigPad: {
    height: 130, borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', padding: 6, marginTop: 4,
  },
  dSigCaption: {
    position: 'absolute', bottom: 5, right: 8,
    fontSize: 9, fontWeight: '700', letterSpacing: 0.5,
    textTransform: 'uppercase', opacity: 0.6,
  },
  dSigEmpty: {
    fontSize: 11, fontStyle: 'italic', marginTop: 4,
    paddingHorizontal: 6,
  },

  dActions: { flexDirection: 'row', gap: 10 },
  dActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14,
  },
  dActionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
