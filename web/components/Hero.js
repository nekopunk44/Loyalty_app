'use client';
import { useEffect, useState } from 'react';

const IMAGES = ['/images/property1.png', '/images/property4.png', '/images/property2.png', '/images/property3.png'];
const STATS = [{ v: '4', l: 'Формата' }, { v: '30+', l: 'Гостей' }, { v: '2022', l: 'Открытие' }];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % IMAGES.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="villa" style={{ position: 'relative', height: '100svh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {IMAGES.map((src, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === current ? 1 : 0, transition: 'opacity 1.8s ease', zIndex: 0 }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', animation: `${i % 2 === 0 ? 'kbA' : 'kbB'} 12s ease-in-out infinite alternate` }} />
        </div>
      ))}

      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(247,242,232,0.18) 0%, rgba(247,242,232,0.50) 55%, rgba(247,242,232,0.92) 100%)' }} />

      <div style={{ position: 'absolute', top: 'clamp(96px,13vh,140px)', left: '5vw', right: '5vw', height: 1, background: 'rgba(160,120,60,0.2)', zIndex: 2 }} />
      <p style={{ position: 'absolute', top: 'clamp(86px,12vh,128px)', left: '50%', transform: 'translateX(-50%)', fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--r-muted)', whiteSpace: 'nowrap', zIndex: 2 }}>
        Приднестровье · Слободзея · Est. 2022
      </p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 2, padding: '0 clamp(16px,4vw,60px)' }}>
        <div style={{ overflow: 'hidden' }}>
          <h1 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(5.5rem,17vw,14rem)', lineHeight: 0.88, letterSpacing: '-0.025em', margin: 0, fontWeight: 300, color: 'var(--r-text)', animation: 'slideUp 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
            Villa
          </h1>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <h1 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(5.5rem,17vw,14rem)', lineHeight: 0.88, letterSpacing: '-0.025em', margin: 0, fontWeight: 400, fontStyle: 'italic', color: 'var(--r-gold)', animation: 'slideUp 1.1s cubic-bezier(0.16,1,0.3,1) 0.38s both' }}>
            Jaconda
          </h1>
        </div>

        <div style={{ width: 'clamp(40px,6vw,72px)', height: 1, background: 'var(--r-gold)', margin: 'clamp(24px,3.5vh,40px) 0', opacity: 0.55, animation: 'fadeIn 1s ease 0.9s both' }} />

        <p style={{ fontSize: 'clamp(13px,1.1vw,15px)', color: 'var(--r-text-soft)', maxWidth: 360, lineHeight: 1.75, letterSpacing: '0.01em', animation: 'fadeIn 1s ease 1.1s both' }}>
          Приватная вилла в Слободзее — от камерного отдыха до полного выкупа территории на 30 гостей.
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 clamp(24px,5vw,80px) clamp(28px,5vh,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', animation: 'fadeIn 1.2s ease 1.5s both' }}>
        <div style={{ display: 'flex', gap: 'clamp(28px,5vw,64px)' }}>
          {STATS.map(s => (
            <div key={s.l}>
              <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.6rem,2.8vw,2.4rem)', lineHeight: 1, color: 'var(--r-gold)', marginBottom: 5, fontWeight: 400 }}>{s.v}</p>
              <p style={{ fontSize: 9, color: 'var(--r-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{s.l}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--r-muted)' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{ width: 1, height: 36, background: 'currentColor', animation: 'pulse-line 2s ease-in-out infinite' }} />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--r-line)', zIndex: 2 }} />
    </section>
  );
}
