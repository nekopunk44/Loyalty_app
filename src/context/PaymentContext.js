import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../utils/apiUrl';

const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cardBalance, setCardBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // ==================== Card Top-Up ====================

  /**
   * Пополнить карту лояльности
   */
  const topUpCard = async (userId, amount, paymentMethod) => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const response = await fetch(`${getApiUrl()}/card/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при пополнении карты');
      }

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

      console.log(`✅ Карта пополнена на ${amount}₽`);
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
   * Получить баланс карты
   */
  const getCardBalance = async (userId) => {
    try {
      const response = await fetch(`${getApiUrl()}/card/balance/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setCardBalance(data.balance);
        return data;
      } else {
        throw new Error(data.error || 'Ошибка при получении баланса');
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      throw error;
    }
  };

  /**
   * Получить историю транзакций
   */
  const getTransactionHistory = async (userId, limit = 50) => {
    try {
      const response = await fetch(`${getApiUrl()}/card/transactions/${userId}?limit=${limit}`);
      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions);
        return data;
      } else {
        throw new Error(data.error || 'Ошибка при получении истории');
      }
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  };

  /**
   * Получить историю пополнений
   */
  const getTopUpHistory = async (userId, limit = 20) => {
    try {
      const response = await fetch(`${getApiUrl()}/card/topups/${userId}?limit=${limit}`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Ошибка при получении истории пополнений');
      }
    } catch (error) {
      console.error('❌ Error fetching topups:', error);
      throw error;
    }
  };

  // ==================== Booking Payment ====================

  /**
   * Оплатить бронирование с карты лояльности
   */
  const payBookingFromCard = async (bookingId, userId) => {
    setIsProcessing(true);
    setPaymentError('');

    try {
      const response = await fetch(`${getApiUrl()}/bookings/${bookingId}/pay-from-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при оплате бронирования');
      }

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

      console.log(`✅ Бронирование #${bookingId} оплачено`);
      return data;
    } catch (error) {
      setPaymentError(error.message || 'Ошибка при оплате');
      console.error('❌ Error in payBookingFromCard:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Получить статус платежа по бронированию
   */
  const getBookingPaymentStatus = async (bookingId) => {
    try {
      const response = await fetch(`${getApiUrl()}/bookings/${bookingId}/payment-status`);
      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Ошибка при получении статуса платежа');
      }
    } catch (error) {
      console.error('❌ Error fetching payment status:', error);
      throw error;
    }
  };

  // ==================== Legacy Methods (для совместимости) ====================

  // Process payment (legacy)
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

  // Process PayPal payment (legacy)
  const processPayPalPayment = async (amount, bookingId, description) => {
    try {
      return processPayment({
        amount,
        method: 'paypal',
        bookingId,
        description,
      });
    } catch (error) {
      throw error;
    }
  };

  // Process Visa/Stripe payment (legacy)
  const processVisaPayment = async (cardToken, amount, bookingId, description) => {
    try {
      return processPayment({
        amount,
        method: 'visa',
        bookingId,
        description,
        cardToken,
      });
    } catch (error) {
      throw error;
    }
  };

  // Process Crypto payment (legacy)
  const processCryptoPayment = async (cryptoType, amount, bookingId, description) => {
    try {
      const cryptoPayment = {
        id: Date.now().toString(),
        amount,
        method: 'crypto',
        cryptoType,
        status: 'pending',
        bookingId,
        description,
        timestamp: new Date().toISOString(),
        walletAddress: generateCryptoAddress(cryptoType),
        qrCode: null,
      };

      const updated = [cryptoPayment, ...payments];
      setPayments(updated);
      await AsyncStorage.setItem('@payments', JSON.stringify(updated));

      return cryptoPayment;
    } catch (error) {
      setPaymentError(error.message || 'Crypto payment setup failed');
      throw error;
    }
  };

  const generateCryptoAddress = (cryptoType) => {
    const addresses = {
      bitcoin: '1A1z7agoat2YLZW51Bc7M8' + Math.random().toString(36).substr(2, 10),
      ethereum: '0x' + Math.random().toString(16).substr(2, 40),
      usdt: '0x' + Math.random().toString(16).substr(2, 40),
    };
    return addresses[cryptoType] || addresses.ethereum;
  };

  const getPaymentStatus = (paymentId) => {
    return payments.find(p => p.id === paymentId);
  };

  const getAllPayments = () => {
    return payments;
  };

  return (
    <PaymentContext.Provider value={{
      // State
      payments,
      isProcessing,
      paymentError,
      cardBalance,
      transactions,
      setCardBalance,

      // New Card Top-Up Methods
      topUpCard,
      getCardBalance,
      getTransactionHistory,
      getTopUpHistory,

      // New Booking Payment Methods
      payBookingFromCard,
      getBookingPaymentStatus,

      // Legacy Methods
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
