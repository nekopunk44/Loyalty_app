'use client';
import { useState } from 'react';
import Icon from './ui/Icon';

const ROOMS = [
  { id: 'standart', num: '01', name: 'Стандарт', tag: 'Studio', description: 'Студия с террасой и бассейном. Уютный формат для пары или небольшой компании до 10 человек.', price: '150', unit: 'ночь', guests: 10, rooms: 2, amenities: ['WiFi', 'Бассейн', 'Сауна', 'Мангал', 'Кондиционер', 'Парковка', 'TV'], cover: '/images/std1.png' },
  { id: 'luks', num: '02', name: 'Люкс', tag: 'Premium', description: 'Полный комфорт с видом на природу. Десять комнат, большой зал и собственная кухня для крупных компаний.', price: '200', unit: 'ночь', guests: 20, rooms: 10, amenities: ['WiFi', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Парковка', 'Кондиционер', 'Караоке'], cover: '/images/luks1.png' },
  { id: 'zad', num: '03', name: 'Задний двор', tag: 'Outdoor', description: 'Открытая территория с бассейном, беседкой и мангальной зоной. Идеально для шумных праздников.', price: '100', unit: 'день', guests: 15, rooms: null, amenities: ['WiFi', 'Бассейн', 'Мангал', 'Беседка', 'Шезлонги', 'Холодильник', 'Парковка'], cover: '/images/zad1.png' },
  { id: 'full', num: '04', name: 'Вся территория', tag: 'Exclusive', description: 'Полный выкуп виллы. Закрытый формат для корпоративов и больших мероприятий до 30 человек.', price: '500', unit: 'ночь', guests: 30, rooms: 10, amenities: ['WiFi', 'Кухня', 'Бассейн', 'Сауна', 'Мангал', 'Большой зал', 'Беседка', 'Парковка', 'TV', 'Кондиционер'], cover: '/images/luks2.png' },
];

const ICON_MAP = { WiFi: 'wifi', Бассейн: 'waves', Сауна: 'flame', Мангал: 'flame', Кондиционер: 'wind', Парковка: 'car', Кухня: 'utensils', 'Большой зал': 'layout', Беседка: 'umbrella', Шезлонги: 'armchair', Холодильник: 'refrigerator', TV: 'tv', Зонты: 'umbrella', Караоке: 'mic' };

export default function Rooms() {
  const [hoveredImg, setHoveredImg] = useState(null);

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
  };

  return (
    <section id="rooms" style={{ background: 'var(--r-bg)' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(80px,10vw,140px) clamp(20px,4vw,60px) clamp(48px,6vw,80px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--r-gold)', fontWeight: 500, marginBottom: 14 }}>— Каталог</p>
            <h2 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.4rem,5vw,4.5rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--r-text)', margin: 0 }}>
              Четыре формата <em style={{ fontStyle: 'italic', color: 'var(--r-gold)' }}>проживания</em>
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--r-text-soft)', lineHeight: 1.7, maxWidth: 340 }}>
            Выберите формат под ваш случай — от студии на двоих до полного выкупа виллы.
          </p>
        </div>
      </div>

      {ROOMS.map((room, i) => {
        const isEven = i % 2 === 0;
        return (
          <div key={room.id} style={{ borderTop: '1px solid var(--r-line)' }}>
            <div className="rooms-row" style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'clamp(480px,60vh,700px)' }}>

              <div style={{ order: isEven ? 1 : 2, padding: 'clamp(48px,6vw,80px) clamp(32px,4vw,60px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--r-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                  <span style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(4rem,6vw,6rem)', lineHeight: 1, color: 'rgba(160,120,60,0.12)', fontWeight: 400, userSelect: 'none' }}>{room.num}</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--r-gold)', padding: '4px 12px', border: '1px solid rgba(160,120,60,0.3)', borderRadius: 2 }}>{room.tag}</span>
                </div>

                <h3 style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(2.4rem,4vw,4rem)', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--r-text)', margin: '0 0 18px' }}>{room.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--r-text-soft)', lineHeight: 1.75, maxWidth: 400, marginBottom: 32 }}>{room.description}</p>

                <div style={{ display: 'flex', gap: 32, marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid var(--r-line)' }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 }}>Цена</p>
                    <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: 'var(--r-gold)', lineHeight: 1, fontWeight: 400 }}>{room.price} <span style={{ fontSize: '0.5em', color: 'var(--r-muted)', fontFamily: 'var(--r-sans)' }}>PRB/{room.unit}</span></p>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 }}>Гостей</p>
                    <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: 'var(--r-gold)', lineHeight: 1, fontWeight: 400 }}>до {room.guests}</p>
                  </div>
                  {room.rooms && (
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--r-muted)', marginBottom: 8 }}>Комнат</p>
                      <p style={{ fontFamily: 'var(--r-serif)', fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', color: 'var(--r-gold)', lineHeight: 1, fontWeight: 400 }}>{room.rooms}</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 36 }}>
                  {room.amenities.slice(0, 5).map(a => (
                    <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '6px 11px', border: '1px solid var(--r-line-strong)', borderRadius: 999, color: 'var(--r-text-soft)' }}>
                      <Icon name={ICON_MAP[a] || 'check'} size={10} color="var(--r-gold)" strokeWidth={1.5} />
                      {a}
                    </span>
                  ))}
                  {room.amenities.length > 5 && <span style={{ fontSize: 10, padding: '6px 11px', border: '1px solid var(--r-line)', borderRadius: 999, color: 'var(--r-muted)' }}>+{room.amenities.length - 5}</span>}
                </div>

                <button onClick={scrollToContact}
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', background: 'var(--r-text)', color: 'var(--r-bg)', border: 'none', borderRadius: 999, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', transition: 'background 0.3s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--r-gold)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--r-text)'}>
                  Выбрать формат →
                </button>
              </div>

              <div style={{ order: isEven ? 2 : 1, position: 'relative', overflow: 'hidden', minHeight: 400 }}
                onMouseEnter={() => setHoveredImg(i)}
                onMouseLeave={() => setHoveredImg(null)}>
                <img src={room.cover} alt={room.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.9s cubic-bezier(0.16,1,0.3,1)', transform: hoveredImg === i ? 'scale(1.06)' : 'scale(1)' }} />
                <div style={{ position: 'absolute', inset: 0, background: isEven ? 'linear-gradient(270deg, transparent 60%, rgba(247,242,232,0.12) 100%)' : 'linear-gradient(90deg, transparent 60%, rgba(247,242,232,0.12) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 20, right: isEven ? 20 : 'auto', left: isEven ? 'auto' : 20, fontFamily: 'var(--r-serif)', fontSize: 'clamp(80px,12vw,150px)', lineHeight: 1, color: 'rgba(255,255,255,0.08)', fontWeight: 400, userSelect: 'none', letterSpacing: '-0.04em' }}>{room.num}</div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
