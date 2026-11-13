import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import {
  fetchUserProfile,
  getConfig,
  initGapi,
  isDemoMode,
  setAccessToken,
} from '../services/googleApi';
import { ensureWorkbook, upsertDirectoryUser } from '../services/sheetsService';
import { useCrmStore } from '../store/crmStore';
import {
  ROLE_LABELS,
  ROLES,
  SCOPES,
  STORAGE_KEYS,
  isAdminRole,
  isLeadRole,
  normalizeUserRole,
  normalizeUserType,
  userTypeToAppRole,
} from '../utils/constants';
import { initPushNotifications } from '../services/pushNotifications';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER) || 'null');
  } catch {
    return null;
  }
};

const readStoredDirectory = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.DIRECTORY) || 'null');
  } catch {
    return null;
  }
};

const fromSheetRow = (row) => ({
  username: String(row?.Username || '').trim(),
  email: String(row?.Email || '').trim().toLowerCase(),
  userType: normalizeUserType(row?.['User Type']) || 'Sales',
  userRole: normalizeUserRole(row?.['User Role']),
});

export function AuthProvider({ children }) {
  const storedDirectory = readStoredDirectory();
  const [user, setUser] = useState(readStoredUser);
  const [directory, setDirectory] = useState(storedDirectory);
  const [role, setRole] = useState(
    storedDirectory ? userTypeToAppRole(storedDirectory.userType) : localStorage.getItem(STORAGE_KEYS.ROLE) || ROLES.SALES
  );
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const users = useCrmStore((state) => state.users);

  const applyDirectory = (row) => {
    const next = fromSheetRow(row);
    const appRole = userTypeToAppRole(next.userType);
    setDirectory(next);
    setRole(appRole);
    sessionStorage.setItem(STORAGE_KEYS.DIRECTORY, JSON.stringify(next));
    localStorage.setItem(STORAGE_KEYS.ROLE, appRole);
    return next;
  };

  const resolveDirectory = async (profile) => {
    const row = await upsertDirectoryUser({
      name: profile?.name || profile?.Username,
      email: profile?.email,
    });
    return applyDirectory(row);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        if (isDemoMode() && user) {
          await ensureWorkbook();
          await resolveDirectory(user);
          return;
        }
        const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        const exp = Number(sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXP) || 0);
        if (token && exp > Date.now()) {
          setAccessToken(token);
          await initGapi();
          await ensureWorkbook();
          if (user) await resolveDirectory(user);
        } else if (token) {
          setAccessToken('');
          sessionStorage.removeItem(STORAGE_KEYS.USER);
          sessionStorage.removeItem(STORAGE_KEYS.DIRECTORY);
          setUser(null);
          setDirectory(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setBooting(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    if (!user?.email) return undefined;
    initPushNotifications(user).catch((err) => console.warn(err));
    return undefined;
  }, [user]);

  useEffect(() => {
    if (!user?.email || !users?.length) return;
    const row = users.find((item) => String(item.Email || '').toLowerCase() === String(user.email).toLowerCase());
    if (!row) return;
    const nextType = normalizeUserType(row['User Type']) || 'Sales';
    const nextRole = normalizeUserRole(row['User Role']);
    if (directory?.userType === nextType && directory?.userRole === nextRole && directory?.username === String(row.Username || '').trim()) {
      return;
    }
    applyDirectory(row);
  }, [users, user?.email]);

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
    await resolveDirectory(profile);
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
    setDirectory(null);
    setAccessToken('');
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.DIRECTORY);
  };

  const switchRole = (nextRole) => {
    if (!isAdminRole(directory?.userRole)) return;
    setRole(nextRole);
    localStorage.setItem(STORAGE_KEYS.ROLE, nextRole);
  };

  const value = useMemo(
    () => ({
      user,
      directory,
      role,
      roleLabel: ROLE_LABELS[role],
      userType: directory?.userType || ROLE_LABELS[role],
      userRole: directory?.userRole || 'Team member',
      isAdmin: isAdminRole(directory?.userRole),
      isTeamLead: isLeadRole(directory?.userRole),
      isAuthenticated: Boolean(user),
      booting,
      busy,
      error,
      setError,
      login,
      logout,
      switchRole,
      applyDirectory,
    }),
    [user, directory, role, booting, busy, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
