# Octo8 — AI-Powered Customer Engagement Platform

![Octo8 Platform](https://img.shields.io/badge/Status-Beta-emerald) ![React](https://img.shields.io/badge/React-18-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8) ![Vite](https://img.shields.io/badge/Vite-Bundler-646cff)

## Visão Geral

O **Octo8** é uma plataforma SaaS multitenant de Customer Engagement, Contact Center (VoIP), CRM, Automação e Inteligência Artificial, desenhada primariamente para Operadoras de Telecomunicações, Provedores de Internet (ISPs) e centrais de atendimento de alta performance. 

O sistema orquestra dados de faturamento, infraestrutura FTTH e canais de contato, empoderando o time de atendimento e vendas com um ecossistema nativo impulsionado pela IA (Google Gemini).

---

## 🚀 Módulos e Funcionalidades Core

### 1. Dashboard de Operações (Launchpad)
- Visão gerencial de KPIs: Nível de Serviço (SLA), Agentes Logados, Fila de Espera (URA) e Chamadas Simultâneas.
- Monitoramento de saúde dos Troncos SIP em tempo real (Latência, Canais Ativos).
- Tracking de Eventos Recentes: transferências falhas, abandono de fila.
- **Launchpad Cross-Módulo**: Atalhos parametrizados diretos para Webphone, Monitoramento de Filas e Gravações de Áudio.

### 2. Contact Center e WebRTC (Telefonia)
- Softphone WebRTC embutido (Webphone) com controles de Mute, Hold e Transferência de chamadas (Blind/Attended).
- Filas de Espera em tempo real e monitoramento ativo por supervisão.
- CDR (Call Detail Record) detalhado, escuta de gravações com waveform interativo (velocidade e progresso).
- **Integração Click-to-Call**: Recebe parâmetros via URL (`?dial=numero`) a partir de todos os módulos.

### 3. Omnichannel Inbox
- Interface em 3 colunas (3-pane layout) para centralização de WhatsApp, Webchat e SMS.
- Transferência entre agentes, categorização por fila.
- Insights gerados por IA em tempo real para cada conversa (Sentimento, Resumo, Sugestão de Resposta).
- Atalho via URL (`?customer=nome`) para abertura de conversas direcionadas a partir do Customer 360.

### 4. Customer 360 (Visão do Assinante)
- Visão holística: Cadastro, contratos, faturas, consumo de dados e ordens de serviço.
- Diagnóstico FTTH (Sinal Óptico RX/TX, Status da ONU).
- Autenticação e bloqueios, histórico financeiro (PIX, Boleto).
- Ações Rápidas integradas: Ligar para o cliente (Webphone) ou enviar WhatsApp (Omnichannel).

### 5. CRM de Vendas (Funil & Pipeline)
- Pipeline em Kanban focado em leads B2B e Upgrades de base.
- Timeline histórica de interações.
- Disparo dinâmico de chamadas direto do perfil do tomador de decisão da oportunidade.

### 6. IA, Automação & RAG (Knowledge Base)
- **AI Automation Hub**: Construtor visual de URAs e fluxos de atendimento via chat (Drag-and-drop de nós).
- **Knowledge Base (RAG)**: Gestão de manuais (Ex: Roteiros FTTH, Pitch de Vendas, Financeiro).
- Sincronização automatizada e extração de embeddings no motor de RAG alimentado pelo Gemini.

### 7. Analytics e Relatórios de Produtividade
- Visão detalhada do TMA, TME, FCR e CSAT, cruzando performance humana com IA.
- Gráficos de Categorização Semântica (Donut Charts): Identifica e qualifica motivos de contato em tempo real via classificação IA.
- Geração e exportação instantânea de arquivos CDR.

---

## 🧩 Arquitetura Técnica

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts para visualização de dados.
- **Backend Integrado**: Express Server (`server.ts`) embutido para manipulação de rotas seguras e bundling via `esbuild`.
- **Database & Identity**: Integração inicial configurada com Firebase (Firestore e Authentication).
- **Design System**: Mobile-first fluido com utilitários de animações (`animate-in fade-in`), componentes modulares modais expansivos (Drawers).
- **Deep Linking e Estado Compartilhado**: Amplo uso de `react-router-dom` (`useSearchParams`, `useNavigate`) para orquestração modular (ex: CRM chamando Telefonia, Dashboard chamando CDR).

---

## ⚙️ Como Executar o Projeto

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
# Copie o arquivo .env.example para .env e preencha a API key do Gemini
cp .env.example .env

# 3. Inicialize o servidor de desenvolvimento full-stack
npm run dev

# 4. Crie o bundle de produção
npm run build

# 5. Inicie o servidor final compilado
npm run start
```

## 🛠 Status e Roadmap

- [x] UX/UI Completa dos módulos Core e roteamento dinâmico.
- [x] Lógicas cross-módulos (Click-to-call e Omnichannel Linking).
- [x] Configuração Node Express + SSR / Vite Middleware.
- [x] Setup do Provider Authentication e estrutura de Tenants.
- [ ] Implementação Real das WebRTC APIs (SIP.js ou similar).
- [ ] Integração ativa final com o backend Firebase Firestore e SDK oficial do @google/genai.

