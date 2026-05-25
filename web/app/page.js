import Image from 'next/image';

const highlights = [
  { value: '24/7', label: 'консьерж-сервис и поддержка гостей' },
  { value: '12+', label: 'привилегий внутри программы лояльности' },
  { value: '4.9/5', label: 'средняя оценка впечатлений гостей' },
];

const perks = [
  {
    title: 'Private arrival',
    text: 'Приоритетное подтверждение брони, персональная встреча и готовый сценарий отдыха до вашего приезда.',
  },
  {
    title: 'Rewards that feel real',
    text: 'Баллы превращаются не в формальность, а в апгрейды номера, spa-комплименты, поздний выезд и приватные события.',
  },
  {
    title: 'Digital companion',
    text: 'В одном приложении собраны статус, история визитов, спецпредложения и быстрый контакт с командой виллы.',
  },
];

const loyaltySteps = [
  {
    name: 'Bronze',
    detail: 'Стартовый уровень для первых визитов: бонусы за бронирование, welcome treats и персональные предложения.',
  },
  {
    name: 'Gold',
    detail: 'Для постоянных гостей: ранний check-in, гибкие апгрейды и доступ к закрытым тарифам сезона.',
  },
  {
    name: 'Black',
    detail: 'Премиальный формат: приватный concierge, приоритет на лучшие даты и индивидуальные сценарии отдыха.',
  },
];

const appFeatures = [
  'Цифровая карта лояльности и моментальный статус',
  'Персональные офферы под ваш стиль путешествий',
  'История бронирований и любимых услуг в одном месте',
  'Быстрый запрос трансфера, spa и special requests',
];

const gallery = [
  { src: '/images/property1.png', alt: 'Вид на Villa Jaconda', span: 'tall' },
  { src: '/images/property2.png', alt: 'Зона отдыха у бассейна', span: 'wide' },
  { src: '/images/property3.png', alt: 'Интерьер виллы', span: 'regular' },
  { src: '/images/property4.png', alt: 'Терраса виллы', span: 'regular' },
  { src: '/images/luks1.png', alt: 'Премиальный номер', span: 'regular' },
  { src: '/images/zad1.png', alt: 'Приватная территория', span: 'wide' },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <section className="hero-panel">
        <div className="hero-backdrop">
          <Image
            src="/images/property1.png"
            alt="Villa Jaconda exterior"
            fill
            priority
            className="hero-image"
          />
        </div>

        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Private villa loyalty experience</div>
            <h1>
              Лендинг, который продаёт не просто проживание, а клубный формат отдыха.
            </h1>
            <p className="hero-lead">
              Villa Jaconda объединяет приватность luxury-виллы, тёплый сервис и
              программу лояльности, которая делает каждый следующий визит заметно
              ценнее предыдущего.
            </p>

            <div className="hero-actions">
              <a href="#contact" className="btn-primary">
                Запросить персональное предложение
              </a>
              <a href="#loyalty" className="btn-secondary">
                Посмотреть привилегии
              </a>
            </div>

            <div className="hero-stats">
              {highlights.map((item) => (
                <div key={item.label} className="stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-aside">
            <div className="hero-note">
              <span className="hero-note-label">Featured stay</span>
              <h2>Weekend escape with loyalty perks already unlocked</h2>
              <p>
                Ранний заезд, приватный breakfast setup, комплимент в spa и
                поздний выезд без лишних звонков и согласований.
              </p>
            </div>

            <div className="preview-stack">
              <article className="preview-card">
                <span>01</span>
                <h3>Сильный first screen</h3>
                <p>Фокус на эмоции, доверии и понятной выгоде уже в первом экране.</p>
              </article>
              <article className="preview-card">
                <span>02</span>
                <h3>Премиальная подача</h3>
                <p>Тёплая палитра, атмосферный фон и визуальная глубина вместо шаблонной сетки.</p>
              </article>
              <article className="preview-card">
                <span>03</span>
                <h3>Чёткий CTA</h3>
                <p>Пользователь быстро понимает, зачем оставлять заявку и что получит взамен.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <span>Почему это работает</span>
          <h2>Новый лендинг выстроен как спокойная luxury-презентация, а не как набор стандартных блоков.</h2>
        </div>

        <div className="feature-grid">
          {perks.map((perk) => (
            <article key={perk.title} className="feature-card">
              <h3>{perk.title}</h3>
              <p>{perk.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section showcase-section" id="loyalty">
        <div className="section-heading">
          <span>Программа лояльности</span>
          <h2>Три уровня, которые выглядят как продуманное повышение статуса, а не обычная скидочная механика.</h2>
        </div>

        <div className="tiers-grid">
          {loyaltySteps.map((tier, index) => (
            <article key={tier.name} className="tier-card">
              <div className="tier-index">0{index + 1}</div>
              <h3>{tier.name}</h3>
              <p>{tier.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section app-section">
        <div className="app-copy">
          <div className="section-heading left">
            <span>Мобильное приложение</span>
            <h2>Лояльность ощущается современной, потому что у гостя всё под рукой.</h2>
          </div>
          <div className="app-list">
            {appFeatures.map((feature) => (
              <div key={feature} className="app-list-item">
                <span />
                <p>{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="app-visual">
          <div className="phone-frame">
            <div className="phone-top" />
            <div className="phone-screen">
              <div className="screen-pill">Villa Jaconda Club</div>
              <div className="screen-balance">
                <span>Ваш статус</span>
                <strong>Gold Member</strong>
              </div>
              <div className="screen-offer">
                <small>Открыто сейчас</small>
                <p>Late checkout до 16:00 + spa bonus на следующий визит</p>
              </div>
              <div className="screen-points">
                <span>1 480 points</span>
                <div className="points-bar">
                  <div />
                </div>
                <small>220 points до Black preview benefits</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <span>Атмосфера места</span>
          <h2>Добавил более редакционную галерею, чтобы лендинг выглядел дороже и живее на первом скролле.</h2>
        </div>

        <div className="gallery-grid">
          {gallery.map((item) => (
            <figure
              key={item.src}
              className={`gallery-card gallery-${item.span}`}
            >
              <Image src={item.src} alt={item.alt} fill className="gallery-image" />
            </figure>
          ))}
        </div>
      </section>

      <section className="content-section testimonial-section">
        <div className="testimonial-card">
          <p>
            “Визуально лендинг теперь лучше объясняет ценность Villa Jaconda:
            он ощущается как premium brand page, где есть и эмоция, и конкретная
            причина оставить заявку.”
          </p>
          <span>Фокус редизайна: доверие, атмосфера, конверсия.</span>
        </div>
      </section>

      <section className="content-section contact-section" id="contact">
        <div className="contact-panel">
          <div>
            <span className="contact-kicker">Готово для следующего шага</span>
            <h2>Если хочешь, дальше могу так же переделать внутренние секции или форму заявки под этот стиль.</h2>
          </div>
          <a href="mailto:hello@villajaconda.com" className="btn-primary">
            Открыть контактный сценарий
          </a>
        </div>
      </section>
    </main>
  );
}
