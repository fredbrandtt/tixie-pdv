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

# Configura as variáveis de ambiente para o build - valores padrão definidos diretamente
ENV NEXT_PUBLIC_SUPABASE_URL=https://dhbrqxrbzmupijzmheuj.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4
ENV NEXT_PUBLIC_WEBHOOK_EVENTOS=https://n8nwebhook.vcrma.com.br/webhook/e34f276f-9b54-4009-abbe-6289302ad705
ENV NEXT_PUBLIC_WEBHOOK_INGRESSOS=https://n8nwebhook.vcrma.com.br/webhook/d4bfcce3-1d5c-4654-96dc-fd69f00d76a9
ENV NEXT_PUBLIC_WEBHOOK_CLIENTE=https://n8nwebhook.vcrma.com.br/webhook/945e47f2-4123-4ee5-8302-fa3a61a6990f
ENV NEXT_PUBLIC_WEBHOOK_EMISSAO=https://n8nwebhook.vcrma.com.br/webhook/63bb2af6-af79-4670-9ebd-8c4ff226e865
ENV NEXT_PUBLIC_WEBHOOK_PDF_STATUS=https://n8nwebhook.vcrma.com.br/webhook/check-pdf-status

# Executa o build
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS runner

# Diretório de trabalho
WORKDIR /app

# Define variáveis de ambiente para produção
ENV NODE_ENV=production

# Adiciona usuário não-root para execução da aplicação
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Instala dependências de produção apenas
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copia arquivos de build necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Configura as variáveis de ambiente para a execução
ENV NEXT_PUBLIC_SUPABASE_URL=https://dhbrqxrbzmupijzmheuj.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4
ENV NEXT_PUBLIC_WEBHOOK_EVENTOS=https://n8nwebhook.vcrma.com.br/webhook/e34f276f-9b54-4009-abbe-6289302ad705
ENV NEXT_PUBLIC_WEBHOOK_INGRESSOS=https://n8nwebhook.vcrma.com.br/webhook/d4bfcce3-1d5c-4654-96dc-fd69f00d76a9
ENV NEXT_PUBLIC_WEBHOOK_CLIENTE=https://n8nwebhook.vcrma.com.br/webhook/945e47f2-4123-4ee5-8302-fa3a61a6990f
ENV NEXT_PUBLIC_WEBHOOK_EMISSAO=https://n8nwebhook.vcrma.com.br/webhook/63bb2af6-af79-4670-9ebd-8c4ff226e865
ENV NEXT_PUBLIC_WEBHOOK_PDF_STATUS=https://n8nwebhook.vcrma.com.br/webhook/check-pdf-status

# Configura permissões para os arquivos copiados
RUN chown -R nextjs:nodejs /app

# Usa o usuário não-root para rodar a aplicação
USER nextjs

# Melhora a segurança removendo variáveis desnecessárias
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Expõe a porta 3000
EXPOSE 3000

# Define a variável de ambiente para o host
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Verifica integridade
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/ || exit 1

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 