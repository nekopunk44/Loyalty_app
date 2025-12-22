'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';

const slides = ['/images/property1.png', '/images/property2.png', '/images/property3.png', '/images/property4.png'];

function SplitText({ text, delay = 0 }) {
  return (
    <span style={{ display: 'inline-block' }}>
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{
            duration: 1.2,
            delay: delay + i * 0.04,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.2]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} id="villa" className="relative h-screen w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <motion.div
        className="absolute inset-0"
        style={{ y: imageY, scale: imageScale }}
      >
        <Image
          src={slides[0]}
          alt="Villa Jaconda"
          fill
          priority
          sizes="100vw"
          quality={70}
          className="object-cover"
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(13,10,8,0.7) 0%, rgba(13,10,8,0.4) 35%, rgba(13,10,8,0.5) 65%, rgba(13,10,8,0.95) 100%)',
        }} />
      </motion.div>

      <motion.div
        className="relative h-full container-x flex flex-col justify-end pb-24 md:pb-32"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="eyebrow mb-8"
        >
          <span className="dot" /> &nbsp; Est. 2022 &nbsp; · &nbsp; Приднестровье
        </motion.p>

        <h1 className="font-display display-xl overflow-hidden">
          <span style={{ display: 'block', overflow: 'hidden' }}>
            <SplitText text="Villa" delay={0.3} />
          </span>
          <span style={{ display: 'block', overflow: 'hidden', color: 'var(--gold)' }}>
            <SplitText text="Jaconda" delay={0.6} />
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
        >
          <p className="font-display max-w-md" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)', lineHeight: 1.4, color: 'var(--text-soft)', fontStyle: 'italic' }}>
            Восемь номеров. Один дом. Дюжина историй, которые случаются здесь каждый сезон.
          </p>

          <div className="flex items-center gap-4">
            <a href="#contact" className="btn btn-primary">
              Забронировать
              <span className="btn-arrow">→</span>
            </a>
            <a href="#rooms" className="btn btn-ghost">
              Номера
            </a>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        style={{ color: 'var(--muted)' }}
      >
        <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Scroll</span>
        <motion.div
          animate={{ scaleY: [1, 0.4, 1], originY: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 1, height: 50, background: 'currentColor', transformOrigin: 'bottom' }}
        />
      </motion.div>
    </section>
  );
}
