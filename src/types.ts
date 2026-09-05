/**
 * Octo8 - Master Architecture Types (Fase 1 - Core)
 */

export type Role = 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'AGENT';

export type Capability = 
  | 'feature.whatsapp'
  | 'feature.instagram'
  | 'feature.webchat'
  | 'feature.telephony'
  | 'feature.ai.copilot'
  | 'feature.ai.agent'
  | 'feature.automation'
  | 'feature.crm';

export interface Tenant {
  id: string;
  name: string;
  segment: 'ISP' | 'CLINIC' | 'RETAIL' | 'FOOD' | 'OTHER';
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  capabilities: Capability[];
  status: 'ACTIVE' | 'SUSPENDED' | 'CHURN';
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  departments: string[];
  teams: string[];
  status: 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'ON_CALL' | 'PAUSED' | 'AWAY' | 'OFFLINE';
}

export interface Queue {
  id: string;
  tenantId: string;
  name: string;
  waiting: number;
  slaRisk: number;
  slaBreached: number;
  activeAgents: number;
}

export interface ChannelStatus {
  id: string;
  name: string;
  type: 'WHATSAPP' | 'INSTAGRAM' | 'WEBCHAT' | 'TELEPHONY';
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  activeConversations: number;
}

export type CallStatus = 'NEW' | 'RINGING' | 'ANSWERED' | 'ON_HOLD' | 'TRANSFERRING' | 'CONNECTED' | 'ENDED';
export interface Call {
  id: string;
  tenantId: string;
  caller: string;
  destination: string;
  queueId?: string;
  agentId?: string;
  status: CallStatus;
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  startTime: string;
  duration?: number;
  recordingUrl?: string;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: User['status'];
  currentCall?: Call;
  timeInStatus: string;
}
