export interface SgpCustomer {
  id: string;
  name: string;
  document: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  plan: string;
  mrr: number;
}

export interface SgpConnection {
  mac_address: string;
  ip_address: string;
  status: 'ONLINE' | 'OFFLINE' | 'LOS';
  rx_power: number;
  tx_power: number;
}

export interface ISgpAdapter {
  getCustomer(id: string): Promise<SgpCustomer | null>;
  getConnectionStatus(customerId: string): Promise<SgpConnection | null>;
  suspendConnection(customerId: string, reason: string): Promise<boolean>;
}

export class MockSgpAdapter implements ISgpAdapter {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async getCustomer(id: string): Promise<SgpCustomer | null> {
    console.log(`[SGP Adapter] Fetching customer ${id} for tenant ${this.tenantId}`);
    return {
      id,
      name: "João da Silva",
      document: "123.456.789-00",
      status: "ACTIVE",
      plan: "600 Mega Residencial",
      mrr: 99.90
    };
  }

  async getConnectionStatus(customerId: string): Promise<SgpConnection | null> {
    console.log(`[SGP Adapter] Fetching connection for customer ${customerId}`);
    return {
      mac_address: "A0:B1:C2:D3:E4:F5",
      ip_address: "177.100.200.5",
      status: "ONLINE",
      rx_power: -18.5,
      tx_power: 2.1
    };
  }

  async suspendConnection(customerId: string, reason: string): Promise<boolean> {
    console.log(`[SGP Adapter] Suspending connection for ${customerId} - Reason: ${reason}`);
    return true;
  }
}
