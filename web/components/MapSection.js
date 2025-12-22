'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

// Бендеры (Tighina), Приднестровье — центр города
// Координаты: 46.8302° N, 29.4826° E
const LAT = 46.8302;
const LNG = 29.4826;
const ZOOM = 15;

export default function MapSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${LNG - 0.012}%2C${LAT - 0.007}%2C${LNG + 0.012}%2C${LAT + 0.007}&layer=mapnik&marker=${LAT}%2C${LNG}`;

  return (
    <section id="map" ref={ref} style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>

      <div className="container-x" style={{ paddingTop: 64, paddingBottom: 0 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }} className="eyebrow mb-4">
          — Расположение
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.1 }} className="font-display" style={{ fontSize: 'clamp(2rem, 4vw, 3.8rem)', marginBottom: 12 }}>
          г. Бендеры, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Приднестровье</em>
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.2 }} style={{ color: 'var(--text-soft)', fontSize: 14, marginBottom: 32 }}>
          Уточните точный адрес при бронировании — пришлём геометку на WhatsApp.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.1, delay: 0.25 }}
        style={{ position: 'relative', height: 'clamp(360px, 50vh, 540px)', overflow: 'hidden', filter: 'grayscale(0.4) contrast(1.05)' }}
      >
        <iframe
          title="Villa Jaconda — карта"
          src={osmEmbed}
          width="100%"
          height="100%"
          style={{
            border: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            position: 'absolute',
            inset: 0,
            colorScheme: 'dark',
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {/* Dark overlay to match the site palette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'rgba(13,10,8,0.18)',
          mixBlendMode: 'multiply',
        }} />
        {/* Bottom gradient fade into footer */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none',
          background: 'linear-gradient(0deg, var(--bg) 0%, transparent 100%)',
        }} />
      </motion.div>

    </section>
  );
}
