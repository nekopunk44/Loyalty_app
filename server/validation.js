/**
 * Схемы валидации через zod.
 * validate() middleware:
 *   - Парсит req.body по схеме
 *   - Заменяет req.body ТОЛЬКО проверенными полями (неизвестные отброшены)
 *   - Возвращает 400 при ошибке с полем-сообщением
 */
const { z } = require('zod');

// ==================== Helpers ====================

const dateRu      = z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Формат: ДД.ММ.ГГГГ');
const email       = z.string().trim().toLowerCase().email('Некорректный email').max(254);
const password    = z.string().min(8, 'Минимум 8 символов').max(128)
  .refine(p => /\d/.test(p),   { message: 'Пароль должен содержать цифру' })
  .refine(p => /[A-Z]/.test(p), { message: 'Пароль должен содержать заглавную букву' });
const safeString  = (max) => z.string().trim().min(1).max(max);
const safeOptStr  = (max) => z.string().trim().max(max).optional();

// ==================== Auth ====================

const registerSchema = z.object({
  email,
  password,
  displayName:  safeOptStr(100),
  firstName:    safeOptStr(60),
  lastName:     safeOptStr(60),
  phone:        z.string().trim().regex(/^[\+\d\s\-()]{0,32}$/).optional(),
  referralCode: z.string().trim().regex(/^[A-Za-z0-9_\-]{0,32}$/).optional(),
}).strict();

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
}).strict();

const resetPasswordSchema = z.object({
  email,
}).strict();

const setNewPasswordSchema = z.object({
  token:       z.string().min(8).max(256),
  newPassword: password,
}).strict();

const verifyEmailSchema = z.object({
  token: z.string().min(8).max(256),
}).strict();

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(16).max(512),
}).strict();

// ==================== Bookings ====================

const createBookingSchema = z.object({
  propertyId:    z.union([z.number().int().positive(), z.string().regex(/^\d{1,10}$/)]),
  checkInDate:   dateRu,
  checkOutDate:  dateRu,
  guests:        z.coerce.number().int().min(1).max(50).optional(),
  saunaHours:    z.coerce.number().int().min(0).max(24).optional(),
  kitchenware:   z.boolean().optional(),
  notes:         z.string().trim().max(1000).optional(),
  totalPrice:    z.coerce.number().nonnegative().max(10_000_000).optional(),
  totalAmount:   z.coerce.number().nonnegative().max(10_000_000).optional(),
  paymentMethod: z.string().trim().max(32).optional(),
}).strict();

// ==================== Payments ====================

const cardTopupSchema = z.object({
  amount:         z.coerce.number().positive('Сумма должна быть > 0').max(1_000_000),
  paymentMethod:  z.enum(['card', 'sbp', 'bank_transfer']).optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
}).strict();

// ==================== Users ====================

const updateUserSchema = z.object({
  displayName: safeOptStr(100),
  phone:       z.string().trim().regex(/^[\+\d\s\-()]{0,32}$/).optional(),
  address:     safeOptStr(255),
  avatar:      z.string().url().max(512).optional(),
}).strict();

// ==================== Admin ====================

// Admin balance adjustment: amount может быть отрицательным (списание) или положительным (зачисление).
// Reason — обязательный код причины; description — свободный комментарий для аудита.
const adminAdjustBalanceSchema = z.object({
  amount:      z.coerce.number().refine(n => n !== 0, { message: 'Сумма не может быть 0' })
                .refine(n => Math.abs(n) <= 1_000_000, { message: 'Максимум 1 000 000' }),
  reason:      z.enum(['compensation', 'correction', 'promo_bonus', 'penalty', 'other']),
  description: safeString(500),
}).strict();

// ==================== Analytics ====================

const analyticsSchema = z.object({
  eventType: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_\-.]+$/),
  data:      z.record(z.unknown()).optional(),
}).strict();

// ==================== Events ====================

const createEventSchema = z.object({
  title:       safeString(200),
  description: z.string().trim().max(5000).optional(),
  date:        z.string().trim().max(20),   // DD.MM.YYYY или ISO
  time:        z.string().trim().max(10).optional(),
  location:    safeOptStr(200),
  maxAttendees: z.coerce.number().int().min(1).max(10000).optional(),
  price:       z.coerce.number().nonnegative().max(1_000_000).optional(),
  imageUrl:    z.string().url().max(512).optional(),
}).strict();

// ==================== Middleware ====================

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error:   'Ошибка валидации',
      details: result.error.issues.map(i => ({
        field:   i.path.join('.'),
        message: i.message,
      })),
    });
  }
  // Заменяем req.body строго проверенными данными — неизвестные поля удалены
  req.body = result.data;
  next();
};

module.exports = {
  validate,
  schemas: {
    register:      registerSchema,
    login:         loginSchema,
    resetPassword: resetPasswordSchema,
    setNewPassword: setNewPasswordSchema,
    verifyEmail:   verifyEmailSchema,
    refreshToken:  refreshTokenSchema,
    createBooking: createBookingSchema,
    cardTopup:     cardTopupSchema,
    updateUser:    updateUserSchema,
    analytics:     analyticsSchema,
    createEvent:   createEventSchema,
    adminAdjustBalance: adminAdjustBalanceSchema,
  },
};
