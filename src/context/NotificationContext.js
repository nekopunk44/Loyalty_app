import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Инициализация уведомлений
  useEffect(() => {
    setupNotifications();

    return () => {
      // На web этих subscriptions нет, поэтому проверяем
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  const getApiUrl = () => {
    // На web используем localhost
    if (typeof window !== 'undefined') {
      return 'http://localhost:5002/api';
    }
    // На мобильных платформах
    return 'http://localhost:5002/api';
  };

  const setupNotifications = async () => {
    try {
      // Если пользователь не авторизован, ничего не загружаем
      if (!user?.id) {
        console.log('ℹ️ Пользователь не авторизован, уведомления не загружаются');
        return;
      }

      // ✅ Загружаем уведомления с сервера
      console.log('📡 Загружаем уведомления с сервера для userId:', user.id);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/notifications/${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.notifications) {
          console.log('✅ Уведомления загружены с сервера:', data.notifications.length, 'Типы:', data.notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));
          setNotifications(data.notifications);
        }
      } else {
        console.warn('⚠️ Ошибка при загрузке уведомлений с сервера:', response.status);
        // Fallback на AsyncStorage если сервер недоступен
        const saved = await AsyncStorage.getItem('@notifications');
        if (saved) {
          console.log('💾 Используем уведомления из AsyncStorage');
          setNotifications(JSON.parse(saved));
        }
      }

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

  // Вспомогательная функция для добавления уведомления
  const addNotification = async (notificationData) => {
    try {
      if (!user?.id) {
        console.warn('⚠️ Невозможно добавить уведомление: пользователь не авторизован');
        return;
      }

      const apiUrl = getApiUrl();
      
      console.log('🔔 addNotification: Отправляем уведомление с типом:', notificationData.type, 'Данные:', notificationData);
      
      // Сохраняем на сервер
      const response = await fetch(`${apiUrl}/notifications/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notificationData,
          read: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newNotification = data.notification;
        console.log('📌 addNotification: Новое уведомление добавлено на сервер с типом:', newNotification.type, 'Данные:', newNotification);
        
        // Обновляем локальное состояние
        const updated = [newNotification, ...notifications];
        setNotifications(updated);
        
        // Сохраняем локально для fallback
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
        console.log('✅ Уведомление добавлено:', notificationData.message);
      } else {
        console.error('❌ Ошибка при сохранении уведомления на сервер:', response.status);
      }
    } catch (error) {
      console.error('❌ Ошибка при добавлении уведомления:', error);
    }
  };

  // Отправить уведомление о новом бронировании
  const notifyNewBooking = async (propertyName, guestName, checkIn, checkOut) => {
    console.log('🔔 notifyNewBooking called:', { propertyName, guestName, checkIn, checkOut });
    await addNotification({
      type: 'newBooking',
      title: 'Новое бронирование',
      message: `Успешно забронирован ${propertyName} с ${checkIn} по ${checkOut}`,
      data: { property: propertyName, guestName, checkIn, checkOut },
    });
  };

  // Уведомление о подтверждении бронирования
  const notifyBookingConfirmed = async (propertyName, checkIn) => {
    await addNotification({
      type: 'bookingConfirmed',
      title: 'Бронирование подтверждено',
      message: `Бронирование ${propertyName} подтверждено на ${checkIn}`,
      data: { property: propertyName, checkIn },
    });
  };

  // Уведомление о завершении бронирования
  const notifyBookingCompleted = async (propertyName, rating) => {
    await addNotification({
      type: 'bookingCompleted',
      title: 'Бронирование завершено',
      message: `Ваше бронирование ${propertyName} завершено. Оставьте отзыв!`,
      data: { property: propertyName, rating },
    });
  };

  // Уведомление об отмене бронирования
  const notifyBookingCancelled = async (propertyName, refund) => {
    await addNotification({
      type: 'bookingCancelled',
      title: 'Бронирование отменено',
      message: `Бронирование ${propertyName} отменено. Возвращено ${refund} PRB`,
      data: { property: propertyName, refund },
    });
  };

  // Отправить уведомление о платеже
  const notifyPaymentSuccess = async (amount, method) => {
    await addNotification({
      type: 'paymentSuccess',
      title: 'Платёж успешен',
      message: `С вашей карты снято ${amount} PRB через ${method}`,
      data: { amount, method },
    });
  };

  // Уведомление о полученном кэшбеке
  const notifyCashbackReceived = async (amount, bookingId) => {
    await addNotification({
      type: 'cashbackReceived',
      title: 'Кэшбек получен',
      message: `Вы получили ${amount} PRB кэшбека от бронирования`,
      data: { amount, bookingId },
    });
  };

  // Уведомление о пополнении баланса
  const notifyTopup = async (amount, method) => {
    await addNotification({
      type: 'topup',
      title: 'Баланс пополнен',
      message: `Баланс пополнен на ${amount} PRB`,
      data: { amount, method },
    });
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
    const newNotification = {
      id: Date.now().toString(),
      type: 'referralBonus',
      title: 'Вы получили бонус',
      message: `${friendName} присоединился и вы получили ${bonus} PRB`,
      data: { friend: friendName, bonus },
      createdAt: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    await AsyncStorage.setItem('@notifications', JSON.stringify([newNotification, ...notifications]));
  };

  // Уведомление о том, что друг присоединился
  const notifyFriendJoined = async (friendName, bonusAmount) => {
    await addNotification({
      type: 'friendJoined',
      title: 'Друг присоединился',
      message: `${friendName} присоединился по вашей ссылке и вы получили ${bonusAmount} PRB`,
      data: { friend: friendName, bonus: bonusAmount },
    });
  };

  // Отправить уведомление об отзыве
  const notifyReview = async (propertyName, rating) => {
    await addNotification({
      type: 'newReview',
      title: 'Оставьте отзыв',
      message: `Поделитесь впечатлением о ${propertyName} (${rating}⭐)`,
      data: { property: propertyName, rating },
    });
  };

  // Уведомление о новом отзыве от пользователя
  const notifyNewReviewPosted = async (propertyName, userName, rating) => {
    await addNotification({
      type: 'reviewNotification',
      title: 'Новый отзыв',
      message: `${userName} оставил отзыв о ${propertyName}: ${rating}⭐`,
      data: { property: propertyName, userName, rating },
    });
  };

  // Уведомление об ответе на отзыв
  const notifyReviewReply = async (propertyName, ownerReply) => {
    await addNotification({
      type: 'reviewReply',
      title: 'Ответ на ваш отзыв',
      message: `Владелец ${propertyName} ответил на ваш отзыв`,
      data: { property: propertyName, ownerReply },
    });
  };

  // Уведомление админу о создании события
  const notifyEventCreated = async (eventName, eventType) => {
    await addNotification({
      type: 'eventCreated',
      title: '✅ Событие создано',
      message: `Событие "${eventName}" (${eventType}) успешно создано`,
      data: { event: eventName, eventType },
    });
  };

  // Уведомление админу об обновлении события
  const notifyEventUpdated = async (eventName, changes) => {
    await addNotification({
      type: 'eventUpdated',
      title: '✏️ Событие обновлено',
      message: `Событие "${eventName}" было изменено`,
      data: { event: eventName, changes },
    });
  };

  // Уведомление админу об удалении события
  const notifyEventDeleted = async (eventName) => {
    await addNotification({
      type: 'eventDeleted',
      title: '🗑️ Событие удалено',
      message: `Событие "${eventName}" было удалено`,
      data: { event: eventName },
    });
  };

  // Уведомление админу о добавлении пользователя
  const notifyUserAdded = async (userName, userEmail) => {
    await addNotification({
      type: 'userAdded',
      title: '➕ Пользователь добавлен',
      message: `Пользователь "${userName}" (${userEmail}) добавлен в систему`,
      data: { user: userName, email: userEmail },
    });
  };

  // Уведомление админу об удалении пользователя
  const notifyUserDeleted = async (userName, userEmail) => {
    await addNotification({
      type: 'userDeleted',
      title: '➖ Пользователь удален',
      message: `Пользователь "${userName}" (${userEmail}) удален из системы`,
      data: { user: userName, email: userEmail },
    });
  };

  // Уведомление админу об обновлении пользователя
  const notifyUserUpdated = async (userName, changes) => {
    await addNotification({
      type: 'userUpdated',
      title: '✏️ Пользователь обновлен',
      message: `Данные пользователя "${userName}" были изменены`,
      data: { user: userName, changes },
    });
  };

  // Отправить уведомление админу о событии
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

      const apiUrl = getApiUrl();
      
      // Обновляем на сервере
      const response = await fetch(`${apiUrl}/notifications/${user.id}/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Обновляем локальное состояние
        const updated = notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        setNotifications(updated);
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('❌ Ошибка при отметке уведомления как прочитанного:', error);
    }
  };

  // Удалить уведомление
  const deleteNotification = async (notificationId) => {
    try {
      if (!user?.id) {
        // Если пользователь не авторизован, удаляем локально
        const updated = notifications.filter(n => n.id !== notificationId);
        setNotifications(updated);
        await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
        return;
      }

      const apiUrl = getApiUrl();
      
      try {
        // Пытаемся удалить на сервере
        const response = await fetch(`${apiUrl}/notifications/${user.id}/${notificationId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log('✅ Уведомление удалено с сервера:', notificationId);
        } else {
          console.warn('⚠️ Ошибка при удалении на сервере:', response.status);
        }
      } catch (serverError) {
        console.warn('⚠️ Не удалось подключиться к серверу для удаления уведомления:', serverError.message);
      }

      // В любом случае удаляем локально
      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      await AsyncStorage.setItem('@notifications', JSON.stringify(updated));
      console.log('✅ Уведомление удалено локально:', notificationId);
    } catch (error) {
      console.error('❌ Ошибка при удалении уведомления:', error);
    }
  };

  // Очистить все уведомления
  const clearAllNotifications = async () => {
    try {
      if (!user?.id) return;

      const apiUrl = getApiUrl();
      
      // Удаляем все на сервере
      const response = await fetch(`${apiUrl}/notifications/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Очищаем локальное состояние
        setNotifications([]);
        await AsyncStorage.setItem('@notifications', JSON.stringify([]));
      }
    } catch (error) {
      console.error('❌ Ошибка при удалении всех уведомлений:', error);
    }
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
        notifyReferral,
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
