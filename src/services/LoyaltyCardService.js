import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';

const API_BASE = getApiUrl();

/**
 * Сервис для работы с картой лояльности
 */
const LoyaltyCardService = {
  /**
   * Получить информацию о карте лояльности
   * GET /loyalty-card/:userId
   */
  async getCard(userId) {
    if (!userId) {
      throw new Error('userId обязателен');
    }

    try {
      const response = await fetch(`${API_BASE}/loyalty-card/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Ошибка получения карты');
      }

      return data.loyaltyCard;
    } catch (error) {
      console.error('❌ Ошибка получения карты лояльности:', error.message);
      throw error;
    }
  },

  /**
   * Пополнить баланс карты лояльности
   * POST /loyalty-card/:userId/top-up
   */
  async topUpCard(userId, amount, paymentMethod = 'card') {
    if (!userId || !amount || amount <= 0) {
      throw new Error('userId и amount (> 0) обязательны');
    }

    try {
      const response = await fetch(`${API_BASE}/loyalty-card/${userId}/top-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Ошибка пополнения карты');
      }

      console.log(`✅ Карта пополнена на ${amount}PRB`);
      return data.loyaltyCard;
    } catch (error) {
      console.error('❌ Ошибка пополнения карты:', error.message);
      throw error;
    }
  },

  /**
   * Получить историю транзакций
   * GET /loyalty-card/:userId/transactions
   */
  async getTransactions(userId, limit = 50, offset = 0) {
    if (!userId) {
      throw new Error('userId обязателен');
    }

    try {
      const response = await fetch(
        `${API_BASE}/loyalty-card/${userId}/transactions?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Ошибка получения транзакций');
      }

      return {
        transactions: data.transactions,
        pagination: data.pagination,
      };
    } catch (error) {
      console.error('❌ Ошибка получения транзакций:', error.message);
      throw error;
    }
  },

  /**
   * Вспомогательный метод для получения баланса
   */
  async getBalance(userId) {
    const card = await this.getCard(userId);
    return card.balance;
  },

  /**
   * Проверить достаточность средств
   */
  async hasEnoughBalance(userId, requiredAmount) {
    const balance = await this.getBalance(userId);
    return balance >= requiredAmount;
  },
};

export default LoyaltyCardService;
