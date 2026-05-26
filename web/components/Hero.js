'use client';
import { useEffect, useState } from 'react';

const IMAGES = [
  '/images/property1.png',
  '/images/property4.png',
  '/images/property2.png',
  '/images/property3.png',
];
const D = {
  bg:        '#080604',
  cream:     '#f5ede0',
  creamSoft: 'rgba(202,187,169,0.78)',
  gold:      '#d4a45e',
  goldDim:   'rgba(212,164,94,0.55)',
};

export default function Hero() {
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 100);
    const t1 = setInterval(() => setIdx(i => (i + 1) % IMAGES.length), 5800);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, []);

  const reveal = (delay, dy = 24) => ({
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${dy}px)`,
    transition: `opacity 1.2s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                 transform 1.2s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  const hPad = 'clamp(24px, 6vw, 80px)';

  return (
    <section
      id="villa"
      style={{ position: 'relative', height: '100svh', overflowX: 'clip', overflowY: 'hidden',
               display: 'flex', flexDirection: 'column', background: D.bg }}
    >

      {/* Слайдшоу */}
      {IMAGES.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, zIndex: 0,
          opacity: i === idx ? 1 : 0,
          transition: 'opacity 2.6s cubic-bezier(0.45,0,0.55,1)',
        }}>
          <img src={src} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            animation: `${i % 2 === 0 ? 'kbA' : 'kbB'} 18s ease-in-out infinite alternate`,
          }} />
        </div>
      ))}

      {/* Затемнение — равномерное по всему экрану */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'rgba(8,6,4,0.58)',
      }} />
      {/* Вертикальный градиент: темнее сверху и снизу */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(8,6,4,0.52) 0%, transparent 25%, transparent 55%, rgba(8,6,4,0.90) 100%)',
      }} />

      {/* Основной контент — по центру */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        padding: `clamp(90px,12vh,130px) ${hPad} 0`,
        textAlign: 'center',
      }}>

        {/* Геотег */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          marginBottom: 'clamp(24px, 4vh, 40px)',
          ...reveal(0.08, 8),
        }}>
          <div style={{ width: 22, height: 1, background: D.gold, opacity: 0.5, flexShrink: 0 }} />
          <span style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: D.goldDim }}>
            Приднестровье · Слободзея · Est.&nbsp;2022
          </span>
          <div style={{ width: 22, height: 1, background: D.gold, opacity: 0.5, flexShrink: 0 }} />
        </div>

        {/* Заголовок */}
        <div style={{ overflow: 'visible' }}>
          <h1 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(4.8rem, 14.5vw, 13rem)',
            lineHeight: 0.88, letterSpacing: '-0.032em',
            margin: 0, fontWeight: 300, color: D.cream,
            ...reveal(0.22),
          }}>
            Villa
          </h1>
          <h1 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(4.8rem, 14.5vw, 13rem)',
            lineHeight: 0.93, letterSpacing: '-0.032em',
            margin: 0, fontWeight: 400, fontStyle: 'italic', color: D.gold,
            ...reveal(0.40),
          }}>
            Jaconda
          </h1>
        </div>

        {/* Разделитель */}
        <div style={{
          width: 'clamp(40px, 6vw, 72px)', height: 1,
          background: D.gold, opacity: visible ? 0.45 : 0,
          margin: 'clamp(22px,3.5vh,36px) auto 0',
          transition: 'opacity 1.4s ease 0.55s',
        }} />

        {/* Подпись */}
      </div>

      {/* Scroll-индикатор */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: `0 ${hPad} clamp(28px, 5.5vh, 52px)`,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        ...reveal(1.2, 0),
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(202,187,169,0.35)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 36, background: 'currentColor', animation: 'pulse-line 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* Переход к следующей секции */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 115,
        zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, #080604)',
      }} />
    </section>
  );
}
