import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  return res
}

// Configurar quais rotas o middleware deve interceptar
export const config = {
  matcher: ['/pdv/:path*', '/login', '/']
} 