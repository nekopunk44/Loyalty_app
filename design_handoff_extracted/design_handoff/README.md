# Handoff: Villa Jaconda Landing Page Redesign

## Overview
Полный редизайн лендинга виллы Villa Jaconda (Next.js 15, `web/` директория репозитория `nekopunk44/Loyalty_app`). Переход от тёмного luxury-стиля к **светлому минимализму** с кремовым фоном, редакционной типографикой и многошаговым бронированием.

**Репозиторий:** https://github.com/nekopunk44/Loyalty_app  
**Целевая директория:** `web/` (Next.js 15 + Tailwind CSS)

---

## About the Design Files
Файлы в этой папке — **HTML-прототипы высокой точности (hifi)**, созданные как дизайн-референс. Это не production-код для прямого копирования. Задача: **воссоздать эти дизайны в существующем Next.js проекте** (`web/`), используя его структуру (App Router, `app/`, `components/`), Tailwind CSS и React.

Прочитай файлы `.jsx` из этой папки — они содержат полную логику и стили каждого компонента.

## Fidelity
**High-fidelity** — пиксельно точные мокапы с финальными цветами, типографикой, отступами и интерактивностью. Воссоздай UI пиксельно точно.

---

## Design Tokens

### Цвета
```css
--bg:            #f7f2e8   /* основной фон — тёплый крем */
--surface:       #ffffff   /* белый для карточек */
--surface-warm:  #ede8db   /* тёплая поверхность (loyalty, faq секции) */
--line:          rgba(160,120,60,0.13)  /* границы по умолчанию */
--line-strong:   rgba(160,120,60,0.26)  /* hover-границы */
--text:          #1c1208   /* почти чёрный тёплый */
--text-soft:     #4a3820   /* вторичный текст */
--muted:         #8a7560   /* заглушённый текст, лейблы */
--gold:          #a07840   /* основной акцент (работает на светлом фоне) */
--gold-light:    #c8954e   /* hover-золото */

/* Бронирование (из мобильного приложения) */
--booking-navy:  #063B5C
--booking-teal:  #14B8A6
--booking-coral: #FF6B35

/* Уровни лояльности */
--bronze:   #E08B32
--silver:   #7A90A8
--gold-tier: #C08828
--platinum: #9060CC
```

### Типографика
```css
font-serif: 'Cormorant Garamond', Georgia, serif  /* веса 300, 400, 400i */
font-sans:  'Inter', system-ui, sans-serif          /* веса 400, 500, 600 */

/* Шкала размеров */
display-xl: clamp(5.5rem, 17vw, 14rem)  /* герой */
display-lg: clamp(2.4rem, 5vw, 4.5rem) /* заголовки секций */
eyebrow:    0.625rem, tracking 0.32em, uppercase, gold /* "— Каталог" */
```

### Анимации
```css
ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)
ken-burns-a: scale(1) → scale(1.08) translate(-2%, -1%), 12s infinite alternate
ken-burns-b: scale(1) → scale(1.08) translate(2%, 1%),  12s infinite alternate
scroll-reveal: opacity 0→1, translateY 32px→0, 0.8s ease-out-expo
```

### Иконки
Lucide Icons CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`  
stroke-width: 1.5, без fill. Используй пакет `lucide-react` в Next.js.

---

## Screens / Views

### 1. Navbar (`NavbarR.jsx`)
- Фиксированный, `position: fixed`, z-index 50
- **Default state:** прозрачный фон, высота 88px
- **Scrolled state** (после 60px скролла): `backdrop-filter: blur(20px)`, `background: rgba(247,242,232,0.92)`, высота 64px, нижняя граница `var(--line)`
- **Logo:** SVG логотип (3 кольца, 28×28px, gold) + wordmark "VILLA JACONDA" serif 20px
- **Links:** 12px, tracking 0.16em, uppercase, Inter — цвет `--text-soft` → `--gold` (active)
- **CTA:** "Забронировать →", pill, `background: --text`, `color: --bg`, hover → `--gold`
- **Progress bar:** 2px, `--gold`, width = scroll%, под навбаром
- Scroll-based active section tracking через IntersectionObserver

### 2. Hero (`HeroR.jsx`)
- `height: 100svh`, overflow hidden
- **Фон:** 4 фото виллы чередуются с crossfade (opacity 0→1, 1.8s ease), каждое 5.5с
- **Ken Burns:** CSS animation `kbA`/`kbB`, 12s alternate, scale 1→1.08
- **Overlay:** `linear-gradient(180deg, rgba(247,242,232,0.18) 0%, rgba(247,242,232,0.50) 55%, rgba(247,242,232,0.92) 100%)`
- **Headline:** "Villa" (weight 300) + "Jaconda" (weight 400, italic, color `--gold`), `clamp(5.5rem, 17vw, 14rem)`, line-height 0.88
- **Entry animations:** slideUp (y: 50px→0), stagger 0.18s между строками
- **Нет кнопок**
- **Bottom bar:** 3 статистики (4 формата, 30+ гостей, 2022) + scroll indicator (1px line, pulse animation)
- **Горизонтальная линия** 1px `--line` сверху и снизу секции

### 3. Rooms (`RoomsR.jsx`)
- **Layout:** секция-заголовок + 4 редакционные строки
- Каждая строка: `display: grid, gridTemplateColumns: 1fr 1fr`, `minHeight: clamp(480px, 60vh, 700px)`
- Чередование: чётные — контент слева / фото справа, нечётные — фото слева / контент справа
- **Фото-панель:** `position: relative, overflow: hidden`. Hover → `scale(1.06)`, transition 0.9s
- **Контент-панель:** `background: --bg`, padding `clamp(48px, 6vw, 80px)`
- Номер комнаты: огромный (`clamp(4rem, 6vw, 6rem)`), `color: rgba(160,120,60,0.12)`, рядом tag-badge
- Заголовок: serif `clamp(2.4rem, 4vw, 4rem)`, weight 300
- Specs row: цена в gold serif + Гости + Комнаты, разделены `border-bottom: 1px solid --line`
- Amenity chips: `border-radius: 999px`, `border: 1px solid --line-strong`, Lucide icon 10px + label
- CTA: "Выбрать формат →", pill, `background: --text` → hover `--gold`
- Mobile (≤768px): `grid-template-columns: 1fr`, фото сверху

### 4. Tour (`TourSection` в `Redesign.html`)
- `min-height: 80vh`, full-bleed фото `property2.png` с Ken Burns
- Overlay: `linear-gradient(180deg, rgba(247,242,232,0.5) 0%, rgba(247,242,232,0.2) 50%, rgba(247,242,232,0.65) 100%)`
- Центрированный контент: eyebrow, serif заголовок, описание, CTA → `#contact`
- Заглушка: "3D-тур · скоро" под кнопкой

### 5. Loyalty (`LoyaltyR.jsx`)
- `background: --surface-warm`
- **Journey path:** 4 круга соединены горизонтальной линией `--line-strong`
  - Активный: circle 56×56px, `background: tier.color`, gold glow `box-shadow`
  - Пройденный: 40×40px, `background: tier.color`, checkmark внутри
  - Будущий: 40×40px, transparent, dashed border
  - Анимированное заполнение линии слева при смене уровня
- **Клик** по уровню → показывает 3 карточки:
  1. Тёмная (`background: --text`): название, cashback в `tier.color`, прогресс-бар
  2. Белая: перечень привилегий с иконкой check
  3. Акцентная (`background: tier.color + 10%`): "Как начать", CTA
- Mobile: 2×2 сетка для journey path

### 6. Reviews (`ReviewsR.jsx`)
- `background: --bg`
- Split layout: фото виллы слева (aspect-ratio 4/3, border-radius 8px), цитата справа
- Фото: `property3.png` с легким gradient overlay + рейтинг-бейдж (5★, "4.9 · 120+ отзывов") внизу слева
- Цитата: serif italic `clamp(1.3rem, 2.2vw, 1.9rem)`
- Автор: аватар-круг с инициалом, имя + описание пребывания
- Навигация: counter "01 / 04" + стрелки (hover → fill `--text`)
- Смена отзыва: fadeSlideUp анимация 0.7s

### 7. Booking (`BookingR.jsx`) — 3-шаговый мастер
**Layout:** `grid 1fr 340px` (main + sticky summary)

**Шаг 1 — Формат:**
- 4 карточки в `auto-fit minmax(220px, 1fr)` сетке
- Каждая: `border: 2px solid`, выбранная → `border-color: #063B5C`
- Верхняя цветная полоска `height: 4px, background: #14B8A6` (выбрана) или `--line`
- Фото 130px high + overlay, tag-badge слева, checkmark справа (если выбрана)
- Имя формата 15px bold + price badge (coral bg `#FF6B35`)
- Guest count badge: `background: #14B8A620`, цвет `#14B8A6`
- CTA: "Выбрать даты →", navy bg, disabled если ничего не выбрано

**Шаг 2 — Даты:**
- 2 pill-поля заезд/выезд показывают выбранные даты
- Календарь (`BookingCal`): одномесячный вид
  - Дни-недели: `color: #FF6B35`, uppercase, bold
  - Выбранные даты: `background: #FF6B35`, `border-radius: 8px 0 0 8px` / `0 8px 8px 0`
  - Диапазон: `background: #14B8A620`
  - Прошедшие: disabled, серые
  - Легенда внизу: "Выбрано" + "Диапазон"

**Шаг 3 — Данные:**
- Степпер гостей: `−` / число / `+`, кнопки rounded 10px, navy bg для `+`
- Поля: имя, телефон (grid 1fr 1fr), textarea пожелания
- CTA: "Отправить в WhatsApp", navy → coral hover, открывает `wa.me` с prefilled текстом
- Disabled если имя/телефон пустые

**Sticky summary (справа):**
- Тёмная карточка navy с teal accent bar сверху
- Показывает: выбранный формат, даты, итоговую стоимость (цена × ночей), кол-во гостей
- Contacts ниже: иконка + WhatsApp/email/время ответа

**Progress bar (шаги):**
- 3 равных сегмента, `background: #063B5C` (активный), `#14B8A612` (пройденный), transparent (будущий)
- Кружок: number или checkmark

### 8. FAQ (`FAQR.jsx`)
- `background: --surface-warm`
- Split: sticky заголовок слева + аккордеон справа
- 8 вопросов, каждый: номер gold serif + текст + `+` иконка (rotate 45° когда открыт)
- Раскрытие: `max-height: 0 → 300px`, transition 0.4s ease-out-expo
- WhatsApp CTA внизу заголовочной колонки

### 9. Footer (`FooterR.jsx`)
- `background: --text` (тёмный контраст к светлому лендингу)
- SVG логотип + wordmark в белом/gold
- CTA "Забронировать →" gold badge в правом углу header-строки
- 4 колонки: навигация, контакты (с Lucide иконками), соцсети, режим работы
- Живой индикатор: зелёная точка + "Сейчас принимаем заявки"
- Нижняя строка: copyright + город

---

## Interactions & Behavior

| Элемент | Поведение |
|---|---|
| Navbar scroll | `window.scroll > 60` → blur/bg/height анимация |
| Active nav link | IntersectionObserver (rootMargin -40% 0px -40% 0px) |
| Hero slideshow | `setInterval` 5500ms, crossfade через opacity |
| Ken Burns | CSS `@keyframes`, alternate direction для каждого фото |
| Room hover | image scale 1.06, card translateY -4px |
| Loyalty tabs | click → setState, fadeSlideUp animation на детальных карточках |
| Reviews | click nav → setState + animKey increment → re-animation |
| Calendar | React state: `{ checkIn: Date, checkOut: Date }`. Click 1 → setCheckIn, Click 2 → setCheckOut если > checkIn |
| Booking steps | step 1→2 если выбран room, 2→3 если checkIn && checkOut. Шаги в progress bar кликабельны если пройдены |
| WhatsApp submit | `window.open('https://wa.me/37377812345?text=...')` с encoded текстом |
| FAQ accordion | `maxHeight: open ? 300 : 0` toggle |
| Scroll reveal | IntersectionObserver + className `reveal visible` |

---

## Assets

| Файл | Использование |
|---|---|
| `assets/logo.svg` | SVG логотип (3 кольца на сетке) |
| `assets/images/property1-4.png` | Фото виллы — герой, тур, бронирование |
| `assets/images/luks1-2.png` | Фото люкс-номеров |
| `assets/images/std1-2.png` | Фото стандарт-номеров |
| `assets/images/zad1-2.png` | Фото задний двор |

В Next.js: скопируй в `web/public/images/` (они уже там есть в оригинале).

---

## Next.js Implementation Notes

### Структура файлов
```
web/
├── app/
│   ├── page.js          ← заменить компоненты
│   ├── layout.js        ← обновить шрифты (уже есть Cormorant + Inter)
│   └── globals.css      ← добавить новые CSS vars
└── components/
    ├── Navbar.js        → NavbarR.jsx
    ├── Hero.js          → HeroR.jsx
    ├── Rooms.js         → RoomsR.jsx
    ├── LoyaltyTiers.js  → LoyaltyR.jsx
    ├── Reviews.js       → ReviewsR.jsx
    ├── BookingSection.js → BookingR.jsx (переписать)
    ├── FAQ.js           → FAQR.jsx (новый)
    └── Footer.js        → FooterR.jsx
```

### Ключевые отличия HTML → Next.js
1. `<img>` → `<Image>` из `next/image` с `fill` и `sizes`
2. Анимации Ken Burns: перенести `@keyframes kbA/kbB` в `globals.css`
3. Lucide: `npm install lucide-react`, импорт `import { Waves, Wifi } from 'lucide-react'`
4. CSS vars: добавить в `:root` в `globals.css`
5. Scroll detect: можно использовать `motion/react` (уже в проекте) вместо ручного `useScroll`
6. `'use client'` на всех интерактивных компонентах
7. Шрифты уже подключены в `layout.js` (Cormorant Garamond + Inter)

### Установить если нет
```bash
cd web
npm install lucide-react   # иконки (уже может быть в проекте)
```

---

## Files в этой папке

| Файл | Описание |
|---|---|
| `README.md` | Этот файл |
| `Redesign.html` | Полный интерактивный прототип для предпросмотра |
| `NavbarR.jsx` | Навбар компонент |
| `HeroR.jsx` | Герой с Ken Burns |
| `RoomsR.jsx` | Редакционный каталог номеров |
| `LoyaltyR.jsx` | Journey-path программа лояльности |
| `ReviewsR.jsx` | Split-layout отзывы |
| `BookingR.jsx` | 3-шаговое бронирование + календарь |
| `FAQR.jsx` | Аккордеон FAQ |
| `FooterR.jsx` | Тёмный футер |
