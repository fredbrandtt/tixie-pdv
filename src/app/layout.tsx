import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { CompanyIdInitializer } from "@/components/CompanyIdInitializer";
import { CompanyIdDebug } from "@/components/CompanyIdDebug";
import CompanyIdReloader from "@/components/CompanyIdReloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDV Armazém - Sistema de Vendas de Ingressos",
  description: "Sistema de PDV para venda de ingressos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CompanyIdInitializer />
          <CompanyIdDebug />
          <CompanyIdReloader />
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
