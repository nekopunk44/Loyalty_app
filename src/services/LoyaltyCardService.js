import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';

const LoyaltyCardService = {
  async getCard(userId) {
    if (!userId) throw new Error('userId обязателен');
    const data = await apiCall(`${getApiUrl()}/loyalty-card/${userId}`);
    if (!data.success) throw new Error(data.error || 'Ошибка получения карты');
    return data.loyaltyCard;
  },

  async topUpCard(userId, amount, paymentMethod = 'card') {
    if (!userId || !amount || amount <= 0) {
      throw new Error('userId и amount (> 0) обязательны');
    }
    const data = await apiCall(`${getApiUrl()}/loyalty-card/${userId}/top-up`, {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(amount), paymentMethod }),
    });
    if (!data.success) throw new Error(data.error || 'Ошибка пополнения карты');
    return data.loyaltyCard;
  },

  async getTransactions(userId, limit = 50, offset = 0) {
    if (!userId) throw new Error('userId обязателен');
    const data = await apiCall(
      `${getApiUrl()}/loyalty-card/${userId}/transactions?limit=${limit}&offset=${offset}`
    );
    if (!data.success) throw new Error(data.error || 'Ошибка получения транзакций');
    return { transactions: data.transactions, pagination: data.pagination };
  },

  async getBalance(userId) {
    const card = await this.getCard(userId);
    return card.balance;
  },

  async hasEnoughBalance(userId, requiredAmount) {
    const balance = await this.getBalance(userId);
    return balance >= requiredAmount;
  },
};

export default LoyaltyCardService;
