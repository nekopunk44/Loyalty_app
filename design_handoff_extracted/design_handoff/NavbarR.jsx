function NavbarR({ active, setActive }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { id:'rooms', label:'Номера' },
    { id:'tour', label:'3D-тур' },
    { id:'loyalty', label:'Лояльность' },
    { id:'reviews', label:'Отзывы' },
    { id:'faq', label:'FAQ' },
    { id:'contact', label:'Контакты' },
  ];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
    setOpen(false);
    setActive(id);
  };

  return (
    <header style={{
      position:'fixed', top:0, left:0, right:0, zIndex:50,
      backdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(1.2)' : 'none',
      background: scrolled ? 'rgba(247,242,232,0.92)' : 'transparent',
      borderBottom: `1px solid ${scrolled ? 'rgba(160,120,60,0.15)' : 'transparent'}`,
      transition: 'all 0.5s ease',
    }}>
      <div style={{ maxWidth:1440, margin:'0 auto', padding:'0 clamp(20px,4vw,60px)', height: scrolled ? 64 : 88, display:'flex', alignItems:'center', justifyContent:'space-between', transition:'height 0.4s ease' }}>

        {/* Logo */}
        <a href="#" onClick={e => { e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); }}
          style={{ display:'flex', alignItems:'center', gap:11, textDecoration:'none', color:'var(--r-text)' }}>
          <svg viewBox="0 0 100 100" fill="none" width="28" height="28" style={{ color:'var(--r-gold)', flexShrink:0 }}>
            <g stroke="currentColor" strokeWidth="0.6" opacity="0.3">
              <line x1="14" y1="12" x2="14" y2="88"/><line x1="36.6" y1="12" x2="36.6" y2="88"/>
              <line x1="50" y1="12" x2="50" y2="88"/><line x1="63.4" y1="12" x2="63.4" y2="88"/>
              <line x1="86" y1="12" x2="86" y2="88"/>
              <line x1="12" y1="14" x2="88" y2="14"/><line x1="12" y1="36.6" x2="88" y2="36.6"/>
              <line x1="12" y1="50" x2="88" y2="50"/><line x1="12" y1="63.4" x2="88" y2="63.4"/>
              <line x1="12" y1="86" x2="88" y2="86"/>
            </g>
            <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="2"/>
            <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="2"/>
            <circle cx="50" cy="50" r="12" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span style={{ fontFamily:'var(--r-serif)', fontSize:20, fontWeight:300, letterSpacing:'0.04em' }}>
            VILLA <span style={{ color:'var(--r-gold)' }}>JACONDA</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav style={{ display:'flex', alignItems:'center', gap:32 }}>
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`}
              onClick={e => { e.preventDefault(); scrollTo(l.id); }}
              style={{ fontSize:12, letterSpacing:'0.16em', textTransform:'uppercase', color: active===l.id ? 'var(--r-gold)' : 'var(--r-text-soft)', transition:'color 0.3s ease', textDecoration:'none', fontWeight: active===l.id ? 500 : 400 }}
              onMouseEnter={e => { if (active!==l.id) e.currentTarget.style.color='var(--r-text)'; }}
              onMouseLeave={e => { if (active!==l.id) e.currentTarget.style.color='var(--r-text-soft)'; }}>
              {l.label}
            </a>
          ))}
          <a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 22px', background:'var(--r-text)', color:'var(--r-bg)', borderRadius:999, fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', textDecoration:'none', fontWeight:500, transition:'background 0.3s ease' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--r-gold)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--r-text)'}>
            Забронировать →
          </a>
        </nav>
      </div>

      {/* Progress bar */}
      <div style={{ height:2, background:'var(--r-gold)', width:`${progress}%`, transition:'width 0.1s linear', opacity:0.7 }} />

      {/* Mobile menu */}
      {open && (
        <div style={{ background:'rgba(247,242,232,0.98)', backdropFilter:'blur(20px)', borderTop:'1px solid var(--r-line)', padding:'24px clamp(20px,4vw,60px) 32px' }}>
          {links.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={e => { e.preventDefault(); scrollTo(l.id); }}
              style={{ display:'block', fontFamily:'var(--r-serif)', fontSize:28, fontWeight:300, color: active===l.id ? 'var(--r-gold)' : 'var(--r-text)', marginBottom:20, textDecoration:'none' }}>
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

Object.assign(window, { NavbarR });
