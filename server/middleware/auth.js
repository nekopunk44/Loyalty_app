/**
 * JWT auth middleware: verifyToken / verifyAdmin / verifyFinanceAdmin
 * + хелперы доступа к ресурсу (canAccessBooking, requireOwnerOrAdmin).
 *
 * JWT_SECRET читается из env при каждом вызове, чтобы тесты могли его подменять.
 * В production его наличие проверяется в index.js на старте.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'development-only-jwt-secret-change-me';

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, async () => {
    try {
      const user = await User.findOne({ where: { userId: req.userId } });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }
      req.dbUser = user;
      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  });
};

const verifyFinanceAdmin = (req, res, next) => {
  verifyAdmin(req, res, () => {
    if (req.dbUser?.adminLevel !== 1) {
      return res.status(403).json({ success: false, error: 'Finance admin access required' });
    }
    next();
  });
};

const canAccessBooking = (req, booking) =>
  booking?.userId === req.userId || req.user?.role === 'admin';

const requireOwnerOrAdmin = (req, res, next) => {
  const paramUserId = req.params.userId;
  if (!paramUserId || req.userId === paramUserId || req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Доступ запрещен' });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyFinanceAdmin,
  canAccessBooking,
  requireOwnerOrAdmin,
};
