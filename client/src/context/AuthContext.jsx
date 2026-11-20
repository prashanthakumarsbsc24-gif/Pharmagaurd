import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../services/api';
import { makeMoney } from '../utils/currency';

const AuthContext = createContext(null);

const FALLBACK_REGION = { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [options, setOptions] = useState({ regions: [FALLBACK_REGION], roles: [], defaultRegion: 'IN' });
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');

  const endSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(endSession);
    let cancelled = false;
    (async () => {
      try {
        const opts = await api.options();
        if (cancelled) return;
        setOptions(opts);
        if (tokenStore.get()) {
          try {
            const { user: me } = await api.me();
            if (!cancelled) setUser(me);
          } catch {
            tokenStore.clear();
          }
        }
      } catch (err) {
        if (!cancelled) setBootError(err.message);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [endSession]);

  const startSession = useCallback(({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (username, password, regionCode) => {
    const session = await api.login({ username, password });
    startSession(session);
    if (regionCode && regionCode !== session.user.region) {
      const { user: updated } = await api.updateRegion(regionCode);
      setUser(updated);
      return updated;
    }
    return session.user;
  }, [startSession]);

  const register = useCallback(async (payload) => startSession(await api.register(payload)), [startSession]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* the session is ending either way */ }
    endSession();
  }, [endSession]);

  const setRegion = useCallback(async (code) => {
    const { user: updated } = await api.updateRegion(code);
    setUser(updated);
  }, []);

  const region = useMemo(
    () => options.regions.find((r) => r.code === (user?.region ?? options.defaultRegion)) ?? options.regions[0] ?? FALLBACK_REGION,
    [options, user]
  );
  const money = useMemo(() => makeMoney(region), [region]);

  const value = useMemo(
    () => ({ user, options, region, money, booting, bootError, login, register, logout, setRegion }),
    [user, options, region, money, booting, bootError, login, register, logout, setRegion]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const useMoney = () => useContext(AuthContext).money;