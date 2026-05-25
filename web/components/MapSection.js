'use client';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export default function MapSection() {
  const [ref, visible] = useScrollAnimation();

  return (
    <section className="py-24 px-6" id="map">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Как нас найти
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="gradient-text">Расположение</span>
          </h2>
          <div className="section-divider" />
        </div>

        <div
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Map */}
          <div
            className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ height: 420, border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* TODO: Replace src with actual Google Maps embed URL for Villa Jaconda */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2000!2d37.6156!3d55.7512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zVmlsbGEgSmFjb25kYQ!5e0!3m2!1sru!2sru!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'invert(0.9) hue-rotate(180deg) saturate(0.8)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Villa Jaconda на карте"
            />
          </div>

          {/* Info */}
          <div className="space-y-4">
            {[
              {
                icon: '📍',
                title: 'Адрес',
                lines: ['ул. Примерная, 1', 'Укажите реальный адрес'],
              },
              {
                icon: '✈️',
                title: 'От аэропорта',
                lines: ['~40 минут на машине', 'Трансфер для Platinum гостей'],
              },
              {
                icon: '🚗',
                title: 'Парковка',
                lines: ['Бесплатная приватная', 'парковка на территории'],
              },
              {
                icon: '📞',
                title: 'Связаться',
                lines: ['+7 (xxx) xxx-xx-xx', 'info@villajaconda.com'],
              },
            ].map(item => (
              <div
                key={item.title}
                className="rounded-xl p-5 flex items-start gap-4"
                style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">{item.title}</p>
                  {item.lines.map(l => (
                    <p key={l} className="text-white text-sm font-medium leading-snug">{l}</p>
                  ))}
                </div>
              </div>
            ))}

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full text-center block"
            >
              Открыть в Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
