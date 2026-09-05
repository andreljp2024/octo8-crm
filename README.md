# Octo8 — Customer Engagement Platform

## Visão Geral
O Octo8 é uma plataforma SaaS multitenant de Customer Engagement, Contact Center, CRM, Automação e Inteligência Artificial, capaz de atuar de forma receptiva, ativa ou híbrida através de múltiplos canais.

## Status Atual do Desenvolvimento
**MVP — Fase 0 e Fase 1 (Fundação & Core Frontend)**
- [x] Setup inicial da aplicação (React, Vite, TypeScript, TailwindCSS).
- [x] Estrutura de roteamento SPA (React Router).
- [x] Layout Base (`AppLayout`) com menu de navegação e barra superior.
- [x] Seletor de Tenant (Contexto Multitenant visual).
- [x] Dashboard Operacional com KPIs em Tempo Real, status de Filas e Canais.
- [x] Configuração de Deploy para Vercel (`vercel.json`).

## Como Executar Localmente

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev

# Fazer o build de produção
npm run build
```

## Deploy (Vercel)
O projeto contém um arquivo `vercel.json` configurado na raiz para lidar com o roteamento SPA e evitar erros 404 em recarregamentos de página (fallback route).
1. Faça o commit ou exporte este código para um repositório no GitHub.
2. Acesse sua conta no Vercel e clique em "Add New Project".
3. Importe o repositório. O Vercel detectará automaticamente o framework Vite e realizará o build com a configuração correta.

## Princípios Arquiteturais Aplicados
Este repositório segue os princípios do documento **OCTO8 — MASTER ARCHITECTURE v1.0**:
- **Multitenancy por padrão:** O frontend já contempla a exibição e estruturação baseada no Tenant ativo.
- **Core independente de segmento:** O Dashboard e as páginas são construídos de forma neutra, permitindo adaptação via configuração (Segment Profiles).
- **Sem "AI Slop" (Banned Patterns):** UI construída com componentes limpos (Tailwind), paleta de cores neutras de alta legibilidade, espaçamentos matemáticos consistentes e design orientado a operações e produtividade.

## Documentação de Decisões de Arquitetura (ADRs)
As decisões de arquitetura técnica são mantidas na pasta `/docs/adr/`.
