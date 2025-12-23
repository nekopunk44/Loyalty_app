'use client';
import { useState, useCallback } from 'react';
import Icon from './ui/Icon';

const BOOKING_NAVY  = '#063B5C';
const BOOKING_TEAL  = '#14B8A6';
const BOOKING_CORAL = '#FF6B35';

const WA = '37377812345';

const ROOM_OPTIONS = [
  { id: 'standart', label: 'Стандарт',       tag: 'Studio',    price: '150 PRB/ночь', guests: 10, cover: '/images/std1.png' },
  { id: 'luks',     label: 'Люкс',           tag: 'Premium',   price: '200 PRB/ночь', guests: 20, cover: '/images/luks1.png' },
  { id: 'zad',      label: 'Задний двор',    tag: 'Outdoor',   price: '100 PRB/день', guests: 15, cover: '/images/zad1.png' },
  { id: 'full',     label: 'Вся территория', tag: 'Exclusive', price: '500 PRB/ночь', guests: 30, cover: '/images/luks2.png' },
];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function toDateStr(d) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}
function formatRu(d) {
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}
function sameDay(a,b) { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function inRange(d, s, e) { return s && e && d > s && d < e; }

/* ── Calendar subcomponent ── */
function BookingCal({ checkIn, checkOut, onChange }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(() => {
    const d = checkIn || today;
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [hovered, setHovered] = useState(null);

  const firstDay = new Date(view.year, view.month, 1);
  const lastDay  = new Date(view.year, view.month+1, 0);
  // adjust: Mon=0
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(view.year, view.month, d));

  const prevMonth = () => setView(v => { const d = new Date(v.year, v.month-1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const nextMonth = () => setView(v => { const d = new Date(v.year, v.month+1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });

  const handleClick = useCallback((day) => {
    if (!day || day < today) return;
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: day, checkOut: null });
    } else {
      if (day <= checkIn) { onChange({ checkIn: day, checkOut: null }); return; }
      onChange({ checkIn, checkOut: day });
    }
  }, [checkIn, checkOut, onChange, today]);

  const isStart  = (d) => sameDay(d, checkIn);
  const isEnd    = (d) => sameDay(d, checkOut);
  const isInR    = (d) => checkIn && (checkOut ? inRange(d, checkIn, checkOut) : (hovered && d > checkIn && d < hovered));
  const isPast   = (d) => d < today;
  const isWeekend = (d) => { const dow = d.getDay(); return dow === 0 || dow === 6; };

  return (
    <div style={{ fontFamily: 'var(--r-sans)', userSelect: 'none' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--r-text)', padding: 6, borderRadius: 6, fontSize: 18, lineHeight: 1 }}>‹</button>
        <span style={{ fontFamily: 'var(--r-serif)', fontSize: 18, fontWeight: 300, color: 'var(--r-text)' }}>
          {MONTHS_RU[view.month]} {view.year}
        </span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--r-text)', padding: 6, borderRadius: 6, fontSize: 18, lineHeight: 1 }}>›</button>
      </div>
      {/* weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.12em', color: 'var(--r-muted)', padding: '4px 0' }}>{w}</div>
        ))}
      </div>
      {/* cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const start  = isStart(day);
          const end    = isEnd(day);
          const inR    = isInR(day);
          const past   = isPast(day);
          const wkend  = isWeekend(day);
          const bg = start || end ? BOOKING_TEAL : inR ? `${BOOKING_TEAL}22` : 'transparent';
          const color  = start || end ? '#fff' : past ? 'var(--r-muted)' : wkend ? BOOKING_CORAL : 'var(--r-text)';
          return (
            <button key={day.toISOString()} onClick={() => handleClick(day)}
              onMouseEnter={() => setHovered(day)} onMouseLeave={() => setHovered(null)}
              disabled={past}
              style={{ background: bg, border: 'none', borderRadius: 6, padding: '9px 4px', textAlign: 'center', cursor: past ? 'default' : 'pointer', fontSize: 13, color, fontWeight: start || end ? 600 : 400, transition: 'background 0.15s ease', opacity: past ? 0.35 : 1 }}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {/* legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--r-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: BOOKING_TEAL }} />
          <span style={{ fontSize: 11, color: 'var(--r-muted)' }}>Заезд / Выезд</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: BOOKING_CORAL }} />
          <span style={{ fontSize: 11, color: 'var(--r-muted)' }}>Выходные</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function BookingSection() {
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dates, setDates] = useState({ checkIn: null, checkOut: null });
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [focus, setFocus] = useState(null);
  const [sent, setSent] = useState(false);

  const roomObj = ROOM_OPTIONS.find(r => r.id === selectedRoom);

  const nightCount = () => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    return Math.round((dates.checkOut - dates.checkIn) / 86400000);
  };

  const buildWAMsg = () => {
    const lines = [
      `*Запрос на бронирование — Villa Jaconda*`,
      ``,
      `🏠 *Номер:* ${roomObj?.label} (${roomObj?.price})`,
      `📅 *Заезд:* ${formatRu(dates.checkIn)}`,
      `📅 *Выезд:* ${formatRu(dates.checkOut)}`,
      `👥 *Гостей:* ${guests}`,
      `👤 *Имя:* ${form.name}`,
      `📞 *Телефон:* ${form.phone}`,
      form.notes ? `📝 *Пожелания:* ${form.notes}` : null,
    ].filter(Boolean).join('\n');
    return `https://wa.me/${WA}?text=${encodeURIComponent(lines)}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !dates.checkIn || !dates.checkOut || !selectedRoom) return;
    window.open(buildWAMsg(), '_blank', 'noopener');
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  const inputStyle = (name) => ({
    width: '100%', boxSizing: 'border-box',
    background: focus === name ? 'rgba(20,184,166,0.04)' : 'rgba(255,255,255,0.6)',
    border: `1px solid ${focus === name ? BOOKING_TEAL : 'var(--r-line-strong)'}`,
    borderRadius: 8, padding: '12px 14px',
    color: 'var(--r-text)', fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.25s ease, background 0.25s ease',
  });

  return (
    <section id="contact" style={{ background: 'var(--r-surface-warm)', borderTop: '1px solid var(--r-line)', paddingTop: 'clamp(80px,10vw,140px)', paddingBottom: 'clamp(80px,10vw,140px)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)' }}>

        {/* Section header */}
        <div style={{ marginBottom: 'clamp(40px,6vw,64px)' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-gold)', fontWeight: 500, marginBottom: 14 }}>— Бронирование</p>
          <h2 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.4rem,5vw,4.5rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--r-text)', margin: 0 }}>
            Напишите нам — ответим за <em style={{ fontStyle: 'italic', color: 'var(--r-gold)' }}>час</em>
          </h2>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderBottom: '1px solid var(--r-line)' }}>
          {[{ n: 1, label: 'Выберите номер' }, { n: 2, label: 'Выберите даты' }, { n: 3, label: 'Ваши данные' }].map(s => (
            <button key={s.n} onClick={() => { if (s.n < step || (s.n === 2 && selectedRoom) || (s.n === 3 && dates.checkIn && dates.checkOut)) setStep(s.n); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px 14px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: `2px solid ${step === s.n ? BOOKING_TEAL : 'transparent'}`, marginBottom: -1, transition: 'border-color 0.3s ease' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s.n ? BOOKING_TEAL : 'var(--r-line-strong)', color: step >= s.n ? '#fff' : 'var(--r-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, transition: 'all 0.3s ease', flexShrink: 0 }}>
                {step > s.n ? <Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> : s.n}
              </div>
              <span style={{ fontSize: 13, letterSpacing: '0.06em', color: step === s.n ? 'var(--r-text)' : 'var(--r-muted)', fontWeight: step === s.n ? 500 : 400 }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="booking-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(auto,340px)', gap: 'clamp(24px,4vw,48px)', alignItems: 'start' }}>

          {/* LEFT: steps content */}
          <div>
            {/* STEP 1: Room selection */}
            {step === 1 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px,100%),1fr))', gap: 16 }}>
                  {ROOM_OPTIONS.map(room => (
                    <button key={room.id} onClick={() => { setSelectedRoom(room.id); setStep(2); }}
                      style={{ textAlign: 'left', background: selectedRoom === room.id ? `${BOOKING_TEAL}10` : 'var(--r-surface)', border: `2px solid ${selectedRoom === room.id ? BOOKING_TEAL : 'var(--r-line)'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.3s ease', padding: 0 }}>
                      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                        <img src={room.cover} alt={room.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: 10, right: 10, background: BOOKING_NAVY, color: '#fff', fontSize: 10, padding: '4px 10px', borderRadius: 999, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{room.tag}</div>
                      </div>
                      <div style={{ padding: '16px 18px' }}>
                        <p style={{ fontFamily: 'var(--r-serif)', fontSize: 20, fontWeight: 300, color: 'var(--r-text)', margin: '0 0 6px' }}>{room.label}</p>
                        <p style={{ fontSize: 13, color: BOOKING_TEAL, fontWeight: 500, margin: '0 0 4px' }}>{room.price}</p>
                        <p style={{ fontSize: 11, color: 'var(--r-muted)', margin: 0 }}>до {room.guests} гостей</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Calendar */}
            {step === 2 && (
              <div>
                <div style={{ background: 'var(--r-surface)', borderRadius: 12, padding: 'clamp(24px,3vw,40px)', border: '1px solid var(--r-line)', maxWidth: 480 }}>
                  <BookingCal
                    checkIn={dates.checkIn}
                    checkOut={dates.checkOut}
                    onChange={(d) => setDates(d)}
                  />
                </div>
                {dates.checkIn && dates.checkOut && (
                  <div style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${BOOKING_TEAL}12`, padding: '12px 18px', borderRadius: 8, border: `1px solid ${BOOKING_TEAL}30` }}>
                      <Icon name="calendar" size={15} color={BOOKING_TEAL} />
                      <span style={{ fontSize: 14, color: 'var(--r-text)', fontWeight: 500 }}>
                        {formatRu(dates.checkIn)} → {formatRu(dates.checkOut)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--r-muted)' }}>({nightCount()} ноч.)</span>
                    </div>
                    <button onClick={() => setStep(3)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: BOOKING_NAVY, color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = BOOKING_TEAL}
                      onMouseLeave={e => e.currentTarget.style.background = BOOKING_NAVY}>
                      Далее →
                    </button>
                  </div>
                )}
                {!dates.checkOut && (
                  <p style={{ marginTop: 16, fontSize: 13, color: 'var(--r-muted)' }}>
                    {dates.checkIn ? 'Выберите дату выезда' : 'Выберите дату заезда'}
                  </p>
                )}
              </div>
            )}

            {/* STEP 3: Contact form */}
            {step === 3 && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
                {/* Guest stepper */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 10 }}>
                    Количество гостей
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--r-line-strong)', background: 'transparent', color: 'var(--r-text)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = BOOKING_NAVY; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--r-text)'; }}>
                      −
                    </button>
                    <span style={{ fontFamily: 'var(--r-serif)', fontSize: 28, color: 'var(--r-text)', minWidth: 40, textAlign: 'center' }}>{guests}</span>
                    <button type="button" onClick={() => setGuests(g => Math.min(roomObj?.guests || 30, g + 1))}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--r-line-strong)', background: 'transparent', color: 'var(--r-text)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = BOOKING_NAVY; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--r-text)'; }}>
                      +
                    </button>
                    {roomObj && <span style={{ fontSize: 12, color: 'var(--r-muted)' }}>макс. {roomObj.guests}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 9 }}>Ваше имя</label>
                    <input type="text" required placeholder="Иван" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} style={inputStyle('name')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 9 }}>Телефон</label>
                    <input type="tel" required placeholder="+373 ..." value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                      onFocus={() => setFocus('phone')} onBlur={() => setFocus(null)} style={inputStyle('phone')} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 9 }}>Пожелания</label>
                  <textarea rows={3} placeholder="Сауна, особый повод, пожелания по питанию..." value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    onFocus={() => setFocus('notes')} onBlur={() => setFocus(null)}
                    style={{ ...inputStyle('notes'), resize: 'vertical', minHeight: 80 }} />
                </div>

                <button type="submit"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 28px', background: sent ? BOOKING_TEAL : BOOKING_NAVY, color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s ease' }}
                  onMouseEnter={e => { if (!sent) e.currentTarget.style.background = BOOKING_TEAL; }}
                  onMouseLeave={e => { if (!sent) e.currentTarget.style.background = BOOKING_NAVY; }}>
                  <Icon name="message-circle" size={16} color="#fff" strokeWidth={1.5} />
                  {sent ? 'Открыто в WhatsApp ✓' : 'Отправить в WhatsApp →'}
                </button>

                <p style={{ fontSize: 11, color: 'var(--r-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                  Нажимая кнопку, вы переходите в WhatsApp с заполненной заявкой
                </p>
              </form>
            )}
          </div>

          {/* RIGHT: sticky summary */}
          <div style={{ position: 'sticky', top: 88 }}>
            <div style={{ background: BOOKING_NAVY, borderRadius: 16, padding: 'clamp(24px,3vw,36px)', color: '#fff', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `${BOOKING_TEAL}20`, pointerEvents: 'none' }} />

              <p style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: `${BOOKING_TEAL}`, marginBottom: 20 }}>— Ваш выбор</p>

              {/* Room */}
              {roomObj ? (
                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 100, marginBottom: 12 }}>
                    <img src={roomObj.cover} alt={roomObj.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                  </div>
                  <p style={{ fontFamily: 'var(--r-serif)', fontSize: 20, fontWeight: 300, color: '#fff', margin: '0 0 4px' }}>{roomObj.label}</p>
                  <p style={{ fontSize: 13, color: BOOKING_TEAL, margin: 0 }}>{roomObj.price}</p>
                </div>
              ) : (
                <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.4 }}>
                  <Icon name="home" size={20} color="#fff" strokeWidth={1} />
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Номер не выбран</p>
                </div>
              )}

              {/* Dates */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: dates.checkIn ? 1 : 0.4 }}>
                  <Icon name="calendar" size={14} color={BOOKING_TEAL} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    {dates.checkIn ? formatRu(dates.checkIn) : 'Заезд не выбран'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: dates.checkOut ? 1 : 0.4 }}>
                  <Icon name="calendar" size={14} color={BOOKING_CORAL} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    {dates.checkOut ? formatRu(dates.checkOut) : 'Выезд не выбран'}
                  </span>
                </div>
              </div>

              {/* Nights + guests */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Ночей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontSize: 24, color: '#fff', margin: 0 }}>{nightCount() || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Гостей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontSize: 24, color: '#fff', margin: 0 }}>{guests}</p>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', background: `${BOOKING_TEAL}20`, color: BOOKING_TEAL, borderRadius: 8, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, border: `1px solid ${BOOKING_TEAL}40`, transition: 'background 0.3s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${BOOKING_TEAL}35`}
                  onMouseLeave={e => e.currentTarget.style.background = `${BOOKING_TEAL}20`}>
                  <Icon name="message-circle" size={14} color={BOOKING_TEAL} strokeWidth={1.5} />
                  Написать напрямую
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Ответим в течение часа</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
