import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useReview } from '../context/ReviewContext';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import { StarRating } from '../components/StarRating';

export default function PropertyReviewsScreen({ route, navigation }) {
  const { propertyId, propertyName } = route.params;
  const { theme } = useTheme();
  const colors = theme.colors;
  const { reviews, loading, getPropertyReviews, createReview, updateReview, deleteReview, markAsHelpful, getReviewStats } = useReview();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('approved');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [propertyId]);

  const loadReviews = async () => {
    try {
      await getPropertyReviews(propertyId, 'all');
      const reviewStats = await getReviewStats(propertyId);
      setStats(reviewStats);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось загрузить отзывы');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const handleOpenReviewModal = (review = null) => {
    if (review) {
      setEditingReview(review);
      setRating(review.rating);
      setTitle(review.title || '');
      setReviewText(review.text);
    } else {
      setEditingReview(null);
      setRating(5);
      setTitle('');
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setEditingReview(null);
    setRating(5);
    setTitle('');
    setReviewText('');
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, напишите отзыв');
      return;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите оценку');
      return;
    }

    setSubmitting(true);
    try {
      if (editingReview) {
        // Обновить отзыв
        await updateReview(editingReview.id, {
          rating,
          title: title.trim(),
          text: reviewText.trim(),
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('Успех', 'Отзыв обновлён');
      } else {
        // Создать новый отзыв
        await createReview({
          propertyId,
          userId: user.uid,
          userName: user.displayName || user.email,
          rating,
          title: title.trim(),
          text: reviewText.trim(),
          approved: false, // На модерации
          helpful: 0,
          helpfulBy: [],
          createdAt: new Date().toISOString(),
        });
        Alert.alert('Успех', 'Отзыв отправлен на модерацию');
      }
      
      await loadReviews();
      handleCloseReviewModal();
    } catch (err) {
      Alert.alert('Ошибка', err.message || 'Не удалось сохранить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await deleteReview(reviewId);
      await loadReviews();
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить отзыв');
    }
  };

  const handleMarkAsHelpful = async (reviewId) => {
    try {
      await markAsHelpful(reviewId, user.uid);
      await loadReviews();
    } catch (err) {
      console.error('Error marking as helpful:', err);
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'approved') return r.approved === true;
    if (filter === 'pending') return r.approved === false;
    return true;
  });

  const renderReviewItem = ({ item }) => (
    <ReviewCard
      review={item}
      currentUserId={user?.uid}
      onLike={handleMarkAsHelpful}
      onEdit={handleOpenReviewModal}
      onDelete={handleDeleteReview}
      showActions={true}
    />
  );

  const emptyState = (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="rate-review" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.text }]}>
        Нет отзывов
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Будьте первым, кто оставит отзыв
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.headerTitle}>{propertyName}</Text>
          <Text style={styles.headerSubtitle}>Отзывы и оценки</Text>
        </View>
      </View>

      {/* Rating Stats */}
      {stats && (
        <View style={[styles.statsContainer, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
          <View style={styles.statsCenter}>
            <Text style={[styles.averageRating, { color: colors.primary }]}>
              {stats.average}
            </Text>
            <StarRating
              rating={parseFloat(stats.average)}
              size={16}
              color={colors.accent}
              emptyColor={colors.border}
              interactive={false}
              containerStyle={{ marginVertical: spacing.xs }}
            />
            <Text style={[styles.totalReviews, { color: colors.textSecondary }]}>
              {stats.total} отзывов
            </Text>
          </View>

          {/* Rating Distribution */}
          <View style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map(num => (
              <View key={num} style={styles.distributionRow}>
                <Text style={[styles.distributionLabel, { color: colors.textSecondary }]}>
                  {num}★
                </Text>
                <View
                  style={[
                    styles.distributionBar,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.distributionFill,
                      {
                        backgroundColor: colors.primary,
                        width: stats.total > 0 ? `${(stats.distribution[num] / stats.total) * 100}%` : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.distributionCount, { color: colors.textSecondary }]}>
                  {stats.distribution[num]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Filter & Write Button */}
      <View style={[styles.controlsContainer, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['approved', 'pending', 'all'].map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                filter === f && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === f && { color: '#fff' },
                  filter !== f && { color: colors.textSecondary },
                ]}
              >
                {f === 'approved' ? 'Одобрено' : f === 'pending' ? 'На модерации' : 'Все'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reviews List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          renderItem={renderReviewItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={emptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Write Review Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => handleOpenReviewModal()}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseReviewModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: colors.primary, borderBottomColor: colors.border },
            ]}
          >
            <TouchableOpacity onPress={handleCloseReviewModal}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingReview ? 'Изменить отзыв' : 'Написать отзыв'}
            </Text>
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmitReview}
            >
              <Text style={[styles.modalAction, { opacity: submitting ? 0.5 : 1 }]}>
                {submitting ? 'Отправка...' : 'Отправить'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {/* Rating */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Оценка
              </Text>
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size={32}
                color={colors.accent}
                emptyColor={colors.border}
                interactive={true}
                containerStyle={{ marginTop: spacing.md }}
              />
              <Text style={[styles.ratingValue, { color: colors.textSecondary }]}>
                {rating} из 5 звёзд
              </Text>
            </View>

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Заголовок (опционально)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Краткий заголовок отзыва"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                editable={!submitting}
              />
            </View>

            {/* Review Text */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Ваш отзыв
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.cardBg,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Поделитесь своим опытом..."
                placeholderTextColor={colors.textSecondary}
                value={reviewText}
                onChangeText={setReviewText}
                multiline={true}
                numberOfLines={6}
                editable={!submitting}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {reviewText.length}/500
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  statsContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statsCenter: {
    alignItems: 'center',
    minWidth: 100,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: '700',
  },
  totalReviews: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  distributionLabel: {
    width: 24,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  distributionBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
  },
  distributionCount: {
    width: 24,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    backgroundColor: '#F5F5F5',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  formContainer: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    height: 120,
  },
  charCount: {
    fontSize: 11,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  ratingValue: {
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
