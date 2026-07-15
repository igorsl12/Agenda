// AuthContext.tsx — estado de autenticação do app.
// Mantém o usuário logado (via token persistido), expõe login/signup/logout
// e sabe se o app está em modo local (sem login) ou nuvem (logado).
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthUser,
  fetchMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
} from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Revalida a sessão atual contra o servidor. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const me = await fetchMe();
    setUser(me);
  };

  useEffect(() => {
    // No mount, tenta restaurar a sessão (token persistido em storage).
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  };

  const signup = async (email: string, password: string, name?: string) => {
    setUser(await apiSignup(email, password, name));
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthed: !!user,
      login,
      signup,
      logout,
      refresh,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
