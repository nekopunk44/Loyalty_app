'use client';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
      <div className="container-x" style={{ paddingTop: 80, paddingBottom: 40 }}>

        <div style={{ display: 'grid', gap: 60, gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', marginBottom: 80 }}>

          <div>
            <p className="font-display" style={{ fontSize: 28, letterSpacing: '0.04em', marginBottom: 12 }}>
              VILLA <span style={{ color: 'var(--gold)' }}>JACONDA</span>
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 280 }}>
              Приватная вилла на восемь номеров. Программа лояльности для постоянных гостей.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-6" style={{ color: 'var(--muted)' }}>— Навигация</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { href: '#villa',   label: 'Вилла' },
                { href: '#rooms',   label: 'Номера' },
                { href: '#tour',    label: '3D-тур' },
                { href: '#reviews', label: 'Отзывы' },
                { href: '#contact', label: 'Бронирование' },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} style={{ fontSize: 14, color: 'var(--text-soft)', transition: 'color 0.3s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-soft)')}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-6" style={{ color: 'var(--muted)' }}>— Контакты</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li>
                <a href="tel:+37377812345" style={{ fontSize: 14, color: 'var(--text-soft)' }}>+373 778 12 345</a>
              </li>
              <li>
                <a href="mailto:hello@villajaconda.com" style={{ fontSize: 14, color: 'var(--text-soft)' }}>hello@villajaconda.com</a>
              </li>
              <li style={{ fontSize: 14, color: 'var(--text-soft)' }}>г. Бендеры, Приднестровье</li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-6" style={{ color: 'var(--muted)' }}>— Социальные</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Instagram', 'Telegram', 'WhatsApp'].map((s) => (
                <li key={s}>
                  <a href="#" style={{ fontSize: 14, color: 'var(--text-soft)', transition: 'color 0.3s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-soft)')}
                  >
                    {s} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          paddingTop: 32,
          borderTop: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
        }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            © {new Date().getFullYear()} Villa Jaconda · All rights reserved
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em' }}>
            Crafted with care
          </p>
        </div>
      </div>
    </footer>
  );
}
