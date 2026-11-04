import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import {
  fetchUserProfile,
  getConfig,
  initGapi,
  isDemoMode,
  setAccessToken,
} from '../services/googleApi';
import { ensureWorkbook } from '../services/sheetsService';
import { ROLE_LABELS, ROLES, SCOPES, STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER) || 'null');
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [role, setRole] = useState(localStorage.getItem(STORAGE_KEYS.ROLE) || ROLES.SALES);
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const boot = async () => {
      try {
        if (isDemoMode() && user) {
          await ensureWorkbook();
          return;
        }
        const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        const exp = Number(sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXP) || 0);
        if (token && exp > Date.now()) {
          setAccessToken(token);
          await initGapi();
          await ensureWorkbook();
        } else if (token) {
          setAccessToken('');
          sessionStorage.removeItem(STORAGE_KEYS.USER);
          setUser(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBooting(false);
      }
    };
    boot();
  }, []);

  const persistUser = (profile, token, expiresIn = 3600) => {
    setUser(profile);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
    if (token) {
      setAccessToken(token);
      sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXP, String(Date.now() + expiresIn * 1000));
    }
  };

  const finishLogin = async (profile, token, expiresIn) => {
    persistUser(profile, token, expiresIn);
    await initGapi();
    await ensureWorkbook();
  };

  const googleLogin = useGoogleLogin({
    scope: SCOPES,
    onSuccess: async (tokenResponse) => {
      setBusy(true);
      setError('');
      try {
        const profile = await fetchUserProfile(tokenResponse.access_token);
        await finishLogin(profile, tokenResponse.access_token, tokenResponse.expires_in || 3600);
      } catch (err) {
        setError(err.message || 'Google sign-in failed.');
      } finally {
        setBusy(false);
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  });

  const login = async () => {
    setError('');
    if (isDemoMode()) {
      setBusy(true);
      try {
        const profile = {
          name: 'Demo User',
          email: 'demo@example.com',
          picture: '',
        };
        await finishLogin(profile, 'demo-token', 86400);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!getConfig().clientId) {
      setError('Add a Google OAuth client ID first.');
      return;
    }
    googleLogin();
  };

  const logout = () => {
    setUser(null);
    setAccessToken('');
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  };

  const switchRole = (nextRole) => {
    setRole(nextRole);
    localStorage.setItem(STORAGE_KEYS.ROLE, nextRole);
  };

  const value = useMemo(
    () => ({
      user,
      role,
      roleLabel: ROLE_LABELS[role],
      isAuthenticated: Boolean(user),
      booting,
      busy,
      error,
      setError,
      login,
      logout,
      switchRole,
    }),
    [user, role, booting, busy, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
