import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

export default function ReviewModal({ visible, onClose, property, onReviewSubmit }) {
  const { theme } = useTheme();
  const { notifyNewReviewPosted } = useNotification();
  const colors = theme.colors;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!comment.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, напишите отзыв');
      return;
    }

    setIsSubmitting(true);
    try {
      // Отправляем отзыв (здесь нужно интегрировать с API)
      const review = {
        propertyId: property?.id,
        propertyName: property?.name,
        rating,
        comment: comment.trim(),
        createdAt: new Date(),
        userName: 'Текущий пользователь', // Должно приходить из контекста
      };

      // Вызываем callback если он есть
      if (onReviewSubmit) {
        await onReviewSubmit(review);
      }

      // Отправляем уведомление
      await notifyNewReviewPosted(property?.name, 'Вы', rating);

      Alert.alert('Спасибо!', 'Ваш отзыв опубликован');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Ошибка отправки отзыва:', error);
      Alert.alert('Ошибка', 'Не удалось отправить отзыв');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(5);
    setComment('');
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      padding: spacing.lg,
    },
    propertyName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    ratingContainer: {
      marginBottom: spacing.lg,
    },
    ratingLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      justifyContent: 'center',
    },
    starButton: {
      padding: spacing.sm,
    },
    commentContainer: {
      marginBottom: spacing.lg,
    },
    commentLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    commentInput: {
      backgroundColor: colors.cardBg,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    button: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    cancelButton: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    submitButtonText: {
      color: '#fff',
    },
  }), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Оставить отзыв</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Property Name */}
            <Text style={styles.propertyName}>{property?.name}</Text>

            {/* Rating */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Оценка: {rating} ⭐</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => setRating(star)}
                    disabled={isSubmitting}
                  >
                    <MaterialIcons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= rating ? '#FFD700' : colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comment */}
            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Ваш отзыв</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Поделитесь вашим впечатлением о проживании..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={comment}
                onChangeText={setComment}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <MaterialIcons name="close" size={18} color={colors.text} />
              <Text style={styles.buttonText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmitReview}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={[styles.buttonText, styles.submitButtonText]}>
                    Отправить
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
