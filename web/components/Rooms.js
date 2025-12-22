'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  motion, AnimatePresence,
  useScroll, useMotionValueEvent, useTransform,
} from 'motion/react';

const rooms = [
  {
    id: 'standart',
    num: '01',
    name: 'Стандарт',
    tag: 'Studio',
    description: 'Студия с террасой и бассейном. Уютный формат для пары или небольшой компании.',
    price: 150,
    unit: 'ночь',
    guests: 10,
    rooms: 2,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Бассейн', 'Сауна', 'Мангал', 'Парковка'],
    cover: '/images/std1.png',
    gallery: ['/images/std2.png', '/images/std3.png', '/images/std4.png'],
  },
  {
    id: 'luks',
    num: '02',
    name: 'Люкс',
    tag: 'Premium',
    description: 'Полный комфорт с видом на природу. Десять комнат, большой зал и собственная кухня.',
    price: 200,
    unit: 'ночь',
    guests: 20,
    rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Парковка', 'Караоке'],
    cover: '/images/luks1.png',
    gallery: ['/images/luks2.png', '/images/luks3.png', '/images/luks4.png'],
  },
  {
    id: 'zad',
    num: '03',
    name: 'Задний двор',
    tag: 'Outdoor',
    description: 'Открытая территория с бассейном, беседкой и зоной мангала. Идеально для праздников на свежем воздухе.',
    price: 100,
    unit: 'день',
    guests: 15,
    rooms: null,
    amenities: ['WiFi', 'Бассейн', 'Мангал', 'Беседка', 'Шезлонги', 'Зонты', 'Холодильник', 'Парковка', 'Караоке'],
    cover: '/images/zad1.png',
    gallery: ['/images/zad2.png', '/images/zad3.png', '/images/zad4.png'],
  },
  {
    id: 'full',
    num: '04',
    name: 'Вся территория',
    tag: 'Exclusive',
    description: 'Полный выкуп виллы со всеми удобствами. Закрытый формат для крупных мероприятий и корпоративного отдыха.',
    price: 500,
    unit: 'ночь',
    guests: 30,
    rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Беседка', 'Шезлонги', 'Парковка', 'Холодильник', 'TV', 'Зонты', 'Шезлонги'],
    cover: '/images/luks6.png',
    gallery: ['/images/luks7.png', '/images/zad4.png', '/images/luks8.png'],
  },
];

const variants = {
  img: {
    enter: { opacity: 0, scale: 1.08 },
    active: { opacity: 1, scale: 1, transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.55, ease: [0.4, 0, 1, 1] } },
  },
  num: {
    enter: (dir) => ({ y: dir > 0 ? 60 : -60, opacity: 0 }),
    active: { y: 0, opacity: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir) => ({ y: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.45 } }),
  },
  content: {
    enter: (dir) => ({ y: dir > 0 ? 50 : -50, opacity: 0 }),
    active: { y: 0, opacity: 1, transition: { duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir) => ({ y: dir > 0 ? -30 : 30, opacity: 0, transition: { duration: 0.4 } }),
  },
};

export default function Rooms() {
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(rooms.length - 1, Math.max(0, Math.floor(v * rooms.length)));
    if (next !== current) {
      setDirection(next > current ? 1 : -1);
      setCurrent(next);
    }
  });

  const lineH = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const room = rooms[current];

  const go = (delta) => {
    const next = Math.max(0, Math.min(rooms.length - 1, current + delta));
    if (next === current) return;
    setDirection(delta);
    setCurrent(next);

    // scroll section to the right slot
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const sectionH = ref.current.offsetHeight;
      const target = sectionTop + (next / rooms.length) * sectionH;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

  return (
    <section id="rooms" ref={ref} style={{ position: 'relative', height: `${rooms.length * 100}vh` }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Background images */}
        <AnimatePresence mode="sync" custom={direction}>
          {rooms.map((r, i) => i === current && (
            <motion.div
              key={r.id}
              custom={direction}
              variants={variants.img}
              initial="enter"
              animate="active"
              exit="exit"
              style={{ position: 'absolute', inset: 0 }}
            >
              <Image
                src={r.cover}
                alt={r.name}
                fill
                sizes="100vw"
                quality={72}
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(105deg, rgba(13,10,8,0.92) 0%, rgba(13,10,8,0.6) 48%, rgba(13,10,8,0.78) 100%)',
              }} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Decorative number watermark */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '5vw', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.span
              key={room.num}
              custom={direction}
              variants={variants.num}
              initial="enter"
              animate="active"
              exit="exit"
              className="font-display"
              style={{
                fontSize: 'clamp(160px, 28vw, 320px)',
                lineHeight: 1,
                color: 'rgba(212, 164, 94, 0.07)',
                letterSpacing: '-0.04em',
                userSelect: 'none',
              }}
            >
              {room.num}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Left progress line */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: 'rgba(212, 164, 94, 0.1)', zIndex: 5,
        }}>
          <motion.div style={{ width: '100%', height: lineH, background: 'var(--gold)' }} />
        </div>

        {/* Top label */}
        <div className="container-x" style={{
          position: 'absolute', top: 'clamp(80px, 10vh, 120px)', left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 5,
        }}>
          <p className="eyebrow" style={{ color: 'var(--text-soft)' }}>— Каталог</p>
          <span className="font-display" style={{ fontSize: 13, letterSpacing: '0.25em', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
            {room.num} / {String(rooms.length).padStart(2, '0')}
          </span>
        </div>

        {/* Main content */}
        <div className="container-x" style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end',
          paddingBottom: 'clamp(60px, 10vh, 110px)', zIndex: 5,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 'clamp(40px, 6vw, 80px)', width: '100%', alignItems: 'end' }}>

            {/* Left: name + description + CTA */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={room.id + '-content'}
                custom={direction}
                variants={variants.content}
                initial="enter"
                animate="active"
                exit="exit"
              >
                <span style={{
                  display: 'inline-block', fontSize: 11, letterSpacing: '0.25em',
                  textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18,
                  padding: '5px 12px', border: '1px solid rgba(212,164,94,0.4)',
                }}>
                  {room.tag}
                </span>

                <h3 className="font-display" style={{
                  fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
                  lineHeight: 1,
                  marginBottom: 20,
                  letterSpacing: '-0.01em',
                }}>
                  {room.name}
                </h3>

                <p style={{ color: 'var(--text-soft)', fontSize: 'clamp(14px, 1.1vw, 16px)', lineHeight: 1.7, maxWidth: 440, marginBottom: 32 }}>
                  {room.description}
                </p>

                <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 48px)', marginBottom: 36 }}>
                  <Spec label="Цена" value={`${room.price}`} sup="PRB" sub={`/ ${room.unit}`} />
                  <Spec label="Гостей" value={`${room.guests}`} sub="человек" />
                  {room.rooms && <Spec label="Комнаты" value={`${room.rooms}`} sub="комнат" />}
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
                  {room.amenities.slice(0, 5).map((a) => (
                    <span key={a} style={{
                      fontSize: 11, letterSpacing: '0.06em',
                      padding: '7px 14px',
                      border: '1px solid var(--line-strong)',
                      borderRadius: 999, color: 'var(--text-soft)',
                    }}>
                      {a}
                    </span>
                  ))}
                  {room.amenities.length > 5 && (
                    <span style={{
                      fontSize: 11, letterSpacing: '0.06em',
                      padding: '7px 14px',
                      border: '1px solid var(--line)',
                      borderRadius: 999, color: 'var(--muted)',
                    }}>
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

            {/* Right: thumbnail strip + nav */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-end' }}>

              {/* Thumbnail vertical strip */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      border: `1px solid ${i === current ? 'var(--gold)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 2,
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'border-color 0.4s ease',
                      flexShrink: 0,
                    }}
                  >
                    <Image src={r.cover} alt={r.name} fill sizes="90px" quality={50} className="object-cover" />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `rgba(13,10,8,${i === current ? 0.1 : 0.55})`,
                      transition: 'background 0.4s ease',
                    }} />
                    {i === current && (
                      <motion.div
                        layoutId="thumb-indicator"
                        style={{
                          position: 'absolute', inset: 0,
                          border: '1.5px solid var(--gold)',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Prev / Next arrows */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ d: -1, label: '←' }, { d: 1, label: '→' }].map(({ d, label }) => (
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
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--gold)';
                      e.currentTarget.style.color = 'var(--bg)';
                      e.currentTarget.style.borderColor = 'var(--gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.borderColor = 'var(--line-strong)';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom gallery strip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={room.id + '-gallery'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.8, delay: 0.3 } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.35 } }}
            style={{
              position: 'absolute',
              bottom: 'clamp(60px, 10vh, 110px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 6,
              zIndex: 5,
            }}
          >
            {room.gallery.map((src, i) => (
              <div key={i} style={{
                position: 'relative',
                width: 'clamp(80px, 9vw, 130px)',
                height: 'clamp(50px, 5.5vw, 76px)',
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid var(--line)',
              }}>
                <Image src={src} alt="" fill sizes="130px" quality={55} className="object-cover" />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}

function Spec({ label, value, sup, sub }) {
  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
        {label}
      </p>
      <p className="font-display" style={{ fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)', lineHeight: 1, color: 'var(--gold)', marginBottom: 5 }}>
        {value}
        {sup && <span style={{ fontSize: '0.5em', letterSpacing: '0.12em', marginLeft: 4, color: 'var(--gold-deep)' }}>{sup}</span>}
      </p>
      <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>{sub}</p>
    </div>
  );
}
