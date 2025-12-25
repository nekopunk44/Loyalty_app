'use client';
import { useState, useEffect, useCallback } from 'react';
import Icon from './ui/Icon';

const GOLD        = '#d4a45e';
const GOLD_DIM    = 'rgba(212,164,94,0.55)';
const CREAM       = '#f5ede0';
const BG_DARK     = '#0a0805';
const CARD_BG     = 'rgba(18,13,8,0.95)';
const INSTAGRAM_URL = 'https://www.instagram.com/villa_jaconda_relax?igsh=MXhwY21lc2k1NW44';
const WA = '3737791002';

const SAUNA_PRICE       = 250;
const KITCHEN_PRICE     = 100;
const EXTRA_GUEST_PRICE = 150;

const ROOMS = [
  { id: 'standart', num: '01', label: 'Стандарт',       tag: 'Studio',    price: 150, unit: 'ночь', guests: 10,
    desc: 'Студия с террасой, бассейном и сауной. Камерный формат для пары или небольшой компании.',
    cover: '/images/std1.jpg' },
  { id: 'luks',     num: '02', label: 'Люкс',           tag: 'Premium',   price: 200, unit: 'ночь', guests: 20,
    desc: 'Десять комнат, большой зал и собственная кухня. Гибкий формат для крупной компании.',
    cover: '/images/luks1.jpg' },
  { id: 'zad',      num: '03', label: 'Задний двор',    tag: 'Outdoor',   price: 100, unit: 'день', guests: 15,
    desc: 'Открытая территория с бассейном, беседкой и мангальной зоной.',
    cover: '/images/zad1.jpg' },
  { id: 'full',     num: '04', label: 'Вся территория', tag: 'Exclusive', price: 500, unit: 'ночь', guests: 30,
    desc: 'Полный выкуп виллы со всеми форматами. Закрытое пространство для большого события.',
    cover: '/images/luks2.jpg' },
];

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WD     = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function fmt(d) { if (!d) return ''; return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`; }
function fmtFull(d) { if (!d) return ''; return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function sameDay(a,b) { return a && b && a.toDateString() === b.toDateString(); }
function inRange(d, s, e) { return s && e && d > s && d < e; }

function Cal({ checkIn, checkOut, onChange }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = useState(() => { const d = checkIn || today; return { y: d.getFullYear(), m: d.getMonth() }; });
  const [hovered, setHovered] = useState(null);

  const first = new Date(view.y, view.m, 1);
  const last  = new Date(view.y, view.m+1, 0);
  let dow = first.getDay() - 1; if (dow < 0) dow = 6;
  const cells = [...Array(dow).fill(null), ...Array.from({ length: last.getDate() }, (_,i) => new Date(view.y, view.m, i+1))];

  const go = (delta) => setView(v => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const click = useCallback((day) => {
    if (!day || day < today) return;
    if (!checkIn || (checkIn && checkOut)) { onChange({ checkIn: day, checkOut: null }); return; }
    if (day <= checkIn) { onChange({ checkIn: day, checkOut: null }); return; }
    onChange({ checkIn, checkOut: day });
  }, [checkIn, checkOut, onChange, today]);

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button onClick={() => go(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: GOLD_DIM, fontSize: 22, lineHeight: 1, padding: '4px 10px', transition: 'color .2s' }}
          onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = GOLD_DIM}>‹</button>
        <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: CREAM, fontWeight: 300, letterSpacing: '0.01em' }}>
          {MONTHS[view.m]} <span style={{ color: GOLD }}>{view.y}</span>
        </span>
        <button onClick={() => go(1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: GOLD_DIM, fontSize: 22, lineHeight: 1, padding: '4px 10px', transition: 'color .2s' }}
          onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = GOLD_DIM}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
        {WD.map(w => <div key={w} style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(212,164,94,0.35)', paddingBottom: 10 }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const isS = sameDay(day, checkIn), isE = sameDay(day, checkOut);
          const isR = checkIn && (checkOut ? inRange(day, checkIn, checkOut) : hovered && day > checkIn && day < hovered);
          const past = day < today;
          return (
            <button key={day.toISOString()} onClick={() => click(day)}
              onMouseEnter={() => setHovered(day)} onMouseLeave={() => setHovered(null)}
              disabled={past}
              style={{
                border: 'none', borderRadius: isS || isE ? 10 : isR ? 0 : 10,
                borderTopLeftRadius: isS ? 10 : isR && !isS ? 0 : 10,
                borderBottomLeftRadius: isS ? 10 : isR && !isS ? 0 : 10,
                borderTopRightRadius: isE ? 10 : isR && !isE ? 0 : 10,
                borderBottomRightRadius: isE ? 10 : isR && !isE ? 0 : 10,
                padding: '12px 4px', textAlign: 'center',
                background: isS || isE ? GOLD : isR ? `${GOLD}22` : 'transparent',
                color: isS || isE ? BG_DARK : past ? 'rgba(245,237,224,0.15)' : 'rgba(245,237,224,0.82)',
                cursor: past ? 'default' : 'pointer',
                fontFamily: 'var(--r-serif)', fontSize: 15,
                fontWeight: isS || isE ? 600 : 300,
                fontStyle: isS || isE ? 'italic' : 'normal',
                transition: 'background .15s',
              }}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingModal() {
  const [open,       setOpen]       = useState(false);
  const [step,       setStep]       = useState(1);
  const [roomId,     setRoomId]     = useState(null);
  const [dates,      setDates]      = useState({ checkIn: null, checkOut: null });
  const [guests,     setGuests]     = useState(2);
  const [sauna,      setSauna]      = useState(0);
  const [kitchen,    setKitchen]    = useState(false);
  const [form,       setForm]       = useState({ name: '', phone: '', notes: '' });
  const [focus,      setFocus]      = useState(null);
  const [sent,       setSent]       = useState(false);
  const [hoverRoom,  setHoverRoom]  = useState(null);

  const openModal = useCallback(() => {
    setStep(1); setRoomId(null);
    setDates({ checkIn: null, checkOut: null });
    setGuests(2); setSauna(0); setKitchen(false);
    setForm({ name: '', phone: '', notes: '' }); setSent(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener('open-booking-modal', openModal);
    return () => window.removeEventListener('open-booking-modal', openModal);
  }, [openModal]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const room    = ROOMS.find(r => r.id === roomId);
  const nights  = dates.checkIn && dates.checkOut ? Math.round((dates.checkOut - dates.checkIn) / 86400000) : 0;
  const extra   = room ? Math.max(0, guests - room.guests) : 0;
  const total   = (room ? room.price * Math.max(1, nights) : 0) + extra * EXTRA_GUEST_PRICE + sauna * SAUNA_PRICE + (kitchen ? KITCHEN_PRICE : 0);

  const waMsg = () => {
    const lines = [
      `*Запрос на бронирование — Villa Jaconda*`, ``,
      `🏠 *Формат:* ${room?.label} (${room?.price} PRB / ${room?.unit})`,
      `📅 *Заезд:* ${fmtFull(dates.checkIn)}`,
      `📅 *Выезд:* ${fmtFull(dates.checkOut)}`,
      `🌙 *Ночей:* ${nights}`,
      `👥 *Гостей:* ${guests}${extra > 0 ? ` (+${extra} доп.)` : ''}`,
      sauna   > 0 ? `🔥 *Парилка:* ${sauna} ч. (${sauna * SAUNA_PRICE} PRB)` : null,
      kitchen     ? `🍴 *Кухонный сервиз:* да (${KITCHEN_PRICE} PRB)` : null,
      ``, `💳 *Итого:* ~${total.toLocaleString('ru-RU')} PRB`, ``,
      `👤 *Имя:* ${form.name}`, `📞 *Телефон:* ${form.phone}`,
      form.notes ? `📝 *Пожелания:* ${form.notes}` : null,
    ].filter(Boolean).join('\n');
    return `https://wa.me/${WA}?text=${encodeURIComponent(lines)}`;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !dates.checkIn || !dates.checkOut || !roomId) return;
    window.open(waMsg(), '_blank', 'noopener');
    setSent(true); setTimeout(() => setSent(false), 5000);
  };

  const inp = (name) => ({
    width: '100%', boxSizing: 'border-box',
    background: focus === name ? 'rgba(212,164,94,0.06)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${focus === name ? GOLD : 'rgba(245,237,224,0.1)'}`,
    borderRadius: 12, padding: '14px 18px',
    color: CREAM, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color .25s, background .25s',
  });

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(4,2,1,0.82)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        animation: 'bmOver .25s ease both',
      }}>

      <style>{`
        @keyframes bmOver  { from { opacity:0 } to { opacity:1 } }
        @keyframes bmPanel { from { opacity:0; transform:translateY(24px) scale(.98) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes bmFade  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bmCard  { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes bmExpand { from { opacity:0; max-height:0 } to { opacity:1; max-height:200px } }
        .bm-inp::placeholder { color: rgba(245,237,224,0.28); }
        @media (max-width:600px) {
          .bm-form-row { grid-template-columns: 1fr !important; }
          .bm-svcs { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{
        background: BG_DARK,
        borderRadius: 24,
        width: '100%', maxWidth: 820,
        maxHeight: '92vh', overflowY: 'auto',
        border: '1px solid rgba(212,164,94,0.16)',
        boxShadow: '0 48px 120px rgba(0,0,0,0.75), 0 0 0 1px rgba(212,164,94,0.08)',
        animation: 'bmPanel .38s cubic-bezier(.16,1,.3,1) both',
        position: 'relative',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '32px 36px 24px',
          borderBottom: '1px solid rgba(245,237,224,0.07)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          position: 'sticky', top: 0, background: BG_DARK, zIndex: 2,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {/* Step pills */}
              {[1,2,3].map(n => (
                <button key={n}
                  onClick={() => { if (n < step || (n===2&&roomId) || (n===3&&dates.checkIn&&dates.checkOut)) setStep(n); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: step > n ? GOLD : step === n ? 'transparent' : 'transparent',
                    border: `1.5px solid ${step >= n ? GOLD : 'rgba(245,237,224,0.18)'}`,
                    color: step > n ? BG_DARK : step === n ? GOLD : 'rgba(245,237,224,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, transition: 'all .3s',
                  }}>
                    {step > n ? <Icon name="check" size={11} color={BG_DARK} strokeWidth={2.5} /> : n}
                  </div>
                  {n < 3 && <div style={{ width: 20, height: 1, background: step > n ? `${GOLD}60` : 'rgba(245,237,224,0.12)' }} />}
                </button>
              ))}
            </div>
            <h2 style={{
              fontFamily: 'var(--r-serif)', fontStyle: 'italic',
              fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 300,
              color: CREAM, margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em',
            }}>
              {step === 1 ? 'Выберите формат' : step === 2 ? <>Выберите <em style={{ color: GOLD }}>даты</em></> : <>Ваши данные</>}
            </h2>
          </div>

          <button onClick={() => setOpen(false)} aria-label="Закрыть"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(245,237,224,0.05)', border: '1px solid rgba(245,237,224,0.12)',
              color: 'rgba(245,237,224,0.6)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,237,224,0.05)'; e.currentTarget.style.color = 'rgba(245,237,224,0.6)'; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.12)'; }}>
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '28px 36px 40px' }}>

          {/* ═══ STEP 1: Room grid ═══ */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, animation: 'bmFade .35s ease both' }}>
              {ROOMS.map((r, idx) => {
                const sel = roomId === r.id, hov = hoverRoom === idx;
                return (
                  <button key={r.id}
                    onClick={() => { setRoomId(r.id); setTimeout(() => setStep(2), 260); }}
                    onMouseEnter={() => setHoverRoom(idx)} onMouseLeave={() => setHoverRoom(null)}
                    style={{
                      textAlign: 'left', padding: 0, border: 'none', cursor: 'pointer',
                      borderRadius: 16, overflow: 'hidden', fontFamily: 'inherit',
                      background: CARD_BG,
                      outline: `1.5px solid ${sel ? GOLD : hov ? 'rgba(212,164,94,0.4)' : 'rgba(212,164,94,0.1)'}`,
                      boxShadow: sel ? `0 0 0 3px ${GOLD}22` : hov ? '0 12px 36px rgba(0,0,0,0.5)' : 'none',
                      transition: 'all .4s cubic-bezier(.16,1,.3,1)',
                      transform: hov && !sel ? 'translateY(-3px)' : 'none',
                      animation: `bmCard .5s cubic-bezier(.16,1,.3,1) ${idx * 0.07}s both`,
                    }}>
                    {/* Image */}
                    <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                      <img src={r.cover} alt={r.label} style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transform: hov || sel ? 'scale(1.07)' : 'scale(1)',
                        transition: 'transform 1.2s cubic-bezier(.16,1,.3,1)',
                      }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,6,4,.1) 0%, rgba(8,6,4,.7) 100%)' }} />
                      <div style={{
                        position: 'absolute', top: 12, left: 12,
                        fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase',
                        color: GOLD, background: 'rgba(8,6,4,0.65)', backdropFilter: 'blur(6px)',
                        padding: '4px 10px', borderRadius: 999, border: `1px solid ${GOLD}40`,
                      }}>{r.tag}</div>
                      <div style={{
                        position: 'absolute', bottom: 12, right: 14,
                        fontFamily: 'var(--r-serif)', fontStyle: 'italic',
                        fontSize: 40, color: GOLD, fontWeight: 300, opacity: 0.5, lineHeight: 1,
                      }}>{r.num}</div>
                    </div>
                    {/* Info */}
                    <div style={{ padding: '16px 18px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 300, color: CREAM, margin: 0, lineHeight: 1 }}>{r.label}</h3>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginLeft: 8,
                          border: `1px solid ${hov || sel ? GOLD : 'rgba(212,164,94,0.3)'}`,
                          background: hov || sel ? GOLD : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .3s',
                        }}>
                          <span style={{ color: hov || sel ? BG_DARK : GOLD, fontSize: 13, lineHeight: 1 }}>→</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(245,237,224,0.5)', lineHeight: 1.6, margin: '0 0 12px' }}>{r.desc}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--r-serif)', fontSize: 17, color: GOLD }}>
                          {r.price} <span style={{ fontSize: 10, color: GOLD_DIM }}>PRB / {r.unit}</span>
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(245,237,224,0.4)', letterSpacing: '0.08em' }}>до {r.guests} гостей</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══ STEP 2: Calendar ═══ */}
          {step === 2 && (
            <div style={{ animation: 'bmFade .35s ease both' }}>
              {/* Selected room chip */}
              {room && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '10px 16px', background: `${GOLD}0d`, border: `1px solid ${GOLD}30`, borderRadius: 12 }}>
                  <img src={room.cover} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                  <div>
                    <p style={{ margin: 0, fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 15, color: CREAM }}>{room.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: GOLD_DIM }}>{room.price} PRB / {room.unit}</p>
                  </div>
                  <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: GOLD_DIM, letterSpacing: '0.12em', textTransform: 'uppercase', padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = GOLD} onMouseLeave={e => e.currentTarget.style.color = GOLD_DIM}>
                    Изменить
                  </button>
                </div>
              )}

              <Cal checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={setDates} />

              {/* Date summary bar */}
              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 18px', borderRadius: 999,
                    background: dates.checkIn ? `${GOLD}12` : 'rgba(245,237,224,0.04)',
                    border: `1px solid ${dates.checkIn ? `${GOLD}40` : 'rgba(245,237,224,0.08)'}`,
                  }}>
                    <Icon name="calendar" size={13} color={dates.checkIn ? GOLD : 'rgba(245,237,224,0.3)'} />
                    <span style={{ fontSize: 13, fontFamily: 'var(--r-serif)', fontStyle: 'italic', color: dates.checkIn ? CREAM : 'rgba(245,237,224,0.35)' }}>
                      {dates.checkIn ? fmt(dates.checkIn) : 'Заезд'}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(245,237,224,0.25)', fontSize: 16 }}>→</span>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 18px', borderRadius: 999,
                    background: dates.checkOut ? `${GOLD}12` : 'rgba(245,237,224,0.04)',
                    border: `1px solid ${dates.checkOut ? `${GOLD}40` : 'rgba(245,237,224,0.08)'}`,
                  }}>
                    <Icon name="calendar" size={13} color={dates.checkOut ? GOLD : 'rgba(245,237,224,0.3)'} />
                    <span style={{ fontSize: 13, fontFamily: 'var(--r-serif)', fontStyle: 'italic', color: dates.checkOut ? CREAM : 'rgba(245,237,224,0.35)' }}>
                      {dates.checkOut ? fmt(dates.checkOut) : 'Выезд'}
                    </span>
                  </div>
                  {nights > 0 && (
                    <span style={{ fontSize: 12, color: GOLD_DIM, letterSpacing: '0.06em' }}>{nights} ноч.</span>
                  )}
                </div>

                <button onClick={() => setStep(3)} disabled={!dates.checkIn || !dates.checkOut}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    padding: '13px 28px',
                    background: dates.checkIn && dates.checkOut ? GOLD : 'rgba(245,237,224,0.07)',
                    color: dates.checkIn && dates.checkOut ? BG_DARK : 'rgba(245,237,224,0.3)',
                    border: 'none', borderRadius: 999,
                    fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase',
                    fontFamily: 'inherit', fontWeight: 500,
                    cursor: dates.checkIn && dates.checkOut ? 'pointer' : 'default',
                    transition: 'all .3s',
                  }}
                  onMouseEnter={e => { if (dates.checkIn && dates.checkOut) { e.currentTarget.style.boxShadow = `0 8px 24px ${GOLD}40`; e.currentTarget.style.transform = 'translateX(3px)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
                  Далее →
                </button>
              </div>

              {!dates.checkOut && (
                <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(245,237,224,0.4)', fontStyle: 'italic', fontFamily: 'var(--r-serif)' }}>
                  {dates.checkIn ? '← Выберите дату выезда' : 'Нажмите на дату заезда'}
                </p>
              )}
            </div>
          )}

          {/* ═══ STEP 3: Form ═══ */}
          {step === 3 && (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'bmFade .35s ease both' }}>

              {/* Guests */}
              <div>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 14 }}>Количество гостей</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button type="button" onClick={() => setGuests(g => Math.max(1, g-1))}
                    style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(245,237,224,0.15)', background: 'rgba(245,237,224,0.04)', color: CREAM, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,237,224,0.04)'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.15)'; }}>−</button>
                  <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 28, color: CREAM, minWidth: 56, textAlign: 'center', fontWeight: 300 }}>{guests}</span>
                  <button type="button" onClick={() => setGuests(g => g+1)}
                    style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(245,237,224,0.15)', background: 'rgba(245,237,224,0.04)', color: CREAM, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = BG_DARK; e.currentTarget.style.borderColor = GOLD; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,237,224,0.04)'; e.currentTarget.style.color = CREAM; e.currentTarget.style.borderColor = 'rgba(245,237,224,0.15)'; }}>+</button>
                  {room && <span style={{ fontSize: 11, color: 'rgba(245,237,224,0.35)', letterSpacing: '0.1em', marginLeft: 10 }}>макс. {room.guests}</span>}
                </div>
                {extra > 0 && (
                  <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.22)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: '#ff8a5b' }}>+{extra} доп. {extra===1?'гость':'гостей'} × {EXTRA_GUEST_PRICE} = +{extra*EXTRA_GUEST_PRICE} PRB</span>
                  </div>
                )}
              </div>

              {/* Services */}
              <div className="bm-svcs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Sauna */}
                <div style={{ borderRadius: 14, border: `1px solid ${sauna>0 ? `${GOLD}50` : 'rgba(245,237,224,0.09)'}`, background: sauna>0 ? `${GOLD}08` : 'rgba(245,237,224,0.02)', transition: 'all .3s', overflow: 'hidden' }}>
                  <button type="button" onClick={() => setSauna(h => h>0?0:1)}
                    style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit', textAlign: 'left' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sauna>0?GOLD:GOLD_DIM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                      </svg>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 15, color: CREAM, margin: '0 0 2px', fontWeight: 300 }}>Парилка</p>
                      <p style={{ fontSize: 10, color: GOLD_DIM, margin: 0 }}>{SAUNA_PRICE} PRB / час</p>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${sauna>0?GOLD:'rgba(245,237,224,0.2)'}`, background: sauna>0?GOLD:'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', flexShrink: 0 }}>
                      {sauna>0 && <Icon name="check" size={12} color={BG_DARK} strokeWidth={2.5} />}
                    </div>
                  </button>
                  {sauna > 0 && (
                    <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', gap: 10, animation: 'bmExpand .35s ease both' }}>
                      <button type="button" onClick={() => setSauna(h=>Math.max(1,h-1))}
                        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${GOLD}40`, background: `${GOLD}15`, color: GOLD, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 16, color: CREAM, minWidth: 36, textAlign: 'center' }}>{sauna} ч.</span>
                      <button type="button" onClick={() => setSauna(h=>h+1)}
                        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${GOLD}`, background: GOLD, color: BG_DARK, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      <span style={{ fontSize: 12, color: GOLD }}>{sauna*SAUNA_PRICE} PRB</span>
                    </div>
                  )}
                </div>

                {/* Kitchen */}
                <button type="button" onClick={() => setKitchen(k=>!k)}
                  style={{ borderRadius: 14, border: `1px solid ${kitchen?`${GOLD}50`:'rgba(245,237,224,0.09)'}`, background: kitchen?`${GOLD}08`:'rgba(245,237,224,0.02)', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'inherit', textAlign: 'left', transition: 'all .3s' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={kitchen?GOLD:GOLD_DIM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z"/>
                    </svg>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 15, color: CREAM, margin: '0 0 2px', fontWeight: 300 }}>Кухонный сервиз</p>
                    <p style={{ fontSize: 10, color: GOLD_DIM, margin: 0 }}>{KITCHEN_PRICE} PRB · бесплатно от Silver</p>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${kitchen?GOLD:'rgba(245,237,224,0.2)'}`, background: kitchen?GOLD:'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', flexShrink: 0 }}>
                    {kitchen && <Icon name="check" size={12} color={BG_DARK} strokeWidth={2.5} />}
                  </div>
                </button>
              </div>

              {/* Contact fields */}
              <div className="bm-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Имя</label>
                  <input className="bm-inp" type="text" required placeholder="Иван" value={form.name}
                    onChange={e => setForm(f=>({...f,name:e.target.value}))}
                    onFocus={()=>setFocus('name')} onBlur={()=>setFocus(null)} style={inp('name')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Телефон</label>
                  <input className="bm-inp" type="tel" required placeholder="+373 ..." value={form.phone}
                    onChange={e => setForm(f=>({...f,phone:e.target.value}))}
                    onFocus={()=>setFocus('phone')} onBlur={()=>setFocus(null)} style={inp('phone')} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD_DIM, marginBottom: 8 }}>Пожелания</label>
                <textarea className="bm-inp" rows={3} placeholder="Особый повод, пожелания по питанию..."
                  value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                  onFocus={()=>setFocus('notes')} onBlur={()=>setFocus(null)}
                  style={{ ...inp('notes'), resize: 'vertical', minHeight: 80 }} />
              </div>

              {/* Summary strip */}
              <div style={{ borderRadius: 14, background: 'rgba(212,164,94,0.06)', border: '1px solid rgba(212,164,94,0.18)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {room && (
                      <div>
                        <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 3px' }}>Формат</p>
                        <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 14, color: CREAM, margin: 0 }}>{room.label}</p>
                      </div>
                    )}
                    {nights > 0 && (
                      <div>
                        <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 3px' }}>Даты</p>
                        <p style={{ fontSize: 13, color: CREAM, margin: 0 }}>{fmt(dates.checkIn)} → {fmt(dates.checkOut)} <span style={{ color: GOLD_DIM }}>({nights} н.)</span></p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 3px' }}>Гостей</p>
                      <p style={{ fontSize: 13, color: CREAM, margin: 0 }}>{guests}</p>
                    </div>
                  </div>
                  {room && nights > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD_DIM, margin: '0 0 3px' }}>Итого</p>
                      <p style={{ fontFamily: 'var(--r-serif)', fontStyle: 'italic', fontSize: 22, color: GOLD, margin: 0, fontWeight: 400 }}>
                        ~{total.toLocaleString('ru-RU')} <span style={{ fontSize: 11, color: GOLD_DIM }}>PRB</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="submit"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 28px', background: sent?'#4ade80':GOLD, color: BG_DARK, border: 'none', borderRadius: 999, fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', transition: 'all .3s', boxShadow: `0 8px 28px ${GOLD}35` }}
                  onMouseEnter={e => { if (!sent) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 36px ${GOLD}50`; } }}
                  onMouseLeave={e => { if (!sent) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 28px ${GOLD}35`; } }}>
                  <Icon name="message-circle" size={14} color={BG_DARK} strokeWidth={2} />
                  {sent ? 'Отправлено ✓' : 'Отправить →'}
                </button>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 22px', background: 'transparent', border: `1px solid ${GOLD}40`, color: GOLD, borderRadius: 999, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 500, transition: 'all .3s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}15`; e.currentTarget.style.borderColor = GOLD; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${GOLD}40`; }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  Напрямую
                </a>
              </div>

              <p style={{ fontSize: 11, color: 'rgba(245,237,224,0.3)', textAlign: 'center', letterSpacing: '0.04em', margin: 0 }}>
                При нажатии откроется WhatsApp с заполненной заявкой
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
