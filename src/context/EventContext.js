import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEvent, updateEvent as updateEventFirebase, deleteEvent as deleteEventFirebase, listenToEvents, getAllEvents } from '../services/DatabaseService';
import { getEventStyleByType, calculateEventStatus } from '../utils/eventStyles';

// Функция для форматирования даты в DD.MM.YYYY
const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  
  // Если уже в формате DD.MM.YYYY, вернуть как есть
  if (typeof dateString === 'string' && dateString.includes('.') && dateString.length === 10) {
    return dateString;
  }
  
  // Если это Date объект или ISO строка
  let date;
  if (typeof dateString === 'string') {
    // Обработка ISO строк (YYYY-MM-DD или YYYY-MM-DDTHH:mm:ss.SSSZ)
    if (dateString.includes('T')) {
      // ISO формат: берём только дату до T
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      return `${day}.${month}.${year}`;
    } else if (dateString.includes('-')) {
      // Формат YYYY-MM-DD
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

const initialMockEvents = [
  {
    id: '1',
    title: 'Аукцион: Картина',
    description: 'Редкая картина от известного художника',
    startBid: 1000,
    status: 'Активный',
    prize: '50 000 PRB',
    startDate: '15.12.2025',
    endDate: '20.12.2025',
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
    startDate: '10.12.2025',
    endDate: '15.12.2025',
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
    startDate: '05.12.2025',
    endDate: '10.12.2025',
    participantsCount: 567,
    participants: 567,
    allowedUsers: 'gold',
    eventType: 'giveaway',
  },
];

export function EventProvider({ children }) {
  const [events, setEvents] = useState(initialMockEvents);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [pendingEventIds, setPendingEventIds] = useState(new Set()); // Отслеживаем события в процессе добавления

  // Функция для нормализации события (добавляет недостающие поля)
  const normalizeEvent = useCallback((event) => {
    // Если отсутствует eventType, используем 'cashback' как более логичный default
    let eventType = event.eventType || 'cashback';
    
    // Гарантируем что prize всегда строка (не undefined, не null)
    const prize = event.prize && typeof event.prize === 'string' ? event.prize.trim() : (event.prize || '');
    
    // Форматируем даты
    const startDate = formatDateToDDMMYYYY(event.startDate) || '';
    const endDate = formatDateToDDMMYYYY(event.endDate) || '';
    
    // 🔄 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Пересчитываем статус на основе текущей даты
    const calculatedStatus = calculateEventStatus(startDate, endDate);
    
    // Преобразуем английский статус в русский для отображения
    let displayStatus = calculatedStatus;
    if (calculatedStatus === 'active') {
      displayStatus = 'Активный';
    } else if (calculatedStatus === 'upcoming') {
      displayStatus = 'Скоро';
    } else if (calculatedStatus === 'ended') {
      displayStatus = 'Завершён';
    }
    
    // Используем расчетный статус, но оставляем резерв на старые значения
    const status = displayStatus || event.status || 'Активный';
    
    // Если отсутствует color, берем из стиля по типу события
    let color = event.color;
    if (!color) {
      const eventStyle = getEventStyleByType(eventType);
      color = eventStyle.color;
    }
    
    // Если отсутствует icon, берем из стиля по типу события
    let icon = event.icon;
    if (!icon) {
      const eventStyle = getEventStyleByType(eventType);
      icon = eventStyle.icon;
    }
    
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
    };
  }, []);

  const saveToStorage = useCallback(async (eventsToSave) => {
    try {
      // Нормализуем события перед сохранением
      const normalizedEvents = eventsToSave.map(e => normalizeEvent(e));
      
      // Ограничиваем количество сохраняемых событий для предотвращения утечек памяти (макс 500)
      const limitedEvents = normalizedEvents.slice(-500);
      
      await AsyncStorage.setItem('admin_events', JSON.stringify(limitedEvents));
    } catch (error) {
      console.error('❌ Ошибка при сохранении событий:', error);
    }
  }, [normalizeEvent]);

  // Загрузить события только один раз при монтировании
  useEffect(() => {
    console.log('🚀 EventContext: инициализация начата');
    let isMounted = true;
    let unsubscribe = null;

    const initializeEvents = async () => {
      try {
        // 1️⃣ Сначала загружаем сохранённые события из AsyncStorage
        const savedEvents = await AsyncStorage.getItem('admin_events');
        if (savedEvents && isMounted) {
          const parsedEvents = JSON.parse(savedEvents);
          // Нормализуем загруженные события для заполнения недостающих полей
          const normalizedSavedEvents = parsedEvents.map(e => normalizeEvent(e));
          console.log('📥 EventContext: загружены события из AsyncStorage:', normalizedSavedEvents.length);
          setEvents(normalizedSavedEvents);
          setIsLoading(false); // Показываем события сразу!
        } else if (isMounted) {
          // Если нет сохраненных событий, используем mock события или пустой массив
          console.log('📥 EventContext: AsyncStorage пуст, используем mock события');
          const normalizedInitialEvents = initialMockEvents.map(e => normalizeEvent(e));
          setEvents(normalizedInitialEvents);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при загрузке из AsyncStorage:', error);
        if (isMounted) {
          // При ошибке используем mock события
          console.log('📥 EventContext: ошибка при загрузке, используем mock события');
          const normalizedInitialEvents = initialMockEvents.map(e => normalizeEvent(e));
          setEvents(normalizedInitialEvents);
          setIsLoading(false);
        }
      }

      // 2️⃣ Затем слушаем Firebase события (не блокируя UI)
      unsubscribe = listenToEvents((firebaseEvents) => {
        if (!isMounted) return;
        
        if (firebaseEvents && Array.isArray(firebaseEvents)) {
          if (firebaseEvents.length > 0) {
            // Нормализуем Firebase события
            const normalizedFirebaseEvents = firebaseEvents.map(e => normalizeEvent(e));
            
            // Проверяем на NaN значения
            normalizedFirebaseEvents.forEach(e => {
              if (isNaN(e.participants)) {
                e.participants = 0;
              }
            });
            
            // Обновляем стейт
            setEvents((prevEvents) => {
              // Сохраняем локальные события (те, которые начинаются с local_)
              const localOnlyEvents = prevEvents.filter(e => 
                (typeof e.id === 'string' && e.id.startsWith('local_'))
              );
              
              // Фильтруем Firebase события: исключаем только те локальные события,
              // которые уже существуют с тем же названием
              const uniqueFirebaseEvents = normalizedFirebaseEvents.filter(fbEvent => {
                // Ищем только среди локальных событий (с префиксом local_)
                const isDuplicate = localOnlyEvents.some(localEvent =>
                  localEvent.title === fbEvent.title &&
                  localEvent.description === fbEvent.description
                );
                return !isDuplicate;
              });
              
              // Объединяем: уникальные Firebase события + локальные события
              const combined = [...uniqueFirebaseEvents, ...localOnlyEvents];
              
              // Сохраняем объединённый результат
              saveToStorage(combined);
              setFirebaseInitialized(true);
              
              // Удаляем ID события из pendingEventIds если оно успешно синхронизировано
              setPendingEventIds((prevPending) => {
                const newPending = new Set(prevPending);
                uniqueFirebaseEvents.forEach(e => newPending.delete(e.id));
                return newPending;
              });
              
              return combined;
            });
          } else {
            // ⚠️ ВАЖНО: Если сервер вернул пустой массив, НЕ перезаписываем события!
            // Это может быть ошибка сервера или он недоступен
            console.warn('⚠️ EventContext: Firebase вернул пустой массив - сохраняем текущие события');
            setFirebaseInitialized(true);
            // Продолжаем использовать существующие события из prevEvents
          }
        }
      });
    };

    initializeEvents();
    console.log('🚀 EventContext: инициализация вызвана');

    // Очистка
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [saveToStorage, normalizeEvent]);

  const addEvent = async (event) => {
    try {
      console.log('📝 EventContext: Создаю событие:', event);
      
      // Преобразуем status один раз для использования везде
      const normalizedStatus = event.status === 'active' ? 'Активный' : 
                              event.status === 'ended' ? 'Завершён' : 'Скоро';
      
      // Получаем стиль события по типу (используем переданный тип или cashback)
      const eventType = event.eventType || 'cashback';
      const eventStyle = getEventStyleByType(eventType);
      
      // Всегда создаём локальный ID сначала (для немедленного отображения)
      const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Локально добавляем событие сразу с нормализованными данными
      const newLocalEvent = normalizeEvent({
        id: tempId,
        title: event.title,
        description: event.description,
        status: normalizedStatus, // Используем преобразованный статус
        icon: eventStyle.icon, // Берём иконку по типу события
        color: eventStyle.color, // Берём цвет по типу события
        eventType: eventType, // Сохраняем тип события
        participants: event.participantsCount || 0, // Используем participants вместо participantsCount
        prize: event.prize || '', // Гарантируем, что prize всегда существует
        reward: event.reward || null,
        startBid: event.startBid || null,
        startDate: event.startDate || '', // Дата начала события
        endDate: event.endDate || '', // Дата окончания события
        allowedUsers: event.allowedUsers || 'all', // Добавляем значение по умолчанию
        _local: true, // Отмечаем как локальное
      });
      
      // Показываем событие немедленно
      setEvents((prevEvents) => {
        const updatedEvents = [...prevEvents, newLocalEvent];
        console.log('✅ EventContext: обновляю стейт, было:', prevEvents.length, 'стало:', updatedEvents.length);
        console.log('✅ EventContext: новое событие:', { id: newLocalEvent.id, title: newLocalEvent.title, status: newLocalEvent.status, eventType: newLocalEvent.eventType, color: newLocalEvent.color, prize: newLocalEvent.prize });
        saveToStorage(updatedEvents);
        console.log('✅ EventContext: Событие добавлено в стейт, всего событий:', updatedEvents.length);
        return updatedEvents;
      });
      
      // Отслеживаем, что это событие в процессе синхронизации
      setPendingEventIds((prev) => new Set([...prev, tempId]));
      
      console.log('✅ EventContext: Событие добавлено локально с ID:', tempId);
      
      // Теперь пытаемся сохранить в БД (в фоне, не ждём)
      const eventData = {
        title: event.title,
        description: event.description || '',
        prize: event.prize || '',
        startDate: event.startDate || '',
        endDate: event.endDate || '',
        allowedUsers: event.allowedUsers || 'all',
        status: event.status || 'active',
        eventType: eventType || 'cashback',
      };
      
      console.log('📤 EventContext: отправляю на сервер:', { title: eventData.title, eventType: eventData.eventType, prize: eventData.prize, startDate: eventData.startDate, endDate: eventData.endDate, status: eventData.status });
      
      // Пытаемся сохранить на сервер без ожидания
      createEvent(eventData)
        .then((response) => {
          console.log('✅ EventContext: Событие создано на сервере с ID:', response.id);
          // Обновляем локальное событие с реальным ID с сервера
          setEvents((prevEvents) => {
            const updated = prevEvents.map((e) =>
              e.id === tempId ? { ...e, id: response.id, _local: false } : e
            );
            saveToStorage(updated);
            console.log('✅ EventContext: Событие обновлено с сервера ID:', response.id);
            return updated;
          });
          // Удаляем из pending
          setPendingEventIds((prev) => {
            const newPending = new Set(prev);
            newPending.delete(tempId);
            return newPending;
          });
        })
        .catch((error) => {
          console.warn('⚠️ EventContext: Ошибка сервера:', error.message);
          console.warn('⚠️ EventContext: Событие остаётся локальным с ID:', tempId);
          // Событие остаётся локальным с префиксом local_
        });
      
      return newLocalEvent;
    } catch (error) {
      console.error('❌ EventContext: Ошибка при создании события:', error);
      throw error;
    }
  };

  const updateEvent = async (id, updatedEvent) => {
    try {
      // Валидация входных данных
      if (!id || !updatedEvent) {
        console.warn('⚠️ EventContext: updateEvent вызвана с пустыми данными:', { id, updatedEvent });
        return;
      }
      
      // Нормализуем событие перед обновлением
      const normalizedEvent = normalizeEvent(updatedEvent);
      
      // Преобразуем status один раз
      const normalizedStatus = normalizedEvent.status || 'Скоро';
      
      // Получаем стиль события по типу
      const eventType = normalizedEvent.eventType || 'cashback';
      const eventStyle = getEventStyleByType(eventType);
      
      // Локально обновляем СРАЗУ (без ожидания Firebase)
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
      
      // Обновляем на сервере в фоне (без блокирования)
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
      };
      
      console.log('🔄 EventContext: updateEvent отправляю на сервер:', { id, participantIds: eventData.participantIds, participants: eventData.participants });
      
      // Отправляем на сервер асинхронно
      updateEventFirebase(id, eventData)
        .catch((error) => console.warn('⚠️ Ошибка обновления на сервере:', error));
    } catch (error) {
      console.error('Ошибка при обновлении события:', error);
    }
  };

  const deleteEvent = async (id) => {
    try {
      console.log('🗑️ EventContext: начинаю удаление события:', id);
      
      if (!id) {
        throw new Error('ID события не указан');
      }
      
      // Удаляем локально сразу (не ждём Firebase)
      let deletedEvent = null;
      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.filter((e) => {
          const shouldKeep = e.id !== id;
          if (!shouldKeep) {
            deletedEvent = e;
            console.log('🗑️ EventContext: удаляю событие из стейта:', id, 'название:', e.title);
          }
          return shouldKeep;
        });
        
        if (deletedEvent) {
          // Сохраняем в AsyncStorage
          saveToStorage(updatedEvents).catch(err => {
            console.warn('⚠️ EventContext: ошибка при сохранении в AsyncStorage:', err);
          });
          console.log('✅ EventContext: событие удалено локально, осталось:', updatedEvents.length);
        } else {
          console.warn('⚠️ EventContext: событие не найдено для удаления:', id);
        }
        
        return updatedEvents;
      });

      // Затем пытаемся удалить из Firebase (с fallback)
      try {
        const deleteResult = await deleteEventFirebase(id);
        console.log('✅ EventContext: событие удалено из Firebase:', id, 'результат:', deleteResult);
        return deleteResult;
      } catch (firebaseError) {
        console.warn('⚠️ EventContext: Firebase ошибка при удалении (событие осталось локально удаленным):', firebaseError.message);
        // Продолжаем даже если сервер ошибка - событие уже удалено локально
        return true;
      }
    } catch (error) {
      console.error('❌ EventContext: Критическая ошибка при удалении события:', error);
      throw new Error(`Ошибка удаления события: ${error.message}`);
    }
  };

  // Функция для принудительного обновления событий (например, при фокусе на экран)
  const refreshEvents = async () => {
    try {
      const freshEvents = await getAllEvents();
      if (Array.isArray(freshEvents) && freshEvents.length > 0) {
        const normalizedEvents = freshEvents.map(e => normalizeEvent(e));
        setEvents(normalizedEvents);
        saveToStorage(normalizedEvents);
      }
    } catch (error) {
      console.error('❌ EventContext: Ошибка при обновлении событий:', error);
    }
  };

  const value = {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents,
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
