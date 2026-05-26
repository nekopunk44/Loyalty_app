'use client';
import { useState } from 'react';
import Icon from './ui/Icon';

const TIERS = [
  { key: 'bronze', name: 'Bronze', threshold: 0, next: 500, color: '#E08B32', cashback: '1%', perks: ['Кешбек 1% с каждого бронирования', 'Бонус в день рождения', 'Полный архив визитов'] },
  { key: 'silver', name: 'Silver', threshold: 500, next: 2000, color: '#7A90A8', cashback: '1.5%', perks: ['Кешбек 1.5% — +0.5% к базовому', 'Приоритетная поддержка', 'Бонус ко дню рождения ×2'] },
  { key: 'gold', name: 'Gold', threshold: 2000, next: 5000, color: '#C08828', cashback: '2%', perks: ['Кешбек 2% — двойной бонус', 'Ранний доступ к акциям и событиям', 'VIP поддержка 24/7'] },
  { key: 'platinum', name: 'Platinum', threshold: 5000, next: null, color: '#9060CC', cashback: '3%', perks: ['Кешбек 3% — максимальный', 'Личный менеджер всегда на связи', 'Закрытые события и тарифы'] },
];

export default function LoyaltyTiers() {
  const [active, setActive] = useState(1);
  const t = TIERS[active];

  return (
    <section id="loyalty" style={{ background: 'var(--r-surface-warm)', borderTop: '1px solid var(--r-line)', paddingTop: 'clamp(80px,10vw,140px)', paddingBottom: 'clamp(80px,10vw,140px)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)' }}>

        <div style={{ marginBottom: 'clamp(48px,7vw,80px)' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-gold)', fontWeight: 500, marginBottom: 14 }}>— Программа лояльности</p>
          <h2 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.4rem,5vw,4.5rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--r-text)', margin: 0 }}>
            От <em style={{ fontStyle: 'italic', color: '#E08B32' }}>Bronze</em> до <em style={{ fontStyle: 'italic', color: '#9060CC' }}>Platinum</em>
          </h2>
        </div>

        <div style={{ position: 'relative', marginBottom: 56 }}>
          <div style={{ position: 'absolute', top: 28, left: '12.5%', right: '12.5%', height: 1, background: 'var(--r-line-strong)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 28, left: '12.5%', width: `${(active / 3) * 75}%`, height: 1, background: t.color, zIndex: 0, transition: 'width 0.5s ease, background 0.4s ease' }} />

          <div className="loyalty-path" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', position: 'relative', zIndex: 1 }}>
            {TIERS.map((tier, i) => {
              const isActive = i === active;
              const isPast = i < active;
              return (
                <button key={tier.key} onClick={() => setActive(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '0 8px', fontFamily: 'inherit' }}>
                  <div style={{ width: isActive ? 56 : 40, height: isActive ? 56 : 40, borderRadius: '50%', background: isActive || isPast ? tier.color : 'var(--r-bg)', border: `2px solid ${isActive || isPast ? tier.color : 'var(--r-line-strong)'}`, boxShadow: isActive ? `0 0 0 6px ${tier.color}22, 0 8px 24px ${tier.color}44` : 'none', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPast && !isActive ? (
                      <Icon name="check" size={16} color="#fff" strokeWidth={2.5} />
                    ) : isActive ? (
                      <span style={{ fontFamily: 'var(--r-serif)', fontSize: 18, color: '#fff', fontWeight: 400 }}>{tier.cashback}</span>
                    ) : (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--r-line-strong)' }} />
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--r-serif)', fontSize: isActive ? 22 : 16, fontWeight: isActive ? 400 : 300, color: isActive ? tier.color : 'var(--r-muted)', lineHeight: 1, marginBottom: 6, transition: 'all 0.3s ease' }}>{tier.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--r-muted)', letterSpacing: '0.06em' }}>{tier.next ? `${tier.threshold}–${tier.next}` : `${tier.threshold}+`} балл.</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div key={active} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 20, animation: 'fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

          <div style={{ background: 'var(--r-text)', borderRadius: 12, padding: 'clamp(32px,4vw,48px)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 280 }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${t.color}50 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, left: -20, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${t.color}25 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, boxShadow: `0 0 16px ${t.color}` }} />
                <span style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.5)' }}>
                  {t.next ? `${t.threshold} – ${t.next} баллов` : `от ${t.threshold} баллов`}
                </span>
              </div>
              <h3 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(3rem,5vw,5rem)', fontWeight: 300, color: t.color, lineHeight: 1, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{t.name}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(4rem,7vw,6rem)', fontWeight: 400, color: t.color, lineHeight: 1 }}>{t.cashback}</span>
              <span style={{ fontSize: 15, color: 'rgba(247,242,232,0.5)' }}>кешбека</span>
            </div>
          </div>

          <div style={{ background: 'var(--r-surface)', borderRadius: 12, padding: 'clamp(32px,4vw,48px)', border: '1px solid var(--r-line)' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 24 }}>— Привилегии</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {t.perks.map((perk, pi) => (
                <div key={perk} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '18px 0', borderBottom: pi < t.perks.length - 1 ? '1px solid var(--r-line)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="check" size={14} color={t.color} strokeWidth={2} />
                  </div>
                  <p style={{ fontSize: 15, color: 'var(--r-text)', margin: 0 }}>{perk}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: `${t.color}10`, borderRadius: 12, padding: 'clamp(32px,4vw,48px)', border: `1px solid ${t.color}30`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: t.color, marginBottom: 16 }}>— Как начать</p>
              <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.5rem,2.5vw,2.2rem)', fontWeight: 300, color: 'var(--r-text)', lineHeight: 1.2, marginBottom: 16 }}>
                Скачайте приложение и начните копить баллы с первого бронирования
              </p>
              <p style={{ fontSize: 13, color: 'var(--r-text-soft)', lineHeight: 1.65 }}>
                {TIERS[active + 1] ? `До следующего уровня (${TIERS[active + 1].name}) — ${TIERS[active + 1].threshold - TIERS[active].threshold} баллов.` : 'Вы на максимальном уровне!'}
              </p>
            </div>
            <a href="#contact"
              style={{ marginTop: 32, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px', background: t.color, color: '#fff', borderRadius: 999, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, alignSelf: 'flex-start', transition: 'opacity 0.3s ease' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Забронировать и начать →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
