"use client";

import { UserProfile } from "./user-profile";
import Image from "next/image";

export function Header() {
  // Adjust these values to tune branding size quickly.
  const logoWidth = 300;
  const logoHeight = 96;
  // Move logo horizontally by changing this class:
  // left: -ml-2 / -ml-4 / -ml-6 / -ml-8, right: ml-2 / ml-4
  const logoOffsetClass = "-ml-12";

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white pl-0 pr-4 dark:border-zinc-800 dark:bg-zinc-950 sm:pr-6">
      <div className="min-w-0 flex-1">
        <div className={logoOffsetClass}>
          <Image 
            src="/flowmind.png" 
            alt="FlowMind" 
            width={logoWidth}
            height={logoHeight}
            className="h-50 w-auto"
            priority
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <UserProfile />
      </div>
    </header>
  );
}
