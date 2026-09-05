# Octo8 — Customer Engagement Platform

## Visão Geral
O Octo8 é uma plataforma SaaS multitenant de Customer Engagement, Contact Center, CRM, Automação e Inteligência Artificial, capaz de atuar de forma receptiva, ativa ou híbrida através de múltiplos canais.

## Reconstrução do Ambiente (Incident Recovery)
Os arquivos `Dashboard.tsx`, `AppLayout.tsx` e componentes analíticos que foram comprometidos durante a revisão foram **restaurados, corrigidos e aprimorados** com foco total em métricas vitais para um Contact Center VoIP (ASR, ACD, SIP Trunks, Filas de URA, SLA).

O `AppLayout.tsx` foi reconstruído do zero, reconectando todas as rotas (CRM, Customer 360, Knowledge Base, Omnichannel, Reports, etc.) e o projeto compila perfeitamente.

## Status Atual do Desenvolvimento
**MVP — Fase 0 e Fase 1 (Fundação & Core Frontend)**
- [x] Setup inicial e roteamento protegido (React Router).
- [x] Layout Base (`AppLayout`) reconstruído e validado.
- [x] Dashboard Operacional focado em **VoIP & Contact Center** (KPIs de URA, SIP Trunk Health, Chamadas Simultâneas).
- [x] Módulo `StatsOverview` com **Recharts** analisando ASR (Answer Seizure Ratio) e volume de chamadas vs fila de espera.
- [x] Omnichannel Workspace (Chat unificado e histórico).
- [x] Customer 360 e CRM.

## Como Executar Localmente
```bash
npm install
npm run dev
npm run build
```
