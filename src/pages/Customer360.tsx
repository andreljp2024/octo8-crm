import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Building2, UserCircle, Activity, ChevronRight, Mail, Phone, Bot, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface Customer {
  id: string;
  tenantId: string;
  name: string;
  segment: 'B2B' | 'B2C';
  status: 'ACTIVE' | 'IN_ACTIVATION' | 'SUSPENDED';
  mrr: number;
  healthScore: number;
  lastInteraction: string;
  tags: string[];
}

// Mock Data for seeding
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c-1', tenantId: 'demo-tenant', name: 'TechCorp SA', segment: 'B2B', status: 'ACTIVE', mrr: 15400, healthScore: 92, lastInteraction: 'Hoje, 10:45', tags: ['VIP', 'FTTH Dedicado'] },
  { id: 'c-2', tenantId: 'demo-tenant', name: 'Carlos Ferreira', segment: 'B2C', status: 'ACTIVE', mrr: 150, healthScore: 45, lastInteraction: 'Hoje, 09:12', tags: ['Risco Churn'] },
  { id: 'c-3', tenantId: 'demo-tenant', name: 'Condomínio Alpha', segment: 'B2B', status: 'IN_ACTIVATION', mrr: 4500, healthScore: 100, lastInteraction: 'Ontem, 16:30', tags: ['Projeto Fibra'] },
  { id: 'c-4', tenantId: 'demo-tenant', name: 'Mariana Silva', segment: 'B2C', status: 'SUSPENDED', mrr: 220, healthScore: 10, lastInteraction: 'Há 3 dias', tags: ['Inadimplente'] },
  { id: 'c-5', tenantId: 'demo-tenant', name: 'Logística Sul Ltda', segment: 'B2B', status: 'ACTIVE', mrr: 8900, healthScore: 88, lastInteraction: 'Há 1 semana', tags: ['PABX Nuvem'] },
];

export default function Customer360() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { tenantId } = useAuth();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    const q = query(collection(db, 'customers'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && customers.length === 0) {
        console.log("Seeding mock customers to Firestore...");
        MOCK_CUSTOMERS.forEach(async (customer) => {
          // Adjust tenantId to the current user's tenant for demo purposes
          const seededCustomer = { ...customer, tenantId: tenantId };
          await setDoc(doc(db, 'customers', customer.id), seededCustomer);
        });
      } else {
        const customersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        setCustomers(customersData);
      }
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
      // Create a prompt context based on current visible customers
      const context = filteredCustomers.map(c => 
        `Cliente: ${c.name}, Status: ${c.status}, Segmento: ${c.segment}, Saúde: ${c.healthScore}/100, MRR: R$${c.mrr}`
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
        console.error('Failed to fetch AI insights');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const churnRiskCount = customers.filter(c => c.healthScore < 50).length;
  const vipCount = customers.filter(c => c.segment === 'B2B').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Customer 360
          </h1>
          <p className="text-sm text-slate-500 mt-1">Visão centralizada de clientes, saúde (Health Score) e MRR.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGenerateExecutiveSummary}
            disabled={isAiLoading || customers.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
          >
            {isAiLoading ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Analisando...</span>
            ) : (
              <><Bot className="w-4 h-4" /> Resumo Executivo (IA)</>
            )}
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" /> Filtros Avançados
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* AI Insight Panel */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Bot className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-indigo-900 mb-1">Resumo Executivo da Carteira</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total de Clientes" value={customers.length.toString()} subtitle="Ativos na base" icon={<Users className="text-blue-600" />} />
        <KpiCard title="MRR (Receita Mensal)" value={formatCurrency(totalMrr)} subtitle="Consolidado atual" icon={<Activity className="text-emerald-600" />} />
        <KpiCard title="Clientes VIP (B2B)" value={vipCount.toString()} subtitle="Base B2B principal" icon={<Building2 className="text-indigo-600" />} />
        <KpiCard title="Risco de Churn" value={churnRiskCount.toString()} subtitle="Health Score < 50" icon={<Activity className="text-amber-600" />} alert />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar cliente por nome ou tag..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500">
              <option>Todos os Segmentos</option>
              <option>B2B (Empresas)</option>
              <option>B2C (Residencial)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Cliente</th>
                <th className="p-4">Status & Health</th>
                <th className="p-4">MRR</th>
                <th className="p-4">Tags</th>
                <th className="p-4">Última Interação</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", customer.segment === 'B2B' ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-slate-50 border-slate-200 text-slate-600")}>
                        {customer.segment === 'B2B' ? <Building2 className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer">{customer.name}</h4>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-2 mt-0.5">
                          {customer.segment}
                          <span className="flex items-center gap-2">
                             <a href="#" className="hover:text-blue-600"><Mail className="w-3 h-3" /></a>
                             <a href="#" className="hover:text-blue-600"><Phone className="w-3 h-3" /></a>
                          </span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5">
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
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                          <div 
                            className={cn("h-full rounded-full", customer.healthScore >= 80 ? "bg-emerald-500" : customer.healthScore >= 50 ? "bg-amber-500" : "bg-red-500")} 
                            style={{ width: `${customer.healthScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">{customer.healthScore}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">
                    {formatCurrency(customer.mrr)}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Activity className="w-4 h-4 text-slate-400" />
                      {customer.lastInteraction}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
           <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">Ver todos os clientes</button>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon, alert }: any) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden", alert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
