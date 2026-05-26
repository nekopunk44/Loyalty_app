'use client';
import { useEffect, useState } from 'react';
import VJMonogram from './VJMonogram';

const LINKS = [
  { id:'rooms',   label:'Номера' },
  { id:'tour',    label:'3D-тур' },
  { id:'loyalty', label:'Лояльность' },
  { id:'faq',     label:'FAQ' },
  { id:'contact', label:'Контакты' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observers = [];
    const visible = new Map();
    LINKS.forEach(l => {
      const el = document.getElementById(l.id);
      if (!el) return;
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) visible.set(l.id, entry.intersectionRatio);
        else visible.delete(l.id);
        let topId = null, topRatio = 0;
        visible.forEach((r, id) => { if (r > topRatio) { topRatio = r; topId = id; } });
        setActive(topId);
      }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = id => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
    setOpen(false);
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
      background: scrolled ? 'rgba(247,242,232,0.92)' : 'transparent',
      borderBottom: `1px solid ${scrolled ? 'rgba(160,120,60,0.15)' : 'rgba(212,164,94,0.12)'}`,
      transition: 'all 0.5s ease',
    }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', height: scrolled ? 64 : 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'height 0.4s ease' }}>

        {/* Логотип: светлый на Hero, тёмный после скролла */}
        <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: scrolled ? 'var(--r-text)' : '#f5ede0', transition: 'color 0.5s ease' }}>
          <VJMonogram size={36}
            mainColor={scrolled ? '#1c1208' : '#f5ede0'}
            accentColor="#d4a45e"
            animate delay={400} fast />
          <span style={{ fontFamily: 'var(--r-serif)', fontSize: 20, fontWeight: 300, letterSpacing: '0.04em' }}>
            VILLA <span style={{ color: '#d4a45e' }}>JACONDA</span>
          </span>
        </a>

        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
          {LINKS.map(l => {
            const linkColor = scrolled
              ? (active === l.id ? 'var(--r-gold)' : 'var(--r-text-soft)')
              : (active === l.id ? '#d4a45e' : 'rgba(245,237,224,0.72)');
            return (
              <a key={l.id} href={`#${l.id}`}
                onClick={e => { e.preventDefault(); scrollTo(l.id); }}
                style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: linkColor, fontWeight: active === l.id ? 500 : 400, transition: 'color 0.4s ease', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#d4a45e'; }}
                onMouseLeave={e => { e.currentTarget.style.color = linkColor; }}>
                {l.label}
              </a>
            );
          })}
          <a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px',
              background: scrolled ? 'var(--r-text)' : 'transparent',
              color: scrolled ? 'var(--r-bg)' : '#f5ede0',
              border: scrolled ? 'none' : '1px solid rgba(245,237,224,0.30)',
              borderRadius: 999, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500,
              transition: 'all 0.4s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#d4a45e'; e.currentTarget.style.color = '#080604'; e.currentTarget.style.borderColor = 'transparent'; }}
            onMouseLeave={e => { e.currentTarget.style.background = scrolled ? 'var(--r-text)' : 'transparent'; e.currentTarget.style.color = scrolled ? 'var(--r-bg)' : '#f5ede0'; e.currentTarget.style.borderColor = scrolled ? 'transparent' : 'rgba(245,237,224,0.30)'; }}>
            Забронировать →
          </a>
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}>
          <div style={{ width: 28, height: 1, background: scrolled ? 'var(--r-text)' : '#f5ede0', marginBottom: 8, transition: 'transform 0.3s, background 0.5s', transform: open ? 'translateY(4.5px) rotate(45deg)' : 'none' }} />
          <div style={{ width: 28, height: 1, background: scrolled ? 'var(--r-text)' : '#f5ede0', transition: 'transform 0.3s, background 0.5s', transform: open ? 'translateY(-4.5px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      <div style={{ height: 2, background: 'var(--r-gold)', width: `${progress}%`, transition: 'width 0.1s linear', opacity: 0.7 }} />

      {open && (
        <div style={{ background: 'rgba(247,242,232,0.98)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--r-line)', padding: '24px clamp(20px,4vw,60px) 32px' }}>
          {LINKS.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={e => { e.preventDefault(); scrollTo(l.id); }}
              style={{ display: 'block', fontFamily: 'var(--r-serif)', fontSize: 28, fontWeight: 300, color: active === l.id ? 'var(--r-gold)' : 'var(--r-text)', marginBottom: 20, textDecoration: 'none' }}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
