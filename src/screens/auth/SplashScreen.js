import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import VJMonogram from '../../components/auth/VJMonogram';

const NAVY = '#063B5C';
const TEAL = '#14B8A6';
const AMBER = '#F59E0B';

const SPLASH_THEME = {
  light: {
    rootBg: '#F4F1EA',
    gradient: ['#69C8BA', '#FFD0AE', '#FFB261'],
    brandText: NAVY,
    secondaryText: '#6B7280',
    line: 'rgba(20,184,166,0.62)',
    logoColor: NAVY,
    badgeBorder: '#F4F1EA',
    dot: NAVY,
  },
  dark: {
    rootBg: '#0B1426',
    gradient: ['#071827', '#065B66', '#102E4A'],
    brandText: '#FFFFFF',
    secondaryText: '#B6C2D2',
    line: 'rgba(245,158,11,0.72)',
    logoColor: '#FFFFFF',
    badgeBorder: '#0B1426',
    dot: '#FFFFFF',
  },
};

function SplashGradientBackdrop({ palette, id }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`splashBase${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={palette.gradient[0]} />
          <Stop offset="0.58" stopColor={palette.gradient[1]} />
          <Stop offset="1" stopColor={palette.gradient[2]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#splashBase${id})`} />
    </Svg>
  );
}

export default function SplashScreen({ navigation }) {
  const { isDark } = useTheme();
  const palette = isDark ? SPLASH_THEME.dark : SPLASH_THEME.light;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(20)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const dot1Scale = useRef(new Animated.Value(0.6)).current;
  const dot2Scale = useRef(new Animated.Value(0.6)).current;
  const dot3Scale = useRef(new Animated.Value(0.6)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const gradientShift = useRef(new Animated.Value(0)).current;
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Web doesn't support useNativeDriver for some properties
  const useNative = typeof window === 'undefined';

  const lightGradientOpacity = themeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const darkGradientOpacity = themeAnim;
  const gradientX = gradientShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 28],
  });
  const gradientY = gradientShift.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -18],
  });

  useEffect(() => {
    // 1. Logo springs in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 6,
        useNativeDriver: useNative,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: useNative,
      }),
    ]).start();

    // 2. Ripple ring expands and fades
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.6, duration: 200, useNativeDriver: useNative }),
        Animated.timing(ringScale, { toValue: 1, duration: 500, useNativeDriver: useNative }),
      ]),
      Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: useNative }),
    ]).start();

    // 4. Badge pops in
    Animated.spring(badgeScale, {
      toValue: 1,
      tension: 80,
      friction: 5,
      delay: 450,
      useNativeDriver: useNative,
    }).start();

    // 5. Text slides up and fades in
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 500,
        useNativeDriver: useNative,
      }),
      Animated.timing(textY, {
        toValue: 0,
        duration: 500,
        delay: 500,
        useNativeDriver: useNative,
      }),
    ]).start();

    // 6. Loading section appears then dots bounce
    Animated.timing(loadingOpacity, {
      toValue: 1,
      duration: 400,
      delay: 800,
      useNativeDriver: useNative,
    }).start(() => {
      const bounceDot = (anim, initialDelay) => {
        Animated.sequence([
          Animated.delay(initialDelay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: useNative }),
              Animated.timing(anim, { toValue: 0.5, duration: 260, useNativeDriver: useNative }),
              Animated.delay(260),
            ])
          ),
        ]).start();
      };
      bounceDot(dot1Scale, 0);
      bounceDot(dot2Scale, 180);
      bounceDot(dot3Scale, 360);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(gradientShift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(gradientShift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: useNative,
      }).start(() => {
        try {
          navigation.replace('Login');
        } catch (error) {
          console.error('❌ Ошибка при переходе:', error);
        }
      });
    }, 2600);

    return () => clearTimeout(timer);
  }, [navigation]);

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [isDark, themeAnim]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: palette.rootBg, opacity: containerOpacity }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gradientPlane,
          { opacity: lightGradientOpacity, transform: [{ translateX: gradientX }, { translateY: gradientY }] },
        ]}
      >
        <SplashGradientBackdrop palette={SPLASH_THEME.light} id="Light" />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gradientPlane,
          { opacity: darkGradientOpacity, transform: [{ translateX: gradientX }, { translateY: gradientY }] },
        ]}
      >
        <SplashGradientBackdrop palette={SPLASH_THEME.dark} id="Dark" />
      </Animated.View>

      {/* Logo block */}
      <View style={styles.logoSection}>
        {/* Ripple ring */}
        <Animated.View style={[
          styles.logoRipple,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]} />

        {/* Main logo */}
        <Animated.View style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <VJMonogram
            size={128}
            mainColor={palette.logoColor}
            accentColor={AMBER}
            startDelay={120}
            fast
          />

          {/* Amber badge */}
          <Animated.View style={[
            [styles.logoBadge, { borderColor: palette.badgeBorder }],
            { transform: [{ scale: badgeScale }] },
          ]}>
            <View style={styles.logoBadgeDot} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* App name */}
      <Animated.View style={[
        styles.textBlock,
        { opacity: textOpacity, transform: [{ translateY: textY }] },
      ]}>
        <Text style={[styles.appName, { color: palette.brandText }]}>Villa Jaconda</Text>
        <View style={styles.subtitleRow}>
          <View style={[styles.subtitleLine, { backgroundColor: palette.line }]} />
          <Text style={[styles.appSubtitle, { color: palette.secondaryText }]}>Программа лояльности</Text>
          <View style={[styles.subtitleLine, { backgroundColor: palette.line }]} />
        </View>
      </Animated.View>

      {/* Animated loading dots */}
      <Animated.View style={[styles.loadingWrap, { opacity: loadingOpacity }]}>
        <Animated.View style={[styles.dot, { backgroundColor: palette.dot, transform: [{ scale: dot1Scale }] }]} />
        <Animated.View style={[styles.dot, styles.dotMid, { transform: [{ scale: dot2Scale }] }]} />
        <Animated.View style={[styles.dot, { backgroundColor: palette.dot, transform: [{ scale: dot3Scale }] }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradientPlane: {
    position: 'absolute',
    top: '-12%',
    left: '-12%',
    width: '124%',
    height: '124%',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoRipple: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: TEAL,
  },
  logoWrap: {
    position: 'relative',
  },
  logoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AMBER,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F8F9FA',
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  logoBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  // Text
  textBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  subtitleLine: {
    flex: 1,
    height: 1,
    maxWidth: 32,
    backgroundColor: `${TEAL}80`,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Loading
  loadingWrap: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NAVY,
  },
  dotMid: {
    backgroundColor: TEAL,
  },
});
