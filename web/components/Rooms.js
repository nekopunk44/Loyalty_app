'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'motion/react';

const rooms = [
  { src: '/images/luks1.png', name: 'Сюит',        size: '85 м²',  desc: 'Панорамные окна, отдельная гостиная, авторский декор.' },
  { src: '/images/luks2.png', name: 'Делюкс',      size: '70 м²',  desc: 'Дизайнерская мебель, Smart TV, кофе-станция, мини-бар.' },
  { src: '/images/luks3.png', name: 'King',        size: '65 м²',  desc: 'Кровать king-size, климат-контроль, тишина за blackout-шторами.' },
  { src: '/images/luks4.png', name: 'Флагман',     size: '90 м²',  desc: 'Лучший вид виллы. Champagne welcome и персональный батлер.' },
  { src: '/images/luks5.png', name: 'Spa-номер',   size: '25 м²',  desc: 'Мрамор, дождевой душ, free-standing ванна с видом на сад.' },
  { src: '/images/luks6.png', name: 'Терраса',     size: '40 м²',  desc: 'Приватная терраса с лежаками и видом на бассейн.' },
  { src: '/images/luks7.png', name: 'Panoramic',   size: '75 м²',  desc: 'Стеклянные стены, балкон на всю ширину, обзор 180°.' },
  { src: '/images/luks8.png', name: 'Апартаменты', size: '120 м²', desc: 'Два уровня. Кухня, гостиная, спальня, личный бассейн.' },
];

function RoomCard({ room, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      ref={ref}
      initial={{ y: 60, opacity: 0 }}
      animate={inView ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 1.1, delay: (index % 2) * 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-cursor
      style={{ position: 'relative' }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: index % 3 === 0 ? '4 / 5' : '3 / 4',
          overflow: 'hidden',
          background: 'var(--surface)',
        }}
      >
        <motion.div
          animate={{ scale: hover ? 1.06 : 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={room.src}
            alt={room.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            style={{ filter: 'brightness(0.85)' }}
          />
        </motion.div>

        <motion.div
          animate={{ opacity: hover ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 50%, rgba(13,10,8,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text)',
            mixBlendMode: 'difference',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</span>
          <span style={{ width: 24, height: 1, background: 'currentColor' }} />
          <span>{room.size}</span>
        </div>
      </div>

      <div style={{ paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <h3 className="font-display" style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', lineHeight: 1.1, marginBottom: 8 }}>
            {room.name}
          </h3>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.6, maxWidth: 380 }}>
            {room.desc}
          </p>
        </div>
        <a
          href="#contact"
          style={{
            flexShrink: 0,
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            paddingBottom: 6,
            borderBottom: '1px solid var(--line-strong)',
            transition: 'color 0.3s ease, border-color 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold-light)'; e.currentTarget.style.borderColor = 'var(--gold-light)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
        >
          Бронь →
        </a>
      </div>
    </motion.article>
  );
}

export default function Rooms() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const titleY = useTransform(scrollYProgress, [0, 1], ['20%', '-20%']);

  return (
    <section id="rooms" className="section" ref={ref}>
      <div className="container-x">

        <motion.div style={{ y: titleY }} className="mb-20 md:mb-28 flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <div>
            <p className="eyebrow mb-6">— Номера</p>
            <h2 className="font-display display-lg" style={{ maxWidth: '14ch' }}>
              Каждый — со <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>своим</em> характером
            </h2>
          </div>
          <p style={{ maxWidth: 380, color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.7 }}>
            Восемь решений — от Spa-номера до двухуровневых апартаментов. Никаких типовых конфигураций: каждый интерьер собран отдельно.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            gap: 'clamp(40px, 5vw, 80px)',
          }}
        >
          {rooms.map((room, i) => (
            <div key={room.src} style={{ marginTop: i % 2 === 1 ? 60 : 0 }}>
              <RoomCard room={room} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
