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

const SAUNA_PRICE = 250;
const KITCHEN_PRICE = 100;
const EXTRA_GUEST_PRICE = 150;

const ROOM_OPTIONS = [
  { id: 'standart', num: '01', label: 'Стандарт',       tag: 'Studio',    price: 150, unit: 'ночь', guests: 10,
    desc: 'Студия с террасой, бассейном и сауной. Камерный формат для пары или небольшой компании.',
    amenities: ['WiFi', 'Бассейн', 'Сауна', 'Мангал', 'Парковка'],
    cover: '/images/std1.jpg' },
  { id: 'luks',     num: '02', label: 'Люкс',           tag: 'Premium',   price: 200, unit: 'ночь', guests: 20,
    desc: 'Десять комнат, большой зал и собственная кухня. Гибкий формат для крупной компании.',
    amenities: ['WiFi', 'Кухня', 'Сауна', 'Бассейн', 'Караоке', 'Большой зал'],
    cover: '/images/luks1.jpg' },
  { id: 'zad',      num: '03', label: 'Задний двор',    tag: 'Outdoor',   price: 100, unit: 'день', guests: 15,
    desc: 'Открытая территория с бассейном, беседкой и мангальной зоной. Идеальный день под открытым небом.',
    amenities: ['Бассейн', 'Беседка', 'Мангал', 'Шезлонги', 'Караоке'],
    cover: '/images/zad1.jpg' },
  { id: 'full',     num: '04', label: 'Вся территория', tag: 'Exclusive', price: 500, unit: 'ночь', guests: 30,
    desc: 'Полный выкуп виллы со всеми форматами. Закрытое пространство для большого события.',
    amenities: ['Все удобства', 'Кухня', 'Сауна', 'Бассейн', 'Большой зал', 'Беседка'],
    cover: '/images/luks2.jpg' },
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
  const [saunaHours, setSaunaHours] = useState(0);
  const [kitchenware, setKitchenware] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [focus, setFocus] = useState(null);
  const [sent, setSent] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  const roomObj = ROOM_OPTIONS.find(r => r.id === selectedRoom);
  const nightCount = () => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    return Math.round((dates.checkOut - dates.checkIn) / 86400000);
  };

  const extraGuests = roomObj ? Math.max(0, guests - roomObj.guests) : 0;
  const extraGuestsFee = extraGuests * EXTRA_GUEST_PRICE;
  const saunaFee = saunaHours * SAUNA_PRICE;
  const kitchenFee = kitchenware ? KITCHEN_PRICE : 0;
  const baseFee = roomObj ? roomObj.price * Math.max(1, nightCount()) : 0;
  const total = baseFee + extraGuestsFee + saunaFee + kitchenFee;

  const buildWAMsg = () => {
    const lines = [
      `*Запрос на бронирование — Villa Jaconda*`,
      ``,
      `🏠 *Формат:* ${roomObj?.label} (от ${roomObj?.price} PRB / ${roomObj?.unit})`,
      `📅 *Заезд:* ${formatRu(dates.checkIn)}`,
      `📅 *Выезд:* ${formatRu(dates.checkOut)}`,
      `🌙 *Ночей:* ${nightCount()}`,
      `👥 *Гостей:* ${guests}${extraGuests > 0 ? ` (+${extraGuests} доп.)` : ''}`,
      saunaHours > 0 ? `🔥 *Парилка:* ${saunaHours} ч. (${saunaFee} PRB)` : null,
      kitchenware    ? `🍴 *Кухонный сервиз:* да (${KITCHEN_PRICE} PRB)`   : null,
      ``,
      `💳 *Итого:* ~${total.toLocaleString('ru-RU')} PRB`,
      ``,
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
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bkSlideIn {
          from { opacity: 0; transform: translateX(-30px); filter: blur(3px); }
          to   { opacity: 1; transform: translateX(0);     filter: blur(0); }
        }
        @keyframes bkCardEnter {
          from { opacity: 0; transform: translateY(28px) scale(0.97); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
        }
        @keyframes bkExpand {
          from { opacity: 0; max-height: 0;   transform: translateY(-8px); }
          to   { opacity: 1; max-height: 240px; transform: translateY(0); }
        }
        @keyframes glowSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .booking-grid { display: grid; gap: clamp(28px,4vw,56px); grid-template-columns: minmax(0,1fr) minmax(0, 340px); align-items: start; }
        @media (max-width: 980px) {
          .booking-grid { grid-template-columns: 1fr !important; }
          .booking-summary { position: relative !important; top: 0 !important; }
          .bk-hero { white-space: normal !important; font-size: clamp(2.2rem, 7vw, 3rem) !important; }
          .room-card-wide { grid-template-columns: 1fr !important; }
          .room-card-wide .rcw-img { height: 220px !important; }
        }
        .bk-input::placeholder { color: rgba(245,237,224,0.3); }
      `}</style>

      <div style={{
        position: 'absolute', top: '-15%', right: '-12%',
        width: 540, height: 540, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,164,94,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px,4vw,60px)', position: 'relative' }}>

        {/* Section header */}
        <div style={{ marginBottom: 'clamp(40px,5vw,64px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ width: 22, height: 1, background: GOLD, opacity: 0.55 }} />
            <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD_DIM }}>
              Бронирование · Заявка
            </span>
          </div>
          <h2 className="bk-hero" style={{
            fontFamily: 'var(--r-serif)',
            fontSize: 'clamp(2rem, 3.6vw, 3.6rem)',
            fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.02em',
            color: CREAM, margin: 0,
            whiteSpace: 'nowrap',
          }}>
            Напишите нам — ответим за <em style={{ fontStyle: 'italic', color: GOLD }}>час</em>
          </h2>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderBottom: '1px solid rgba(212,164,94,0.15)', flexWrap: 'wrap' }}>
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

            {/* ═══════════════ STEP 1: Room selection — wide horizontal cards ═══════════════ */}
            {step === 1 && (
              <div key="step1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {ROOM_OPTIONS.map((room, idx) => {
                    const isSel = selectedRoom === room.id;
                    const isHover = hoverIdx === idx;
                    return (
                      <button key={room.id}
                        onClick={() => { setSelectedRoom(room.id); setTimeout(() => setStep(2), 280); }}
                        onMouseEnter={() => setHoverIdx(idx)}
                        onMouseLeave={() => setHoverIdx(null)}
                        className="room-card-wide"
                        style={{
                          textAlign: 'left',
                          background: PANEL_DARK,
                          border: `1px solid ${isSel ? GOLD : isHover ? 'rgba(212,164,94,0.35)' : 'rgba(212,164,94,0.12)'}`,
                          borderRadius: 14,
                          overflow: 'hidden', cursor: 'pointer',
                          fontFamily: 'inherit', padding: 0,
                          display: 'grid', gridTemplateColumns: '340px 1fr',
                          minHeight: 220,
                          transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
                          transform: isHover && !isSel ? 'translateX(6px)' : 'translateX(0)',
                          boxShadow: isSel ? `0 24px 60px ${GOLD}26, 0 0 0 1px ${GOLD}40`
                                   : isHover ? `0 16px 40px rgba(0,0,0,0.4)` : 'none',
                          animation: `bkCardEnter 0.7s cubic-bezier(0.16,1,0.3,1) ${0.08 + idx * 0.08}s both`,
                          position: 'relative',
                        }}>
                        {/* Image */}
                        <div className="rcw-img" style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: 220 }}>
                          <img src={room.cover} alt={room.label}
                            style={{
                              width: '100%', height: '100%', objectFit: 'cover',
                              transform: isHover || isSel ? 'scale(1.06)' : 'scale(1)',
                              transition: 'transform 1.1s cubic-bezier(0.16,1,0.3,1)',
                              filter: isSel ? 'none' : 'brightness(0.88)',
                            }} />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(90deg, transparent 50%, rgba(12,9,5,0.65) 100%)',
                          }} />
                          {/* sweep glow on hover */}
                          {(isHover || isSel) && (
                            <div style={{
                              position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                              background: `linear-gradient(90deg, transparent, ${GOLD}30, transparent)`,
                              animation: 'glowSweep 1.6s ease-out forwards',
                              pointerEvents: 'none',
                            }} />
                          )}
                          {/* Tag */}
                          <div style={{
                            position: 'absolute', top: 16, left: 16,
                            background: 'rgba(8,6,4,0.6)', backdropFilter: 'blur(8px)',
                            color: GOLD, fontSize: 9, padding: '5px 14px',
                            borderRadius: 999, letterSpacing: '0.28em', textTransform: 'uppercase',
                            border: '1px solid rgba(212,164,94,0.3)',
                          }}>{room.tag}</div>
                          {/* Number */}
                          <div style={{
                            position: 'absolute', bottom: 16, left: 16,
                            fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                            fontSize: 56, color: GOLD, fontWeight: 300,
                            lineHeight: 1, letterSpacing: '-0.04em',
                            opacity: 0.55,
                          }}>{room.num}</div>
                        </div>

                        {/* Content */}
                        <div style={{
                          padding: '24px 28px',
                          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          position: 'relative',
                        }}>
                          <div>
                            <h3 style={{
                              fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                              fontSize: 32, fontWeight: 300, color: CREAM,
                              margin: '0 0 10px', lineHeight: 1, letterSpacing: '-0.015em',
                            }}>{room.label}</h3>
                            <p style={{
                              fontSize: 13, color: 'rgba(245,237,224,0.6)',
                              lineHeight: 1.7, margin: '0 0 18px', maxWidth: 460,
                            }}>{room.desc}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {room.amenities.slice(0, 5).map(a => (
                                <span key={a} style={{
                                  fontSize: 10, padding: '4px 10px',
                                  background: 'rgba(212,164,94,0.08)',
                                  border: '1px solid rgba(212,164,94,0.18)',
                                  borderRadius: 999,
                                  color: 'rgba(245,237,224,0.7)',
                                  letterSpacing: '0.06em',
                                }}>{a}</span>
                              ))}
                            </div>
                          </div>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                            marginTop: 22, paddingTop: 18,
                            borderTop: '1px solid rgba(212,164,94,0.12)',
                          }}>
                            <div>
                              <p style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 4px' }}>от</p>
                              <p style={{ margin: 0, fontFamily: 'var(--r-serif)', fontSize: 26, color: GOLD, fontWeight: 300 }}>
                                {room.price} <span style={{ fontSize: 12, color: 'rgba(245,237,224,0.55)' }}>PRB / {room.unit}</span>
                              </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 4px' }}>гостей</p>
                                <p style={{ margin: 0, fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 18, color: CREAM, fontWeight: 300 }}>до {room.guests}</p>
                              </div>
                              <div style={{
                                width: 44, height: 44, borderRadius: '50%',
                                border: `1px solid ${isHover || isSel ? GOLD : 'rgba(212,164,94,0.3)'}`,
                                background: isHover || isSel ? GOLD : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.35s ease',
                                transform: isHover ? 'translateX(4px)' : 'translateX(0)',
                              }}>
                                <span style={{ color: isHover || isSel ? BG_DARK : GOLD, fontSize: 18, lineHeight: 1 }}>→</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 2: Calendar ═══════════════ */}
            {step === 2 && (
              <div key="step2" style={{ animation: 'bkSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) both' }}>
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
                  <div style={{ marginTop: 22, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', animation: 'bkFade 0.45s cubic-bezier(0.16,1,0.3,1) both' }}>
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

            {/* ═══════════════ STEP 3: Contact form + extra services ═══════════════ */}
            {step === 3 && (
              <form key="step3" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 640, animation: 'bkSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) both' }}>

                {/* Гости */}
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 12 }}>
                    Количество гостей
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))}
                      style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(245,237,224,0.2)', background: 'transparent', color: CREAM, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.2)'; }}>−</button>
                    <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 32, color: CREAM, minWidth: 50, textAlign: 'center', fontWeight: 300 }}>{guests}</span>
                    <button type="button" onClick={() => setGuests(g => g + 1)}
                      style={{ width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(245,237,224,0.2)', background: 'transparent', color: CREAM, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.2)'; }}>+</button>
                    {roomObj && <span style={{ fontSize: 11, color: GOLD_DIM, letterSpacing: '0.16em', textTransform: 'uppercase' }}>лимит {roomObj.guests}</span>}
                  </div>
                  {extraGuests > 0 && (
                    <div style={{
                      marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', background: 'rgba(255,107,53,0.08)',
                      border: '1px solid rgba(255,107,53,0.25)', borderRadius: 8,
                      animation: 'bkFade 0.4s cubic-bezier(0.16,1,0.3,1) both',
                    }}>
                      <Icon name="info" size={13} color="#ff8a5b" />
                      <span style={{ fontSize: 11, color: '#ff8a5b', letterSpacing: '0.04em' }}>
                        +{extraGuests} доп. {extraGuests === 1 ? 'гость' : 'гостей'} × {EXTRA_GUEST_PRICE} PRB = <strong>+{extraGuestsFee} PRB</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* ═══ Доп. услуги ═══ */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 18, height: 1, background: GOLD, opacity: 0.6 }} />
                    <span style={{ fontSize: 9, letterSpacing: '0.38em', textTransform: 'uppercase', color: GOLD }}>
                      Дополнительные услуги
                    </span>
                  </div>

                  {/* Парилка */}
                  <div style={{
                    background: saunaHours > 0 ? `${GOLD}0a` : 'rgba(245,237,224,0.025)',
                    border: `1px solid ${saunaHours > 0 ? `${GOLD}55` : 'rgba(245,237,224,0.10)'}`,
                    borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                    transition: 'all 0.35s ease',
                  }}>
                    <button type="button"
                      onClick={() => setSaunaHours(h => h > 0 ? 0 : 1)}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontFamily: 'inherit', padding: 0, textAlign: 'left',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ fontSize: 22, lineHeight: 1 }}>🔥</div>
                        <div>
                          <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 17, color: CREAM, margin: '0 0 3px', fontWeight: 300 }}>
                            Парилка
                          </p>
                          <p style={{ fontSize: 11, color: GOLD_DIM, margin: 0, letterSpacing: '0.06em' }}>
                            {SAUNA_PRICE} PRB / час · скидки для Gold и Platinum
                          </p>
                        </div>
                      </div>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6,
                        border: `1.5px solid ${saunaHours > 0 ? GOLD : 'rgba(245,237,224,0.25)'}`,
                        background: saunaHours > 0 ? GOLD : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s ease',
                      }}>
                        {saunaHours > 0 && <Icon name="check" size={14} color={BG_DARK} strokeWidth={2.5} />}
                      </div>
                    </button>
                    {saunaHours > 0 && (
                      <div style={{
                        overflow: 'hidden',
                        animation: 'bkExpand 0.45s cubic-bezier(0.16,1,0.3,1) both',
                        marginTop: 16, paddingTop: 16,
                        borderTop: '1px solid rgba(212,164,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 12,
                      }}>
                        <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD_DIM }}>
                          Количество часов
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <button type="button" onClick={() => setSaunaHours(h => Math.max(1, h - 1))}
                            style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${GOLD}40`, background: `${GOLD}15`, color: GOLD, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${GOLD}15`; e.currentTarget.style.color = GOLD; }}>−</button>
                          <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: CREAM, minWidth: 56, textAlign: 'center', fontWeight: 300 }}>
                            {saunaHours} ч.
                          </span>
                          <button type="button" onClick={() => setSaunaHours(h => h + 1)}
                            style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${GOLD}`, background: GOLD, color: BG_DARK, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>+</button>
                          <span style={{ fontFamily: 'var(--r-serif)', fontSize: 16, color: GOLD, marginLeft: 8 }}>
                            {saunaFee} PRB
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Кухонный сервиз */}
                  <button type="button"
                    onClick={() => setKitchenware(k => !k)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: kitchenware ? `${GOLD}0a` : 'rgba(245,237,224,0.025)',
                      border: `1px solid ${kitchenware ? `${GOLD}55` : 'rgba(245,237,224,0.10)'}`,
                      borderRadius: 12, padding: '18px 20px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.35s ease',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 22, lineHeight: 1 }}>🍴</div>
                      <div>
                        <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 17, color: CREAM, margin: '0 0 3px', fontWeight: 300 }}>
                          Кухонный сервиз
                        </p>
                        <p style={{ fontSize: 11, color: GOLD_DIM, margin: 0, letterSpacing: '0.06em' }}>
                          {KITCHEN_PRICE} PRB · бесплатно для Silver, Gold, Platinum
                        </p>
                      </div>
                    </div>
                    <div style={{
                      width: 26, height: 26, borderRadius: 6,
                      border: `1.5px solid ${kitchenware ? GOLD : 'rgba(245,237,224,0.25)'}`,
                      background: kitchenware ? GOLD : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}>
                      {kitchenware && <Icon name="check" size={14} color={BG_DARK} strokeWidth={2.5} />}
                    </div>
                  </button>
                </div>

                {/* Данные */}
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
                  <textarea className="bk-input" rows={3} placeholder="Особый повод, пожелания по питанию..."
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

          {/* ═══════════════ RIGHT: sticky summary ═══════════════ */}
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
                <div key={roomObj.id} style={{
                  marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid rgba(212,164,94,0.12)', position: 'relative',
                  animation: 'bkFade 0.45s cubic-bezier(0.16,1,0.3,1) both',
                }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(212,164,94,0.12)' }}>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 6 }}>Ночей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: CREAM, margin: 0, fontWeight: 300 }}>{nightCount() || '—'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 6 }}>Гостей</p>
                  <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: CREAM, margin: 0, fontWeight: 300 }}>{guests}</p>
                </div>
              </div>

              {/* Услуги/расчёт */}
              {(saunaHours > 0 || kitchenware || extraGuests > 0) && (
                <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(212,164,94,0.12)', animation: 'bkFade 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
                  <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 10 }}>Доп. услуги</p>
                  {extraGuests > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: 'rgba(245,237,224,0.7)' }}>+{extraGuests} гостей</span>
                      <span style={{ color: '#ff8a5b', fontFamily: 'var(--r-serif)' }}>+{extraGuestsFee} PRB</span>
                    </div>
                  )}
                  {saunaHours > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ color: 'rgba(245,237,224,0.7)' }}>🔥 Парилка · {saunaHours} ч.</span>
                      <span style={{ color: GOLD, fontFamily: 'var(--r-serif)' }}>+{saunaFee} PRB</span>
                    </div>
                  )}
                  {kitchenware && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: 'rgba(245,237,224,0.7)' }}>🍴 Кухонный сервиз</span>
                      <span style={{ color: GOLD, fontFamily: 'var(--r-serif)' }}>+{kitchenFee} PRB</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              {roomObj && nightCount() > 0 && (
                <div style={{
                  marginBottom: 18, padding: '14px 16px',
                  background: `${GOLD}10`, border: `1px solid ${GOLD}35`,
                  borderRadius: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM }}>Итого</span>
                  <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: GOLD, fontWeight: 400 }}>
                    ~{total.toLocaleString('ru-RU')} <span style={{ fontSize: 11, color: 'rgba(245,237,224,0.55)' }}>PRB</span>
                  </span>
                </div>
              )}

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
