"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export function CompanyIdDebug() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [supabaseId, setSupabaseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>("nunca");
  const pathname = usePathname();

  // Verificar se estamos em uma página que deveria mostrar o debug
  const shouldShowDebug = pathname !== '/login' && pathname !== '/register';

  // Função para atualizar o ID da empresa para o valor real do Supabase
  const atualizarCompanyId = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        // Limpar o cache do Supabase para forçar uma consulta fresca
        await supabase.auth.refreshSession();
      }
      
      // Verifica se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserId(session.user.id);
        
        // Buscar o companyId diretamente da tabela users
        const { data, error } = await supabase
          .from('users')
          .select('companyId')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error("Erro ao buscar companyId do usuário:", error);
        } else if (data && data.companyId !== undefined) {
          const dbCompanyId = data.companyId;
          setSupabaseId(dbCompanyId.toString());
          console.log("ID da empresa no banco de dados:", dbCompanyId);
          
          // Atualizar a hora da última verificação
          setLastChecked(new Date().toLocaleTimeString());
          
          // Define no localStorage o valor correto
          localStorage.setItem("userCompanyId", dbCompanyId.toString());
          setCompanyId(dbCompanyId.toString());
          
          if (forceRefresh) {
            toast.success(`ID da empresa atualizado para ${dbCompanyId}!`);
          }
        } else {
          setSupabaseId("não encontrado");
        }
      } else {
        setUserId(null);
        setSupabaseId(null);
      }
    } catch (error) {
      console.error("Erro ao verificar dados do Supabase:", error);
      setSupabaseId("erro");
    }
  };

  useEffect(() => {
    // Se não devemos mostrar o debug, não fazer nenhuma operação
    if (!shouldShowDebug) return;

    // Verifica e atualiza imediatamente
    const storedCompanyId = localStorage.getItem("userCompanyId");
    setCompanyId(storedCompanyId);
    
    atualizarCompanyId();

    // Configura atualizações periódicas
    const timer = setInterval(() => {
      if (!shouldShowDebug) return;
      
      // Atualizar o valor do localStorage
      const currentId = localStorage.getItem("userCompanyId");
      setCompanyId(currentId);
      
      // Verificar o Supabase periodicamente
      atualizarCompanyId();
    }, 5000);
    
    return () => {
      clearInterval(timer);
    };
  }, [shouldShowDebug, pathname]);

  // Função para forçar atualização e recarregar a página
  const forcarAtualizacao = async () => {
    try {
      // Limpar o supabase cache completamente
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      
      // Reconectar ao Supabase
      await supabase.auth.getSession();
      
      // Limpar localStorage exceto tokens de autenticação
      const authKeys = ['sb-refresh-token', 'sb-access-token'];
      const authValues: {[key: string]: string | null} = {};
      
      // Salvar tokens de autenticação
      authKeys.forEach(key => {
        authValues[key] = localStorage.getItem(key);
      });
      
      // Limpar localStorage
      localStorage.clear();
      
      // Restaurar tokens de autenticação
      Object.entries(authValues).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
      
      // Atualizar com refresh forçado
      await atualizarCompanyId(true);
      
      // Recarregar a página após um pequeno atraso
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error("Erro ao forçar atualização:", error);
      toast.error("Erro ao forçar atualização. Tente novamente.");
    }
  };

  // Função para verificar agora sem refresh
  const verificarAgora = async () => {
    await atualizarCompanyId(true);
  };

  // Se não devemos mostrar o debug ou não temos dados, não renderizar nada
  if (!shouldShowDebug) return null;

  return (
    <div className="fixed bottom-2 right-2 bg-black/70 p-3 text-white text-xs rounded z-50">
      <p>localStorage companyId: {companyId || "não definido"}</p>
      <p>Supabase companyId: {supabaseId || "não encontrado"}</p>
      <p>userId: {userId?.substring(0, 8) || "nenhum"}</p>
      <p className="opacity-70 mt-1">Última verificação: {lastChecked}</p>
      <div className="flex gap-2 mt-2">
        <button 
          className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex-1"
          onClick={verificarAgora}
        >
          Verificar agora
        </button>
        <button 
          className="bg-red-600 text-white px-2 py-1 rounded text-xs flex-1"
          onClick={forcarAtualizacao}
        >
          Forçar atualização
        </button>
      </div>
    </div>
  );
} 