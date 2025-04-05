"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

export function CompanyIdInitializer() {
  const router = useRouter();
  const pathname = usePathname();
  const isInitializedRef = useRef(false);

  // Verificar se estamos em uma página protegida que requer autenticação
  const isProtectedPage = pathname !== '/login' && pathname !== '/register';

  useEffect(() => {
    // Se não estamos em uma página protegida ou já foi inicializado, não fazer nada
    if (!isProtectedPage || isInitializedRef.current) return;
    
    // Marcar como inicializado para evitar múltiplas execuções
    isInitializedRef.current = true;
    
    // Função para obter o ID da empresa do usuário autenticado no Supabase
    const obterCompanyId = async () => {
      try {
        // Verificar se há uma sessão ativa
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          console.log("CompanyIdInitializer: Não há sessão ativa");
          
          // Só redirecionar para o login se estamos em uma página protegida
          if (isProtectedPage) {
            toast.error("Sessão expirada. Por favor, faça login novamente.");
            
            // Pequeno atraso para evitar redirecionamentos em cascata
            setTimeout(() => {
              router.push("/login");
            }, 100);
          }
          return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("CompanyIdInitializer: Usuário não encontrado na sessão");
          
          // Só redirecionar para o login se estamos em uma página protegida
          if (isProtectedPage) {
            toast.error("Usuário não encontrado. Por favor, faça login novamente.");
            router.push("/login");
          }
          return;
        }

        // Verificar se já existe um companyId no localStorage
        const storedCompanyId = localStorage.getItem("userCompanyId");
        if (storedCompanyId) {
          console.log("CompanyIdInitializer: Usando companyId do localStorage:", storedCompanyId);
          return; // Se já existe, não precisamos consultar o Supabase
        }

        // Buscar o companyId diretamente da tabela users
        const { data: userData, error } = await supabase
          .from('users')
          .select('companyId')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("CompanyIdInitializer: Erro ao buscar companyId do usuário:", error);
          if (isProtectedPage) {
            toast.error("Erro ao carregar empresa. Faça login novamente.");
          }
          return;
        }

        if (userData && userData.companyId !== undefined) {
          const companyId = userData.companyId;
          console.log("CompanyIdInitializer: ID da empresa no Supabase:", companyId);
          
          // Salva no localStorage o ID real da empresa do usuário
          localStorage.setItem("userCompanyId", companyId.toString());
        } else {
          console.log("CompanyIdInitializer: Usuário não possui empresa associada");
          if (isProtectedPage) {
            toast.error("Sua conta não está associada a nenhuma empresa.");
          }
          localStorage.removeItem("userCompanyId");
        }
      } catch (error) {
        console.error("CompanyIdInitializer: Erro ao processar ID da empresa:", error);
        if (isProtectedPage) {
          toast.error("Erro ao identificar sua empresa. Tente novamente.");
        }
      }
    };

    // Só executar o código se estivermos em uma página protegida
    if (isProtectedPage) {
      obterCompanyId();
      
      // Monitorar a sessão para detectar logouts
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          console.log("CompanyIdInitializer: Usuário deslogado");
          localStorage.removeItem("userCompanyId");
          router.push("/login");
        } else if (event === 'SIGNED_IN') {
          console.log("CompanyIdInitializer: Usuário logado");
          obterCompanyId();
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [router, isProtectedPage, pathname]);

  // Este componente não renderiza nada visualmente
  return null;
} 