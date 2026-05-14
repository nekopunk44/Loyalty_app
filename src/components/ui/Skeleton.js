import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function Bone({ width, height, borderRadius = 6, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Одна строка-заглушка */
export function SkeletonLine({ width = '100%', height = 14, style }) {
  return <Bone width={width} height={height} style={style} />;
}

/** Прямоугольный блок-заглушка */
export function SkeletonBlock({ width = '100%', height = 80, borderRadius = 12, style }) {
  return <Bone width={width} height={height} borderRadius={borderRadius} style={style} />;
}

/** Карточка объекта (изображение + 2 строки текста) */
export function SkeletonPropertyCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <Bone width="100%" height={190} borderRadius={16} />
      <Bone width="65%" height={16} style={styles.mt12} />
      <Bone width="45%" height={12} style={styles.mt8} />
      <View style={styles.row}>
        <Bone width="30%" height={12} />
        <Bone width="20%" height={12} />
      </View>
    </View>
  );
}

/** Строка в списке бронирований */
export function SkeletonBookingRow({ style }) {
  return (
    <View style={[styles.bookingRow, style]}>
      <Bone width={56} height={56} borderRadius={12} />
      <View style={styles.bookingText}>
        <Bone width="60%" height={14} />
        <Bone width="40%" height={11} style={styles.mt8} />
      </View>
      <Bone width={64} height={28} borderRadius={8} />
    </View>
  );
}

/** Полная заглушка экрана (3 карточки) */
export function SkeletonScreen() {
  return (
    <View style={styles.screen}>
      <SkeletonPropertyCard />
      <SkeletonPropertyCard style={styles.mt16} />
      <SkeletonPropertyCard style={styles.mt16} />
    </View>
  );
}

const styles = StyleSheet.create({
  bone:        { backgroundColor: '#CBD5E1' },
  card:        { padding: 4, marginBottom: 8 },
  mt8:         { marginTop: 8 },
  mt12:        { marginTop: 12 },
  mt16:        { marginTop: 16 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  bookingRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  bookingText: { flex: 1 },
  screen:      { flex: 1, padding: 16 },
});
