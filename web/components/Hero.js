'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const slides = [
  '/images/property1.png',
  '/images/property2.png',
  '/images/property3.png',
  '/images/property4.png',
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden" id="about">
      {/* Slideshow */}
      {slides.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={src}
            alt="Villa Jaconda"
            fill
            className="object-cover"
            priority={i === 0}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.35)' }} />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end pb-20 px-6 max-w-6xl mx-auto">
        <div className="fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-sm font-medium"
            style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35' }}>
            ✦ Эксклюзивная программа лояльности
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-4">
            Villa <span className="gradient-text">Jaconda</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-xl mb-8 leading-relaxed">
            Откройте мир привилегий. Каждое ваше пребывание — это баллы,
            которые открывают доступ к эксклюзивным предложениям и опыту.
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="#loyalty" className="btn-primary">
              Узнать о программе
            </a>
            <a href="#contact" className="btn-outline">
              Запросить доступ
            </a>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-8 right-6 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                background: i === current ? '#FF6B35' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-slate-400 to-transparent" />
      </div>
    </section>
  );
}
