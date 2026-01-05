'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import VJMonogram from './VJMonogram';
import Footer from './Footer';

export default function LegalLayout({
  eyebrow,
  title,
  titleEm,
  updatedAt,
  sections,
  relatedLink,
  decorChar = '§',
}) {
  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 40);
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observers = [];
    const ratios = new Map();
    sections.forEach((_, i) => {
      const el = document.getElementById(`section-${i}`);
      if (!el) return;
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) ratios.set(i, entry.intersectionRatio);
        else ratios.delete(i);
        let topI = 0, topR = -1;
        ratios.forEach((r, idx) => { if (r > topR) { topR = r; topI = idx; } });
        setActive(topI);
      }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
      io.observe(el);
      observers.push(io);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [sections]);

  const scrollTo = (i) => {
    const el = document.getElementById(`section-${i}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        @keyframes legalFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes legalRise {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .legal-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          transition: all 0.4s ease;
          animation: legalFadeIn 0.5s ease both;
        }
        .legal-hero    { animation: legalRise 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.05s; }
        .legal-toc     { animation: legalRise 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.15s; }
        .legal-content { animation: legalRise 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.20s; }

        .legal-grid {
          display: grid;
          grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
          gap: clamp(36px, 5vw, 80px);
          align-items: start;
        }
        .legal-toc-inner { position: sticky; top: 110px; }

        .legal-toc-item {
          display: grid; grid-template-columns: 28px 1fr;
          gap: 12px; align-items: baseline;
          padding: 10px 0;
          border: none; background: transparent;
          cursor: pointer; text-align: left;
          font-family: inherit;
          width: 100%;
          color: rgba(28,18,8,0.5);
          transition: color 0.3s ease, padding-left 0.3s ease;
          border-bottom: 1px solid rgba(160,120,60,0.10);
        }
        .legal-toc-item:hover { color: var(--r-gold); padding-left: 4px; }
        .legal-toc-item.is-active { color: var(--r-text); padding-left: 4px; }
        .legal-toc-item.is-active .legal-toc-num { color: var(--r-gold); }
        .legal-toc-num {
          font-family: var(--r-sans);
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.18em;
          color: rgba(28,18,8,0.3);
          transition: color 0.3s ease;
        }
        .legal-toc-label {
          font-family: var(--r-serif);
          font-size: 14px; line-height: 1.3; font-weight: 400;
          letter-spacing: -0.005em;
        }

        .legal-section { scroll-margin-top: 100px; }
        .legal-section + .legal-section { margin-top: 56px; }

        .legal-section-head {
          display: grid; grid-template-columns: 42px 1fr;
          gap: 16px; align-items: baseline;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--r-line);
        }
        .legal-section-num {
          font-family: var(--r-serif); font-style: italic;
          font-size: 22px; font-weight: 300;
          color: var(--r-gold); line-height: 1;
          letter-spacing: -0.01em;
        }
        .legal-section h2 {
          font-family: var(--r-serif);
          font-size: clamp(1.35rem, 2.4vw, 1.65rem);
          font-weight: 400; letter-spacing: -0.01em;
          margin: 0; color: var(--r-text); line-height: 1.2;
        }
        .legal-section-body { padding-left: 58px; }
        .legal-section-body p {
          font-size: 15px; line-height: 1.78;
          color: var(--r-text-soft);
          margin: 0 0 14px;
        }
        .legal-section-body p:last-child { margin-bottom: 0; }

        .legal-decor-glyph {
          position: absolute; right: -2vw; top: 18vh;
          font-family: var(--r-serif); font-style: italic; font-weight: 300;
          font-size: clamp(18rem, 36vw, 32rem);
          line-height: 0.8; letter-spacing: -0.06em;
          color: rgba(212,164,94,0.045);
          user-select: none; pointer-events: none;
          z-index: 0;
        }
        .legal-decor-glow {
          position: absolute; top: -10%; left: -8%;
          width: 520px; height: 520px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,164,94,0.10) 0%, transparent 65%);
          pointer-events: none; z-index: 0;
        }

        @media (max-width: 980px) {
          .legal-grid { grid-template-columns: 1fr; gap: 32px; }
          .legal-toc { display: none; }
          .legal-section-body { padding-left: 0; }
          .legal-section-head { grid-template-columns: 32px 1fr; gap: 12px; }
        }

        @media (max-width: 600px) {
          .legal-section + .legal-section { margin-top: 44px; }
          .legal-section h2 { font-size: 1.15rem; }
          .legal-section-num { font-size: 18px; }
          .legal-decor-glyph { font-size: clamp(14rem, 60vw, 22rem); top: 22vh; right: -8vw; }
        }
      `}</style>

      {/* ───── Slim sticky header ───── */}
      <header className="legal-header" style={{
        background: scrolled ? 'rgba(247,242,232,0.92)' : 'rgba(247,242,232,0.0)',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(160,120,60,0.15)' : '1px solid transparent',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 clamp(20px,5vw,48px)',
          height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none',
            color: 'var(--r-text)',
          }}>
            <VJMonogram size={30} mainColor="#1c1208" accentColor="#d4a45e" animate={false} />
            <span style={{
              fontFamily: 'var(--r-serif)', fontSize: 17, fontWeight: 300, letterSpacing: '0.04em',
            }}>
              VILLA <span style={{ color: '#d4a45e' }}>JACONDA</span>
            </span>
          </Link>

          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'var(--r-muted)', textDecoration: 'none',
            transition: 'color 0.25s ease',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--r-muted)'}>
            ← На главную
          </Link>
        </div>
        <div style={{ height: 2, background: 'var(--r-gold)', width: `${progress}%`, transition: 'width 0.1s linear', opacity: 0.7 }} />
      </header>

      {/* ───── Body ───── */}
      <main style={{
        minHeight: '100vh',
        background: 'var(--r-bg)',
        color: 'var(--r-text)',
        position: 'relative', overflow: 'hidden',
        paddingTop: 'clamp(100px, 14vh, 160px)',
        paddingBottom: 'clamp(80px, 10vh, 120px)',
      }}>
        <div className="legal-decor-glow" />
        <div className="legal-decor-glyph" aria-hidden="true">{decorChar}</div>

        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 48px)',
          position: 'relative', zIndex: 1,
        }}>

          {/* Hero */}
          <div className="legal-hero" style={{ marginBottom: 'clamp(40px, 6vh, 72px)', maxWidth: 820 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <span style={{ width: 32, height: 1, background: 'var(--r-gold)', opacity: 0.65 }} />
              <span style={{
                fontSize: 10, letterSpacing: '0.38em', textTransform: 'uppercase',
                color: 'var(--r-muted)', fontWeight: 500,
              }}>{eyebrow}</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--r-serif)',
              fontSize: 'clamp(2.4rem, 5.4vw, 4.2rem)',
              fontWeight: 300, lineHeight: 1.02,
              letterSpacing: '-0.025em',
              margin: '0 0 22px',
              maxWidth: '14ch',
            }}>
              {title}{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--r-gold)' }}>{titleEm}</em>
            </h1>

            <p style={{
              fontSize: 12, color: 'var(--r-muted)',
              letterSpacing: '0.08em', margin: 0,
              fontFamily: 'var(--r-sans)',
            }}>
              Редакция от {updatedAt}
            </p>
          </div>

          {/* Grid: TOC + Sections */}
          <div className="legal-grid">

            <aside className="legal-toc">
              <div className="legal-toc-inner">
                <p style={{
                  fontSize: 9, fontWeight: 500,
                  letterSpacing: '0.38em', textTransform: 'uppercase',
                  color: 'var(--r-muted)', margin: '0 0 14px',
                }}>
                  Содержание
                </p>
                {sections.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => scrollTo(i)}
                    className={`legal-toc-item ${active === i ? 'is-active' : ''}`}>
                    <span className="legal-toc-num">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="legal-toc-label">
                      {s.tocLabel || s.title.replace(/^\d+\.\s*/, '')}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="legal-content">
              {sections.map((s, i) => (
                <section key={s.title} id={`section-${i}`} className="legal-section">
                  <div className="legal-section-head">
                    <span className="legal-section-num">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2>{s.title.replace(/^\d+\.\s*/, '')}</h2>
                  </div>
                  <div className="legal-section-body">
                    {s.body.map((para, pi) => (
                      <p key={pi}>{para}</p>
                    ))}
                  </div>
                </section>
              ))}

              {relatedLink && (
                <div style={{
                  marginTop: 72, paddingTop: 32,
                  borderTop: '1px solid var(--r-line)',
                  fontSize: 13, color: 'var(--r-muted)',
                  letterSpacing: '0.04em',
                }}>
                  См. также:{' '}
                  <Link href={relatedLink.href} style={{
                    color: 'var(--r-gold)', textDecoration: 'none',
                    borderBottom: '1px solid rgba(212,164,94,0.3)',
                    paddingBottom: 1,
                  }}>
                    {relatedLink.label}
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
