'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';

const links = [
  { href: '#rooms',   id: 'rooms',   label: 'Номера' },
  { href: '#tour',    id: 'tour',    label: '3D-тур' },
  { href: '#loyalty', id: 'loyalty', label: 'Лояльность' },
  { href: '#reviews', id: 'reviews', label: 'Отзывы' },
  { href: '#contact', id: 'contact', label: 'Контакты' },
  { href: '#map',     id: 'map',     label: 'Карта' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef(null);
  const linkRefs = useRef({});

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observers = [];
    const visible = new Map();

    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (!el) return;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) visible.set(l.id, entry.intersectionRatio);
          else visible.delete(l.id);

          let topId = null;
          let topRatio = 0;
          visible.forEach((ratio, id) => {
            if (ratio > topRatio) { topRatio = ratio; topId = id; }
          });
          setActive(topId);
        },
        { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      io.observe(el);
      observers.push(io);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    if (!active || !navRef.current || !linkRefs.current[active]) {
      setIndicator((i) => ({ ...i, opacity: 0 }));
      return;
    }
    const link = linkRefs.current[active];
    const nav = navRef.current;
    const linkRect = link.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      opacity: 1,
    });
  }, [active, scrolled]);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: scrolled ? 'blur(18px) saturate(1.1)' : 'blur(0px)',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(1.1)' : 'blur(0px)',
        background: scrolled ? 'rgba(13, 10, 8, 0.78)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
        transition: 'background 0.5s ease, border-color 0.5s ease, backdrop-filter 0.5s ease',
      }}
    >
      <div className="container-x flex items-center justify-between" style={{ height: scrolled ? 68 : 92, transition: 'height 0.5s ease' }}>

        <a href="#top" className="font-display" style={{ fontSize: 22, letterSpacing: '0.04em' }} data-cursor>
          VILLA <span style={{ color: 'var(--gold)' }}>JACONDA</span>
        </a>

        <nav ref={navRef} className="hidden md:flex items-center relative" style={{ gap: 36 }}>
          <motion.span
            animate={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            style={{
              position: 'absolute',
              bottom: -14,
              height: 1,
              background: 'var(--gold)',
              pointerEvents: 'none',
            }}
          />
          {links.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.href}
                href={l.href}
                ref={(el) => { linkRefs.current[l.id] = el; }}
                data-cursor
                style={{
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--gold)' : 'var(--text-soft)',
                  transition: 'color 0.4s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--gold-light)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-soft)'; }}
              >
                {l.label}
              </a>
            );
          })}
        </nav>

        <a href="#contact" className="btn btn-ghost hidden md:inline-flex" style={{ padding: '12px 22px', fontSize: 12 }} data-cursor>
          Забронировать
          <span className="btn-arrow">→</span>
        </a>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2"
          aria-label="Menu"
          style={{ background: 'transparent', border: 'none', color: 'var(--text)' }}
        >
          <div style={{ width: 28, height: 1, background: 'currentColor', marginBottom: 8, transition: 'transform 0.3s', transform: open ? 'translateY(4.5px) rotate(45deg)' : 'none' }} />
          <div style={{ width: 28, height: 1, background: 'currentColor', transition: 'transform 0.3s', transform: open ? 'translateY(-4.5px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      <motion.div
        style={{
          scaleX,
          transformOrigin: '0%',
          height: 1,
          background: 'var(--gold)',
          width: '100%',
        }}
      />

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
                  style={{ fontSize: 28, color: active === l.id ? 'var(--gold)' : 'var(--text)' }}
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
