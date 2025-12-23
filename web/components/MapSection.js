'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

// Villa Jaconda — Набережная 85, Слободзея (verified via Nominatim)
const LAT = 46.7380868;
const LNG = 29.6914225;

export default function MapSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });

  // Search by exact business name — Google resolves the correct pin automatically
  const gmapsEmbed = `https://maps.google.com/maps?q=Аренда+Виллы+Джаконда+Relax,+Набережная+85,+Слободзея&z=17&hl=ru&output=embed`;

  return (
    <section id="map" ref={ref} style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>

      <div className="container-x" style={{ paddingTop: 64, paddingBottom: 0 }}>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }} className="eyebrow mb-4">
          — Расположение
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.1 }} className="font-display" style={{ fontSize: 'clamp(2rem, 4vw, 3.8rem)', marginBottom: 12 }}>
          г. Слободзея, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Приднестровье</em>
        </motion.h2>
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.2 }} style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 32 }}>
          <p style={{ color: 'var(--text-soft)', fontSize: 14 }}>ул. Набережная 85, Слободзея</p>
          <a
            href="https://maps.app.goo.gl/KNWx6gpAskeJRAxE9"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', borderBottom: '1px solid rgba(212,164,94,0.4)', paddingBottom: 2, transition: 'color 0.3s ease' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--gold-light)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--gold)'}
          >
            Открыть в Google Maps ↗
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.1, delay: 0.25 }}
        style={{ position: 'relative', height: 'clamp(360px, 50vh, 540px)', overflow: 'hidden' }}
      >
        <iframe
          title="Villa Jaconda — карта"
          src={gmapsEmbed}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, pointerEvents: 'none',
          background: 'linear-gradient(0deg, var(--bg) 0%, transparent 100%)',
        }} />
      </motion.div>

    </section>
  );
}
