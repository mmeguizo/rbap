import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  devLogin: (email: string) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  );
  const [isLoading, setIsLoading] = useState(true);

  const setTokens = useCallback((token: string, refreshToken: string) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("refresh_token", refreshToken);
    setAccessToken(token);
  }, []);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setAccessToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getMe();
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar: userData.avatar,
      });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.passwordLogin(email, password);
      setTokens(data.access_token, data.refresh_token);
      await fetchUser();
    },
    [setTokens, fetchUser],
  );

  const devLogin = useCallback(
    async (email: string) => {
      const data = await authApi.devLogin(email);
      setTokens(data.access_token, data.refresh_token);
      await fetchUser();
    },
    [setTokens, fetchUser],
  );

  const loginWithGoogle = useCallback(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";
    window.location.href = `${apiUrl}/auth/google`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setAccessToken(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        devLogin,
        logout,
        setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
