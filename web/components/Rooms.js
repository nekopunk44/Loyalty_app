'use client';
import { useState } from 'react';

const ROOMS = [
  { id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio',    sub: 'до 10 гостей', price: '150', unit: 'ночь', cover: '/images/std1.png'  },
  { id: 'luks',     num: '02', name: 'Люкс',     tag: 'Premium',   sub: 'до 20 гостей', price: '200', unit: 'ночь', cover: '/images/luks1.png' },
  { id: 'zad',      num: '03', name: 'Задний двор', tag: 'Outdoor',   sub: 'до 15 гостей', price: '100', unit: 'день', cover: '/images/zad1.png'  },
  { id: 'full',     num: '04', name: 'Вся территория', tag: 'Exclusive', sub: 'до 30 гостей', price: '500', unit: 'ночь', cover: '/images/luks2.png' },
];

export default function Rooms() {
  const [hovered, setHovered] = useState(null);

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  };

  return (
    <section id="rooms" style={{ background: 'var(--r-bg)' }}>
      <style>{`
        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 3px;
          padding: 0 3px 3px;
        }
        .rooms-grid .card:nth-child(1) { grid-column: 1 / 3; }
        .rooms-grid .card:nth-child(2) { grid-column: 3 / 6; }
        .rooms-grid .card:nth-child(3) { grid-column: 1 / 4; }
        .rooms-grid .card:nth-child(4) { grid-column: 4 / 6; }
        @media (max-width: 860px) {
          .rooms-grid {
            grid-template-columns: 1fr 1fr;
            gap: 2px;
            padding: 0 2px 2px;
          }
          .rooms-grid .card:nth-child(n) { grid-column: auto; }
        }
        @media (max-width: 540px) {
          .rooms-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Заголовок секции */}
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,60px) clamp(36px,4.5vw,56px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--r-gold)', marginBottom: 16, margin: '0 0 14px' }}>
              — Каталог
            </p>
            <h2 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.2rem,4.5vw,4rem)', fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.025em', color: 'var(--r-text)', margin: 0 }}>
              Четыре формата <em style={{ fontStyle: 'italic', color: 'var(--r-gold)' }}>проживания</em>
            </h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--r-text-soft)', lineHeight: 1.8, maxWidth: 320, margin: 0 }}>
            От уютной студии на двоих до полного выкупа виллы на&nbsp;30&nbsp;гостей.
          </p>
        </div>
      </div>

      {/* Сетка карточек */}
      <div className="rooms-grid">
        {ROOMS.map((room, i) => {
          const isHov = hovered === i;
          return (
            <div key={room.id} className="card"
              style={{ position: 'relative', overflow: 'hidden', height: 'clamp(340px,48vh,600px)', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={scrollToContact}>

              {/* Фото */}
              <img src={room.cover} alt={room.name} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: isHov ? 'scale(1.07)' : 'scale(1)',
                transition: 'transform 1.3s cubic-bezier(0.16,1,0.3,1)',
              }} />

              {/* Градиент */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(8,6,4,0.04) 0%, rgba(8,6,4,0.15) 42%, rgba(8,6,4,0.84) 100%)',
                opacity: isHov ? 1 : 0.88,
                transition: 'opacity 0.5s ease',
              }} />

              {/* Тег — верхний левый */}
              <div style={{
                position: 'absolute', top: 24, left: 24,
                fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase',
                color: '#d4a45e', padding: '5px 13px',
                border: '1px solid rgba(212,164,94,0.38)', borderRadius: 2,
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              }}>
                {room.tag}
              </div>

              {/* Призрачный номер — правый верх */}
              <div style={{
                position: 'absolute', top: 14, right: 22,
                fontFamily: 'var(--r-serif)', fontSize: 'clamp(4rem,7.5vw,8rem)',
                lineHeight: 1, color: 'rgba(255,255,255,1)', fontWeight: 400,
                letterSpacing: '-0.05em', userSelect: 'none',
                opacity: isHov ? 0.14 : 0.05,
                transition: 'opacity 0.6s ease',
              }}>
                {room.num}
              </div>

              {/* Контент — нижний */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 28px 28px' }}>
                <h3 style={{
                  fontFamily: 'var(--r-serif)', fontWeight: 300,
                  fontSize: 'clamp(1.8rem,2.8vw,2.6rem)', lineHeight: 1,
                  letterSpacing: '-0.02em', color: '#f5ede0',
                  margin: '0 0 10px',
                }}>
                  {room.name}
                </h3>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.1rem,1.7vw,1.45rem)', color: '#d4a45e', lineHeight: 1 }}>
                    от {room.price} PRB
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(202,187,169,0.45)', letterSpacing: '0.06em' }}>
                    / {room.unit} · {room.sub}
                  </span>
                </div>

                {/* CTA — появляется при наведении */}
                <div style={{
                  overflow: 'hidden',
                  height: isHov ? 34 : 0,
                  transition: 'height 0.42s cubic-bezier(0.16,1,0.3,1)',
                }}>
                  <div style={{ paddingTop: 14 }}>
                    <span style={{
                      fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
                      color: '#d4a45e', borderBottom: '1px solid rgba(212,164,94,0.4)',
                      paddingBottom: 2,
                    }}>
                      Выбрать →
                    </span>
                  </div>
                </div>
              </div>

              {/* Тонкая золотая рамка при наведении */}
              <div style={{
                position: 'absolute', inset: 0,
                border: '1px solid rgba(212,164,94,0.3)',
                opacity: isHov ? 1 : 0,
                transition: 'opacity 0.4s ease',
                pointerEvents: 'none',
              }} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
