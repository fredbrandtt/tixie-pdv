"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

export default function CompanyIdReloader() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Verificar se estamos em uma página que requer companyId
  const requiresCompanyId = pathname?.includes('/pdv') || pathname?.includes('/loading');
  
  useEffect(() => {
    // Se não estamos numa página que requer companyId, não mostrar o modal
    if (!requiresCompanyId) {
      setVisible(false);
      return;
    }
    
    // Verificar se há um companyId no localStorage
    const storedCompanyId = localStorage.getItem("userCompanyId");
    setCompanyId(storedCompanyId);
    
    if (!storedCompanyId && requiresCompanyId) {
      setVisible(true);
    } else {
      setVisible(false);
    }
    
    // Verificar a cada 2 segundos
    const interval = setInterval(() => {
      // Não verificar se não estamos numa página que requer companyId
      if (!requiresCompanyId) return;
      
      const currentCompanyId = localStorage.getItem("userCompanyId");
      setCompanyId(currentCompanyId);
      
      if (!currentCompanyId && requiresCompanyId) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [requiresCompanyId, pathname]);

  // Função para buscar o companyId no Supabase
  const buscarCompanyId = async () => {
    try {
      // Verificar sessão
      const { data } = await supabase.auth.getSession();
      
      if (!data?.session) {
        toast.error("Sem sessão ativa. Faça login novamente.");
        window.location.href = "/login";
        return;
      }
      
      // Buscar usuário
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error("Usuário não identificado. Faça login novamente.");
        window.location.href = "/login";
        return;
      }
      
      // Buscar empresa do usuário
      const { data: userEmpresas, error } = await supabase
        .from('user_empresas')
        .select('empresa_id')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error("Erro ao buscar empresa:", error);
        toast.error("Erro ao buscar sua empresa. Tente novamente.");
        return;
      }
      
      if (!userEmpresas || userEmpresas.length === 0) {
        toast.error("Nenhuma empresa encontrada para seu usuário.");
        return;
      }
      
      // Definir o companyId no localStorage
      const empresaId = userEmpresas[0].empresa_id;
      localStorage.setItem("userCompanyId", empresaId.toString());
      setCompanyId(empresaId.toString());
      toast.success("ID da empresa configurado com sucesso!");
      
      // Recarregar a página
      window.location.reload();
    } catch (error) {
      console.error("Erro ao buscar companyId:", error);
      toast.error("Erro ao configurar ID da empresa. Tente novamente.");
    }
  };

  // Função para forçar a limpeza de todo o localStorage e redirecionar para o login
  const forceRedirectToLogin = async () => {
    try {
      // Tentar fazer logout via API
      await supabase.auth.signOut();
      
      // Limpar todo o localStorage
      localStorage.clear();
      
      // Remover todos os cookies relacionados ao Supabase
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Notificar o usuário
      toast.success("Redirecionando para a página de login...");
      
      // Redirecionar para a página de login forçando uma nova sessão
      setTimeout(() => {
        // Usar uma URL que força a página a recarregar completamente
        window.location.href = "/login?ts=" + new Date().getTime();
      }, 1000);
    } catch (error) {
      console.error("Erro ao redirecionar para login:", error);
      
      // Mesmo com erro, tenta redirecionar
      window.location.href = "/login?ts=" + new Date().getTime();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-screen bg-black/70 flex items-center justify-center z-50">
      <div className="bg-black border border-white/10 rounded-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-white text-xl font-semibold mb-4">Supabase: companyId não encontrado</h2>
        <p className="text-red-400 mb-6">É necessário buscar o ID da sua empresa antes de continuar.</p>
        
        <div className="flex flex-col gap-3">
          <button 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            onClick={buscarCompanyId}
          >
            Buscar companyId e recarregar
          </button>
          
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            onClick={forceRedirectToLogin}
          >
            Ir para página de login
          </button>
        </div>
      </div>
    </div>
  );
} 