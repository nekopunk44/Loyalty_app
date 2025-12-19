import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetwork } from '../../context/NetworkContext';

export default function OfflineBanner() {
  const { isOffline } = useNetwork();
  const translateY = useRef(new Animated.Value(-44)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -44,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>⚡ Нет соединения · показаны кэшированные данные</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
