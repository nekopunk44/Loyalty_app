'use client';
import { useEffect, useState } from 'react';

const IMAGES = [
  '/images/property1.png',
  '/images/property4.png',
  '/images/property2.png',
  '/images/property3.png',
];
const STATS = [
  { v: '4',    l: 'Формата'   },
  { v: '30+',  l: 'Гостей'    },
  { v: '2022', l: 'Открытие'  },
];

// Inline dark palette — Hero изолирован от светлой темы страницы
const D = {
  bg:       '#080604',
  cream:    '#f5ede0',
  creamSoft:'rgba(202,187,169,0.78)',
  gold:     '#d4a45e',
  goldBright:'#f0c987',
  goldDim:  'rgba(212,164,94,0.65)',
};

export default function Hero() {
  const [idx, setIdx]       = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 80);
    const t1 = setInterval(() => setIdx(i => (i + 1) % IMAGES.length), 5800);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, []);

  // Хелпер: fade-in + slide-up на CSS transitions через state
  const enter = (delay, extraY = 28) => ({
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${extraY}px)`,
    transition: `opacity 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                 transform 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section
      id="villa"
      style={{ position: 'relative', height: '100svh', overflow: 'hidden',
               display: 'flex', flexDirection: 'column', background: D.bg }}
    >

      {/* ── Слайдшоу ── */}
      {IMAGES.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, zIndex: 0,
          opacity: i === idx ? 1 : 0,
          transition: 'opacity 2.4s cubic-bezier(0.45,0,0.55,1)',
        }}>
          <img src={src} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            animation: `${i % 2 === 0 ? 'kbA' : 'kbB'} 16s ease-in-out infinite alternate`,
          }} />
        </div>
      ))}

      {/* ── Тёмный кинематографический оверлей ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(8,6,4,0.52) 0%, rgba(8,6,4,0.28) 38%, rgba(8,6,4,0.70) 72%, rgba(8,6,4,0.96) 100%)',
      }} />
      {/* Виньетка по краям */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.42) 100%)',
      }} />

      {/* ── Верхняя линия + геотег ── */}
      <div style={{
        position: 'absolute', top: 'clamp(94px,12.5vh,138px)',
        left: '5vw', right: '5vw', height: 1,
        background: 'rgba(212,164,94,0.22)', zIndex: 2,
      }} />
      <p style={{
        position: 'absolute', top: 'clamp(84px,11.5vh,126px)',
        left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase',
        color: D.goldDim, whiteSpace: 'nowrap', zIndex: 2, margin: 0,
      }}>
        Приднестровье · Слободзея · Est. 2022
      </p>

      {/* ── Центральный контент ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        position: 'relative', zIndex: 2,
        padding: '0 clamp(16px,4vw,60px)',
      }}>

        {/* Eyebrow */}
        <p style={{
          fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase',
          color: D.goldDim, margin: '0 0 clamp(18px,2.8vh,30px)',
          ...enter(0.08, 12),
        }}>
          Приватная вилла премиум-класса
        </p>

        {/* Headline */}
        <div style={{ overflow: 'hidden' }}>
          <h1 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(5.5rem,17vw,14rem)',
            lineHeight: 0.88, letterSpacing: '-0.03em',
            margin: 0, fontWeight: 300, color: D.cream,
            ...enter(0.22),
          }}>
            Villa
          </h1>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h1 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(5.5rem,17vw,14rem)',
            lineHeight: 0.88, letterSpacing: '-0.03em',
            margin: 0, fontWeight: 400, fontStyle: 'italic', color: D.gold,
            ...enter(0.40),
          }}>
            Jaconda
          </h1>
        </div>

        {/* Золотой разделитель — градиентная линия */}
        <div style={{
          width: 'clamp(48px,7vw,88px)', height: 1,
          background: `linear-gradient(90deg, transparent, ${D.gold}, transparent)`,
          margin: 'clamp(22px,3.2vh,38px) 0',
          ...enter(0.90, 0),
        }} />

        {/* Подзаголовок */}
        <p style={{
          fontSize: 'clamp(12px,0.95vw,14px)',
          color: D.creamSoft,
          maxWidth: 340, lineHeight: 1.9, letterSpacing: '0.025em',
          margin: 0,
          ...enter(1.10, 14),
        }}>
          Приватная вилла в Слободзее — от камерного отдыха до полного выкупа территории на&nbsp;30&nbsp;гостей.
        </p>

        {/* CTA-кнопки */}
        <div style={{
          marginTop: 'clamp(28px,4vh,44px)',
          display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center',
          ...enter(1.30, 10),
        }}>
          <HeroBtn href="#booking" filled>Забронировать</HeroBtn>
          <HeroBtn href="#rooms">Номера →</HeroBtn>
        </div>
      </div>

      {/* ── Нижняя полоса: статистика + scroll ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '0 clamp(24px,5vw,80px) clamp(30px,5.5vh,52px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        ...enter(1.55, 0),
      }}>
        <div style={{ display: 'flex', gap: 'clamp(28px,5vw,64px)' }}>
          {STATS.map(s => (
            <div key={s.l}>
              <p style={{
                fontFamily: 'var(--r-serif)',
                fontSize: 'clamp(1.6rem,2.8vw,2.5rem)',
                lineHeight: 1, color: D.gold,
                margin: '0 0 6px', fontWeight: 400,
              }}>{s.v}</p>
              <p style={{ fontSize: 9, color: 'rgba(202,187,169,0.55)', letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0 }}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Scroll-индикатор */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(202,187,169,0.45)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 38, background: 'currentColor', animation: 'pulse-line 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* ── Плавный переход к кремовой странице ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 100, zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, var(--r-bg))',
      }} />
    </section>
  );
}

function HeroBtn({ href, children, filled }) {
  const [hovered, setHovered] = useState(false);

  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 30px',
    fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
    textTransform: 'uppercase', textDecoration: 'none',
    borderRadius: 2,
    transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
    whiteSpace: 'nowrap',
  };

  const style = filled
    ? { ...base, background: hovered ? D.goldBright : D.gold, color: D.bg, border: 'none' }
    : { ...base, background: 'transparent', color: hovered ? D.gold : D.cream,
        border: `1px solid ${hovered ? 'rgba(212,164,94,0.55)' : 'rgba(245,237,224,0.22)'}` };

  return (
    <a href={href} style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {children}
    </a>
  );
}
