/**
 * AdminProperties — экран управления номерами.
 *   - Список всех номеров (включая unavailable) из /api/properties/admin/all.
 *   - Тап «Добавить» / тап по карточке → bottom-sheet с формой.
 *   - Поля: name, description, price (строка), priceNumber, rooms, guests,
 *     depositAmount, amenities (одно в строку), status.
 *   - Галерея: текущие фото + кнопка «+» для multi-select через
 *     expo-image-picker. Каждое фото можно удалить.
 *   - Кнопка «Удалить номер» внизу sheet'а.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import PropertyService from '../../services/PropertyService';
import PropertyCard from '../../components/booking/PropertyCard';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;
const BACKDROP_COLOR = 'rgba(6, 18, 30, 0.46)';

const STATUS_META = {
  available:   { label: 'Доступен',    color: '#10B981' },
  unavailable: { label: 'Недоступен',  color: '#94A3B8' },
};

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  priceNumber: '',
  rooms: '',
  guests: '',
  depositAmount: '',
  amenities: '',
  status: 'available',
};

const propertyToForm = (p) => ({
  name: p?.name || '',
  description: p?.description || '',
  price: p?.price || '',
  priceNumber: p?.priceNumber != null ? String(p.priceNumber) : '',
  rooms: p?.rooms != null ? String(p.rooms) : '',
  guests: p?.guests != null ? String(p.guests) : '',
  depositAmount: p?.depositAmount != null ? String(p.depositAmount) : '',
  amenities: Array.isArray(p?.amenities) ? p.amenities.join(', ') : '',
  status: p?.status || 'available',
});

const formToPayload = (f) => ({
  name: f.name.trim(),
  description: f.description.trim() || null,
  price: f.price.trim(),
  priceNumber: f.priceNumber ? parseInt(f.priceNumber, 10) : null,
  rooms: f.rooms ? parseInt(f.rooms, 10) : null,
  guests: f.guests ? parseInt(f.guests, 10) : null,
  depositAmount: f.depositAmount ? parseFloat(f.depositAmount) : 0,
  amenities: f.amenities.split(',').map((s) => s.trim()).filter(Boolean),
  status: f.status,
});

export default function AdminProperties({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const styles = makeStyles();

  const [list, setList]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [editing, setEditing]     = useState(null); // null = create, объект = edit
  const [form, setForm]           = useState(EMPTY_FORM);
  const [photos, setPhotos]       = useState([]);   // фото редактируемого номера (resolved URLs from API)
  const [photoRaws, setPhotoRaws] = useState([]);   // относительные пути — нужны для DELETE
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);

  // bottom-sheet
  const [sheetMounted, setSheetMounted] = useState(false);
  const sheetTY = useRef(new Animated.Value(SHEET_H)).current;

  const openSheet = () => {
    sheetTY.setValue(SHEET_H);
    setSheetMounted(true);
    Animated.timing(sheetTY, {
      toValue: 0, duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };
  const closeSheet = () => {
    Animated.timing(sheetTY, {
      toValue: SHEET_H, duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setSheetMounted(false); });
  };
  const panResp = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) sheetTY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 0.8) {
        closeSheet();
      } else {
        Animated.spring(sheetTY, {
          toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
        }).start();
      }
    },
  })).current;

  const load = useCallback(async () => {
    try {
      const items = await PropertyService.getAllForAdmin();
      setList(items);
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось загрузить номера');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  };

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotos([]);
    setPhotoRaws([]);
    openSheet();
  };

  const handleOpenEdit = (item) => {
    setEditing(item);
    setForm(propertyToForm(item));
    setPhotos(item.photos || []);
    // photos из API — это абсолютные URL; для DELETE нужны относительные.
    // Сервер принимает оба варианта, поэтому здесь держим то же, что показываем.
    setPhotoRaws(item.photos || []);
    openSheet();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Проверьте поля', 'Название и цена обязательны');
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form);
      let saved;
      if (editing) {
        saved = await PropertyService.updateProperty(editing.id, payload);
      } else {
        saved = await PropertyService.createProperty(payload);
        setEditing(saved); // чтобы дальше можно было сразу грузить фото
      }
      // Обновляем список
      setList((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((p) => p.id === saved.id);
        if (idx >= 0) next[idx] = saved;
        else next.push(saved);
        return next.sort((a, b) => a.id - b.id);
      });
      setPhotos(saved.photos || []);
      setPhotoRaws(saved.photos || []);
      if (!editing) {
        Alert.alert('Готово', 'Номер создан. Теперь добавьте фото.');
      }
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhotos = async () => {
    if (!editing) {
      Alert.alert('Сначала создайте номер', 'Сохраните название и цену, затем загружайте фото.');
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Нет доступа', 'Разрешите доступ к галерее');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 20,
      });
      if (result.canceled) return;
      const assets = result.assets || [];
      if (assets.length === 0) return;
      setUploading(true);
      const updated = await PropertyService.uploadPhotos(editing.id, assets);
      setPhotos(updated.photos || []);
      setPhotoRaws(updated.photos || []);
      setEditing(updated);
      setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!editing) return;
    Alert.alert('Удалить фото?', 'Файл будет удалён без возможности восстановления.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await PropertyService.deletePhoto(editing.id, photoUrl);
            setPhotos(updated.photos || []);
            setPhotoRaws(updated.photos || []);
            setEditing(updated);
            setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } catch (err) {
            Alert.alert('Ошибка', err.message || 'Не удалось удалить');
          }
        },
      },
    ]);
  };

  const handleDeleteProperty = () => {
    if (!editing) return;
    Alert.alert(
      'Удалить номер?',
      `«${editing.name}» и все его фото будут удалены. Существующие бронирования сохранятся, но номер исчезнет из списка.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить', style: 'destructive',
          onPress: async () => {
            try {
              await PropertyService.deleteProperty(editing.id);
              setList((prev) => prev.filter((p) => p.id !== editing.id));
              closeSheet();
            } catch (err) {
              Alert.alert('Ошибка', err.message || 'Не удалось удалить номер');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Управление номерами
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Всего: {list.length}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenCreate}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {list.length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="hotel" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Пока нет ни одного номера
            </Text>
          </View>
        )}
        {list.map((item) => {
          const meta = STATUS_META[item.status] || STATUS_META.unavailable;
          return (
            <PropertyCard
              key={item.id}
              item={item}
              onSelect={handleOpenEdit}
              actionLabel="Редактировать"
              actionIcon="edit"
              statusBadge={meta}
            />
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {sheetMounted && (
        <Modal
          visible
          transparent
          statusBarTranslucent
          animationType="none"
          onRequestClose={closeSheet}
        >
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet} />
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.cardBg,
                  transform: [{ translateY: sheetTY }],
                  height: SHEET_H,
                },
              ]}
            >
              {/* Drag handle */}
              <View {...panResp.panHandlers} style={styles.dragHandleWrap}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>

              {/* Header: title слева, icon-buttons справа — как в NotificationCenter */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                    {editing ? 'Редактирование' : 'Новый номер'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {editing ? editing.name : 'Заполните параметры номера'}
                  </Text>
                </View>

                {editing && (
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}
                    onPress={handleDeleteProperty}
                    activeOpacity={0.8}
                    hitSlop={6}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={closeSheet}
                  activeOpacity={0.8}
                  hitSlop={6}
                >
                  <MaterialIcons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── ОСНОВНОЕ ── */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ОСНОВНОЕ</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <FieldInline label="Название" colors={colors}>
                    <TextInput
                      value={form.name}
                      onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                      placeholder="Люкс апартамент"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.input, { color: colors.text }]}
                    />
                  </FieldInline>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <FieldInline label="Описание" colors={colors}>
                    <TextInput
                      value={form.description}
                      onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                      placeholder="Полный комфорт, с видом на природу"
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      style={[styles.input, styles.textarea, { color: colors.text }]}
                    />
                  </FieldInline>
                </View>

                {/* ── ПАРАМЕТРЫ ── */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ПАРАМЕТРЫ</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.row2}>
                    <FieldInline label="Цена (текст)" colors={colors} flex>
                      <TextInput
                        value={form.price}
                        onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                        placeholder="200PRB/ночь"
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.input, { color: colors.text }]}
                      />
                    </FieldInline>
                    <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
                    <FieldInline label="Цена в PRB" colors={colors} flex>
                      <TextInput
                        value={form.priceNumber}
                        onChangeText={(v) => setForm((f) => ({ ...f, priceNumber: v.replace(/[^0-9]/g, '') }))}
                        placeholder="200"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        style={[styles.input, { color: colors.text }]}
                      />
                    </FieldInline>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.row2}>
                    <FieldInline label="Комнат" colors={colors} flex>
                      <TextInput
                        value={form.rooms}
                        onChangeText={(v) => setForm((f) => ({ ...f, rooms: v.replace(/[^0-9]/g, '') }))}
                        placeholder="10"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        style={[styles.input, { color: colors.text }]}
                      />
                    </FieldInline>
                    <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
                    <FieldInline label="Гостей" colors={colors} flex>
                      <TextInput
                        value={form.guests}
                        onChangeText={(v) => setForm((f) => ({ ...f, guests: v.replace(/[^0-9]/g, '') }))}
                        placeholder="20"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        style={[styles.input, { color: colors.text }]}
                      />
                    </FieldInline>
                    <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
                    <FieldInline label="Депозит" colors={colors} flex>
                      <TextInput
                        value={form.depositAmount}
                        onChangeText={(v) => setForm((f) => ({ ...f, depositAmount: v.replace(/[^0-9.]/g, '') }))}
                        placeholder="1000"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        style={[styles.input, { color: colors.text }]}
                      />
                    </FieldInline>
                  </View>
                </View>

                {/* ── УДОБСТВА ── */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>УДОБСТВА</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <FieldInline label="Через запятую" colors={colors}>
                    <TextInput
                      value={form.amenities}
                      onChangeText={(v) => setForm((f) => ({ ...f, amenities: v }))}
                      placeholder="WiFi, Кондиционер, TV, Бассейн"
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      style={[styles.input, styles.textarea, { color: colors.text }]}
                    />
                  </FieldInline>
                </View>

                {/* ── СТАТУС ── */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>СТАТУС</Text>
                <View style={styles.statusToggle}>
                  {Object.entries(STATUS_META).map(([key, meta]) => {
                    const active = form.status === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setForm((f) => ({ ...f, status: key }))}
                        activeOpacity={0.85}
                        style={[
                          styles.statusOpt,
                          {
                            borderColor: active ? meta.color : colors.border,
                            backgroundColor: active ? `${meta.color}18` : colors.background,
                          },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                        <Text style={[styles.statusOptText, { color: active ? meta.color : colors.textSecondary }]}>
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── ГАЛЕРЕЯ ── */}
                <View style={styles.galleryHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 0 }]}>
                    ГАЛЕРЕЯ
                  </Text>
                  <View style={styles.galleryRightWrap}>
                    {editing && (
                      <Text style={[styles.galleryCount, { color: colors.textSecondary }]}>
                        {photos.length} фото
                      </Text>
                    )}
                    {editing && (
                      <TouchableOpacity
                        style={[styles.galleryAddBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}55` }]}
                        onPress={handlePickPhotos}
                        disabled={uploading}
                        activeOpacity={0.85}
                      >
                        {uploading ? (
                          <ActivityIndicator color={colors.primary} size="small" />
                        ) : (
                          <>
                            <MaterialIcons name="add-photo-alternate" size={14} color={colors.primary} />
                            <Text style={[styles.galleryAddBtnText, { color: colors.primary }]}>Добавить</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {!editing ? (
                  <View style={[styles.galleryHint, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                    <MaterialIcons name="info-outline" size={16} color={colors.primary} />
                    <Text style={[styles.galleryHintText, { color: colors.text }]}>
                      Сначала сохраните номер — фото можно будет загрузить.
                    </Text>
                  </View>
                ) : photos.length === 0 ? (
                  <TouchableOpacity
                    style={[styles.galleryEmpty, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}08` }]}
                    onPress={handlePickPhotos}
                    disabled={uploading}
                    activeOpacity={0.85}
                  >
                    {uploading ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={32} color={colors.primary} />
                        <Text style={[styles.galleryEmptyTitle, { color: colors.text }]}>Нет фото</Text>
                        <Text style={[styles.galleryEmptySub, { color: colors.textSecondary }]}>
                          Нажмите, чтобы загрузить из галереи
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryScroll}
                  >
                    {photos.map((url, i) => (
                      <View key={`${url}-${i}`} style={styles.photoTile}>
                        <Image source={{ uri: url }} style={styles.photoImage} />
                        <TouchableOpacity
                          style={styles.photoDelete}
                          onPress={() => handleDeletePhoto(photoRaws[i] || url)}
                          hitSlop={6}
                        >
                          <MaterialIcons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.photoIndex}>
                          <Text style={styles.photoIndexText}>{i + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* Кнопка сохранения закреплена внизу — с учётом safe area */}
              <View
                style={[
                  styles.saveBar,
                  {
                    backgroundColor: colors.cardBg,
                    borderTopColor: colors.border,
                    paddingBottom: Math.max(insets.bottom, 12) + 4,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.75 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.88}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editing ? 'Сохранить' : 'Создать номер'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const FieldInline = ({ label, children, colors, flex }) => (
  <View style={[styles_field.wrap, flex && { flex: 1 }]}>
    <Text style={[styles_field.label, { color: colors.textSecondary }]}>{label}</Text>
    {children}
  </View>
);

const styles_field = StyleSheet.create({
  wrap:  { paddingHorizontal: 12, paddingVertical: 10 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 4, textTransform: 'uppercase' },
});

const makeStyles = () => StyleSheet.create({
  root:        { flex: 1 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header (centered title + circular add button — pattern from AdminUsers)
  header:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  headerIconBtn:  {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  title:       { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle:    { fontSize: 12, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  addButton:   {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },

  listContent: { paddingBottom: 24 },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 14, fontWeight: '600' },

  // ===== Modal (bottom-sheet) =====
  sheetBackdrop: { flex: 1, backgroundColor: BACKDROP_COLOR, justifyContent: 'flex-end' },
  sheet:       {
    width: '100%',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.18, shadowRadius: 24,
    elevation: 18,
  },
  dragHandleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  dragHandle:  { width: 40, height: 4, borderRadius: 2, opacity: 0.6 },

  modalHeader:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  modalHeaderTextWrap: { flex: 1, minWidth: 0 },
  modalTitle:          { fontSize: 20, fontWeight: '900' },
  modalSubtitle:       { fontSize: 11, marginTop: 2, fontWeight: '600' },
  iconBtn:             { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  sheetContent: { paddingHorizontal: spacing.md, paddingTop: 4 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 14, marginBottom: 6, paddingHorizontal: 2 },

  // Grouped input cards
  infoCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  divider:     { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  dividerV:    { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  row2:        { flexDirection: 'row' },
  input:       { fontSize: 14, paddingVertical: 0, margin: 0 },
  textarea:    { minHeight: 60, textAlignVertical: 'top', paddingTop: 4 },

  // Status toggle
  statusToggle: { flexDirection: 'row', gap: 8 },
  statusOpt:    { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusOptText:{ fontSize: 13, fontWeight: '800' },

  // Gallery
  galleryHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8, paddingHorizontal: 2 },
  galleryRightWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  galleryCount:      { fontSize: 11, fontWeight: '700' },
  galleryAddBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  galleryAddBtnText: { fontSize: 11, fontWeight: '800' },
  galleryHint:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  galleryHintText:   { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  galleryEmpty:      { paddingVertical: 26, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  galleryEmptyTitle: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  galleryEmptySub:   { fontSize: 11, fontWeight: '500' },
  galleryScroll:     { gap: 10, paddingRight: 8 },
  photoTile:         { width: 220, height: 160, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photoImage:        { width: '100%', height: '100%' },
  photoDelete:       { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  photoIndex:        { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  photoIndexText:    { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Sticky save bar
  saveBar:    {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn:    {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 2,
  },
  saveBtnText:{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },
});
