import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

/**
 * Cross-platform LinearGradient wrapper
 * Uses CSS gradients on web, solid color fallback on native
 */
export const GradientView = ({ colors, start, end, style, children }) => {
  // For web, convert gradient colors to CSS gradient
  const gradientString = `linear-gradient(135deg, ${colors.join(', ')})`;
  
  return (
    <View
      style={[
        style,
        Platform.OS === 'web' && {
          background: gradientString,
        },
        Platform.OS !== 'web' && {
          backgroundColor: colors[0],
        },
      ]}
    >
      {children}
    </View>
  );
};

export default GradientView;
