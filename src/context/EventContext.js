import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createEvent, updateEvent as updateEventFirebase, deleteEvent as deleteEventFirebase, listenToEvents } from '../services/DatabaseService';
import { getEventStyleByType } from '../utils/eventStyles';

const EventContext = createContext();

const initialMockEvents = [
  {
    id: '1',
    title: 'Аукцион: Картина',
    description: 'Редкая картина от известного художника',
    startBid: 1000,
    status: 'Активный',
    prize: '50 000 ₽',
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

  const saveToStorage = useCallback(async (eventsToSave) => {
    try {
      console.log('💾 EventContext: сохраняю события в AsyncStorage:', eventsToSave.length);
      console.log('💾 EventContext: события для сохранения:', eventsToSave.map(e => ({ id: e.id, title: e.title, status: e.status })));
      await AsyncStorage.setItem('admin_events', JSON.stringify(eventsToSave));
      console.log('✅ EventContext: события сохранены в AsyncStorage успешно');
    } catch (error) {
      console.error('❌ Ошибка при сохранении событий:', error);
    }
  }, []);

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
          console.log('📥 EventContext: загружены события из AsyncStorage:', parsedEvents.length);
          setEvents(parsedEvents);
          setIsLoading(false); // Показываем события сразу!
        } else if (isMounted) {
          // Если нет сохраненных событий, используем mock события или пустой массив
          console.log('📥 EventContext: AsyncStorage пуст, используем mock события');
          setEvents(initialMockEvents);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Ошибка при загрузке из AsyncStorage:', error);
        if (isMounted) {
          // При ошибке используем mock события
          console.log('📥 EventContext: ошибка при загрузке, используем mock события');
          setEvents(initialMockEvents);
          setIsLoading(false);
        }
      }

      // 2️⃣ Затем слушаем Firebase события (не блокируя UI)
      unsubscribe = listenToEvents((firebaseEvents) => {
        if (!isMounted) return;
        
        if (firebaseEvents && Array.isArray(firebaseEvents)) {
          if (firebaseEvents.length > 0) {
            console.log('📬 EventContext: получены события из Firebase:', firebaseEvents.length);
            
            // Проверяем на NaN значения
            firebaseEvents.forEach(e => {
              if (isNaN(e.participants)) {
                console.warn('⚠️ EventContext: Firebase событие имеет NaN для participants:', e.title, e.participants);
                e.participants = 0;
              }
            });
            
            // Обновляем стейт
            setEvents((prevEvents) => {
              // Создаём Set названий событий Firebase для дедубликации
              const firebaseTitles = new Set(firebaseEvents.map(e => e.title));
              
              // Сохраняем локальные события (те, которые начинаются с local_)
              const localOnlyEvents = prevEvents.filter(e => 
                (typeof e.id === 'string' && e.id.startsWith('local_'))
              );
              
              // Фильтруем Firebase события: исключаем те, которые уже добавлены локально
              // (по названию события)
              const uniqueFirebaseEvents = firebaseEvents.filter(fbEvent => {
                const isDuplicate = prevEvents.some(prevEvent =>
                  prevEvent.title === fbEvent.title &&
                  prevEvent.description === fbEvent.description
                );
                if (isDuplicate) {
                  console.log('⚠️ EventContext: исключен дубликат из Firebase:', fbEvent.title);
                }
                return !isDuplicate;
              });
              
              // Объединяем: уникальные Firebase события + локальные события
              const combined = [...uniqueFirebaseEvents, ...localOnlyEvents];
              
              console.log('📬 EventContext: Firebase уникальные:', uniqueFirebaseEvents.length, '+ локальных:', localOnlyEvents.length, '= всего:', combined.length);
              
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
            console.log('📬 EventContext: Firebase пуст');
            setFirebaseInitialized(true);
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
  }, [saveToStorage]);

  const addEvent = async (event) => {
    try {
      console.log('📝 EventContext: Создаю событие:', event);
      
      // Преобразуем status один раз для использования везде
      const normalizedStatus = event.status === 'active' ? 'Активный' : 
                              event.status === 'ended' ? 'Завершён' : 'Скоро';
      
      // Получаем стиль события по типу (цвет и иконка)
      const eventType = event.eventType || 'default';
      const eventStyle = getEventStyleByType(eventType);
      
      // Всегда создаём локальный ID сначала (для немедленного отображения)
      const tempId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Локально добавляем событие сразу с нормализованными данными
      const newLocalEvent = {
        id: tempId,
        title: event.title,
        description: event.description,
        status: normalizedStatus, // Используем преобразованный статус
        icon: eventStyle.icon, // Берём иконку по типу события
        color: eventStyle.color, // Берём цвет по типу события
        eventType: eventType, // Сохраняем тип события
        participants: event.participantsCount || 0, // Используем participants вместо participantsCount
        prize: event.prize || null,
        reward: event.reward || null,
        startBid: event.startBid || null,
        endDate: event.endDate || '', // Добавляем значение по умолчанию
        allowedUsers: event.allowedUsers || 'all', // Добавляем значение по умолчанию
        _local: true, // Отмечаем как локальное
      };
      
      // Показываем событие немедленно
      setEvents((prevEvents) => {
        const updatedEvents = [...prevEvents, newLocalEvent];
        console.log('✅ EventContext: обновляю стейт, было:', prevEvents.length, 'стало:', updatedEvents.length);
        console.log('✅ EventContext: новое событие:', { id: newLocalEvent.id, title: newLocalEvent.title, status: newLocalEvent.status, eventType: newLocalEvent.eventType, color: newLocalEvent.color });
        saveToStorage(updatedEvents);
        console.log('✅ EventContext: Событие добавлено в стейт, всего событий:', updatedEvents.length);
        return updatedEvents;
      });
      
      // Отслеживаем, что это событие в процессе синхронизации
      setPendingEventIds((prev) => new Set([...prev, tempId]));
      
      console.log('✅ EventContext: Событие добавлено локально с ID:', tempId);
      
      // Теперь пытаемся сохранить в Firebase (в фоне, не ждём)
      const eventData = {
        title: event.title,
        description: event.description,
        status: normalizedStatus, // Используем уже преобразованный статус
        icon: eventStyle.icon, // Сохраняем иконку по типу события
        color: eventStyle.color, // Сохраняем цвет по типу события
        eventType: eventType, // Сохраняем тип события
        participants: event.participantsCount || 0,
        prize: event.prize || null,
        reward: event.reward || null,
        startBid: event.startBid || null,
      };
      
      // Пытаемся сохранить в Firebase без ожидания
      createEvent(eventData)
        .then((firebaseId) => {
          console.log('✅ EventContext: Событие создано в Firebase с ID:', firebaseId);
          // Обновляем локальное событие с реальным ID из Firebase
          setEvents((prevEvents) => {
            const updated = prevEvents.map((e) =>
              e.id === tempId ? { ...e, id: firebaseId, _local: false } : e
            );
            saveToStorage(updated);
            console.log('✅ EventContext: Событие обновлено с Firebase ID:', firebaseId);
            return updated;
          });
          // Удаляем из pending
          setPendingEventIds((prev) => {
            const newPending = new Set(prev);
            newPending.delete(tempId);
            return newPending;
          });
        })
        .catch((firebaseError) => {
          console.warn('⚠️ EventContext: Firebase ошибка:', firebaseError.message);
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
      console.log('📝 EventContext: Обновляю событие:', updatedEvent);
      
      // Преобразуем status один раз
      const normalizedStatus = updatedEvent.status === 'active' ? 'Активный' : 
                              updatedEvent.status === 'ended' ? 'Завершён' : 'Скоро';
      
      // Получаем стиль события по типу (цвет и иконка)
      const eventType = updatedEvent.eventType || 'default';
      const eventStyle = getEventStyleByType(eventType);
      
      // Локально обновляем СРАЗУ (без ожидания Firebase)
      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.map((e) =>
          e.id === id ? { 
            ...e, 
            ...updatedEvent, 
            status: normalizedStatus, 
            eventType: eventType,
            icon: eventStyle.icon, // Устанавливаем иконку по типу события
            color: eventStyle.color, // Устанавливаем цвет по типу события
          } : e
        );
        saveToStorage(updatedEvents);
        console.log('✅ EventContext: события обновлены локально, новое событие:', updatedEvents.find(e => e.id === id));
        return updatedEvents;
      });
      
      console.log('✅ EventContext: событие обновлено локально, ID:', id);
      
      // Обновляем в Firebase в фоне (без блокирования)
      const eventData = {
        title: updatedEvent.title,
        description: updatedEvent.description,
        status: normalizedStatus,
        icon: eventStyle.icon,
        color: eventStyle.color,
        eventType: eventType,
        participants: updatedEvent.participantsCount || 0,
        prize: updatedEvent.prize || null,
      };
      
      // Отправляем в Firebase асинхронно, не блокируя UI
      updateEventFirebase(id, eventData)
        .then(() => console.log('✅ EventContext: событие обновлено в Firebase, ID:', id))
        .catch((error) => console.warn('⚠️ Firebase обновление ошибка:', error));
    } catch (error) {
      console.error('Ошибка при обновлении события:', error);
      throw error;
    }
  };

  const deleteEvent = async (id) => {
    try {
      console.log('🗑️ EventContext: начинаю удаление события:', id);
      
      // Удаляем локально сразу (не ждём Firebase)
      setEvents((prevEvents) => {
        const updatedEvents = prevEvents.filter((e) => {
          const shouldKeep = e.id !== id;
          if (!shouldKeep) {
            console.log('🗑️ EventContext: удаляю событие из стейта:', id);
          }
          return shouldKeep;
        });
        saveToStorage(updatedEvents);
        console.log('✅ EventContext: событие удалено локально, осталось:', updatedEvents.length);
        return updatedEvents;
      });

      // Затем пытаемся удалить из Firebase (с fallback)
      try {
        await deleteEventFirebase(id);
        console.log('✅ EventContext: событие удалено из Firebase:', id);
      } catch (firebaseError) {
        console.warn('⚠️ EventContext: Firebase ошибка при удалении:', firebaseError.message);
      }
    } catch (error) {
      console.error('❌ EventContext: Ошибка при удалении события:', error);
      throw error;
    }
  };

  const value = {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
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
