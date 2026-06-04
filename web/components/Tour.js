'use client';

const TOUR_URL = ''; // вставьте ссылку на Matterport / Cupix / Pannellum после съёмки

export default function Tour() {
  return (
    <section id="tour" style={{ position: 'relative', overflow: 'hidden', minHeight: '80vh', background: 'var(--r-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background photo with cream overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <img src="/images/property2.png" alt="Villa Jaconda — interior" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(28,18,8,0.85) 0%, rgba(28,18,8,0.6) 100%)' }} />
      </div>

      {/* Decorative grid lines */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.04 }}>
        {[...Array(6)].map((_,i) => (
          <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i+1)*16.6}%`, width: 1, background: 'var(--r-gold)' }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1440, margin: '0 auto', padding: 'clamp(96px,16vh,160px) clamp(20px,4vw,60px) clamp(120px,18vh,180px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-gold)', fontWeight: 500, marginBottom: 24 }}>
          — Виртуальный тур
        </p>

        <h2 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.8rem,6vw,5.5rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'rgba(247,242,232,0.95)', margin: '0 0 24px', maxWidth: '16ch' }}>
          Пройдитесь по дому <em style={{ fontStyle: 'italic', color: 'var(--r-gold)' }}>раньше</em>, чем приедете
        </h2>

        <p style={{ maxWidth: 540, color: 'rgba(247,242,232,0.6)', fontSize: 15, lineHeight: 1.7, marginBottom: 56 }}>
          360°-обход всех номеров и общих зон. Откройте каждую комнату, переходите между этажами и выбирайте номер не по фотографии — а по ощущению.
        </p>

        {TOUR_URL ? (
          <a href={TOUR_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', background: 'var(--r-gold)', color: 'var(--r-text)', borderRadius: 999, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, transition: 'background 0.3s ease' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--r-gold-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--r-gold)'}>
            Открыть 3D-тур →
          </a>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <a href="#contact"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 40px', background: 'var(--r-gold)', color: 'var(--r-text)', borderRadius: 999, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, transition: 'background 0.3s ease' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--r-gold-light)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--r-gold)'}>
              Запросить доступ к туру →
            </a>
            <span style={{ fontSize: 11, color: 'rgba(247,242,232,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Скоро · в подготовке
            </span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 'clamp(28px,5vh,60px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 'clamp(10px,3vw,20px)', color: 'rgba(247,242,232,0.3)', maxWidth: 'calc(100% - 40px)', justifyContent: 'center' }}>
          <span style={{ flex: '0 1 60px', height: 1, background: 'currentColor', minWidth: 24 }} />
          <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>360° · 8 rooms · 2 floors</span>
          <span style={{ flex: '0 1 60px', height: 1, background: 'currentColor', minWidth: 24 }} />
        </div>
      </div>
    </section>
  );
}
