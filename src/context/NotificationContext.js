import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = createContext();

// Настройка уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Инициализация уведомлений
  useEffect(() => {
    setupNotifications();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const setupNotifications = async () => {
    try {
      // На web push notifications требует VAPID key, поэтому пропускаем
      if (typeof window !== 'undefined') {
        console.log('ℹ️ Push notifications отключены на web');
        return;
      }

      // Запрос разрешения на уведомления
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // Получить токен для push-уведомлений (в production используется реальный сервис)
        const token = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(token.data);
        await AsyncStorage.setItem('@expo_push_token', token.data);
      }

      // Слушать входящие уведомления
      notificationListener.current = Notifications.addNotificationReceivedListener(
        notification => {
          const newNotification = {
            id: notification.request.identifier,
            title: notification.request.content.title,
            body: notification.request.content.body,
            data: notification.request.content.data,
            timestamp: new Date().toISOString(),
            read: false,
          };
          setNotifications(prev => [newNotification, ...prev]);
        }
      );

      // Слушать нажатия на уведомления
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        response => {
          console.log('Уведомление нажато:', response);
          // Здесь можно добавить навигацию
        }
      );

      // Загрузить сохранённые уведомления
      const saved = await AsyncStorage.getItem('@notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Ошибка инициализации уведомлений:', error);
    }
  };

  // Отправить уведомление
  const sendNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: { seconds: 1 }, // Отправить через 1 секунду
      });
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
    }
  };

  // Запланировать уведомление
  const scheduleNotification = async (title, body, seconds = 60, data = {}) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: { seconds },
      });
      return notificationId;
    } catch (error) {
      console.error('Ошибка планирования уведомления:', error);
    }
  };

  // Отправить уведомление о новом бронировании
  const notifyNewBooking = async (propertyName, guestName) => {
    await sendNotification(
      '📅 Новое бронирование',
      `${guestName} забронировал ${propertyName}`,
      { type: 'booking', property: propertyName }
    );
  };

  // Отправить уведомление о платеже
  const notifyPaymentSuccess = async (amount, method) => {
    await sendNotification(
      '✅ Платёж успешен',
      `Вы заплатили ${amount} ₽ через ${method}`,
      { type: 'payment', amount, method }
    );
  };

  // Отправить уведомление о событии
  const notifyEvent = async (eventName, date) => {
    await sendNotification(
      '🎉 Новое событие',
      `${eventName} начнётся ${date}`,
      { type: 'event', event: eventName }
    );
  };

  // Отправить уведомление админу о реферале
  const notifyReferral = async (friendName, bonus) => {
    await sendNotification(
      '👥 Новый реферал',
      `${friendName} присоединился и вы получили ${bonus} ₽`,
      { type: 'referral', friend: friendName }
    );
  };

  // Отправить уведомление об отзыве
  const notifyReview = async (propertyName, rating) => {
    await sendNotification(
      '⭐ Новый отзыв',
      `Отзыв о ${propertyName} (${rating} звёзд)`,
      { type: 'review', property: propertyName, rating }
    );
  };

  // Отправить уведомление админу о событии
  const notifyAdminEvent = async (eventType, details) => {
    const messages = {
      new_user: `Новый пользователь: ${details.name}`,
      new_booking: `Новое бронирование от ${details.guestName}`,
      payment: `Платёж получен: ${details.amount} ₽`,
      review: `Новый отзыв: ${details.rating} звёзд`,
      report: `Отчёт: ${details.message}`,
    };

    await sendNotification(
      '🔔 Событие',
      messages[eventType] || eventType,
      { type: 'admin_event', eventType, ...details }
    );
  };

  // Пометить уведомление как прочитанное
  const markAsRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );

    // Сохранить в storage
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
  };

  // Удалить уведомление
  const deleteNotification = async (notificationId) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    setNotifications(updated);
    await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
  };

  // Очистить все уведомления
  const clearAllNotifications = async () => {
    setNotifications([]);
    await AsyncStorage.setItem('@notifications', JSON.stringify([]));
  };

  // Получить непрочитанные уведомления
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Переключить уведомления включено/отключено
  const toggleNotifications = async (enabled) => {
    setIsEnabled(enabled);
    await AsyncStorage.setItem('@notifications_enabled', String(enabled));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        expoPushToken,
        isEnabled,
        toggleNotifications,
        sendNotification,
        scheduleNotification,
        notifyNewBooking,
        notifyPaymentSuccess,
        notifyEvent,
        notifyReferral,
        notifyReview,
        notifyAdminEvent,
        markAsRead,
        deleteNotification,
        clearAllNotifications,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
