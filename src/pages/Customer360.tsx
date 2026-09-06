import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Plus, Building2, UserCircle, 
  Activity, ChevronRight, Mail, Phone, Bot, CheckCircle2, 
  AlertTriangle, X, Wifi, Radio, RefreshCw, DollarSign, 
  FileText, ShieldCheck, Wrench, ArrowUpRight, Copy, Check,
  Sliders, MessageSquare, ExternalLink, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Interfaces
export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  document: string; // CPF or CNPJ
  segment: 'B2B' | 'B2C';
  status: 'ACTIVE' | 'IN_ACTIVATION' | 'SUSPENDED';
  mrr: number;
  healthScore: number;
  lastInteraction: string;
  tags: string[];
  email: string;
  phone: string;
  address: string;
  plan: string;
  fiberDetails: {
    onuStatus: 'ONLINE' | 'OFFLINE' | 'LOS_RED';
    rxPower: number; // e.g. -19.4 dBm
    txPower: number; // e.g. +2.1 dBm
    olt: string;
    ponPort: string;
    cto: string;
    pppoeUser: string;
    ipAddress: string;
    ipv6Prefix: string;
    wifiRouter: string;
  };
  invoices: Array<{
    id: string;
    competencia: string;
    dueDate: string;
    amount: number;
    status: 'PAID' | 'OPEN' | 'OVERDUE';
    barcode: string;
  }>;
  tickets: Array<{
    id: string;
    protocol: string;
    subject: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    openedAt: string;
    category: string;
  }>;
}

// Mock initial data
const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'c-1', 
    tenantId: 'demo-tenant', 
    name: 'TechCorp SA', 
    document: '12.345.678/0001-90',
    segment: 'B2B', 
    status: 'ACTIVE', 
    mrr: 15400, 
    healthScore: 92, 
    lastInteraction: 'Hoje, 10:45', 
    tags: ['VIP', 'FTTH Dedicado', 'SLA 4h'],
    email: 'noc@techcorp.com.br',
    phone: '+55 11 3290-8800',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo/SP',
    plan: 'Link Dedicado 1 Giga Full Duplex + Bloco /29 IPv4',
    fiberDetails: {
      onuStatus: 'ONLINE',
      rxPower: -18.6,
      txPower: 2.4,
      olt: 'OLT-SP-CENTRO-01 (Huawei MA5800)',
      ponPort: '0/1/4',
      cto: 'CTO-42 - Porta 03',
      pppoeUser: 'techcorp_dedicado_1g',
      ipAddress: '187.52.120.45',
      ipv6Prefix: '2804:14d0:8000:0010::/64',
      wifiRouter: 'Cisco Catalyst 8300 Edge'
    },
    invoices: [
      { id: 'inv-101', competencia: '08/2026', dueDate: '15/09/2026', amount: 15400, status: 'OPEN', barcode: '34191.79001 01043.510047 91020.150008 5 99990001540000' },
      { id: 'inv-100', competencia: '07/2026', dueDate: '15/08/2026', amount: 15400, status: 'PAID', barcode: '34191.79001 01043.510047 91020.150008 5 88880001540000' },
      { id: 'inv-099', competencia: '06/2026', dueDate: '15/07/2026', amount: 15400, status: 'PAID', barcode: '34191.79001 01043.510047 91020.150008 5 77770001540000' }
    ],
    tickets: [
      { id: 't-1', protocol: '20260905012', subject: 'Aumento temporário de banda para evento', status: 'RESOLVED', openedAt: 'Ontem', category: 'Comercial' }
    ]
  },
  { 
    id: 'c-2', 
    tenantId: 'demo-tenant', 
    name: 'Carlos Ferreira', 
    document: '298.112.443-12',
    segment: 'B2C', 
    status: 'ACTIVE', 
    mrr: 150, 
    healthScore: 45, 
    lastInteraction: 'Hoje, 09:12', 
    tags: ['Risco Churn', 'Reclamação Wi-Fi'],
    email: 'carlos.ferreira@gmail.com',
    phone: '+55 11 98888-1234',
    address: 'Rua das Flores, 45 - Apto 82 - Jardins, São Paulo/SP',
    plan: 'Fibra 500 Mega Residencial + Wi-Fi 6 Mesh',
    fiberDetails: {
      onuStatus: 'ONLINE',
      rxPower: -24.8, // marginal
      txPower: 1.8,
      olt: 'OLT-SP-OESTE-02 (ZTE C320)',
      ponPort: '0/2/1',
      cto: 'CTO-19 - Porta 07',
      pppoeUser: 'carlos_ferreira_500m',
      ipAddress: '100.64.44.12',
      ipv6Prefix: '2804:14d0:8000:0024::/64',
      wifiRouter: 'Router AX3000 Wi-Fi 6'
    },
    invoices: [
      { id: 'inv-201', competencia: '08/2026', dueDate: '10/09/2026', amount: 149.90, status: 'OPEN', barcode: '34191.79001 01043.510047 91020.150008 5 1111000014990' },
      { id: 'inv-200', competencia: '07/2026', dueDate: '10/08/2026', amount: 149.90, status: 'PAID', barcode: '34191.79001 01043.510047 91020.150008 5 2222000014990' }
    ],
    tickets: [
      { id: 't-2', protocol: '20260905098', subject: 'Lentidão em jogos e streaming no quarto', status: 'IN_PROGRESS', openedAt: 'Hoje, 09:12', category: 'Suporte N2' }
    ]
  },
  { 
    id: 'c-3', 
    tenantId: 'demo-tenant', 
    name: 'Condomínio Alpha Garden', 
    document: '45.890.123/0001-11',
    segment: 'B2B', 
    status: 'IN_ACTIVATION', 
    mrr: 4500, 
    healthScore: 100, 
    lastInteraction: 'Ontem, 16:30', 
    tags: ['Projeto Fibra', 'CFTV Nuvem'],
    email: 'sindico@alphagarden.com.br',
    phone: '+55 11 4195-2200',
    address: 'Alameda Rio Negro, 500 - Alphaville, Barueri/SP',
    plan: 'Fibra Corporativa 1 Giga + 16 Câmeras Cloud',
    fiberDetails: {
      onuStatus: 'ONLINE',
      rxPower: -19.1,
      txPower: 2.2,
      olt: 'OLT-SP-BARUERI-01 (Fiberhome AN5516)',
      ponPort: '0/3/8',
      cto: 'CTO-ALPHAGARDEN-01',
      pppoeUser: 'alpha_garden_corp',
      ipAddress: '187.52.122.90',
      ipv6Prefix: '2804:14d0:8000:0088::/64',
      wifiRouter: 'MikroTik CCR2004'
    },
    invoices: [
      { id: 'inv-301', competencia: '08/2026', dueDate: '20/09/2026', amount: 4500, status: 'OPEN', barcode: '34191.79001 01043.510047 91020.150008 5 3333000450000' }
    ],
    tickets: [
      { id: 't-3', protocol: '20260904001', subject: 'Agendamento de fusão de fibra no DGO', status: 'IN_PROGRESS', openedAt: 'Ontem', category: 'Engenharia de Campo' }
    ]
  },
  { 
    id: 'c-4', 
    tenantId: 'demo-tenant', 
    name: 'Mariana Silva Santos', 
    document: '345.908.112-88',
    segment: 'B2C', 
    status: 'SUSPENDED', 
    mrr: 220, 
    healthScore: 10, 
    lastInteraction: 'Há 3 dias', 
    tags: ['Inadimplente', 'Bloqueio Financeiro'],
    email: 'mariana.silva@outlook.com',
    phone: '+55 11 97654-3210',
    address: 'Av. Ibirapuera, 1200 - Moema, São Paulo/SP',
    plan: 'Fibra 700 Mega + TV HD por Assinatura',
    fiberDetails: {
      onuStatus: 'ONLINE', // ONU responde mas PPPoE está suspenso no Radius
      rxPower: -20.2,
      txPower: 2.0,
      olt: 'OLT-SP-SUL-01 (Huawei MA5800)',
      ponPort: '0/1/2',
      cto: 'CTO-IBIRA-09 - Porta 04',
      pppoeUser: 'mariana_silva_bloq',
      ipAddress: '100.64.99.15 (VLAN_SUSPENSA)',
      ipv6Prefix: 'Desativado',
      wifiRouter: 'Router Wi-Fi 6 Dual Band'
    },
    invoices: [
      { id: 'inv-401', competencia: '07/2026', dueDate: '10/08/2026', amount: 220, status: 'OVERDUE', barcode: '34191.79001 01043.510047 91020.150008 5 4444000022000' },
      { id: 'inv-402', competencia: '08/2026', dueDate: '10/09/2026', amount: 220, status: 'OPEN', barcode: '34191.79001 01043.510047 91020.150008 5 5555000022000' }
    ],
    tickets: []
  },
  { 
    id: 'c-5', 
    tenantId: 'demo-tenant', 
    name: 'Logística Sul Express Ltda', 
    document: '08.776.543/0001-22',
    segment: 'B2B', 
    status: 'ACTIVE', 
    mrr: 8900, 
    healthScore: 88, 
    lastInteraction: 'Há 1 semana', 
    tags: ['PABX Nuvem', '30 Ramais SIP'],
    email: 'ti@logisticasul.com.br',
    phone: '+55 11 3890-4411',
    address: 'Rodovia Anhanguera, KM 18 - Galpão 4, Osasco/SP',
    plan: 'Link Dedicado 600 Mega + SIP Trunk Octo8 PABX',
    fiberDetails: {
      onuStatus: 'ONLINE',
      rxPower: -17.9,
      txPower: 2.5,
      olt: 'OLT-SP-OESTE-01 (Huawei MA5800)',
      ponPort: '0/2/6',
      cto: 'CTO-DISTRIB-12 - Porta 01',
      pppoeUser: 'logistica_sul_sip',
      ipAddress: '187.52.125.10',
      ipv6Prefix: '2804:14d0:8000:0120::/64',
      wifiRouter: 'Fortinet FortiGate 60F'
    },
    invoices: [
      { id: 'inv-501', competencia: '08/2026', dueDate: '25/09/2026', amount: 8900, status: 'OPEN', barcode: '34191.79001 01043.510047 91020.150008 5 6666000890000' },
      { id: 'inv-500', competencia: '07/2026', dueDate: '25/08/2026', amount: 8900, status: 'PAID', barcode: '34191.79001 01043.510047 91020.150008 5 7777000890000' }
    ],
    tickets: []
  },
];

export default function Customer360() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'B2B' | 'B2C'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'CHURN_RISK'>('ALL');

  // Customer 360 Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeCustomerTab, setActiveCustomerTab] = useState<'FTTH' | 'FINANCIAL' | 'TICKETS' | 'DETAILS'>('FTTH');

  // Integration Hub / SGP Data State
  const [sgpData, setSgpData] = useState<any | null>(null);
  const [isSgpSyncing, setIsSgpSyncing] = useState(false);

  // Sync with SGP backend when drawer opens
  useEffect(() => {
    if (selectedCustomer) {
      setIsSgpSyncing(true);
      setSgpData(null);
      fetch(`/api/integration/customer/${selectedCustomer.id}`, {
        headers: { 'x-tenant-id': tenantId || 'default-tenant' }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setSgpData(data);
      })
      .catch(console.error)
      .finally(() => setIsSgpSyncing(false));
    } else {
      setSgpData(null);
    }
  }, [selectedCustomer, tenantId]);

  // Handle URL query params for deep linking
  useEffect(() => {
    const custId = searchParams.get('id');
    const searchVal = searchParams.get('search');
    if (searchVal) setSearchQuery(searchVal);
    if (custId) {
      const list = customers.length > 0 ? customers : MOCK_CUSTOMERS;
      const match = list.find(c => c.id === custId);
      if (match) setSelectedCustomer(match);
    }
  }, [searchParams, customers]);

  // Interactive Action Feedback
  const [pingRunning, setPingRunning] = useState(false);
  const [pingResult, setPingResult] = useState<{ latency: string; packetLoss: string; rxDbm: number } | null>(null);
  const [rebootRunning, setRebootRunning] = useState(false);
  const [rebootFeedback, setRebootFeedback] = useState<string | null>(null);
  const [unlockFeedback, setUnlockFeedback] = useState<string | null>(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // New Customer Modal
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustDocument, setNewCustDocument] = useState('');
  const [newCustSegment, setNewCustSegment] = useState<'B2B' | 'B2C'>('B2C');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustPlan, setNewCustPlan] = useState('Fibra 500 Mega Residencial');
  const [newCustMrr, setNewCustMrr] = useState(149.90);
  const [newCustAddress, setNewCustAddress] = useState('');

  // New Ticket Modal inside Customer Drawer
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Suporte Técnico (FTTH)');

  // AI Executive Summary
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Firestore Sync & Seed
  useEffect(() => {
    if (!tenantId) return;

    const q = query(collection(db, 'customers'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && customers.length === 0) {
        console.log("Seeding mock customers to Firestore...");
        MOCK_CUSTOMERS.forEach(async (customer) => {
          const seededCustomer = { ...customer, tenantId: tenantId };
          try {
            await setDoc(doc(db, 'customers', customer.id), seededCustomer);
          } catch (e) {
            console.warn("Could not seed customer:", e);
          }
        });
        setCustomers(MOCK_CUSTOMERS);
      } else {
        const customersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        setCustomers(customersData);
      }
    }, (error) => {
      console.warn("Firestore customer listener fallback:", error);
      setCustomers(MOCK_CUSTOMERS);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleGenerateExecutiveSummary = async () => {
    setIsAiLoading(true);
    setAiInsight(null);
    try {
      const context = filteredCustomers.map(c => 
        `Cliente: ${c.name} (${c.segment}), Status: ${c.status}, Saúde: ${c.healthScore}/100, MRR: R$${c.mrr}, Plano: ${c.plan}, ONU: ${c.fiberDetails?.onuStatus || 'OK'}, Inadimplência: ${c.invoices?.some(i => i.status === 'OVERDUE') ? 'Sim' : 'Não'}`
      ).join('\n');

      const res = await fetch('/api/copilot/customer-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.summary);
      } else {
        setAiInsight('Base analisada: 60% dos clientes B2B estão com alta retenção (Health Score > 85). Recomenda-se ação proativa no cliente Carlos Ferreira (atenuação de sinal -24.8 dBm) e desbloqueio negociado para Mariana Silva.');
      }
    } catch (e) {
      setAiInsight('Base analisada: 60% dos clientes B2B estão com alta retenção. Recomenda-se ação preventiva de visita técnica para o cliente Carlos Ferreira com sinal óptico de -24.8 dBm.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Run Real-Time Ping Diagnostic
  const handleRunOpticalPing = () => {
    setPingRunning(true);
    setPingResult(null);
    setTimeout(() => {
      setPingRunning(false);
      const isCritical = (selectedCustomer?.fiberDetails?.rxPower || -19) < -24;
      setPingResult({
        latency: isCritical ? '24ms (Jitter Alto)' : '8ms',
        packetLoss: isCritical ? '2.5%' : '0.0%',
        rxDbm: selectedCustomer?.fiberDetails?.rxPower || -19.2
      });
    }, 1200);
  };

  // Run TR-069 Remote Reboot
  const handleRebootOnu = () => {
    setRebootRunning(true);
    setRebootFeedback(null);
    setTimeout(() => {
      setRebootRunning(false);
      setRebootFeedback('Comando TR-069 enviado com sucesso! A ONU sincronizou e reconectou a sessão PPPoE.');
      setTimeout(() => setRebootFeedback(null), 4000);
    }, 2000);
  };

  // Desbloqueio em Confiança (48h)
  const handleDesbloqueioConfianca = async (customer: Customer) => {
    const updated = {
      ...customer,
      status: 'ACTIVE' as const,
      healthScore: Math.min(100, customer.healthScore + 25),
      lastInteraction: 'Hoje, agora (Desbloqueio 48h)'
    };

    setCustomers(prev => prev.map(c => c.id === customer.id ? updated : c));
    setSelectedCustomer(updated);
    setUnlockFeedback('Sinal restabelecido por 48 horas em confiança! Radius provisionado.');

    try {
      await updateDoc(doc(db, 'customers', customer.id), {
        status: 'ACTIVE',
        healthScore: updated.healthScore,
        lastInteraction: updated.lastInteraction
      });
    } catch (e) {
      console.warn("Firestore update skipped:", e);
    }

    setTimeout(() => setUnlockFeedback(null), 4000);
  };

  // Copy PIX / Barcode
  const handleCopyBarcode = (barcode: string, invId: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedInvoiceId(invId);
    setTimeout(() => setCopiedInvoiceId(null), 2500);
  };

  // Save New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCustomer: Customer = {
      id: `c-${Date.now()}`,
      tenantId: tenantId || 'demo-tenant',
      name: newCustName.trim(),
      document: newCustDocument.trim() || '000.000.000-00',
      segment: newCustSegment,
      status: 'IN_ACTIVATION',
      mrr: Number(newCustMrr) || 149.90,
      healthScore: 100,
      lastInteraction: 'Hoje, agora',
      tags: [newCustSegment, 'Novo Assinante'],
      email: newCustEmail.trim() || 'contato@cliente.com.br',
      phone: newCustPhone.trim() || '+55 11 99999-0000',
      address: newCustAddress.trim() || 'São Paulo/SP',
      plan: newCustPlan,
      fiberDetails: {
        onuStatus: 'ONLINE',
        rxPower: -19.0,
        txPower: 2.1,
        olt: 'OLT-SP-CENTRO-01',
        ponPort: '0/1/1',
        cto: 'CTO-PROXIMA',
        pppoeUser: `${newCustName.toLowerCase().replace(/\s+/g, '_')}_fibra`,
        ipAddress: '100.64.10.50',
        ipv6Prefix: '2804:14d0:8000:0099::/64',
        wifiRouter: 'Router Wi-Fi 6 Gigabit'
      },
      invoices: [
        {
          id: `inv-${Date.now()}`,
          competencia: '09/2026',
          dueDate: '20/09/2026',
          amount: Number(newCustMrr) || 149.90,
          status: 'OPEN',
          barcode: '34191.79001 01043.510047 91020.150008 5 00000000000000'
        }
      ],
      tickets: [
        {
          id: `t-${Date.now()}`,
          protocol: `20260905${Math.floor(Math.random() * 900) + 100}`,
          subject: 'Instalação e ativação da porta óptica',
          status: 'IN_PROGRESS',
          openedAt: 'Hoje',
          category: 'Instalação'
        }
      ]
    };

    setCustomers(prev => [newCustomer, ...prev]);

    try {
      await setDoc(doc(db, 'customers', newCustomer.id), newCustomer);
    } catch (e) {
      console.warn("Could not save new customer to Firestore:", e);
    }

    setIsNewCustomerModalOpen(false);
    setSelectedCustomer(newCustomer);
  };

  // Add Ticket to Selected Customer
  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !ticketSubject.trim()) return;

    const newTicket = {
      id: `t-${Date.now()}`,
      protocol: `20260905${Math.floor(Math.random() * 900) + 100}`,
      subject: ticketSubject.trim(),
      status: 'OPEN' as const,
      openedAt: 'Hoje, agora',
      category: ticketCategory
    };

    const updatedCustomer = {
      ...selectedCustomer,
      tickets: [newTicket, ...(selectedCustomer.tickets || [])],
      lastInteraction: 'Hoje, agora (Nova O.S.)'
    };

    setSelectedCustomer(updatedCustomer);
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));

    try {
      await updateDoc(doc(db, 'customers', selectedCustomer.id), {
        tickets: updatedCustomer.tickets,
        lastInteraction: updatedCustomer.lastInteraction
      });
    } catch (e) {
      console.warn("Could not save ticket to Firestore:", e);
    }

    setTicketSubject('');
    setIsNewTicketModalOpen(false);
  };

  const filteredCustomers = customers
    .filter(c => {
      if (segmentFilter === 'B2B' && c.segment !== 'B2B') return false;
      if (segmentFilter === 'B2C' && c.segment !== 'B2C') return false;
      return true;
    })
    .filter(c => {
      if (statusFilter === 'ACTIVE' && c.status !== 'ACTIVE') return false;
      if (statusFilter === 'SUSPENDED' && c.status !== 'SUSPENDED') return false;
      if (statusFilter === 'CHURN_RISK' && c.healthScore >= 50) return false;
      return true;
    })
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document && c.document.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    });

  const totalMrr = customers.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const churnRiskCount = customers.filter(c => (c.healthScore || 100) < 50).length;
  const vipCount = customers.filter(c => c.segment === 'B2B').length;
  const suspendedCount = customers.filter(c => c.status === 'SUSPENDED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Customer 360 (Telecom & CRM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão 360° do assinante: telemetria óptica FTTH, contratos, saúde da base e faturamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleGenerateExecutiveSummary}
            disabled={isAiLoading || customers.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-2xs disabled:opacity-50"
          >
            {isAiLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> 
                Analisando Base...
              </span>
            ) : (
              <><Bot className="w-4 h-4 text-indigo-600" /> Resumo Executivo (IA)</>
            )}
          </button>
          
          <button 
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Assinante
          </button>
        </div>
      </div>

      {/* AI Executive Summary Panel */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 border border-indigo-100 rounded-xl p-5 shadow-xs relative overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-xs text-indigo-600">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1">
                  Diagnóstico da Carteira de Assinantes (Gemini AI)
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">{aiInsight}</p>
              </div>
            </div>
            <button 
              onClick={() => setAiInsight(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Assinantes Ativos" 
          value={customers.length.toString()} 
          subtitle={`${vipCount} corporativos (B2B)`} 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
        />
        <KpiCard 
          title="MRR Total (Faturamento)" 
          value={formatCurrency(totalMrr)} 
          subtitle="Receita recorrente mensal" 
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />} 
        />
        <KpiCard 
          title="Risco de Churn" 
          value={churnRiskCount.toString()} 
          subtitle="Health Score abaixo de 50" 
          icon={<Activity className="w-5 h-5 text-amber-600" />} 
          alert={churnRiskCount > 0} 
        />
        <KpiCard 
          title="Bloqueio Financeiro" 
          value={suspendedCount.toString()} 
          subtitle="Suspensos por inadimplência" 
          icon={<AlertCircle className="w-5 h-5 text-red-600" />} 
          alert={suspendedCount > 0} 
        />
      </div>

      {/* Filter & Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Top Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF/CNPJ, e-mail, telefone ou tag..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-xs transition-all outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Segmento:
            </div>
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setSegmentFilter('ALL')}
                className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-colors", segmentFilter === 'ALL' ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                Todos
              </button>
              <button
                onClick={() => setSegmentFilter('B2B')}
                className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-colors", segmentFilter === 'B2B' ? "bg-blue-600 text-white" : "text-slate-600 hover:text-blue-600")}
              >
                B2B (Empresas)
              </button>
              <button
                onClick={() => setSegmentFilter('B2C')}
                className={cn("px-2.5 py-1 text-xs font-bold rounded-md transition-colors", segmentFilter === 'B2C' ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                B2C (Residencial)
              </button>
            </div>

            <div className="hidden sm:block w-px h-5 bg-slate-200 mx-1"></div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none font-medium"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Apenas Ativos</option>
              <option value="CHURN_RISK">Risco de Churn (Health &lt; 50)</option>
              <option value="SUSPENDED">Bloqueados / Suspensos</option>
            </select>
          </div>

        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
                <th className="p-3.5">Assinante / Razão Social</th>
                <th className="p-3.5">Plano / Conexão</th>
                <th className="p-3.5">Status & Saúde</th>
                <th className="p-3.5">MRR</th>
                <th className="p-3.5">Telemetria FTTH (Rx)</th>
                <th className="p-3.5">Última Interação</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.map((customer) => {
                const rxDbm = customer.fiberDetails?.rxPower ?? -19.0;
                const isOpticalGood = rxDbm >= -24.0 && rxDbm <= -14.0;

                return (
                  <tr 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs font-bold",
                          customer.segment === 'B2B' 
                            ? "bg-indigo-50 border-indigo-100 text-indigo-700" 
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        )}>
                          {customer.segment === 'B2B' ? <Building2 className="w-4 h-4" /> : <UserCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {customer.name}
                            {customer.segment === 'B2B' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
                                B2B
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {customer.document} • {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <p className="text-slate-800 font-semibold truncate max-w-xs">{customer.plan}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{customer.fiberDetails?.pppoeUser || 'pppoe_user'}</span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className={cn(
                            "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                            customer.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            customer.status === 'IN_ACTIVATION' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {customer.status === 'ACTIVE' ? 'Ativo' : customer.status === 'IN_ACTIVATION' ? 'Em Ativação' : 'Suspenso'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={cn("h-full rounded-full", customer.healthScore >= 80 ? "bg-emerald-500" : customer.healthScore >= 50 ? "bg-amber-500" : "bg-red-500")} 
                              style={{ width: `${customer.healthScore}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-700">{customer.healthScore}/100</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {formatCurrency(customer.mrr)}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          customer.fiberDetails?.onuStatus === 'ONLINE' ? "bg-emerald-500" : "bg-red-500 animate-ping"
                        )}></span>
                        <span className={cn(
                          "font-mono font-bold text-[11px]",
                          isOpticalGood ? "text-emerald-700" : "text-amber-600"
                        )}>
                          {rxDbm.toFixed(1)} dBm
                        </span>
                        {!isOpticalGood && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                            Atenuado
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {customer.lastInteraction}
                    </td>

                    <td className="p-3.5 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        Abrir 360°
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum assinante encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>Exibindo {filteredCustomers.length} de {customers.length} assinantes</span>
          <span className="font-mono font-semibold">Base sincronizada em tempo real</span>
        </div>
      </div>

      {/* DRAWER / MODAL: Customer 360 Comprehensive View */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    selectedCustomer.segment === 'B2B' ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-200"
                  )}>
                    {selectedCustomer.segment}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    selectedCustomer.status === 'ACTIVE' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                    selectedCustomer.status === 'IN_ACTIVATION' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                    "bg-red-500/20 text-red-300 border border-red-500/30"
                  )}>
                    {selectedCustomer.status === 'ACTIVE' ? 'Conexão Ativa' : selectedCustomer.status === 'IN_ACTIVATION' ? 'Em Ativação' : 'Suspenso'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{selectedCustomer.name}</h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Doc: {selectedCustomer.document} • MRR: {formatCurrency(selectedCustomer.mrr)}
                  {isSgpSyncing ? (
                    <span className="ml-3 inline-flex items-center text-blue-300 animate-pulse">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Sincronizando SGP...
                    </span>
                  ) : sgpData ? (
                    <span className="ml-3 inline-flex items-center text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> SGP Sincronizado
                    </span>
                  ) : null}
                </p>
              </div>

              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Bar */}
            <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/telephony?dial=${encodeURIComponent(selectedCustomer.phone || '')}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" /> Ligar para o Cliente
                </button>
                <button
                  onClick={() => navigate(`/omnichannel?customer=${encodeURIComponent(selectedCustomer.name || '')}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-bold transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Abrir WhatsApp
                </button>
              </div>

              {selectedCustomer.status === 'SUSPENDED' && (
                <button
                  onClick={() => handleDesbloqueioConfianca(selectedCustomer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold transition-all shadow-sm animate-pulse"
                >
                  <ShieldCheck className="w-4 h-4" /> Desbloqueio em Confiança (48h)
                </button>
              )}
            </div>

            {/* Alert / Feedback Toasts */}
            {unlockFeedback && (
              <div className="p-3 bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-inner">
                <CheckCircle2 className="w-4 h-4" /> {unlockFeedback}
              </div>
            )}
            {rebootFeedback && (
              <div className="p-3 bg-blue-600 text-white text-xs font-semibold flex items-center gap-2 shadow-inner">
                <RefreshCw className="w-4 h-4" /> {rebootFeedback}
              </div>
            )}

            {/* Drawer Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4">
              {[
                { id: 'FTTH', label: 'Telemetria Fibra (FTTH)', icon: Wifi },
                { id: 'FINANCIAL', label: 'Financeiro & Faturas', icon: DollarSign },
                { id: 'TICKETS', label: 'Ordens de Serviço', icon: Wrench },
                { id: 'DETAILS', label: 'Cadastro & Endereço', icon: UserCircle },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCustomerTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors",
                    activeCustomerTab === tab.id 
                      ? "border-blue-600 text-blue-700 bg-white" 
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              
              {/* TAB 1: FTTH / Conexão Óptica */}
              {activeCustomerTab === 'FTTH' && (
                <div className="space-y-6">
                  
                  {/* Optical Signal Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-3 h-3 rounded-full", (sgpData?.network_status?.status || selectedCustomer.fiberDetails?.onuStatus) === 'ONLINE' ? "bg-emerald-500" : "bg-red-500 animate-ping")}></span>
                        <h4 className="font-bold text-slate-900 text-sm">Status da ONU / ONT: {sgpData?.network_status?.status || selectedCustomer.fiberDetails?.onuStatus || 'ONLINE'}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRunOpticalPing}
                          disabled={pingRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 shadow-2xs"
                        >
                          <Activity className={cn("w-3.5 h-3.5 text-blue-600", pingRunning && "animate-spin")} />
                          {pingRunning ? 'Testando...' : 'Diagnóstico / Ping'}
                        </button>
                        <button
                          onClick={handleRebootOnu}
                          disabled={rebootRunning}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 shadow-2xs"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-600", rebootRunning && "animate-spin")} />
                          {rebootRunning ? 'Reiniciando...' : 'Reiniciar ONU'}
                        </button>
                      </div>
                    </div>

                    {/* Diagnostic Feedback */}
                    {pingResult && (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-slate-700">
                        <span>Latência ICMP: <strong className="font-mono">{pingResult.latency}</strong></span>
                        <span>Perda de Pacotes: <strong className="font-mono">{pingResult.packetLoss}</strong></span>
                        <span>Sinal RX Atual: <strong className="font-mono text-emerald-600">{pingResult.rxDbm} dBm</strong></span>
                      </div>
                    )}

                    {/* Optical Power Gauge */}
                    <div>
                      <div className="flex justify-between text-slate-600 font-semibold mb-1">
                        <span>Potência Óptica Recebida (RX) {sgpData && <span className="text-[10px] text-blue-600 ml-1 font-bold">(Live SGP)</span>}</span>
                        <span className="font-mono font-bold text-slate-900">{sgpData?.network_status?.rx_power || selectedCustomer.fiberDetails?.rxPower || -19.0} dBm (Faixa Ideal: -15 a -24 dBm)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="w-[30%] bg-emerald-400" title="Excelente (-14 a -20 dBm)"></div>
                        <div className="w-[40%] bg-emerald-500" title="Bom (-20 a -24 dBm)"></div>
                        <div className="w-[30%] bg-amber-400" title="Marginal (-24 a -28 dBm)"></div>
                      </div>
                    </div>
                  </div>

                  {/* Provisioning Specs Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Concentrador OLT</p>
                      <p className="font-bold text-slate-800">{selectedCustomer.fiberDetails?.olt || 'OLT-SP-CENTRO'}</p>
                      <p className="text-slate-500 text-[11px] font-mono">Porta PON: {selectedCustomer.fiberDetails?.ponPort || '0/1/1'}</p>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Caixa de Terminação (CTO)</p>
                      <p className="font-bold text-slate-800">{selectedCustomer.fiberDetails?.cto || 'CTO-01'}</p>
                      <p className="text-slate-500 text-[11px] font-mono">Tx OLT: {selectedCustomer.fiberDetails?.txPower || 2.1} dBm</p>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Usuário PPPoE</p>
                      <p className="font-mono font-bold text-slate-800">{selectedCustomer.fiberDetails?.pppoeUser || 'user_pppoe'}</p>
                      <p className="text-slate-500 text-[11px] font-mono flex flex-col gap-0.5">
                        <span>IP: <span className={sgpData ? "text-blue-600 font-bold" : ""}>{sgpData?.network_status?.ip_address || selectedCustomer.fiberDetails?.ipAddress || '100.64.0.1'}</span></span>
                        {sgpData && <span>MAC: {sgpData.network_status.mac_address}</span>}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Roteador Wi-Fi (CPE)</p>
                      <p className="font-bold text-slate-800">{selectedCustomer.fiberDetails?.wifiRouter || 'AX3000 Wi-Fi 6'}</p>
                      <p className="text-slate-500 text-[11px] font-mono">TR-069: Provisionado</p>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: Financeiro */}
              {activeCustomerTab === 'FINANCIAL' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Histórico de Faturas & Cobranças</h4>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      MRR: {formatCurrency(selectedCustomer.mrr)}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedCustomer.invoices && selectedCustomer.invoices.length > 0 ? (
                      selectedCustomer.invoices.map(inv => (
                        <div key={inv.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">Competência {inv.competencia}</span>
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded border",
                                inv.status === 'PAID' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                inv.status === 'OPEN' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {inv.status === 'PAID' ? 'Pago' : inv.status === 'OPEN' ? 'Em Aberto' : 'Vencido'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">Vencimento: {inv.dueDate}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatCurrency(inv.amount)}
                            </span>
                            <button
                              onClick={() => handleCopyBarcode(inv.barcode, inv.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              {copiedInvoiceId === inv.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedInvoiceId === inv.id ? 'Copiado!' : 'Copiar PIX'}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400">Nenhuma fatura registrada.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Tickets & O.S. */}
              {activeCustomerTab === 'TICKETS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Ordens de Serviço & Suporte</h4>
                    <button
                      onClick={() => setIsNewTicketModalOpen(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nova O.S.
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedCustomer.tickets && selectedCustomer.tickets.length > 0 ? (
                      selectedCustomer.tickets.map(t => (
                        <div key={t.id} className="p-3.5 bg-white space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Protocolo #{t.protocol}
                            </span>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                              t.status === 'RESOLVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              t.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {t.status === 'RESOLVED' ? 'Resolvido' : t.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Aberto'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs">{t.subject}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400">
                            <span>Categoria: {t.category}</span>
                            <span>•</span>
                            <span>Aberto em: {t.openedAt}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400">Nenhum chamado aberto para este cliente.</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Cadastro Completo */}
              {activeCustomerTab === 'DETAILS' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Dados Cadastrais & Endereço de Instalação</h4>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Endereço de Instalação</span>
                      <p className="text-slate-800 font-semibold text-xs mt-0.5">{selectedCustomer.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">E-mail de Contato</span>
                        <p className="text-slate-800 font-mono text-xs mt-0.5">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Telefone / WhatsApp</span>
                        <p className="text-slate-800 font-mono text-xs mt-0.5">{selectedCustomer.phone}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Tags do Assinante</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {selectedCustomer.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span>Última interação: {selectedCustomer.lastInteraction}</span>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Novo Assinante */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Cadastrar Novo Assinante
              </h3>
              <button onClick={() => setIsNewCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Nome / Razão Social</label>
                <input 
                  type="text" 
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ex: Empresa Exemplo Ltda ou João da Silva" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">CPF ou CNPJ</label>
                  <input 
                    type="text" 
                    value={newCustDocument}
                    onChange={(e) => setNewCustDocument(e.target.value)}
                    placeholder="000.000.000-00" 
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Segmento</label>
                  <select 
                    value={newCustSegment}
                    onChange={(e) => setNewCustSegment(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold"
                  >
                    <option value="B2C">B2C (Residencial)</option>
                    <option value="B2B">B2B (Corporativo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="+55 11 99999-0000" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="contato@email.com" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Plano de Conexão</label>
                  <input 
                    type="text" 
                    value={newCustPlan}
                    onChange={(e) => setNewCustPlan(e.target.value)}
                    placeholder="Ex: Fibra 600 Mega + Mesh" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">MRR (Mensalidade R$)</label>
                  <input 
                    type="number" 
                    value={newCustMrr}
                    onChange={(e) => setNewCustMrr(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Endereço de Instalação</label>
                <input 
                  type="text" 
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade/UF" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Criar Assinante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nova O.S. inside Customer Drawer */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Abertura de Chamado / O.S.</h3>
            <form onSubmit={handleAddTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Assunto / Descrição do Problema</label>
                <input 
                  type="text" 
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Ex: Rompimento óptico na fachada ou troca de roteador" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Categoria de Atendimento</label>
                <select 
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-medium"
                >
                  <option value="Suporte Técnico (FTTH)">Suporte Técnico (FTTH)</option>
                  <option value="Engenharia de Campo (Fusão)">Engenharia de Campo (Fusão)</option>
                  <option value="Comercial / Upgrade">Comercial / Upgrade</option>
                  <option value="Financeiro / Cobrança">Financeiro / Cobrança</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-sm"
                >
                  Emitir O.S.
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, alert }: any) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border shadow-2xs relative overflow-hidden transition-all", alert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{icon}</div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-xs font-semibold">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
