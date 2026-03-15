"use client";

import { UserProfile } from "./user-profile";

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
      <div className="min-w-0 flex-1">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          FlowMind
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <UserProfile />
      </div>
    </header>
  );
}
