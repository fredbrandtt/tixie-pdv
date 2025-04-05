# Estágio de build
FROM node:20-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm ci

# Copia o restante dos arquivos
COPY . .

# Configura as variáveis de ambiente para o build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WEBHOOK_EVENTOS
ARG NEXT_PUBLIC_WEBHOOK_INGRESSOS
ARG NEXT_PUBLIC_WEBHOOK_CLIENTE
ARG NEXT_PUBLIC_WEBHOOK_EMISSAO

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_WEBHOOK_EVENTOS=$NEXT_PUBLIC_WEBHOOK_EVENTOS
ENV NEXT_PUBLIC_WEBHOOK_INGRESSOS=$NEXT_PUBLIC_WEBHOOK_INGRESSOS
ENV NEXT_PUBLIC_WEBHOOK_CLIENTE=$NEXT_PUBLIC_WEBHOOK_CLIENTE
ENV NEXT_PUBLIC_WEBHOOK_EMISSAO=$NEXT_PUBLIC_WEBHOOK_EMISSAO

# Executa o build
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS runner

# Diretório de trabalho
WORKDIR /app

# Define variáveis de ambiente para produção
ENV NODE_ENV production

# Adiciona usuário não-root para execução da aplicação
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos de build necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Configura as variáveis de ambiente para a execução
ENV NEXT_PUBLIC_SUPABASE_URL=https://dhbrqxrbzmupijzmheuj.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4

# Configura permissões
USER nextjs

# Expõe a porta 3000
EXPOSE 3000

# Define a variável de ambiente para o host
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 