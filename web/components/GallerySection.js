'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

const ALL_PHOTOS = [
  { src: '/images/property1.png', label: 'Villa Jaconda', category: 'villa' },
  { src: '/images/property2.png', label: 'Территория', category: 'villa' },
  { src: '/images/property3.png', label: 'Вид на виллу', category: 'villa' },
  { src: '/images/property4.png', label: 'Экстерьер', category: 'villa' },
  { src: '/images/zad1.png', label: 'Задний двор', category: 'villa' },
  { src: '/images/zad2.png', label: 'Территория', category: 'villa' },
  { src: '/images/zad3.png', label: 'Территория', category: 'villa' },
  { src: '/images/luks1.png', label: 'Люкс Сюит', category: 'rooms' },
  { src: '/images/luks2.png', label: 'Люкс Интерьер', category: 'rooms' },
  { src: '/images/luks3.png', label: 'Люкс Спальня', category: 'rooms' },
  { src: '/images/luks4.png', label: 'Люкс Детали', category: 'rooms' },
  { src: '/images/luks5.png', label: 'Люкс Ванная', category: 'rooms' },
  { src: '/images/luks6.png', label: 'Люкс Терраса', category: 'rooms' },
  { src: '/images/luks7.png', label: 'Люкс Вид', category: 'rooms' },
  { src: '/images/luks8.png', label: 'Люкс Апартаменты', category: 'rooms' },
];

const CATEGORIES = [
  { key: 'all', label: 'Все' },
  { key: 'villa', label: 'Вилла и территория' },
  { key: 'rooms', label: 'Номера' },
];

// Distribute photos into columns for masonry
function buildColumns(photos, count) {
  const cols = Array.from({ length: count }, () => []);
  photos.forEach((photo, i) => cols[i % count].push({ ...photo, globalIndex: i }));
  return cols;
}

function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}
    >
      {/* Counter */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm text-slate-300"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        {index + 1} / {photos.length}
      </div>

      {/* Close */}
      <button
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl transition-colors hover:bg-white/10"
        onClick={onClose}
      >
        ✕
      </button>

      {/* Prev */}
      <button
        className="absolute left-4 md:left-8 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl transition-colors hover:bg-white/10 z-10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
      >
        ‹
      </button>

      {/* Image */}
      <div
        className="relative mx-20"
        style={{ width: 'min(90vw, 900px)', height: 'min(80vh, 600px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={photo.src}
          alt={photo.label}
          fill
          className="object-contain"
          sizes="90vw"
        />
      </div>

      {/* Next */}
      <button
        className="absolute right-4 md:right-8 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl transition-colors hover:bg-white/10 z-10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        onClick={(e) => { e.stopPropagation(); onNext(); }}
      >
        ›
      </button>

      {/* Label */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white font-medium">{photo.label}</p>
        <p className="text-slate-500 text-sm capitalize">{photo.category}</p>
      </div>

      {/* Thumbnails strip */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-sm px-4 pb-1">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); }}
            className="relative flex-shrink-0 rounded-md overflow-hidden transition-all"
            style={{
              width: 44,
              height: 32,
              outline: i === index ? '2px solid #FF6B35' : '2px solid transparent',
              opacity: i === index ? 1 : 0.5,
            }}
            onClickCapture={(e) => { e.stopPropagation(); /* handled by parent close, need direct */ }}
          >
            <Image src={p.src} alt="" fill className="object-cover" sizes="44px" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GallerySection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [columns, setColumns] = useState(3);

  const filtered = activeCategory === 'all'
    ? ALL_PHOTOS
    : ALL_PHOTOS.filter(p => p.category === activeCategory);

  // Responsive columns
  useEffect(() => {
    const update = () => setColumns(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const masonry = buildColumns(filtered, columns);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevPhoto = useCallback(() => setLightboxIndex(i => (i - 1 + filtered.length) % filtered.length), [filtered.length]);
  const nextPhoto = useCallback(() => setLightboxIndex(i => (i + 1) % filtered.length), [filtered.length]);

  return (
    <section className="py-24 px-6" id="gallery">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Фотогалерея
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Атмосфера <span className="gradient-text">Villa Jaconda</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            {ALL_PHOTOS.length} уникальных фотографий виллы, номеров и территории
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {CATEGORIES.map(cat => {
            const count = cat.key === 'all' ? ALL_PHOTOS.length : ALL_PHOTOS.filter(p => p.category === cat.key).length;
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setLightboxIndex(null); }}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg, #FF6B35, #F7931E)' : 'rgba(30,41,59,0.6)',
                  color: active ? 'white' : '#94A3B8',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: active ? '0 4px 20px rgba(255,107,53,0.3)' : 'none',
                }}
              >
                {cat.label}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Masonry grid */}
        <div className="flex gap-3">
          {masonry.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-3 flex-1">
              {col.map((photo) => (
                <div
                  key={photo.src}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ aspectRatio: photo.globalIndex % 5 === 0 ? '4/3' : photo.globalIndex % 3 === 0 ? '1/1' : '3/4' }}
                  onClick={() => setLightboxIndex(photo.globalIndex)}
                >
                  <Image
                    src={photo.src}
                    alt={photo.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-white text-sm font-semibold">{photo.label}</p>
                  </div>

                  {/* Zoom icon */}
                  <div
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100"
                    style={{ background: 'rgba(255,107,53,0.9)' }}
                  >
                    <span className="text-white text-xs">⤢</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Show count */}
        <p className="text-center text-slate-500 text-sm mt-8">
          Показано {filtered.length} из {ALL_PHOTOS.length} фото
        </p>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </section>
  );
}
