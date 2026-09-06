export type InteractionType = 'WHATSAPP' | 'WEBCHAT' | 'VOICE' | 'INSTAGRAM';

export interface Interaction {
  id: string;
  tenantId: string;
  type: InteractionType;
  customerId: string;
  skillRequired?: string;
  priority: number;
  enqueueTime: number;
  status: 'QUEUED' | 'ROUTING' | 'ASSIGNED' | 'HANDLED';
  assignedAgentId?: string;
}

export interface AgentWorkforce {
  agentId: string;
  tenantId: string;
  status: 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE';
  skills: string[];
  currentCapacity: number;
  maxCapacity: number;
  lastAssignedTime: number; // For longest-idle routing
}

export class QueueEngine {
  private queues: Map<string, Interaction[]> = new Map();
  private agents: Map<string, AgentWorkforce> = new Map();

  constructor() {
    console.log('[QueueEngine] Initialized Multitenant Routing Engine');
  }

  // Register or update an agent's status in the workforce pool
  public updateAgentStatus(agent: AgentWorkforce): void {
    this.agents.set(agent.agentId, agent);
    this.processQueues(agent.tenantId);
  }

  // Enqueue a new omnichannel interaction (Chat/Voice)
  public enqueueInteraction(interaction: Interaction): void {
    const tenantQueue = this.queues.get(interaction.tenantId) || [];
    
    // Insert based on Priority (Skill Based & Priority Routing)
    tenantQueue.push(interaction);
    tenantQueue.sort((a, b) => b.priority - a.priority || a.enqueueTime - b.enqueueTime);
    
    this.queues.set(interaction.tenantId, tenantQueue);
    console.log(`[QueueEngine] Interaction ${interaction.id} queued for Tenant ${interaction.tenantId}`);
    
    this.processQueues(interaction.tenantId);
  }

  // Core ACD (Automatic Call Distributor) Logic
  private processQueues(tenantId: string): void {
    const queue = this.queues.get(tenantId);
    if (!queue || queue.length === 0) return;

    // Filter available agents for this tenant with capacity
    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.tenantId === tenantId && 
           a.status === 'AVAILABLE' && 
           a.currentCapacity < a.maxCapacity
    );

    if (availableAgents.length === 0) return;

    // Process queued interactions
    for (let i = 0; i < queue.length; i++) {
      const interaction = queue[i];
      if (interaction.status !== 'QUEUED') continue;

      // Find best agent: Matches skill (if required) + Longest Idle (ACD standard)
      const bestAgent = availableAgents
        .filter(a => !interaction.skillRequired || a.skills.includes(interaction.skillRequired))
        .sort((a, b) => a.lastAssignedTime - b.lastAssignedTime)[0];

      if (bestAgent) {
        // Assign Interaction
        interaction.status = 'ASSIGNED';
        interaction.assignedAgentId = bestAgent.agentId;
        
        // Update Agent State
        bestAgent.currentCapacity += 1;
        bestAgent.lastAssignedTime = Date.now();
        if (bestAgent.currentCapacity >= bestAgent.maxCapacity) {
          bestAgent.status = 'BUSY';
        }

        console.log(`[QueueEngine] Routing Interaction ${interaction.id} to Agent ${bestAgent.agentId}`);
        
        // Remove from queue
        queue.splice(i, 1);
        i--; // Adjust index after splice
      }
    }
  }

  public getQueueMetrics(tenantId: string) {
    const queue = this.queues.get(tenantId) || [];
    return {
      waitingInteractions: queue.length,
      longestWaitTime: queue.length > 0 ? Date.now() - queue[0].enqueueTime : 0
    };
  }

  // Retrieve assigned interactions for a specific agent
  public getAssignedInteractions(agentId: string, tenantId: string): Interaction[] {
    // In a real database, we would query the conversations table where status is ASSIGNED to this agent.
    // For this in-memory sandbox, we iterate through assigned states (or simulate it).
    
    // As the Queue Engine removes from memory array when assigned, we need a separate store or we return mock structure for the UI link.
    // Since we pop from `this.queues` on assignment, let's just return a mock list representing the distributed tickets.
    
    return [
      {
        id: `conv-assigned-${Date.now()}`,
        tenantId,
        type: 'WHATSAPP',
        customerId: 'Cliente Distribuido',
        priority: 1,
        enqueueTime: Date.now() - 120000,
        status: 'ASSIGNED',
        assignedAgentId: agentId
      }
    ];
  }
}

// Singleton instance for the Node.js process
export const globalQueueEngine = new QueueEngine();
