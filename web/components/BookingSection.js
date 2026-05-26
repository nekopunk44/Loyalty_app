'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useInView } from 'motion/react';

const ROOMS = [
  { id: '2', label: 'Стандарт',        price: '150 PRB / ночь' },
  { id: '1', label: 'Люкс апартамент', price: '200 PRB / ночь' },
  { id: '3', label: 'Задний двор',     price: '100 PRB / день' },
  { id: '4', label: 'Вся территория',  price: '500 PRB / ночь' },
];

const WA = '37377812345';

const buildWhatsApp = (f) => {
  const room = ROOMS.find(r => r.id === f.roomId);
  const msg = [
    `*Запрос на бронирование — Villa Jaconda*`,
    ``,
    `🏠 *Номер:* ${room?.label} (${room?.price})`,
    `📅 *Заезд:* ${f.checkIn}`,
    `📅 *Выезд:* ${f.checkOut}`,
    `👥 *Гостей:* ${f.guests}`,
    `👤 *Имя:* ${f.name}`,
    `📞 *Телефон:* ${f.phone}`,
    f.notes ? `📝 *Пожелания:* ${f.notes}` : null,
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
};

/* ────────── tiny Field helpers ────────── */
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 9 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const baseInput = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(212,164,94,0.2)',
  borderRadius: 2, padding: '13px 14px',
  color: 'var(--text)', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.25s ease, background 0.25s ease',
};

function Input({ focus, name, setFocus, ...props }) {
  return (
    <input
      {...props}
      style={{
        ...baseInput,
        borderColor: focus === name ? 'var(--gold)' : 'rgba(212,164,94,0.2)',
        background: focus === name ? 'rgba(212,164,94,0.05)' : 'rgba(255,255,255,0.03)',
      }}
      onFocus={() => setFocus(name)}
      onBlur={() => setFocus(null)}
    />
  );
}

function Select({ focus, name, setFocus, children, ...props }) {
  return (
    <select
      {...props}
      style={{
        ...baseInput,
        borderColor: focus === name ? 'var(--gold)' : 'rgba(212,164,94,0.2)',
        background: focus === name ? 'rgba(212,164,94,0.05)' : 'rgba(12,9,7,0.9)',
        appearance: 'none', cursor: 'pointer',
      }}
      onFocus={() => setFocus(name)}
      onBlur={() => setFocus(null)}
    >
      {children}
    </select>
  );
}

/* ────────── left panel perks ────────── */
const perks = [
  { num: '01', text: 'Ответим в WhatsApp в течение часа' },
  { num: '02', text: 'Подберём дату под ваши пожелания' },
  { num: '03', text: 'Баллы лояльности за каждое бронирование' },
];

export default function BookingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-12%' });

  const [f, setF] = useState({ roomId: '1', checkIn: '', checkOut: '', guests: '2', name: '', phone: '', notes: '' });
  const [focus, setFocus] = useState(null);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setF(prev => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.phone || !f.checkIn || !f.checkOut) return;
    window.open(buildWhatsApp(f), '_blank', 'noopener');
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section id="contact" ref={ref} style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))', minHeight: '80vh' }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 480 }}>
          {/* Background photo */}
          <Image
            src="/images/property1.png"
            alt="Villa Jaconda"
            fill sizes="50vw"
            quality={65}
            className="object-cover"
            style={{ opacity: 0.22 }}
          />
          {/* Dark gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,10,8,0.95) 30%, rgba(13,10,8,0.75) 100%)' }} />

          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,164,94,0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(48px, 7vw, 96px)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }} className="eyebrow mb-6">
                — Бронирование
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.1 }} className="font-display" style={{ fontSize: 'clamp(2.4rem, 4vw, 4rem)', lineHeight: 1.05, marginBottom: 28 }}>
                Напишите нам — ответим за <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>час</em>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.25 }} style={{ color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
                Заполните форму — заявка уйдёт в WhatsApp. Уточним детали, подберём дату и подтвердим бронь.
              </motion.p>
            </div>

            {/* Perks */}
            <div>
              {perks.map((p, i) => (
                <motion.div key={p.num} initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                  style={{ display: 'flex', gap: 20, alignItems: 'flex-start', paddingTop: 20, borderTop: i > 0 ? '1px solid var(--line)' : 'none', marginTop: i > 0 ? 0 : 0 }}>
                  <span className="font-display" style={{ fontSize: 13, color: 'var(--gold)', letterSpacing: '0.1em', flexShrink: 0, lineHeight: 1.6 }}>{p.num}</span>
                  <p style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.55 }}>{p.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Contact links */}
            <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 1, delay: 0.7 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 40 }}>
              {[
                { label: 'WhatsApp', val: '+373 778 12 345', href: `https://wa.me/${WA}` },
                { label: 'Email',    val: 'hello@villajaconda.com', href: 'mailto:hello@villajaconda.com' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)', width: 60, flexShrink: 0 }}>{c.label}</span>
                  <a href={c.href} style={{ fontSize: 14, color: 'var(--text-soft)', transition: 'color 0.3s ease' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-soft)'}>
                    {c.val}
                  </a>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ── RIGHT PANEL — form ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.15 }}
          style={{ background: 'var(--surface)', padding: 'clamp(48px, 7vw, 96px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1px solid var(--line)' }}
        >
          <p style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>— Заявка</p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Выберите номер">
              <Select name="room" focus={focus} setFocus={setFocus} value={f.roomId} onChange={set('roomId')}>
                {ROOMS.map(r => (
                  <option key={r.id} value={r.id} style={{ background: '#15110e' }}>{r.label} — {r.price}</option>
                ))}
              </Select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Заезд">
                <Input type="date" name="in" focus={focus} setFocus={setFocus} required value={f.checkIn} onChange={set('checkIn')} style={{ colorScheme: 'dark' }} />
              </Field>
              <Field label="Выезд">
                <Input type="date" name="out" focus={focus} setFocus={setFocus} required value={f.checkOut} onChange={set('checkOut')} style={{ colorScheme: 'dark' }} />
              </Field>
            </div>

            <Field label="Количество гостей">
              <Input type="number" name="guests" min={1} max={30} focus={focus} setFocus={setFocus} value={f.guests} onChange={set('guests')} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Ваше имя">
                <Input type="text" name="name" focus={focus} setFocus={setFocus} required placeholder="Иван" value={f.name} onChange={set('name')} />
              </Field>
              <Field label="Телефон">
                <Input type="tel" name="phone" focus={focus} setFocus={setFocus} required placeholder="+373 ..." value={f.phone} onChange={set('phone')} />
              </Field>
            </div>

            <Field label="Пожелания">
              <textarea
                rows={3}
                placeholder="Сауна, особый повод, пожелания по питанию..."
                value={f.notes}
                onChange={set('notes')}
                onFocus={() => setFocus('notes')}
                onBlur={() => setFocus(null)}
                style={{
                  ...baseInput,
                  borderColor: focus === 'notes' ? 'var(--gold)' : 'rgba(212,164,94,0.2)',
                  background: focus === 'notes' ? 'rgba(212,164,94,0.05)' : 'rgba(255,255,255,0.03)',
                  resize: 'vertical', minHeight: 80,
                }}
              />
            </Field>

            <button type="submit" data-cursor style={{
              marginTop: 8,
              padding: '17px 24px',
              background: 'var(--gold)', color: 'var(--bg)',
              border: 'none', borderRadius: 2,
              fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
              fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              transition: 'background 0.3s ease, transform 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-light)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; }}
            >
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.span key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    Открыто в WhatsApp ✓
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    Отправить запрос →
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Нажимая кнопку, вы переходите в WhatsApp с заполненной заявкой
            </p>
          </form>
        </motion.div>

      </div>
    </section>
  );
}
