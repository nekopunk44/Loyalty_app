'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'motion/react';

const rooms = [
  {
    id: 'standart',
    name: 'Стандарт',
    tag: 'Studio',
    description: 'Студия с террасой и бассейном. Уютный формат для пары или небольшой компании.',
    price: 150,
    unit: 'ночь',
    guests: 10,
    rooms: 2,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Бассейн', 'Сауна', 'Мангал', 'Парковка'],
    photos: ['/images/std1.png', '/images/std2.png', '/images/std3.png', '/images/std4.png', '/images/std5.png'],
  },
  {
    id: 'luks',
    name: 'Люкс апартамент',
    tag: 'Premium',
    description: 'Полный комфорт с видом на природу. Десять комнат, большой зал и собственная кухня.',
    price: 200,
    unit: 'ночь',
    guests: 20,
    rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'TV', 'Кухня', 'Бассейн', 'Сауна', 'Караоке', 'Большой зал'],
    photos: ['/images/luks1.png', '/images/luks2.png', '/images/luks3.png', '/images/luks4.png', '/images/luks5.png'],
  },
  {
    id: 'zad',
    name: 'Задний двор',
    tag: 'Outdoor',
    description: 'Открытая территория с бассейном, беседкой и зоной мангала. Идеально для дневных праздников.',
    price: 100,
    unit: 'день',
    guests: 15,
    rooms: null,
    amenities: ['WiFi', 'Бассейн', 'Мангал', 'Караоке', 'Беседка', 'Шезлонги', 'Зонты', 'Холодильник'],
    photos: ['/images/zad1.png', '/images/zad2.png', '/images/zad3.png', '/images/zad4.png', '/images/zad5.png'],
  },
  {
    id: 'full',
    name: 'Вся территория',
    tag: 'Exclusive',
    description: 'Полный выкуп виллы со всеми удобствами. Закрытый формат для больших мероприятий.',
    price: 500,
    unit: 'ночь',
    guests: 30,
    rooms: 10,
    amenities: ['WiFi', 'Кондиционер', 'Кухня', 'Бассейн', 'Сауна', 'Караоке', 'Большой зал', 'Беседка', 'Шезлонги'],
    photos: ['/images/luks6.png', '/images/luks7.png', '/images/zad4.png', '/images/luks8.png', '/images/zad5.png'],
  },
];

function RoomPanel({ room, index, total }) {
  return (
    <article
      style={{
        flex: '0 0 100vw',
        height: '100vh',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image
          src={room.photos[0]}
          alt={room.name}
          fill
          sizes="100vw"
          quality={70}
          className="object-cover"
          priority={index === 0}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      </div>

      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(13,10,8,0.55) 0%, rgba(13,10,8,0.95) 95%)',
        }}
      />

      <div className="container-x relative" style={{
        height: '100%', display: 'grid', gridTemplateColumns: '1fr', alignItems: 'end',
        paddingBottom: 'clamp(60px, 10vh, 120px)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 'clamp(40px, 6vw, 80px)', alignItems: 'end' }}>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, letterSpacing: '0.25em', color: 'var(--gold)' }}>
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </span>
              <span style={{ width: 40, height: 1, background: 'var(--gold)' }} />
              <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
                {room.tag}
              </span>
            </div>

            <h3 className="font-display" style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4.8rem)',
              lineHeight: 1.02,
              marginBottom: 22,
            }}>
              {room.name}
            </h3>

            <p style={{ color: 'var(--text-soft)', fontSize: 'clamp(14px, 1.2vw, 16px)', lineHeight: 1.7, maxWidth: 460, marginBottom: 32 }}>
              {room.description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px, 4vw, 56px)', marginBottom: 36 }}>
              <Spec label="Цена" value={`${room.price} PRB`} sub={`за ${room.unit}`} />
              <Spec label="Гости" value={`до ${room.guests}`} sub="человек" />
              {room.rooms && <Spec label="Комнаты" value={room.rooms} sub={room.rooms === 1 ? 'комната' : 'комнат'} />}
            </div>

            <a href="#contact" className="btn btn-primary" data-cursor>
              Забронировать
              <span className="btn-arrow">→</span>
            </a>
          </div>

          <div>
            <p className="eyebrow mb-4" style={{ color: 'var(--text-soft)' }}>— Удобства</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {room.amenities.map((a) => (
                <li key={a} style={{
                  fontSize: 12,
                  letterSpacing: '0.05em',
                  padding: '8px 14px',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 999,
                  color: 'var(--text-soft)',
                  background: 'rgba(13, 10, 8, 0.4)',
                  backdropFilter: 'blur(8px)',
                }}>
                  {a}
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
              {room.photos.slice(1, 5).map((p, i) => (
                <div key={i} style={{ position: 'relative', width: 60, height: 60, overflow: 'hidden', borderRadius: 2, border: '1px solid var(--line)' }}>
                  <Image src={p} alt="" fill sizes="60px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </article>
  );
}

function Spec({ label, value, sub }) {
  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
        {label}
      </p>
      <p className="font-display" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 2rem)', lineHeight: 1, marginBottom: 4, color: 'var(--gold)' }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em' }}>
        {sub}
      </p>
    </div>
  );
}

export default function Rooms() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${(rooms.length - 1) * 100}vw`]);
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(rooms.length - 1, Math.max(0, Math.round(v * (rooms.length - 1))));
    if (idx !== active) setActive(idx);
  });

  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-25%' });

  return (
    <section id="rooms" ref={ref} style={{ position: 'relative', height: `${rooms.length * 100}vh`, background: 'var(--bg)' }}>

      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        <div ref={headerRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
          padding: 'clamp(80px, 10vh, 140px) 0 0',
          pointerEvents: 'none',
        }}>
          <div className="container-x" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={headerInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.9 }}
                className="eyebrow mb-4"
              >
                — Каталог · 4 формата
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                animate={headerInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1, delay: 0.1 }}
                className="font-display"
                style={{ fontSize: 'clamp(2rem, 3.6vw, 3.4rem)', lineHeight: 1.05, maxWidth: '14ch' }}
              >
                Каждый — со <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>своим</em> характером
              </motion.h2>
            </div>

            <div style={{ display: 'flex', gap: 18, alignItems: 'center', pointerEvents: 'auto' }}>
              {rooms.map((r, i) => (
                <span
                  key={r.id}
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: i === active ? 'var(--gold)' : 'var(--muted)',
                    transition: 'color 0.4s ease',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>

        <motion.div style={{ display: 'flex', height: '100%', x }}>
          {rooms.map((room, i) => (
            <RoomPanel key={room.id} room={room} index={i} total={rooms.length} progress={scrollYProgress} />
          ))}
        </motion.div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 2,
          background: 'rgba(212, 164, 94, 0.12)',
          zIndex: 5,
        }}>
          <motion.div style={{ height: '100%', width: progressWidth, background: 'var(--gold)' }} />
        </div>

        <div style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 5,
        }}>
          <span style={{ width: 30, height: 1, background: 'currentColor' }} />
          Scroll
          <span style={{ width: 30, height: 1, background: 'currentColor' }} />
        </div>
      </div>
    </section>
  );
}
