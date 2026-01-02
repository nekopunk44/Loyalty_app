/* Booking redesign — 3-step wizard inspired by the mobile app */
const BOOKING_NAVY  = '#063B5C';
const BOOKING_TEAL  = '#14B8A6';
const BOOKING_CORAL = '#FF6B35';

const ROOMS = [
  { id:'2', name:'Стандарт', tag:'Studio', price:'150 PRB', unit:'ночь', guests:10, cover:'../../assets/images/std1.png' },
  { id:'1', name:'Люкс',     tag:'Premium', price:'200 PRB', unit:'ночь', guests:20, cover:'../../assets/images/luks1.png' },
  { id:'3', name:'Задний двор', tag:'Outdoor', price:'100 PRB', unit:'день', guests:15, cover:'../../assets/images/zad1.png' },
  { id:'4', name:'Вся территория', tag:'Exclusive', price:'500 PRB', unit:'ночь', guests:30, cover:'../../assets/images/luks2.png' },
];

/* ── Mini Calendar ─────────────────────────────────── */
function BookingCal({ checkIn, checkOut, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [view, setView] = React.useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hover, setHover] = React.useState(null);

  const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const getDays = (y, m) => {
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    const last = new Date(y, m+1, 0).getDate();
    const arr = Array(first).fill(null);
    for (let d=1; d<=last; d++) arr.push(new Date(y, m, d));
    while (arr.length % 7) arr.push(null);
    return arr;
  };

  const same = (a, b) => a && b && a.toDateString() === b.toDateString();
  const inRange = (d) => {
    const end = checkOut || hover;
    return d && checkIn && end && d > checkIn && d < end;
  };

  const click = (d) => {
    if (!d || d < today) return;
    if (!checkIn || (checkIn && checkOut)) return onSelect({ checkIn:d, checkOut:null });
    if (d < checkIn) return onSelect({ checkIn:d, checkOut:null });
    onSelect({ checkIn, checkOut:d });
  };

  const y = view.getFullYear(), m = view.getMonth();
  const days = getDays(y, m);

  return (
    <div>
      {/* Month nav */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <button onClick={() => setView(new Date(y,m-1,1))} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--r-line-strong)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="chevron-left" size={16} color="var(--r-text)" strokeWidth={1.5} />
        </button>
        <span style={{ fontFamily:'var(--r-serif)', fontSize:20, fontWeight:300, color:'var(--r-text)', textTransform:'capitalize' }}>
          {MONTHS[m]} {y}
        </span>
        <button onClick={() => setView(new Date(y,m+1,1))} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--r-line-strong)', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="chevron-right" size={16} color="var(--r-text)" strokeWidth={1.5} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:BOOKING_CORAL, fontWeight:700, padding:'4px 0' }}>{d}</div>)}
      </div>

      {/* Day grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const past = d < today;
          const isStart = same(d, checkIn);
          const isEnd = same(d, checkOut);
          const range = inRange(d);
          return (
            <button key={i} onClick={() => click(d)}
              onMouseEnter={() => !past && checkIn && !checkOut && setHover(d)}
              onMouseLeave={() => setHover(null)}
              disabled={past}
              style={{
                height:40, border:'none', cursor: past ? 'default' : 'pointer',
                borderRadius: isStart ? '8px 0 0 8px' : isEnd ? '0 8px 8px 0' : range ? 0 : 8,
                background: isStart||isEnd ? BOOKING_CORAL : range ? `${BOOKING_TEAL}20` : same(d,hover) ? 'var(--r-line)' : 'transparent',
                color: isStart||isEnd ? '#fff' : past ? 'var(--r-line-strong)' : 'var(--r-text)',
                fontSize:13, fontWeight: isStart||isEnd ? 700 : 400,
                transition:'background 0.15s ease',
                boxShadow: isStart||isEnd ? `0 4px 12px ${BOOKING_CORAL}44` : 'none',
              }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginTop:16, paddingTop:16, borderTop:'1px solid var(--r-line)' }}>
        {[{color:BOOKING_CORAL,label:'Выбрано'},{color:`${BOOKING_TEAL}40`,label:'Диапазон'}].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', background:'var(--r-surface)', border:'1px solid var(--r-line)', borderRadius:8 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:l.color }} />
            <span style={{ fontSize:11, color:'var(--r-text-soft)', fontWeight:600 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Booking Component ─────────────────────────── */
function BookingR() {
  const [step, setStep] = React.useState(1);
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const [dates, setDates] = React.useState({ checkIn:null, checkOut:null });
  const [guests, setGuests] = React.useState(2);
  const [form, setForm] = React.useState({ name:'', phone:'', notes:'' });
  const [sent, setSent] = React.useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]:e.target.value }));

  const fmt = d => d ? d.toLocaleDateString('ru-RU',{day:'2-digit',month:'short'}) : '—';
  const nights = () => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    return Math.ceil((dates.checkOut - dates.checkIn) / 86400000);
  };

  const submit = () => {
    const r = ROOMS.find(r => r.id === selectedRoom);
    const msg = [`*Бронирование — Villa Jaconda*`,`🏠 ${r?.name} (${r?.price}/${r?.unit})`,`📅 Заезд: ${fmt(dates.checkIn)}`,`📅 Выезд: ${fmt(dates.checkOut)}`,`🌙 Ночей: ${nights()}`,`👥 Гостей: ${guests}`,`👤 ${form.name}`,`📞 ${form.phone}`,form.notes?`📝 ${form.notes}`:null].filter(Boolean).join('\n');
    window.open(`https://wa.me/37377812345?text=${encodeURIComponent(msg)}`,'_blank','noopener');
    setSent(true);
    setTimeout(()=>setSent(false),5000);
  };

  const steps = ['Формат','Даты','Данные'];

  const inputStyle = { width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:8, border:'1px solid var(--r-line-strong)', background:'var(--r-bg)', color:'var(--r-text)', fontSize:14, fontFamily:'inherit', outline:'none' };

  return (
    <section id="contact" style={{ background:'var(--r-bg)', borderTop:'1px solid var(--r-line)', paddingTop:'clamp(80px,10vw,140px)', paddingBottom:'clamp(80px,10vw,140px)' }}>
      <div style={{ maxWidth:1440, margin:'0 auto', padding:'0 clamp(20px,4vw,60px)' }}>

        {/* Header */}
        <div style={{ marginBottom:'clamp(40px,6vw,60px)' }}>
          <p style={{ fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase', color:'var(--r-gold)', fontWeight:500, marginBottom:14 }}>— Бронирование</p>
          <h2 style={{ fontFamily:'var(--r-serif)', fontSize:'clamp(2.4rem,5vw,4.5rem)', fontWeight:300, lineHeight:1, letterSpacing:'-0.02em', color:'var(--r-text)', margin:'0 0 16px' }}>
            Забронируйте <em style={{ fontStyle:'italic', color:'var(--r-gold)' }}>онлайн</em>
          </h2>
        </div>

        <div className="booking-grid" style={{ display:'grid', gridTemplateColumns:'1fr minmax(auto,340px)', gap:40, alignItems:'start' }}>

          {/* ── Left: steps ─────────────────────────────── */}
          <div>
            {/* Step progress */}
            <div style={{ display:'flex', gap:0, marginBottom:40, background:'var(--r-surface)', borderRadius:12, overflow:'hidden', border:'1px solid var(--r-line)' }}>
              {steps.map((s, i) => {
                const n = i+1;
                const done = step > n;
                const active = step === n;
                return (
                  <button key={s} onClick={() => done && setStep(n)}
                    style={{ flex:1, padding:'14px 12px', border:'none', borderRight: i<2 ? '1px solid var(--r-line)' : 'none', background: active ? BOOKING_NAVY : done ? `${BOOKING_TEAL}12` : 'transparent', cursor: done ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background 0.3s ease', fontFamily:'inherit' }}>
                    <span style={{ width:22, height:22, borderRadius:'50%', background: active ? '#fff' : done ? BOOKING_TEAL : 'var(--r-line)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color: active ? BOOKING_NAVY : done ? '#fff' : 'var(--r-muted)', flexShrink:0 }}>
                      {done ? <Icon name="check" size={12} color="#fff" strokeWidth={2.5} /> : n}
                    </span>
                    <span style={{ fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase', color: active ? '#fff' : done ? BOOKING_TEAL : 'var(--r-muted)', fontWeight: active ? 600 : 400 }}>{s}</span>
                  </button>
                );
              })}
            </div>

            {/* ── STEP 1: Choose room ── */}
            {step === 1 && (
              <div style={{ animation:'fadeSlideUp 0.4s ease both' }}>
                <p style={{ fontSize:13, color:'var(--r-text-soft)', marginBottom:20 }}>Выберите формат проживания:</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(220px,100%),1fr))', gap:14 }}>
                  {ROOMS.map(r => {
                    const sel = selectedRoom===r.id;
                    return (
                      <button key={r.id} onClick={() => { setSelectedRoom(r.id); }}
                        style={{ position:'relative', overflow:'hidden', border:`2px solid ${sel ? BOOKING_NAVY : 'var(--r-line)'}`, borderRadius:12, background: sel ? '#fff' : 'var(--r-surface)', cursor:'pointer', textAlign:'left', padding:0, transition:'all 0.3s ease', boxShadow: sel ? `0 8px 32px rgba(6,59,92,0.15)` : 'none', fontFamily:'inherit' }}>
                        {/* Accent bar */}
                        <div style={{ height:3, background: sel ? BOOKING_TEAL : 'var(--r-line)', transition:'background 0.3s ease' }} />
                        {/* Photo */}
                        <div style={{ height:130, overflow:'hidden', position:'relative' }}>
                          <img src={r.cover} alt={r.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s ease', transform: sel ? 'scale(1.05)' : 'scale(1)' }} />
                          <div style={{ position:'absolute', inset:0, background:'rgba(6,59,92,0.15)' }} />
                          {/* Tag */}
                          <span style={{ position:'absolute', top:10, left:10, fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'#fff', background:'rgba(6,59,92,0.7)', backdropFilter:'blur(8px)', padding:'4px 8px', borderRadius:4 }}>{r.tag}</span>
                          {/* Selected check */}
                          {sel && (
                            <div style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:BOOKING_TEAL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ padding:'14px 16px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                            <span style={{ fontSize:15, fontWeight:700, color: sel ? BOOKING_NAVY : 'var(--r-text)' }}>{r.name}</span>
                            <span style={{ fontSize:13, fontWeight:700, color:BOOKING_CORAL, background:`${BOOKING_CORAL}12`, padding:'3px 8px', borderRadius:6 }}>{r.price}</span>
                          </div>
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:BOOKING_TEAL, background:`${BOOKING_TEAL}15`, padding:'4px 8px', borderRadius:8, fontWeight:600 }}>
                              <Icon name="users" size={11} color={BOOKING_TEAL} strokeWidth={1.5} />
                              до {r.guests} гостей
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => selectedRoom && setStep(2)} disabled={!selectedRoom}
                  style={{ marginTop:28, width:'100%', padding:'16px', background: selectedRoom ? BOOKING_NAVY : 'var(--r-line)', color: selectedRoom ? '#fff' : 'var(--r-muted)', border:'none', borderRadius:10, fontSize:13, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'inherit', fontWeight:600, cursor: selectedRoom ? 'pointer' : 'default', transition:'background 0.3s ease', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  {selectedRoom ? 'Выбрать даты →' : 'Выберите формат'}
                </button>
              </div>
            )}

            {/* ── STEP 2: Dates ── */}
            {step === 2 && (
              <div style={{ animation:'fadeSlideUp 0.4s ease both' }}>
                <p style={{ fontSize:13, color:'var(--r-text-soft)', marginBottom:20 }}>Выберите даты заезда и выезда:</p>
                {/* Date pills */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
                  {[{label:'Заезд',val:dates.checkIn},{label:'Выезд',val:dates.checkOut}].map(({label,val}) => (
                    <div key={label} style={{ padding:'14px 16px', background:'var(--r-surface)', border:`1px solid ${val ? BOOKING_NAVY : 'var(--r-line)'}`, borderRadius:10 }}>
                      <p style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--r-muted)', marginBottom:6 }}>{label}</p>
                      <p style={{ fontSize:16, fontWeight:600, color: val ? BOOKING_NAVY : 'var(--r-muted)', fontFamily:'var(--r-serif)' }}>{val ? val.toLocaleDateString('ru-RU') : 'не выбрано'}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background:'var(--r-surface)', border:'1px solid var(--r-line)', borderRadius:12, padding:'24px 20px' }}>
                  <BookingCal checkIn={dates.checkIn} checkOut={dates.checkOut} onSelect={d => setDates(d)} />
                </div>
                <button onClick={() => dates.checkIn && dates.checkOut && setStep(3)} disabled={!dates.checkIn||!dates.checkOut}
                  style={{ marginTop:20, width:'100%', padding:'16px', background: dates.checkIn&&dates.checkOut ? BOOKING_NAVY : 'var(--r-line)', color: dates.checkIn&&dates.checkOut ? '#fff' : 'var(--r-muted)', border:'none', borderRadius:10, fontSize:13, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'inherit', fontWeight:600, cursor: dates.checkIn&&dates.checkOut ? 'pointer' : 'default', transition:'all 0.3s ease', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  {dates.checkIn&&dates.checkOut ? `Продолжить (${nights()} ${nights()===1?'ночь':'ночей'}) →` : 'Выберите даты'}
                </button>
              </div>
            )}

            {/* ── STEP 3: Details ── */}
            {step === 3 && (
              <div style={{ animation:'fadeSlideUp 0.4s ease both' }}>
                <p style={{ fontSize:13, color:'var(--r-text-soft)', marginBottom:24 }}>Заполните контактные данные:</p>

                {/* Guest stepper */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'var(--r-surface)', border:'1px solid var(--r-line)', borderRadius:10, marginBottom:16 }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--r-text)', marginBottom:2 }}>Количество гостей</p>
                    <p style={{ fontSize:11, color:'var(--r-muted)' }}>максимум {ROOMS.find(r=>r.id===selectedRoom)?.guests||30} чел.</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <button onClick={() => setGuests(g => Math.max(1,g-1))} style={{ width:36, height:36, borderRadius:10, border:'none', background:`${BOOKING_NAVY}18`, color:BOOKING_NAVY, fontSize:20, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                    <span style={{ fontSize:20, fontWeight:700, color:'var(--r-text)', minWidth:28, textAlign:'center' }}>{guests}</span>
                    <button onClick={() => setGuests(g => g+1)} style={{ width:36, height:36, borderRadius:10, border:'none', background:BOOKING_NAVY, color:'#fff', fontSize:20, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--r-muted)', marginBottom:8 }}>Ваше имя</label>
                    <input type="text" required placeholder="Иван" style={inputStyle} value={form.name} onChange={set('name')} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--r-muted)', marginBottom:8 }}>Телефон</label>
                    <input type="tel" required placeholder="+373 ..." style={inputStyle} value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={{ display:'block', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'var(--r-muted)', marginBottom:8 }}>Пожелания</label>
                  <textarea rows={3} placeholder="Сауна, особый повод, питание..." style={{ ...inputStyle, resize:'vertical' }} value={form.notes} onChange={set('notes')} />
                </div>

                <button onClick={submit} disabled={!form.name||!form.phone}
                  style={{ width:'100%', padding:'17px', background: form.name&&form.phone ? BOOKING_NAVY : 'var(--r-line)', color: form.name&&form.phone ? '#fff' : 'var(--r-muted)', border:'none', borderRadius:10, fontSize:13, letterSpacing:'0.14em', textTransform:'uppercase', fontFamily:'inherit', fontWeight:700, cursor: form.name&&form.phone ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'background 0.3s ease', boxShadow: form.name&&form.phone ? `0 8px 24px rgba(6,59,92,0.25)` : 'none' }}
                  onMouseEnter={e=>{ if(form.name&&form.phone) e.currentTarget.style.background=BOOKING_CORAL; }}
                  onMouseLeave={e=>{ if(form.name&&form.phone) e.currentTarget.style.background=BOOKING_NAVY; }}>
                  <Icon name="message-circle" size={16} strokeWidth={1.5} />
                  {sent ? 'Заявка отправлена ✓' : 'Отправить в WhatsApp'}
                </button>
                <p style={{ fontSize:11, color:'var(--r-muted)', textAlign:'center', marginTop:12 }}>Откроется WhatsApp с заполненной заявкой</p>
              </div>
            )}
          </div>

          {/* ── Right: summary ─────────────────────────── */}
          <div style={{ position:'sticky', top:96 }}>
            {/* Property card — app style */}
            <div style={{ background:BOOKING_NAVY, borderRadius:16, overflow:'hidden', marginBottom:14, boxShadow:'0 12px 40px rgba(6,59,92,0.25)' }}>
              {/* Teal accent bar */}
              <div style={{ height:4, background:BOOKING_TEAL }} />
              {selectedRoom ? (() => {
                const r = ROOMS.find(r=>r.id===selectedRoom);
                return (
                  <div style={{ padding:'20px 20px 24px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <p style={{ fontSize:19, fontWeight:700, color:'#fff', marginBottom:4 }}>{r.name}</p>
                        <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>до {r.guests} гостей</p>
                      </div>
                      <span style={{ background:'#fff', color:BOOKING_CORAL, fontSize:12, fontWeight:700, padding:'6px 10px', borderRadius:10 }}>{r.price}</span>
                    </div>
                    {dates.checkIn && dates.checkOut && (
                      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', marginTop:4 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Заезд</span>
                          <span style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{dates.checkIn.toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Выезд</span>
                          <span style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{dates.checkOut.toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div style={{ height:1, background:'rgba(255,255,255,0.12)', margin:'10px 0' }} />
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Итого</span>
                          <span style={{ fontSize:16, color:BOOKING_CORAL, fontWeight:700 }}>{parseInt(r.price)*nights()} PRB</span>
                        </div>
                      </div>
                    )}
                    {guests > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, background:`${BOOKING_TEAL}18`, borderRadius:8, padding:'8px 12px', alignSelf:'flex-start' }}>
                        <Icon name="users" size={13} color={BOOKING_TEAL} strokeWidth={1.5} />
                        <span style={{ fontSize:12, color:BOOKING_TEAL, fontWeight:600 }}>{guests} гостей</span>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div style={{ padding:'24px 20px', color:'rgba(255,255,255,0.4)', fontSize:14 }}>
                  Выберите формат на шаге 1
                </div>
              )}
            </div>

            {/* Contacts */}
            <div style={{ background:'var(--r-surface)', border:'1px solid var(--r-line)', borderRadius:12, padding:'20px' }}>
              <p style={{ fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'var(--r-muted)', marginBottom:14 }}>— Связаться напрямую</p>
              {[{icon:'message-circle',text:'+373 778 12 345',href:'https://wa.me/37377812345'},{icon:'mail',text:'hello@villajaconda.com',href:'mailto:hello@villajaconda.com'},{icon:'clock',text:'Ответим в течение часа',href:null}].map(c => (
                <div key={c.text} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <Icon name={c.icon} size={14} color="var(--r-gold)" strokeWidth={1.5} />
                  {c.href ? <a href={c.href} style={{ fontSize:13, color:'var(--r-text-soft)', textDecoration:'none', transition:'color 0.3s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--r-gold)'} onMouseLeave={e=>e.currentTarget.style.color='var(--r-text-soft)'}>{c.text}</a>
                  : <span style={{ fontSize:13, color:'var(--r-muted)' }}>{c.text}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { BookingR });
