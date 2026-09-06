export interface PbxAgentState {
  agentId: string;
  extension: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_CALL' | 'PAUSED';
  currentCallId?: string;
}

export interface IPbxAdapter {
  originateCall(agentExtension: string, destination: string): Promise<string>;
  hangupCall(callId: string): Promise<boolean>;
  getAgentState(agentId: string): Promise<PbxAgentState>;
}

export class MockPbxAdapter implements IPbxAdapter {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async originateCall(agentExtension: string, destination: string): Promise<string> {
    console.log(`[PBX Adapter] Tenant ${this.tenantId} - Originating call from ${agentExtension} to ${destination}`);
    // Simulate AMI/ARI originate success and return a channel/call ID
    return `call-${Date.now()}`;
  }

  async hangupCall(callId: string): Promise<boolean> {
    console.log(`[PBX Adapter] Tenant ${this.tenantId} - Hanging up call ${callId}`);
    return true;
  }

  async getAgentState(agentId: string): Promise<PbxAgentState> {
    return {
      agentId,
      extension: "1001",
      status: 'ONLINE'
    };
  }
}
