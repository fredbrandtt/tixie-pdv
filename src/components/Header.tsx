"use client";

import { ReactNode } from "react";

export default function Header({ children }: { children: ReactNode }) {
  return (
    <header className="w-full bg-black/20 backdrop-blur-md shadow-sm sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </div>
    </header>
  );
} 