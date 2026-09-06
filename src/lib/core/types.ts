/**
 * OCTO8 - Core Types & PRD Models (v1.1)
 * This file defines the exact models specified in the Master PRD.
 */

// 1.1 SaaS & Multi-Tenancy
export interface Tenant {
  id: string;
  name: string;
  segment: 'ISP' | 'HEALTH' | 'FOOD' | 'RETAIL' | 'GENERIC';
  planId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED';
  createdAt: number;
}

export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  allowedModules: string[];
  featuresFlags: Record<string, boolean>;
}

export interface TenantEntitlement {
  tenantId: string;
  overrides: Record<string, boolean | number | string>;
}

// 1.2 RBAC & Hierarquia
export type RoleScope = 'TENANT' | 'DEPT' | 'TEAM' | 'SELF';

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
  scope: RoleScope;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  departmentId?: string;
}

// Extension to the AppUser in AuthContext
export interface UserContext {
  uid: string;
  tenantId: string;
  email: string | null;
  displayName: string | null;
  roleId: string;
  teamId?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// 1.3 Contact Center & Relacionamento
export interface Customer {
  id: string;
  tenantId: string;
  externalId?: string; // SGP ID or CRM ID
  name: string;
  document: string; // CPF / CNPJ
  segment?: string;
  healthScore?: number;
  tags: string[];
}

export type ConversationState = 'NEW' | 'AI_HANDLING' | 'HUMAN_REQUESTED' | 'ASSIGNED' | 'HUMAN_HANDLING' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface Conversation {
  id: string;
  tenantId: string;
  customerId: string;
  status: ConversationState;
  currentQueueId?: string;
  currentAgentId?: string;
  slaStatus: 'WITHIN_SLA' | 'NEAR_BREACH' | 'BREACHED';
}

export interface Interaction {
  id: string;
  conversationId: string;
  type: 'MSG' | 'CALL' | 'EVENT' | 'AI_ACTION';
  channel: string; // e.g., 'WHATSAPP', 'WEBPHONE', 'SYSTEM'
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  payload: any;
  timestamp: number;
}

// 2.3 Agent/Workforce State
export type AgentState = 'OFFLINE' | 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'ON_CALL' | 'PAUSED';

