# Octo8 — Customer Engagement Platform

## Visão Geral
O Octo8 é uma plataforma SaaS multitenant de Customer Engagement, Contact Center, CRM, Automação e Inteligência Artificial.

## Status Atual do Desenvolvimento

**Fase 0 e Fase 1 (Core Frontend) — CONCLUÍDAS**
- [x] Layout Base (`AppLayout`) com menu de navegação e seletor multitenant.
- [x] Dashboard Operacional focado em **VoIP & Contact Center**.
- [x] **Omnichannel Workspace:** Interface 3-pane para chat unificado.
- [x] **Contact Center / Telefonia:** Webphone funcional e monitoria de filas.
- [x] **Customer 360 e CRM:** Gestão de pipeline e visão centralizada do cliente.
- [x] **Inteligência & Automação:** Hub de configuração visual de agentes IA.
- [x] **Configurações do Tenant:** Status de conexões de PBX/SGP e logs do servidor.
- [x] **Knowledge Base (RAG):** Gestão de artigos e sincronização com banco vetorial IA.
- [x] **Relatórios & Analytics:** Gráficos interativos (Recharts) para volume e aderência de SLA.

**Fase 2 (Fundação Full-Stack & APIs) — EM ANDAMENTO**
- [x] Servidor Express configurado (`server.ts`).
- [x] Middleware do Vite acoplado para HMR.
- [x] Scripts de Build (`esbuild`) adaptados para produção (`server.cjs`).
- [x] Rota Base API (`/api/health`) operante.
- [ ] Conexão com Banco de Dados (Cloud SQL / Postgres).
- [ ] Motor de Integração RAG (Gemini API SDK).

## Como Executar Localmente
```bash
npm install
npm run dev
npm run build
```
