"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { getCurrentUser, signOut } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  checkSessionStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkSessionStatus = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao verificar sessão:', error);
        return false;
      }
      
      return !!data.session;
    } catch (e) {
      console.error('Erro ao verificar status da sessão:', e);
      return false;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const isAuthenticated = await checkSessionStatus();
        
        if (!isAuthenticated) {
          console.log('Usuário não autenticado, limpando estado');
          setUser(null);
          setLoading(false);
          localStorage.removeItem('userCompanyId');
          return;
        }
        
        console.log('Usuário está autenticado, buscando dados');
        const userData = await getCurrentUser();
        
        if (userData && userData.empresas && userData.empresas.length > 0) {
          // Armazena o ID da empresa no localStorage para uso em toda a aplicação
          const empresaId = userData.empresas[0].empresa_id;
          console.log('ID da empresa do usuário encontrado no Supabase:', empresaId);
          localStorage.setItem('userCompanyId', empresaId.toString());
        } else {
          console.log('Usuário não possui empresas associadas');
          localStorage.removeItem('userCompanyId');
        }
        
        setUser(userData);
      } catch (err) {
        console.error('Erro ao buscar dados do usuário:', err);
        setError('Falha ao carregar dados do usuário');
        setUser(null);
        localStorage.removeItem('userCompanyId');
      } finally {
        setLoading(false);
      }
    };

    // Escuta mudanças na sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Mudança no estado de autenticação:', event, session?.user?.email);
        
        if (session) {
          fetchUser();
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Verifica o usuário atual ao carregar
    fetchUser();

    // Limpeza da inscrição quando o componente for desmontado
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      
      // Limpar todos os dados de autenticação no localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        localStorage.removeItem('auth-status');
        localStorage.removeItem('userCompanyId'); // Remove o ID da empresa ao fazer logout
      }
      
      router.push('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      setError('Falha ao fazer logout');
    }
  };

  const value = {
    user,
    loading,
    error,
    logout,
    checkSessionStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
} 