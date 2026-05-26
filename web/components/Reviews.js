'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';

const reviews = [
  {
    quote: 'Уже третий раз возвращаюсь. Программа лояльности действительно работает — накопленные баллы дали апгрейд до апартаментов. Персональный менеджер — это отдельный класс обслуживания.',
    name: 'Дмитрий К.',
    stay: 'Апартаменты · 5 ночей',
    date: 'Январь 2026',
  },
  {
    quote: 'Невероятное место. Провели здесь неделю всей семьёй и были в полном восторге. Приложение очень удобное — бронировать ужины и следить за баллами просто. Уровень сервиса на высоте.',
    name: 'Александра М.',
    stay: 'Сюит · 7 ночей',
    date: 'Март 2026',
  },
  {
    quote: 'Провели здесь медовый месяц. Вилла превзошла все ожидания — красивая территория, уютные номера, вкусные завтраки. Обязательно вернёмся в следующем сезоне.',
    name: 'Елена и Сергей В.',
    stay: 'Делюкс · 4 ночи',
    date: 'Февраль 2026',
  },
  {
    quote: 'Отличное место для корпоративного отдыха. Возможность бронировать события через приложение очень удобна. Закрытое мероприятие для постоянных гостей организовано на высшем уровне.',
    name: 'Михаил Р.',
    stay: 'Сюит · 3 ночи',
    date: 'Апрель 2026',
  },
];

export default function Reviews() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });
  const [idx, setIdx] = useState(0);

  const current = reviews[idx];
  const total = reviews.length;

  return (
    <section id="reviews" className="section" ref={ref} style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="container-x">

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="eyebrow mb-6"
        >
          — Отзывы гостей
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.1, delay: 0.1 }}
          className="font-display display-lg mb-20"
          style={{ maxWidth: '14ch' }}
        >
          Они уже <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>были</em> здесь
        </motion.h2>

        <div style={{ minHeight: 360, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="font-display" style={{
                fontSize: 'clamp(1.6rem, 3.4vw, 2.6rem)',
                lineHeight: 1.35,
                color: 'var(--text)',
                fontStyle: 'italic',
                marginBottom: 48,
                maxWidth: '24ch',
              }}>
                «{current.quote}»
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ width: 40, height: 1, background: 'var(--gold)' }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{current.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em' }}>
                    {current.stay} · {current.date}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ marginTop: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontVariantNumeric: 'tabular-nums' }}>
            <span className="font-display" style={{ fontSize: 36, color: 'var(--gold)' }}>
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span style={{ width: 60, height: 1, background: 'var(--line-strong)' }} />
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {String(total).padStart(2, '0')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setIdx((idx - 1 + total) % total)}
              aria-label="Previous"
              data-cursor
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '1px solid var(--line-strong)',
                background: 'transparent', color: 'var(--text)',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
            >
              ←
            </button>
            <button
              onClick={() => setIdx((idx + 1) % total)}
              aria-label="Next"
              data-cursor
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '1px solid var(--line-strong)',
                background: 'transparent', color: 'var(--text)',
                cursor: 'pointer', transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--line-strong)'; }}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
