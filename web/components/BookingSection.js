'use client';
import { useState, useCallback } from 'react';
import Icon from './ui/Icon';

const GOLD       = '#d4a45e';
const GOLD_DIM   = 'rgba(212,164,94,0.55)';
const CREAM      = '#f5ede0';
const BG_DARK    = '#0a0805';
const PANEL_DARK = 'linear-gradient(135deg, #0c0905 0%, #110d08 100%)';
const INSTAGRAM_URL = 'https://www.instagram.com/villa_jaconda_relax?igsh=MXhwY21lc2k1NW44';
const WA = '3737791002';

const ROOM_OPTIONS = [
  { id: 'standart', num: '01', label: 'Стандарт',       tag: 'Studio',    price: '150', unit: 'ночь', guests: 10, cover: '/images/std1.jpg' },
  { id: 'luks',     num: '02', label: 'Люкс',           tag: 'Premium',   price: '200', unit: 'ночь', guests: 20, cover: '/images/luks1.jpg' },
  { id: 'zad',      num: '03', label: 'Задний двор',    tag: 'Outdoor',   price: '100', unit: 'день', guests: 15, cover: '/images/zad1.jpg' },
  { id: 'full',     num: '04', label: 'Вся территория', tag: 'Exclusive', price: '500', unit: 'ночь', guests: 30, cover: '/images/luks2.jpg' },
];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS  = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function formatRu(d) {
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}
function sameDay(a,b) { return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function inRange(d, s, e) { return s && e && d > s && d < e; }

function BookingCal({ checkIn, checkOut, onChange }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(() => {
    const d = checkIn || today;
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [hovered, setHovered] = useState(null);

  const firstDay = new Date(view.year, view.month, 1);
  const lastDay  = new Date(view.year, view.month+1, 0);
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

  return (
    <div style={{ fontFamily: 'var(--r-sans)', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <button onClick={prevMonth} style={{ background: 'transparent', border: '1px solid rgba(212,164,94,0.2)', cursor: 'pointer', color: CREAM, padding: '6px 12px', borderRadius: 999, fontSize: 14, lineHeight: 1, transition: 'all 0.25s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.12)'; e.currentTarget.style.borderColor = GOLD_DIM; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.2)'; }}>‹</button>
        <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 300, color: CREAM, letterSpacing: '0.02em' }}>
          {MONTHS_RU[view.month]} <span style={{ color: GOLD }}>{view.year}</span>
        </span>
        <button onClick={nextMonth} style={{ background: 'transparent', border: '1px solid rgba(212,164,94,0.2)', cursor: 'pointer', color: CREAM, padding: '6px 12px', borderRadius: 999, fontSize: 14, lineHeight: 1, transition: 'all 0.25s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.12)'; e.currentTarget.style.borderColor = GOLD_DIM; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(212,164,94,0.2)'; }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, padding: '6px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const start = isStart(day);
          const end   = isEnd(day);
          const inR   = isInR(day);
          const past  = isPast(day);
          const bg = start || end ? GOLD : inR ? `${GOLD}1c` : 'transparent';
          const color = start || end ? BG_DARK : past ? 'rgba(245,237,224,0.18)' : 'rgba(245,237,224,0.88)';
          return (
            <button key={day.toISOString()} onClick={() => handleClick(day)}
              onMouseEnter={() => setHovered(day)} onMouseLeave={() => setHovered(null)}
              disabled={past}
              style={{
                background: bg, border: 'none', borderRadius: 8,
                padding: '11px 4px', textAlign: 'center',
                cursor: past ? 'default' : 'pointer',
                fontFamily: 'var(--r-serif)', fontSize: 14,
                color, fontWeight: start || end ? 500 : 300,
                transition: 'background 0.2s ease, transform 0.2s ease',
                fontStyle: start || end ? 'italic' : 'normal',
              }}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
      `🏠 *Номер:* ${roomObj?.label} (от ${roomObj?.price} PRB / ${roomObj?.unit})`,
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
    background: focus === name ? 'rgba(212,164,94,0.08)' : 'rgba(245,237,224,0.04)',
    border: `1px solid ${focus === name ? GOLD : 'rgba(245,237,224,0.12)'}`,
    borderRadius: 10, padding: '14px 16px',
    color: CREAM, fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.25s ease, background 0.25s ease',
  });

  return (
    <section id="contact" style={{
      background: BG_DARK,
      paddingTop: 'clamp(90px,11vw,160px)',
      paddingBottom: 'clamp(90px,11vw,160px)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes bkFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .booking-grid { display: grid; gap: clamp(28px,4vw,56px); grid-template-columns: minmax(0,1fr) minmax(0, 340px); align-items: start; }
        @media (max-width: 980px) { .booking-grid { grid-template-columns: 1fr !important; } .booking-summary { position: relative !important; top: 0 !important; } }
        .bk-input::placeholder { color: rgba(245,237,224,0.3); }
        .room-card-bk:hover { transform: translateY(-4px); }
      `}</style>

      {/* Decorative golden circles */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-12%',
        width: 540, height: 540, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,164,94,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', position: 'relative' }}>

        {/* Section header */}
        <div style={{ marginBottom: 'clamp(40px,5vw,64px)', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ width: 22, height: 1, background: GOLD, opacity: 0.55 }} />
            <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD_DIM }}>
              Бронирование · Заявка
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(2.6rem,5vw,4.8rem)',
            fontWeight: 300, lineHeight: 1, letterSpacing: '-0.025em',
            color: CREAM, margin: 0,
          }}>
            Напишите нам — ответим за <em style={{ fontStyle: 'italic', color: GOLD }}>час</em>
          </h2>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderBottom: '1px solid rgba(212,164,94,0.15)' }}>
          {[{ n: 1, label: 'Выберите формат' }, { n: 2, label: 'Выберите даты' }, { n: 3, label: 'Ваши данные' }].map(s => (
            <button key={s.n} onClick={() => { if (s.n < step || (s.n === 2 && selectedRoom) || (s.n === 3 && dates.checkIn && dates.checkOut)) setStep(s.n); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 28px 16px 0', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                borderBottom: `2px solid ${step === s.n ? GOLD : 'transparent'}`,
                marginBottom: -1, transition: 'border-color 0.3s ease',
              }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: step >= s.n ? GOLD : 'transparent',
                border: `1px solid ${step >= s.n ? GOLD : 'rgba(245,237,224,0.2)'}`,
                color: step >= s.n ? BG_DARK : 'rgba(245,237,224,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                fontSize: 13, fontWeight: 500,
                transition: 'all 0.3s ease', flexShrink: 0,
              }}>
                {step > s.n ? <Icon name="check" size={13} color={BG_DARK} strokeWidth={2.5} /> : s.n}
              </div>
              <span style={{
                fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
                color: step === s.n ? CREAM : 'rgba(245,237,224,0.4)',
                fontWeight: step === s.n ? 500 : 400,
              }}>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="booking-grid">

          {/* LEFT: steps content */}
          <div style={{ minWidth: 0 }}>

            {/* STEP 1: Room selection */}
            {step === 1 && (
              <div style={{ animation: 'bkFade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 18 }}>
                  {ROOM_OPTIONS.map(room => {
                    const isSel = selectedRoom === room.id;
                    return (
                      <button key={room.id} className="room-card-bk"
                        onClick={() => { setSelectedRoom(room.id); setStep(2); }}
                        style={{
                          textAlign: 'left',
                          background: PANEL_DARK,
                          border: `1px solid ${isSel ? GOLD : 'rgba(212,164,94,0.12)'}`,
                          borderRadius: 14, overflow: 'hidden',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                          padding: 0, position: 'relative',
                          boxShadow: isSel ? `0 20px 50px ${GOLD}26, 0 0 0 1px ${GOLD}40` : 'none',
                        }}>
                        <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
                          <img src={room.cover} alt={room.label}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease', transform: isSel ? 'scale(1.03)' : 'scale(1)' }} />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(180deg, transparent 40%, rgba(8,6,4,0.85) 100%)',
                          }} />
                          <div style={{
                            position: 'absolute', top: 14, left: 14,
                            fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                            fontSize: 12, letterSpacing: '0.22em',
                            color: GOLD, textTransform: 'none',
                          }}>{room.num}</div>
                          <div style={{
                            position: 'absolute', top: 14, right: 14,
                            background: 'rgba(8,6,4,0.6)', backdropFilter: 'blur(8px)',
                            color: GOLD, fontSize: 9, padding: '5px 12px',
                            borderRadius: 999, letterSpacing: '0.24em', textTransform: 'uppercase',
                            border: '1px solid rgba(212,164,94,0.3)',
                          }}>{room.tag}</div>
                          <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                            <p style={{
                              fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                              fontSize: 26, fontWeight: 300, color: CREAM,
                              margin: 0, lineHeight: 1, letterSpacing: '-0.01em',
                            }}>{room.label}</p>
                          </div>
                        </div>
                        <div style={{ padding: '16px 20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(245,237,224,0.4)', margin: '0 0 4px' }}>от</p>
                            <p style={{ fontFamily: 'var(--r-serif)', fontSize: 18, color: GOLD, margin: 0 }}>
                              {room.price} <span style={{ fontSize: 11, color: 'rgba(245,237,224,0.5)' }}>PRB / {room.unit}</span>
                            </p>
                          </div>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
                            color: 'rgba(245,237,224,0.55)',
                          }}>
                            до {room.guests}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Calendar */}
            {step === 2 && (
              <div style={{ animation: 'bkFade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div style={{
                  background: PANEL_DARK,
                  borderRadius: 14,
                  padding: 'clamp(24px,3vw,40px)',
                  border: '1px solid rgba(212,164,94,0.12)',
                  maxWidth: 520,
                }}>
                  <BookingCal checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={(d) => setDates(d)} />
                </div>
                {dates.checkIn && dates.checkOut && (
                  <div style={{ marginTop: 22, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'rgba(212,164,94,0.10)',
                      padding: '12px 18px', borderRadius: 999,
                      border: '1px solid rgba(212,164,94,0.3)',
                    }}>
                      <Icon name="calendar" size={14} color={GOLD} />
                      <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 14, color: CREAM }}>
                        {formatRu(dates.checkIn)} → {formatRu(dates.checkOut)}
                      </span>
                      <span style={{ fontSize: 11, color: GOLD_DIM, letterSpacing: '0.16em' }}>({nightCount()} ноч.)</span>
                    </div>
                    <button onClick={() => setStep(3)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10,
                        padding: '12px 24px', background: GOLD, color: BG_DARK,
                        border: 'none', borderRadius: 999,
                        fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase',
                        fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,164,94,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      Далее →
                    </button>
                  </div>
                )}
                {!dates.checkOut && (
                  <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(245,237,224,0.55)', fontStyle: 'italic', fontFamily: 'var(--r-serif)' }}>
                    {dates.checkIn ? 'Выберите дату выезда' : 'Выберите дату заезда'}
                  </p>
                )}
              </div>
            )}

            {/* STEP 3: Contact form */}
            {step === 3 && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 600, animation: 'bkFade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 12 }}>
                    Количество гостей
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        border: '1px solid rgba(245,237,224,0.2)', background: 'transparent',
                        color: CREAM, cursor: 'pointer', fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.2)'; }}>
                      −
                    </button>
                    <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 32, color: CREAM, minWidth: 50, textAlign: 'center', fontWeight: 300 }}>{guests}</span>
                    <button type="button" onClick={() => setGuests(g => Math.min(roomObj?.guests || 30, g + 1))}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        border: '1px solid rgba(245,237,224,0.2)', background: 'transparent',
                        color: CREAM, cursor: 'pointer', fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.2)'; }}>
                      +
                    </button>
                    {roomObj && <span style={{ fontSize: 11, color: GOLD_DIM, letterSpacing: '0.16em', textTransform: 'uppercase' }}>макс. {roomObj.guests}</span>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 10 }}>Ваше имя</label>
                    <input className="bk-input" type="text" required placeholder="Иван" value={form.name}
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} style={inputStyle('name')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 10 }}>Телефон</label>
                    <input className="bk-input" type="tel" required placeholder="+373 ..." value={form.phone}
                      onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                      onFocus={() => setFocus('phone')} onBlur={() => setFocus(null)} style={inputStyle('phone')} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 10 }}>Пожелания</label>
                  <textarea className="bk-input" rows={3} placeholder="Сауна, особый повод, пожелания по питанию..."
                    value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    onFocus={() => setFocus('notes')} onBlur={() => setFocus(null)}
                    style={{ ...inputStyle('notes'), resize: 'vertical', minHeight: 90 }} />
                </div>

                <button type="submit"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    padding: '18px 32px', background: sent ? '#4ade80' : GOLD,
                    color: BG_DARK, border: 'none', borderRadius: 999,
                    fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
                    fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 30px rgba(212,164,94,0.3)',
                  }}
                  onMouseEnter={e => { if (!sent) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(212,164,94,0.45)'; } }}
                  onMouseLeave={e => { if (!sent) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(212,164,94,0.3)'; } }}>
                  <Icon name="message-circle" size={15} color={BG_DARK} strokeWidth={1.8} />
                  {sent ? 'Открыто в WhatsApp ✓' : 'Отправить заявку →'}
                </button>

                <p style={{ fontSize: 11, color: GOLD_DIM, textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.06em' }}>
                  Нажимая кнопку, вы переходите в WhatsApp с заполненной заявкой
                </p>
              </form>
            )}
          </div>

          {/* RIGHT: sticky summary */}
          <div className="booking-summary" style={{ position: 'sticky', top: 96, minWidth: 0 }}>
            <div style={{
              background: PANEL_DARK,
              borderRadius: 16,
              padding: 'clamp(24px,3vw,32px)',
              color: CREAM, overflow: 'hidden', position: 'relative',
              border: '1px solid rgba(212,164,94,0.18)',
            }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}20 0%, transparent 70%)`, pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, position: 'relative' }}>
                <div style={{ width: 16, height: 1, background: GOLD, opacity: 0.7 }} />
                <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD }}>Ваш выбор</span>
              </div>

              {roomObj ? (
                <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid rgba(212,164,94,0.12)', position: 'relative' }}>
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 120, marginBottom: 14 }}>
                    <img src={roomObj.cover} alt={roomObj.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(8,6,4,0.7) 100%)' }} />
                    <span style={{ position: 'absolute', top: 10, left: 12, fontFamily: 'var(--r-serif)', fontStyle: 'italic', color: GOLD, fontSize: 11, letterSpacing: '0.2em' }}>
                      {roomObj.num}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 300, color: CREAM, margin: '0 0 4px' }}>{roomObj.label}</p>
                  <p style={{ fontSize: 12, color: GOLD, margin: 0, letterSpacing: '0.04em' }}>от {roomObj.price} PRB / {roomObj.unit}</p>
                </div>
              ) : (
                <div style={{ marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid rgba(212,164,94,0.12)', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.45 }}>
                  <Icon name="home" size={18} color={CREAM} strokeWidth={1} />
                  <p style={{ fontSize: 13, color: 'rgba(245,237,224,0.55)', margin: 0, fontStyle: 'italic', fontFamily: 'var(--r-serif)' }}>Формат не выбран</p>
                </div>
              )}

              <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(212,164,94,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, opacity: dates.checkIn ? 1 : 0.4 }}>
                  <Icon name="calendar" size={13} color={GOLD} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: 'rgba(245,237,224,0.78)', fontFamily: 'var(--r-serif)', fontStyle: 'italic' }}>
                    {dates.checkIn ? formatRu(dates.checkIn) : 'Заезд не выбран'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: dates.checkOut ? 1 : 0.4 }}>
                  <Icon name="calendar" size={13} color={GOLD_DIM} strokeWidth={1.5} />
                  <span style={{ fontSize: 13, color: 'rgba(245,237,224,0.78)', fontFamily: 'var(--r-serif)', fontStyle: 'italic' }}>
                    {dates.checkOut ? formatRu(dates.checkOut) : 'Выезд не выбран'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(212,164,94,0.12)' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 6 }}>Ночей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: CREAM, margin: 0, fontWeight: 300 }}>{nightCount() || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 6 }}>Гостей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: CREAM, margin: 0, fontWeight: 300 }}>{guests}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    padding: '14px 22px',
                    background: 'rgba(212,164,94,0.12)',
                    color: GOLD,
                    borderRadius: 999, fontSize: 10, letterSpacing: '0.28em',
                    textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500,
                    border: '1px solid rgba(212,164,94,0.4)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,164,94,0.12)'; e.currentTarget.style.color = GOLD; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                  Написать напрямую
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, color: GOLD_DIM, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Ответим в течение часа</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
