'use client';
import { useState } from 'react';
import { FAQS } from '@/data/faqs';

const GOLD     = '#d4a45e';
const GOLD_DIM = 'rgba(212,164,94,0.55)';
const CREAM    = '#f5ede0';
const BG_DARK  = '#0a0805';
const INSTAGRAM_URL = 'https://www.instagram.com/villa_jaconda_relax?igsh=MXhwY21lc2k1NW44';

const CATS = [
  { id: 'all',     label: 'Все' },
  { id: 'booking', label: 'Бронирование' },
  { id: 'loyalty', label: 'Лояльность' },
  { id: 'stay',    label: 'Проживание' },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);
  const [cat, setCat]   = useState('all');

  const filtered = FAQS.map((f, i) => ({ ...f, _i: i })).filter(f => cat === 'all' || f.cat === cat);

  return (
    <section id="faq" style={{
      background: `linear-gradient(180deg, ${BG_DARK} 0%, #0d0a07 100%)`,
      paddingTop: 'clamp(48px,6vw,80px)',
      paddingBottom: 'clamp(48px,6vw,80px)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes faqFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .faq-grid { display: grid; gap: clamp(32px, 4vw, 56px); grid-template-columns: minmax(0, 280px) minmax(0, 1fr); align-items: start; }
        @media (max-width: 980px) {
          .faq-grid { grid-template-columns: 1fr !important; }
          .faq-sticky { position: relative !important; top: 0 !important; }
        }
      `}</style>

      {/* Декоративные элементы */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: 540, height: 540, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}08 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Огромная цитата в фоне */}
      <div style={{
        position: 'absolute', top: '8%', right: '-2%',
        fontFamily: 'var(--r-serif)', fontStyle: 'italic',
        fontSize: 'clamp(20rem, 32vw, 28rem)', fontWeight: 300,
        lineHeight: 0.85, letterSpacing: '-0.06em',
        color: `${GOLD}06`, userSelect: 'none', pointerEvents: 'none',
        zIndex: 0,
      }}>
        ?
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', position: 'relative', zIndex: 1 }}>

        <div className="faq-grid">

          {/* ═══════════ LEFT: sticky sidebar ═══════════ */}
          <div className="faq-sticky" style={{ position: 'sticky', top: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{ width: 22, height: 1, background: GOLD, opacity: 0.55 }} />
              <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD_DIM }}>
                FAQ · Часто
              </span>
            </div>

            <h2 style={{
              fontFamily: 'var(--r-serif)',
              fontSize: 'clamp(1.8rem, 3.2vw, 3rem)',
              fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.025em',
              color: CREAM, margin: '0 0 14px',
            }}>
              Частые <em style={{ fontStyle: 'italic', color: GOLD }}>вопросы</em>
            </h2>

            <p style={{
              fontSize: 13, color: 'rgba(245,237,224,0.55)',
              lineHeight: 1.7, maxWidth: 280,
              margin: '0 0 20px',
            }}>
              Не нашли свой вопрос — напишите напрямую, ответим за час.
            </p>

            {/* Фильтры по категориям */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20, borderTop: '1px solid rgba(212,164,94,0.15)' }}>
              {CATS.map(c => {
                const isAct = cat === c.id;
                return (
                  <button key={c.id} onClick={() => setCat(c.id)}
                    style={{
                      background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(212,164,94,0.15)',
                      padding: '10px 0', cursor: isAct ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'all 0.3s ease', position: 'relative',
                    }}
                    onMouseEnter={e => { if (!isAct) e.currentTarget.querySelector('.cat-arrow').style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { if (!isAct) e.currentTarget.querySelector('.cat-arrow').style.transform = 'translateX(0)'; }}>
                    <span style={{
                      fontFamily: 'var(--r-serif)',
                      fontStyle: isAct ? 'italic' : 'normal',
                      fontSize: isAct ? 17 : 14,
                      color: isAct ? GOLD : 'rgba(245,237,224,0.6)',
                      letterSpacing: '0.02em',
                      transition: 'all 0.3s ease',
                    }}>{c.label}</span>
                    <span className="cat-arrow" style={{
                      color: isAct ? GOLD : 'rgba(245,237,224,0.3)',
                      fontSize: 14, transition: 'transform 0.3s ease',
                    }}>→</span>
                  </button>
                );
              })}
            </div>

            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 26px',
                background: GOLD, color: BG_DARK,
                borderRadius: 999, fontSize: 11, letterSpacing: '0.24em',
                textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500,
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 28px rgba(212,164,94,0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(212,164,94,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(212,164,94,0.25)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Написать →
            </a>
          </div>

          {/* ═══════════ RIGHT: accordion list ═══════════ */}
          <div key={cat} style={{ animation: 'faqFade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
            {filtered.map((faq, i) => {
              const isOpen = open === faq._i;
              return (
                <div key={faq._i} style={{
                  borderBottom: '1px solid rgba(212,164,94,0.12)',
                  background: isOpen ? 'rgba(212,164,94,0.04)' : 'transparent',
                  transition: 'background 0.4s ease',
                  borderLeft: `2px solid ${isOpen ? GOLD : 'transparent'}`,
                  paddingLeft: isOpen ? 18 : 0,
                  marginLeft: isOpen ? -20 : 0,
                  paddingRight: isOpen ? 18 : 0,
                  marginRight: isOpen ? -20 : 0,
                }}>
                  <button onClick={() => setOpen(isOpen ? null : faq._i)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 22,
                      padding: '16px 0', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}>
                    <div style={{ display: 'flex', gap: 22, alignItems: 'center', flex: 1 }}>
                      <span style={{
                        fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                        fontSize: 13, color: GOLD, letterSpacing: '0.18em',
                        flexShrink: 0, fontWeight: 300, minWidth: 28,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        fontFamily: 'var(--r-serif)',
                        fontSize: isOpen ? 16 : 15,
                        fontStyle: isOpen ? 'italic' : 'normal',
                        fontWeight: 300,
                        color: isOpen ? CREAM : 'rgba(245,237,224,0.78)',
                        lineHeight: 1.3,
                        transition: 'all 0.35s ease',
                      }}>
                        {faq.q}
                      </span>
                    </div>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      border: `1px solid ${isOpen ? GOLD : 'rgba(212,164,94,0.25)'}`,
                      background: isOpen ? GOLD : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.35s ease',
                    }}>
                      <span style={{
                        color: isOpen ? BG_DARK : GOLD,
                        fontSize: 18, lineHeight: 1, fontWeight: 300,
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.35s ease',
                      }}>+</span>
                    </div>
                  </button>
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: isOpen ? 400 : 0,
                    opacity: isOpen ? 1 : 0,
                    transition: 'max-height 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease',
                  }}>
                    <p style={{
                      fontSize: 13.5, color: 'rgba(245,237,224,0.7)',
                      lineHeight: 1.75, padding: '0 0 16px 50px',
                      margin: 0, maxWidth: 600,
                    }}>{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
