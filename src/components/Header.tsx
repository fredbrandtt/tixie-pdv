"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Header() {
  const router = useRouter();
  const userName = "João Silva"; // Exemplo estático por enquanto

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-700">
          Olá, {userName}
        </h2>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-gray-600 hover:text-gray-900"
        >
          Sair
        </Button>
      </div>
    </header>
  );
} 