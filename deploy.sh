#!/bin/bash

# Script de implantação para o Tixie PDV

echo "Iniciando implantação do Tixie PDV..."

# Verifica se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker não encontrado. Instale o Docker antes de prosseguir."
    exit 1
fi

# Verifica se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não encontrado. Instale o Docker Compose antes de prosseguir."
    exit 1
fi

# Verifica se existe o arquivo .env.local
if [ ! -f .env.local ]; then
    echo "Arquivo .env.local não encontrado. Criando a partir de .env.example..."
    
    # Cria o arquivo .env.local com as configurações padrão
    cat > .env.local << EOL
# Variáveis de ambiente para autenticação Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dhbrqxrbzmupijzmheuj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4

# URLs dos webhooks
NEXT_PUBLIC_WEBHOOK_EVENTOS=https://n8nwebhook.vcrma.com.br/webhook/eventos
NEXT_PUBLIC_WEBHOOK_INGRESSOS=https://n8nwebhook.vcrma.com.br/webhook/ingressos
NEXT_PUBLIC_WEBHOOK_CLIENTE=https://n8nwebhook.vcrma.com.br/webhook/cliente
NEXT_PUBLIC_WEBHOOK_EMISSAO=https://n8nwebhook.vcrma.com.br/webhook/emissao
EOL
    
    echo "Arquivo .env.local criado com sucesso."
fi

# Para todos os contêineres existentes do Tixie PDV
echo "Parando contêineres existentes..."
docker-compose down

# Remove as imagens antigas se existirem
echo "Removendo imagens antigas..."
docker rmi tixie-pdv:latest 2>/dev/null || true

# Constrói a nova imagem
echo "Construindo nova imagem..."
docker-compose build

# Inicia os contêineres
echo "Iniciando aplicação..."
docker-compose up -d

# Verifica se a aplicação está rodando
echo "Verificando status da aplicação..."
sleep 5
if docker-compose ps | grep -q "Up"; then
    echo "Aplicação iniciada com sucesso!"
    echo "Acesse a aplicação em: http://localhost:3000"
else
    echo "Erro ao iniciar a aplicação. Verifique os logs com 'docker-compose logs'"
fi

# Exibe os logs
echo "Exibindo logs recentes:"
docker-compose logs --tail=20

echo "Implantação concluída!" 