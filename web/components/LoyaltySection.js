'use client';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const levels = [
  {
    name: 'Silver',
    icon: '🥈',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.1)',
    border: 'rgba(148,163,184,0.3)',
    perks: ['Базовое начисление баллов', 'Скидка 5% на бронирование', 'Приоритетная поддержка'],
  },
  {
    name: 'Gold',
    icon: '🥇',
    color: '#F7931E',
    bg: 'rgba(247,147,30,0.1)',
    border: 'rgba(247,147,30,0.4)',
    perks: ['Двойные баллы', 'Скидка 10% на бронирование', 'Ранний чек-ин / Поздний чек-аут', 'Доступ к закрытым событиям'],
    featured: true,
  },
  {
    name: 'Platinum',
    icon: '💎',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.4)',
    perks: ['Тройные баллы', 'Скидка 20% на все услуги', 'Персональный менеджер', 'VIP-доступ ко всем событиям', 'Бесплатные трансферы'],
  },
];

const steps = [
  { num: '01', title: 'Получите доступ', desc: 'Администратор виллы создаёт ваш аккаунт после регистрации пребывания' },
  { num: '02', title: 'Скачайте приложение', desc: 'Установите приложение Villa Jaconda и войдите в свой аккаунт' },
  { num: '03', title: 'Зарабатывайте баллы', desc: 'Каждое бронирование и активность приносит вам баллы лояльности' },
  { num: '04', title: 'Пользуйтесь привилегиями', desc: 'Обменивайте баллы на скидки, апгрейды и эксклюзивные предложения' },
];

export default function LoyaltySection() {
  const [levelsRef, levelsVisible] = useScrollAnimation();
  const [stepsRef, stepsVisible] = useScrollAnimation();

  return (
    <section className="py-24 px-6" id="loyalty">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Программа лояльности
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Каждый визит — <span className="gradient-text">новые привилегии</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-400 max-w-xl mx-auto mt-4">
            Три уровня лояльности с растущими преимуществами. Чем больше вы с нами — тем больше мы ценим вас.
          </p>
        </div>

        {/* Levels */}
        <div
          ref={levelsRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20"
          style={{
            opacity: levelsVisible ? 1 : 0,
            transform: levelsVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {levels.map(level => (
            <div
              key={level.name}
              className="card-hover rounded-2xl p-8 relative"
              style={{
                background: level.bg,
                border: `1px solid ${level.border}`,
                ...(level.featured ? { boxShadow: `0 0 40px ${level.border}` } : {}),
              }}
            >
              {level.featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ background: '#F7931E', color: 'white' }}
                >
                  Популярный
                </div>
              )}

              <div className="text-4xl mb-4">{level.icon}</div>
              <h3 className="text-2xl font-bold mb-6" style={{ color: level.color }}>{level.name}</h3>

              <ul className="space-y-3">
                {level.perks.map(perk => (
                  <li key={perk} className="flex items-center gap-3 text-slate-300 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                      style={{ background: level.bg, border: `1px solid ${level.border}`, color: level.color }}>
                      ✓
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-white mb-2">Как это работает</h3>
          <div className="section-divider" />
        </div>

        <div
          ref={stepsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{
            opacity: stepsVisible ? 1 : 0,
            transform: stepsVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s',
          }}
        >
          {steps.map((step, i) => (
            <div key={step.num} className="relative">
              <div
                className="rounded-xl p-6"
                style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="text-3xl font-bold mb-4"
                  style={{ color: 'rgba(255,107,53,0.3)' }}
                >
                  {step.num}
                </div>
                <h4 className="text-white font-semibold mb-2">{step.title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>

              {i < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px"
                  style={{ background: 'rgba(255,107,53,0.3)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
