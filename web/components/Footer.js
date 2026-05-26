'use client';
import Icon from './ui/Icon';
import VJMonogram from './VJMonogram';

const SOCIAL = [
  { name: 'Instagram', icon: 'camera', href: '#' },
  { name: 'Telegram',  icon: 'send',   href: '#' },
  { name: 'WhatsApp',  icon: 'message-circle', href: '#' },
];

const linkStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 13, color: 'rgba(247,242,232,0.5)',
  textDecoration: 'none', transition: 'color 0.25s ease',
};

export default function Footer() {
  const year = new Date().getFullYear();
  const hover = e => e.currentTarget.style.color = 'var(--r-gold)';
  const leave = e => e.currentTarget.style.color = 'rgba(247,242,232,0.5)';

  return (
    <footer style={{ background: 'var(--r-text)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px clamp(20px,4vw,60px) 24px' }}>

        {/* Main row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>

          {/* Left: logo + tagline + status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <VJMonogram size={30} mainColor="rgba(247,242,232,0.92)" accentColor="#a07840" animate={false} />
              <span style={{ fontFamily: 'var(--r-serif)', fontSize: 16, fontWeight: 300, letterSpacing: '0.05em', color: 'rgba(247,242,232,0.92)' }}>
                VILLA <span style={{ color: 'var(--r-gold)' }}>JACONDA</span>
              </span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(247,242,232,0.35)', margin: 0 }}>
              Приватная вилла на берегу Днестра.<br />Слободзея, Приднестровье.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'rgba(247,242,232,0.35)' }}>Принимаем заявки</span>
            </div>
          </div>

          {/* Right: contacts + social */}
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>

            {/* Contacts */}
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.25)', marginBottom: 14, marginTop: 0 }}>Контакты</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <li>
                  <a href="tel:+3737791002" style={linkStyle} onMouseEnter={hover} onMouseLeave={leave}>
                    <Icon name="phone" size={12} strokeWidth={1.5} />+373 779 10 02
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@villajaconda.com" style={linkStyle} onMouseEnter={hover} onMouseLeave={leave}>
                    <Icon name="mail" size={12} strokeWidth={1.5} />hello@villajaconda.com
                  </a>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(247,242,232,0.5)' }}>
                  <Icon name="map-pin" size={12} strokeWidth={1.5} color="var(--r-gold)" />Набережная 85, Слободзея
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <p style={{ fontSize: 9, letterSpacing: '0.30em', textTransform: 'uppercase', color: 'rgba(247,242,232,0.25)', marginBottom: 14, marginTop: 0 }}>Соцсети</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SOCIAL.map(s => (
                  <li key={s.name}>
                    <a href={s.href} style={linkStyle} onMouseEnter={hover} onMouseLeave={leave}>
                      <Icon name={s.icon} size={12} strokeWidth={1.5} />{s.name} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(247,242,232,0.07)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(247,242,232,0.2)', letterSpacing: '0.05em' }}>© {year} Villa Jaconda · Все права защищены</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(247,242,232,0.2)', letterSpacing: '0.05em' }}>Слободзея, Приднестровье</p>
        </div>

      </div>
    </footer>
  );
}
