"use client";

import { ReactNode } from "react";

export default function Header({ children }: { children: ReactNode }) {
  return (
    <header className="w-full bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </div>
    </header>
  );
} 