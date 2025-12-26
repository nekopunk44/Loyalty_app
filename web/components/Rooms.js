'use client';
import { useState, useEffect, useRef } from 'react';

const ROOMS = [
  {
    id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio',
    desc: 'Студия с террасой, бассейном и сауной. Камерный формат для пары или небольшой компании — без лишних метров, всё на своих местах.',
    price: '150', unit: 'ночь', guests: 'до 10', format: 'студия',
    images: ['/images/std1.jpg', '/images/std2.jpg', '/images/std3.jpg'],
  },
  {
    id: 'luks', num: '02', name: 'Люкс', tag: 'Premium',
    desc: 'Десять комнат, большой зал и собственная кухня. Гибкий формат для крупной компании — оставайтесь сколько нужно.',
    price: '200', unit: 'ночь', guests: 'до 20', format: 'апартаменты',
    images: ['/images/luks1.jpg', '/images/luks3.jpg', '/images/luks4.jpg'],
  },
  {
    id: 'zad', num: '03', name: 'Задний двор', tag: 'Outdoor',
    desc: 'Открытая территория с бассейном, беседкой и мангальной зоной. Свет, тень, вода — каркас идеального дня под открытым небом.',
    price: '100', unit: 'день', guests: 'до 15', format: 'open-air',
    images: ['/images/zad1.jpg', '/images/zad2.jpg', '/images/zad3.jpg'],
  },
  {
    id: 'full', num: '04', name: 'Вся территория', tag: 'Exclusive',
    desc: 'Полный выкуп виллы со всеми форматами. Закрытое пространство для корпоратива, юбилея или большого семейного праздника.',
    price: '500', unit: 'ночь', guests: 'до 30', format: 'выкуп',
    images: ['/images/luks2.jpg', '/images/luks5.jpg', '/images/luks6.jpg'],
  },
];

// SVG-шум для зернистости (плёночная текстура)
const GRAIN = `url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.45 0 0 0 0 0.4 0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

export default function Rooms() {
  const [active, setActive] = useState(0);
  const [photo,  setPhoto]  = useState(0);
  const [tKey,   setTKey]   = useState(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  // Появление при скролле
  useEffect(() => {
    if (!sectionRef.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  const go = (i) => {
    if (i === active) return;
    setActive(i);
    setPhoto(0);
    setTKey(k => k + 1);
  };
  const switchPhoto = (i) => {
    if (i === photo) return;
    setPhoto(i);
  };
  const cur = ROOMS[active];
  const letters = [...cur.name];

  return (
    <section id="rooms" ref={sectionRef} style={{
      position: 'relative', height: 'calc(100svh - 72px)', overflow: 'hidden',
      background: '#0a0805',
      display: 'grid', gridTemplateColumns: 'minmax(420px, 46%) 1fr',
      opacity: inView ? 1 : 0, transition: 'opacity 1.2s ease',
    }}>
      <style>{`
        @keyframes letterIn {
          from { opacity: 0; transform: translateY(36px) rotateX(-22deg); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0)    rotateX(0);      filter: blur(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineDraw {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
        @keyframes goldPulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes ghostFloat {
          0%, 100% { transform: translate(0,0) rotate(0deg); }
          50%      { transform: translate(-1%,1.5%) rotate(0.3deg); }
        }
        @keyframes numFlip {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes grainShift {
          0%   { transform: translate(0,0); }
          25%  { transform: translate(-2%,1%); }
          50%  { transform: translate(1%,-2%); }
          75%  { transform: translate(-1%,-1%); }
          100% { transform: translate(0,0); }
        }
        .fu { animation: fadeUp 0.85s cubic-bezier(0.16,1,0.3,1) both; }
        .d0 { animation-delay: 0s; } .d1 { animation-delay: 0.08s; }
        .d2 { animation-delay: 0.16s; } .d3 { animation-delay: 0.24s; }
        .d4 { animation-delay: 0.32s; } .d5 { animation-delay: 0.42s; }
        .line-draw  { transform-origin: left center; animation: lineDraw 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .letter     { display: inline-block; transform-origin: center bottom; }
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

        {/* Призрачный номер с floating-анимацией */}
        <div key={`ghost-${tKey}`} className="ghost-num" style={{
          position: 'absolute', top: '-4%', right: '-22%',
          fontFamily: 'var(--r-serif)', fontStyle: 'italic',
          fontSize: 'clamp(18rem, 36vw, 32rem)', fontWeight: 300,
          lineHeight: 0.82, letterSpacing: '-0.06em',
          color: 'rgba(212,164,94,0.05)', userSelect: 'none', pointerEvents: 'none',
          zIndex: 0, whiteSpace: 'nowrap',
          animation: 'fadeUp 1.2s cubic-bezier(0.16,1,0.3,1) both, ghostFloat 16s ease-in-out infinite 1.2s',
        }}>
          {cur.num}
        </div>

        {/* Основной контент */}
        <div key={tKey} style={{
          position: 'relative', zIndex: 2, flex: 1,
          padding: 'clamp(28px,4vh,48px) clamp(48px,5vw,80px) clamp(16px,2vh,24px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        }}>

          {/* Верхний блок: метка + название + описание */}
          <div>
            <div className="fu d1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'clamp(24px,3.5vh,40px)' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.7)' }}>
                Каталог
              </span>
              <div className="line-draw" style={{ width: 28, height: 1, background: 'rgba(212,164,94,0.35)', animationDelay: '0.15s' }} />
            </div>

            <h2 style={{
              fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(2.8rem, 5vw, 5.2rem)', lineHeight: 0.95,
              letterSpacing: '-0.025em', color: '#f5ede0',
              margin: '0 0 clamp(14px,2vh,22px)',
              perspective: '600px',
            }}>
              {letters.map((ch, i) => (
                <span key={`${tKey}-${i}`} className="letter" style={{
                  animation: `letterIn 0.75s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.035}s both`,
                }}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </h2>

            <p className="fu d3" style={{
              fontSize: 14, color: 'rgba(202,187,169,0.62)',
              lineHeight: 1.85, maxWidth: 400,
              margin: 0, letterSpacing: '0.005em',
            }}>
              {cur.desc}
            </p>
          </div>

          {/* Табличные характеристики с line-draw анимацией */}
          <div style={{ maxWidth: 400, marginTop: 'clamp(28px,4vh,48px)' }}>
            {[
              ['Формат', cur.format],
              ['Гостей', cur.guests],
              ['Цена',   <>от <span style={{ color: '#d4a45e' }}>{cur.price}</span> PRB / {cur.unit}</>],
            ].map(([label, value], idx) => (
              <div key={idx} className="fu" style={{
                animationDelay: `${0.38 + idx * 0.08}s`,
                position: 'relative',
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '13px 0',
              }}>
                <div className="line-draw" style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                  background: 'rgba(212,164,94,0.18)',
                  animationDelay: `${0.45 + idx * 0.08}s`,
                }} />
                {idx === 2 && (
                  <div className="line-draw" style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                    background: 'rgba(212,164,94,0.18)',
                    animationDelay: `${0.45 + idx * 0.08}s`,
                  }} />
                )}
                <span style={{ fontSize: 9, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(202,187,169,0.4)' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--r-serif)', fontSize: 14, color: 'rgba(245,237,224,0.9)' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Нижняя навигация по номерам */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '0 clamp(48px,5vw,80px) clamp(20px,2.5vh,32px)',
          borderTop: '1px solid rgba(212,164,94,0.28)',
          background: 'linear-gradient(to bottom, rgba(212,164,94,0.04), transparent 60%)',
          display: 'flex', gap: 0,
        }}>
          {ROOMS.map((r, ri) => {
            const isAct = ri === active;
            return (
              <button key={ri} onClick={() => go(ri)} style={{
                flex: 1, padding: 'clamp(14px,1.8vh,20px) 6px 4px',
                background: 'transparent', border: 'none',
                borderRight: ri < ROOMS.length - 1 ? '1px solid rgba(212,164,94,0.10)' : 'none',
                cursor: isAct ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7,
                transition: 'all 0.4s ease', textAlign: 'left',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isAct) {
                  e.currentTarget.querySelector('.nav-line').style.transform = 'scaleX(1)';
                  e.currentTarget.querySelector('.nav-name').style.color = '#f5ede0';
                  e.currentTarget.querySelector('.nav-price').style.color = 'rgba(212,164,94,0.85)';
                }
              }}
              onMouseLeave={e => {
                if (!isAct) {
                  e.currentTarget.querySelector('.nav-line').style.transform = 'scaleX(0)';
                  e.currentTarget.querySelector('.nav-name').style.color = 'rgba(245,237,224,0.75)';
                  e.currentTarget.querySelector('.nav-price').style.color = 'rgba(245,237,224,0.55)';
                }
              }}>
                <div className="nav-line" style={{
                  position: 'absolute', top: -1, left: 0, right: 0, height: 2,
                  background: '#d4a45e',
                  transform: isAct ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left center',
                  transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: isAct ? '0 0 12px rgba(212,164,94,0.5)' : 'none',
                }} />
                <span className="nav-name" style={{
                  fontSize: 13, letterSpacing: '0.01em',
                  color: isAct ? '#f5ede0' : 'rgba(245,237,224,0.75)',
                  fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                  fontWeight: isAct ? 500 : 400,
                  transition: 'color 0.4s ease',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  width: '100%',
                }}>
                  {r.name}
                </span>
                <span className="nav-price" style={{
                  fontSize: 10, letterSpacing: '0.18em',
                  color: isAct ? '#d4a45e' : 'rgba(245,237,224,0.55)',
                  textTransform: 'uppercase',
                  transition: 'color 0.4s ease',
                }}>
                  от {r.price} PRB
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════ RIGHT PANEL ════════════════════ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#0a0805' }}>

        {/* Все фото — простой crossfade */}
        {ROOMS.map((r, ri) => r.images.map((src, ii) => {
          const isAct = ri === active && ii === photo;
          return (
            <img key={`${ri}-${ii}`} src={src} alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover',
                opacity: isAct ? 1 : 0,
                transition: 'opacity 0.9s ease',
                willChange: 'opacity',
              }}
            />
          );
        }))}

        {/* Виньетирование */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(8,6,4,0.55) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Плёночное зерно */}
        <div style={{
          position: 'absolute', top: '-5%', left: '-5%', right: '-5%', bottom: '-5%',
          zIndex: 2, pointerEvents: 'none',
          backgroundImage: GRAIN,
          backgroundSize: '220px 220px',
          opacity: 0.18,
          mixBlendMode: 'overlay',
          animation: 'grainShift 8s steps(4) infinite',
        }} />

        {/* Левый край — растворение в левую панель */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '14%', zIndex: 3,
          background: 'linear-gradient(to right, rgba(10,8,5,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Верхний правый — счётчик фото */}
        <div key={`pcnt-${active}-${photo}`} style={{
          position: 'absolute', top: 'clamp(100px,13vh,130px)', right: 'clamp(40px,5vw,72px)',
          zIndex: 4, display: 'flex', alignItems: 'center', gap: 14,
          animation: 'numFlip 0.55s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          <span style={{
            fontFamily: 'var(--r-serif)', fontStyle: 'italic',
            fontSize: 11, letterSpacing: '0.18em',
            color: 'rgba(245,237,224,0.5)',
          }}>
            {String(photo + 1).padStart(2, '0')}<span style={{ color: 'rgba(245,237,224,0.25)' }}> / </span>{String(cur.images.length).padStart(2, '0')}
          </span>
        </div>

        {/* Нижняя правая — индикатор + стрелки */}
        <div style={{
          position: 'absolute', bottom: 'clamp(36px,4.5vh,52px)', right: 'clamp(40px,5vw,72px)',
          zIndex: 4, display: 'flex', alignItems: 'center', gap: 22,
        }}>

          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            {cur.images.map((_, ii) => (
              <button key={ii} onClick={() => switchPhoto(ii)} style={{
                height: 1, width: ii === photo ? 30 : 10,
                background: ii === photo ? '#d4a45e' : 'rgba(245,237,224,0.28)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.45s ease',
                animation: ii === photo ? 'goldPulse 3s ease-in-out infinite' : 'none',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => switchPhoto((photo - 1 + cur.images.length) % cur.images.length)}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'transparent', border: '1px solid rgba(245,237,224,0.16)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.5)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.16)'; e.currentTarget.style.transform = 'scale(1)'; }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2.5L4 6l3.5 3.5" stroke="#f5ede0" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
            </button>
            <button onClick={() => switchPhoto((photo + 1) % cur.images.length)}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'transparent', border: '1px solid rgba(245,237,224,0.16)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.18)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.5)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.16)'; e.currentTarget.style.transform = 'scale(1)'; }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4.5 2.5L8 6l-3.5 3.5" stroke="#f5ede0" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Золотая вертикаль на границе панелей */}
      <div style={{
        position: 'absolute', left: '46%',
        top: 0, bottom: 0, width: 1,
        background: 'linear-gradient(to bottom, transparent 0%, rgba(212,164,94,0.22) 18%, rgba(212,164,94,0.22) 82%, transparent 100%)',
        zIndex: 5, pointerEvents: 'none',
      }} />
    </section>
  );
}
