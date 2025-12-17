import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EventContext = createContext();

const initialMockEvents = [
  {
    id: '1',
    title: 'Аукцион: Картина',
    description: 'Редкая картина от известного художника',
    startBid: 1000,
    status: 'active',
    prize: '50 000 ₽',
    endDate: '20.12.2025',
    participantsCount: 23,
    allowedUsers: 'all',
  },
  {
    id: '2',
    title: 'Двойной кешбек',
    description: '2x кешбека на все покупки',
    status: 'active',
    endDate: '15.12.2025',
    participantsCount: 1243,
    allowedUsers: 'platinum',
  },
  {
    id: '3',
    title: 'Розыгрыш подарков',
    description: 'Автоматическое участие для активных пользователей',
    prize: 'Путешествие в Европу',
    status: 'ended',
    endDate: '10.12.2025',
    participantsCount: 567,
    allowedUsers: 'gold',
  },
];

export function EventProvider({ children }) {
  const [events, setEvents] = useState(initialMockEvents);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузить события из AsyncStorage при монтировании
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const storedEvents = await AsyncStorage.getItem('admin_events');
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
      }
    } catch (error) {
      console.error('Ошибка при загрузке событий:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToStorage = async (eventsToSave) => {
    try {
      await AsyncStorage.setItem('admin_events', JSON.stringify(eventsToSave));
    } catch (error) {
      console.error('Ошибка при сохранении событий:', error);
    }
  };

  const addEvent = (event) => {
    const newEvent = {
      id: String(Date.now()),
      participantsCount: 0,
      ...event,
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    saveToStorage(updatedEvents);
    return newEvent;
  };

  const updateEvent = (id, updatedEvent) => {
    const updatedEvents = events.map((e) =>
      e.id === id ? { ...e, ...updatedEvent } : e
    );
    setEvents(updatedEvents);
    saveToStorage(updatedEvents);
  };

  const deleteEvent = (id) => {
    const updatedEvents = events.filter((e) => e.id !== id);
    setEvents(updatedEvents);
    saveToStorage(updatedEvents);
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
