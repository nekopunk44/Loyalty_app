import React, { useEffect } from 'react';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const AnimatedG = Reanimated.createAnimatedComponent(G);

const OUTER_R = 92;
const INNER_R = 78;
const OUTER_C = 2 * Math.PI * OUTER_R;

const TOP_DIAMOND = 'M 100 22 L 106 30 L 100 38 L 94 30 Z';
const BOTTOM_LINE = 'M 76 170 L 124 170';

export default function VJMonogram({
  size = 120,
  mainColor = '#FFFFFF',
  accentColor = '#F59E0B',
  startDelay = 0,
  animate = true,
  fast = false,
}) {
  const outerProgress = useSharedValue(animate ? 1 : 0);
  const innerOpacity = useSharedValue(animate ? 0 : 1);
  const ornamentsOpacity = useSharedValue(animate ? 0 : 1);
  const monogramOpacity = useSharedValue(animate ? 0 : 1);
  const estOpacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;

    const d = fast ? 0.65 : 1;
    outerProgress.value = withDelay(
      startDelay,
      withTiming(0, { duration: 900 * d, easing: Easing.inOut(Easing.cubic) }),
    );
    innerOpacity.value = withDelay(
      startDelay + 380 * d,
      withTiming(1, { duration: 360 * d, easing: Easing.out(Easing.cubic) }),
    );
    ornamentsOpacity.value = withDelay(
      startDelay + 600 * d,
      withTiming(1, { duration: 360 * d, easing: Easing.out(Easing.cubic) }),
    );
    monogramOpacity.value = withDelay(
      startDelay + 720 * d,
      withTiming(1, { duration: 460 * d, easing: Easing.out(Easing.cubic) }),
    );
    estOpacity.value = withDelay(
      startDelay + 1100 * d,
      withTiming(1, { duration: 320 * d, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const outerProps = useAnimatedProps(() => ({
    strokeDashoffset: OUTER_C * outerProgress.value,
  }));
  const innerProps = useAnimatedProps(() => ({ opacity: innerOpacity.value }));
  const ornamentsProps = useAnimatedProps(() => ({ opacity: ornamentsOpacity.value }));
  const monogramProps = useAnimatedProps(() => ({ opacity: monogramOpacity.value }));
  const estProps = useAnimatedProps(() => ({ opacity: estOpacity.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G transform="rotate(-90 100 100)">
        <AnimatedCircle
          cx={100}
          cy={100}
          r={OUTER_R}
          stroke={mainColor}
          strokeWidth={2.5}
          fill="none"
          strokeDasharray={OUTER_C}
          animatedProps={outerProps}
          strokeLinecap="round"
        />
      </G>

      <AnimatedCircle
        cx={100}
        cy={100}
        r={INNER_R}
        stroke={mainColor}
        strokeWidth={1.2}
        strokeOpacity={0.4}
        fill="none"
        animatedProps={innerProps}
      />

      <AnimatedG animatedProps={ornamentsProps}>
        <Path d={TOP_DIAMOND} fill={accentColor} />
        <Path d={BOTTOM_LINE} stroke={accentColor} strokeWidth={1.2} strokeLinecap="round" />
      </AnimatedG>

      <AnimatedG animatedProps={monogramProps}>
        <SvgText
          x={100}
          y={120}
          fontSize={62}
          fontFamily="serif"
          fontWeight="700"
          fontStyle="italic"
          fill={mainColor}
          textAnchor="middle"
        >
          VJ
        </SvgText>
      </AnimatedG>

      <AnimatedG animatedProps={estProps}>
        <SvgText
          x={100}
          y={150}
          fontSize={7}
          fontFamily="serif"
          fill={mainColor}
          fillOpacity={0.6}
          textAnchor="middle"
          letterSpacing={3}
        >
          EST · MMXXIII
        </SvgText>
      </AnimatedG>
    </Svg>
  );
}
