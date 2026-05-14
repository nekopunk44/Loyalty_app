import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from '../context/NetworkContext';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

/**
 * Cache-first data hook.
 * 1. Немедленно отдаёт кэш (если есть) — экран не пустой.
 * 2. При наличии сети подтягивает свежие данные и обновляет кэш.
 * 3. При отсутствии сети остаётся на кэше и выставляет isStale.
 */
export function useOfflineData(cacheKey, fetchFn, { ttl = DEFAULT_TTL } = {}) {
  const { isOnline } = useNetwork();
  const [data, setData]         = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [isStale, setStale]     = useState(false);
  const [error, setError]       = useState(null);
  const mountedRef = useRef(true);

  const loadCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (!raw) return null;
      const { data: cached, ts } = JSON.parse(raw);
      return { data: cached, stale: Date.now() - ts > ttl };
    } catch {
      return null;
    }
  }, [cacheKey, ttl]);

  const saveCache = useCallback(async (fresh) => {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: fresh, ts: Date.now() }));
    } catch { /* non-critical */ }
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    // Кэш — сразу, чтобы экран не был пустым
    const cached = await loadCache();
    if (cached && mountedRef.current) {
      setData(cached.data);
      setStale(cached.stale);
    }

    if (!isOnline) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      const fresh = await fetchFn();
      if (mountedRef.current) {
        setData(fresh);
        setStale(false);
        await saveCache(fresh);
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isOnline, fetchFn, loadCache, saveCache]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { data, isLoading, isStale, error, refresh };
}
