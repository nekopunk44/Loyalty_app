'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'motion/react';

const tiers = [
  {
    key: 'bronze',
    name: 'Bronze',
    threshold: 0,
    next: 500,
    color: '#E08B32',
    perks: [
      { title: 'Кешбек 1%',            sub: 'с каждого бронирования' },
      { title: 'Бонус в день рождения', sub: 'дополнительные баллы' },
      { title: 'История броней',        sub: 'полный архив визитов' },
    ],
  },
  {
    key: 'silver',
    name: 'Silver',
    threshold: 500,
    next: 2000,
    color: '#94A3B8',
    perks: [
      { title: 'Кешбек 1.5%',           sub: '+0.5% к базовому' },
      { title: 'Приоритетная поддержка', sub: 'быстрый ответ' },
      { title: 'Бонус в день рождения',  sub: 'увеличенные баллы' },
    ],
  },
  {
    key: 'gold',
    name: 'Gold',
    threshold: 2000,
    next: 5000,
    color: '#F59E0B',
    perks: [
      { title: 'Кешбек 2%',             sub: '+1% к базовому' },
      { title: 'Ранний доступ',          sub: 'первыми видите акции' },
      { title: 'VIP поддержка',          sub: 'персональный менеджер' },
    ],
  },
  {
    key: 'platinum',
    name: 'Platinum',
    threshold: 5000,
    next: null,
    color: '#C8A2FF',
    perks: [
      { title: 'Кешбек 3%',             sub: 'максимальный' },
      { title: 'VIP обслуживание',       sub: 'высший приоритет' },
      { title: 'Личный менеджер',        sub: 'всегда на связи' },
    ],
  },
];

function TierCard({ tier, index, total }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      data-cursor
      style={{
        position: 'relative',
        padding: 'clamp(28px, 3vw, 44px)',
        borderTop: '1px solid var(--line)',
        borderLeft: index === 0 ? '1px solid var(--line)' : 'none',
        background: 'transparent',
        transition: 'background 0.5s ease',
        minHeight: 'clamp(380px, 50vh, 480px)',
        display: 'flex',
        flexDirection: 'column',
      }}
      whileHover={{ backgroundColor: 'rgba(212, 164, 94, 0.04)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11, letterSpacing: '0.25em', color: 'var(--muted)' }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: tier.color,
          boxShadow: `0 0 24px ${tier.color}66`,
        }} />
      </div>

      <h3 className="font-display" style={{
        fontSize: 'clamp(2rem, 3vw, 2.8rem)',
        lineHeight: 1,
        marginBottom: 14,
        color: tier.color,
        letterSpacing: '-0.01em',
      }}>
        {tier.name}
      </h3>

      <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 36, fontVariantNumeric: 'tabular-nums' }}>
        {tier.next === null
          ? `от ${tier.threshold} баллов`
          : `${tier.threshold} – ${tier.next} баллов`}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 18, marginTop: 'auto' }}>
        {tier.perks.map((p) => (
          <li key={p.title}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4, fontWeight: 500 }}>
              {p.title}
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.03em' }}>
              {p.sub}
            </p>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export default function LoyaltyTiers() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const lineHeight = useTransform(scrollYProgress, [0, 0.5], ['0%', '100%']);

  return (
    <section id="loyalty" ref={ref} className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', position: 'relative', overflow: 'hidden' }}>

      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: '50%',
        width: 1, background: 'rgba(212, 164, 94, 0.08)', pointerEvents: 'none',
      }}>
        <motion.div style={{ width: '100%', height: lineHeight, background: 'var(--gold)' }} />
      </div>

      <div className="container-x" style={{ position: 'relative' }}>

        <div style={{ display: 'grid', gap: 'clamp(40px, 6vw, 80px)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', marginBottom: 'clamp(60px, 10vh, 120px)', alignItems: 'end' }}>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9 }}
              className="eyebrow mb-6"
            >
              — Программа лояльности · 4 уровня
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.1, delay: 0.1 }}
              className="font-display display-lg"
              style={{ maxWidth: '14ch' }}
            >
              От <em style={{ fontStyle: 'italic', color: '#E08B32' }}>Bronze</em> до{' '}
              <em style={{ fontStyle: 'italic', color: '#C8A2FF' }}>Platinum</em>
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.25 }}
            style={{ color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.75, maxWidth: 460 }}
          >
            Баллы начисляются за каждое бронирование и активность в приложении. Чем выше уровень — тем больше кешбек, тем раньше открываются скрытые тарифы и закрытые события.
          </motion.p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
          borderRight: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}>
          {tiers.map((tier, i) => (
            <TierCard key={tier.key} tier={tier} index={i} total={tiers.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
