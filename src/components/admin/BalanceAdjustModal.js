/**
 * BalanceAdjustModal — модалка корректировки баланса пользователя для финансового админа.
 * Заменяет старый «QuickBalance» (который был только +/topup): теперь поддерживает
 * списание (penalty/correction) и зачисление (compensation/promo_bonus/other).
 *
 * Вызывает Sprint B эндпоинт POST /api/admin/users/:userId/adjust-balance.
 * Описание обязательное — нужно для аудита (попадает в Transaction.description
 * и в Notification, которое получит пользователь).
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../../constants/theme';
import { getApiUrl } from '../../utils/apiUrl';
import { apiCall } from '../../utils/api';

const API_BASE_URL = getApiUrl();

const REASONS = [
  { value: 'compensation', label: 'Компенсация',   icon: 'volunteer-activism', sign: '+' },
  { value: 'promo_bonus',  label: 'Промо-бонус',   icon: 'redeem',             sign: '+' },
  { value: 'correction',   label: 'Корректировка', icon: 'tune',               sign: '±' },
  { value: 'penalty',      label: 'Штраф',         icon: 'warning',            sign: '−' },
  { value: 'other',        label: 'Другое',        icon: 'more-horiz',         sign: '±' },
];

export default function BalanceAdjustModal({ visible, onClose, theme, user, onAdjusted, onNotify }) {
  const colors = theme.colors;

  const [sign, setSign]               = useState('+');
  const [amountStr, setAmountStr]     = useState('');
  const [reason, setReason]           = useState('compensation');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    if (visible) {
      setSign('+');
      setAmountStr('');
      setReason('compensation');
      setDescription('');
      setSubmitting(false);
    }
  }, [visible]);

  const amount = parseFloat(amountStr.replace(',', '.')) || 0;
  const canSubmit = !submitting && amount > 0 && description.trim().length >= 3 && !!user;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const signed = sign === '+' ? amount : -amount;
      const data = await apiCall(`${API_BASE_URL}/admin/users/${user.userId}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: signed,
          reason,
          description: description.trim(),
        }),
      });
      if (data?.success) {
        onAdjusted?.({
          userId: user.userId,
          newBalance: data.userBalanceAfter,
          delta: signed,
        });
        onNotify?.(
          `${sign === '+' ? '+' : '−'}${amount} PRB → ${user.name || user.email}`,
          'success',
        );
        onClose();
      } else {
        onNotify?.(data?.error || 'Не удалось скорректировать баланс', 'error');
      }
    } catch (e) {
      onNotify?.(e?.message || 'Ошибка при корректировке баланса', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Корректировка баланса</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {user?.name || user?.email} · {Number(user?.balance || 0).toFixed(0)} PRB
          </Text>

          {/* Знак */}
          <View style={styles.signRow}>
            <TouchableOpacity
              style={[
                styles.signBtn,
                { borderColor: colors.border },
                sign === '+' && { backgroundColor: '#10B98122', borderColor: '#10B981' },
              ]}
              onPress={() => setSign('+')}
              disabled={submitting}
            >
              <MaterialIcons name="add" size={20} color={sign === '+' ? '#10B981' : colors.textSecondary} />
              <Text style={[styles.signLabel, { color: sign === '+' ? '#10B981' : colors.textSecondary }]}>
                Зачислить
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.signBtn,
                { borderColor: colors.border },
                sign === '−' && { backgroundColor: '#EF444422', borderColor: '#EF4444' },
              ]}
              onPress={() => setSign('−')}
              disabled={submitting}
            >
              <MaterialIcons name="remove" size={20} color={sign === '−' ? '#EF4444' : colors.textSecondary} />
              <Text style={[styles.signLabel, { color: sign === '−' ? '#EF4444' : colors.textSecondary }]}>
                Списать
              </Text>
            </TouchableOpacity>
          </View>

          {/* Сумма */}
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
            ]}
            placeholder="Сумма в PRB"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={amountStr}
            onChangeText={setAmountStr}
            editable={!submitting}
          />

          {/* Причина */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Причина</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reasonRow}
          >
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.reasonChip,
                  { borderColor: colors.border },
                  reason === r.value && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                ]}
                onPress={() => setReason(r.value)}
                disabled={submitting}
              >
                <MaterialIcons
                  name={r.icon}
                  size={16}
                  color={reason === r.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.reasonLabel,
                  { color: reason === r.value ? colors.primary : colors.text },
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Описание */}
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
            ]}
            placeholder="Комментарий для аудита (обязательно)"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
            editable={!submitting}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: sign === '+' ? '#10B981' : '#EF4444',
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}
              onPress={submit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmText}>
                  {sign === '+' ? 'Зачислить' : 'Списать'} {amount > 0 ? `${amount} PRB` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginBottom: spacing.md },
  signRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  signBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 6,
  },
  signLabel: { fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  reasonLabel: { fontSize: 13, fontWeight: '500' },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
