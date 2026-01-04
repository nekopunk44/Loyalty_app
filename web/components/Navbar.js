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

          {/* Eyebrow «Приложение» + ссылки на скачивание */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginTop: 26, marginBottom: 14,
            opacity: 0,
            animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${LINKS.length * 60 + 180}ms forwards`,
          }}>
            <span style={{ width: 28, height: 1, background: 'var(--r-gold)', opacity: 0.6 }} />
            <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-muted)' }}>Приложение</span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            opacity: 0,
            animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${LINKS.length * 60 + 220}ms forwards`,
          }}>
            <a href="#" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'rgba(28,18,8,0.04)', border: '1px solid var(--r-line-strong)',
              borderRadius: 12, textDecoration: 'none',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--r-text)">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 8, color: 'var(--r-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1 }}>Скачать в</div>
                <div style={{ fontFamily: 'var(--r-serif)', fontSize: 15, color: 'var(--r-text)', lineHeight: 1.3 }}>App Store</div>
              </div>
            </a>
            <a href="#" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: 'rgba(28,18,8,0.04)', border: '1px solid var(--r-line-strong)',
              borderRadius: 12, textDecoration: 'none',
            }}>
              <svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 1 L11 11 L2 11 Z" fill="#34A853"/>
                <path d="M2 1 L20 11 L11 11 Z" fill="#FBBC04"/>
                <path d="M2 11 L11 11 L2 21 Z" fill="#4285F4"/>
                <path d="M11 11 L20 11 L2 21 Z" fill="#EA4335"/>
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 8, color: 'var(--r-muted)', letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1 }}>Доступно в</div>
                <div style={{ fontFamily: 'var(--r-serif)', fontSize: 15, color: 'var(--r-text)', lineHeight: 1.3 }}>Google Play</div>
              </div>
            </a>
          </div>

          {/* Contacts */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
            marginTop: 22,
            opacity: 0,
            animation: `fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) ${LINKS.length * 60 + 280}ms forwards`,
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
