'use client';

import { useRef } from 'react';
import { motion } from 'motion/react';

/* Floating ambient orbs — pure CSS, no photo */
const orbs = [
  { size: 700, x: '-15%', y: '-20%', color: 'rgba(180,130,60,0.13)', dur: 18, dx: '8%',  dy: '12%' },
  { size: 550, x: '55%',  y: '40%',  color: 'rgba(140,90,30,0.10)',  dur: 22, dx: '-6%', dy: '-10%' },
  { size: 400, x: '30%',  y: '-30%', color: 'rgba(200,155,80,0.08)', dur: 15, dx: '4%',  dy: '18%' },
];

const stats = [
  { value: '4',    label: 'Формата' },
  { value: '30+',  label: 'Гостей max' },
  { value: '2022', label: 'Год открытия' },
];

export default function Hero() {
  return (
    <section id="villa" style={{ position: 'relative', height: '100svh', overflow: 'hidden', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.45,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
      }} />

      {/* Ambient gradient orbs */}
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          animate={{ x: [o.x, `calc(${o.x} + ${o.dx})`, o.x], y: [o.y, `calc(${o.y} + ${o.dy})`, o.y] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' }}
          style={{
            position: 'absolute',
            width: o.size, height: o.size,
            left: 0, top: 0,
            translate: `${o.x} ${o.y}`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}

      {/* Thin horizontal rule — top decoration */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{ position: 'absolute', top: 'clamp(100px, 13vh, 148px)', left: '5vw', right: '5vw', height: 1, background: 'var(--line)', transformOrigin: 'left', zIndex: 2 }}
      />

      {/* Location stamp */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.7 }}
        style={{
          position: 'absolute', top: 'clamp(90px, 12vh, 134px)', left: '50%', transform: 'translateX(-50%)',
          fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--muted)',
          whiteSpace: 'nowrap', zIndex: 2,
        }}
      >
        Приднестровье · Бендеры · Est. 2022
      </motion.p>

      {/* Main headline — centered, fills the viewport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative', zIndex: 2, padding: '0 clamp(16px, 4vw, 60px)' }}>

        {/* "VILLA" — light weight */}
        <div style={{ overflow: 'hidden', lineHeight: 1 }}>
          <motion.h1
            className="font-display"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            style={{ fontSize: 'clamp(4.5rem, 15vw, 14rem)', lineHeight: 0.88, letterSpacing: '-0.025em', margin: 0, fontWeight: 300 }}
          >
            Villa
          </motion.h1>
        </div>

        {/* "JACONDA" — gold italic, slightly offset */}
        <div style={{ overflow: 'hidden', lineHeight: 1 }}>
          <motion.h1
            className="font-display"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
            style={{
              fontSize: 'clamp(4.5rem, 15vw, 14rem)', lineHeight: 0.88, letterSpacing: '-0.025em', margin: 0,
              color: 'var(--gold)', fontStyle: 'italic', fontWeight: 400,
              textShadow: '0 0 120px rgba(212,164,94,0.25)',
            }}
          >
            Jaconda
          </motion.h1>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          style={{ width: 'clamp(40px, 6vw, 80px)', height: 1, background: 'var(--gold)', margin: 'clamp(20px, 3vh, 36px) 0', opacity: 0.7 }}
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.0 }}
          style={{ fontSize: 'clamp(13px, 1.2vw, 16px)', color: 'var(--text-soft)', letterSpacing: '0.03em', maxWidth: 400, lineHeight: 1.65, marginBottom: 36 }}
        >
          Приватная вилла в Бендерах — четыре формата на любой случай, от камерного отдыха до полного выкупа территории.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <a href="#contact" className="btn btn-primary" data-cursor>
            Забронировать
            <span className="btn-arrow">→</span>
          </a>
          <a href="#rooms" className="btn btn-ghost" data-cursor>
            Номера
          </a>
        </motion.div>
      </div>

      {/* Bottom bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.5 }}
        style={{ position: 'relative', zIndex: 2, padding: '0 clamp(24px, 5vw, 80px) clamp(28px, 5vh, 52px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}
      >
        <div style={{ display: 'flex', gap: 'clamp(28px, 5vw, 64px)' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-display" style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.6rem)', lineHeight: 1, color: 'var(--gold)', marginBottom: 6 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--muted)' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Scroll</span>
          <motion.div
            animate={{ scaleY: [0, 1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}
            style={{ width: 1, height: 40, background: 'currentColor', transformOrigin: 'top' }}
          />
        </div>
      </motion.div>

      {/* Bottom thin rule */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'var(--line)', zIndex: 2 }} />
    </section>
  );
}
