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
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
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
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-booking-modal'))}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px',
              background: scrolled ? 'var(--r-text)' : 'transparent',
              color: scrolled ? 'var(--r-bg)' : '#f5ede0',
              border: scrolled ? 'none' : '1px solid rgba(245,237,224,0.30)',
              borderRadius: 999, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.4s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#d4a45e'; e.currentTarget.style.color = '#080604'; e.currentTarget.style.borderColor = 'transparent'; }}
            onMouseLeave={e => { e.currentTarget.style.background = scrolled ? 'var(--r-text)' : 'transparent'; e.currentTarget.style.color = scrolled ? 'var(--r-bg)' : '#f5ede0'; e.currentTarget.style.borderColor = scrolled ? 'transparent' : 'rgba(245,237,224,0.30)'; }}>
            Забронировать →
          </button>
        </nav>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8 }}>
          <div style={{ width: 28, height: 1, background: scrolled ? 'var(--r-text)' : '#f5ede0', marginBottom: 8, transition: 'transform 0.3s, background 0.5s', transform: open ? 'translateY(4.5px) rotate(45deg)' : 'none' }} />
          <div style={{ width: 28, height: 1, background: scrolled ? 'var(--r-text)' : '#f5ede0', transition: 'transform 0.3s, background 0.5s', transform: open ? 'translateY(-4.5px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      <div style={{ height: 2, background: 'var(--r-gold)', width: `${progress}%`, transition: 'width 0.1s linear', opacity: 0.7 }} />

      {open && (
        <div style={{
          background: 'rgba(247,242,232,0.98)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderTop: '1px solid var(--r-line)',
          padding: '28px clamp(20px,5vw,40px) 32px',
          boxShadow: '0 24px 48px -16px rgba(28,18,8,0.18)',
          animation: 'fadeIn 0.35s ease-out',
        }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ width: 28, height: 1, background: 'var(--r-gold)', opacity: 0.6 }} />
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-muted)' }}>Навигация</span>
          </div>

          {/* Links */}
          {LINKS.map((l, i) => {
            const isActive = active === l.id;
            return (
              <a key={l.id} href={`#${l.id}`} onClick={e => { e.preventDefault(); scrollTo(l.id); }}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 18,
                  padding: '14px 0',
                  borderBottom: i === LINKS.length - 1 ? 'none' : '1px solid var(--r-line)',
                  textDecoration: 'none',
                  opacity: 0,
                  animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60 + 80}ms forwards`,
                }}>
                <span style={{
                  fontFamily: 'var(--r-sans)',
                  fontSize: 10, fontWeight: 500, letterSpacing: '0.18em',
                  color: isActive ? 'var(--r-gold)' : 'var(--r-muted)',
                  minWidth: 22,
                }}>
                  0{i + 1}
                </span>
                <span style={{
                  flex: 1,
                  fontFamily: 'var(--r-serif)', fontSize: 30, fontWeight: 300,
                  lineHeight: 1.1, letterSpacing: '-0.01em',
                  color: isActive ? 'var(--r-gold)' : 'var(--r-text)',
                  transition: 'color 0.3s ease',
                }}>
                  {l.label}
                </span>
                {isActive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--r-gold)', alignSelf: 'center' }} />
                )}
              </a>
            );
          })}

          {/* CTA */}
          <button
            onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent('open-booking-modal')); }}
            style={{
              marginTop: 28, width: '100%',
              padding: '16px 24px',
              background: 'var(--r-text)', color: 'var(--r-bg)',
              border: 'none', borderRadius: 999,
              fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
              fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: 0,
              animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${LINKS.length * 60 + 140}ms forwards`,
            }}>
            Забронировать <span style={{ color: 'var(--r-gold-light)' }}>→</span>
          </button>

          {/* Contacts */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
            marginTop: 22,
            opacity: 0,
            animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${LINKS.length * 60 + 200}ms forwards`,
          }}>
            <a href="tel:+3737791002" style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--r-text-soft)', textDecoration: 'none',
            }}>+373 779 10-02</a>
            <span style={{ width: 1, height: 10, background: 'var(--r-line-strong)' }} />
            <a href="https://www.instagram.com/villa_jaconda_relax" target="_blank" rel="noreferrer" style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--r-text-soft)', textDecoration: 'none',
            }}>Instagram</a>
          </div>
        </div>
      )}
    </header>
  );
}
