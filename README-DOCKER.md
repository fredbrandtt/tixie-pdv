# Guia de Implantação do Tixie PDV com Docker e Portainer

Este guia detalha como implantar a aplicação Tixie PDV em um servidor usando Docker e Portainer.

## Pré-requisitos

- Servidor com Docker instalado
- Portainer instalado no servidor
- Acesso SSH ao servidor (opcional, mas recomendado para upload de arquivos)

## Método 1: Implantação via Portainer com Git

1. **Acesse o Portainer** no seu servidor (geralmente em `http://seu-servidor:9000`)

2. **Selecione o ambiente** onde deseja implantar (normalmente "local")

3. **Vá para "Stacks"** no menu lateral e clique em "Add stack"

4. **Escolha o método de implantação:**
   - Nome: `tixie-pdv`
   - Método: Repository Git
   - URL do repositório: `https://github.com/seu-usuario/tixie-pdv.git`
   - Referência (opcional): `main` (ou a branch desejada)
   - Caminho do Compose: `/docker-compose.yml`

5. **Configure as variáveis de ambiente:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://dhbrqxrbzmupijzmheuj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoYnJxeHJiem11cGlqem1oZXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MjIxNDEsImV4cCI6MjA1OTM5ODE0MX0.8ZLgChPNi5HYZN5_Aazl9xnIft22chqCZW_HNDaXjF4
   NEXT_PUBLIC_WEBHOOK_EVENTOS=https://n8nwebhook.vcrma.com.br/webhook/eventos
   NEXT_PUBLIC_WEBHOOK_INGRESSOS=https://n8nwebhook.vcrma.com.br/webhook/ingressos
   NEXT_PUBLIC_WEBHOOK_CLIENTE=https://n8nwebhook.vcrma.com.br/webhook/cliente
   NEXT_PUBLIC_WEBHOOK_EMISSAO=https://n8nwebhook.vcrma.com.br/webhook/emissao
   ```

6. **Clique em "Deploy the stack"**

7. Aguarde a conclusão do processo de implantação

## Método 2: Implantação via upload direto dos arquivos

1. **Clone o repositório** em sua máquina local:
   ```bash
   git clone https://github.com/seu-usuario/tixie-pdv.git
   cd tixie-pdv
   ```

2. **Comprima os arquivos necessários**:
   ```bash
   zip -r tixie-pdv.zip .
   ```

3. **Faça upload para o servidor** usando SCP:
   ```bash
   scp tixie-pdv.zip usuario@seu-servidor:/caminho/para/upload/
   ```

4. **Acesse o servidor via SSH**:
   ```bash
   ssh usuario@seu-servidor
   ```

5. **Extraia os arquivos**:
   ```bash
   cd /caminho/para/upload/
   unzip tixie-pdv.zip -d tixie-pdv
   cd tixie-pdv
   ```

6. **Inicie a aplicação com Docker Compose**:
   ```bash
   docker-compose up -d
   ```

7. **Verifique os logs** para garantir que a aplicação iniciou corretamente:
   ```bash
   docker-compose logs -f
   ```

## Método 3: Implantação via Portainer com arquivo Docker Compose

1. **Acesse o Portainer** no seu servidor

2. **Vá para "Stacks"** e clique em "Add stack"

3. **Escolha o método Web Editor**

4. **Copie o conteúdo do arquivo docker-compose.yml** e cole no editor

5. **Defina as variáveis de ambiente** conforme o Método 1

6. **Clique em "Deploy the stack"**

## Verificação da Implantação

1. **Verifique se o contêiner está em execução**:
   - No Portainer, vá para "Containers" 
   - Verifique se `tixie-pdv` está com status "Running"

2. **Acesse a aplicação** em seu navegador:
   ```
   http://seu-servidor:3000
   ```

## Solução de Problemas

### Erro ao construir a imagem
Verifique se há espaço suficiente no servidor e se as variáveis de ambiente estão configuradas corretamente.

```bash
# Verifique o espaço disponível
df -h

# Verifique os logs de build
docker-compose logs -f
```

### Aplicação não acessível
Verifique se a porta 3000 está exposta e acessível:

```bash
# Verifique se a porta está em uso
netstat -tuln | grep 3000

# Verifique as regras de firewall
sudo ufw status
```

### Erro de conexão com Supabase ou APIs
Verifique se as variáveis de ambiente estão configuradas corretamente no docker-compose.yml e se o servidor tem acesso à internet.

## Backups e Manutenção

### Backup dos dados
A aplicação utiliza o Supabase, então os dados são armazenados remotamente. Não é necessário backup local do banco de dados.

### Atualização da aplicação
Para atualizar a aplicação:

1. **No Portainer**, acesse a stack `tixie-pdv`
2. **Clique em "Editor"**
3. **Clique em "Pull and redeploy"** para obter a versão mais recente
4. Ou atualize manualmente o código e execute `docker-compose up -d --build`

### Monitoramento
Para monitorar o desempenho:

1. **No Portainer**, vá para "Containers" > `tixie-pdv`
2. **Acesse a aba "Stats"** para ver o uso de CPU, memória e rede

## Suporte

Em caso de dúvidas ou problemas, entre em contato:
- Email: [suporte@tixie.com.br](mailto:suporte@tixie.com.br)
- GitHub: [https://github.com/seu-usuario/tixie-pdv/issues](https://github.com/seu-usuario/tixie-pdv/issues) 