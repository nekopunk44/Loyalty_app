import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '../../constants/theme';

const NAVY = '#063B5C';
const TEAL = '#14B8A6';
const AMBER = '#F59E0B';

export default function SplashScreen({ navigation }) {
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
  const accentWidth = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Web doesn't support useNativeDriver for some properties
  const useNative = typeof window === 'undefined';

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

    // 3. Accent line expands
    Animated.timing(accentWidth, {
      toValue: 1,
      duration: 500,
      delay: 350,
      useNativeDriver: false,
    }).start();

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

  const accentLineWidth = accentWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 44],
  });

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Decorative background shapes */}
      <View style={styles.bgArcTop} />
      <View style={styles.bgCircleTopRight} />
      <View style={styles.bgCircleBottomLeft} />
      <View style={styles.bgDiamondCenter} />

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
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Text style={styles.logoMonogram}>VJ</Text>
              <Animated.View style={[styles.logoAccentLine, { width: accentLineWidth }]} />
            </View>
          </View>

          {/* Amber badge */}
          <Animated.View style={[
            styles.logoBadge,
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
        <Text style={styles.appName}>Villa Jaconda</Text>
        <View style={styles.subtitleRow}>
          <View style={styles.subtitleLine} />
          <Text style={styles.appSubtitle}>Программа лояльности</Text>
          <View style={styles.subtitleLine} />
        </View>
      </Animated.View>

      {/* Animated loading dots */}
      <Animated.View style={[styles.loadingWrap, { opacity: loadingOpacity }]}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dot1Scale }] }]} />
        <Animated.View style={[styles.dot, styles.dotMid, { transform: [{ scale: dot2Scale }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dot3Scale }] }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Background decorations
  bgArcTop: {
    position: 'absolute',
    top: -120,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: `${NAVY}08`,
  },
  bgCircleTopRight: {
    position: 'absolute',
    top: -30,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${colors.primary}10`,
  },
  bgCircleBottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${TEAL}0C`,
  },
  bgDiamondCenter: {
    position: 'absolute',
    bottom: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${AMBER}08`,
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
    borderRadius: 30,
    borderWidth: 2,
    borderColor: TEAL,
  },
  logoWrap: {
    position: 'relative',
  },
  logoOuter: {
    width: 110,
    height: 110,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: `${TEAL}60`,
    padding: 6,
    backgroundColor: 'transparent',
  },
  logoInner: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoMonogram: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  logoAccentLine: {
    height: 3,
    backgroundColor: AMBER,
    borderRadius: 2,
    marginTop: 6,
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
    color: colors.textSecondary,
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
