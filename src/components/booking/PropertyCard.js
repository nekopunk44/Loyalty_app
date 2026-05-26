import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Platform, StyleSheet, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HorizontalScrollView from '../ui/HorizontalScrollView';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

const NAVY  = '#063B5C';
const TEAL  = '#14B8A6';
const CORAL = '#FF6B35';
const MARGIN = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_WIDTH  = Math.min(SCREEN_WIDTH - MARGIN * 2, 430);
const PHOTO_HEIGHT = 214;

const getPhotoSource = (photo) => (typeof photo === 'string' ? { uri: photo } : photo);
const getVisibleAmenities = (amenities = []) => amenities.slice(0, 4);

export default function PropertyCard({ item, onSelect }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = makeStyles(colors);

  const visibleAmenities = getVisibleAmenities(item.amenities);
  const hiddenCount = Math.max(0, item.amenities.length - visibleAmenities.length);

  return (
    <View>
      <View style={styles.card}>
        <View style={styles.accent} />
        {item.photos && item.photos.length > 0 && (
          <View style={styles.gallery}>
            <HorizontalScrollView
              contentContainerStyle={styles.galleryContent}
              showNavButtons={Platform.OS === 'web'}
              navButtonColor={colors.primary}
              navButtonSize={20}
              forceShowButtons={Platform.OS === 'web'}
              itemWidth={PHOTO_WIDTH}
              itemGap={0}
            >
              {item.photos.map((photo, i) => (
                <Image
                  key={i}
                  source={getPhotoSource(photo)}
                  style={styles.photo}
                  fadeDuration={0}
                  resizeMethod="resize"
                  progressiveRenderingEnabled
                />
              ))}
            </HorizontalScrollView>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
            <Text style={styles.price} numberOfLines={1}>{item.price}</Text>
          </View>

          <View style={styles.features}>
            {item.rooms && (
              <View style={styles.featureItem}>
                <MaterialIcons name="meeting-room" size={14} color={TEAL} />
                <Text style={styles.featureText}>{item.rooms} комн.</Text>
              </View>
            )}
            <View style={styles.featureItem}>
              <MaterialIcons name="people" size={14} color={TEAL} />
              <Text style={styles.featureText}>до {item.guests} гостей</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.amenitiesScroller}
            contentContainerStyle={styles.amenitiesContent}
          >
            {visibleAmenities.map((a, i) => (
              <View key={i} style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>{a}</Text>
              </View>
            ))}
            {hiddenCount > 0 && (
              <View style={[styles.badge, styles.badgeMore]}>
                <Text style={[styles.badgeText, styles.badgeMoreText]}>+{hiddenCount}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={() => onSelect(item)}>
            <MaterialIcons name="date-range" size={18} color="#fff" />
            <Text style={styles.buttonText}>Выбрать даты</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card:            { backgroundColor: colors.cardBg, borderRadius: 20, marginHorizontal: MARGIN, marginBottom: 18, elevation: 5, shadowColor: NAVY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  accent:          { height: 3, backgroundColor: TEAL },
  gallery:         { height: PHOTO_HEIGHT, backgroundColor: colors.border, overflow: Platform.OS === 'web' ? 'visible' : 'hidden' },
  galleryContent:  { paddingHorizontal: 0, gap: 0, alignItems: 'center', justifyContent: 'center' },
  photo:           { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, backgroundColor: colors.border },
  body:            { padding: 16 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  name:            { fontSize: 19, fontWeight: '900', color: colors.text },
  description:     { fontSize: 13, color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
  price:           { fontSize: 15, fontWeight: '900', color: CORAL, backgroundColor: `${CORAL}10`, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, overflow: 'hidden' },
  features:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  featureItem:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${TEAL}12`, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  featureText:     { fontSize: 11, color: TEAL, fontWeight: '700' },
  amenitiesScroller: { marginBottom: 16, maxHeight: 42 },
  amenitiesContent:  { flexDirection: 'row', gap: 8, paddingRight: 8 },
  badge:           { backgroundColor: colors.background, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  badgeText:       { fontSize: 12, color: colors.text, fontWeight: '700' },
  badgeMore:       { backgroundColor: `${TEAL}12`, borderColor: `${TEAL}24` },
  badgeMoreText:   { color: TEAL },
  button:          { backgroundColor: NAVY, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, shadowColor: NAVY, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.22, shadowRadius: 9, elevation: 5 },
  buttonText:      { color: '#fff', fontSize: 14, fontWeight: '800' },
});
