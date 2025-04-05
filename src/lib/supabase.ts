import { createClient } from '@supabase/supabase-js'

// Estas variáveis de ambiente devem estar definidas no arquivo .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Classe para personalizar o armazenamento de sessão
class CustomStorage {
  constructor() {
    console.log('Inicializando CustomStorage para sessão');
  }

  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      console.log(`[Storage] getItem ${key} (server-side): null`);
      return null;
    }
    const value = localStorage.getItem(key);
    console.log(`[Storage] getItem ${key}: ${value ? 'valor encontrado' : 'null'}`);
    return value;
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      console.log(`[Storage] setItem ${key} (server-side): não disponível`);
      return;
    }
    console.log(`[Storage] setItem ${key}: definindo valor`);
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      console.log(`[Storage] removeItem ${key} (server-side): não disponível`);
      return;
    }
    console.log(`[Storage] removeItem ${key}: removendo valor`);
    localStorage.removeItem(key);
  }
}

// Instância do storage customizado
const customStorage = new CustomStorage();

// Cria o cliente Supabase com configurações personalizadas
const isClient = typeof window !== 'undefined';
console.log(`Criando cliente Supabase: ${isClient ? 'client-side' : 'server-side'}`);

// Configurações específicas para cliente vs. servidor
const supabaseOptions = isClient ? {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // Alterando para false para evitar conflitos de URL
    debug: true,
    // Removendo storageKey e flowType que podem estar interferindo
    cookieOptions: {
      name: 'sb-auth',
      lifetime: 60 * 60 * 24 * 7, // 7 dias
      domain: '',
      path: '/',
      sameSite: 'lax',
      secure: false // Desativa HTTPS requirement para debug
    }
  }
} : {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    debug: true,
  }
};

// Cria o cliente Supabase com as opções apropriadas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Função para verificar a sessão
export async function checkSession() {
  try {
    console.log('[Supabase] Verificando sessão...');
    const { data, error } = await supabase.auth.getSession();
    
    // Verificar se a sessão é válida
    if (error) {
      console.error('[Supabase] Erro ao verificar sessão:', error.message);
      return {
        success: false,
        error: error.message,
        authenticated: false,
      };
    }
    
    if (!data.session) {
      console.log('[Supabase] Nenhuma sessão encontrada');
      return { 
        success: true, 
        authenticated: false,
        message: 'Nenhuma sessão encontrada'
      };
    }
    
    console.log('[Supabase] Sessão válida encontrada para:', data.session.user.email);
    console.log('[Supabase] Detalhes da sessão:', {
      userId: data.session.user.id,
      role: data.session.user.role,
      expiresAt: data.session.expires_at 
        ? new Date(data.session.expires_at * 1000).toLocaleString() 
        : 'desconhecido',
    });
    
    return {
      success: true,
      authenticated: true,
      user: data.session.user,
      session: data.session,
    };
  } catch (err) {
    console.error('[Supabase] Erro ao verificar sessão:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      authenticated: false,
    };
  }
}

// Função para fazer login com email/senha
export async function loginWithEmail(email: string, password: string) {
  try {
    console.log('[Supabase] Tentando login com email:', email);
    
    // Criar objeto FormData para debug
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', '*'.repeat(password.length)); // Não logue a senha real
    
    // Log do FormData para debug
    console.log('[Supabase] Dados do formulário:', {
      email,
      password: '*'.repeat(password.length), // Mostra apenas asteriscos para a senha
    });
    
    // Tente realizar o login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[Supabase] Erro de login:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    if (!data.session) {
      console.log('[Supabase] Login bem-sucedido, mas nenhuma sessão retornada.');
      return { 
        success: false, 
        error: 'Nenhuma sessão retornada após login bem-sucedido' 
      };
    }
    
    console.log('[Supabase] Login bem-sucedido para:', data.user?.email);
    console.log('[Supabase] Detalhes da sessão:', {
      accessToken: data.session.access_token ? `${data.session.access_token.substring(0, 10)}...` : 'não disponível',
      refreshToken: data.session.refresh_token ? `${data.session.refresh_token.substring(0, 10)}...` : 'não disponível',
      expiresAt: data.session.expires_at 
        ? new Date(data.session.expires_at * 1000).toLocaleString()
        : 'desconhecido',
    });
    
    // Adicionar flag no localStorage para identificar estado de autenticação
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_status', 'authenticated');
      console.log('[Supabase] Status de autenticação salvo no localStorage');
    }
    
    return { 
      success: true, 
      user: data.user,
      session: data.session,
    };
  } catch (err) {
    console.error('[Supabase] Erro durante login:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

// Função para fazer logout
export async function logout() {
  try {
    console.log('[Supabase] Iniciando logout...');
    
    // Verificar se temos cookies antes do logout
    if (typeof document !== 'undefined') {
      console.log('[Supabase] Cookies antes do logout:', document.cookie);
    }
    
    // Remover do localStorage antes do logout
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_status');
      console.log('[Supabase] Status de autenticação removido do localStorage');
    }
    
    // Realizar o logout
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Supabase] Erro ao fazer logout:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    // Verificar se temos cookies após o logout
    if (typeof document !== 'undefined') {
      console.log('[Supabase] Cookies após logout:', document.cookie);
    }
    
    console.log('[Supabase] Logout realizado com sucesso');
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Erro durante logout:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
} 