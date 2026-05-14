import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { getApiUrl } from '../utils/apiUrl';

const NetworkContext = createContext({ isOnline: true, isOffline: false, checkNow: () => {} });

const CHECK_INTERVAL_MS = 30_000;

async function pingServer() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${getApiUrl()}/health`, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.status < 500;
  } catch {
    return false;
  }
}

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const appStateRef = useRef(AppState.currentState);
  const timerRef   = useRef(null);

  const check = useCallback(async () => {
    const online = await pingServer();
    setIsOnline(online);
    return online;
  }, []);

  useEffect(() => {
    check();

    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        check();
      }
      appStateRef.current = nextState;
    });

    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(timerRef.current);
    };
  }, [check]);

  return (
    <NetworkContext.Provider value={{ isOnline, isOffline: !isOnline, checkNow: check }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
