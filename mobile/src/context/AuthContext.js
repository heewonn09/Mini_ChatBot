import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearStoredAuth, fetchCurrentUser, hydrateSession, logIn, signUp } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const boot = async () => {
      try {
        const me = await hydrateSession();
        setUser(me);
      } catch {
        await clearStoredAuth();
        setUser(null);
      } finally {
        setIsHydrating(false);
      }
    };
    boot();
  }, []);

  const signIn = async (usernameOrEmail, password) => {
    setIsLoading(true);
    setError("");
    try {
      await logIn({ username_or_email: usernameOrEmail, password });
      const me = await fetchCurrentUser();
      setUser(me);
    } catch (err) {
      setError(err?.response?.data?.detail || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ username, email, password }) => {
    setIsLoading(true);
    setError("");
    try {
      await signUp({ username, email, password });
      const me = await fetchCurrentUser();
      setUser(me);
    } catch (err) {
      setError(err?.response?.data?.detail || "회원가입에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await clearStoredAuth();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isLoading, isHydrating, error, signIn, register, signOut }),
    [user, isLoading, isHydrating, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
