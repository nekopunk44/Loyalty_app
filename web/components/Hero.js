'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';

const stats = [
  { value: '4', label: 'Формата' },
  { value: '30+', label: 'Гостей max' },
  { value: '2022', label: 'Год открытия' },
];

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} id="villa" style={{ position: 'relative', height: '100svh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Background photo */}
      <motion.div style={{ position: 'absolute', inset: 0, y: imgY }}>
        <Image
          src="/images/property3.png"
          alt="Villa Jaconda"
          fill priority
          sizes="100vw"
          quality={80}
          className="object-cover"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(13,10,8,0.55) 0%, rgba(13,10,8,0.2) 40%, rgba(13,10,8,0.75) 85%, rgba(13,10,8,1) 100%)' }} />
      </motion.div>

      <motion.div style={{ opacity, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* Top location badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            position: 'absolute', top: 'clamp(100px, 14vh, 160px)', left: 0, right: 0,
            display: 'flex', justifyContent: 'center',
          }}
        >
          <span style={{
            fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
            Приднестровье · Est. 2022
            <span style={{ width: 32, height: 1, background: 'var(--gold)' }} />
          </span>
        </motion.div>

        {/* Main headline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ overflow: 'hidden', marginBottom: 8 }}>
            <motion.h1
              className="font-display"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{
                fontSize: 'clamp(5rem, 14vw, 13rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Villa
            </motion.h1>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <motion.h1
              className="font-display"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
              style={{
                fontSize: 'clamp(5rem, 14vw, 13rem)',
                lineHeight: 0.9,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--gold)',
                fontStyle: 'italic',
              }}
            >
              Jaconda
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.0 }}
            style={{
              marginTop: 36,
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              color: 'var(--text-soft)',
              letterSpacing: '0.04em',
              maxWidth: 420,
              lineHeight: 1.65,
            }}
          >
            Приватная вилла в Бендерах — четыре формата на любой случай, от камерного отдыха до полного выкупа территории.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.25 }}
            style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="#contact" className="btn btn-primary" data-cursor>
              Забронировать
              <span className="btn-arrow">→</span>
            </a>
            <a href="#rooms" className="btn btn-ghost" data-cursor>
              Посмотреть номера
            </a>
          </motion.div>
        </div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.5 }}
          style={{
            padding: '0 clamp(24px, 5vw, 80px) clamp(32px, 5vh, 60px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 'clamp(28px, 5vw, 64px)' }}>
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.8rem)', lineHeight: 1, color: 'var(--gold)', marginBottom: 6 }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
            <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Scroll</span>
            <motion.div
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}
              style={{ width: 1, height: 44, background: 'currentColor', transformOrigin: 'top' }}
            />
          </div>
        </motion.div>

      </motion.div>
    </section>
  );
}
