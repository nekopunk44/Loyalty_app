'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'motion/react';

export default function LoyaltyCta() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <section id="contact" className="relative overflow-hidden" ref={ref} style={{ minHeight: '100vh' }}>

      <motion.div style={{ position: 'absolute', inset: 0, y: bgY, scale: 1.1 }}>
        <Image
          src="/images/property4.png"
          alt="Villa Jaconda"
          fill
          sizes="100vw"
          quality={70}
          className="object-cover"
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,10,8,0.6)' }} />
      </motion.div>

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(13,10,8,0.4) 0%, rgba(13,10,8,0.85) 100%)',
      }} />

      <div className="relative container-x" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr', alignItems: 'center', padding: '140px 0' }}>
        <div style={{ display: 'grid', gap: 80, gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' }}>

          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1 }}
              className="eyebrow mb-8"
            >
              — Программа лояльности
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, delay: 0.1 }}
              className="font-display display-lg mb-10"
              style={{ maxWidth: '12ch' }}
            >
              Чем чаще <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>возвращаетесь</em>, тем больше получаете
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.25 }}
              style={{ color: 'var(--text-soft)', fontSize: 16, lineHeight: 1.75, maxWidth: 460, marginBottom: 40 }}
            >
              Мобильное приложение для постоянных гостей: бронирования, история проживания, баллы за каждое пребывание, ранний доступ к закрытым событиям. Четыре уровня — от Bronze до Platinum.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.4 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}
            >
              <a href="#" className="btn btn-primary">
                Скачать приложение
                <span className="btn-arrow">→</span>
              </a>
              <a href="mailto:hello@villajaconda.com" className="btn btn-ghost">
                Связаться
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.3 }}
            style={{
              padding: 'clamp(32px, 4vw, 56px)',
              background: 'rgba(13, 10, 8, 0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--line)',
              borderRadius: 4,
            }}
          >
            <p className="eyebrow mb-8" style={{ color: 'var(--text-soft)' }}>— Бронирование</p>

            <div style={{ display: 'grid', gap: 28 }}>
              {[
                { label: 'Телефон',  value: '+373 778 12 345', href: 'tel:+37377812345' },
                { label: 'Email',    value: 'hello@villajaconda.com', href: 'mailto:hello@villajaconda.com' },
                { label: 'Адрес',    value: 'г. Бендеры, Приднестровье', href: null },
                { label: 'Reception', value: 'круглосуточно', href: null },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 20, borderBottom: i < 3 ? '1px solid var(--line)' : 'none', gap: 16 }}>
                  <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {row.label}
                  </span>
                  {row.href ? (
                    <a href={row.href} className="font-display" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)', color: 'var(--text)', transition: 'color 0.3s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span className="font-display" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)', color: 'var(--text)' }}>
                      {row.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
