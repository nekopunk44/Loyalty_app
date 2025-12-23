/**
 * Генерация PNG-диаграмм для ВКР Villa Jaconda Loyalty App.
 * Запуск: node vkr/gen-diagrams.js
 * Результат: vkr/assets/fig_2_1.png, fig_2_3.png, fig_2_4.png
 */
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const C = {
  bg:       '#FFFFFF',
  border:   '#1C1208',
  fill:     '#F7F2E8',
  fillMid:  '#EDE8DC',
  fillDark: '#1C1208',
  gold:     '#8B6914',
  text:     '#1C1208',
  textLight:'#FFFFFF',
  arrow:    '#1C1208',
  grey:     '#888888',
};

function setFont(ctx, size, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
}

// Разбивает текст на строки по \n и по ширине
function wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const result = [];
  for (const para of paragraphs) {
    if (para.trim() === '') { result.push(''); continue; }
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

function drawRect(ctx, x, y, w, h, { fill = C.fill, stroke = C.border, lw = 1.5 } = {}) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.strokeRect(x, y, w, h);
}

// Рисует прямоугольник с текстом внутри. text — строка (с \n) или массив строк.
function drawBox(ctx, x, y, w, h, text, opts = {}) {
  const { fill, stroke, textSize = 12, bold = false, color = C.text, valign = 'middle' } = opts;
  drawRect(ctx, x, y, w, h, { fill, stroke });

  setFont(ctx, textSize, bold);
  const lines = Array.isArray(text) ? text : wrapText(ctx, text, w - 16);
  if (lines.length === 0) return;

  const lineH = Math.round(textSize * 1.45);
  const totalH = lines.length * lineH;
  let startY;
  if (valign === 'top') startY = y + 10 + lineH / 2;
  else startY = y + h / 2 - totalH / 2 + lineH / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - 4);
  ctx.clip();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x + w / 2, startY + i * lineH);
  });
  ctx.restore();
}

// Метка яруса (золотой жирный текст вверху слева от блока)
function tierLabel(ctx, x, y, text) {
  setFont(ctx, 11, true);
  ctx.fillStyle = C.gold;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + 9, y + 7);
}

function arrowHead(ctx, x, y, angle) {
  const len = 10, a2 = 0.38;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - len * Math.cos(angle - a2), y - len * Math.sin(angle - a2));
  ctx.lineTo(x - len * Math.cos(angle + a2), y - len * Math.sin(angle + a2));
  ctx.closePath();
  ctx.fillStyle = C.arrow;
  ctx.fill();
}

function drawArrow(ctx, x1, y1, x2, y2, label = '', lw = 1.5) {
  ctx.strokeStyle = C.arrow;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  arrowHead(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1));
  if (label) {
    setFont(ctx, 11);
    ctx.fillStyle = C.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 4);
  }
}

function drawDiamond(ctx, cx, cy, w, h, text, textSize = 12) {
  ctx.fillStyle = C.fillMid;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  setFont(ctx, textSize, true);
  ctx.fillStyle = C.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function drawTerminator(ctx, cx, cy, w, h, text) {
  const r = h / 2;
  ctx.fillStyle = C.fillDark;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + r, cy - h / 2);
  ctx.lineTo(cx + w / 2 - r, cy - h / 2);
  ctx.arc(cx + w / 2 - r, cy, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx - w / 2 + r, cy + h / 2);
  ctx.arc(cx - w / 2 + r, cy, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  setFont(ctx, 13, true);
  ctx.fillStyle = C.textLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
}

function caption(ctx, canvasW, y, text) {
  setFont(ctx, 12);
  ctx.fillStyle = C.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, canvasW / 2, y);
}

// ─── Рисунок 2.1 — Диаграмма компонентов ─────────────────────────────────────
function genFig21() {
  const W = 1200, H = 820;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const pad = 30;

  // ── Ярус 1: Клиент (y 20–230) ───────────────────────────────────────────
  const t1y = 20, t1h = 210;
  drawRect(ctx, pad, t1y, W - pad * 2, t1h, { fill: '#F2EDE3', stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t1y, 'ЯРУС КЛИЕНТА');

  const bxW = (W - pad * 2 - 60) / 2;   // ~525
  const bxH = 150;
  const bxY = t1y + 32;

  // Mobile App
  drawBox(ctx, pad + 20, bxY, bxW, bxH,
    'Mobile App (React Native / Expo)\n18 экранов · 10 контекстов React Context\nModules: Superstore, Services, Navigation\nAuthContext · LoyaltyCardContext · PaymentContext',
    { fill: C.fill, textSize: 12 });

  // Web Landing
  drawBox(ctx, pad + 20 + bxW + 20, bxY, bxW, bxH,
    'Web Landing (Next.js 15 / SSR)\nСтраницы: Hero · Rooms · Tour · LoyaltyTiers\nAppDownload · Reviews · BookingSection · FAQ\nCSS-переменные дизайн-системы Villa Jaconda',
    { fill: C.fill, textSize: 12 });

  // стрелки вниз
  const mid1 = pad + 20 + bxW / 2;
  const mid2 = pad + 20 + bxW + 20 + bxW / 2;
  const arrowFrom = t1y + t1h;
  const arrowTo = arrowFrom + 46;
  drawArrow(ctx, mid1, arrowFrom, mid1, arrowTo, 'HTTPS / JWT');
  drawArrow(ctx, mid2, arrowFrom, mid2, arrowTo, 'HTTPS / JWT');

  // ── Ярус 2: API (y 276–456) ──────────────────────────────────────────────
  const t2y = arrowTo, t2h = 180;
  drawRect(ctx, pad, t2y, W - pad * 2, t2h, { fill: '#ECEAE2', stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t2y, 'ЯРУС СЕРВЕРНОГО API');

  drawBox(ctx, pad + 20, t2y + 32, W - pad * 2 - 40, t2h - 42,
    'Express.js 5 — REST API сервер\nМидлвары: helmet · rate-limit · cors · JWT-аутентификация · Zod-валидация входных данных\nМаршруты: /auth /users /bookings /loyalty /card /events /notifications /admin\nСервисы: AuthService · PaymentService · LoyaltyService · NotificationService · MLClient',
    { fill: C.fill, textSize: 12 });

  // стрелки вниз от API
  const apiMidL = mid1;
  const apiMidR = mid2;
  const t2bot = t2y + t2h;
  const t3top = t2bot + 50;
  drawArrow(ctx, apiMidL, t2bot, apiMidL, t3top, 'Sequelize ORM / SQL');
  drawArrow(ctx, apiMidR, t2bot, apiMidR, t3top, 'HTTP / JSON');

  // ── Ярус 3: Хранилище + ML (y t3top–t3top+210) ───────────────────────────
  const t3h = 210;
  const colW = (W - pad * 2 - 20) / 2;  // ~565

  // ХРАНИЛИЩЕ
  drawRect(ctx, pad, t3top, colW, t3h, { fill: '#EDE8DC', stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t3top, 'ХРАНИЛИЩЕ ДАННЫХ');

  drawBox(ctx, pad + 12, t3top + 32, colW - 24, 110,
    'PostgreSQL 16\n13 таблиц: users · bookings · loyalty_cards\npayments · events · notifications · referrals\nadmin_wallets · transactions · referrals',
    { fill: C.fill, textSize: 11 });

  drawBox(ctx, pad + 12, t3top + 150, colW - 24, 46,
    'Redis — кеш сессий и очередь фоновых задач',
    { fill: C.fill, textSize: 11 });

  // ML-МИКРОСЕРВИС
  const mlX = pad + colW + 20;
  const mlW = W - mlX - pad;
  drawRect(ctx, mlX, t3top, mlW, t3h, { fill: '#EDE8DC', stroke: C.gold, lw: 2 });
  tierLabel(ctx, mlX, t3top, 'ML-МИКРОСЕРВИС');

  drawBox(ctx, mlX + 12, t3top + 32, mlW - 24, t3h - 42,
    'FastAPI (Python 3.11) — Railway отдельный сервис\nPOST /rfm/recompute  —  k-means кластеризация клиентов\nPOST /churn/predict  —  Gradient Boosting прогноз оттока\nPOST /recommend/events  —  гибридный рекомендер событий',
    { fill: C.fill, textSize: 11 });

  const capY = t3top + t3h + 16;
  caption(ctx, W, capY, 'Рисунок 2.1 — Диаграмма компонентов системы Villa Jaconda Loyalty App');

  fs.writeFileSync(path.join(OUT, 'fig_2_1.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_1.png');
}

// ─── Рисунок 2.3 — ER-диаграмма ──────────────────────────────────────────────
function genFig23() {
  const W = 1280, H = 780;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const EW = 165, HEAD_H = 28, ATTR_H = 19;

  function drawEntity(x, y, name, attrs) {
    const bodyH = attrs.length * ATTR_H + 8;
    const totalH = HEAD_H + bodyH;
    // Заголовок
    drawRect(ctx, x, y, EW, HEAD_H, { fill: C.fillDark, stroke: C.border });
    setFont(ctx, 12, true);
    ctx.fillStyle = C.textLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + EW / 2, y + HEAD_H / 2);
    // Тело
    drawRect(ctx, x, y + HEAD_H, EW, bodyH, { fill: C.fill, stroke: C.border });
    attrs.forEach((a, i) => {
      const isPK = a.startsWith('PK');
      const isUK = a.startsWith('UK');
      setFont(ctx, 10, isPK || isUK);
      ctx.fillStyle = isPK ? C.gold : isUK ? '#444' : C.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(a, x + 7, y + HEAD_H + 10 + i * ATTR_H);
    });
    const bottom = y + totalH;
    return { x, y, w: EW, h: totalH, cx: x + EW / 2, cy: y + totalH / 2, top: y, bottom, left: x, right: x + EW };
  }

  // Позиции сущностей (равномерно разнесены)
  const COL = [30, 220, 415, 615, 815, 1010];
  const ROW = [30, 330];

  const user     = drawEntity(COL[0], ROW[0], 'User',        ['PK id','UK userId','UK email','   passwordHash','   role','   adminLevel','   membershipLevel','   pushToken']);
  const booking  = drawEntity(COL[1], ROW[0], 'Booking',     ['PK id','   userId','   propertyId','   checkIn','   checkOut','   guests','   status','   totalPrice']);
  const payment  = drawEntity(COL[2], ROW[0], 'Payment',     ['PK id','   userId','   bookingId','   amount','   status','   method','   stripeId']);
  const notif    = drawEntity(COL[3], ROW[0], 'Notification',['PK id','   userId','   title','   message','   type','   read','   data']);
  const referral = drawEntity(COL[4], ROW[0], 'Referral',    ['PK id','   referrerId','   refereeId','   bonusAmount','   status']);
  const adminW   = drawEntity(COL[5], ROW[0], 'AdminWallet', ['PK id','UK adminId','   totalBalance','   availableBalance','   isActive']);
  const lcard    = drawEntity(COL[0], ROW[1], 'LoyaltyCard', ['PK id','UK userId','   balance','   membershipLevel','   totalSpent','   totalEarned','   cashbackRate']);
  const tx       = drawEntity(COL[1], ROW[1], 'Transaction', ['PK id','   userId','   bookingId','   type','   amount','   balanceBefore','   balanceAfter']);
  const prop     = drawEntity(COL[2], ROW[1], 'Property',    ['PK id','   name','   description','   priceNumber','   rooms','   guests','   status']);
  const event    = drawEntity(COL[3], ROW[1], 'Event',       ['PK id','   title','   description','   date','   capacity','   participantIds']);

  // Связи: линия + кардинальности
  function rel(e1, s1, e2, s2, c1, c2) {
    const pts = { left:[e1.left, e1.cy], right:[e1.right, e1.cy], top:[e1.cx, e1.top], bottom:[e1.cx, e1.bottom] };
    const pts2 = { left:[e2.left, e2.cy], right:[e2.right, e2.cy], top:[e2.cx, e2.top], bottom:[e2.cx, e2.bottom] };
    const [x1,y1] = pts[s1], [x2,y2] = pts2[s2];
    ctx.strokeStyle = C.border; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    setFont(ctx, 11, true); ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const off = 15;
    const lx1 = s1==='right' ? x1+off : s1==='left' ? x1-off : x1+12;
    const ly1 = s1==='bottom' ? y1+off : y1-10;
    ctx.fillText(c1, lx1, ly1);
    const lx2 = s2==='left' ? x2-off : s2==='right' ? x2+off : x2+12;
    const ly2 = s2==='top' ? y2-off : y2-10;
    ctx.fillText(c2, lx2, ly2);
  }

  rel(user,'bottom', lcard,'top',    '1','1');
  rel(user,'right',  booking,'left', '1','N');
  rel(booking,'right', payment,'left','1','N');
  rel(booking,'bottom', tx,'top',    '1','N');
  rel(lcard,'right', tx,'left',      '1','N');
  rel(booking,'right', prop,'top',   'N','1');
  rel(user,'right',  notif,'left',   '1','N');
  rel(user,'right',  referral,'left','1','N');
  rel(user,'right',  adminW,'left',  '1','1');

  caption(ctx, W, H - 26, 'Рисунок 2.3 — ER-диаграмма базы данных системы (основные сущности)');

  fs.writeFileSync(path.join(OUT, 'fig_2_3.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_3.png');
}

// ─── Рисунок 2.4 — Функциональная схема (ГОСТ 19.701-90) ─────────────────────
function genFig24() {
  const W = 780, H = 1020;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const BW = 280, BH = 46;
  const DW = 240, DH = 56;

  let y = 28;

  function nextArrow(label = '') { const from = y; y += 36; drawArrow(ctx, cx, from, cx, y, label); }
  function nextArrowShort(label = '') { const from = y; y += 24; drawArrow(ctx, cx, from, cx, y, label); }

  // Терминатор НАЧАЛО
  drawTerminator(ctx, cx, y + 22, 210, 40, 'НАЧАЛО'); y += 40;
  nextArrow();

  // Запуск приложения
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Запуск мобильного приложения', { textSize: 13 }); y += BH;
  nextArrow();

  // Аутентификация
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Аутентификация пользователя (JWT)', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Авторизован?
  const dY1 = y + DH/2;
  drawDiamond(ctx, cx, dY1, DW, DH, 'Авторизован?');
  // «Нет» → экран входа → петля обратно
  const loginX = cx + DW/2 + 14, loginY = dY1 - BH/2;
  drawBox(ctx, loginX, loginY, 175, BH, 'Экран входа / регистрации', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY1, loginX, dY1, 'Нет');
  const loopX = loginX + 175 + 12;
  ctx.strokeStyle = C.border; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(loginX + 175, dY1); ctx.lineTo(loopX, dY1); ctx.lineTo(loopX, y - 16); ctx.lineTo(cx, y - 16); ctx.stroke();
  arrowHead(ctx, cx, y - 16, Math.PI / 2 * 3);

  y = dY1 + DH/2;
  nextArrow('Да');

  // Главный экран
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Главный экран: баланс, события, рекомендации', { textSize: 12 }); y += BH;
  nextArrow();

  // ◇ Действие пользователя
  const dY2 = y + DH/2;
  drawDiamond(ctx, cx, dY2, DW + 20, DH, 'Действие пользователя');
  y = dY2 + DH/2;
  nextArrow('Бронирование');

  // Выбор объекта
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Выбор объекта размещения и дат', { textSize: 13 }); y += BH;
  nextArrowShort();

  // Расчёт стоимости
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Расчёт стоимости с учётом кэшбека', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Способ оплаты
  const dY3 = y + DH/2;
  drawDiamond(ctx, cx, dY3, DW, DH, 'Способ оплаты');
  // Левая ветка: карта
  const payLX = 28, payLY = dY3 - BH/2;
  drawBox(ctx, payLX, payLY, 130, BH, 'Карта\nлояльности', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx - DW/2, dY3, payLX + 130, dY3, 'Баллы');
  // Правая ветка: шлюз
  const payRW = 160, payRX = W - 28 - payRW, payRY = dY3 - BH/2;
  drawBox(ctx, payRX, payRY, payRW, BH, 'Stripe / PayPal\n(платёжный шлюз)', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY3, payRX, dY3, 'Карта');

  y = dY3 + DH/2;
  nextArrow();

  // Подтверждение
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Подтверждение бронирования', { fill: C.fillMid, textSize: 13 }); y += BH;
  nextArrowShort();
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Начисление кэшбека на карту лояльности', { textSize: 12 }); y += BH;
  nextArrowShort();
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Push-уведомление (Expo Push API)', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Уровень изменился?
  const dY4 = y + DH/2;
  drawDiamond(ctx, cx, dY4, DW, DH, 'Уровень лояльности\nизменился?', 11);
  const mlX = cx + DW/2 + 14, mlY = dY4 - BH/2;
  drawBox(ctx, mlX, mlY, 162, BH, 'RFM-пересчёт\n(ML-сервис)', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY4, mlX, dY4, 'Да');

  y = dY4 + DH/2;
  nextArrow('Нет');

  // Терминатор КОНЕЦ
  drawTerminator(ctx, cx, y + 22, 210, 40, 'КОНЕЦ');

  caption(ctx, W, y + 54, 'Рисунок 2.4 — Функциональная схема системы Villa Jaconda Loyalty App');

  fs.writeFileSync(path.join(OUT, 'fig_2_4.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_4.png');
}

genFig21();
genFig23();
genFig24();
console.log('\nВсе диаграммы готовы в vkr/assets/');
