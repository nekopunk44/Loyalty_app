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
  Platform,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import PropertyService from '../../services/PropertyService';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.92;

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

export default function AdminProperties() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = makeStyles(colors);

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
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => { if (g.dy > 0) sheetTY.setValue(g.dy); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 0.8) closeSheet();
      else Animated.spring(sheetTY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
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
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Номера</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {list.length} {list.length === 1 ? 'номер' : 'номеров'} в каталоге
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreate}>
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Добавить</Text>
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
          const cover = item.photos?.[0] || item.image;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.85}
            >
              {cover ? (
                <Image source={{ uri: cover }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <MaterialIcons name="image" size={28} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.cardPrice, { color: colors.primary }]} numberOfLines={1}>
                  {item.price}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.rooms ? `${item.rooms} комн.  • ` : ''}до {item.guests || '—'} гостей  •  фото: {item.photos?.length || 0}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: `${meta.color}1A` }]}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {sheetMounted && (
        <Modal transparent animationType="none" visible onRequestClose={closeSheet}>
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} activeOpacity={1} />
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  transform: [{ translateY: sheetTY }],
                  height: SHEET_H,
                },
              ]}
            >
              <View {...panResp.panHandlers} style={styles.dragHandleArea}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {editing ? 'Редактировать номер' : 'Новый номер'}
                </Text>

                <Field label="Название" colors={colors}>
                  <TextInput
                    value={form.name}
                    onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                    placeholder="Люкс апартамент"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  />
                </Field>

                <Field label="Описание" colors={colors}>
                  <TextInput
                    value={form.description}
                    onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                    placeholder="Полный комфорт, с видом на природу"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border }]}
                  />
                </Field>

                <View style={styles.row2}>
                  <Field label="Цена (текст)" colors={colors} flex>
                    <TextInput
                      value={form.price}
                      onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                      placeholder="200PRB/ночь"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    />
                  </Field>
                  <Field label="Цена в PRB" colors={colors} flex>
                    <TextInput
                      value={form.priceNumber}
                      onChangeText={(v) => setForm((f) => ({ ...f, priceNumber: v.replace(/[^0-9]/g, '') }))}
                      placeholder="200"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    />
                  </Field>
                </View>

                <View style={styles.row2}>
                  <Field label="Комнат" colors={colors} flex>
                    <TextInput
                      value={form.rooms}
                      onChangeText={(v) => setForm((f) => ({ ...f, rooms: v.replace(/[^0-9]/g, '') }))}
                      placeholder="10"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    />
                  </Field>
                  <Field label="Гостей" colors={colors} flex>
                    <TextInput
                      value={form.guests}
                      onChangeText={(v) => setForm((f) => ({ ...f, guests: v.replace(/[^0-9]/g, '') }))}
                      placeholder="20"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="number-pad"
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    />
                  </Field>
                  <Field label="Депозит" colors={colors} flex>
                    <TextInput
                      value={form.depositAmount}
                      onChangeText={(v) => setForm((f) => ({ ...f, depositAmount: v.replace(/[^0-9.]/g, '') }))}
                      placeholder="1000"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    />
                  </Field>
                </View>

                <Field label="Удобства (через запятую)" colors={colors}>
                  <TextInput
                    value={form.amenities}
                    onChangeText={(v) => setForm((f) => ({ ...f, amenities: v }))}
                    placeholder="WiFi, Кондиционер, TV, Бассейн"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    style={[styles.input, styles.textarea, { color: colors.text, borderColor: colors.border }]}
                  />
                </Field>

                <Field label="Статус" colors={colors}>
                  <View style={styles.statusToggle}>
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setForm((f) => ({ ...f, status: key }))}
                        style={[
                          styles.statusOpt,
                          {
                            borderColor: form.status === key ? meta.color : colors.border,
                            backgroundColor: form.status === key ? `${meta.color}14` : 'transparent',
                          },
                        ]}
                      >
                        <Text style={[styles.statusOptText, { color: form.status === key ? meta.color : colors.textSecondary }]}>
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {editing ? 'Сохранить' : 'Создать'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* ─── фото ─── */}
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Фотогалерея {editing ? `(${photos.length})` : ''}
                </Text>
                {!editing && (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Сначала сохраните номер — фото можно будет загрузить.
                  </Text>
                )}
                <View style={styles.photosGrid}>
                  {photos.map((url, i) => (
                    <View key={`${url}-${i}`} style={styles.photoTile}>
                      <Image source={{ uri: url }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.photoDelete}
                        onPress={() => handleDeletePhoto(photoRaws[i] || url)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.photoTile, styles.photoAdd, { borderColor: colors.border }, !editing && { opacity: 0.4 }]}
                    onPress={handlePickPhotos}
                    disabled={!editing || uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={28} color={colors.primary} />
                        <Text style={[styles.photoAddText, { color: colors.primary }]}>Добавить</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {editing && (
                  <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteProperty}>
                    <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                    <Text style={styles.dangerBtnText}>Удалить номер</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const Field = ({ label, children, colors, flex }) => (
  <View style={[{ marginBottom: 14 }, flex && { flex: 1 }]}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </Text>
    {children}
  </View>
);

const makeStyles = (colors) => StyleSheet.create({
  root:        { flex: 1 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14 },
  title:       { fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },
  subtitle:    { fontSize: 12, marginTop: 4, fontWeight: '600' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addBtnText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 14, fontWeight: '600' },

  card:        { flexDirection: 'row', borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden', padding: 10, gap: 12, alignItems: 'center' },
  cardImage:   { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1, gap: 3 },
  cardTitle:   { fontSize: 15, fontWeight: '800' },
  cardPrice:   { fontSize: 13, fontWeight: '700' },
  cardMeta:    { fontSize: 11, fontWeight: '600' },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 10, fontWeight: '800' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' },
  dragHandleArea: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  dragHandle:  { width: 48, height: 5, borderRadius: 4 },
  sheetContent:{ padding: 18 },
  sheetTitle:  { fontSize: 20, fontWeight: '900', marginBottom: 18 },
  row2:        { flexDirection: 'row', gap: 10 },
  input:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 14 },
  textarea:    { minHeight: 70, textAlignVertical: 'top' },
  statusToggle:{ flexDirection: 'row', gap: 8 },
  statusOpt:   { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  statusOptText:{ fontSize: 13, fontWeight: '800' },
  saveBtn:     { marginTop: 8, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  sectionLabel:{ fontSize: 14, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  hint:        { fontSize: 12, marginBottom: 10 },
  photosGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoTile:   { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImage:  { width: '100%', height: '100%' },
  photoDelete: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  photoAdd:    { borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  photoAddText:{ fontSize: 11, fontWeight: '700' },

  dangerBtn:   { marginTop: 20, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#EF444433' },
  dangerBtnText:{ color: '#EF4444', fontWeight: '800', fontSize: 13 },
});
