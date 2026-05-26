'use client';
import { useEffect, useState } from 'react';

const IMAGES = [
  '/images/property1.png',
  '/images/property4.png',
  '/images/property2.png',
  '/images/property3.png',
];
const STATS = [
  { v: '4',    l: 'Формата'  },
  { v: '30+',  l: 'Гостей'   },
  { v: '2022', l: 'Открытие' },
];

const D = {
  bg:        '#080604',
  cream:     '#f5ede0',
  creamSoft: 'rgba(202,187,169,0.80)',
  gold:      '#d4a45e',
  goldBright:'#f0c987',
  goldDim:   'rgba(212,164,94,0.60)',
};

export default function Hero() {
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 100);
    const t1 = setInterval(() => setIdx(i => (i + 1) % IMAGES.length), 5800);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, []);

  // Плавное появление: opacity + translateY
  const reveal = (delay, dy = 22) => ({
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${dy}px)`,
    transition: `opacity 1.15s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                 transform 1.15s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  const hPad = 'clamp(36px, 7.5vw, 104px)';

  return (
    <section
      id="villa"
      style={{ position: 'relative', height: '100svh', overflow: 'hidden',
               display: 'flex', flexDirection: 'column', background: D.bg }}
    >

      {/* ── Слайдшоу ─────────────────────────────── */}
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

      {/* ── Оверлеи ──────────────────────────────── */}
      {/* Горизонтальный: слева тёмно (читаемость), справа открывается фото */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(100deg, rgba(8,6,4,0.93) 0%, rgba(8,6,4,0.78) 38%, rgba(8,6,4,0.30) 65%, rgba(8,6,4,0.10) 100%)',
      }} />
      {/* Вертикальный: тёмный верх и низ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(180deg, rgba(8,6,4,0.48) 0%, transparent 22%, transparent 58%, rgba(8,6,4,0.94) 100%)',
      }} />

      {/* ── Основной контент ─────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        padding: `0 ${hPad}`,
        paddingTop: 'clamp(90px, 12vh, 130px)',
      }}>

        {/* Геотег с короткой линией */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          marginBottom: 'clamp(28px, 4.5vh, 44px)',
          ...reveal(0.08, 8),
        }}>
          <div style={{ width: 26, height: 1, background: D.gold, opacity: 0.55, flexShrink: 0 }} />
          <span style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: D.goldDim }}>
            Приднестровье · Слободзея · Est.&nbsp;2022
          </span>
        </div>

        {/* Заголовок: вертикальная линия + Villa / Jaconda */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 'clamp(20px, 3vw, 36px)' }}>

          {/* Тонкая золотая вертикальная линия */}
          <div style={{
            width: 1, flexShrink: 0,
            background: `linear-gradient(to bottom, transparent 0%, ${D.gold} 18%, ${D.gold} 82%, transparent 100%)`,
            opacity: visible ? 0.48 : 0,
            transition: 'opacity 1.4s ease 0.15s',
          }} />

          <div style={{ overflow: 'hidden' }}>
            {/* Villa */}
            <h1 style={{
              fontFamily: 'var(--r-serif)',
              fontSize: 'clamp(4.6rem, 14vw, 12rem)',
              lineHeight: 0.89, letterSpacing: '-0.032em',
              margin: 0, fontWeight: 300, color: D.cream,
              ...reveal(0.22),
            }}>
              Villa
            </h1>
            {/* Jaconda — чуть смещена вправо, курсив */}
            <h1 style={{
              fontFamily: 'var(--r-serif)',
              fontSize: 'clamp(4.6rem, 14vw, 12rem)',
              lineHeight: 0.92, letterSpacing: '-0.032em',
              margin: 0, fontWeight: 400, fontStyle: 'italic', color: D.gold,
              paddingLeft: 'clamp(14px, 2.2vw, 36px)',
              ...reveal(0.40),
            }}>
              Jaconda
            </h1>
          </div>
        </div>

        {/* Подпись + CTA — выровнены под текстом (отступ = ширина линии + gap) */}
        <div style={{
          marginTop: 'clamp(28px, 4.2vh, 48px)',
          paddingLeft: `calc(1px + clamp(20px, 3vw, 36px))`,
          maxWidth: 390,
        }}>
          <p style={{
            fontSize: 'clamp(12px, 0.9vw, 14px)',
            color: D.creamSoft, lineHeight: 1.9, letterSpacing: '0.02em',
            margin: '0 0 clamp(24px, 3.5vh, 36px)',
            ...reveal(0.64, 10),
          }}>
            Приватная вилла в Слободзее&nbsp;— от камерного отдыха до полного выкупа территории на&nbsp;30&nbsp;гостей.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', ...reveal(0.82, 8) }}>
            <HeroBtn href="#booking" filled>Забронировать</HeroBtn>
            <HeroBtn href="#rooms">Номера&nbsp;→</HeroBtn>
          </div>
        </div>
      </div>

      {/* ── Нижняя панель: статистика + Scroll ──── */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: `0 ${hPad} clamp(28px, 5.5vh, 52px)`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        ...reveal(1.55, 0),
      }}>
        <div style={{ display: 'flex', gap: 'clamp(24px, 5vw, 64px)' }}>
          {STATS.map(s => (
            <div key={s.l}>
              <p style={{
                fontFamily: 'var(--r-serif)',
                fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)',
                lineHeight: 1, color: D.gold, margin: '0 0 7px', fontWeight: 400,
              }}>{s.v}</p>
              <p style={{
                fontSize: 9, color: 'rgba(202,187,169,0.50)',
                letterSpacing: '0.22em', textTransform: 'uppercase', margin: 0,
              }}>{s.l}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(202,187,169,0.38)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 36, background: 'currentColor', animation: 'pulse-line 2s ease-in-out infinite' }} />
        </div>
      </div>

      {/* ── Плавный переход к кремовой странице ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 115,
        zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, var(--r-bg))',
      }} />
    </section>
  );
}

// ── Кнопки Hero ──────────────────────────────────────────────────────────────
function HeroBtn({ href, children, filled }) {
  const [hov, setHov] = useState(false);

  const base = {
    display: 'inline-flex', alignItems: 'center',
    padding: '13px 28px', borderRadius: 2,
    fontSize: 11, fontWeight: filled ? 500 : 400,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    textDecoration: 'none', whiteSpace: 'nowrap', cursor: 'pointer',
    transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
  };

  return (
    <a
      href={href}
      style={filled
        ? { ...base, background: hov ? D.goldBright : D.gold, color: D.bg, border: 'none' }
        : { ...base, background: 'transparent', color: hov ? D.gold : D.cream,
            border: `1px solid ${hov ? 'rgba(212,164,94,0.50)' : 'rgba(245,237,224,0.22)'}` }
      }
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </a>
  );
}
