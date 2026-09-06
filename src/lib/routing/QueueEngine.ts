import { ConversationState, AgentState, Conversation } from '../core/types';
import { adminDb } from '../../server/firebaseAdmin';

export interface QueuedInteraction {
  id: string; // Maps to Conversation ID
  tenantId: string;
  type: string; // 'WHATSAPP' | 'WEBCHAT' | 'VOICE'
  customerId: string;
  skillRequired?: string;
  priority: number;
  enqueueTime: number;
  status: ConversationState;
  assignedAgentId?: string;
  slaLimitTime: number; // For SLA Engine tracking
  slaStatus: 'WITHIN_SLA' | 'NEAR_BREACH' | 'BREACHED';
}

export interface AgentWorkforce {
  agentId: string;
  tenantId: string;
  status: AgentState;
  skills: string[];
  currentCapacity: number;
  maxCapacity: number;
  lastAssignedTime: number; // For longest-idle routing
}

export class QueueEngine {
  private queues: Map<string, QueuedInteraction[]> = new Map();
  private agents: Map<string, AgentWorkforce> = new Map();
  private assignedInteractions: Map<string, QueuedInteraction[]> = new Map(); // tenantId -> assignments
  private slaInterval: NodeJS.Timeout | null = null;
  private db = adminDb;

  constructor() {
    console.log('[QueueEngine] Initialized Multitenant Routing Engine with Firestore Sync');
    this.startSlaEngine();
  }

  // Helper to persist queue state to Firestore
  private async persistInteraction(interaction: QueuedInteraction) {
    try {
      await this.db.collection(`tenants/${interaction.tenantId}/interactions`).doc(interaction.id).set(interaction, { merge: true });
    } catch (e) {
      console.error(`[QueueEngine] Failed to persist interaction ${interaction.id}:`, e);
    }
  }

  // SLA Engine: Runs periodically to check for SLA breaches
  private startSlaEngine() {
    if (this.slaInterval) clearInterval(this.slaInterval);
    this.slaInterval = setInterval(() => {
      const now = Date.now();
      for (const [tenantId, queue] of this.queues.entries()) {
        let queueUpdated = false;
        for (const interaction of queue) {
          if (interaction.status === 'HUMAN_REQUESTED') {
            const timeElapsed = now - interaction.enqueueTime;
            const timeLeft = interaction.slaLimitTime - now;
            
            if (timeLeft <= 0 && interaction.slaStatus !== 'BREACHED') {
              interaction.slaStatus = 'BREACHED';
              interaction.priority += 10; // Bump priority on breach
              queueUpdated = true;
              console.log(`[SLA Engine] ALERT: Tenant ${tenantId} Conversation ${interaction.id} BREACHED SLA!`);
              this.persistInteraction(interaction);
            } else if (timeLeft > 0 && timeLeft <= 60000 && interaction.slaStatus === 'WITHIN_SLA') {
              // 1 min to breach
              interaction.slaStatus = 'NEAR_BREACH';
              interaction.priority += 5;
              queueUpdated = true;
              this.persistInteraction(interaction);
            }
          }
        }
        if (queueUpdated) {
          // Re-sort queue if priorities changed
          queue.sort((a, b) => b.priority - a.priority || a.enqueueTime - b.enqueueTime);
        }
      }
    }, 10000); // Check every 10s
  }

  public updateAgentStatus(agent: AgentWorkforce): void {
    this.agents.set(agent.agentId, agent);
    // Also persist agent state to Firestore
    this.db.collection(`tenants/${agent.tenantId}/agents`).doc(agent.agentId).set(agent, { merge: true }).catch(console.error);
    this.processQueues(agent.tenantId);
  }

  public enqueueInteraction(interaction: Omit<QueuedInteraction, 'slaStatus' | 'slaLimitTime'>): void {
    const tenantQueue = this.queues.get(interaction.tenantId) || [];
    
    const newInteraction: QueuedInteraction = {
      ...interaction,
      slaLimitTime: interaction.enqueueTime + (5 * 60 * 1000), // Default 5 min SLA for Human Response
      slaStatus: 'WITHIN_SLA'
    };

    tenantQueue.push(newInteraction);
    tenantQueue.sort((a, b) => b.priority - a.priority || a.enqueueTime - b.enqueueTime);
    
    this.queues.set(interaction.tenantId, tenantQueue);
    console.log(`[QueueEngine] Conversation ${interaction.id} QUEUED for Tenant ${interaction.tenantId}`);
    
    // Persist to DB
    this.persistInteraction(newInteraction);
    
    this.processQueues(interaction.tenantId);
  }

  private processQueues(tenantId: string): void {
    const queue = this.queues.get(tenantId);
    if (!queue || queue.length === 0) return;

    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.tenantId === tenantId && 
           a.status === 'AVAILABLE' && 
           a.currentCapacity < a.maxCapacity
    );

    if (availableAgents.length === 0) return;

    for (let i = 0; i < queue.length; i++) {
      const interaction = queue[i];
      if (interaction.status !== 'HUMAN_REQUESTED') continue;

      const bestAgent = availableAgents
        .filter(a => !interaction.skillRequired || a.skills.includes(interaction.skillRequired))
        .sort((a, b) => a.lastAssignedTime - b.lastAssignedTime)[0];

      if (bestAgent) {
        interaction.status = 'ASSIGNED';
        interaction.assignedAgentId = bestAgent.agentId;
        
        bestAgent.currentCapacity += 1;
        bestAgent.lastAssignedTime = Date.now();
        if (bestAgent.currentCapacity >= bestAgent.maxCapacity) {
          bestAgent.status = 'BUSY';
        }

        console.log(`[QueueEngine] ACD: Routed ${interaction.id} to Agent ${bestAgent.agentId}`);
        
        // Persist interaction and agent state
        this.persistInteraction(interaction);
        this.db.collection(`tenants/${tenantId}/agents`).doc(bestAgent.agentId).set(bestAgent, { merge: true }).catch(console.error);
        
        // Move to assigned map
        const assignedList = this.assignedInteractions.get(tenantId) || [];
        assignedList.push(interaction);
        this.assignedInteractions.set(tenantId, assignedList);

        queue.splice(i, 1);
        i--;
      }
    }
  }

  public getQueueMetrics(tenantId: string) {
    const queue = this.queues.get(tenantId) || [];
    const slaBreached = queue.filter(q => q.slaStatus === 'BREACHED').length;
    return {
      waitingInteractions: queue.length,
      longestWaitTime: queue.length > 0 ? Date.now() - queue[0].enqueueTime : 0,
      slaBreached
    };
  }

  public getAssignedInteractions(agentId: string, tenantId: string): QueuedInteraction[] {
    const assignedList = this.assignedInteractions.get(tenantId) || [];
    return assignedList.filter(i => i.assignedAgentId === agentId);
  }
}

export const globalQueueEngine = new QueueEngine();
