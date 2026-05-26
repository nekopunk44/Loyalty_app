'use client';
import { useState, useEffect } from 'react';

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
    id: 'full', num: '04', name: 'Вся территория', tag: 'Exclusive',
    desc: 'Полный выкуп виллы для корпоративов и мероприятий до 30 человек.',
    price: '500', unit: 'ночь', guests: 30,
    images: ['/images/luks2.png', '/images/luks5.png', '/images/luks6.png'],
  },
];

export default function Rooms() {
  const [room, setRoom]       = useState(0);
  const [photo, setPhoto]     = useState(0);
  const [textKey, setTextKey] = useState(0);

  const goTo = (idx) => {
    if (idx === room) return;
    setRoom(idx);
    setPhoto(0);
    setTextKey(k => k + 1);
  };

  const prev = () => goTo((room - 1 + ROOMS.length) % ROOMS.length);
  const next = () => goTo((room + 1) % ROOMS.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room]);

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  };

  const cur = ROOMS[room];

  return (
    <section id="rooms" style={{ position: 'relative', height: '100svh', overflow: 'hidden', background: '#080604' }}>
      <style>{`
        @keyframes roomText {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .room-text-enter { animation: roomText 0.65s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* Все фото — crossfade */}
      {ROOMS.map((r, ri) =>
        r.images.map((src, ii) => (
          <img key={`${ri}-${ii}`} src={src} alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: ri === room && ii === photo ? 1 : 0,
              transform: ri === room && ii === photo ? 'scale(1)' : 'scale(1.04)',
              transition: 'opacity 0.9s ease, transform 1.4s ease',
              willChange: 'opacity, transform',
            }}
          />
        ))
      )}

      {/* Градиент */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(8,6,4,0.52) 0%, transparent 28%, transparent 45%, rgba(8,6,4,0.94) 100%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to right, rgba(8,6,4,0.28) 0%, transparent 55%)',
      }} />

      {/* Тег + счётчик — верх */}
      <div key={textKey} className="room-text-enter" style={{
        position: 'absolute', top: 'clamp(88px,12vh,116px)', left: 'clamp(28px,5vw,72px)',
        zIndex: 3, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ fontFamily: 'var(--r-serif)', fontSize: 12, color: 'rgba(245,237,224,0.4)', letterSpacing: '0.08em' }}>
          {cur.num}
        </span>
        <div style={{ width: 28, height: 1, background: 'rgba(212,164,94,0.4)' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.75)' }}>
          {cur.tag}
        </span>
      </div>

      {/* Индикатор фото — верх-справа */}
      <div style={{
        position: 'absolute', top: 'clamp(88px,12vh,116px)', right: 'clamp(28px,5vw,72px)',
        zIndex: 3, display: 'flex', gap: 10, alignItems: 'center',
      }}>
        {cur.images.map((_, ii) => (
          <button key={ii} onClick={() => setPhoto(ii)} style={{
            height: 1, width: ii === photo ? 28 : 8,
            background: ii === photo ? '#d4a45e' : 'rgba(245,237,224,0.3)',
            border: 'none', padding: 0, cursor: 'pointer',
            transition: 'width 0.4s ease, background 0.3s ease',
          }} />
        ))}
      </div>

      {/* Стрелки prev/next — прозрачные зоны по бокам */}
      <button onClick={prev} aria-label="Назад" style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 'clamp(56px,9vw,110px)',
        zIndex: 3, background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        paddingLeft: 'clamp(20px,3.5vw,40px)',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          style={{ opacity: 0.55, transition: 'opacity 0.25s, transform 0.25s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateX(-3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity='0.55'; e.currentTarget.style.transform='translateX(0)'; }}>
          <path d="M14 5L8 11L14 17" stroke="#f5ede0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button onClick={next} aria-label="Вперёд" style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 'clamp(56px,9vw,110px)',
        zIndex: 3, background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingRight: 'clamp(20px,3.5vw,40px)',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"
          style={{ opacity: 0.55, transition: 'opacity 0.25s, transform 0.25s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateX(3px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity='0.55'; e.currentTarget.style.transform='translateX(0)'; }}>
          <path d="M8 5L14 11L8 17" stroke="#f5ede0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Контент — низ */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
        padding: 'clamp(24px,4vw,56px) clamp(28px,5vw,72px) clamp(32px,5vh,56px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap',
      }}>

        {/* Название + описание */}
        <div key={textKey} className="room-text-enter">
          <h2 style={{
            fontFamily: 'var(--r-serif)', fontWeight: 300,
            fontSize: 'clamp(3rem,6.5vw,6.5rem)', lineHeight: 0.9,
            letterSpacing: '-0.03em', color: '#f5ede0',
            margin: '0 0 clamp(12px,1.8vh,20px)',
          }}>
            {cur.name}
          </h2>
          <p style={{
            fontSize: 'clamp(12px,0.9vw,14px)', color: 'rgba(202,187,169,0.62)',
            lineHeight: 1.8, maxWidth: 360, margin: 0,
          }}>
            {cur.desc}
          </p>
        </div>

        {/* Цена + CTA + навигация */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 20 }}>

          {/* Цена */}
          <div key={textKey} className="room-text-enter" style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.55)', margin: '0 0 6px' }}>
              от
            </p>
            <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2rem,3.5vw,3rem)', color: '#d4a45e', lineHeight: 1, margin: '0 0 5px' }}>
              {cur.price}&nbsp;<span style={{ fontFamily: 'var(--r-sans)', fontSize: '0.38em', color: 'rgba(202,187,169,0.45)' }}>PRB</span>
            </p>
            <p style={{ fontSize: 10, color: 'rgba(202,187,169,0.4)', letterSpacing: '0.1em', margin: 0 }}>
              / {cur.unit} · до {cur.guests} гостей
            </p>
          </div>

          {/* CTA */}
          <button onClick={scrollToContact} style={{
            padding: '12px 26px', background: 'transparent',
            color: '#f5ede0', border: '1px solid rgba(245,237,224,0.28)',
            borderRadius: 999, fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase', fontFamily: 'inherit',
            cursor: 'pointer', transition: 'all 0.3s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#d4a45e'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.color='#080604'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(245,237,224,0.28)'; e.currentTarget.style.color='#f5ede0'; }}>
            Выбрать →
          </button>

          {/* Навигация по номерам */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {ROOMS.map((r, ri) => (
              <button key={ri} onClick={() => goTo(ri)} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              }}>
                <span style={{
                  fontSize: 9, letterSpacing: '0.2em', fontFamily: 'var(--r-serif)',
                  color: ri === room ? '#d4a45e' : 'rgba(245,237,224,0.28)',
                  transition: 'color 0.35s ease',
                }}>
                  {r.num}
                </span>
                <div style={{
                  height: 1, width: ri === room ? 22 : 6,
                  background: ri === room ? '#d4a45e' : 'rgba(245,237,224,0.2)',
                  transition: 'all 0.4s ease',
                }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Плавный переход в следующую секцию */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
        zIndex: 4, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, var(--r-bg))',
      }} />
    </section>
  );
}
