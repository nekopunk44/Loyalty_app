import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { SlideInLeftCard } from './AnimatedCard';

const screenWidth = Dimensions.get('window').width;
const CARD_WIDTH = screenWidth * 0.75;
const CARD_HEIGHT = 220;

export default function PropertyCarousel({ properties, onPropertyPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scrollViewRef = useRef(null);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [contentSize, setContentSize] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(properties.length > 1);

  const handleScroll = (event) => {
    const { contentOffset, contentSize: cSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScroll = cSize.width - layoutMeasurement.width;
    
    setCurrentScrollX(scrollX);
    setContentSize(cSize.width);
    setLayoutWidth(layoutMeasurement.width);
    setCanScrollLeft(scrollX > 0);
    // Кнопка вправо исчезает когда мы достигли конца
    setCanScrollRight(scrollX < maxScroll - 5);
  };

  const handleContentSizeChange = (width) => {
    console.log('📸 PropertyCarousel contentSize:', width, 'layoutWidth:', layoutWidth);
    setContentSize(width);
    // Контент шире чем layout - можно прокручивать вправо
    if (layoutWidth > 0) {
      const canScroll = width > layoutWidth;
      console.log('📸 Can scroll right:', canScroll);
      setCanScrollRight(canScroll);
    } else {
      // Если layoutWidth еще не установлена, показываем кнопку если несколько элементов
      setCanScrollRight(properties.length > 1);
    }
  };

  const handleLayout = (event) => {
    const width = event.nativeEvent.layout.width;
    console.log('📸 PropertyCarousel layout width:', width, 'contentSize:', contentSize);
    setLayoutWidth(width);
    // Контент шире чем layout - можно прокручивать вправо
    if (contentSize > 0) {
      const canScroll = contentSize > width;
      console.log('📸 Can scroll right (from handleLayout):', canScroll);
      setCanScrollRight(canScroll);
    } else {
      // Если контент еще не загружен, предполагаем что можно прокручивать
      setCanScrollRight(properties.length > 1);
    }
  };

  const scroll = (direction) => {
    if (scrollViewRef.current) {
      const scrollAmount = CARD_WIDTH + spacing.md;
      const newScrollX = direction === 'left'
        ? Math.max(0, currentScrollX - scrollAmount)
        : currentScrollX + scrollAmount;

      scrollViewRef.current.scrollTo({
        x: newScrollX,
        animated: true,
      });
    }
  };

  const renderProperty = (item, index) => (
    <SlideInLeftCard key={item.id} delay={50 + index * 50} style={styles.cardContainer}>
      <TouchableOpacity
        style={[styles.propertyCard, { width: CARD_WIDTH }]}
        activeOpacity={0.8}
        onPress={() => onPropertyPress && onPropertyPress(item)}
      >
        {/* Фоновое изображение */}
        {item.image && (
          <Image
            source={item.image}
            style={styles.propertyImage}
            resizeMode="cover"
          />
        )}

        {/* Градиент оверлей для читаемости текста */}
        <View style={styles.overlay} />

        {/* Контент с названием и ценой */}
        <View style={styles.content}>
          <Text style={[styles.propertyName, { color: '#fff' }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.propertyPrice, { color: colors.primary }]}>
            {item.price}
          </Text>
        </View>
      </TouchableOpacity>
    </SlideInLeftCard>
  );

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Левая кнопка навигации */}
      {Platform.OS === 'web' && canScrollLeft && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonLeft]}
          onPress={() => scroll('left')}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Карусель */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        style={styles.scrollViewContainer}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
      >
        {properties.map((item, index) => renderProperty(item, index))}
      </ScrollView>

      {/* Правая кнопка навигации */}
      {Platform.OS === 'web' && canScrollRight && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonRight]}
          onPress={() => scroll('right')}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + spacing.lg,
    position: 'relative',
    justifyContent: 'center',
  },
  scrollViewContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyCard: {
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navButtonLeft: {
    left: spacing.sm,
    marginTop: -(22),
  },
  navButtonRight: {
    right: spacing.sm,
    marginTop: -(22),
  },
});
