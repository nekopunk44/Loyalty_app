import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated, Easing, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNotification } from '../../context/NotificationContext';
import NotificationCenter from '../../screens/user/NotificationCenter';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H  = SCREEN_H * 0.88;

export default function NotificationBell({ color = '#fff' }) {
  const [mounted, setMounted] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const { getUnreadCount } = useNotification();
  const unread = getUnreadCount();

  const open = () => {
    sheetAnim.setValue(0);
    setMounted(true);
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 360,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  };

  const close = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  };

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
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={close} />
          <Animated.View
            style={[
              styles.sheet,
              {
                height: SHEET_H,
                transform: [{
                  translateY: sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_H, 0],
                  }),
                }],
              },
            ]}
          >
            <NotificationCenter onClose={close} />
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#063B5C',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
});
