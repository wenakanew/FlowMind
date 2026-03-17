"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getUserProfile } from "@/lib/preferences";
import { useAuth } from "@/components/auth/auth-provider";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserProfile() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(getUserProfile());
  const ref = useRef<HTMLDivElement>(null);
  const { firebaseEnabled, authReady, authLoading, isAuthenticated, signIn, signOut } = useAuth();

  useEffect(() => {
    setProfile(getUserProfile());
  }, [open]);

  useEffect(() => {
    const handler = () => setProfile(getUserProfile());
    window.addEventListener("flowmind:profile-updated", handler);
    return () => window.removeEventListener("flowmind:profile-updated", handler);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  const initials = getInitials(profile.displayName);

  if (firebaseEnabled && authReady && !isAuthenticated) {
    return (
      <button
        type="button"
        disabled={authLoading}
        onClick={() => void signIn()}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {authLoading ? "Signing in…" : "Sign in with Google"}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-haspopup="menu"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-inner ring-2 ring-white dark:ring-zinc-900"
          aria-hidden
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden max-w-30 truncate text-left text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:block">
          {profile.displayName}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10"
          role="dialog"
          aria-label="User menu"
        >
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {profile.displayName}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {profile.email}
            </p>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <span aria-hidden>👤</span>
            Profile &amp; account
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <span aria-hidden>⚙</span>
            System settings
          </Link>
          <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              if (!firebaseEnabled) return;
              void signOut();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <span aria-hidden>⎋</span>
            {authLoading ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
