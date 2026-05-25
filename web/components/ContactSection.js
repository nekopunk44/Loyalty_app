'use client';
import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

// TODO: Replace with your actual EmailJS credentials
// Sign up at https://www.emailjs.com and create a service + template
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

export default function ContactSection() {
  const formRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [sectionRef, visible] = useScrollAnimation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await emailjs.sendForm(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        formRef.current,
        EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
      formRef.current.reset();
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const inputStyle = {
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    width: '100%',
    borderRadius: 12,
    padding: '12px 16px',
    color: 'white',
    outline: 'none',
    fontSize: 14,
  };

  return (
    <section className="py-24 px-6" id="contact">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#FF6B35' }}>
            Свяжитесь с нами
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Запросить <span className="gradient-text">доступ</span>
          </h2>
          <div className="section-divider" />
          <p className="text-slate-400 max-w-xl mx-auto mt-4">
            Оставьте контакты — наш менеджер свяжется с вами и создаст персональный аккаунт в программе лояльности.
          </p>
        </div>

        <div
          ref={sectionRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Form */}
          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-white text-xl font-bold mb-2">Заявка отправлена!</h3>
                <p className="text-slate-400">Мы свяжемся с вами в ближайшее время.</p>
              </div>
            ) : status === 'error' ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-white text-xl font-bold mb-2">Ошибка отправки</h3>
                <p className="text-slate-400">Пожалуйста, свяжитесь с нами через WhatsApp или Telegram.</p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ваше имя *</label>
                  <input
                    type="text"
                    name="from_name"
                    required
                    placeholder="Иван Иванов"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,53,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Телефон *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+7 (xxx) xxx-xx-xx"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,53,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="reply_to"
                    placeholder="email@mail.com"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,53,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Сообщение</label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Расскажите о вашем запросе..."
                    style={{ ...inputStyle, resize: 'none' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(255,107,53,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn-primary w-full text-center"
                  style={{ opacity: status === 'sending' ? 0.7 : 1 }}
                >
                  {status === 'sending' ? 'Отправляем...' : 'Отправить заявку'}
                </button>

                <p className="text-slate-500 text-xs text-center">
                  Или напишите нам напрямую в{' '}
                  <a href="https://wa.me/79000000000" target="_blank" rel="noopener noreferrer" style={{ color: '#25D366' }}>WhatsApp</a>
                  {' '}или{' '}
                  <a href="https://t.me/villajaconda" target="_blank" rel="noopener noreferrer" style={{ color: '#229ED9' }}>Telegram</a>
                </p>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-bold text-xl mb-6">Контактная информация</h3>
              <div className="space-y-4">
                {[
                  { icon: '📍', label: 'Адрес', value: 'Укажите реальный адрес виллы' },
                  { icon: '📞', label: 'Телефон', value: '+7 (xxx) xxx-xx-xx' },
                  { icon: '✉️', label: 'Email', value: 'info@villajaconda.com' },
                  { icon: '💬', label: 'WhatsApp / Telegram', value: 'Доступны 24/7' },
                  { icon: '🕐', label: 'Режим работы', value: 'Круглосуточно, 7 дней в неделю' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-0.5">{item.label}</p>
                      <p className="text-white font-medium text-sm">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.2)' }}
            >
              <p className="text-slate-300 text-sm leading-relaxed">
                <span className="text-white font-semibold">Важно:</span> Доступ к приложению предоставляется
                исключительно гостям виллы. Самостоятельная регистрация недоступна —
                аккаунт создаётся администратором после подтверждения вашего пребывания.
              </p>
            </div>

            {/* Messenger buttons */}
            <div className="flex gap-3">
              <a
                href="https://wa.me/79000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <span>WhatsApp</span>
              </a>
              <a
                href="https://t.me/villajaconda"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: '#229ED9' }}
              >
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
