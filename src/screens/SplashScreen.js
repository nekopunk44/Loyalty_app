import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing } from '../constants/theme';

export default function SplashScreen({ navigation }) {
  const logoScale = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const loadingOpacity = new Animated.Value(0);

  useEffect(() => {
    console.log('🎬 SplashScreen монтирован');

    // Определить поддерживается ли useNativeDriver (только на мобильных)
    const useNative = typeof window === 'undefined'; // false на web

    // Анимация логотипа - вход с масштабированием
    Animated.timing(logoScale, {
      toValue: 1,
      duration: 800,
      useNativeDriver: useNative,
    }).start();

    // Анимация текста - появление
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: useNative,
    }).start();

    // Анимация загрузки - появление
    Animated.timing(loadingOpacity, {
      toValue: 1,
      duration: 600,
      delay: 600,
      useNativeDriver: useNative,
    }).start();

    // Автоматический переход на экран входа после завершения анимации
    const timer = setTimeout(() => {
      console.log('🚀 Переход на LoginScreen');
      navigation.replace('Login');
    }, 3000);

    console.log('✅ SplashScreen анимации стартовали');
    
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Фоновый градиент */}
      <View style={styles.background}>
        <View style={styles.topCircle} />
        <View style={styles.bottomCircle} />
      </View>

      {/* Основной контент */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              {
                scale: logoScale,
              },
            ],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <MaterialIcons name="card-giftcard" size={80} color={colors.primary} />
          <MaterialIcons
            name="favorite"
            size={32}
            color={colors.accent}
            style={styles.heartIcon}
          />
        </View>
      </Animated.View>

      {/* Текст приложения */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
          },
        ]}
      >
        <Text style={styles.appName}>Villa Jaconda</Text>
        <Text style={styles.subtitle}>Программа лояльности</Text>
      </Animated.View>

      {/* Индикатор загрузки */}
      <Animated.View
        style={[
          styles.loadingContainer,
          {
            opacity: loadingOpacity,
          },
        ]}
      >
        <View style={styles.loadingDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </Animated.View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  topCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary + '15',
    top: -50,
    right: -50,
  },
  bottomCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accent + '15',
    bottom: -40,
    left: -40,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
};
