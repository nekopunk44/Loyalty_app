'use client';
import { useState } from 'react';

const ROOMS = [
  {
    id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio',
    desc: 'Студия с террасой, бассейном и сауной. Камерный формат для пары или небольшой компании — без лишних метров, всё на своих местах.',
    price: '150', unit: 'ночь', guests: 'до 10', format: 'студия',
    images: ['/images/std1.png', '/images/std2.png', '/images/std3.png'],
  },
  {
    id: 'luks', num: '02', name: 'Люкс', tag: 'Premium',
    desc: 'Десять комнат, большой зал и собственная кухня. Гибкий формат для крупной компании — оставайтесь сколько нужно.',
    price: '200', unit: 'ночь', guests: 'до 20', format: 'апартаменты',
    images: ['/images/luks1.png', '/images/luks3.png', '/images/luks4.png'],
  },
  {
    id: 'zad', num: '03', name: 'Задний двор', tag: 'Outdoor',
    desc: 'Открытая территория с бассейном, беседкой и мангальной зоной. Свет, тень, вода — каркас идеального дня под открытым небом.',
    price: '100', unit: 'день', guests: 'до 15', format: 'open-air',
    images: ['/images/zad1.png', '/images/zad2.png', '/images/zad3.png'],
  },
  {
    id: 'full', num: '04', name: 'Вся территория', tag: 'Exclusive',
    desc: 'Полный выкуп виллы со всеми форматами. Закрытое пространство для корпоратива, юбилея или большого семейного праздника.',
    price: '500', unit: 'ночь', guests: 'до 30', format: 'выкуп',
    images: ['/images/luks2.png', '/images/luks5.png', '/images/luks6.png'],
  },
];

export default function Rooms() {
  const [active, setActive] = useState(0);
  const [photo,  setPhoto]  = useState(0);
  const [tKey,   setTKey]   = useState(0);

  const go = (i) => {
    if (i === active) return;
    setActive(i);
    setPhoto(0);
    setTKey(k => k + 1);
  };
  const goContact = () => {
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  };

  const cur = ROOMS[active];

  return (
    <section id="rooms" style={{
      position: 'relative', height: '100svh', overflow: 'hidden',
      background: '#0a0805',
      display: 'grid', gridTemplateColumns: 'minmax(420px, 46%) 1fr',
    }}>
      <style>{`
        @keyframes kbRoom {
          0%   { transform: scale(1.02) translate(0, 0); }
          50%  { transform: scale(1.08) translate(-1.2%, -0.8%); }
          100% { transform: scale(1.02) translate(0, 0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fu { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) both; }
        .d0 { animation-delay: 0s;    }
        .d1 { animation-delay: 0.06s; }
        .d2 { animation-delay: 0.14s; }
        .d3 { animation-delay: 0.22s; }
        .d4 { animation-delay: 0.30s; }
        .d5 { animation-delay: 0.38s; }
        @media (max-width: 900px) {
          .rooms-grid { grid-template-columns: 1fr !important; grid-template-rows: 50% 50% !important; }
          .left-panel { padding-left: clamp(24px,5vw,40px) !important; padding-right: clamp(24px,5vw,40px) !important; }
          .ghost-num  { display: none !important; }
        }
      `}</style>

      {/* ════════════════════ LEFT PANEL ════════════════════ */}
      <div className="left-panel" style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0c0905 0%, #110d08 100%)',
        zIndex: 2,
      }}>

        {/* Призрачный номер */}
        <div key={`ghost-${tKey}`} className="ghost-num fu d0" style={{
          position: 'absolute', top: '-4%', right: '-22%',
          fontFamily: 'var(--r-serif)', fontStyle: 'italic',
          fontSize: 'clamp(18rem, 36vw, 32rem)', fontWeight: 300,
          lineHeight: 0.82, letterSpacing: '-0.06em',
          color: 'rgba(212,164,94,0.045)', userSelect: 'none', pointerEvents: 'none',
          zIndex: 0, whiteSpace: 'nowrap',
        }}>
          {cur.num}
        </div>

        {/* Верхняя метка */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: 'clamp(100px,13vh,130px) clamp(48px,5vw,80px) 0',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.55)' }}>
            Каталог
          </span>
          <div style={{ width: 22, height: 1, background: 'rgba(212,164,94,0.3)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(245,237,224,0.32)', fontFamily: 'var(--r-serif)', fontStyle: 'italic' }}>
            {cur.num} / 04
          </span>
        </div>

        {/* Основной контент */}
        <div key={tKey} style={{
          position: 'relative', zIndex: 2, flex: 1,
          padding: 'clamp(40px,5vh,72px) clamp(48px,5vw,80px) clamp(28px,3vh,36px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>

          <div className="fu d1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 20, height: 1, background: '#d4a45e' }} />
            <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: '#d4a45e' }}>
              {cur.tag}
            </span>
          </div>

          <h2 className="fu d2" style={{
            fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(2.8rem, 5vw, 5.2rem)', lineHeight: 0.95,
            letterSpacing: '-0.025em', color: '#f5ede0',
            margin: '0 0 clamp(22px,3vh,32px)',
          }}>
            {cur.name}
          </h2>

          <p className="fu d3" style={{
            fontSize: 14, color: 'rgba(202,187,169,0.62)',
            lineHeight: 1.85, maxWidth: 400,
            margin: '0 0 clamp(28px,4vh,40px)', letterSpacing: '0.005em',
          }}>
            {cur.desc}
          </p>

          {/* Табличные характеристики */}
          <div className="fu d4" style={{ maxWidth: 400, marginBottom: 'clamp(28px,4vh,38px)' }}>
            {[
              ['Цена',   <>от <span style={{ color: '#d4a45e' }}>{cur.price}</span> PRB / {cur.unit}</>],
              ['Гостей', cur.guests],
              ['Формат', cur.format],
            ].map(([label, value], idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '13px 0',
                borderTop: idx === 0 ? '1px solid rgba(212,164,94,0.16)' : 'none',
                borderBottom: '1px solid rgba(212,164,94,0.16)',
              }}>
                <span style={{ fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(202,187,169,0.38)' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--r-serif)', fontSize: 14, color: 'rgba(245,237,224,0.9)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button className="fu d5" onClick={goContact} style={{
            alignSelf: 'flex-start', padding: '14px 32px',
            background: 'transparent', color: '#f5ede0',
            border: '1px solid rgba(245,237,224,0.22)', borderRadius: 999,
            fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
            fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.4s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#d4a45e'; e.currentTarget.style.color = '#080604'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.letterSpacing = '0.28em'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f5ede0'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.22)'; e.currentTarget.style.letterSpacing = '0.24em'; }}>
            Забронировать формат →
          </button>
        </div>

        {/* Нижняя навигация по номерам */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '0 clamp(48px,5vw,80px) clamp(36px,4.5vh,52px)',
          borderTop: '1px solid rgba(212,164,94,0.12)',
          display: 'flex', gap: 0,
        }}>
          {ROOMS.map((r, ri) => {
            const isAct = ri === active;
            return (
              <button key={ri} onClick={() => go(ri)} style={{
                flex: 1, padding: 'clamp(20px,2.8vh,28px) 4px 4px',
                background: 'transparent', border: 'none',
                borderTop: isAct ? '1px solid #d4a45e' : '1px solid transparent',
                marginTop: -1, cursor: isAct ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
                transition: 'all 0.4s ease', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isAct) e.currentTarget.style.borderTopColor = 'rgba(212,164,94,0.35)'; }}
              onMouseLeave={e => { if (!isAct) e.currentTarget.style.borderTopColor = 'transparent'; }}>
                <span style={{
                  fontSize: 9, letterSpacing: '0.3em', fontFamily: 'var(--r-serif)',
                  color: isAct ? '#d4a45e' : 'rgba(245,237,224,0.32)',
                  transition: 'color 0.4s ease',
                }}>
                  {r.num}
                </span>
                <span style={{
                  fontSize: 11, letterSpacing: '0.02em',
                  color: isAct ? 'rgba(245,237,224,0.92)' : 'rgba(245,237,224,0.34)',
                  fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                  transition: 'color 0.4s ease',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  width: '100%',
                }}>
                  {r.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════ RIGHT PANEL (фото) ════════════════════ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0a0805' }}>

        {/* Все фото — crossfade с Ken Burns */}
        {ROOMS.map((r, ri) => r.images.map((src, ii) => {
          const isAct = ri === active && ii === photo;
          return (
            <img key={`${ri}-${ii}`} src={src} alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: isAct ? 1 : 0,
                transition: 'opacity 1.1s ease',
                animation: isAct ? 'kbRoom 22s ease-in-out infinite' : 'none',
                willChange: 'opacity, transform',
              }}
            />
          );
        }))}

        {/* Виньетирование */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(8,6,4,0.5) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Левый край — растворение в левую панель */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '12%', zIndex: 1,
          background: 'linear-gradient(to right, rgba(10,8,5,0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Верхний правый — мини-счётчик */}
        <div style={{
          position: 'absolute', top: 'clamp(100px,13vh,130px)', right: 'clamp(40px,5vw,72px)',
          zIndex: 2, display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            fontFamily: 'var(--r-serif)', fontStyle: 'italic',
            fontSize: 11, letterSpacing: '0.18em',
            color: 'rgba(245,237,224,0.45)',
          }}>
            {String(photo + 1).padStart(2, '0')}<span style={{ color: 'rgba(245,237,224,0.25)' }}> / </span>{String(cur.images.length).padStart(2, '0')}
          </span>
        </div>

        {/* Нижняя правая — индикатор + стрелки */}
        <div style={{
          position: 'absolute', bottom: 'clamp(36px,4.5vh,52px)', right: 'clamp(40px,5vw,72px)',
          zIndex: 2, display: 'flex', alignItems: 'center', gap: 22,
        }}>

          {/* Полоски-индикаторы */}
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            {cur.images.map((_, ii) => (
              <button key={ii} onClick={() => setPhoto(ii)} style={{
                height: 1, width: ii === photo ? 30 : 10,
                background: ii === photo ? '#d4a45e' : 'rgba(245,237,224,0.28)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.45s ease',
              }} />
            ))}
          </div>

          {/* Стрелки */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setPhoto(p => (p - 1 + cur.images.length) % cur.images.length)}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'transparent', border: '1px solid rgba(245,237,224,0.16)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.16)'; }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2.5L4 6l3.5 3.5" stroke="#f5ede0" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
            </button>
            <button onClick={() => setPhoto(p => (p + 1) % cur.images.length)}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'transparent', border: '1px solid rgba(245,237,224,0.16)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.16)'; }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="#f5ede0" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Тонкая золотая вертикаль на границе панелей */}
      <div style={{
        position: 'absolute', left: 'min(46%, calc(100% - 1fr))',
        top: 0, bottom: 0, width: 1,
        background: 'linear-gradient(to bottom, transparent 0%, rgba(212,164,94,0.18) 20%, rgba(212,164,94,0.18) 80%, transparent 100%)',
        zIndex: 3, pointerEvents: 'none',
      }} />
    </section>
  );
}
