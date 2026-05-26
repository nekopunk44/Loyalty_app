import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';

const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cardBalance, setCardBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // ==================== Card Top-Up ====================

  const topUpCard = async (userId, amount, paymentMethod) => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const data = await apiCall(`${getApiUrl()}/card/topup`, {
        method: 'POST',
        body: JSON.stringify({ userId, amount, paymentMethod }),
      });

      if (data.error) throw new Error(data.error);

      setCardBalance(data.newBalance);

      const topupRecord = {
        id: data.topup.id,
        userId,
        amount,
        paymentMethod,
        status: 'completed',
        timestamp: new Date().toISOString(),
        transactionId: data.transactionId,
      };

      const updated = [topupRecord, ...payments];
      setPayments(updated);
      await AsyncStorage.setItem('@payments', JSON.stringify(updated));

      return data;
    } catch (error) {
      setPaymentError(error.message || 'Ошибка при пополнении карты');
      console.error('❌ Error in topUpCard:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Пополнение через Stripe Checkout.
   *
   * Поток (без deep link, чтобы не было cold-start в Expo Go):
   *   1. POST /payments/stripe/create-session → получаем session URL.
   *   2. Открываем URL в Custom Tab через WebBrowser.openBrowserAsync.
   *   3. ПАРАЛЛЕЛЬНО polling GET /session/:id каждые 1.5 с.
   *   4. Когда сервер подтвердил paid → программно закрываем Custom Tab
   *      через WebBrowser.dismissBrowser() и подтягиваем актуальный баланс.
   *   5. Если юзер закрыл Tab сам → status='cancelled'.
   *
   * @param {string|number} userId
   * @param {number} amount   Сумма в PRB
   * @param {string} currency 'RUB' | 'USD'
   * @returns {Promise<{ success: boolean, status: 'paid'|'unpaid'|'cancelled'|'failed', newBalance?: number }>}
   */
  const topUpCardStripe = async (userId, amount, currency = 'RUB') => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const session = await apiCall(`${getApiUrl()}/payments/stripe/create-session`, {
        method: 'POST',
        body: JSON.stringify({ amount, currency }),
      });

      if (session.error || !session.url) {
        throw new Error(session.error || 'Не удалось создать платёжную сессию');
      }

      // Параллельный polling статуса оплаты.
      // Завершается, когда сервер вернул paid/failed/expired или
      // когда юзер закрыл Custom Tab вручную (browserDismissed=true).
      const POLL_INTERVAL_MS = 1500;
      const MAX_ATTEMPTS = 60; // 90 секунд — на медленных сетях / 3DS
      let browserDismissed = false;
      let finalStatus = 'unpaid';

      const pollPromise = (async () => {
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          if (browserDismissed) return;
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
          if (browserDismissed) return;
          try {
            const status = await apiCall(
              `${getApiUrl()}/payments/stripe/session/${session.sessionId}`
            );
            if (status.paymentStatus === 'paid' || status.topupStatus === 'completed') {
              finalStatus = 'paid';
              // Программно закрываем Custom Tab — без deep link
              try { WebBrowser.dismissBrowser(); } catch (_) {}
              return;
            }
            if (status.sessionStatus === 'expired' || status.topupStatus === 'failed') {
              finalStatus = 'failed';
              try { WebBrowser.dismissBrowser(); } catch (_) {}
              return;
            }
          } catch (_) { /* network blip — продолжаем */ }
        }
      })();

      // Promise разрешается, когда Custom Tab закрывается
      // (либо юзером, либо программно из polling через dismissBrowser).
      await WebBrowser.openBrowserAsync(session.url, {
        dismissButtonStyle: 'cancel',
        showTitle: true,
      });
      browserDismissed = true;
      await pollPromise; // дождаться завершения polling-цикла

      if (finalStatus === 'paid') {
        const balanceData = await apiCall(`${getApiUrl()}/card/balance/${userId}`);
        if (!balanceData.error) setCardBalance(balanceData.balance);

        const topupRecord = {
          id: `stripe_${session.topupId}`,
          userId,
          amount,
          paymentMethod: 'card',
          provider: 'stripe',
          status: 'completed',
          timestamp: new Date().toISOString(),
          providerSessionId: session.sessionId,
        };
        const updated = [topupRecord, ...payments];
        setPayments(updated);
        await AsyncStorage.setItem('@payments', JSON.stringify(updated));

        return {
          success: true,
          status: 'paid',
          newBalance: balanceData?.balance,
          sessionId: session.sessionId,
        };
      }

      // Юзер закрыл Tab до того, как пришёл webhook — считаем отменой.
      // (если оплата всё же прошла, webhook отработает и зачислит на сервере,
      // а пользователь увидит новый баланс при следующем обновлении карты)
      return {
        success: false,
        status: finalStatus === 'failed' ? 'failed' : 'cancelled',
        sessionId: session.sessionId,
      };
    } catch (error) {
      setPaymentError(error.message || 'Ошибка при оплате через Stripe');
      console.error('Stripe topup error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardBalance = async (userId) => {
    try {
      const data = await apiCall(`${getApiUrl()}/card/balance/${userId}`);
      if (data.error) throw new Error(data.error);
      setCardBalance(data.balance);
      return data;
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      throw error;
    }
  };

  const getTransactionHistory = async (userId, limit = 50) => {
    try {
      const data = await apiCall(`${getApiUrl()}/card/transactions/${userId}?limit=${limit}`);
      if (data.error) throw new Error(data.error);
      setTransactions(data.transactions);
      return data;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  };

  const getTopUpHistory = async (userId, limit = 20) => {
    try {
      const data = await apiCall(`${getApiUrl()}/card/topups/${userId}?limit=${limit}`);
      if (data.error) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error('❌ Error fetching topups:', error);
      throw error;
    }
  };

  // ==================== Booking Payment ====================

  const payBookingFromCard = async (bookingId, userId) => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const data = await apiCall(`${getApiUrl()}/bookings/${bookingId}/pay-from-card`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      if (data.error) throw new Error(data.error);

      setCardBalance(data.newBalance);

      const payment = {
        id: data.paymentId,
        bookingId,
        userId,
        amount: data.payment.amount,
        method: 'loyalty_card',
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      const updated = [payment, ...payments];
      setPayments(updated);
      await AsyncStorage.setItem('@payments', JSON.stringify(updated));

      return data;
    } catch (error) {
      setPaymentError(error.message || 'Ошибка при оплате');
      console.error('❌ Error in payBookingFromCard:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const getBookingPaymentStatus = async (bookingId) => {
    try {
      const data = await apiCall(`${getApiUrl()}/bookings/${bookingId}/payment-status`);
      if (data.error) throw new Error(data.error);
      return data;
    } catch (error) {
      console.error('❌ Error fetching payment status:', error);
      throw error;
    }
  };

  // ==================== Legacy Methods ====================

  const processPayment = async (paymentData) => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const payment = {
        id: Date.now().toString(),
        amount: paymentData.amount,
        method: paymentData.method,
        status: 'completed',
        bookingId: paymentData.bookingId,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        transactionId: 'TXN_' + Date.now(),
      };

      const updated = [payment, ...payments];
      setPayments(updated);
      await AsyncStorage.setItem('@payments', JSON.stringify(updated));

      return payment;
    } catch (error) {
      setPaymentError(error.message || 'Payment processing failed');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayPalPayment = async (amount, bookingId, description) => {
    return processPayment({ amount, method: 'paypal', bookingId, description });
  };

  const processVisaPayment = async (cardToken, amount, bookingId, description) => {
    return processPayment({ amount, method: 'visa', bookingId, description, cardToken });
  };

  const processCryptoPayment = async () => {
    const err = new Error('Крипто-оплата временно недоступна. Используйте другой способ оплаты.');
    setPaymentError(err.message);
    throw err;
  };

  const getPaymentStatus = (paymentId) => payments.find(p => p.id === paymentId);
  const getAllPayments = () => payments;

  return (
    <PaymentContext.Provider value={{
      payments,
      isProcessing,
      paymentError,
      cardBalance,
      transactions,
      setCardBalance,
      topUpCard,
      topUpCardStripe,
      getCardBalance,
      getTransactionHistory,
      getTopUpHistory,
      payBookingFromCard,
      getBookingPaymentStatus,
      processPayment,
      processPayPalPayment,
      processVisaPayment,
      processCryptoPayment,
      getPaymentStatus,
      getAllPayments,
    }}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within PaymentProvider');
  }
  return context;
};
