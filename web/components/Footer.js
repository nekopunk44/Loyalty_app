'use client';
import Icon from './ui/Icon';

const NAV = [
  { href: '#rooms', label: 'Номера' }, { href: '#tour', label: '3D-тур' }, { href: '#loyalty', label: 'Лояльность' },
  { href: '#reviews', label: 'Отзывы' }, { href: '#faq', label: 'FAQ' }, { href: '#contact', label: 'Бронирование' },
];
const SOCIAL = [{ name: 'Instagram', icon: 'camera' }, { name: 'Telegram', icon: 'send' }, { name: 'WhatsApp', icon: 'message-circle' }];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--r-text)', color: 'var(--r-bg)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '80px clamp(20px,4vw,60px) 40px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 64, paddingBottom: 48, borderBottom: '1px solid rgba(247,242,232,0.12)', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <svg viewBox="0 0 100 100" fill="none" width="36" height="36" style={{ color: 'var(--r-gold)', flexShrink: 0 }}>
                <g stroke="currentColor" strokeWidth="0.5" opacity="0.3">
                  <line x1="14" y1="12" x2="14" y2="88"/><line x1="36.6" y1="12" x2="36.6" y2="88"/>
                  <line x1="50" y1="12" x2="50" y2="88"/><line x1="63.4" y1="12" x2="63.4" y2="88"/>
                  <line x1="86" y1="12" x2="86" y2="88"/>
                  <line x1="12" y1="14" x2="88" y2="14"/><line x1="12" y1="36.6" x2="88" y2="36.6"/>
                  <line x1="12" y1="50" x2="88" y2="50"/><line x1="12" y1="63.4" x2="88" y2="63.4"/>
                  <line x1="12" y1="86" x2="88" y2="86"/>
                </g>
                <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="2"/>
                <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="2"/>
                <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span style={{ fontFamily: 'var(--r-serif)', fontSize: 24, fontWeight: 300, letterSpacing: '0.04em', color: 'rgba(247,242,232,0.95)' }}>
                VILLA <span style={{ color: 'var(--r-gold)' }}>JACONDA</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(247,242,232,0.5)', lineHeight: 1.7, maxWidth: 280 }}>
              Приватная вилла в Слободзее. Программа лояльности для постоянных гостей.
            </p>
          </div>
          <a href="#contact"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: 'var(--r-gold)', color: 'var(--r-text)', borderRadius: 999, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, transition: 'background 0.3s ease', alignSelf: 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--r-gold-light)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--r-gold)'}>
            Забронировать →
          </a>
        </div>

        <div style={{ display: 'grid', gap: 48, gridTemplateColumns: 'repeat(auto-fit,minmax(min(180px,100%),1fr))', marginBottom: 64 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.35)', marginBottom: 20 }}>Навигация</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {NAV.map(l => (
                <li key={l.href}>
                  <a href={l.href} style={{ fontSize: 14, color: 'rgba(247,242,232,0.6)', textDecoration: 'none', transition: 'color 0.3s ease' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.6)'}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.35)', marginBottom: 20 }}>Контакты</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <li><a href="tel:+37377812345" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'rgba(247,242,232,0.6)', textDecoration: 'none', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.6)'}><Icon name="phone" size={13} strokeWidth={1.5} />+373 778 12 345</a></li>
              <li><a href="mailto:hello@villajaconda.com" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'rgba(247,242,232,0.6)', textDecoration: 'none', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.6)'}><Icon name="mail" size={13} strokeWidth={1.5} />hello@villajaconda.com</a></li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'rgba(247,242,232,0.6)' }}><Icon name="map-pin" size={13} strokeWidth={1.5} color="var(--r-gold)" />ул. Набережная 85, Слободзея</li>
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.35)', marginBottom: 20 }}>Соцсети</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SOCIAL.map(s => (
                <li key={s.name}>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'rgba(247,242,232,0.6)', textDecoration: 'none', transition: 'color 0.3s ease' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.6)'}>
                    <Icon name={s.icon} size={13} strokeWidth={1.5} />{s.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.35)', marginBottom: 20 }}>Режим</p>
            <p style={{ fontSize: 14, color: 'rgba(247,242,232,0.6)', lineHeight: 1.7 }}>Приём гостей<br />круглосуточно</p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(247,242,232,0.5)' }}>Сейчас принимаем заявки</span>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 28, borderTop: '1px solid rgba(247,242,232,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(247,242,232,0.3)', letterSpacing: '0.06em' }}>© {year} Villa Jaconda · Все права защищены</p>
          <p style={{ fontSize: 12, color: 'rgba(247,242,232,0.3)', letterSpacing: '0.06em' }}>Слободзея, Приднестровье</p>
        </div>
      </div>
    </footer>
  );
}
