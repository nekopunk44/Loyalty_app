'use client';
import Icon from './ui/Icon';
import VJMonogram from './VJMonogram';

const SOCIAL = [{ name: 'Instagram', icon: 'camera' }, { name: 'Telegram', icon: 'send' }, { name: 'WhatsApp', icon: 'message-circle' }];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--r-text)', color: 'var(--r-bg)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '36px clamp(20px,4vw,60px) 20px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid rgba(247,242,232,0.10)', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <VJMonogram size={34} mainColor="rgba(247,242,232,0.95)" accentColor="#a07840" animate={false} />
            <span style={{ fontFamily: 'var(--r-serif)', fontSize: 18, fontWeight: 300, letterSpacing: '0.04em', color: 'rgba(247,242,232,0.95)' }}>
              VILLA <span style={{ color: 'var(--r-gold)' }}>JACONDA</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(247,242,232,0.45)' }}>Принимаем заявки</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.3)', marginBottom: 12 }}>Контакты</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><a href="tel:+3737791002" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(247,242,232,0.55)', textDecoration: 'none', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.55)'}><Icon name="phone" size={12} strokeWidth={1.5} />+373 779 10 02</a></li>
              <li><a href="mailto:hello@villajaconda.com" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(247,242,232,0.55)', textDecoration: 'none', transition: 'color 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.55)'}><Icon name="mail" size={12} strokeWidth={1.5} />hello@villajaconda.com</a></li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(247,242,232,0.55)' }}><Icon name="map-pin" size={12} strokeWidth={1.5} color="var(--r-gold)" />Набережная 85, Слободзея</li>
            </ul>
          </div>

          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.3)', marginBottom: 12 }}>Соцсети</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SOCIAL.map(s => (
                <li key={s.name}>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(247,242,232,0.55)', textDecoration: 'none', transition: 'color 0.3s ease' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--r-gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(247,242,232,0.55)'}>
                    <Icon name={s.icon} size={12} strokeWidth={1.5} />{s.name} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ paddingTop: 16, borderTop: '1px solid rgba(247,242,232,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'rgba(247,242,232,0.25)', letterSpacing: '0.06em' }}>© {year} Villa Jaconda · Все права защищены</p>
          <p style={{ fontSize: 11, color: 'rgba(247,242,232,0.25)', letterSpacing: '0.06em' }}>Слободзея, Приднестровье</p>
        </div>
      </div>
    </footer>
  );
}
