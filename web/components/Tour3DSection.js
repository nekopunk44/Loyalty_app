'use client';
import { useRef, useEffect } from 'react';

function VillaCSSModel() {
  return (
    <div className="flex items-center justify-center" style={{ perspective: '800px', height: 320 }}>
      <div
        className="rotate-3d relative"
        style={{
          width: 180,
          height: 140,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Main building body */}
        <div style={{
          position: 'absolute',
          width: 180,
          height: 100,
          bottom: 0,
          background: 'transparent',
          border: '2px solid rgba(255,107,53,0.7)',
          transformStyle: 'preserve-3d',
          transform: 'translateZ(0)',
        }}>
          {/* Front face */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '1.5px solid rgba(255,107,53,0.5)',
            background: 'rgba(255,107,53,0.04)',
          }} />

          {/* Back face */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '1.5px solid rgba(255,107,53,0.3)',
            background: 'rgba(255,107,53,0.02)',
            transform: 'translateZ(-120px)',
          }} />

          {/* Left */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 120,
            border: '1.5px solid rgba(255,107,53,0.4)',
            background: 'rgba(255,107,53,0.03)',
            transform: 'rotateY(90deg) translateZ(-1px)',
            transformOrigin: 'left',
          }} />

          {/* Windows */}
          {[40, 100].map(x => (
            <div key={x} style={{
              position: 'absolute',
              width: 28, height: 32,
              border: '1.5px solid rgba(247,147,30,0.8)',
              background: 'rgba(247,147,30,0.08)',
              top: 24, left: x,
            }} />
          ))}

          {/* Door */}
          <div style={{
            position: 'absolute',
            width: 22, height: 42,
            border: '1.5px solid rgba(255,107,53,0.8)',
            background: 'rgba(255,107,53,0.06)',
            bottom: 0, left: '50%', transform: 'translateX(-50%)',
          }} />
        </div>

        {/* Roof */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '100px solid transparent',
          borderRight: '100px solid transparent',
          borderBottom: '50px solid rgba(255,107,53,0.5)',
        }} />

        {/* Roof back line */}
        <div style={{
          position: 'absolute',
          top: 8, left: 0, right: 0,
          height: 2,
          background: 'rgba(255,107,53,0.3)',
        }} />
      </div>
    </div>
  );
}

export default function Tour3DSection() {
  return (
    <section className="py-24 px-6" id="tour">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Виртуальный тур
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Исследуйте виллу <span className="gradient-text">в 3D</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-400 max-w-xl mx-auto mt-4">
            Погрузитесь в атмосферу Villa Jaconda ещё до приезда —
            интерактивный 3D тур скоро станет доступен.
          </p>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden glow-orange"
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid rgba(255,107,53,0.2)',
            minHeight: 480,
          }}
        >
          {/* Grid background */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,107,53,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,107,53,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />

          {/* Radial glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
            }} />
          </div>

          {/* 3D model placeholder */}
          <div className="relative flex flex-col items-center justify-center" style={{ minHeight: 480 }}>
            <VillaCSSModel />

            <div className="mt-8 text-center">
              <div
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium pulse-glow"
                style={{
                  background: 'rgba(255,107,53,0.1)',
                  border: '1px solid rgba(255,107,53,0.4)',
                  color: '#FF6B35',
                }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF6B35' }} />
                3D Модель в разработке
              </div>

              <p className="text-slate-500 text-sm mt-4 max-w-sm mx-auto">
                Скоро здесь будет полная интерактивная 3D модель Villa Jaconda —
                вы сможете изучить каждую комнату и территорию
              </p>
            </div>
          </div>

          {/* Corner decorations */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'rgba(255,107,53,0.4)' }} />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: 'rgba(255,107,53,0.4)' }} />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: 'rgba(255,107,53,0.4)' }} />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'rgba(255,107,53,0.4)' }} />
        </div>
      </div>
    </section>
  );
}
