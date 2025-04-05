/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    // Desabilita a verificação de ESLint durante o build
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Adicionando cabeçalhos CORS para permitir acesso externo
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Proxy para o webhook de ingressos para evitar CORS
      {
        source: '/api/ingressos/:path*',
        destination: `${process.env.NEXT_PUBLIC_WEBHOOK_INGRESSOS}/:path*`,
      },
      // Proxy para o webhook de eventos para evitar CORS
      {
        source: '/api/eventos/:path*',
        destination: `${process.env.NEXT_PUBLIC_WEBHOOK_EVENTOS}/:path*`,
      },
      // Proxy para o webhook de clientes para evitar CORS
      {
        source: '/api/cliente/:path*',
        destination: `${process.env.NEXT_PUBLIC_WEBHOOK_CLIENTE}/:path*`,
      },
      // Proxy para o webhook de emissão para evitar CORS
      {
        source: '/api/emissao/:path*',
        destination: `${process.env.NEXT_PUBLIC_WEBHOOK_EMISSAO}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig; 