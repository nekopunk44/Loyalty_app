'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'motion/react';

const TOUR_URL = ''; // вставьте сюда ссылку на Matterport / Cupix / Pannellum после съёмки

export default function Tour() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const bgY = useTransform(scrollYProgress, [0, 1], ['-5%', '15%']);
  const titleInView = useInView(ref, { once: true, margin: '-25%' });

  return (
    <section id="tour" className="relative overflow-hidden" ref={ref} style={{ minHeight: '100vh' }}>
      <motion.div
        style={{ position: 'absolute', inset: 0, scale: bgScale, y: bgY }}
      >
        <Image
          src="/images/property2.png"
          alt="Villa Jaconda — interior"
          fill
          sizes="100vw"
          quality={70}
          className="object-cover"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,8,0.55)' }} />
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 0%, rgba(13,10,8,0.6) 100%)' }} />

      <div className="relative container-x" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '160px 0' }}>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow mb-8"
        >
          — Виртуальный тур
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="font-display display-lg"
          style={{ maxWidth: '16ch', marginBottom: 28 }}
        >
          Пройдитесь по дому <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>раньше</em>, чем приедете
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 540, color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.7, marginBottom: 56 }}
        >
          360°-обход всех номеров и общих зон. Откройте каждую комнату, переходите между этажами и выбирайте номер не по фотографии — а по ощущению.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={titleInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {TOUR_URL ? (
            <a href={TOUR_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '22px 44px', fontSize: 13 }}>
              Открыть 3D-тур
              <span className="btn-arrow">→</span>
            </a>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <a href="#contact" className="btn btn-primary" style={{ padding: '22px 44px', fontSize: 13 }}>
                Запросить доступ к туру
                <span className="btn-arrow">→</span>
              </a>
              <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Скоро · в подготовке
              </span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={titleInView ? { opacity: 1 } : {}}
          transition={{ duration: 1.5, delay: 0.9 }}
          style={{ position: 'absolute', left: '50%', bottom: 60, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 20, color: 'var(--muted)' }}
        >
          <span style={{ width: 60, height: 1, background: 'currentColor' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>360° · 8 rooms · 2 floors</span>
          <span style={{ width: 60, height: 1, background: 'currentColor' }} />
        </motion.div>
      </div>
    </section>
  );
}
