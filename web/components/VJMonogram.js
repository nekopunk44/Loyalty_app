'use client';

import { motion } from 'motion/react';

const OUTER_R = 92;

export default function VJMonogram({
  size = 120,
  mainColor = '#FFFFFF',
  accentColor = '#D4A45E',
  animate: shouldAnimate = true,
  delay = 0,
  fast = false,
}) {
  const sp = fast ? 0.65 : 1;
  const ds = delay / 1000;

  const fade = (offset) =>
    shouldAnimate
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 * sp, delay: ds + offset * sp } }
      : { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}
    >
      {/* Outer ring — draw on from 12 o'clock */}
      <g transform="rotate(-90 100 100)">
        <motion.circle
          cx={100} cy={100} r={OUTER_R}
          stroke={mainColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: shouldAnimate ? 0 : 1 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: shouldAnimate ? 0.9 * sp : 0, delay: shouldAnimate ? ds : 0, ease: [0.37, 0, 0.63, 1] }}
        />
      </g>

      {/* Inner ring */}
      <motion.circle
        cx={100} cy={100} r={78}
        stroke={mainColor}
        strokeWidth={1.2}
        strokeOpacity={0.4}
        fill="none"
        {...fade(0.38)}
      />

      {/* Diamond top + bottom line */}
      <motion.g {...fade(0.6)}>
        <path d="M 100 22 L 106 30 L 100 38 L 94 30 Z" fill={accentColor} />
        <path d="M 76 170 L 124 170" stroke={accentColor} strokeWidth={1.2} strokeLinecap="round" />
      </motion.g>

      {/* VJ letterform */}
      <motion.g {...fade(0.72)}>
        <text
          x={100}
          y={122}
          fontSize={62}
          fontFamily="Georgia, 'Times New Roman', serif"
          fontWeight="700"
          fontStyle="italic"
          fill={mainColor}
          textAnchor="middle"
        >
          VJ
        </text>
      </motion.g>

      {/* EST · MMXXIII */}
      <motion.g {...fade(1.1)}>
        <text
          x={100}
          y={152}
          fontSize={7}
          fontFamily="Georgia, 'Times New Roman', serif"
          fill={mainColor}
          fillOpacity={0.6}
          textAnchor="middle"
          letterSpacing={3}
        >
          EST · MMXXIII
        </text>
      </motion.g>
    </svg>
  );
}
