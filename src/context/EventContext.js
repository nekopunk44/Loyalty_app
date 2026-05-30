import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEvent, updateEvent as updateEventAPI, deleteEvent as deleteEventAPI, listenToEvents, getAllEvents } from '../services/DatabaseService';
import { apiCall } from '../utils/api';
import { getApiUrl } from '../utils/apiUrl';
import { getEventStyleByType, calculateEventStatus } from '../utils/eventStyles';

// Функция для форматирования даты в DD.MM.YYYY
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';

  if (typeof dateString === 'string' && dateString.includes('.') && dateString.length === 10) {
    return dateString;
  }

  let date;
  if (typeof dateString === 'string') {
    if (dateString.includes('T')) {
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      return `${day}.${month}.${year}`;
    } else if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      return `${day}.${month}.${year}`;
    }
    date = new Date(dateString);
  } else {
    date = dateString;
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const EventContext = createContext();

const getUpcomingDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const initialMockEvents = [
  {
    id: '1',
    title: 'Аукцион: Картина',
    description: 'Редкая картина от известного художника',
    startBid: 1000,
    status: 'Активный',
    prize: '50 000 PRB',
    startDate: getUpcomingDate(5),
    endDate: getUpcomingDate(10),
    participantsCount: 23,
    participants: 23,
    allowedUsers: 'all',
    eventType: 'auction',
  },
  {
    id: '2',
    title: 'Двойной кешбек',
    description: '2x кешбека на все покупки',
    status: 'Активный',
    startDate: getUpcomingDate(1),
    endDate: getUpcomingDate(7),
    participantsCount: 1243,
    participants: 1243,
    allowedUsers: 'platinum',
    eventType: 'cashback',
  },
  {
    id: '3',
    title: 'Розыгрыш подарков',
    description: 'Автоматическое участие для активных пользователей',
    prize: 'Путешествие в Европу',
    status: 'Завершён',
    startDate: getUpcomingDate(-10),
    endDate: getUpcomingDate(-5),
    participantsCount: 567,
    participants: 567,
    allowedUsers: 'gold',
    eventType: 'giveaway',
  },
];

export function EventProvider({ children }) {
  const [events, setEvents] = useState(initialMockEvents);
  const [isLoading, setIsLoading] = useState(true);
  const [_apiInitialized, setApiInitialized] = useState(false);
  const [_pendingEventIds, setPendingEventIds] = useState(new Set());

  const normalizeEvent = useCallback((event) => {
    const eventType = event.eventType || 'cashback';
    const prize = event.prize && typeof event.prize === 'string' ? event.prize.trim() : (event.prize || '');
    const startDate = formatDateToDDMMYYYY(event.startDate) || '';
    const endDate = formatDateToDDMMYYYY(event.endDate) || '';
    const calculatedStatus = calculateEventStatus(startDate, endDate);

    let displayStatus = calculatedStatus;
    if (calculatedStatus === 'active') {
      displayStatus = 'Активный';
    } else if (calculatedStatus === 'upcoming') {
      displayStatus = 'Скоро';
    } else if (calculatedStatus === 'ended') {
      displayStatus = 'Завершён';
    }

    const status = displayStatus || event.status || 'Активный';

    let color = event.color;
    if (!color) {
      const eventStyle = getEventStyleByType(eventType);
      color = eventStyle.color;
    }

    let icon = event.icon;
    if (!icon) {
      const eventStyle = getEventStyleByType(eventType);
      icon = eventStyle.icon;
    }

    const cashbackBoostPercent = parseFloat(event.cashbackBoostPercent) || 0;
    const discountPercent = parseFloat(event.discountPercent) || 0;
    const targetUserIds = Array.isArray(event.targetUserIds)
      ? event.targetUserIds.filter((v) => typeof v === 'string')
      : [];

    const startBid          = event.startBid != null ? parseFloat(event.startBid) : null;
    const minBidIncrement   = event.minBidIncrement != null ? parseFloat(event.minBidIncrement) : 100;
    const currentBid        = event.currentBid != null ? parseFloat(event.currentBid) : null;
    const currentBidUserId  = event.currentBidUserId || null;
    const winnerUserId      = event.winnerUserId || null;
    const closedAt          = event.closedAt || null;

    return {
      ...event,
      eventType,
      prize,
      status,
      color,
      icon,
      startDate,
      endDate,
      allowedUsers: event.allowedUsers || 'all',
      participants: event.participants !== undefined ? event.participants : (event.participantsCount || 0),
      participantIds: Array.isArray(event.participantIds) ? event.participantIds : [],
      cashbackBoostPercent,
      discountPercent,
      targetUserIds,
      startBid,
      minBidIncrement,
      currentBid,
      currentBidUserId,
      winnerUserId,
      closedAt,
    };
  }, []);

  const saveToStorage = useCallback(async (eventsToSave) => {
    try {
      const normalizedEvents = eventsToSave.map(e => normalizeEvent(e));
      const limitedEvents = normalizedEvents.slice(-500);
      await AsyncStorage.setItem('admin_events', JSON.stringify(limitedEvents));
    } catch (error) {
      console.error('Ошибка при сохранении событий:', error);
    }
  }, [normalizeEvent]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;

    const initializeEvents = async () => {
      try {
        const savedEvents = await AsyncStorage.getItem('admin_events');
        if (savedEvents && isMounted) {
          const parsedEvents = JSON.parse(savedEvents);
          const normalizedSavedEvents = parsedEvents.map(e => normalizeEvent(e));
          setEvents(normalizedSavedEvents);
          setIsLoading(false);
        } else if (isMounted) {
          const normalizedInitialEvents = initialMockEvents.map(e => normalizeEvent(e));
          setEvents(normalizedInitialEvents);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при загрузке из AsyncStorage:', error);
        if (isMounted) {
          const normalizedInitialEvents = initialMockEvents.map(e => normalizeEvent(e));
          setEvents(normalizedInitialEvents);
          setIsLoading(false);
        }
      }

      unsubscribe = listenToEvents((serverEvents) => {
        if (!isMounted) return;

        if (serverEvents && Array.isArray(serverEvents)) {
          if (serverEvents.length > 0) {
            const normalizedServerEvents = serverEvents.map(e => normalizeEvent(e));

            normalizedServerEvents.forEach(e => {
              if (isNaN(e.participants)) {
                e.participants = 0;
              }
            });

            setEvents((prevEvents) => {
              const localOnlyEvents = prevEvents.filter(e =>
                (typeof e.id === 'string' && e.id.startsWith('local_'))
              );

              const uniqueServerEvents = normalizedServerEvents.filter(serverEvent => {
                const isDuplicate = localOnlyEvents.some(localEvent =>
                  localEvent.title === serverEvent.title &&
                  localEvent.description === serverEvent.description
                );
                return !isDuplicate;
              });

              const combined = [...uniqueServerEvents, ...localOnlyEvents];

              saveToStorage(combined);
              setApiInitialized(true);

              setPendingEventIds((prevPending) => {
                const newPending = new Set(prevPending);
                uniqueServerEvents.forEach(e => newPending.delete(e.id));
                return newPending;
              });

              return combined;
            });
          } else {
            setApiInitialized(true);
          }
        }
      });
    };

    initializeEvents();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [saveToStorage, normalizeEvent]);

  const addEvent = async (event) => {
    try {
      const normalizedStatus = event.status === 'active' ? 'Активный' :
                              event.status === 'ended' ? 'Завершён' : 'Скоро';

      const eventType = event.eventType || 'cashback';
      const eventStyle = getEventStyleByType(eventType);
      const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newLocalEvent = normalizeEvent({
        id: tempId,
        title: event.title,
        description: event.description,
        status: normalizedStatus,
        icon: eventStyle.icon,
        color: eventStyle.color,
        eventType: eventType,
        participants: event.participantsCount || 0,
        prize: event.prize || '',
        reward: event.reward || null,
        startBid: event.startBid || null,
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        allowedUsers: event.allowedUsers || 'all',
        cashbackBoostPercent: event.cashbackBoostPercent || 0,
        discountPercent: event.discountPercent || 0,
        targetUserIds: Array.isArray(event.targetUserIds) ? event.targetUserIds : [],
        _local: true,
      });

      setEvents((prevEvents) => {
        const updatedEvents = [...prevEvents, newLocalEvent];
        saveToStorage(updatedEvents);
        return updatedEvents;
      });

      setPendingEventIds((prev) => new Set([...prev, tempId]));

      const eventData = {
        title: event.title,
        description: event.description || '',
        prize: event.prize || '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        allowedUsers: event.allowedUsers || 'all',
        status: event.status || 'active',
        eventType: eventType || 'cashback',
        cashbackBoostPercent: parseFloat(event.cashbackBoostPercent) || 0,
        discountPercent: parseFloat(event.discountPercent) || 0,
        targetUserIds: Array.isArray(event.targetUserIds) ? event.targetUserIds : [],
        startBid: event.startBid != null ? parseFloat(event.startBid) : undefined,
        minBidIncrement: event.minBidIncrement != null ? parseFloat(event.minBidIncrement) : undefined,
      };

      createEvent(eventData)
        .then((response) => {
          setEvents((prevEvents) => {
            const updated = prevEvents.map((e) =>
              e.id === tempId ? { ...e, id: response.id, _local: false } : e
            );
            saveToStorage(updated);
            return updated;
          });
          setPendingEventIds((prev) => {
            const newPending = new Set(prev);
            newPending.delete(tempId);
            return newPending;
          });
        })
        .catch((_error) => {
          // Событие остаётся локальным с префиксом local_
        });

      return newLocalEvent;
    } catch (error) {
      console.error('EventContext: Ошибка при создании события:', error);
      throw error;
    }
  };

  const updateEvent = async (id, updatedEvent) => {
    try {
      if (!id || !updatedEvent) return;

      const normalizedEvent = normalizeEvent(updatedEvent);
      const normalizedStatus = normalizedEvent.status || 'Скоро';
      const eventType = normalizedEvent.eventType || 'cashback';
      const eventStyle = getEventStyleByType(eventType);

      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.map((e) =>
          e.id === id ? normalizeEvent({
            ...e,
            ...updatedEvent,
            status: normalizedStatus,
            eventType: eventType,
            icon: eventStyle.icon,
            color: eventStyle.color,
            prize: updatedEvent.prize || '',
          }) : e
        );
        saveToStorage(updatedEvents);
        return updatedEvents;
      });

      const eventData = {
        title: updatedEvent.title,
        description: updatedEvent.description || '',
        prize: updatedEvent.prize || '',
        startDate: updatedEvent.startDate || '',
        endDate: updatedEvent.endDate || '',
        allowedUsers: updatedEvent.allowedUsers || 'all',
        status: updatedEvent.status || 'active',
        eventType: eventType || 'cashback',
        participantIds: Array.isArray(updatedEvent.participantIds) ? updatedEvent.participantIds : [],
        participants: updatedEvent.participants !== undefined ? updatedEvent.participants : 0,
        cashbackBoostPercent: parseFloat(updatedEvent.cashbackBoostPercent) || 0,
        discountPercent: parseFloat(updatedEvent.discountPercent) || 0,
        targetUserIds: Array.isArray(updatedEvent.targetUserIds) ? updatedEvent.targetUserIds : [],
        startBid: updatedEvent.startBid != null ? parseFloat(updatedEvent.startBid) : undefined,
        minBidIncrement: updatedEvent.minBidIncrement != null ? parseFloat(updatedEvent.minBidIncrement) : undefined,
      };

      updateEventAPI(id, eventData)
        .catch((error) => console.error('Ошибка обновления на сервере:', error));
    } catch (error) {
      console.error('Ошибка при обновлении события:', error);
    }
  };

  const deleteEvent = async (id) => {
    try {
      if (!id) {
        throw new Error('ID события не указан');
      }

      let deletedEvent = null;
      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.filter((e) => {
          const shouldKeep = e.id !== id;
          if (!shouldKeep) deletedEvent = e;
          return shouldKeep;
        });

        if (deletedEvent) {
          saveToStorage(updatedEvents).catch(err => {
            console.error('EventContext: ошибка при сохранении в AsyncStorage:', err);
          });
        }

        return updatedEvents;
      });

      try {
        const deleteResult = await deleteEventAPI(id);
        return deleteResult;
      } catch (apiError) {
        // Событие уже удалено локально
        return true;
      }
    } catch (error) {
      console.error('EventContext: Критическая ошибка при удалении события:', error);
      throw new Error(`Ошибка удаления события: ${error.message}`);
    }
  };

  // Локальный мерж события без обращения к серверу. Нужен, когда сервер уже
  // авторитетно обновил запись (например, /events/:id/join), и нам осталось
  // только синхронизировать UI — без админского PATCH /events/:id.
  const applyEventLocal = (id, updatedEvent) => {
    if (!id || !updatedEvent) return;
    setEvents((prevEvents) => {
      const updatedEvents = prevEvents.map((e) =>
        e.id === id ? normalizeEvent({ ...e, ...updatedEvent }) : e
      );
      saveToStorage(updatedEvents);
      return updatedEvents;
    });
  };

  /**
   * Поставить ставку на аукционе. Возвращает { success, bid, currentBid } при удаче
   * либо { success: false, code, error, ...extra } при ошибке валидации.
   *
   * Прямой fetch (а не apiPost), чтобы сохранить структуру ошибки сервера —
   * apiCall теряет поле `code` и доп. поля при non-OK ответе, а они нам нужны
   * для отображения причины (insufficient_available → показываем deficit и т.д.).
   */
  const placeBid = async (eventId, amount) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const response = await fetch(`${getApiUrl()}/events/${eventId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          code:    data.code || 'unknown',
          error:   data.error || `HTTP ${response.status}`,
          ...data,
        };
      }

      // Денормализуем currentBid на локальной копии события для мгновенного отклика.
      if (data.event) {
        applyEventLocal(eventId, data.event);
      } else if (data.currentBid != null) {
        applyEventLocal(eventId, { currentBid: data.currentBid, currentBidUserId: data.currentBidUserId });
      }

      return { success: true, ...data };
    } catch (error) {
      return { success: false, code: 'network_error', error: error.message };
    }
  };

  /**
   * Получить историю ставок аукциона.
   */
  const getAuctionBids = async (eventId) => {
    const data = await apiCall(`${getApiUrl()}/events/${eventId}/bids`);
    if (!data.success) return [];
    return Array.isArray(data.bids) ? data.bids : [];
  };

  const refreshEvents = async (options = {}) => {
    const { personalized = false, k } = options;
    try {
      const result = await getAllEvents(personalized ? { personalized: true, k } : {});
      const freshEvents = Array.isArray(result) ? result : (result?.events || []);
      const meta = Array.isArray(result)
        ? { personalized: false }
        : {
            personalized: Boolean(result?.personalized),
            reason: result?.reason,
            fallbackUsed: Boolean(result?.fallbackUsed),
          };
      if (Array.isArray(freshEvents) && freshEvents.length > 0) {
        const normalizedEvents = freshEvents.map(e => normalizeEvent(e));
        setEvents(normalizedEvents);
        saveToStorage(normalizedEvents);
      }
      return meta;
    } catch (error) {
      console.error('EventContext: Ошибка при обновлении событий:', error);
      return { personalized: false, reason: 'network_error' };
    }
  };

  const value = {
    events,
    isLoading,
    addEvent,
    updateEvent,
    applyEventLocal,
    deleteEvent,
    refreshEvents,
    placeBid,
    getAuctionBids,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents должен использоваться внутри EventProvider');
  }
  return context;
}
