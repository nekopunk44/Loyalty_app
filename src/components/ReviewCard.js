import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { StarRating } from './StarRating';

/**
 * Компонент для отображения отдельного отзыва
 */
export const ReviewCard = ({
  review,
  onLike = null,
  onEdit = null,
  onDelete = null,
  currentUserId = null,
  showActions = true,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [isLiked, setIsLiked] = useState(review.helpfulBy?.includes(currentUserId) || false);
  const [likeCount, setLikeCount] = useState(review.helpful || 0);

  const isOwnReview = currentUserId === review.userId;

  const handleLike = async () => {
    if (!onLike) return;
    
    try {
      await onLike(review.id, currentUserId);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось отметить как полезное');
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    
    Alert.alert(
      'Удалить отзыв?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', onPress: () => {} },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              await onDelete(review.id);
            } catch (err) {
              Alert.alert('Ошибка', 'Не удалось удалить отзыв');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {review.userName?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {review.userName || 'Аноним'}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(review.createdAt)}
            </Text>
          </View>
          {isOwnReview && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>Ваш</Text>
            </View>
          )}
        </View>
      </View>

      {/* Rating */}
      <View style={styles.ratingContainer}>
        <StarRating
          rating={review.rating}
          size={16}
          color={colors.accent}
          emptyColor={colors.border}
          interactive={false}
        />
        <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
          {review.rating?.toFixed(1)} из 5
        </Text>
      </View>

      {/* Title (если есть) */}
      {review.title && (
        <Text style={[styles.title, { color: colors.text }]}>
          {review.title}
        </Text>
      )}

      {/* Review Text */}
      <Text
        style={[styles.reviewText, { color: colors.text }]}
        numberOfLines={4}
      >
        {review.text}
      </Text>

      {/* Helpful & Actions */}
      <View style={styles.footer}>
        {/* Helpful Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isLiked && { backgroundColor: colors.primary + '20' },
          ]}
          onPress={handleLike}
          disabled={!onLike}
        >
          <MaterialIcons
            name={isLiked ? 'thumb-up' : 'thumb-up-off-alt'}
            size={16}
            color={isLiked ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionText,
              { color: isLiked ? colors.primary : colors.textSecondary },
            ]}
          >
            {likeCount > 0 && `${likeCount} `}
            Полезно
          </Text>
        </TouchableOpacity>

        {/* Edit/Delete Actions */}
        {showActions && isOwnReview && (
          <View style={styles.actionGroup}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit(review)}
              >
                <MaterialIcons
                  name="edit"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  Изменить
                </Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <MaterialIcons
                  name="delete"
                  size={16}
                  color={colors.danger}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Status Badge (для администратора) */}
      {review.approved === false && (
        <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
          <MaterialIcons name="pending" size={12} color={colors.textSecondary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            На модерации
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  actionGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ReviewCard;
