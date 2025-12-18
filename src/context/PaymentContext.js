import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
