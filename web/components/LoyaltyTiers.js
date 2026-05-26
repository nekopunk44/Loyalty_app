'use client';
import { useState } from 'react';
import Icon from './ui/Icon';
import VJMonogram from './VJMonogram';

const TIERS = [
  { key: 'bronze',   name: 'Bronze',   label: 'Начало пути',     color: '#c47432', cashback: '3%',  perks: ['Кэшбек 3% с каждого бронирования', 'История визитов в приложении', 'Персональные рекомендации событий', 'Бонус на день рождения'] },
  { key: 'silver',   name: 'Silver',   label: 'Активный гость',  color: '#a3b1c1', cashback: '5%',  perks: ['Кэшбек 5% с каждого бронирования', 'Бесплатный кухонный сервиз при каждом заезде', 'Приоритетная поддержка в WhatsApp', 'Бонус на день рождения ×2'] },
  { key: 'gold',     name: 'Gold',     label: 'Постоянный гость', color: '#d4a45e', cashback: '7%',  perks: ['Кэшбек 7% с каждого бронирования', 'Бесплатный кухонный сервиз', 'Скидка 20% на парилку', 'Ранний доступ к акциям — за 24 ч', 'VIP поддержка 24/7'] },
  { key: 'platinum', name: 'Platinum', label: 'VIP-клиент',      color: '#b18cd9', cashback: '10%', perks: ['Кэшбек 10% — максимальный', 'Бесплатный кухонный сервиз', '1 час парилки бесплатно', 'Персональный менеджер на связи', 'Закрытые тарифы и события'] },
];

export default function LoyaltyApp() {
  const [active, setActive] = useState(2);
  const t = TIERS[active];

  return (
    <section id="loyalty" style={{
      background: 'linear-gradient(180deg, #0a0805 0%, #0d0a07 100%)',
      height: 'calc(100svh - 72px)',
      paddingTop: 'clamp(16px,2.5vh,36px)',
      paddingBottom: 'clamp(16px,2.5vh,36px)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes tierFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .loyalty-grid { display: grid; gap: clamp(32px, 4vw, 56px); grid-template-columns: minmax(0, 1fr) minmax(0, 320px); align-items: center; }
        @media (max-width: 980px) {
          .loyalty-grid { grid-template-columns: 1fr !important; }
          .loyalty-phone-wrap { justify-self: center; }
        }
      `}</style>

      {/* Декоративные круги */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-10%',
        width: 520, height: 520, borderRadius: '50%',
        background: `radial-gradient(circle, ${t.color}10 0%, transparent 70%)`,
        transition: 'background 0.6s ease', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-10%',
        width: 460, height: 460, borderRadius: '50%',
        background: `radial-gradient(circle, ${t.color}08 0%, transparent 70%)`,
        transition: 'background 0.6s ease', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', position: 'relative' }}>

        {/* Header */}
        <div style={{ marginBottom: 'clamp(10px,1.5vh,20px)', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 22, height: 1, background: '#d4a45e', opacity: 0.55 }} />
            <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.7)' }}>
              Программа · Приложение
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(1.8rem,3.2vw,3rem)',
            fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.025em',
            color: '#f5ede0', margin: 0,
          }}>
            Лояльность <em style={{ fontStyle: 'italic', color: t.color, transition: 'color 0.5s ease' }}>{t.name}</em>
            {' · '}
            <span style={{ fontSize: '0.75em', color: 'rgba(245,237,224,0.5)' }}>в одном приложении</span>
          </h2>
        </div>

        <div className="loyalty-grid">

          {/* ═══════════ LEFT: TIERS ═══════════ */}
          <div>

            {/* Tier rail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 'clamp(10px,1.5vh,16px)' }}>
              {TIERS.map((tier, i) => {
                const isActive = i === active;
                const isPast = i < active;
                return (
                  <button key={tier.key} onClick={() => setActive(i)}
                    style={{
                      background: isActive ? `${tier.color}0d` : 'transparent',
                      border: 'none',
                      borderTop: '1px solid rgba(212,164,94,0.10)',
                      borderBottom: i === TIERS.length - 1 ? '1px solid rgba(212,164,94,0.10)' : 'none',
                      padding: 'clamp(8px,1vh,12px) clamp(10px,1.4vw,16px)',
                      cursor: isActive ? 'default' : 'pointer',
                      display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 16, alignItems: 'center',
                      transition: 'background 0.35s ease', textAlign: 'left',
                      fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
                    }}>
                    {isActive && (
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                        background: tier.color, boxShadow: `0 0 12px ${tier.color}`,
                      }} />
                    )}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isActive || isPast ? tier.color : 'transparent',
                      border: `1px solid ${isActive || isPast ? tier.color : 'rgba(212,164,94,0.28)'}`,
                      boxShadow: isActive ? `0 0 0 6px ${tier.color}1a, 0 8px 24px ${tier.color}33` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                      {isPast && !isActive ? (
                        <Icon name="check" size={14} color="#0a0805" strokeWidth={2.5} />
                      ) : isActive ? (
                        <span style={{ fontFamily: 'var(--r-serif)', fontSize: 14, color: '#0a0805', fontWeight: 500 }}>{tier.cashback}</span>
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(212,164,94,0.3)' }} />
                      )}
                    </div>

                    <div>
                      <p style={{
                        fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                        fontSize: isActive ? 17 : 14, fontWeight: 300,
                        color: isActive ? '#f5ede0' : 'rgba(245,237,224,0.55)',
                        lineHeight: 1, margin: '0 0 5px',
                        transition: 'all 0.35s ease',
                      }}>{tier.name}</p>
                      <p style={{
                        fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
                        color: isActive ? tier.color : 'rgba(245,237,224,0.32)',
                        margin: 0, transition: 'color 0.35s ease',
                      }}>
                        {tier.label}
                      </p>
                    </div>

                    <span style={{
                      fontFamily: 'var(--r-serif)',
                      fontSize: isActive ? 20 : 14, fontWeight: 400,
                      color: isActive ? tier.color : 'rgba(245,237,224,0.3)',
                      transition: 'all 0.35s ease',
                    }}>{tier.cashback}</span>
                  </button>
                );
              })}
            </div>

            {/* Active tier perks */}
            <div key={active} style={{
              animation: 'tierFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 18, height: 1, background: t.color, opacity: 0.7 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: t.color }}>
                  Привилегии {t.name}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {t.perks.map((perk, pi) => (
                  <div key={pi} style={{
                    display: 'flex', gap: 14, alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: pi < t.perks.length - 1 ? '1px solid rgba(245,237,224,0.07)' : 'none',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${t.color}1a`,
                      border: `1px solid ${t.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon name="check" size={12} color={t.color} strokeWidth={2} />
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(245,237,224,0.82)', margin: 0, lineHeight: 1.55 }}>{perk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════ RIGHT: PHONE + DOWNLOAD ═══════════ */}
          <div className="loyalty-phone-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

            {/* Phone mockup */}
            <div style={{
              position: 'relative',
              animation: 'phoneFloat 8s ease-in-out infinite',
            }}>
              {/* Halo */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 260, height: 260, borderRadius: '50%',
                background: `radial-gradient(circle, ${t.color}18 0%, transparent 70%)`,
                pointerEvents: 'none',
                animation: 'glowPulse 4s ease-in-out infinite',
                transition: 'background 0.6s ease',
              }} />

              <div style={{
                position: 'relative',
                width: 180, height: 340,
                borderRadius: 42,
                background: 'linear-gradient(160deg, #0c0a07 0%, #14110c 100%)',
                border: '1px solid rgba(212,164,94,0.25)',
                boxShadow: `0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,237,224,0.04), 0 0 60px ${t.color}20`,
                padding: 14,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                transition: 'box-shadow 0.6s ease',
              }}>
                {/* Notch */}
                <div style={{
                  position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                  width: 86, height: 22, borderRadius: 11,
                  background: '#000', zIndex: 3,
                }} />

                {/* Screen */}
                <div style={{
                  flex: 1, borderRadius: 30,
                  background: `linear-gradient(180deg, #0f0c08 0%, #0a0805 100%)`,
                  padding: '46px 18px 20px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Subtle gold sheen */}
                  <div style={{
                    position: 'absolute', top: 0, left: '-50%', width: '200%', height: 1,
                    background: `linear-gradient(90deg, transparent, ${t.color}, transparent)`,
                    opacity: 0.4,
                  }} />

                  <VJMonogram size={56} mainColor="rgba(245,237,224,0.92)" accentColor={t.color} animate={false} />

                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--r-serif)', fontSize: 13, color: '#f5ede0', letterSpacing: '0.06em' }}>
                      Villa Jaconda
                    </div>
                    <div style={{ fontSize: 8, color: 'rgba(212,164,94,0.7)', letterSpacing: '0.28em', textTransform: 'uppercase', marginTop: 3 }}>
                      Loyalty Card
                    </div>
                  </div>

                  {/* Card */}
                  <div key={active} style={{
                    width: '100%', marginTop: 22, padding: '16px 14px',
                    background: `linear-gradient(135deg, ${t.color}26 0%, ${t.color}0a 100%)`,
                    border: `1px solid ${t.color}50`,
                    borderRadius: 14,
                    animation: 'tierFadeUp 0.45s cubic-bezier(0.16,1,0.3,1) both',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.55)' }}>
                        Уровень
                      </span>
                      <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 13, color: t.color, fontWeight: 500 }}>
                        {t.name}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--r-serif)', fontSize: 26, color: '#f5ede0', lineHeight: 1, marginBottom: 4 }}>
                      1 240<span style={{ fontSize: 11, color: t.color, marginLeft: 4 }}>PRB</span>
                    </div>
                    <div style={{ fontSize: 8, letterSpacing: '0.24em', color: 'rgba(245,237,224,0.45)', textTransform: 'uppercase' }}>
                      Кешбек {t.cashback}
                    </div>
                  </div>

                  {/* QR placeholder */}
                  <div style={{
                    marginTop: 18,
                    width: 64, height: 64, borderRadius: 8,
                    background: 'rgba(245,237,224,0.06)',
                    border: '1px solid rgba(245,237,224,0.1)',
                    display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 1.5, padding: 6,
                  }}>
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} style={{
                        background: ((i * 7 + 3) % 5) < 2 ? 'rgba(245,237,224,0.55)' : 'transparent',
                        borderRadius: 1,
                      }} />
                    ))}
                  </div>

                  {/* Bottom nav */}
                  <div style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'space-around', paddingTop: 14, borderTop: '1px solid rgba(245,237,224,0.06)' }}>
                    {['⌂', '◉', '⬡', '☰'].map((ic, i) => (
                      <div key={i} style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: i === 0 ? `${t.color}22` : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12,
                        color: i === 0 ? t.color : 'rgba(245,237,224,0.25)',
                      }}>{ic}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Download links */}
            <div style={{ width: '100%', maxWidth: 340 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, justifyContent: 'center' }}>
                <div style={{ width: 18, height: 1, background: '#d4a45e', opacity: 0.5 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.7)' }}>
                  Скачать приложение
                </span>
                <div style={{ width: 18, height: 1, background: '#d4a45e', opacity: 0.5 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="#" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 18px',
                  background: 'rgba(245,237,224,0.04)',
                  border: '1px solid rgba(245,237,224,0.12)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.10)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,237,224,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="rgba(245,237,224,0.92)">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: 'rgba(245,237,224,0.5)', letterSpacing: '0.18em', lineHeight: 1, textTransform: 'uppercase' }}>Скачать в</div>
                    <div style={{ fontFamily: 'var(--r-serif)', fontSize: 16, color: '#f5ede0', lineHeight: 1.3 }}>App Store</div>
                  </div>
                  <span style={{ color: '#d4a45e', fontSize: 16 }}>→</span>
                </a>

                <a href="#" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 18px',
                  background: 'rgba(245,237,224,0.04)',
                  border: '1px solid rgba(245,237,224,0.12)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.10)'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.45)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,237,224,0.04)'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="rgba(245,237,224,0.92)">
                    <path d="M3.18 23.76c.3.17.64.24.99.2l12.19-12.2L12.93 8.4 3.18 23.76zm17.49-10.4l-2.79-1.6-3.09 3.1 3.09 3.09 2.8-1.6c.8-.46.8-1.53-.01-1.99zM2.06 1.13C2.02 1.27 2 1.42 2 1.58v20.84c0 .16.02.31.06.45L14.28 12 2.06 1.13zm12.07 9.56l2.43-2.43-10.4-5.97a1.13 1.13 0 0 0-.96-.12l8.93 8.52z" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: 'rgba(245,237,224,0.5)', letterSpacing: '0.18em', lineHeight: 1, textTransform: 'uppercase' }}>Доступно в</div>
                    <div style={{ fontFamily: 'var(--r-serif)', fontSize: 16, color: '#f5ede0', lineHeight: 1.3 }}>Google Play</div>
                  </div>
                  <span style={{ color: '#d4a45e', fontSize: 16 }}>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
