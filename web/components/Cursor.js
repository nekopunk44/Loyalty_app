'use client';

import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ref = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const el = ref.current;
    if (!el) return;

    let x = 0, y = 0, cx = 0, cy = 0;

    const onMove = (e) => { x = e.clientX; y = e.clientY; };

    const onHoverIn = (e) => {
      if (e.target.closest('a, button, [data-cursor]')) el.classList.add('is-hover');
    };
    const onHoverOut = (e) => {
      if (e.target.closest('a, button, [data-cursor]')) el.classList.remove('is-hover');
    };

    const raf = () => {
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(raf);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onHoverIn);
    document.addEventListener('mouseout', onHoverOut);
    const id = requestAnimationFrame(raf);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onHoverIn);
      document.removeEventListener('mouseout', onHoverOut);
      cancelAnimationFrame(id);
    };
  }, []);

  return <div ref={ref} className="custom-cursor" />;
}
