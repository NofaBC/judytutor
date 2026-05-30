"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth as getAuth } from "@/lib/firebase-client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebaseAuth = getAuth();
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Set/clear __session cookie so middleware can gate protected routes
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
      } else {
        document.cookie = "__session=; path=/; max-age=0";
      }
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    document.cookie = "__session=; path=/; max-age=0";
    await firebaseSignOut(getAuth());
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
