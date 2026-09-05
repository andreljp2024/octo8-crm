# ADR 001: Implementação Inicial do Contexto Multitenant (Frontend)

**Status:** Aprovado
**Data:** 05/09/2026

## Contexto
O Octo8 exige que a arquitetura seja "Multitenancy por padrão" (Seção 3.1 da Master Architecture v1.0). Todos os dados e as capacidades funcionais (Entitlements) são regidos pelo Tenant ao qual o usuário está autenticado. Para refletir isso adequadamente no frontend, precisamos de uma estrutura que injete e respeite o contexto do Tenant ativo antes de renderizar painéis, filas ou interações.

## Decisão
Foi implementada uma estrutura de Types (`/src/types.ts`) e um componente de layout (`AppLayout.tsx`) que atua como o Container principal de injeção de Tenant.
1. O estado de `Tenant` possui a propriedade `capabilities` (ex: `feature.whatsapp`, `feature.telephony`), que futuramente controlará a renderização de menus e blocos visuais.
2. O seletor de Tenant fica fixo no *header*, garantindo que o usuário, se pertencer a múltiplos Tenants ou atuar como Platform Admin, sempre saiba sob qual contexto os dados estão sendo manipulados.
3. Não há dependência de rotas parametrizadas (ex: `/:tenant_id/dashboard`) para o usuário final, mantendo a URL limpa (`/`), enquanto o contexto é gerenciado no estado da aplicação.

## Consequências
* **Positivas:** A UI está aderente ao princípio de multitenância e segmentação comercial. Os dados de exibição do Dashboard (Filas e Canais) já possuem o `tenantId` referenciado.
* **Negativas:** Exigirá a implementação futura de um Context API (React Context) ou state manager (Zustand/Redux) robusto no frontend assim que integrarmos com o backend para propagar o `Tenant ID` em todas as requisições API (via Headers).
