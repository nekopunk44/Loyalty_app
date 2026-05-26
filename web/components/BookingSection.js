'use client';

import { useState } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { useRef } from 'react';

const PROPERTY_OPTIONS = [
  { id: '2', label: 'Стандарт — 150 PRB/ночь' },
  { id: '1', label: 'Люкс апартамент — 200 PRB/ночь' },
  { id: '3', label: 'Задний двор — 100 PRB/день' },
  { id: '4', label: 'Вся территория — 500 PRB/ночь' },
];

const PHONE = '37377812345'; // без +

const toWhatsApp = (data) => {
  const lines = [
    `*Запрос на бронирование — Villa Jaconda*`,
    ``,
    `🏠 *Номер:* ${PROPERTY_OPTIONS.find(p => p.id === data.propertyId)?.label ?? data.propertyId}`,
    `📅 *Заезд:* ${data.checkIn}`,
    `📅 *Выезд:* ${data.checkOut}`,
    `👥 *Гостей:* ${data.guests}`,
    `👤 *Имя:* ${data.name}`,
    `📞 *Телефон:* ${data.phone}`,
    data.notes ? `📝 *Пожелания:* ${data.notes}` : '',
  ].filter(Boolean).join('\n');

  return `https://wa.me/${PHONE}?text=${encodeURIComponent(lines)}`;
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--line-strong)',
  borderRadius: 2,
  padding: '14px 16px',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.3s ease',
};

const labelStyle = {
  fontSize: 11,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  display: 'block',
  marginBottom: 8,
};

export default function BookingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15%' });

  const [form, setForm] = useState({
    propertyId: '1',
    checkIn: '',
    checkOut: '',
    guests: '2',
    name: '',
    phone: '',
    notes: '',
  });
  const [sent, setSent] = useState(false);
  const [focus, setFocus] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.checkIn || !form.checkOut) return;
    window.open(toWhatsApp(form), '_blank', 'noopener');
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  const focusStyle = (name) => ({ ...inputStyle, borderColor: focus === name ? 'var(--gold)' : 'var(--line-strong)' });

  return (
    <section id="contact" ref={ref} className="section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
      <div className="container-x">

        <div style={{ display: 'grid', gap: 'clamp(48px, 8vw, 100px)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', alignItems: 'start' }}>

          {/* Left: heading + contacts */}
          <div>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9 }} className="eyebrow mb-6">
              — Бронирование
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1, delay: 0.1 }} className="font-display display-lg mb-10" style={{ maxWidth: '14ch' }}>
              Напишите нам — ответим за <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>час</em>
            </motion.h2>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.25 }}>
              <p style={{ color: 'var(--text-soft)', fontSize: 15, lineHeight: 1.75, maxWidth: 420, marginBottom: 40 }}>
                Заполните форму — заявка уйдёт в WhatsApp. Уточним детали, подберём дату и подтвердим бронь.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '📞', label: 'Телефон', value: '+373 778 12 345', href: 'tel:+37377812345' },
                  { icon: '✉️', label: 'Email', value: 'hello@villajaconda.com', href: 'mailto:hello@villajaconda.com' },
                  { icon: '📍', label: 'Адрес', value: 'г. Бендеры, Приднестровье', href: '#map' },
                ].map((c) => (
                  <div key={c.label} style={{ display: 'flex', gap: 14, alignItems: 'baseline', paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', width: 52, flexShrink: 0 }}>{c.label}</span>
                    <a href={c.href} className="font-display" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.2rem)', color: 'var(--text)', transition: 'color 0.3s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                    >
                      {c.value}
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: form */}
          <motion.form
            initial={{ opacity: 0, y: 32 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.2 }}
            onSubmit={handleSubmit}
            style={{
              padding: 'clamp(28px, 4vw, 48px)',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            <div>
              <label style={labelStyle}>Номер</label>
              <select value={form.propertyId} onChange={set('propertyId')} style={{ ...focusStyle('property'), cursor: 'pointer', appearance: 'none' }}
                onFocus={() => setFocus('property')} onBlur={() => setFocus(null)}>
                {PROPERTY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{p.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Заезд</label>
                <input type="date" required value={form.checkIn} onChange={set('checkIn')}
                  style={{ ...focusStyle('checkIn'), colorScheme: 'dark' }}
                  onFocus={() => setFocus('checkIn')} onBlur={() => setFocus(null)} />
              </div>
              <div>
                <label style={labelStyle}>Выезд</label>
                <input type="date" required value={form.checkOut} onChange={set('checkOut')}
                  style={{ ...focusStyle('checkOut'), colorScheme: 'dark' }}
                  onFocus={() => setFocus('checkOut')} onBlur={() => setFocus(null)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Количество гостей</label>
              <input type="number" min={1} max={30} value={form.guests} onChange={set('guests')}
                style={focusStyle('guests')}
                onFocus={() => setFocus('guests')} onBlur={() => setFocus(null)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Ваше имя</label>
                <input required type="text" placeholder="Иван" value={form.name} onChange={set('name')}
                  style={focusStyle('name')}
                  onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} />
              </div>
              <div>
                <label style={labelStyle}>Телефон</label>
                <input required type="tel" placeholder="+373 ..." value={form.phone} onChange={set('phone')}
                  style={focusStyle('phone')}
                  onFocus={() => setFocus('phone')} onBlur={() => setFocus(null)} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Пожелания</label>
              <textarea value={form.notes} onChange={set('notes')} rows={3}
                placeholder="Сауна, особый повод, пожелания по питанию..."
                style={{ ...focusStyle('notes'), resize: 'vertical', minHeight: 80 }}
                onFocus={() => setFocus('notes')} onBlur={() => setFocus(null)} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 13, padding: '18px 24px' }} data-cursor>
              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.span key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    Заявка отправлена в WhatsApp ✓
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    Отправить в WhatsApp
                    <span className="btn-arrow">→</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.6 }}>
              Нажимая «Отправить», вы переходите в WhatsApp с заполненным запросом
            </p>
          </motion.form>

        </div>
      </div>
    </section>
  );
}
