import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Obtém o caminho atual
  const path = req.nextUrl.pathname;
  
  // Verifica se existe cookie de autenticação
  const authCookie = req.cookies.get('sb-access-token') || 
                     req.cookies.get('sb-refresh-token') ||
                     req.cookies.get('sb-auth');
  
  // Verificação de autenticação extremamente simples baseada apenas na presença de cookies
  const isAuthenticated = !!authCookie;
  
  // Lógica de redirecionamento
  if (path === '/login' && isAuthenticated) {
    // Verifica se há um parâmetro de timestamp (ts) na URL, o que indica uma solicitação
    // deliberada para acessar a página de login (geralmente após um logout forçado)
    const tsParameter = req.nextUrl.searchParams.get('ts');
    
    if (tsParameter) {
      console.log('[Middleware] Permitindo acesso ao login com parâmetro ts:', tsParameter);
      return NextResponse.next();
    }
    
    // Usuário já autenticado tentando acessar login
    console.log('[Middleware] Usuário autenticado tentando acessar login, redirecionando para /pdv');
    return NextResponse.redirect(new URL('/pdv', req.url));
  }
  
  if (path.startsWith('/pdv') && !isAuthenticated) {
    // Usuário não autenticado tentando acessar área restrita
    console.log('[Middleware] Usuário não autenticado tentando acessar área restrita, redirecionando para /login');
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Permitir acesso a todas as outras rotas
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve interceptar
export const config = {
  matcher: ['/pdv/:path*', '/login']
} 