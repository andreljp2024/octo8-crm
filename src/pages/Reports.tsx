import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Calendar, Download, Filter, 
  TrendingUp, CheckCircle2, Clock, Users, Activity,
  Bot, PhoneCall, ArrowUpRight, ArrowDownRight, Award,
  PieChart as PieChartIcon, Search, Headphones, MessageSquare,
  Sparkles, Wifi, ShieldAlert, Check, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

// Data for different timeframes
const TIMEFRAME_DATA = {
  today: {
    interactions: '1.245',
    interactionsTrend: '+15%',
    tma: '04m 12s',
    tmaTrend: '-30s',
    tme: '01m 45s',
    tmeTrend: '+15s',
    slaGlobal: '88.5%',
    slaTrend: '+1.2%',
    volume: [
      { time: '08:00', inbound: 45, outbound: 12, abandoned: 2 },
      { time: '10:00', inbound: 120, outbound: 35, abandoned: 15 },
      { time: '12:00', inbound: 85, outbound: 20, abandoned: 5 },
      { time: '14:00', inbound: 150, outbound: 45, abandoned: 20 },
      { time: '16:00', inbound: 90, outbound: 30, abandoned: 8 },
      { time: '18:00', inbound: 40, outbound: 10, abandoned: 1 },
    ],
  },
  '7d': {
    interactions: '8.430',
    interactionsTrend: '+8.4%',
    tma: '03m 58s',
    tmaTrend: '-12s',
    tme: '01m 20s',
    tmeTrend: '-8s',
    slaGlobal: '91.2%',
    slaTrend: '+2.5%',
    volume: [
      { time: 'Segunda', inbound: 980, outbound: 240, abandoned: 45 },
      { time: 'Terça', inbound: 1120, outbound: 310, abandoned: 60 },
      { time: 'Quarta', inbound: 1050, outbound: 280, abandoned: 40 },
      { time: 'Quinta', inbound: 1300, outbound: 350, abandoned: 75 },
      { time: 'Sexta', inbound: 1210, outbound: 300, abandoned: 55 },
      { time: 'Sábado', inbound: 650, outbound: 110, abandoned: 20 },
    ],
  },
  '30d': {
    interactions: '36.800',
    interactionsTrend: '+18.2%',
    tma: '04m 05s',
    tmaTrend: '-5s',
    tme: '01m 32s',
    tmeTrend: '-10s',
    slaGlobal: '89.8%',
    slaTrend: '+3.1%',
    volume: [
      { time: 'Semana 1', inbound: 8500, outbound: 2100, abandoned: 410 },
      { time: 'Semana 2', inbound: 9100, outbound: 2300, abandoned: 490 },
      { time: 'Semana 3', inbound: 8900, outbound: 2200, abandoned: 380 },
      { time: 'Semana 4', inbound: 10300, outbound: 2600, abandoned: 520 },
    ],
  }
};

const MOCK_SLA_DATA = [
  { name: 'Suporte FTTH', sla: 85, target: 90 },
  { name: 'Vendas Inbound', sla: 95, target: 90 },
  { name: 'Retenção', sla: 78, target: 90 },
  { name: 'Financeiro', sla: 92, target: 90 },
];

const MOCK_CONTACT_REASONS = [
  { name: 'Lentidão & Roteador Wi-Fi', value: 485, percentage: 39, color: '#3b82f6', category: 'Suporte FTTH' },
  { name: '2ª Via de Boleto & PIX', value: 320, percentage: 26, color: '#10b981', category: 'Financeiro' },
  { name: 'LOS Vermelho (Rompimento Fibra)', value: 224, percentage: 18, color: '#ef4444', category: 'Suporte FTTH' },
  { name: 'Upgrade para 1 Giga com Mesh', value: 148, percentage: 12, color: '#8b5cf6', category: 'Vendas' },
  { name: 'Mudança de Endereço / Outros', value: 68, percentage: 5, color: '#64748b', category: 'Atendimento' },
];

const MOCK_AGENTS_PERFORMANCE = [
  { id: '1', name: 'Juliana Ferreira', role: 'Humano (Suporte N2)', queue: 'Suporte FTTH', calls: 64, tma: '03:45', tme: '00:52', csat: 4.8, fcr: '91%', ext: '401' },
  { id: '2', name: 'Bot Suporte N1 (IA)', role: 'Agente IA (Gemini)', queue: 'Suporte FTTH', calls: 412, tma: '01:10', tme: '00:02', csat: 4.6, fcr: '78%', ext: '801' },
  { id: '3', name: 'Carlos Eduardo', role: 'Humano (Vendas Fibra)', queue: 'Vendas Inbound', calls: 52, tma: '06:15', tme: '01:20', csat: 4.9, fcr: '86%', ext: '402' },
  { id: '4', name: 'Mariana Lima', role: 'Humano (Retenção)', queue: 'Retenção', calls: 48, tma: '08:30', tme: '01:45', csat: 4.4, fcr: '74%', ext: '403' },
  { id: '5', name: 'Bot Qualificador (IA)', role: 'Agente IA (Gemini)', queue: 'Vendas Inbound', calls: 198, tma: '01:25', tme: '00:01', csat: 4.7, fcr: '92%', ext: '802' },
];

export default function Reports() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d'>('today');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SLA' | 'AGENTS' | 'REASONS'>('OVERVIEW');
  const [agentSearch, setAgentSearch] = useState('');
  const [exportFeedback, setExportFeedback] = useState(false);

  const currentData = TIMEFRAME_DATA[timeframe];

  const filteredAgents = MOCK_AGENTS_PERFORMANCE.filter(a => 
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.role.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.queue.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const handleExportCDR = () => {
    // Generate real CDR CSV file
    const headers = "call_id,timestamp,caller_number,queue,agent_type,agent_name,duration_seconds,status,csat\n";
    const sampleRows = [
      "call_10928,2026-09-05 14:15:22,11988881234,Suporte FTTH,HUMAN,Juliana Ferreira,245,ANSWERED,5",
      "call_10929,2026-09-05 14:18:05,11977774321,Triagem,AI_BOT,Bot Suporte N1,72,ANSWERED,4",
      "call_10930,2026-09-05 14:22:11,11999990000,Vendas Inbound,HUMAN,Carlos Eduardo,410,ANSWERED,5",
      "call_10931,2026-09-05 14:25:40,11966661122,Retenção,HUMAN,Mariana Lima,580,ANSWERED,4",
      "call_10932,2026-09-05 14:29:10,11955552233,Suporte FTTH,QUEUE,NENHUM,185,ABANDONED,0"
    ].join("\n");

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cdr_telecom_octo8_${timeframe}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportFeedback(true);
    setTimeout(() => setExportFeedback(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" /> Relatórios & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de Contact Center, SLAs de filas e desempenho da equipe.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
            <button 
              onClick={() => setTimeframe('today')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors", timeframe === 'today' ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
            >
              Hoje
            </button>
            <button 
              onClick={() => setTimeframe('7d')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors", timeframe === '7d' ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
            >
              7 Dias
            </button>
            <button 
              onClick={() => setTimeframe('30d')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-md transition-colors", timeframe === '30d' ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
            >
              30 Dias
            </button>
          </div>

          {/* Export CDR Button */}
          <button 
            onClick={handleExportCDR}
            className={cn(
              "px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95",
              exportFeedback ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {exportFeedback ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {exportFeedback ? 'Exportado!' : 'Exportar CDR (CSV)'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total de Interações" 
          value={currentData.interactions} 
          trend={currentData.interactionsTrend} 
          trendPositive 
          icon={<Activity className="w-5 h-5 text-blue-600" />} 
        />
        <KpiCard 
          title="TMA (Tempo Médio Atend.)" 
          value={currentData.tma} 
          trend={currentData.tmaTrend} 
          trendPositive 
          icon={<Clock className="w-5 h-5 text-emerald-600" />} 
        />
        <KpiCard 
          title="TME (Tempo Médio Espera)" 
          value={currentData.tme} 
          trend={currentData.tmeTrend} 
          trendPositive={timeframe !== 'today'} 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          alert={timeframe === 'today'} 
        />
        <KpiCard 
          title="Nível de Serviço (SLA Global)" 
          value={currentData.slaGlobal} 
          trend={currentData.slaTrend} 
          trendPositive 
          icon={<CheckCircle2 className="w-5 h-5 text-indigo-600" />} 
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl overflow-x-auto">
        <button 
          onClick={() => setActiveTab('OVERVIEW')}
          className={cn(
            "px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            activeTab === 'OVERVIEW' ? "border-blue-600 text-blue-700 bg-slate-50/80 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Activity className="w-4 h-4" /> Visão Geral de Volume
        </button>
        <button 
          onClick={() => setActiveTab('SLA')}
          className={cn(
            "px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            activeTab === 'SLA' ? "border-blue-600 text-blue-700 bg-slate-50/80 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <CheckCircle2 className="w-4 h-4" /> Aderência de SLA por Fila
        </button>
        <button 
          onClick={() => setActiveTab('AGENTS')}
          className={cn(
            "px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            activeTab === 'AGENTS' ? "border-blue-600 text-blue-700 bg-slate-50/80 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Users className="w-4 h-4" /> Performance de Atendentes & IA
        </button>
        <button 
          onClick={() => setActiveTab('REASONS')}
          className={cn(
            "px-5 py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
            activeTab === 'REASONS' ? "border-blue-600 text-blue-700 bg-slate-50/80 rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <PieChartIcon className="w-4 h-4" /> Motivos de Contato & Diagnóstico FTTH
        </button>
      </div>

      {/* Chart & Tables Area */}
      <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm p-6">
        
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Distribuição de Tráfego de Voz & Canais</h3>
                <p className="text-xs text-slate-500">Volume de chamadas inbound, outbound e abandonos</p>
              </div>
              <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-blue-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Receptivas</span>
                <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ativas</span>
                <span className="flex items-center gap-1.5 text-amber-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Abandonadas</span>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentData.volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="inbound" name="Receptivas" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInbound)" />
                  <Area type="monotone" dataKey="outbound" name="Ativas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutbound)" />
                  <Area type="monotone" dataKey="abandoned" name="Abandonadas" stroke="#f59e0b" strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'SLA' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Aderência de SLA por Fila de Atendimento (%)</h3>
                <p className="text-xs text-slate-500">Comparativo entre SLA Realizado vs Meta Operacional (90%)</p>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_SLA_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="sla" name="SLA Realizado (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={36} />
                  <Bar dataKey="target" name="Meta SLA (90%)" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'AGENTS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Quadro de Produtividade dos Agentes & Bots</h3>
                <p className="text-xs text-slate-500">Acompanhamento individual de TMA, TME, volume de atendimento e avaliação CSAT</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={agentSearch} 
                  onChange={(e) => setAgentSearch(e.target.value)} 
                  placeholder="Buscar agente ou fila..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Atendente / Bot</th>
                    <th className="p-3">Fila / Perfil</th>
                    <th className="p-3 text-center">Atendimentos</th>
                    <th className="p-3 text-center">TMA</th>
                    <th className="p-3 text-center">TME</th>
                    <th className="p-3 text-center">CSAT</th>
                    <th className="p-3 text-center">FCR</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">Nenhum atendente encontrado</td>
                    </tr>
                  ) : (
                    filteredAgents.map(ag => (
                      <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          {ag.role.includes('IA') ? (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Bot className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                              {ag.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p>{ag.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Ramal: {ag.ext}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 block">{ag.queue}</span>
                          <span className="text-[10px] text-slate-400">{ag.role}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">{ag.calls}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{ag.tma}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{ag.tme}</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            ★ {ag.csat}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600">{ag.fcr}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/telephony?dial=${ag.ext}`)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold transition-colors"
                              title="Chamar via WebRTC"
                            >
                              Ligar
                            </button>
                            <button
                              onClick={() => navigate('/telephony?tab=QUEUES')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition-colors"
                              title="Ver Fila de Atendimento"
                            >
                              Fila
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'REASONS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Top Motivos de Contato & Demandas FTTH</h3>
                <p className="text-xs text-slate-500">Classificação semântica em tempo real via Gemini RAG em chamadas e mensagens</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> IA Categorization Ativa
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Donut Chart */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Distribuição Percentual</h4>
                <div className="w-56 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={MOCK_CONTACT_REASONS}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {MOCK_CONTACT_REASONS.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} 
                        formatter={(val: any) => [`${val} contatos`, 'Volume']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 text-center font-medium mt-1">Total de 1.245 interações categorizadas</p>
              </div>

              {/* Progress Breakdown */}
              <div className="lg:col-span-2 space-y-3.5">
                {MOCK_CONTACT_REASONS.map((reason, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-2xs transition-shadow">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: reason.color }} />
                        <span className="font-bold text-slate-800">{reason.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{reason.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[11px]">{reason.value} contatos</span>
                        <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{reason.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${reason.percentage}%`, backgroundColor: reason.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Action Recommendations */}
            <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Otimização Recomendada pelo Gemini Copilot
                </h4>
                <p className="text-xs text-blue-700">
                  39% das chamadas são sobre instabilidade Wi-Fi. Habilitar o teste automático de ONU/Roteador na URA pode reduzir o TMA em até 45%.
                </p>
              </div>
              <button
                onClick={() => navigate('/ai')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-2xs"
              >
                Configurar Agente URA IA
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function KpiCard({ title, value, trend, trendPositive, icon, alert }: any) {
  return (
    <div className={cn("bg-white p-5 rounded-xl border shadow-2xs relative overflow-hidden transition-all", alert ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">{icon}</div>
        <div className={cn("flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full", trendPositive ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50")}>
          {trendPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {trend}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-500 text-xs font-semibold">{title}</h3>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}
