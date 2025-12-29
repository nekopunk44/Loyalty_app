import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing, Dimensions, PanResponder } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationCenter from '../../screens/user/NotificationCenter';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.88;

export default function NotificationBell({ color = '#fff' }) {
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const { getUnreadCount } = useNotification();
  const { theme } = useTheme();
  const unread = getUnreadCount();

  const open = () => {
    translateY.setValue(SHEET_H);
    setMounted(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const close = () => {
    Animated.timing(translateY, {
      toValue: SHEET_H,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.8) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  return (
    <>
      <TouchableOpacity onPress={open} style={styles.bell} activeOpacity={0.7}>
        <MaterialIcons name="notifications" size={24} color={color} />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={mounted}
        animationType="none"
        transparent
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={close} />
          <Animated.View
            style={[
              styles.sheet,
              {
                height: SHEET_H,
                backgroundColor: theme.colors.background,
                transform: [{ translateY }],
              },
            ]}
          >
            <NotificationCenter onClose={close} dragHandlers={panResponder.panHandlers} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { marginRight: 16, padding: 4 },
  badge: {
    position: 'absolute', top: 0, right: 8,
    backgroundColor: '#FF3B30', borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 14 },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6, 18, 30, 0.46)',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
});
