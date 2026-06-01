function FAQR() {
  const faqs = [
    { q:'Как работает программа лояльности?', a:'За каждое бронирование вам начисляются баллы. Уровень определяется накопленными баллами: Bronze (0–500), Silver (500–2000), Gold (2000–5000), Platinum (от 5000). С ростом уровня увеличивается кешбек и открываются дополнительные привилегии.' },
    { q:'Можно ли забронировать весь комплекс?', a:'Да, формат «Вся территория» включает полный выкуп виллы — все номера, общие зоны, бассейн, сауну, мангальную и беседку. Это закрытый формат для крупных мероприятий, корпоративов или больших компаний до 30 человек.' },
    { q:'Как происходит бронирование?', a:'Заполните форму на сайте — заявка придёт нам в WhatsApp. Мы свяжемся в течение часа, уточним детали и подтвердим бронирование. Оплата при заезде или по договорённости.' },
    { q:'Есть ли минимальный срок проживания?', a:'Стандарт и Люкс — от 1 ночи. Задний двор — от 1 дня. Полный выкуп территории — от 1 ночи. В высокий сезон (июнь–август) может быть минимум 2 ночи — уточняйте при бронировании.' },
    { q:'Какие удобства входят в стоимость?', a:'Бассейн, WiFi, парковка и базовая уборка входят во все форматы. Сауна, мангал, беседка, большой зал — зависят от выбранного формата. Подробный список удобств указан на странице каждого номера.' },
    { q:'Можно ли привезти животных?', a:'Этот вопрос решается индивидуально. Свяжитесь с нами заранее, чтобы согласовать условия.' },
    { q:'Как попасть на виллу? Есть ли трансфер?', a:'Вилла находится по адресу: ул. Набережная 85, Слободзея, Приднестровье. Трансфер организуется по запросу — уточняйте при бронировании. Собственная парковка на территории.' },
    { q:'Как скачать приложение лояльности?', a:'Приложение доступно в App Store и Google Play. Поиск: «Villa Jaconda». После регистрации баллы начнут начисляться с первого же бронирования.' },
  ];

  const [open, setOpen] = React.useState(null);

  return (
    <section id="faq" style={{ background:'var(--r-surface-warm)', borderTop:'1px solid var(--r-line)', paddingTop:'clamp(80px,10vw,140px)', paddingBottom:'clamp(80px,10vw,140px)' }}>
      <div style={{ maxWidth:1440, margin:'0 auto', padding:'0 clamp(20px,4vw,60px)' }}>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(360px,100%),1fr))', gap:'clamp(48px,8vw,100px)', alignItems:'start' }}>

          {/* Left: title */}
          <div style={{ position:'sticky', top:100 }}>
            <p style={{ fontSize:10, letterSpacing:'0.32em', textTransform:'uppercase', color:'var(--r-gold)', fontWeight:500, marginBottom:16 }}>— FAQ</p>
            <h2 style={{ fontFamily:'var(--r-serif)', fontSize:'clamp(2.4rem,4.5vw,4rem)', fontWeight:300, lineHeight:1.05, letterSpacing:'-0.02em', color:'var(--r-text)', margin:'0 0 24px' }}>
              Частые<br/><em style={{ fontStyle:'italic', color:'var(--r-gold)' }}>вопросы</em>
            </h2>
            <p style={{ fontSize:14, color:'var(--r-text-soft)', lineHeight:1.7, maxWidth:320 }}>
              Не нашли ответ? Напишите нам — ответим быстро.
            </p>
            <a href="https://wa.me/37377812345" target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:28, padding:'12px 22px', background:'var(--r-text)', color:'var(--r-bg)', borderRadius:999, fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', textDecoration:'none', fontWeight:500, transition:'background 0.3s ease' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--r-gold)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--r-text)'}>
              <Icon name="message-circle" size={14} strokeWidth={1.5} />
              Написать →
            </a>
          </div>

          {/* Right: accordion */}
          <div>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom:'1px solid var(--r-line)' }}>
                <button onClick={() => setOpen(open===i ? null : i)}
                  style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, padding:'22px 0', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <span style={{ fontFamily:'var(--r-serif)', fontSize:12, color:'var(--r-gold)', letterSpacing:'0.1em', fontVariantNumeric:'tabular-nums', flexShrink:0 }}>
                      {String(i+1).padStart(2,'0')}
                    </span>
                    <span style={{ fontSize:15, color:'var(--r-text)', fontWeight: open===i ? 500 : 400, transition:'color 0.3s ease' }}>
                      {faq.q}
                    </span>
                  </div>
                  <div style={{ transform: open===i ? 'rotate(45deg)' : 'rotate(0deg)', transition:'transform 0.3s ease', flexShrink:0 }}>
                    <Icon name="plus" size={18} color="var(--r-gold)" strokeWidth={1.5} />
                  </div>
                </button>

                <div style={{ overflow:'hidden', maxHeight: open===i ? 300 : 0, transition:'max-height 0.4s cubic-bezier(0.16,1,0.3,1)', opacity: open===i ? 1 : 0 }}>
                  <p style={{ fontSize:14, color:'var(--r-text-soft)', lineHeight:1.75, padding:'0 0 22px 36px' }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { FAQR });
