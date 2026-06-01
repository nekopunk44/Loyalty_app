function ReviewsR() {
  const reviews = [
    { quote:'Уже третий раз возвращаюсь. Программа лояльности действительно работает — накопленные баллы дали апгрейд до апартаментов. Персональный менеджер — это отдельный класс обслуживания.', name:'Дмитрий К.', stay:'Апартаменты · 5 ночей', date:'Январь 2026', rating:5 },
    { quote:'Невероятное место. Провели здесь неделю всей семьёй и были в полном восторге. Приложение очень удобное — бронировать и следить за баллами просто. Уровень сервиса на высоте.', name:'Александра М.', stay:'Люкс · 7 ночей', date:'Март 2026', rating:5 },
    { quote:'Провели здесь медовый месяц. Вилла превзошла все ожидания — красивая территория, уютные номера, вкусные завтраки. Обязательно вернёмся в следующем сезоне.', name:'Елена и Сергей В.', stay:'Делюкс · 4 ночи', date:'Февраль 2026', rating:5 },
    { quote:'Отличное место для корпоративного отдыха. Возможность бронировать события через приложение очень удобна. Закрытое мероприятие организовано на высшем уровне.', name:'Михаил Р.', stay:'Вся территория · 3 ночи', date:'Апрель 2026', rating:5 },
  ];

  const [idx, setIdx] = React.useState(0);
  const [animKey, setAnimKey] = React.useState(0);
  const total = reviews.length;

  const navigate = (next) => {
    setIdx(next);
    setAnimKey(k => k+1);
  };

  const r = reviews[idx];

  return (
    <section id="reviews" style={{ background:'var(--r-bg)', borderTop:'1px solid var(--r-line)', paddingTop:'clamp(80px,10vw,140px)', paddingBottom:'clamp(80px,10vw,140px)' }}>
      <div style={{ maxWidth:1440, margin:'0 auto', padding:'0 clamp(20px,4vw,60px)' }}>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(420px,100%),1fr))', gap:'clamp(48px,8vw,100px)', alignItems:'center' }}>

          {/* Left: large image */}
          <div style={{ position:'relative', borderRadius:8, overflow:'hidden', aspectRatio:'4/3' }}>
            <img src="../../assets/images/property3.png" alt="Villa Jaconda" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, transparent 40%, rgba(247,242,232,0.4) 100%)' }} />
            {/* Rating badge */}
            <div style={{ position:'absolute', bottom:20, left:20, background:'rgba(247,242,232,0.95)', backdropFilter:'blur(10px)', borderRadius:8, padding:'12px 18px' }}>
              <div style={{ display:'flex', gap:3, marginBottom:4 }}>
                {[...Array(5)].map((_,i) => <span key={i} style={{ color:'var(--r-gold)', fontSize:14 }}>★</span>)}
              </div>
              <p style={{ fontSize:11, color:'var(--r-muted)', margin:0 }}>4.9 · 120+ отзывов</p>
            </div>
          </div>

          {/* Right: testimonial */}
          <div>
            <p style={{ fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase', color:'var(--r-gold)', fontWeight:500, marginBottom:32 }}>— Отзывы гостей</p>

            <div key={animKey} style={{ animation:'fadeSlideUp 0.7s cubic-bezier(0.16,1,0.3,1) both', minHeight:260 }}>
              {/* Stars */}
              <div style={{ display:'flex', gap:4, marginBottom:24 }}>
                {[...Array(r.rating)].map((_,i) => <span key={i} style={{ color:'var(--r-gold)', fontSize:18 }}>★</span>)}
              </div>

              <p style={{ fontFamily:'var(--r-serif)', fontSize:'clamp(1.3rem,2.2vw,1.9rem)', lineHeight:1.4, color:'var(--r-text)', fontStyle:'italic', marginBottom:36 }}>
                «{r.quote}»
              </p>

              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--r-surface-warm)', border:'1px solid var(--r-line)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--r-serif)', fontSize:16, color:'var(--r-gold)', fontWeight:300 }}>
                  {r.name[0]}
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:500, color:'var(--r-text)', marginBottom:3 }}>{r.name}</p>
                  <p style={{ fontSize:11, color:'var(--r-muted)', letterSpacing:'0.06em' }}>{r.stay} · {r.date}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:40, paddingTop:32, borderTop:'1px solid var(--r-line)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, fontVariantNumeric:'tabular-nums' }}>
                <span style={{ fontFamily:'var(--r-serif)', fontSize:28, color:'var(--r-gold)', fontWeight:400 }}>{String(idx+1).padStart(2,'0')}</span>
                <div style={{ width:48, height:1, background:'var(--r-line-strong)' }} />
                <span style={{ fontSize:13, color:'var(--r-muted)' }}>{String(total).padStart(2,'0')}</span>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                {[-1,1].map(d => (
                  <button key={d} onClick={() => navigate((idx+d+total)%total)}
                    style={{ width:48, height:48, borderRadius:'50%', border:'1px solid var(--r-line-strong)', background:'transparent', color:'var(--r-text)', cursor:'pointer', fontSize:15, transition:'all 0.3s ease', fontFamily:'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--r-text)'; e.currentTarget.style.color='var(--r-bg)'; e.currentTarget.style.borderColor='var(--r-text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--r-text)'; e.currentTarget.style.borderColor='var(--r-line-strong)'; }}>
                    {d<0?'←':'→'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { ReviewsR });
