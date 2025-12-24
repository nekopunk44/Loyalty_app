'use client';
import { useState } from 'react';

const ROOMS = [
  {
    id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio',
    desc: 'Студия с террасой и бассейном для пары или компании до 10 человек.',
    price: '150', unit: 'ночь', guests: 10,
    images: ['/images/std1.png', '/images/std2.png', '/images/std3.png'],
  },
  {
    id: 'luks', num: '02', name: 'Люкс', tag: 'Premium',
    desc: 'Десять комнат, большой зал и кухня для компании до 20 человек.',
    price: '200', unit: 'ночь', guests: 20,
    images: ['/images/luks1.png', '/images/luks3.png', '/images/luks4.png'],
  },
  {
    id: 'zad', num: '03', name: 'Задний двор', tag: 'Outdoor',
    desc: 'Открытая территория с бассейном, беседкой и мангальной зоной.',
    price: '100', unit: 'день', guests: 15,
    images: ['/images/zad1.png', '/images/zad2.png', '/images/zad3.png'],
  },
  {
    id: 'full', num: '04', name: 'Вся\nтерритория', tag: 'Exclusive',
    desc: 'Полный выкуп виллы для корпоративов и мероприятий до 30 человек.',
    price: '500', unit: 'ночь', guests: 30,
    images: ['/images/luks2.png', '/images/luks5.png', '/images/luks6.png'],
  },
];

export default function Rooms() {
  const [active, setActive] = useState(0);
  const [photo,  setPhoto]  = useState(0);
  const [hov,    setHov]    = useState(null);

  const pick = (i) => { if (i !== active) { setActive(i); setPhoto(0); } };
  const goContact = () => {
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  };

  return (
    <section id="rooms" style={{ height: '100svh', display: 'flex', overflow: 'hidden', background: '#080604' }}>
      <style>{`
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-in { animation: panelIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {ROOMS.map((room, i) => {
        const isActive = i === active;
        const isHov    = hov === i && !isActive;
        const flex     = isActive ? '0 0 58%' : isHov ? '0 0 16%' : '0 0 14%';

        return (
          <div key={room.id}
            onClick={() => pick(i)}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
            style={{
              position: 'relative', overflow: 'hidden',
              flex, transition: 'flex 0.75s cubic-bezier(0.16,1,0.3,1)',
              cursor: isActive ? 'default' : 'pointer',
            }}>

            {/* ── Фото ── */}
            {room.images.map((src, ii) => (
              <img key={ii} src={src} alt=""
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover',
                  opacity: isActive ? (ii === photo ? 1 : 0) : (ii === 0 ? 1 : 0),
                  transform: isActive ? 'scale(1)' : (isHov ? 'scale(1.06)' : 'scale(1.12)'),
                  transition: 'opacity 0.85s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            ))}

            {/* ── Оверлей ── */}
            <div style={{
              position: 'absolute', inset: 0,
              background: isActive
                ? 'linear-gradient(175deg, rgba(8,6,4,0.06) 0%, transparent 32%, transparent 42%, rgba(8,6,4,0.93) 100%)'
                : `rgba(8,6,4,${isHov ? '0.48' : '0.62'})`,
              transition: 'background 0.7s ease',
            }} />

            {/* ── Inactive: вертикальное имя ── */}
            {!isActive && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 20,
              }}>
                <span style={{
                  fontFamily: 'var(--r-serif)',
                  fontSize: 'clamp(0.75rem, 1.1vw, 1rem)',
                  color: isHov ? 'rgba(212,164,94,0.9)' : 'rgba(212,164,94,0.55)',
                  letterSpacing: '0.24em', textTransform: 'uppercase',
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  transition: 'color 0.4s ease',
                }}>
                  {room.tag}
                </span>
                <div style={{ width: 1, height: 28, background: 'rgba(212,164,94,0.3)' }} />
                <span style={{
                  fontFamily: 'var(--r-serif)',
                  fontSize: 'clamp(1rem, 1.5vw, 1.4rem)',
                  fontWeight: 300, letterSpacing: '0.06em',
                  color: isHov ? 'rgba(245,237,224,0.92)' : 'rgba(245,237,224,0.55)',
                  writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  whiteSpace: 'nowrap', transition: 'color 0.4s ease',
                }}>
                  {room.name.replace('\n', ' ')}
                </span>
              </div>
            )}

            {/* ── Active: призрачный номер ── */}
            {isActive && (
              <div style={{
                position: 'absolute', top: '8%', left: '-2%',
                fontFamily: 'var(--r-serif)',
                fontSize: 'clamp(10rem, 22vw, 26rem)',
                lineHeight: 1, color: 'rgba(255,255,255,0.04)',
                fontWeight: 400, letterSpacing: '-0.06em',
                userSelect: 'none', pointerEvents: 'none',
              }}>
                {room.num}
              </div>
            )}

            {/* ── Active: секция-метка вверху ── */}
            {isActive && (
              <div key={active} className="panel-in" style={{
                position: 'absolute', top: 'clamp(88px,12vh,116px)', left: 'clamp(32px,4vw,60px)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.35)' }}>
                  Каталог
                </span>
                <div style={{ width: 1, height: 14, background: 'rgba(212,164,94,0.3)' }} />
                <span style={{ fontSize: 9, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.7)' }}>
                  {room.tag}
                </span>
                <div style={{ width: 1, height: 14, background: 'rgba(212,164,94,0.2)' }} />
                <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(245,237,224,0.3)' }}>
                  {room.num} / 04
                </span>
              </div>
            )}

            {/* ── Active: нижний контент ── */}
            {isActive && (
              <div key={`info-${active}`} className="panel-in"
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: 'clamp(24px,4vw,52px) clamp(32px,4vw,60px) clamp(32px,5vh,52px)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
                }}>

                {/* Левая часть */}
                <div>
                  <h3 style={{
                    fontFamily: 'var(--r-serif)', fontWeight: 300,
                    fontSize: 'clamp(3rem,5.5vw,5.5rem)', lineHeight: 0.9,
                    letterSpacing: '-0.03em', color: '#f5ede0',
                    margin: '0 0 clamp(14px,2vh,22px)', whiteSpace: 'pre-line',
                  }}>
                    {room.name}
                  </h3>
                  <p style={{
                    fontSize: 'clamp(12px,0.85vw,13px)', color: 'rgba(202,187,169,0.58)',
                    lineHeight: 1.85, maxWidth: 340, margin: 0, letterSpacing: '0.01em',
                  }}>
                    {room.desc}
                  </p>
                </div>

                {/* Правая часть */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 18, flexShrink: 0 }}>
                  {/* Цена */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.5)', margin: '0 0 6px' }}>
                      от
                    </p>
                    <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2rem,3vw,2.8rem)', color: '#d4a45e', lineHeight: 1, margin: '0 0 5px' }}>
                      {room.price}&thinsp;<span style={{ fontFamily: 'var(--r-sans)', fontSize: '0.38em', color: 'rgba(202,187,169,0.4)' }}>PRB</span>
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(202,187,169,0.36)', letterSpacing: '0.1em', margin: 0 }}>
                      / {room.unit} · до {room.guests} гостей
                    </p>
                  </div>

                  {/* Переключатель фото */}
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                    {room.images.map((_, ii) => (
                      <button key={ii}
                        onClick={e => { e.stopPropagation(); setPhoto(ii); }}
                        style={{
                          height: 1, width: ii === photo ? 26 : 8,
                          background: ii === photo ? '#d4a45e' : 'rgba(245,237,224,0.28)',
                          border: 'none', padding: 0, cursor: 'pointer',
                          transition: 'all 0.4s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* CTA */}
                  <button onClick={goContact} style={{
                    padding: '12px 26px', background: 'transparent', color: '#f5ede0',
                    border: '1px solid rgba(245,237,224,0.25)', borderRadius: 999,
                    fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#d4a45e'; e.currentTarget.style.color='#080604'; e.currentTarget.style.borderColor='transparent'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#f5ede0'; e.currentTarget.style.borderColor='rgba(245,237,224,0.25)'; }}>
                    Выбрать →
                  </button>
                </div>
              </div>
            )}

            {/* ── Тонкий разделитель ── */}
            {i < ROOMS.length - 1 && (
              <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
                background: 'rgba(212,164,94,0.1)', zIndex: 2,
              }} />
            )}
          </div>
        );
      })}
    </section>
  );
}
