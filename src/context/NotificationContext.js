import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';

const NotificationContext = createContext();

// expo-notifications крашит Expo Go в SDK 53+ при самом импорте,
// поэтому загружаем модуль только в development build / production
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const Notifications = IS_EXPO_GO ? null : require('expo-notifications');

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const NotificationProvider = ({ children }) => {
  const { user, authToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const sseRef = useRef(null);
  const sseReconnectTimer = useRef(null);

  // SSE-соединение для получения уведомлений в реальном времени
  const connectSSE = useCallback((userId, token) => {
    if (!userId || !token) return;

    // XMLHttpRequest доступен нативно в React Native
    const xhr = new XMLHttpRequest();
    sseRef.current = xhr;
    let processed = 0;

    xhr.open('GET', `${getApiUrl()}/notifications/${userId}/stream`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');

    xhr.onreadystatechange = () => {
      if (xhr.readyState < 3) return;

      const chunk = xhr.responseText.slice(processed);
      processed = xhr.responseText.length;

      const blocks = chunk.split('\n\n');
      for (const block of blocks) {
        const lines = block.trim().split('\n');
        const eventLine = lines.find(l => l.startsWith('event:'));
        const dataLine  = lines.find(l => l.startsWith('data:'));
        if (!dataLine) continue;
        const eventType = eventLine ? eventLine.slice(6).trim() : 'message';
        if (eventType !== 'notification') continue;
        try {
          const notification = JSON.parse(dataLine.slice(5).trim());
          setNotifications(prev => [notification, ...prev]);
        } catch (_) { /* ignore malformed event */ }
      }

      // Автопереподключение при закрытии
      if (xhr.readyState === 4 && sseRef.current === xhr) {
        sseReconnectTimer.current = setTimeout(() => connectSSE(userId, token), 5000);
      }
    };

    xhr.onerror = () => {
      if (sseRef.current === xhr) {
        sseReconnectTimer.current = setTimeout(() => connectSSE(userId, token), 5000);
      }
    };

    xhr.send();
  }, []);

  // Инициализация уведомлений
  useEffect(() => {
    setupNotifications();

    return () => {
      // Отключаем SSE при размонтировании / смене пользователя
      if (sseRef.current) {
        sseRef.current.abort();
        sseRef.current = null;
      }
      clearTimeout(sseReconnectTimer.current);

      if (Notifications && notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (Notifications && responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setupNotifications = async () => {
    try {
      if (!user?.id) return;
      if (user?.role === 'admin') return;

      try {
        const data = await apiCall(`${getApiUrl()}/notifications/${user.id}`);
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
        } else {
          const saved = await AsyncStorage.getItem('@notifications');
          if (saved) setNotifications(JSON.parse(saved));
        }
      } catch (networkError) {
        try {
          const saved = await AsyncStorage.getItem('@notifications');
          if (saved) setNotifications(JSON.parse(saved));
        } catch (storageError) {
          console.error('NotificationContext: ошибка AsyncStorage:', storageError);
        }
      }

      // Подключаем SSE для получения уведомлений в реальном времени
      connectSSE(user.id, authToken);

      // На web и Expo Go push notifications недоступны
      if (typeof window !== 'undefined' || IS_EXPO_GO) return;

      // Запрос разрешения на уведомления
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const token = await Notifications.getExpoPushTokenAsync();
          setExpoPushToken(token.data);
          await AsyncStorage.setItem('@expo_push_token', token.data);
          // Регистрируем токен на сервере
          try {
            await apiCall(`${getApiUrl()}/notifications/${user.id}/push-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ pushToken: token.data }),
            });
          } catch (_) { /* push token registration is optional */ }
        }
      } catch (permissionError) {
        // Push permission is optional
      }

      {
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
          _response => {
            // Здесь можно добавить навигацию
          }
        );
      }
    } catch (error) {
      console.error('Ошибка инициализации уведомлений:', error);
    }
  };

  // Отправить уведомление
  const sendNotification = async (title, body, data = {}) => {
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          badge: 1,
        },
        trigger: { seconds: 1 },
      });
    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
    }
  };

  // Запланировать уведомление
  const scheduleNotification = async (title, body, seconds = 60, data = {}) => {
    if (!Notifications) return;
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

  // Вспомогательная функция для добавления уведомления
  const addNotification = async (notificationData) => {
    try {
      if (!user?.id) return;

      const data = await apiCall(`${getApiUrl()}/notifications/${user.id}`, {
        method: 'POST',
        body: JSON.stringify({ ...notificationData, read: false }),
      });

      if (data.notification) {
        const newNotification = data.notification;
        const updated = [newNotification, ...notifications];
        setNotifications(updated);
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
      } else {
        console.error('Ошибка при сохранении уведомления:', data.error);
      }
    } catch (error) {
      console.error('Ошибка при добавлении уведомления:', error);
    }
  };

  const notifyNewBooking = async (propertyName, guestName, checkIn, checkOut) => {
    await addNotification({
      type: 'newBooking',
      title: 'Новое бронирование',
      message: `Успешно забронирован ${propertyName} с ${checkIn} по ${checkOut}`,
      data: { property: propertyName, guestName, checkIn, checkOut },
    });
  };

  const notifyBookingConfirmed = async (propertyName, checkIn) => {
    await addNotification({
      type: 'bookingConfirmed',
      title: 'Бронирование подтверждено',
      message: `Бронирование ${propertyName} подтверждено на ${checkIn}`,
      data: { property: propertyName, checkIn },
    });
  };

  const notifyBookingCompleted = async (propertyName, rating) => {
    await addNotification({
      type: 'bookingCompleted',
      title: 'Бронирование завершено',
      message: `Ваше бронирование ${propertyName} завершено. Оставьте отзыв!`,
      data: { property: propertyName, rating },
    });
  };

  const notifyBookingCancelled = async (propertyName, refund) => {
    await addNotification({
      type: 'bookingCancelled',
      title: 'Бронирование отменено',
      message: `Бронирование ${propertyName} отменено. Возвращено ${refund} PRB`,
      data: { property: propertyName, refund },
    });
  };

  const notifyPaymentSuccess = async (amount, method) => {
    await addNotification({
      type: 'paymentSuccess',
      title: 'Платёж успешен',
      message: `С вашей карты снято ${amount} PRB через ${method}`,
      data: { amount, method },
    });
  };

  const notifyCashbackReceived = async (amount, bookingId) => {
    await addNotification({
      type: 'cashbackReceived',
      title: 'Кэшбек получен',
      message: `Вы получили ${amount} PRB кэшбека от бронирования`,
      data: { amount, bookingId },
    });
  };

  const notifyTopup = async (amount, method) => {
    await addNotification({
      type: 'topup',
      title: 'Баланс пополнен',
      message: `Баланс пополнен на ${amount} PRB`,
      data: { amount, method },
    });
  };

  const notifyEvent = async (eventName, date) => {
    await sendNotification(
      '🎉 Новое событие',
      `${eventName} начнётся ${date}`,
      { type: 'event', event: eventName }
    );
  };

  const notifyFriendJoined = async (friendName, bonusAmount) => {
    await addNotification({
      type: 'friendJoined',
      title: 'Друг присоединился',
      message: `${friendName} присоединился по вашей ссылке и вы получили ${bonusAmount} PRB`,
      data: { friend: friendName, bonus: bonusAmount },
    });
  };

  const notifyReview = async (propertyName, rating) => {
    await addNotification({
      type: 'newReview',
      title: 'Оставьте отзыв',
      message: `Поделитесь впечатлением о ${propertyName} (${rating}⭐)`,
      data: { property: propertyName, rating },
    });
  };

  const notifyNewReviewPosted = async (propertyName, userName, rating) => {
    await addNotification({
      type: 'reviewNotification',
      title: 'Новый отзыв',
      message: `${userName} оставил отзыв о ${propertyName}: ${rating}⭐`,
      data: { property: propertyName, userName, rating },
    });
  };

  const notifyReviewReply = async (propertyName, ownerReply) => {
    await addNotification({
      type: 'reviewReply',
      title: 'Ответ на ваш отзыв',
      message: `Владелец ${propertyName} ответил на ваш отзыв`,
      data: { property: propertyName, ownerReply },
    });
  };

  const notifyEventCreated = async (eventName, eventType) => {
    await addNotification({
      type: 'eventCreated',
      title: '✅ Событие создано',
      message: `Событие "${eventName}" (${eventType}) успешно создано`,
      data: { event: eventName, eventType },
    });
  };

  const notifyEventUpdated = async (eventName, changes) => {
    await addNotification({
      type: 'eventUpdated',
      title: '✏️ Событие обновлено',
      message: `Событие "${eventName}" было изменено`,
      data: { event: eventName, changes },
    });
  };

  const notifyEventDeleted = async (eventName) => {
    await addNotification({
      type: 'eventDeleted',
      title: '🗑️ Событие удалено',
      message: `Событие "${eventName}" было удалено`,
      data: { event: eventName },
    });
  };

  const notifyUserAdded = async (userName, userEmail) => {
    await addNotification({
      type: 'userAdded',
      title: '➕ Пользователь добавлен',
      message: `Пользователь "${userName}" (${userEmail}) добавлен в систему`,
      data: { user: userName, email: userEmail },
    });
  };

  const notifyUserDeleted = async (userName, userEmail) => {
    await addNotification({
      type: 'userDeleted',
      title: '➖ Пользователь удален',
      message: `Пользователь "${userName}" (${userEmail}) удален из системы`,
      data: { user: userName, email: userEmail },
    });
  };

  const notifyUserUpdated = async (userName, changes) => {
    await addNotification({
      type: 'userUpdated',
      title: '✏️ Пользователь обновлен',
      message: `Данные пользователя "${userName}" были изменены`,
      data: { user: userName, changes },
    });
  };

  const notifyAdminEvent = async (eventType, details) => {
    const messages = {
      new_user: `Новый пользователь: ${details.name}`,
      new_booking: `Новое бронирование от ${details.guestName}`,
      payment: `Платёж получен: ${details.amount} PRB`,
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
    try {
      if (!user?.id) return;

      const data = await apiCall(`${getApiUrl()}/notifications/${user.id}/${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      if (!data.error) {
        const updated = notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        setNotifications(updated);
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
  };

  // Удалить уведомление
  const deleteNotification = async (notificationId) => {
    try {
      if (!user?.id) {
        const updated = notifications.filter(n => n.id !== notificationId);
        setNotifications(updated);
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
        return;
      }

      try {
        await apiCall(`${getApiUrl()}/notifications/${user.id}/${notificationId}`, {
          method: 'DELETE',
          body: JSON.stringify({}),
        });
      } catch (serverError) {
        // Удаляем локально даже при ошибке сервера
      }

      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Ошибка при удалении уведомления:', error);
    }
  };

  // Очистить все уведомления
  const clearAllNotifications = async () => {
    try {
      if (!user?.id) return;

      const data = await apiCall(`${getApiUrl()}/notifications/${user.id}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });

      if (!data.error) {
        setNotifications([]);
        await AsyncStorage.setItem('@notifications', JSON.stringify([]));
      }
    } catch (error) {
      console.error('Ошибка при удалении всех уведомлений:', error);
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

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
        notificationsEnabled: isEnabled,
        toggleNotifications,
        sendNotification,
        scheduleNotification,
        notifyNewBooking,
        notifyBookingConfirmed,
        notifyBookingCompleted,
        notifyBookingCancelled,
        notifyPaymentSuccess,
        notifyCashbackReceived,
        notifyTopup,
        notifyEvent,
        notifyFriendJoined,
        notifyReview,
        notifyNewReviewPosted,
        notifyReviewReply,
        notifyAdminEvent,
        notifyEventCreated,
        notifyEventUpdated,
        notifyEventDeleted,
        notifyUserAdded,
        notifyUserDeleted,
        notifyUserUpdated,
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
