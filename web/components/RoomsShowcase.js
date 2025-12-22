'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

const rooms = [
  {
    src: '/images/luks1.png',
    name: 'Люкс Сюит',
    category: 'Премиум',
    size: '85 м²',
    desc: 'Просторный сюит с панорамными окнами, отдельной гостиной и авторским декором. Идеально для тех, кто ценит пространство и уединение.',
    features: ['Панорамные окна', 'Отдельная гостиная', 'Джакузи', 'Терраса'],
    color: '#F7931E',
  },
  {
    src: '/images/luks2.png',
    name: 'Люкс Интерьер',
    category: 'Премиум',
    size: '70 м²',
    desc: 'Изысканный интерьер в современном стиле с тщательно подобранными деталями. Каждый элемент создан для максимального комфорта.',
    features: ['Дизайнерская мебель', 'Smart TV 75"', 'Кофемашина', 'Мини-бар'],
    color: '#8B5CF6',
  },
  {
    src: '/images/luks3.png',
    name: 'Люкс Спальня',
    category: 'Премиум',
    size: '65 м²',
    desc: 'Спальня с кроватью king-size, мягким освещением и встроенной системой климат-контроля. Полный покой после насыщенного дня.',
    features: ['Кровать King-size', 'Климат-контроль', 'Blackout шторы', 'Ароматерапия'],
    color: '#14B8A6',
  },
  {
    src: '/images/luks4.png',
    name: 'Люкс Делюкс',
    category: 'Премиум',
    size: '90 м²',
    desc: 'Наш флагманский номер с лучшим видом на территорию. Просторная планировка, эксклюзивные материалы и персональный сервис.',
    features: ['Лучший вид', 'Персональный батлер', 'Champagne welcome', 'Приватный выход'],
    color: '#EC4899',
  },
  {
    src: '/images/luks5.png',
    name: 'Люкс Ванная',
    category: 'Spa-класс',
    size: '25 м²',
    desc: 'Ванная комната-spa с натуральным мрамором, дождевым душем и отдельной ванной с видом на сад. Настоящий ритуал расслабления.',
    features: ['Мраморная отделка', 'Дождевой душ', 'Ванна free-standing', 'Luxury косметика'],
    color: '#FF6B35',
  },
  {
    src: '/images/luks6.png',
    name: 'Люкс Терраса',
    category: 'Outdoor',
    size: '40 м²',
    desc: 'Приватная терраса с лежаками, живой изгородью и видом на бассейн. Ваше личное пространство под открытым небом.',
    features: ['Лежаки с зонтом', 'Живая изгородь', 'Барбекю по запросу', 'Вид на бассейн'],
    color: '#10B981',
  },
  {
    src: '/images/luks7.png',
    name: 'Люкс Вид',
    category: 'Panoramic',
    size: '75 м²',
    desc: 'Номер с захватывающим панорамным видом на природу. Стеклянные стены растворяют границу между интерьером и окружающим пространством.',
    features: ['Панорамный вид 180°', 'Стеклянные стены', 'Балкон на всю ширину', 'Телескоп'],
    color: '#004E89',
  },
  {
    src: '/images/luks8.png',
    name: 'Люкс Апартаменты',
    category: 'Апартаменты',
    size: '120 м²',
    desc: 'Двухуровневые апартаменты — полноценный дом внутри виллы. Кухня, гостиная, спальня и личная терраса с бассейном.',
    features: ['2 уровня', 'Кухня', 'Личный бассейн', 'До 4 гостей'],
    color: '#F7931E',
  },
];

function TiltCard({ children, style, className }) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.02)`;
    el.style.transition = 'transform 0.1s ease';
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1)';
    el.style.transition = 'transform 0.5s ease';
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ ...style, transformStyle: 'preserve-3d' }} className={className}>
      {children}
    </div>
  );
}

export default function RoomsShowcase() {
  const containerRef = useRef(null);
  const imgRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScroll = el.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(1, scrolled / totalScroll);
      const idx = Math.min(Math.floor(progress * rooms.length), rooms.length - 1);
      setActiveIndex(idx);

      // Parallax on each image
      imgRefs.current.forEach((imgEl, i) => {
        if (!imgEl) return;
        const offset = (scrolled - i * (totalScroll / rooms.length)) / (totalScroll / rooms.length);
        imgEl.style.transform = `translateY(${offset * 60}px) scale(1.15)`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const room = rooms[activeIndex];

  return (
    <section id="rooms" style={{ position: 'relative' }}>
      {/* Section header — above sticky area */}
      <div className="py-20 px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
          Номерной фонд
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Выберите свой <span className="gradient-text">идеальный номер</span>
        </h2>
        <div className="section-divider" />
        <p className="text-slate-400 max-w-xl mx-auto mt-4">
          Прокрутите вниз, чтобы исследовать каждый номер
        </p>
        {/* Scroll hint */}
        <div className="flex justify-center mt-8">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <div className="w-5 h-8 rounded-full border-2 border-slate-600 flex items-start justify-center p-1">
              <div className="w-1 h-2 rounded-full bg-orange-500" style={{ animation: 'float 1.5s ease-in-out infinite' }} />
            </div>
            <span className="text-xs uppercase tracking-widest">Scroll</span>
          </div>
        </div>
      </div>

      {/* Sticky scroll container */}
      <div
        ref={containerRef}
        style={{ height: `${rooms.length * 100}vh`, position: 'relative' }}
      >
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Background images — crossfade */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {rooms.map((r, i) => (
              <div
                key={r.src}
                style={{
                  position: 'absolute', inset: 0,
                  opacity: i === activeIndex ? 1 : 0,
                  transition: 'opacity 0.8s ease',
                  overflow: 'hidden',
                }}
              >
                <div
                  ref={el => imgRefs.current[i] = el}
                  style={{ position: 'absolute', inset: '-15%', transition: 'transform 0.05s linear' }}
                >
                  <Image src={r.src} alt={r.name} fill className="object-cover" sizes="100vw" priority={i === 0} />
                </div>
              </div>
            ))}
          </div>

          {/* Dark gradient overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 60%, rgba(15,23,42,0.1) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 50%)' }} />

          {/* Content */}
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', padding: '0 48px', maxWidth: 1152, margin: '0 auto' }}>

            {/* Room info card */}
            <TiltCard
              style={{ maxWidth: 440 }}
              key={activeIndex}
            >
              <div
                style={{
                  background: 'rgba(15,23,42,0.75)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 24,
                  padding: 40,
                  animation: loaded ? 'fadeInUp 0.6s ease forwards' : 'none',
                }}
              >
                {/* Category badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 99,
                    background: `${room.color}20`,
                    border: `1px solid ${room.color}50`,
                    color: room.color,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 20,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: room.color, display: 'inline-block' }} />
                  {room.category}
                </div>

                <h3 style={{ fontSize: 36, fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 8 }}>
                  {room.name}
                </h3>
                <p style={{ color: room.color, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                  Площадь: {room.size}
                </p>
                <p style={{ color: '#94A3B8', lineHeight: 1.7, marginBottom: 24, fontSize: 14 }}>
                  {room.desc}
                </p>

                {/* Features */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
                  {room.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: `${room.color}20`, border: `1px solid ${room.color}50`, color: room.color, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                      <span style={{ color: '#CBD5E1', fontSize: 13 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#contact"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '13px 0',
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${room.color}, #FF6B35)`,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: 'none',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.opacity = '0.85'}
                  onMouseLeave={e => e.target.style.opacity = '1'}
                >
                  Забронировать
                </a>
              </div>
            </TiltCard>
          </div>

          {/* Room counter */}
          <div style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
              {String(activeIndex + 1).padStart(2, '0')}
            </span>
            <div style={{ width: 120, height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: room.color,
                borderRadius: 2,
                width: `${((activeIndex + 1) / rooms.length) * 100}%`,
                transition: 'width 0.5s ease, background 0.5s ease',
              }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 20 }}>
              {String(rooms.length).padStart(2, '0')}
            </span>
          </div>

          {/* Side navigation dots */}
          <div style={{
            position: 'absolute',
            right: 32,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {rooms.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = containerRef.current;
                  if (!el) return;
                  const targetScroll = el.offsetTop + (i / rooms.length) * (el.offsetHeight - window.innerHeight) + 10;
                  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }}
                title={r.name}
                style={{
                  width: i === activeIndex ? 10 : 6,
                  height: i === activeIndex ? 10 : 6,
                  borderRadius: '50%',
                  background: i === activeIndex ? room.color : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Room name top right */}
          <div style={{
            position: 'absolute',
            top: 100,
            right: 60,
            textAlign: 'right',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
              Сейчас смотрите
            </p>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 600, transition: 'all 0.3s ease' }}>
              {room.name}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
