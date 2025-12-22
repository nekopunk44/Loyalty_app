'use client';
import { useState } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const reviews = [
  {
    name: 'Александра М.',
    level: 'Gold',
    levelIcon: '🥇',
    levelColor: '#F7931E',
    date: 'Март 2025',
    rating: 5,
    text: 'Невероятное место! Мы с семьёй провели здесь неделю и были в полном восторге. Приложение очень удобное — бронировать ужины и следить за баллами — это просто. Уровень сервиса на высоте, персонал всегда готов помочь.',
    stay: 'Люкс Сюит, 7 ночей',
  },
  {
    name: 'Дмитрий К.',
    level: 'Platinum',
    levelIcon: '💎',
    levelColor: '#8B5CF6',
    date: 'Январь 2025',
    rating: 5,
    text: 'Уже третий раз возвращаюсь на Villa Jaconda. Программа лояльности действительно работает — накопленные баллы позволили получить апгрейд до люкса. Персональный менеджер — это отдельный класс обслуживания.',
    stay: 'Люкс Апартаменты, 5 ночей',
  },
  {
    name: 'Елена и Сергей В.',
    level: 'Silver',
    levelIcon: '🥈',
    levelColor: '#94A3B8',
    date: 'Февраль 2025',
    rating: 5,
    text: 'Провели здесь медовый месяц. Виза была выдана очень быстро через администратора. Вилла превзошла все ожидания — красивая территория, уютные номера, вкусные завтраки. Обязательно вернёмся!',
    stay: 'Стандарт Делюкс, 4 ночи',
  },
  {
    name: 'Михаил Р.',
    level: 'Gold',
    levelIcon: '🥇',
    levelColor: '#F7931E',
    date: 'Апрель 2025',
    rating: 5,
    text: 'Отличное место для корпоративного отдыха. Возможность бронировать события через приложение очень удобна. Закрытое мероприятие для Gold-участников было организовано на высшем уровне.',
    stay: 'Люкс, 3 ночи',
  },
];

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? '#F7931E' : '#334155', fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [active, setActive] = useState(0);
  const [ref, visible] = useScrollAnimation();

  const prev = () => setActive(i => (i - 1 + reviews.length) % reviews.length);
  const next = () => setActive(i => (i + 1) % reviews.length);

  return (
    <section className="py-24 px-6" id="reviews">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Отзывы гостей
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Они уже <span className="gradient-text">были здесь</span>
          </h2>
          <div className="section-divider" />
        </div>

        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Featured review */}
          <div
            className="rounded-2xl p-8 md:p-10 mb-6 relative overflow-hidden"
            style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Quote decoration */}
            <div
              className="absolute top-6 right-8 text-8xl font-serif leading-none select-none"
              style={{ color: 'rgba(255,107,53,0.08)' }}
            >
              "
            </div>

            <div className="flex items-start gap-5 mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)', color: 'white' }}
              >
                {reviews[active].name[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-white font-bold text-lg">{reviews[active].name}</p>
                  <span
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: `${reviews[active].levelColor}18`,
                      border: `1px solid ${reviews[active].levelColor}40`,
                      color: reviews[active].levelColor,
                    }}
                  >
                    {reviews[active].levelIcon} {reviews[active].level}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Stars count={reviews[active].rating} />
                  <span className="text-slate-500 text-sm">{reviews[active].date}</span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{reviews[active].stay}</p>
              </div>
            </div>

            <p className="text-slate-300 text-lg leading-relaxed relative z-10">
              "{reviews[active].text}"
            </p>
          </div>

          {/* Controls + mini cards */}
          <div className="flex items-center gap-4">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              ‹
            </button>

            <div className="flex gap-3 overflow-x-auto flex-1 py-1">
              {reviews.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="flex-shrink-0 rounded-xl p-4 text-left transition-all"
                  style={{
                    background: i === active ? 'rgba(255,107,53,0.12)' : 'rgba(30,41,59,0.4)',
                    border: `1px solid ${i === active ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    minWidth: 180,
                  }}
                >
                  <p className="text-white text-sm font-semibold">{r.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{r.date}</p>
                  <Stars count={r.rating} />
                </button>
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
