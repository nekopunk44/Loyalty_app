import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент для горизонтального скролла с поддержкой веб-версии
 * На мобильных устройствах использует нативный ScrollView
 * На веб показывает кнопки навигации для лучшего UX
 */
export const HorizontalScrollView = ({
  children,
  onScroll,
  showsHorizontalScrollIndicator = false,
  nestedScrollEnabled = true,
  contentContainerStyle,
  style,
  scrollEventThrottle = 16,
  showNavButtons = Platform.OS === 'web',
  navButtonColor = '#666',
  navButtonSize = 24,
  forceShowButtons = false,
  itemWidth = null, // Ширина одного элемента для умного скроллинга
  itemGap = 0, // Расстояние между элементами
}) => {
  const scrollViewRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(forceShowButtons);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [contentSize, setContentSize] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);

  const handleScroll = (event) => {
    const { contentOffset, contentSize: cSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;

    setCurrentScrollX(scrollX);
    setContentSize(cSize.width);
    setLayoutWidth(layoutMeasurement.width);

    // Левая кнопка показывается при скролле
    setCanScrollLeft(scrollX > 5);
    
    // Правая кнопка зависит от позиции скрола и доступности контента
    const hasMoreContent = cSize.width > layoutMeasurement.width;
    const canScrollMore = scrollX < cSize.width - layoutMeasurement.width - 5;
    
    // Кнопка показывается если контент больше контейнера и мы еще не в конце
    setCanScrollRight(hasMoreContent && canScrollMore);

    if (onScroll) {
      onScroll(event);
    }
  };

  const handleContentSizeChange = (width) => {
    setContentSize(width);
  };

  const handleLayout = (event) => {
    const width = event.nativeEvent.layout.width;
    setLayoutWidth(width);
  };

  // Обновляем видимость кнопок при изменении размеров
  React.useEffect(() => {
    if (layoutWidth > 0 && contentSize > layoutWidth) {
      // Если контент больше контейнера
      if (forceShowButtons) {
        setCanScrollRight(true);
      } else {
        // Показываем кнопку если есть еще контент не виден
        setCanScrollRight(currentScrollX < contentSize - layoutWidth - 5);
      }
    } else if (forceShowButtons && contentSize > 0) {
      // При forceShowButtons показываем даже если пока не видно
      setCanScrollRight(true);
    } else {
      setCanScrollRight(false);
    }
  }, [layoutWidth, contentSize, currentScrollX, forceShowButtons]);

  const scroll = (direction) => {
    if (scrollViewRef.current) {
      // Если указана ширина элемента, скроллим на размер одного элемента + gap
      const scrollAmount = itemWidth ? (itemWidth + itemGap) : 300;
      const newScrollX = direction === 'left'
        ? Math.max(0, currentScrollX - scrollAmount)
        : currentScrollX + scrollAmount;

      scrollViewRef.current.scrollTo({
        x: newScrollX,
        animated: true,
      });
    }
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Левая кнопка навигации */}
      {showNavButtons && canScrollLeft && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonLeft]}
          onPress={() => scroll('left')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="chevron-left"
            size={navButtonSize}
            color={navButtonColor}
          />
        </TouchableOpacity>
      )}

      {/* ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        nestedScrollEnabled={nestedScrollEnabled}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={contentContainerStyle}
        onScroll={handleScroll}
        scrollsToTop={false}
        onContentSizeChange={handleContentSizeChange}
      >
        {children}
      </ScrollView>

      {/* Правая кнопка навигации */}
      {showNavButtons && canScrollRight && (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonRight]}
          onPress={() => scroll('right')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="chevron-right"
            size={navButtonSize}
            color={navButtonColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: Platform.OS === 'web' ? undefined : 1,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginTop: -20,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
});

export default HorizontalScrollView;
