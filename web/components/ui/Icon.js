'use client';
import * as Icons from 'lucide-react';
function toPascal(s) {
  return s.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}
export default function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.5 }) {
  const Comp = Icons[toPascal(name)];
  return Comp ? <Comp size={size} color={color} strokeWidth={strokeWidth} /> : null;
}
