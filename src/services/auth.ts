import { supabase } from '@/lib/supabase'
import { User, UserEmpresa } from '@/types/user'

export async function signUp(email: string, password: string, nome: string, empresaId: number, isSuperAdmin: boolean = false) {
  try {
    // 1. Criar o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (!authData.user) throw new Error('Erro ao criar usuário')

    // 2. Inserir dados adicionais na tabela de usuários
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        nome,
        is_super_admin: isSuperAdmin
      })

    if (profileError) throw profileError

    // 3. Associar empresa ao usuário
    const { error: empresaError } = await supabase
      .from('user_empresas')
      .insert({
        user_id: authData.user.id,
        empresa_id: empresaId,
      })

    if (empresaError) throw empresaError

    return { success: true }
  } catch (error) {
    console.error('Erro no cadastro:', error)
    throw error
  }
}

export async function signIn(email: string, password: string) {
  try {
    console.log('[Auth] Iniciando login com email:', email);
    
    // Configurações específicas para o login
    const options = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string): string | null => {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
          },
          setItem: (key: string, value: string): void => {
            if (typeof window === 'undefined') return;
            localStorage.setItem(key, value);
            // Também configura como cookie para o middleware
            document.cookie = `${key}=${value}; path=/; max-age=31536000`;
          },
          removeItem: (key: string): void => {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(key);
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        }
      }
    };
    
    // Configura o Supabase com essas opções específicas para login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('[Auth] Erro no login:', error);
      throw error;
    }

    if (!data.session) {
      console.error('[Auth] Login sem retorno de sessão');
      throw new Error('Sessão não retornada após login');
    }

    console.log('[Auth] Login realizado com sucesso:', data.user?.email);
    
    // Força o armazenamento para garantir persistência
    if (typeof window !== 'undefined') {
      // Armazena no localStorage
      localStorage.setItem('sb-access-token', data.session.access_token);
      localStorage.setItem('sb-refresh-token', data.session.refresh_token);
      localStorage.setItem('auth-status', 'authenticated');
      
      // Configura cookies para o middleware poder detectar
      document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=31536000`;
      document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=31536000`;
      
      console.log('[Auth] Tokens salvos em localStorage e cookies');
    }

    return data;
  } catch (error) {
    console.error('[Auth] Erro no login:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    console.log('[Auth] Iniciando processo de logout');
    
    // Limpar dados no localStorage
    if (typeof window !== 'undefined') {
      console.log('[Auth] Limpando dados do localStorage');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('auth-status');
      
      // Limpar cookies também
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    
    // Chamar função de signOut do Supabase - com escopo global para limpar todas as sessões
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('[Auth] Erro durante logout:', error);
      throw error;
    }
    
    console.log('[Auth] Logout concluído com sucesso');
    
    // Forçar recarregamento completo da página para limpar qualquer estado
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('[Auth] Erro ao fazer logout:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Buscar dados adicionais do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError) throw userError

    // Buscar empresas associadas
    const { data: empresas, error: empresasError } = await supabase
      .from('user_empresas')
      .select('*')
      .eq('user_id', user.id)

    if (empresasError) throw empresasError

    return {
      ...userData,
      empresas: empresas as UserEmpresa[]
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}

/**
 * Obtém o ID da empresa associada ao usuário atual
 * @returns O ID da empresa associada ao usuário ou null se não encontrada
 */
export async function getUserEmpresaId(): Promise<number | null> {
  try {
    console.log('[DEBUG] Iniciando getUserEmpresaId');
    
    // Primeiro verifica se o ID da empresa já está no localStorage
    if (typeof window !== 'undefined') {
      const cachedCompanyId = localStorage.getItem('userCompanyId');
      if (cachedCompanyId) {
        console.log('[DEBUG] Usando ID da empresa do localStorage:', cachedCompanyId);
        return parseInt(cachedCompanyId);
      }
    }

    // Se não encontrou no localStorage, busca do Supabase
    console.log('[DEBUG] ID da empresa não encontrado no localStorage, buscando do Supabase...');
    
    // Verifica sessão atual
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Se não houver sessão, retorna null
    if (!sessionData.session) {
      console.error('[DEBUG] Sem sessão ativa ao buscar empresa');
      return null;
    }
    
    // Obtém o usuário da sessão atual com metadados
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[DEBUG] Usuário não autenticado ao buscar empresa');
      return null;
    }

    console.log('[DEBUG] Buscando companyId para o usuário:', user.id);

    // Buscar o companyId diretamente da tabela users
    const { data, error } = await supabase
      .from('users')
      .select('companyId')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[DEBUG] Erro ao buscar companyId do usuário:', error);
      return null;
    }

    console.log('[DEBUG] Dados retornados da consulta users:', data);

    if (!data || data.companyId === undefined) {
      console.error('[DEBUG] companyId não encontrado para o usuário');
      return null;
    }

    const companyId = data.companyId;
    console.log('[DEBUG] companyId encontrado:', companyId);
    
    // Salva no localStorage para futuras consultas
    if (typeof window !== 'undefined') {
      localStorage.setItem('userCompanyId', companyId.toString());
      console.log('[DEBUG] Salvando no localStorage:', companyId.toString());
    }
    
    // Retorna o ID da empresa
    return companyId;
  } catch (error) {
    console.error('[DEBUG] Erro ao obter companyId do usuário:', error);
    return null;
  }
} 