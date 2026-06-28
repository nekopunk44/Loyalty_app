/**
 * Barrel-экспорт всех Sequelize-моделей.
 * Использование:
 *   const { User, Booking, Property } = require('./models');
 *
 * Ассоциаций (belongsTo/hasMany) сейчас нет — связи хранятся через
 * userId/propertyId/bookingId как строки/числа без FK-constraint'ов.
 * Если будут добавляться — делать в этом файле, после require'ов всех моделей.
 */
module.exports = {
  User:               require('./User'),
  Booking:            require('./Booking'),
  Property:           require('./Property'),
  LoyaltyCard:        require('./LoyaltyCard'),
  Transaction:        require('./Transaction'),
  Event:              require('./Event'),
  Notification:       require('./Notification'),
  Referral:           require('./Referral'),
  CardTopUp:          require('./CardTopUp'),
  Payment:            require('./Payment'),
  AdminWallet:        require('./AdminWallet'),
  AdminTransaction:   require('./AdminTransaction'),
  WithdrawalRequest:  require('./WithdrawalRequest'),
  WithdrawalAuditLog: require('./WithdrawalAuditLog'),
  AuctionBid:         require('./AuctionBid'),
  AppSetting:         require('./AppSetting'),
};
