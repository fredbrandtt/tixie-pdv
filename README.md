# Tixie PDV

Sistema de PDV (Ponto de Venda) para emissão de ingressos, desenvolvido com Next.js 14.

## Tecnologias Utilizadas

- Next.js 14
- TypeScript
- Tailwind CSS
- Zustand (Gerenciamento de Estado)
- Framer Motion (Animações)

## Funcionalidades

- Emissão de ingressos
- Geração de PDF do ingresso
- Interface moderna e responsiva
- Validação de dados do cliente
- Gestão de estado com Zustand
- Feedback visual em tempo real

## Como Executar

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/tixie-pdv.git
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
```env
NEXT_PUBLIC_API_URL=sua_url_api
```

4. Execute o projeto em desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

5. Acesse `http://localhost:3000` no seu navegador.

## Estrutura do Projeto

```
src/
  ├── app/           # Páginas e rotas
  ├── components/    # Componentes reutilizáveis
  ├── services/      # Serviços e APIs
  ├── store/         # Gerenciamento de estado
  └── styles/        # Estilos globais
```

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
