import React, { useState, useEffect } from 'react';
import { 
  Phone, Users, Clock, AlertTriangle, 
  CheckCircle2, XCircle, Activity, BarChart3,
  PhoneCall, PhoneOff, PhoneForwarded
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsOverview } from '@/components/StatsOverview';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    mrr: 0,
    activeCustomers: 0,
    churnRisk: 0,
    activeCalls: 312, // Mocked for real-time volatility feeling
    sla: 82.4
  });

  useEffect(() => {
    // Fetch real metrics from our Express backend
    fetch('/api/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(prev => ({
          ...prev,
          mrr: data.mrr,
          activeCustomers: data.activeCustomers,
          churnRisk: data.churnRisk
        }));
      })
      .catch(err => console.error("Error fetching metrics:", err));

    // Simulate real-time active calls fluctuation
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        activeCalls: Math.max(100, Math.min(500, prev.activeCalls + Math.floor(Math.random() * 11) - 5))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Center - VoIP & Contact Center</h1>
          <p className="text-sm text-slate-500 mt-1">Visão global da operação, canais e saúde da telefonia PABX.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SIP Trunk: ONLINE
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
            Baixar Relatório (CDR)
          </button>
        </div>
      </div>

      {/* VoIP Specific KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Agentes Logados (SIP)" 
          value="124" 
          subtext="89 Disponíveis / 35 Ocupados" 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
          trend="+12"
        />
        <KpiCard 
          title="Fila de Espera (URA)" 
          value={metrics.churnRisk.toString()} 
          subtext="TME: 03:45 (Alerta Amarelo)" 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          trend="+5"
          alert={metrics.churnRisk > 30}
        />
        <KpiCard 
          title="Chamadas Simultâneas" 
          value={metrics.activeCalls.toString()} 
          subtext="Voz sobre IP Ativa" 
          icon={<PhoneCall className="w-5 h-5 text-indigo-600" />} 
          trend="Ao Vivo"
        />
        <KpiCard 
          title="Nível de Serviço (SLA)" 
          value={`${metrics.sla}%`} 
          subtext="Meta: > 80% em 20s" 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          trend="+1.2%"
        />
      </div>

      <StatsOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIP Trunk & Gateways Health */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-500" /> Saúde dos Troncos SIP
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { name: 'Trunk Principal (Operadora A)', status: 'ONLINE', latency: '12ms', channels: '250/300' },
              { name: 'Trunk Backup (Operadora B)', status: 'STANDBY', latency: '18ms', channels: '0/100' },
              { name: 'Gateway GSM (Outbound)', status: 'DEGRADED', latency: '45ms', channels: '28/30' }
            ].map((trunk, idx) => (
              <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-medium text-slate-900">{trunk.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span>Canais Ativos: {trunk.channels}</span>
                    <span>•</span>
                    <span>Latência: {trunk.latency}</span>
                  </div>
                </div>
                <div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                    trunk.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    trunk.status === 'DEGRADED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      trunk.status === 'ONLINE' ? 'bg-emerald-500' :
                      trunk.status === 'DEGRADED' ? 'bg-amber-500' : 'bg-slate-400'
                    )}></span>
                    {trunk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Call Events */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" /> Eventos de Chamada Recentes
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { event: 'Transferência Falha (Blind Transfer)', caller: 'Ramal 405', time: 'Há 1 min', type: 'error', icon: <XCircle className="w-4 h-4 text-red-500" /> },
              { event: 'Abandono na Fila (Suporte N2)', caller: '11 99999-****', time: 'Há 3 min', type: 'warning', icon: <PhoneOff className="w-4 h-4 text-amber-500" /> },
              { event: 'Desbordo de Fila Acionado (Vendas)', caller: 'Regra SLA > 3min', time: 'Há 12 min', type: 'info', icon: <PhoneForwarded className="w-4 h-4 text-blue-500" /> },
            ].map((evt, idx) => (
              <div key={idx} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                <div className={cn(
                  "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  evt.type === 'error' ? 'bg-red-50' :
                  evt.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                )}>
                  {evt.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 text-sm">{evt.event}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{evt.caller}</p>
                </div>
                <span className="text-xs font-medium text-slate-400 shrink-0">{evt.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, subtext, icon, trend, alert }: any) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden transition-all", alert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <div className={cn("text-xs font-bold px-2 py-1 rounded-md", trend.startsWith('+') ? "text-emerald-700 bg-emerald-50" : trend === 'Ao Vivo' ? "text-indigo-700 bg-indigo-50 animate-pulse" : "text-amber-700 bg-amber-50")}>
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{subtext}</p>
      </div>
    </div>
  );
}
