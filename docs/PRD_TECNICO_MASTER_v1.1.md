# OCTO8 - PRD TÉCNICO MASTER v1.1

Este documento traduz a Arquitetura Master em especificações executáveis, servindo como a fonte de verdade absoluta para o desenvolvimento de todas as fases do Octo8.

## 1. MODELO DE DADOS DEFINITIVO (Core Entities)

### 1.1. SaaS & Multi-Tenancy
- **Tenant:** Entidade raiz. (id, name, segment, planId, status, createdAt)
- **Plan:** Define limites e capabilities (id, name, maxUsers, allowedModules, featuresFlags)
- **TenantEntitlement:** Overrides granulares (tenantId, overrides)

### 1.2. RBAC & Hierarquia
- **User:** (id, tenantId, name, email, roleId, teamId, status)
- **Role/Profile:** (id, tenantId, name, permissions: string[], scope: 'TENANT' | 'DEPT' | 'TEAM' | 'SELF')
- **Team:** (id, tenantId, name, departmentId)

### 1.3. Contact Center & Relacionamento
- **Customer:** Identidade unificada. (id, tenantId, externalId, name, document, segment, healthScore, tags)
- **Conversation:** A jornada macro. (id, tenantId, customerId, status, currentQueueId, currentAgentId, slaStatus)
- **Interaction:** Mensagem/Evento/Call. (id, conversationId, type: 'MSG'|'CALL'|'EVENT'|'AI_ACTION', channel, direction, payload, timestamp)

## 2. MÁQUINA DE ESTADOS (State Machines)

### 2.1. Conversation State Machine
\`NEW\` -> \`AI_HANDLING\` (se IA ativa) -> \`HUMAN_REQUESTED\` -> \`ASSIGNED\` -> \`HUMAN_HANDLING\` -> \`WAITING_CUSTOMER\` -> \`RESOLVED\` -> \`CLOSED\`

### 2.2. Call State Machine (WebRTC/Telefonia)
\`NEW\` -> \`RINGING\` -> \`ANSWERED\` -> \`ON_HOLD\` -> \`TRANSFERRING\` -> \`CONNECTED\` -> \`ENDED\`

### 2.3. Agent/Workforce State
\`OFFLINE\` <-> \`ONLINE\` (Status base)
Se ONLINE: \`AVAILABLE\` <-> \`BUSY\` <-> \`ON_CALL\` <-> \`PAUSED\`

## 3. ROUTING & QUEUE ENGINE
- **Routing Engine:** Avalia Canal -> Departamento -> Horário -> Prioridade -> Skill.
- **Queue:** FIFO por prioridade com algoritmo de Least Occupied Agent.
- **SLA Engine:** Jobs assíncronos (Redis/Cron) marcando conversas como \`NEAR_BREACH\` ou \`BREACHED\` baseado no \`First Response\` e \`Resolution Time\` do contrato.

## 4. MOTOR ATIVO/RECEPTIVO & POLICY ENGINE
- **Receptivo:** Trigger = Webhook do Canal. Bypass de Outbound Policy.
- **Ativo (Outbound):** 
  Trigger -> \`Eligibility Check\` (Plano/Módulo) -> \`Tenant Policy\` (Horário Comercial) -> \`Frequency Control\` (Rate Limit) -> \`Channel Policy\` (Meta Templates) -> Execução.

## 5. INTEGRAÇÃO & IA (Governança)
### 5.1. AI Governance
- Nível 0 a Nível 4. Ferramentas de Alto Risco (ex: Cancelar Contrato, Emitir Reembolso) requerem \`Approval\` explícito (Human-in-the-loop).
- A IA nunca faz chamadas HTTP diretas. Ela invoca a \`Tool\` -> \`Policy Engine\` -> \`Integration Hub\`.

### 5.2. Integration Hub & Adapters
- **SGP Adapter Interface:** \`getCustomer()\`, \`getConnectionStatus()\`, \`getInvoices()\`
- **PBX Adapter Interface:** \`getExtensions()\`, \`originateCall()\`, \`transferCall()\`
- Falhas em Adapters disparam \`Degraded Mode\` no Octo8 (atendimento continua operando sem dados do sistema externo).

## 6. CRITÉRIOS DE ACEITE - MVP (Próximos Passos Reais)
1. Autenticação e isolamento Multi-tenant garantidos no backend.
2. CRUD de Usuários com RBAC (Admin, Supervisor, Agente).
3. Recebimento e Envio de mensagens Omnichannel (Mock/Webhook).
4. Tela de Customer 360 consumindo dados via Adapter abstrato (SGP).
5. IA rodando restrita ao Tool Registry (apenas consulta no MVP).
