import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Animated, Dimensions, PanResponder, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import SignaturePad from '../ui/SignaturePad';
import { HOUSE_RULES, RULES_SIGN_KEY } from '../../constants/houseRules';
import { apiPost, getAPIEndpoints } from '../../utils/api';

const NAVY = '#063B5C';
const TEAL = '#14B8A6';
const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = Math.round(SCREEN_H * 0.92);

export default function HouseRulesGate({ visible, onClose, onSigned }) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();

  const [ack, setAck] = useState(false);
  const [paths, setPaths] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_H)).current;

  React.useEffect(() => {
    if (visible) {
      setAck(false);
      setPaths([]);
      translateY.setValue(SHEET_H);
      Animated.timing(translateY, {
        toValue: 0, duration: 340, useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const close = () => {
    Animated.timing(translateY, {
      toValue: SHEET_H, duration: 260, useNativeDriver: true,
    }).start(({ finished }) => { if (finished) onClose?.(); });
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
            toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const submit = async () => {
    if (!ack) {
      Alert.alert('Подтвердите ознакомление', 'Поставьте галочку, что вы ознакомились с правилами проживания.');
      return;
    }
    if (!paths.length) {
      Alert.alert('Пустая подпись', 'Пожалуйста, поставьте свою подпись пальцем в поле.');
      return;
    }
    try {
      setSubmitting(true);
      const ts = new Date().toISOString();
      const payload = { signedAt: ts, paths };

      if (user?.id) {
        const endpoint = `${getAPIEndpoints().USERS.UPDATE(user.id)}/sign-house-rules`;
        const resp = await apiPost(endpoint, { paths, signedAt: ts });
        if (!resp?.success) {
          console.warn('[HouseRulesGate] не удалось сохранить подпись на сервере', resp?.error);
        }
      }

      await AsyncStorage.setItem(RULES_SIGN_KEY, JSON.stringify(payload));
      setSubmitting(false);
      Animated.timing(translateY, {
        toValue: SHEET_H, duration: 240, useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onSigned?.(payload);
          onClose?.();
        }
      });
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Ошибка', 'Не удалось сохранить подпись. Попробуйте ещё раз.');
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={close} />
        <Animated.View
          style={[
            styles.sheet,
            { height: SHEET_H, backgroundColor: colors.background, transform: [{ translateY }] },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: TEAL }]}>Перед бронированием</Text>
              <Text style={[styles.title, { color: colors.text }]}>Правила проживания</Text>
            </View>
            <TouchableOpacity onPress={close} style={[styles.closeBtn, { backgroundColor: colors.cardBg, borderColor: colors.border }]} activeOpacity={0.8}>
              <MaterialIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              Чтобы продолжить бронирование, ознакомьтесь с правилами проживания и поставьте свою подпись. Подпись сохраняется однократно — при следующих бронированиях повторно подписывать не нужно.
            </Text>

            {HOUSE_RULES.map((r, i) => (
              <View key={i} style={[styles.ruleRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.ruleIconBox, { backgroundColor: `${r.color}18` }]}>
                  <MaterialIcons name={r.icon} size={18} color={r.color} />
                </View>
                <Text style={[styles.ruleText, { color: colors.text }]}>{r.text}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.ackRow, { borderColor: ack ? TEAL : colors.border, backgroundColor: ack ? `${TEAL}10` : colors.cardBg }]}
              onPress={() => setAck(!ack)}
              activeOpacity={0.75}
            >
              <View style={[styles.ackBox, ack && styles.ackBoxOn]}>
                {ack && <MaterialIcons name="check" size={14} color="#fff" />}
              </View>
              <Text style={[styles.ackText, { color: colors.text }]}>
                Я ознакомился(ась) с правилами проживания и согласен(на) их соблюдать
              </Text>
            </TouchableOpacity>

            {ack && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sigLabel, { color: colors.textSecondary }]}>Ваша подпись</Text>
                <SignaturePad
                  value={paths}
                  onChange={setPaths}
                  color={isDark ? '#E2E8F0' : NAVY}
                  backgroundColor={isDark ? '#0B1F33' : '#FFFFFF'}
                  borderColor={colors.border}
                  height={180}
                />
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: ack && paths.length ? TEAL : '#94A3B8' },
              ]}
              onPress={submit}
              disabled={!ack || !paths.length || submitting}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>
                {submitting ? 'Сохраняем…' : 'Подписать и продолжить'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 46, height: 5, borderRadius: 3 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 4, paddingBottom: 14,
  },
  eyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 3 },
  title: { fontSize: 22, fontWeight: '900' },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, gap: 12,
  },
  ruleIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleText: { flex: 1, fontSize: 13, lineHeight: 18 },
  ackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, marginTop: 18,
  },
  ackBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.8,
    borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center',
  },
  ackBoxOn: { backgroundColor: TEAL, borderColor: TEAL },
  ackText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sigLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 22,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
