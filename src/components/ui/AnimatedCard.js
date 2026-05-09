import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';

// Определяем поддержку native driver (false на web, true на мобильных)
const USE_NATIVE = typeof window === 'undefined';

/**
 * Компонент с плавной fade-in анимацией
 */
export const FadeInCard = ({ children, delay = 0, style }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: delay,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [fadeAnim, delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * Компонент с плавной scale анимацией (увеличение)
 */
export const ScaleInCard = ({ children, delay = 0, style }) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();
  }, [scaleAnim, fadeAnim, delay]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Компонент с плавной slide-from-left анимацией
 */
export const SlideInLeftCard = ({ children, delay = 0, style }) => {
  const slideAnim = React.useRef(new Animated.Value(-50)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();
  }, [slideAnim, fadeAnim, delay]);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Компонент с плавной slide-from-right анимацией
 */
export const SlideInRightCard = ({ children, delay = 0, style }) => {
  const slideAnim = new Animated.Value(50);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Компонент с плавной slide-from-bottom анимацией
 */
export const SlideInBottomCard = ({ children, delay = 0, style }) => {
  const slideAnim = new Animated.Value(50);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Компонент с плавным fade-out удалением
 * Используется когда элемент нужно убрать со страницы
 */
export const FadeOutCard = ({ children, delay = 0, style, onRemove, isRemoving = false }) => {
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRemoving) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          delay: delay,
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 400,
          delay: delay,
          useNativeDriver: USE_NATIVE,
        }),
      ]).start(() => {
        if (onRemove) {
          onRemove();
        }
      });
    }
  }, [isRemoving, fadeAnim, scaleAnim, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};
