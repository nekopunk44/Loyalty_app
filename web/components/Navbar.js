'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const links = [
  { href: '#villa', label: 'Вилла' },
  { href: '#rooms', label: 'Номера' },
  { href: '#tour', label: '3D-тур' },
  { href: '#reviews', label: 'Отзывы' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: scrolled ? 'blur(18px) saturate(1.1)' : 'blur(0px)',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(1.1)' : 'blur(0px)',
        background: scrolled ? 'rgba(13, 10, 8, 0.7)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        transition: 'background 0.5s ease, border-color 0.5s ease, backdrop-filter 0.5s ease',
      }}
    >
      <div className="container-x flex items-center justify-between" style={{ height: scrolled ? 68 : 92, transition: 'height 0.5s ease' }}>

        <a href="#top" className="font-display" style={{ fontSize: 22, letterSpacing: '0.04em' }}>
          VILLA <span style={{ color: 'var(--gold)' }}>JACONDA</span>
        </a>

        <nav className="hidden md:flex items-center" style={{ gap: 40 }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[12px] uppercase tracking-[0.18em] relative group"
              style={{ color: 'var(--text-soft)', transition: 'color 0.3s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-soft)')}
            >
              {l.label}
              <span
                className="absolute -bottom-1 left-0 h-px bg-current transition-all duration-500 ease-out"
                style={{ width: 0 }}
                onMouseEnter={undefined}
              />
            </a>
          ))}
        </nav>

        <a href="#contact" className="btn btn-ghost hidden md:inline-flex" style={{ padding: '12px 22px', fontSize: 12 }}>
          Забронировать
          <span className="btn-arrow">→</span>
        </a>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2"
          aria-label="Menu"
          style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
        >
          <div style={{ width: 28, height: 1, background: 'currentColor', marginBottom: 8 }} />
          <div style={{ width: 28, height: 1, background: 'currentColor' }} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden"
            style={{ background: 'rgba(13, 10, 8, 0.96)', borderTop: '1px solid var(--line)' }}
          >
            <div className="container-x py-8 flex flex-col gap-6">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-display"
                  style={{ fontSize: 28, color: 'var(--text)' }}
                >
                  {l.label}
                </a>
              ))}
              <a href="#contact" onClick={() => setOpen(false)} className="btn btn-primary mt-4 self-start">
                Забронировать
                <span className="btn-arrow">→</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
