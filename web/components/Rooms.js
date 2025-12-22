'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useTransform } from 'motion/react';

const rooms = [
  {
    id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio',
    description: 'Студия с террасой и бассейном. Уютный формат для пары или небольшой компании.',
    price: 150, unit: 'ночь', guests: 10, rooms: 2,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Бассейн', 'Сауна', 'Мангал', 'Парковка'],
    cover: '/images/std1.png',
    gallery: ['/images/std2.png', '/images/std3.png', '/images/std4.png'],
  },
  {
    id: 'luks', num: '02', name: 'Люкс', tag: 'Premium',
    description: 'Полный комфорт с видом на природу. Десять комнат, большой зал и собственная кухня.',
    price: 200, unit: 'ночь', guests: 20, rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Парковка', 'Караоке'],
    cover: '/images/luks1.png',
    gallery: ['/images/luks2.png', '/images/luks3.png', '/images/luks4.png'],
  },
  {
    id: 'zad', num: '03', name: 'Задний двор', tag: 'Outdoor',
    description: 'Открытая территория с бассейном, беседкой и зоной мангала. Идеально для праздников на воздухе.',
    price: 100, unit: 'день', guests: 15, rooms: null,
    amenities: ['WiFi', 'Бассейн', 'Мангал', 'Беседка', 'Шезлонги', 'Зонты', 'Холодильник', 'Парковка', 'Караоке'],
    cover: '/images/zad1.png',
    gallery: ['/images/zad2.png', '/images/zad3.png', '/images/zad4.png'],
  },
  {
    id: 'full', num: '04', name: 'Вся территория', tag: 'Exclusive',
    description: 'Полный выкуп виллы. Закрытый формат для крупных мероприятий и корпоративного отдыха.',
    price: 500, unit: 'ночь', guests: 30, rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Беседка', 'Шезлонги', 'Парковка', 'Холодильник', 'TV'],
    cover: '/images/luks6.png',
    gallery: ['/images/luks7.png', '/images/zad4.png', '/images/luks8.png'],
  },
];

function Spec({ label, value, sub }) {
  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>{label}</p>
      <p className="font-display" style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)', lineHeight: 1, color: 'var(--gold)', marginBottom: 5 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>{sub}</p>
    </div>
  );
}

export default function Rooms() {
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const lineH = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(rooms.length - 1, Math.max(0, Math.floor(v * rooms.length)));
    if (next !== current) {
      setDirection(next > current ? 1 : -1);
      setCurrent(next);
    }
  });

  const go = (delta) => {
    const next = Math.max(0, Math.min(rooms.length - 1, current + delta));
    if (next === current || !ref.current) return;
    setDirection(delta);
    setCurrent(next);
    const sectionTop = ref.current.getBoundingClientRect().top + window.scrollY;
    const sectionH = ref.current.offsetHeight;
    window.scrollTo({ top: sectionTop + (next / rooms.length) * sectionH + 8, behavior: 'smooth' });
  };

  const room = rooms[current];

  return (
    <section id="rooms" ref={ref} style={{ position: 'relative', height: `${rooms.length * 100}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Background: all images rendered, CSS opacity switch — no DOM thrash */}
        {rooms.map((r, i) => (
          <div
            key={r.id}
            style={{
              position: 'absolute', inset: 0,
              opacity: i === current ? 1 : 0,
              transition: 'opacity 0.7s ease',
              pointerEvents: 'none',
            }}
          >
            <Image
              src={r.cover}
              alt={r.name}
              fill sizes="100vw"
              quality={72}
              className="object-cover"
              priority={i === 0}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(105deg, rgba(13,10,8,0.93) 0%, rgba(13,10,8,0.58) 48%, rgba(13,10,8,0.82) 100%)',
            }} />
          </div>
        ))}

        {/* Decorative number */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4vw', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          <span
            className="font-display"
            style={{
              fontSize: 'clamp(160px, 26vw, 310px)',
              lineHeight: 1,
              color: 'rgba(212, 164, 94, 0.06)',
              letterSpacing: '-0.04em',
              userSelect: 'none',
              transition: 'opacity 0.5s ease',
            }}
          >
            {room.num}
          </span>
        </div>

        {/* Left progress line */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'rgba(212,164,94,0.1)', zIndex: 5 }}>
          <motion.div style={{ width: '100%', height: lineH, background: 'var(--gold)' }} />
        </div>

        {/* Top label */}
        <div className="container-x" style={{ position: 'absolute', top: 'clamp(80px, 10vh, 120px)', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 }}>
          <p className="eyebrow" style={{ color: 'var(--text-soft)' }}>— Каталог</p>
          <span className="font-display" style={{ fontSize: 13, letterSpacing: '0.25em', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
            {room.num} / {String(rooms.length).padStart(2, '0')}
          </span>
        </div>

        {/* Main content */}
        <div className="container-x" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', paddingBottom: 'clamp(60px, 10vh, 110px)', zIndex: 5 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 'clamp(40px, 6vw, 80px)', width: '100%', alignItems: 'end' }}>

            {/* Content — AnimatePresence only for text, not images */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={room.id}
                custom={direction}
                initial={{ opacity: 0, y: (direction) * 40 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, y: (direction) * -30, transition: { duration: 0.3 } }}
              >
                <span style={{
                  display: 'inline-block', fontSize: 11, letterSpacing: '0.25em',
                  textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18,
                  padding: '5px 12px', border: '1px solid rgba(212,164,94,0.4)',
                }}>
                  {room.tag}
                </span>

                <h3 className="font-display" style={{ fontSize: 'clamp(2.8rem, 6vw, 5.5rem)', lineHeight: 1, marginBottom: 20, letterSpacing: '-0.01em' }}>
                  {room.name}
                </h3>

                <p style={{ color: 'var(--text-soft)', fontSize: 'clamp(14px, 1.1vw, 16px)', lineHeight: 1.7, maxWidth: 440, marginBottom: 32 }}>
                  {room.description}
                </p>

                <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 48px)', marginBottom: 32 }}>
                  <Spec label="Цена" value={`${room.price} PRB`} sub={`за ${room.unit}`} />
                  <Spec label="Гостей" value={`до ${room.guests}`} sub="человек" />
                  {room.rooms && <Spec label="Комнаты" value={`${room.rooms}`} sub="комнат" />}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
                  {room.amenities.slice(0, 5).map((a) => (
                    <span key={a} style={{ fontSize: 11, letterSpacing: '0.06em', padding: '7px 14px', border: '1px solid var(--line-strong)', borderRadius: 999, color: 'var(--text-soft)' }}>
                      {a}
                    </span>
                  ))}
                  {room.amenities.length > 5 && (
                    <span style={{ fontSize: 11, padding: '7px 14px', border: '1px solid var(--line)', borderRadius: 999, color: 'var(--muted)' }}>
                      +{room.amenities.length - 5}
                    </span>
                  )}
                </div>

                <a href="#contact" className="btn btn-primary" data-cursor>
                  Забронировать
                  <span className="btn-arrow">→</span>
                </a>
              </motion.div>
            </AnimatePresence>

            {/* Right: thumbnails + arrows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rooms.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => go(i - current)}
                    data-cursor
                    style={{
                      position: 'relative',
                      width: 'clamp(64px, 6vw, 88px)',
                      height: 'clamp(44px, 4vw, 60px)',
                      overflow: 'hidden',
                      border: `1px solid ${i === current ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 2,
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'border-color 0.4s ease',
                      outline: 'none',
                    }}
                  >
                    <Image src={r.cover} alt={r.name} fill sizes="90px" quality={45} className="object-cover" />
                    <div style={{ position: 'absolute', inset: 0, background: `rgba(13,10,8,${i === current ? 0.08 : 0.5})`, transition: 'background 0.4s ease' }} />
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {[-1, 1].map((d) => (
                  <button
                    key={d}
                    onClick={() => go(d)}
                    data-cursor
                    disabled={current === (d < 0 ? 0 : rooms.length - 1)}
                    style={{
                      width: 52, height: 52, borderRadius: '50%',
                      border: '1px solid var(--line-strong)',
                      background: 'transparent', color: 'var(--text)',
                      cursor: 'pointer', fontSize: 16,
                      opacity: current === (d < 0 ? 0 : rooms.length - 1) ? 0.25 : 1,
                      transition: 'all 0.3s ease', outline: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
                  >
                    {d < 0 ? '←' : '→'}
                  </button>
                ))}
              </div>

              {/* Mini gallery */}
              <div style={{ display: 'flex', gap: 6 }}>
                {room.gallery.map((src, i) => (
                  <div key={i} style={{ position: 'relative', width: 'clamp(56px, 6vw, 86px)', height: 'clamp(38px, 4vw, 56px)', overflow: 'hidden', borderRadius: 2, border: '1px solid var(--line)', transition: 'opacity 0.5s ease' }}>
                    <Image src={src} alt="" fill sizes="90px" quality={45} className="object-cover" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
