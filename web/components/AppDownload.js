'use client';
import VJMonogram from './VJMonogram';

const FEATURES = [
  { icon: '✦', label: 'Кешбек на каждое бронирование' },
  { icon: '◈', label: 'Уровни Bronze → Platinum' },
  { icon: '◉', label: 'Push-уведомления и акции' },
  { icon: '⬡', label: 'QR-карта и история визитов' },
];

export default function AppDownload() {
  return (
    <section id="app" style={{
      background: 'var(--r-text)',
      paddingTop: 'clamp(80px,10vw,140px)',
      paddingBottom: 'clamp(80px,10vw,140px)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Фоновый круг */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(400px,70vw,900px)', height: 'clamp(400px,70vw,900px)',
        borderRadius: '50%',
        border: '1px solid rgba(212,164,94,0.08)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'clamp(260px,45vw,600px)', height: 'clamp(260px,45vw,600px)',
        borderRadius: '50%',
        border: '1px solid rgba(212,164,94,0.06)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', position: 'relative' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(48px,8vw,120px)', flexWrap: 'wrap', justifyContent: 'center' }}>

          {/* Левая часть — текст */}
          <div style={{ flex: '1 1 340px', maxWidth: 520 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-gold)', fontWeight: 500, marginBottom: 18 }}>
              — Мобильное приложение
            </p>
            <h2 style={{
              fontFamily: 'var(--r-serif)',
              fontSize: 'clamp(2.6rem,5vw,4.8rem)',
              fontWeight: 300,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color: 'rgba(247,242,232,0.96)',
              margin: '0 0 24px',
            }}>
              Ваша карта<br />всегда с собой
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(247,242,232,0.5)', marginBottom: 40, maxWidth: 400 }}>
              Управляйте баллами, бронируйте номера и получайте персональные предложения — всё в одном приложении.
            </p>

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 48 }}>
              <a href="#" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 24px',
                background: 'rgba(247,242,232,0.08)',
                border: '1px solid rgba(247,242,232,0.15)',
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'background 0.3s ease, border-color 0.3s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(247,242,232,0.13)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(247,242,232,0.08)'; e.currentTarget.style.borderColor = 'rgba(247,242,232,0.15)'; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(247,242,232,0.9)">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(247,242,232,0.45)', letterSpacing: '0.08em', lineHeight: 1 }}>СКАЧАТЬ В</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(247,242,232,0.92)', lineHeight: 1.3 }}>App Store</div>
                </div>
              </a>

              <a href="#" style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '14px 24px',
                background: 'rgba(247,242,232,0.08)',
                border: '1px solid rgba(247,242,232,0.15)',
                borderRadius: 14,
                textDecoration: 'none',
                transition: 'background 0.3s ease, border-color 0.3s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(247,242,232,0.13)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(247,242,232,0.08)'; e.currentTarget.style.borderColor = 'rgba(247,242,232,0.15)'; }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(247,242,232,0.9)">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.19-12.2L12.93 8.4 3.18 23.76zm17.49-10.4l-2.79-1.6-3.09 3.1 3.09 3.09 2.8-1.6c.8-.46.8-1.53-.01-1.99zM2.06 1.13C2.02 1.27 2 1.42 2 1.58v20.84c0 .16.02.31.06.45L14.28 12 2.06 1.13zm12.07 9.56l2.43-2.43-10.4-5.97a1.13 1.13 0 0 0-.96-.12l8.93 8.52z" />
                </svg>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(247,242,232,0.45)', letterSpacing: '0.08em', lineHeight: 1 }}>ДОСТУПНО В</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(247,242,232,0.92)', lineHeight: 1.3 }}>Google Play</div>
                </div>
              </a>
            </div>

            {/* Фичи */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--r-gold)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, color: 'rgba(247,242,232,0.55)', lineHeight: 1.4 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Правая часть — телефон-макет */}
          <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 220,
              height: 440,
              borderRadius: 40,
              background: 'rgba(13,10,8,0.9)',
              border: '1px solid rgba(212,164,94,0.2)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(247,242,232,0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Нотч */}
              <div style={{
                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                width: 72, height: 6, borderRadius: 3,
                background: 'rgba(247,242,232,0.1)',
              }} />

              <VJMonogram size={90} mainColor="rgba(247,242,232,0.9)" accentColor="#D4A45E" animate={false} />

              <div style={{ textAlign: 'center', padding: '0 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(247,242,232,0.9)', letterSpacing: '0.04em', marginBottom: 4 }}>Villa Jaconda</div>
                <div style={{ fontSize: 10, color: 'rgba(247,242,232,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Программа лояльности</div>
              </div>

              <div style={{
                width: '80%', padding: '12px 16px',
                background: 'rgba(212,164,94,0.1)',
                border: '1px solid rgba(212,164,94,0.2)',
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 9, color: 'rgba(212,164,94,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>Баланс карты</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(247,242,232,0.9)' }}>1 240 <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(212,164,94,0.8)' }}>₽</span></div>
                <div style={{ fontSize: 9, color: 'rgba(247,242,232,0.3)', marginTop: 2 }}>Уровень: Gold</div>
              </div>

              {/* Нижняя навигация-заглушка */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 56,
                borderTop: '1px solid rgba(247,242,232,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                padding: '0 8px',
              }}>
                {['⌂', '◉', '⬡', '☰'].map((ic, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: i === 0 ? 'rgba(212,164,94,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                    color: i === 0 ? 'var(--r-gold)' : 'rgba(247,242,232,0.2)',
                  }}>{ic}</div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
