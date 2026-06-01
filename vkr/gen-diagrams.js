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
  bg:        '#FFFFFF',
  border:    '#1C1208',
  fill:      '#FDFAF2',
  fillMid:   '#EDE8DC',
  fillDark:  '#1C1208',
  gold:      '#8B6914',
  text:      '#1C1208',
  textLight: '#FFFFFF',
  arrow:     '#1C1208',
  zone1:     '#F0EBE0',
  zone2:     '#E8E4D8',
  zone3:     '#E2DED0',
};

function setFont(ctx, size, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`;
}

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
  lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, startY + i * lineH));
  ctx.restore();
}

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
  ctx.setLineDash([]);
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

  // ── Ярус 1: Клиент ───────────────────────────────────────────────────────
  const t1y = 20, t1h = 210;
  drawRect(ctx, pad, t1y, W - pad * 2, t1h, { fill: C.zone1, stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t1y, 'ЯРУС КЛИЕНТА');

  const bxW = (W - pad * 2 - 60) / 2;
  const bxH = 150, bxY = t1y + 32;

  // Left border accent for inner boxes
  function drawAccentBox(ctx, x, y, w, h, lines, size = 12) {
    drawRect(ctx, x, y, w, h, { fill: C.fill, stroke: C.border, lw: 1.5 });
    // gold left accent bar
    ctx.fillStyle = C.gold;
    ctx.fillRect(x, y, 4, h);
    setFont(ctx, size);
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineH = Math.round(size * 1.5);
    lines.forEach((ln, i) => {
      const isBold = i === 0;
      setFont(ctx, isBold ? size + 1 : size, isBold);
      ctx.fillStyle = isBold ? C.gold : C.text;
      ctx.fillText(ln, x + 14, y + 10 + i * lineH);
    });
  }

  drawAccentBox(ctx, pad + 20, bxY, bxW, bxH, [
    'Mobile App  (React Native / Expo)',
    '18 экранов · 10 контекстов React Context',
    'Modules: Superstore, Services, Navigation',
    'AuthContext · LoyaltyCardContext · PaymentContext',
  ]);

  drawAccentBox(ctx, pad + 20 + bxW + 20, bxY, bxW, bxH, [
    'Web Landing  (Next.js 15 / SSR)',
    'Страницы: Hero · Rooms · Tour · LoyaltyTiers',
    'AppDownload · Reviews · BookingSection · FAQ',
    'CSS-переменные дизайн-системы Villa Jaconda',
  ]);

  // Стрелки вниз
  const mid1 = pad + 20 + bxW / 2;
  const mid2 = pad + 20 + bxW + 20 + bxW / 2;
  const arrowFrom = t1y + t1h;
  const arrowTo   = arrowFrom + 46;
  drawArrow(ctx, mid1, arrowFrom, mid1, arrowTo, 'HTTPS / JWT');
  drawArrow(ctx, mid2, arrowFrom, mid2, arrowTo, 'HTTPS / JWT');

  // ── Ярус 2: API ──────────────────────────────────────────────────────────
  const t2y = arrowTo, t2h = 180;
  drawRect(ctx, pad, t2y, W - pad * 2, t2h, { fill: C.zone2, stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t2y, 'ЯРУС СЕРВЕРНОГО API');

  drawAccentBox(ctx, pad + 20, t2y + 32, W - pad * 2 - 40, t2h - 42, [
    'Express.js 5 — REST API сервер',
    'Мидлвары: helmet · rate-limit · cors · JWT-аутентификация · Zod-валидация входных данных',
    'Маршруты: /auth  /users  /bookings  /loyalty  /card  /events  /notifications  /admin',
    'Сервисы: AuthService · PaymentService · LoyaltyService · NotificationService · MLClient',
  ]);

  // Стрелки вниз от API
  const t2bot = t2y + t2h;
  const t3top = t2bot + 50;
  drawArrow(ctx, mid1, t2bot, mid1, t3top, 'Sequelize ORM / SQL');
  drawArrow(ctx, mid2, t2bot, mid2, t3top, 'HTTP / JSON');

  // ── Ярус 3: Хранилище + ML ───────────────────────────────────────────────
  const t3h = 210;
  const colW = (W - pad * 2 - 20) / 2;

  drawRect(ctx, pad, t3top, colW, t3h, { fill: C.zone3, stroke: C.gold, lw: 2 });
  tierLabel(ctx, pad, t3top, 'ХРАНИЛИЩЕ ДАННЫХ');

  drawAccentBox(ctx, pad + 12, t3top + 32, colW - 24, 108, [
    'PostgreSQL 16',
    '13 таблиц: users · bookings · loyalty_cards',
    'payments · events · notifications · referrals',
    'admin_wallets · transactions · referrals',
  ], 11);

  drawAccentBox(ctx, pad + 12, t3top + 150, colW - 24, 46, [
    'Redis — кеш сессий и очередь фоновых задач',
  ], 11);

  const mlX = pad + colW + 20;
  const mlW = W - mlX - pad;
  drawRect(ctx, mlX, t3top, mlW, t3h, { fill: C.zone3, stroke: C.gold, lw: 2 });
  tierLabel(ctx, mlX, t3top, 'ML-МИКРОСЕРВИС');

  drawAccentBox(ctx, mlX + 12, t3top + 32, mlW - 24, t3h - 42, [
    'FastAPI (Python 3.11) — Railway отдельный сервис',
    'POST /rfm/recompute  —  k-means кластеризация клиентов',
    'POST /churn/predict  —  Gradient Boosting прогноз оттока',
    'POST /recommend/events  —  гибридный рекомендер событий',
  ], 11);

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
    drawRect(ctx, x, y, EW, HEAD_H, { fill: C.fillDark, stroke: C.border });
    setFont(ctx, 12, true);
    ctx.fillStyle = C.textLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + EW / 2, y + HEAD_H / 2);
    drawRect(ctx, x, y + HEAD_H, EW, bodyH, { fill: C.fill, stroke: C.border });
    attrs.forEach((a, i) => {
      const isPK = a.startsWith('PK');
      const isUK = a.startsWith('UK');
      setFont(ctx, 10, isPK || isUK);
      ctx.fillStyle = isPK ? C.gold : isUK ? '#555' : C.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(a, x + 7, y + HEAD_H + 10 + i * ATTR_H);
    });
    const bottom = y + totalH;
    return { x, y, w: EW, h: totalH, cx: x + EW / 2, cy: y + totalH / 2, top: y, bottom, left: x, right: x + EW };
  }

  // ROW[0]=100 gives 100px top margin — used for routing User→distant entities above entities
  const COL = [30, 220, 415, 615, 815, 1010];
  const ROW  = [100, 400];

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

  function cardLabel(x, y, text) {
    setFont(ctx, 11, true);
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  // Draw a polyline with arrowhead at the last point, and optional cardinality labels
  function relPath(points, c1, c1pos, c2, c2pos) {
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
    const n = points.length;
    const dx = points[n-1][0] - points[n-2][0];
    const dy = points[n-1][1] - points[n-2][1];
    arrowHead(ctx, points[n-1][0], points[n-1][1], Math.atan2(dy, dx));
    if (c1 && c1pos) cardLabel(c1pos[0], c1pos[1], c1);
    if (c2 && c2pos) cardLabel(c2pos[0], c2pos[1], c2);
  }

  // ── Connections without crossings ──────────────────────────────────────────

  // User → LoyaltyCard  (straight down, same column)
  relPath(
    [[user.cx, user.bottom], [lcard.cx, lcard.top]],
    '1', [user.cx - 16, user.bottom + 14],
    '1', [lcard.cx - 16, lcard.top  - 14]
  );

  // User → Booking  (straight right)
  relPath(
    [[user.right, user.cy], [booking.left, booking.cy]],
    '1', [user.right  + 12, user.cy    - 14],
    'N', [booking.left - 12, booking.cy - 14]
  );

  // Booking → Payment  (straight right)
  relPath(
    [[booking.right, booking.cy], [payment.left, payment.cy]],
    '1', [booking.right + 12, booking.cy - 14],
    'N', [payment.left  - 12, payment.cy - 14]
  );

  // Booking → Transaction  (straight down, same column)
  relPath(
    [[booking.cx, booking.bottom], [tx.cx, tx.top]],
    '1', [booking.cx - 16, booking.bottom + 14],
    'N', [tx.cx      - 16, tx.top         - 14]
  );

  // LoyaltyCard → Transaction  (straight right)
  relPath(
    [[lcard.right, lcard.cy], [tx.left, tx.cy]],
    '1', [lcard.right + 12, lcard.cy - 14],
    'N', [tx.left     - 12, tx.cy    - 14]
  );

  // Booking → Property  (elbow: down from Booking, then right to Property)
  // Avoids diagonal; routes through gap between rows
  const bpMidY = Math.round((booking.bottom + prop.top) / 2);
  relPath(
    [[booking.cx, booking.bottom], [booking.cx, bpMidY], [prop.cx, bpMidY], [prop.cx, prop.top]],
    'N', [booking.cx - 16, booking.bottom + 14],
    '1', [prop.cx   - 16, prop.top       - 14]
  );

  // ── User → distant row-0 entities: route ABOVE all entities (top margin) ──
  // Three staggered horizontals at y=55, y=37, y=19 avoid overlapping in routing lanes.
  // The vertical segments near user.cx are deliberately staggered by ±3px
  // so three lines appear as a clear "bus" rather than one merged line.

  // User → Notification  (route at y=55)
  relPath(
    [[user.cx - 3, user.top], [user.cx - 3, 55], [notif.cx, 55], [notif.cx, notif.top]],
    '1', [user.cx - 20, user.top - 10],
    'N', [notif.cx + 16, notif.top + 10]
  );

  // User → Referral  (route at y=37)
  relPath(
    [[user.cx, user.top], [user.cx, 37], [referral.cx, 37], [referral.cx, referral.top]],
    null, null,
    'N', [referral.cx + 16, referral.top + 10]
  );

  // User → AdminWallet  (route at y=19)
  relPath(
    [[user.cx + 3, user.top], [user.cx + 3, 19], [adminW.cx, 19], [adminW.cx, adminW.top]],
    null, null,
    '1', [adminW.cx + 16, adminW.top + 10]
  );

  caption(ctx, W, H - 26, 'Рисунок 2.3 — ER-диаграмма базы данных системы (основные сущности)');

  fs.writeFileSync(path.join(OUT, 'fig_2_3.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_3.png');
}

// ─── Рисунок 2.4 — Функциональная схема ──────────────────────────────────────
function genFig24() {
  const W = 820, H = 1260; // increased from 1020 — diagram overflowed
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const BW = 290, BH = 46;
  const DW = 240, DH = 56;

  let y = 28;

  function nextArrow(label = '') { const from = y; y += 38; drawArrow(ctx, cx, from, cx, y, label); }
  function nextArrowShort(label = '') { const from = y; y += 26; drawArrow(ctx, cx, from, cx, y, label); }

  // НАЧАЛО
  drawTerminator(ctx, cx, y + 22, 220, 40, 'НАЧАЛО'); y += 40;
  nextArrow();

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Запуск мобильного приложения', { textSize: 13 }); y += BH;
  nextArrow();

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Аутентификация пользователя (JWT)', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Авторизован?
  const dY1 = y + DH/2;
  drawDiamond(ctx, cx, dY1, DW, DH, 'Авторизован?');
  const loginX = cx + DW/2 + 14, loginY = dY1 - BH/2;
  drawBox(ctx, loginX, loginY, 178, BH, 'Экран входа / регистрации', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY1, loginX, dY1, 'Нет');
  // loop back
  const loopX = loginX + 178 + 12;
  ctx.strokeStyle = C.border; ctx.lineWidth = 1.2; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(loginX + 178, dY1);
  ctx.lineTo(loopX, dY1);
  ctx.lineTo(loopX, y - 16);
  ctx.lineTo(cx, y - 16);
  ctx.stroke();
  arrowHead(ctx, cx, y - 16, (3 * Math.PI) / 2);

  y = dY1 + DH/2;
  nextArrow('Да');

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Главный экран: баланс, события, рекомендации', { textSize: 12 }); y += BH;
  nextArrow();

  // ◇ Действие пользователя
  const dY2 = y + DH/2;
  drawDiamond(ctx, cx, dY2, DW + 20, DH, 'Действие пользователя');
  // Right branch: Events / other
  const evtW = 148, evtX = cx + (DW + 20)/2 + 14, evtY = dY2 - BH/2;
  drawBox(ctx, evtX, evtY, evtW, BH, 'События / Профиль', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + (DW + 20)/2, dY2, evtX, dY2, 'Другое');
  // loop back up
  const evtLoopX = evtX + evtW + 10;
  ctx.strokeStyle = C.border; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(evtX + evtW, dY2);
  ctx.lineTo(evtLoopX, dY2);
  ctx.lineTo(evtLoopX, y - 16);
  ctx.lineTo(cx, y - 16);
  ctx.stroke();
  arrowHead(ctx, cx, y - 16, (3 * Math.PI) / 2);

  y = dY2 + DH/2;
  nextArrow('Бронирование');

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Выбор объекта размещения и дат', { textSize: 13 }); y += BH;
  nextArrowShort();

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Расчёт стоимости с учётом кэшбека', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Способ оплаты
  const dY3 = y + DH/2;
  drawDiamond(ctx, cx, dY3, DW, DH, 'Способ оплаты');
  const payLX = 22, payLY = dY3 - BH/2;
  drawBox(ctx, payLX, payLY, 134, BH, 'Карта\nлояльности', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx - DW/2, dY3, payLX + 134, dY3, 'Баллы');
  const payRW = 164, payRX = W - 22 - payRW, payRY = dY3 - BH/2;
  drawBox(ctx, payRX, payRY, payRW, BH, 'Stripe / PayPal\n(платёжный шлюз)', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY3, payRX, dY3, 'Карта');

  y = dY3 + DH/2;
  nextArrow();

  drawBox(ctx, cx - BW/2, y, BW, BH, 'Подтверждение бронирования', { fill: C.fillMid, textSize: 13 }); y += BH;
  nextArrowShort();
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Начисление кэшбека на карту лояльности', { textSize: 12 }); y += BH;
  nextArrowShort();
  drawBox(ctx, cx - BW/2, y, BW, BH, 'Push-уведомление (Expo Push API)', { textSize: 13 }); y += BH;
  nextArrow();

  // ◇ Уровень лояльности изменился?
  const dY4 = y + DH/2;
  drawDiamond(ctx, cx, dY4, DW, DH, 'Уровень лояльности\nизменился?', 11);
  const mlW = 166, mlX = cx + DW/2 + 14, mlY = dY4 - BH/2;
  drawBox(ctx, mlX, mlY, mlW, BH, 'RFM-пересчёт\n(ML-сервис)', { fill: C.fillMid, textSize: 11 });
  drawArrow(ctx, cx + DW/2, dY4, mlX, dY4, 'Да');

  y = dY4 + DH/2;
  nextArrow('Нет');

  // КОНЕЦ
  drawTerminator(ctx, cx, y + 22, 220, 40, 'КОНЕЦ');

  caption(ctx, W, y + 56, 'Рисунок 2.4 — Функциональная схема системы Villa Jaconda Loyalty App');

  fs.writeFileSync(path.join(OUT, 'fig_2_4.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_4.png');
}

// ─── Рисунок 2.2 — Диаграмма последовательности «Бронирование» ───────────────
function genFig22() {
  const W = 1240, H = 920;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // 5 lifelines
  const actors = [
    { x: 110, w: 150, label: 'Пользователь', sub: '(актор)' },
    { x: 340, w: 170, label: 'Mobile App',   sub: 'React Native' },
    { x: 590, w: 170, label: 'Express API',  sub: 'Node.js' },
    { x: 840, w: 170, label: 'PostgreSQL',   sub: 'Sequelize ORM' },
    { x: 1080, w: 130, label: 'ML-сервис',   sub: 'FastAPI' },
  ];

  const headTop = 24, headH = 56;
  const lifelineTop = headTop + headH;
  const lifelineBottom = H - 60;

  // Заголовки lifelines
  actors.forEach(a => {
    drawRect(ctx, a.x, headTop, a.w, headH, { fill: C.fillDark, stroke: C.border, lw: 1.5 });
    setFont(ctx, 13, true);
    ctx.fillStyle = C.textLight;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.label, a.x + a.w / 2, headTop + headH / 2 - 8);
    setFont(ctx, 10);
    ctx.fillText(a.sub, a.x + a.w / 2, headTop + headH / 2 + 10);
  });

  // Вертикальные пунктирные lifelines (от низа заголовка до низа диаграммы)
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  actors.forEach(a => {
    const cx = a.x + a.w / 2;
    ctx.beginPath();
    ctx.moveTo(cx, lifelineTop);
    ctx.lineTo(cx, lifelineBottom);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  const lc = i => actors[i].x + actors[i].w / 2;

  // Универсальная стрелка сообщения; dashed = ответ
  function msg(y, from, to, n, label, dashed = false) {
    const x1 = lc(from), x2 = lc(to);
    const dir = x2 > x1 ? 1 : -1;
    ctx.strokeStyle = C.arrow;
    ctx.lineWidth = 1.6;
    if (dashed) ctx.setLineDash([6, 4]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    arrowHead(ctx, x2, y, dir > 0 ? 0 : Math.PI);
    setFont(ctx, 11, true);
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(n + '.', Math.min(x1, x2) + 6, y - 4);
    setFont(ctx, 11);
    ctx.fillStyle = C.text;
    ctx.fillText('  ' + label, Math.min(x1, x2) + 22, y - 4);
  }

  // Само-вызов на lifeline (петля сбоку)
  function selfMsg(y, actor, n, label) {
    const cx = lc(actor);
    ctx.strokeStyle = C.arrow;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + 36, y);
    ctx.lineTo(cx + 36, y + 18);
    ctx.lineTo(cx + 2, y + 18);
    ctx.stroke();
    arrowHead(ctx, cx + 2, y + 18, Math.PI);
    setFont(ctx, 11, true);
    ctx.fillStyle = C.gold;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(n + '.', cx + 42, y + 9);
    setFont(ctx, 11);
    ctx.fillStyle = C.text;
    ctx.fillText('  ' + label, cx + 58, y + 9);
  }

  // Последовательность сообщений
  let y = lifelineTop + 30;
  const step = 50;

  msg(y, 0, 1, 1, 'Выбор объекта и дат'); y += step;
  msg(y, 1, 2, 2, 'POST /bookings {propertyId, dateFrom, dateTo}'); y += step;
  msg(y, 2, 3, 3, 'SELECT bookings WHERE conflicts'); y += step;
  msg(y, 3, 2, 4, 'Нет пересечений', true); y += step;
  msg(y, 2, 4, 5, 'POST /churn/predict (userId)'); y += step;
  msg(y, 4, 2, 6, 'churn_score = 0.21', true); y += step;
  selfMsg(y, 2, 7, 'Расчёт стоимости с учётом скидки'); y += step + 18;
  msg(y, 2, 3, 8, 'INSERT booking (status=pending)'); y += step;
  msg(y, 2, 3, 9, 'INSERT payment, UPDATE loyalty_card (баллы)'); y += step;
  msg(y, 3, 2, 10, 'OK', true); y += step;
  msg(y, 2, 1, 11, '201 Created  {bookingId, balance}', true); y += step;
  selfMsg(y, 2, 12, 'sendPushNotification() через Expo Push API'); y += step + 18;
  msg(y, 1, 0, 13, 'Экран «Подтверждение бронирования»', true); y += step;

  caption(ctx, W, lifelineBottom + 20, 'Рисунок 2.2 — Последовательность взаимодействия при бронировании');

  fs.writeFileSync(path.join(OUT, 'fig_2_2.png'), canvas.toBuffer('image/png'));
  console.log('✓ fig_2_2.png');
}

genFig21();
genFig22();
genFig23();
genFig24();
console.log('\nВсе диаграммы готовы в vkr/assets/');
