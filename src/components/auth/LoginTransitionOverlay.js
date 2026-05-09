import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const DISC_SIZE = Math.ceil(Math.sqrt(W * W + H * H) * 1.1); // covers all corners

const NAVY   = '#063B5C';
const TEAL   = '#14B8A6';
const AMBER  = '#F59E0B';
const ORANGE = '#FF6B35';

const CONFIG = {
  user: {
    bg: ORANGE,
    discBg: '#E85A26',
    icon: 'home',
    greeting: 'Добро пожаловать!',
    accentColor: 'rgba(255,255,255,0.75)',
    dec1: 'rgba(255,255,255,0.06)',
    dec2: 'rgba(255,255,255,0.04)',
  },
  admin: {
    bg: NAVY,
    discBg: '#042D46',
    icon: 'admin-panel-settings',
    greeting: 'Панель управления',
    accentColor: TEAL,
    dec1: `${TEAL}18`,
    dec2: `${AMBER}10`,
  },
};

export default function LoginTransitionOverlay({ type, onComplete }) {
  const { user } = useAuth();
  const cfg = CONFIG[type] || CONFIG.user;
  const useNative = Platform.OS !== 'web';

  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const discScale       = useRef(new Animated.Value(0)).current;
  const contentOpacity  = useRef(new Animated.Value(0)).current;
  const contentScale    = useRef(new Animated.Value(0.55)).current;
  const lineWidth       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Overlay appears
      Animated.timing(overlayOpacity, {
        toValue: 1, duration: 80, useNativeDriver: useNative,
      }),
      // 2. Disc expands from center
      Animated.spring(discScale, {
        toValue: 1, tension: 45, friction: 7, useNativeDriver: useNative,
      }),
      // 3. Content springs in + accent line extends
      Animated.parallel([
        Animated.spring(contentScale, {
          toValue: 1, tension: 60, friction: 7, useNativeDriver: useNative,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1, duration: 280, useNativeDriver: useNative,
        }),
        Animated.timing(lineWidth, {
          toValue: 1, duration: 380, useNativeDriver: false,
        }),
      ]),
      // 4. Hold
      Animated.delay(720),
      // 5. Fade out
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 420, useNativeDriver: useNative,
      }),
    ]).start(() => onComplete?.());
  }, []);

  const animatedLineWidth = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const displayName = user?.displayName || user?.name || '';

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      {/* Background fill */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: cfg.bg }]} />

      {/* Expanding disc (darker shade from center) */}
      <Animated.View style={[
        styles.disc,
        { backgroundColor: cfg.discBg, transform: [{ scale: discScale }] },
      ]} />

      {/* Decorative rings */}
      <View style={[styles.decRing, {
        width: 280, height: 280, borderRadius: 140,
        borderColor: cfg.dec1, top: -80, right: -80,
      }]} />
      <View style={[styles.decRing, {
        width: 200, height: 200, borderRadius: 100,
        borderColor: cfg.dec2, bottom: -50, left: -50,
      }]} />

      {/* Central content */}
      <Animated.View style={[
        styles.content,
        { opacity: contentOpacity, transform: [{ scale: contentScale }] },
      ]}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, {
          backgroundColor: type === 'admin' ? `${TEAL}20` : 'rgba(255,255,255,0.18)',
          borderColor: type === 'admin' ? `${TEAL}60` : 'rgba(255,255,255,0.45)',
        }]}>
          <MaterialIcons name={cfg.icon} size={56} color="#fff" />
        </View>

        {/* Animated accent line */}
        <Animated.View style={[styles.accentLine, {
          width: animatedLineWidth,
          backgroundColor: cfg.accentColor,
        }]} />

        <Text style={styles.greeting}>{cfg.greeting}</Text>
        {!!displayName && (
          <Text style={[styles.userName, { color: cfg.accentColor }]}>
            {displayName}
          </Text>
        )}

        {/* Small status badge */}
        <View style={[styles.badge, {
          backgroundColor: type === 'admin' ? `${TEAL}25` : 'rgba(255,255,255,0.15)',
          borderColor: type === 'admin' ? `${TEAL}50` : 'rgba(255,255,255,0.3)',
        }]}>
          <MaterialIcons
            name={type === 'admin' ? 'verified-user' : 'check-circle'}
            size={14}
            color={cfg.accentColor}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.badgeText, { color: cfg.accentColor }]}>
            {type === 'admin' ? 'Администратор' : 'Участник программы'}
          </Text>
        </View>
      </Animated.View>

      {/* Corner VJ watermark */}
      <View style={styles.watermark}>
        <Text style={styles.watermarkText}>VJ</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  disc: {
    position: 'absolute',
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    top: H / 2 - DISC_SIZE / 2,
    left: W / 2 - DISC_SIZE / 2,
  },
  decRing: {
    position: 'absolute',
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  accentLine: {
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  watermark: {
    position: 'absolute',
    bottom: 36,
    opacity: 0.15,
  },
  watermarkText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
});
