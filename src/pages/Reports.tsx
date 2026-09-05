import React, { useState } from 'react';
import { 
  BarChart3, Calendar, Download, Filter, 
  TrendingUp, CheckCircle2, Clock, Users, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// Mock Data for Charts
const MOCK_CALL_VOLUME = [
  { time: '08:00', inbound: 45, outbound: 12, abandoned: 2 },
  { time: '10:00', inbound: 120, outbound: 35, abandoned: 15 },
  { time: '12:00', inbound: 85, outbound: 20, abandoned: 5 },
  { time: '14:00', inbound: 150, outbound: 45, abandoned: 20 },
  { time: '16:00', inbound: 90, outbound: 30, abandoned: 8 },
  { time: '18:00', inbound: 40, outbound: 10, abandoned: 1 },
];

const MOCK_SLA_DATA = [
  { name: 'Suporte FTTH', sla: 85, target: 90 },
  { name: 'Vendas Inbound', sla: 95, target: 90 },
  { name: 'Retenção', sla: 78, target: 90 },
  { name: 'Financeiro', sla: 92, target: 90 },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SLA' | 'AGENTS'>('OVERVIEW');

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Relatórios & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de Contact Center, SLAs de filas e desempenho da equipe.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-md">Hoje</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">7 Dias</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">30 Dias</button>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            <Calendar className="w-4 h-4" /> Filtro Avançado
          </button>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total de Interações" value="1.245" trend="+15%" trendPositive icon={<Activity className="text-blue-600" />} />
        <KpiCard title="TMA (Tempo Médio Atend.)" value="04m 12s" trend="-30s" trendPositive icon={<Clock className="text-emerald-600" />} />
        <KpiCard title="TME (Tempo Médio Espera)" value="01m 45s" trend="+15s" trendPositive={false} icon={<Clock className="text-amber-600" />} alert />
        <KpiCard title="Nível de Serviço (SLA Global)" value="88.5%" trend="-1.5%" trendPositive={false} icon={<CheckCircle2 className="text-indigo-600" />} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 pt-2 rounded-t-xl">
        <button 
          onClick={() => setActiveTab('OVERVIEW')}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'OVERVIEW' ? "border-blue-600 text-blue-700 bg-slate-50 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Activity className="w-4 h-4" /> Visão Geral (Volume)
        </button>
        <button 
          onClick={() => setActiveTab('SLA')}
          className={cn(
            "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === 'SLA' ? "border-blue-600 text-blue-700 bg-slate-50 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <CheckCircle2 className="w-4 h-4" /> SLA por Fila
        </button>
      </div>

      {/* Charts Area */}
      <div className="bg-white border border-slate-200 rounded-b-xl rounded-tr-xl shadow-sm p-6">
        
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">Volume de Chamadas ao Longo do Dia</h3>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-blue-600"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Receptivas</span>
                <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Ativas</span>
                <span className="flex items-center gap-1.5 text-amber-600"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Abandonadas</span>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CALL_VOLUME} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="inbound" name="Receptivas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorInbound)" />
                  <Area type="monotone" dataKey="outbound" name="Ativas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOutbound)" />
                  <Area type="monotone" dataKey="abandoned" name="Abandonadas" stroke="#f59e0b" strokeWidth={3} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'SLA' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800">Aderência de SLA por Fila de Atendimento (%)</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_SLA_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="sla" name="SLA Atual (%)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="target" name="Meta SLA (%)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, trendPositive, icon, alert }: any) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden", alert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full", trendPositive ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50")}>
          {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
