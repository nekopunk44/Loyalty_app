import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../context/AuthContext';
import VJMonogram from './VJMonogram';

const { width: W, height: H } = Dimensions.get('window');
const DISC_SIZE = Math.ceil(Math.sqrt(W * W + H * H) * 1.1); // covers all corners

const NAVY   = '#063B5C';
const TEAL   = '#14B8A6';
const AMBER  = '#F59E0B';
const CREAM = '#FBF6EC';
const PEACH = '#F4C7A7';
const PEARL = '#FFF8EF';
const SEAFOAM = '#D9F0E7';
const SKY = '#D7E7EA';

function UserBackdrop() {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="userBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={SKY} />
          <Stop offset="34%" stopColor={SEAFOAM} />
          <Stop offset="66%" stopColor={PEARL} />
          <Stop offset="100%" stopColor={PEACH} />
        </LinearGradient>
        <RadialGradient id="userGlowTop" cx="42%" cy="18%" r="58%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="userGlowSide" cx="4%" cy="52%" r="58%">
          <Stop offset="0%" stopColor={TEAL} stopOpacity="0.22" />
          <Stop offset="100%" stopColor={TEAL} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="userGlowBottom" cx="82%" cy="88%" r="56%">
          <Stop offset="0%" stopColor={AMBER} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="userVignette" cx="50%" cy="50%" r="72%">
          <Stop offset="0%" stopColor={NAVY} stopOpacity="0" />
          <Stop offset="100%" stopColor={NAVY} stopOpacity="0.10" />
        </RadialGradient>
        <LinearGradient id="userRibbon" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="46%" stopColor="#FFFFFF" stopOpacity="0.42" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#userBg)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#userGlowTop)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#userGlowSide)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#userGlowBottom)" />
      <Rect
        x={-W * 0.15}
        y={H * 0.18}
        width={W * 1.3}
        height={H * 0.18}
        fill="url(#userRibbon)"
        opacity={0.42}
        transform={`rotate(-18 ${W / 2} ${H * 0.28})`}
      />
      <Path
        d={`M ${W * 0.08} ${H * 0.28} C ${W * 0.32} ${H * 0.18}, ${W * 0.62} ${H * 0.18}, ${W * 0.92} ${H * 0.30}`}
        stroke={NAVY}
        strokeOpacity={0.08}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d={`M ${W * 0.12} ${H * 0.74} C ${W * 0.36} ${H * 0.66}, ${W * 0.68} ${H * 0.70}, ${W * 0.96} ${H * 0.58}`}
        stroke={TEAL}
        strokeOpacity={0.14}
        strokeWidth={1.4}
        fill="none"
      />
      <Circle cx={W * 0.86} cy={H * 0.16} r={118} stroke={NAVY} strokeOpacity={0.06} strokeWidth={1} fill="none" />
      <Circle cx={W * 0.16} cy={H * 0.86} r={92} stroke={TEAL} strokeOpacity={0.10} strokeWidth={1} fill="none" />
      {[0.18, 0.82, 0.22, 0.78, 0.50, 0.10, 0.90].map((x, i) => (
        <Circle
          key={i}
          cx={W * x}
          cy={H * ([0.20, 0.18, 0.78, 0.80, 0.12, 0.50, 0.50][i])}
          r={i % 2 ? 4 : 3}
          fill="#FFFFFF"
          opacity={0.36}
        />
      ))}
      <Rect x={0} y={0} width={W} height={H} fill="url(#userVignette)" />
    </Svg>
  );
}

function AdminBackdrop() {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="adminBg" cx="50%" cy="50%" r="75%">
          <Stop offset="0%" stopColor={NAVY} stopOpacity="1" />
          <Stop offset="100%" stopColor="#021823" stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id="adminGlow" cx="50%" cy="42%" r="35%">
          <Stop offset="0%" stopColor={AMBER} stopOpacity="0.22" />
          <Stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#adminBg)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#adminGlow)" />
    </Svg>
  );
}

const CONFIG = {
  user: {
    bg: CREAM,
    discBg: '#FFFFFF',
    icon: 'home',
    greeting: 'Добро пожаловать!',
    textColor: NAVY,
    accentColor: TEAL,
    dec1: 'rgba(6,59,92,0.10)',
    dec2: 'rgba(20,184,166,0.12)',
  },
  admin: {
    bg: NAVY,
    discBg: '#042D46',
    icon: 'admin-panel-settings',
    greeting: 'Панель управления',
    textColor: '#FFFFFF',
    accentColor: TEAL,
    dec1: `${TEAL}18`,
    dec2: `${AMBER}10`,
  },
};

export default function LoginTransitionOverlay({ type, onComplete }) {
  const { user } = useAuth();
  const cfg = CONFIG[type] || CONFIG.user;
  const isAdmin = type === 'admin';
  const useNative = Platform.OS !== 'web';

  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const discScale       = useRef(new Animated.Value(0)).current;
  const contentOpacity  = useRef(new Animated.Value(0)).current;
  const contentScale    = useRef(new Animated.Value(0.96)).current;
  const contentY        = useRef(new Animated.Value(12)).current;
  const lineWidth       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Keyboard.dismiss();

    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1, duration: 140, useNativeDriver: useNative,
      }),
      Animated.parallel([
        Animated.spring(discScale, {
          toValue: 1, tension: 45, friction: 7, useNativeDriver: useNative,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1, duration: 520, useNativeDriver: useNative,
        }),
        Animated.timing(contentScale, {
          toValue: 1, duration: 560, useNativeDriver: useNative,
        }),
        Animated.timing(contentY, {
          toValue: 0, duration: 560, useNativeDriver: useNative,
        }),
        Animated.timing(lineWidth, {
          toValue: 1, duration: 620, useNativeDriver: false,
        }),
      ]),
      Animated.delay(720),
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
      {isAdmin ? <AdminBackdrop /> : <UserBackdrop />}

      {isAdmin && (
        <Animated.View style={[
          styles.disc,
          { backgroundColor: cfg.discBg, opacity: 0.55, transform: [{ scale: discScale }] },
        ]} />
      )}

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
        { opacity: contentOpacity, transform: [{ translateY: contentY }, { scale: contentScale }] },
      ]}>
        <View style={styles.iconCircle}>
          <VJMonogram
            size={132}
            mainColor={isAdmin ? '#FFFFFF' : NAVY}
            accentColor={AMBER}
            animate={false}
          />
        </View>

        {/* Animated accent line */}
        <Animated.View style={[styles.accentLine, {
          width: animatedLineWidth,
          backgroundColor: cfg.accentColor,
        }]} />

        <Text style={[styles.greeting, { color: cfg.textColor }]}>{cfg.greeting}</Text>
        {!!displayName && (
          <Text style={[styles.userName, { color: cfg.accentColor }]}>
            {displayName}
          </Text>
        )}

        {/* Small status badge */}
        <View style={[styles.badge, {
          backgroundColor: type === 'admin' ? `${TEAL}25` : 'rgba(255,255,255,0.42)',
          borderColor: type === 'admin' ? `${TEAL}50` : 'rgba(6,59,92,0.12)',
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
