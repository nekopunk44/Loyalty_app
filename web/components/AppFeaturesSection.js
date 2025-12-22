'use client';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const features = [
  {
    icon: '🏠',
    title: 'Бронирование',
    desc: 'Бронируйте номера и апартаменты прямо из приложения с выбором дат и типа размещения',
  },
  {
    icon: '💳',
    title: 'Цифровая карта',
    desc: 'Ваша карта лояльности всегда под рукой. QR-код для мгновенного начисления баллов',
  },
  {
    icon: '⭐',
    title: 'Баллы и уровни',
    desc: 'Отслеживайте накопленные баллы, текущий уровень и доступные привилегии в реальном времени',
  },
  {
    icon: '🎪',
    title: 'Закрытые события',
    desc: 'Эксклюзивные мероприятия только для участников программы: вечера, дегустации, мастер-классы',
  },
  {
    icon: '🔔',
    title: 'Уведомления',
    desc: 'Персональные предложения, напоминания о бронировании и новости виллы прямо на ваш телефон',
  },
  {
    icon: '🌙',
    title: 'Тёмная тема',
    desc: 'Элегантный интерфейс с поддержкой тёмной темы — комфортно в любое время суток',
  },
];

export default function AppFeaturesSection() {
  const [gridRef, gridVisible] = useScrollAnimation();
  const [bannerRef, bannerVisible] = useScrollAnimation();

  return (
    <section className="py-24 px-6" id="app">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Мобильное приложение
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Всё в одном <span className="gradient-text">приложении</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-400 max-w-xl mx-auto mt-4">
            Приложение Villa Jaconda — ваш персональный консьерж для управления
            привилегиями, бронированиями и событиями.
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          style={{
            opacity: gridVisible ? 1 : 0,
            transform: gridVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {features.map(f => (
            <div
              key={f.title}
              className="card-hover rounded-2xl p-7"
              style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.2)' }}
              >
                {f.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Access info banner */}
        <div ref={bannerRef} style={{ opacity: bannerVisible ? 1 : 0, transform: bannerVisible ? 'translateY(0)' : 'translateY(30px)', transition: 'opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s' }}>
        <div
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(0,78,137,0.15) 100%)',
            border: '1px solid rgba(255,107,53,0.25)',
          }}
        >
          <div className="text-5xl mb-4">🔐</div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Доступ только для гостей виллы
          </h3>
          <p className="text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
            Приложение доступно по приглашению. Администратор виллы создаёт ваш персональный
            аккаунт после регистрации — вы получаете уведомление с данными для входа.
          </p>
          <a href="#contact" className="btn-primary">
            Связаться с нами
          </a>
        </div>
        </div>
      </div>
    </section>
  );
}
