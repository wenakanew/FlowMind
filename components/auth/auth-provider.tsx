"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "firebase/auth";
import { getUserProfile } from "@/lib/preferences";
import { isFirebaseAuthConfigured } from "@/lib/firebase-client";
import {
  signInWithGoogle,
  signOutGoogle,
  subscribeToAuthChanges,
} from "@/lib/firebase-auth";

interface AuthContextValue {
  firebaseEnabled: boolean;
  authReady: boolean;
  authLoading: boolean;
  notionSyncing: boolean;
  user: User | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  syncToNotion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseEnabled] = useState(isFirebaseAuthConfigured());
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const syncToNotion = useCallback(async (sourceUser?: User | null) => {
    const profile = getUserProfile();
    const providerEmail = sourceUser?.providerData?.find((p) => p?.email)?.email;
    const email =
      sourceUser?.email?.trim().toLowerCase() ||
      providerEmail?.trim().toLowerCase() ||
      profile.email?.trim().toLowerCase();
    const name = sourceUser?.displayName?.trim() || profile.displayName?.trim() || email;

    if (!email || !name) {
      return;
    }

    setNotionSyncing(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          avatarUrl: sourceUser?.photoURL || profile.avatarUrl,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Failed syncing user to Notion:", text);
      }
    } finally {
      setNotionSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        void syncToNotion(nextUser);
      }
    });

    return unsubscribe;
  }, [firebaseEnabled, syncToNotion]);

  useEffect(() => {
    if (!firebaseEnabled) {
      return;
    }

    const handler = () => {
      if (user) {
        void syncToNotion(user);
      }
    };

    window.addEventListener("flowmind:profile-updated", handler);
    return () => window.removeEventListener("flowmind:profile-updated", handler);
  }, [firebaseEnabled, syncToNotion, user]);

  const signIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOutGoogle();
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseEnabled,
      authReady,
      authLoading,
      notionSyncing,
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
      syncToNotion,
    }),
    [authLoading, authReady, firebaseEnabled, notionSyncing, signIn, signOut, syncToNotion, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
