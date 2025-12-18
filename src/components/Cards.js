import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');
const itemWidth = (width - spacing.l * 2 - spacing.m) / 2;

/**
 * Компонент карточки товара с изображением
 */
export const ProductCard = ({ product, onPress, onAddToCart }) => {
  // Заглушка изображения - в реальном приложении будут настоящие фото
  const getProductImage = (productId) => {
    const colors_arr = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors_arr[productId % colors_arr.length];
  };

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor: getProductImage(product.id),
        },
      ]}
      onPress={onPress}
    >
      {/* Placeholder для изображения */}
      <View style={styles.imageContainer}>
        <MaterialIcons name="image" size={48} color="rgba(255, 255, 255, 0.6)" />
        <Text style={styles.imagePlaceholder}>Фото товара</Text>
      </View>

      {/* Скидка если есть */}
      {product.discount && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{product.discount}%</Text>
        </View>
      )}

      {/* Информация о товаре */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productDescription} numberOfLines={1}>
          {product.description}
        </Text>

        <View style={styles.priceContainer}>
          <View>
            <Text style={styles.price}>{product.price} PRB</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>{product.originalPrice} PRB</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToCart && onAddToCart(product)}
          >
            <MaterialIcons name="add-shopping-cart" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Компонент карточки события с информацией
 */
export const EventCardAdmin = ({
  event,
  onPress,
  onEdit,
  onDelete,
}) => {
  const getEventColor = (status) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'upcoming':
        return colors.primary;
      case 'ended':
        return colors.textSecondary;
      default:
        return colors.accent;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        { borderLeftColor: getEventColor(event.status) },
      ]}
      onPress={onPress}
    >
      {/* Плейсхолдер для фото события */}
      <View style={[styles.eventImagePlaceholder, { backgroundColor: getEventColor(event.status) + '20' }]}>
        <MaterialIcons name="event" size={32} color={getEventColor(event.status)} />
      </View>

      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription} numberOfLines={2}>{event.description}</Text>

        <View style={styles.eventMeta}>
          {event.prize ? (
            <View style={styles.metaItem}>
              <MaterialIcons name="card-giftcard" size={14} color={colors.accent} />
              <Text style={styles.metaText}>{event.prize}</Text>
            </View>
          ) : null}
          {event.startDate || event.endDate ? (
            <View style={styles.metaItem}>
              <MaterialIcons name="calendar-today" size={14} color={colors.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.startDate && event.endDate ? `${event.startDate} - ${event.endDate}` : (event.endDate || event.startDate)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Статус и участники */}
        <View style={styles.eventFooter}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getEventColor(event.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {event.status === 'active'
                ? 'Активно'
                : event.status === 'upcoming'
                ? 'Скоро'
                : 'Завершено'}
            </Text>
          </View>
          {event.participantsCount !== undefined ? (
            <Text style={styles.participantsText}>
              👥 {event.participantsCount}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Кнопки управления */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onEdit && onEdit(event)}
        >
          <MaterialIcons name="edit" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onDelete && onDelete(event.id)}
        >
          <MaterialIcons name="delete" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  /* Product Card Styles */
  productCard: {
    width: itemWidth,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.m,
    elevation: 3,
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  imageContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  imagePlaceholder: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.m,
    right: spacing.m,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  discountText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  productInfo: {
    padding: spacing.m,
    backgroundColor: colors.cardBg,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.s,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Event Card Styles */
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.m,
    overflow: 'hidden',
    borderLeftWidth: 4,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventImagePlaceholder: {
    width: 80,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
    padding: spacing.m,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.s,
  },
  eventMeta: {
    flexDirection: 'row',
    marginBottom: spacing.s,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  participantsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.s,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
});
