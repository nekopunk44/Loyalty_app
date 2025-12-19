import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Text as SvgText } from 'react-native-svg';

export default function VillaBackdrop({ isDark = false, headerBlendColor = '#FF6B35', style }) {
  const palette = isDark
    ? {
        top: '#07111F',
        bottom: '#0B1F2F',
        warm: '#F59E0B',
        cool: '#14B8A6',
        ink: '#FFFFFF',
        veil: '#0B1426',
        lineOpacity: 0.09,
        markOpacity: 0.045,
      }
    : {
        top: '#EFE1D0',
        bottom: '#E4EEE6',
        warm: '#D98B4E',
        cool: '#0EA5A1',
        ink: '#063B5C',
        veil: '#F4E7D8',
        lineOpacity: 0.13,
        markOpacity: 0.045,
      };

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 230" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="minimalBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.top} />
            <Stop offset="1" stopColor={palette.bottom} />
          </LinearGradient>
          <LinearGradient id="warmWash" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={palette.warm} stopOpacity={isDark ? 0.16 : 0.18} />
            <Stop offset="1" stopColor={palette.warm} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="coolWash" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.cool} stopOpacity={isDark ? 0.16 : 0.10} />
            <Stop offset="1" stopColor={palette.cool} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="contentVeil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.veil} stopOpacity={isDark ? 0.10 : 0.28} />
            <Stop offset="0.55" stopColor={palette.veil} stopOpacity={isDark ? 0.06 : 0.18} />
            <Stop offset="1" stopColor={palette.veil} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="headerBlend" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={headerBlendColor} stopOpacity={isDark ? 0.10 : 0.08} />
            <Stop offset="0.48" stopColor={headerBlendColor} stopOpacity="0.04" />
            <Stop offset="1" stopColor={palette.top} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="390" height="230" fill="url(#minimalBg)" />
        <Rect x="0" y="0" width="390" height="54" fill="url(#headerBlend)" />
        <Rect x="0" y="0" width="230" height="230" fill="url(#warmWash)" />
        <Rect x="166" y="0" width="224" height="230" fill="url(#coolWash)" />
        <Rect x="0" y="0" width="390" height="170" fill="url(#contentVeil)" />

        <G opacity={palette.lineOpacity}>
          <Path d="M-40 64C34 42 94 47 140 78C190 112 242 113 318 72C351 54 389 47 430 54" stroke={palette.ink} strokeWidth="1.2" fill="none" />
          <Path d="M-26 156C54 126 116 128 172 155C224 180 282 182 418 124" stroke={palette.ink} strokeWidth="1.2" fill="none" />
          <Path d="M22 214H368" stroke={palette.ink} strokeWidth="1" />
        </G>

        <G opacity={isDark ? 0.055 : 0.07}>
          <Path d="M0 202H390" stroke={palette.ink} strokeWidth="1" />
          <Path d="M60 230L128 182" stroke={palette.ink} strokeWidth="1" />
          <Path d="M142 230L196 184" stroke={palette.ink} strokeWidth="1" />
          <Path d="M224 230L268 186" stroke={palette.ink} strokeWidth="1" />
          <Path d="M306 230L340 188" stroke={palette.ink} strokeWidth="1" />
        </G>

        <Path
          d="M292 48C315 34 344 35 367 50"
          stroke={palette.warm}
          strokeOpacity={isDark ? 0.30 : 0.36}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        <SvgText
          x="326"
          y="186"
          fontSize="76"
          fontFamily="serif"
          fontWeight="700"
          fontStyle="italic"
          fill={palette.ink}
          fillOpacity={palette.markOpacity}
          textAnchor="middle"
        >
          VJ
        </SvgText>
      </Svg>
    </View>
  );
}
