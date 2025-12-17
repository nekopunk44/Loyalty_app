import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент для отображения и выбора рейтинга (1-5 звёзд)
 * @param {number} rating - Текущий рейтинг (0-5)
 * @param {function} onRatingChange - Callback при изменении рейтинга
 * @param {number} size - Размер звёзд (по умолчанию 24)
 * @param {string} color - Цвет заполненной звезды (по умолчанию #FFB400)
 * @param {string} emptyColor - Цвет пустой звезды (по умолчанию #E0E0E0)
 * @param {boolean} interactive - Интерактивен ли компонент (по умолчанию true)
 * @param {boolean} allowHalf - Позволить половинки звёзд (по умолчанию false)
 */
export const StarRating = ({
  rating = 0,
  onRatingChange = null,
  size = 24,
  color = '#FFB400',
  emptyColor = '#E0E0E0',
  interactive = true,
  allowHalf = false,
  containerStyle = {},
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handleStarPress = (starIndex) => {
    if (!interactive || !onRatingChange) return;
    onRatingChange(starIndex);
  };

  const renderStar = (starIndex) => {
    const isFilled = starIndex <= Math.floor(rating);
    const isHalf = allowHalf && starIndex === Math.ceil(rating) && rating % 1 !== 0;

    return (
      <TouchableOpacity
        key={starIndex}
        onPress={() => handleStarPress(starIndex)}
        disabled={!interactive}
        activeOpacity={interactive ? 0.6 : 1}
      >
        {isHalf ? (
          <View style={{ position: 'relative', width: size, height: size }}>
            <MaterialIcons
              name="star"
              size={size}
              color={emptyColor}
            />
            <View style={{ position: 'absolute', width: size / 2, height: size, overflow: 'hidden' }}>
              <MaterialIcons
                name="star"
                size={size}
                color={color}
              />
            </View>
          </View>
        ) : (
          <MaterialIcons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? color : emptyColor}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {stars.map(renderStar)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});

export default StarRating;
