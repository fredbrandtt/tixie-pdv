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
 * @returns O ID da primeira empresa associada ao usuário ou null se não encontrada
 */
export async function getUserEmpresaId(): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('Usuário não autenticado ao buscar empresa');
      return null;
    }

    // Buscar empresas associadas ao usuário
    const { data: userEmpresas, error } = await supabase
      .from('user_empresas')
      .select('empresa_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar empresas do usuário:', error);
      return null;
    }

    if (!userEmpresas || userEmpresas.length === 0) {
      console.error('Usuário não possui empresas associadas');
      return null;
    }

    // Retorna o ID da primeira empresa (a mais recente)
    return userEmpresas[0].empresa_id;
  } catch (error) {
    console.error('Erro ao obter empresa do usuário:', error);
    return null;
  }
} 