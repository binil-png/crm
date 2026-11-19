import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import {
  disableLocalDemo,
  enableLocalDemo,
  fetchUserProfile,
  getConfig,
  initGapi,
  isDemoMode,
  setAccessToken,
} from '../services/googleApi';
import { resetMockDb } from '../services/mockBackend';
import { ensureWorkbook, isPermissionError, upsertDirectoryUser } from '../services/sheetsService';
import { useCrmStore } from '../store/crmStore';
import {
  ROLE_LABELS,
  ROLES,
  SCOPES,
  STORAGE_KEYS,
  isAdminRole,
  normalizeCalendarId,
  normalizeRegistered,
  normalizeUserRole,
  normalizeUserType,
  userTypeToAppRole,
} from '../utils/constants';
import { initPushNotifications } from '../services/pushNotifications';
import { getPrivileges, workspaceFromPrivileges } from '../utils/privileges';

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
  calendarId: normalizeCalendarId(row?.['Calendar ID'] || row?.calendarId, row?.Email || row?.email),
  registered: normalizeRegistered(row?.Registered ?? row?.registered),
});

export function AuthProvider({ children }) {
  const storedDirectory = readStoredDirectory();
  const [user, setUser] = useState(readStoredUser);
  const [directory, setDirectory] = useState(storedDirectory ? fromSheetRow(storedDirectory) : null);
  const [role, setRole] = useState(
    storedDirectory ? userTypeToAppRole(storedDirectory.userType) : localStorage.getItem(STORAGE_KEYS.ROLE) || ROLES.SALES
  );
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState(null);
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
    const nextCalendar = normalizeCalendarId(row['Calendar ID'], row.Email);
    const nextRegistered = normalizeRegistered(row.Registered);
    if (
      directory?.userType === nextType &&
      directory?.userRole === nextRole &&
      directory?.username === String(row.Username || '').trim() &&
      directory?.calendarId === nextCalendar &&
      directory?.registered === nextRegistered
    ) {
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
    try {
      if (token) {
        setAccessToken(token);
        sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXP, String(Date.now() + expiresIn * 1000));
      }
      await initGapi();
      try {
        await ensureWorkbook();
      } catch (error) {
        if (!isPermissionError(error)) throw error;
      }
      const row = await upsertDirectoryUser({
        name: profile?.name || profile?.given_name || profile?.Username,
        email: profile?.email,
      });
      applyDirectory(row);
      useCrmStore.getState().rememberDirectoryUser(row);
      persistUser({ ...profile, registered: true }, token, expiresIn);
      setRegistration({
        username: row.Username,
        email: row.Email,
        at: row['Last Login'],
        registered: true,
      });
    } catch (err) {
      setAccessToken('');
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.DIRECTORY);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      throw err;
    }
  };

  const googleLogin = useGoogleLogin({
    scope: SCOPES,
    prompt: 'select_account',
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

  const enterLocalDemo = async ({ resetData = false } = {}) => {
    setError('');
    setBusy(true);
    try {
      enableLocalDemo();
      if (resetData) resetMockDb();
      const profile = {
        name: 'Demo User',
        email: 'demo@example.com',
        picture: '',
      };
      await finishLogin(profile, 'demo-token', 86400);
    } catch (err) {
      setError(err.message || 'Could not start local demo mode.');
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setError('');
    disableLocalDemo();
    if (!getConfig().clientId) {
      setError('Add a Google OAuth client ID, sales spreadsheet ID, and training spreadsheet ID first.');
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

  const privileges = useMemo(
    () => getPrivileges({ userType: directory?.userType, userRole: directory?.userRole }),
    [directory?.userType, directory?.userRole]
  );
  const workspace = workspaceFromPrivileges(privileges, role);

  const value = useMemo(
    () => ({
      user,
      directory,
      registration,
      calendarId: directory?.calendarId || 'primary',
      role: workspace,
      roleLabel: ROLE_LABELS[workspace],
      userType: directory?.userType || ROLE_LABELS[workspace],
      userRole: directory?.userRole || 'Team member',
      privileges,
      isRegistered: Boolean(user && directory?.registered),
      isAdmin: privileges.admin,
      isTeamLead: privileges.leadOrAdmin,
      isAuthenticated: Boolean(user && directory?.registered),
      booting,
      busy,
      error,
      setError,
      login,
      enterLocalDemo,
      logout,
      switchRole,
      applyDirectory,
    }),
    [user, directory, registration, workspace, privileges, booting, busy, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
