'use client';
import Image from 'next/image';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import RoomsShowcase from '@/components/RoomsShowcase';

const stats = [
  { value: '5★', label: 'Рейтинг гостей' },
  { value: '10+', label: 'Лет истории' },
  { value: '3', label: 'Категории номеров' },
  { value: '24/7', label: 'Поддержка' },
];

export default function AboutSection() {
  const [ref, visible] = useScrollAnimation();

  return (
    <>
    <section className="py-24 px-6" id="about-villa">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            О вилле
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Место, где <span className="gradient-text">время замедляется</span>
          </h2>
          <div className="section-divider" />
        </div>

        {/* Main block */}
        <div
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <Image
                src="/images/property1.png"
                alt="Villa Jaconda"
                fill
                className="object-cover"
              />
            </div>
            {/* Floating card */}
            <div
              className="absolute -bottom-6 -right-6 rounded-2xl p-5 hidden md:block"
              style={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(255,107,53,0.3)' }}
            >
              <p className="text-slate-400 text-xs mb-1">Программа лояльности</p>
              <p className="text-white font-bold text-lg">Villa Jaconda Club</p>
              <div className="flex gap-1 mt-2">
                {['🥈', '🥇', '💎'].map(e => (
                  <span key={e} className="text-xl">{e}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-white mb-5">
              Эксклюзивный отдых в окружении природы
            </h3>
            <p className="text-slate-400 leading-relaxed mb-4">
              Villa Jaconda — частная вилла класса люкс, созданная для тех, кто ценит приватность,
              комфорт и внимание к деталям. Каждый уголок виллы продуман до мелочей, чтобы вы
              могли полностью расслабиться и насладиться отдыхом.
            </p>
            <p className="text-slate-400 leading-relaxed mb-8">
              Для наших постоянных гостей мы создали программу лояльности Villa Jaconda Club —
              эксклюзивный клуб привилегий, который делает каждый визит ещё более особенным.
              Доступ в программу предоставляется лично администрацией виллы.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map(s => (
                <div
                  key={s.label}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)' }}
                >
                  <p className="text-2xl font-bold gradient-text">{s.value}</p>
                  <p className="text-slate-400 text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
    <RoomsShowcase />
    </>
  );
}
