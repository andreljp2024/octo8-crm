import React from 'react';
import { Users, Phone, Clock, AlertTriangle, CheckCircle2, XCircle, MoreVertical, MessageSquare } from 'lucide-react';
import { Queue, ChannelStatus } from '@/types';
import { cn } from '@/lib/utils';

const MOCK_QUEUES: Queue[] = [
  { id: 'q-1', tenantId: 't-1', name: 'Suporte FTTH', waiting: 12, slaRisk: 3, slaBreached: 1, activeAgents: 8 },
  { id: 'q-2', tenantId: 't-1', name: 'Comercial', waiting: 4, slaRisk: 0, slaBreached: 0, activeAgents: 5 },
  { id: 'q-3', tenantId: 't-1', name: 'Financeiro', waiting: 7, slaRisk: 1, slaBreached: 0, activeAgents: 3 },
];

const MOCK_CHANNELS: ChannelStatus[] = [
  { id: 'c-1', name: 'WhatsApp Oficial', type: 'WHATSAPP', status: 'ONLINE', activeConversations: 145 },
  { id: 'c-2', name: 'Instagram Direct', type: 'INSTAGRAM', status: 'ONLINE', activeConversations: 32 },
  { id: 'c-3', name: 'PABX Asterisk', type: 'TELEPHONY', status: 'DEGRADED', activeConversations: 8 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Center</h1>
          <p className="text-sm text-slate-500 mt-1">Visão em tempo real da operação e canais.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Tenant Health: ONLINE
          </div>
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Baixar Relatório
          </button>
        </div>
      </div>

      {/* Real-time KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Agentes Online" 
          value="42" 
          subtext="12 Pausados / 30 Disponíveis" 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
          trend="+3"
        />
        <KpiCard 
          title="Fila de Espera" 
          value="23" 
          subtext="Tempo médio: 04:12" 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          trend="-2"
          alert
        />
        <KpiCard 
          title="Conversas Ativas" 
          value="185" 
          subtext="145 WhatsApp / 40 Outros" 
          icon={<MessageSquare className="w-5 h-5 text-indigo-600" />} 
          trend="+12%"
        />
        <KpiCard 
          title="FCR (Resolvidas no 1º contato)" 
          value="76%" 
          subtext="Meta: >75%" 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          trend="+2.1%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queues Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Status das Filas</h2>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {MOCK_QUEUES.map(queue => (
              <div key={queue.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-medium text-slate-900">{queue.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {queue.activeAgents} agentes</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {queue.waiting} na fila</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {queue.slaRisk > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2 py-1 rounded-md border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> {queue.slaRisk} em risco
                    </span>
                  )}
                  {queue.slaBreached > 0 && (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-medium px-2 py-1 rounded-md border border-red-200">
                      <XCircle className="w-3 h-3" /> {queue.slaBreached} estourado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channels Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Saúde dos Canais</h2>
            <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {MOCK_CHANNELS.map(channel => (
              <div key={channel.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    channel.type === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-600' :
                    channel.type === 'INSTAGRAM' ? 'bg-fuchsia-100 text-fuchsia-600' :
                    'bg-blue-100 text-blue-600'
                  )}>
                    {channel.type === 'TELEPHONY' ? <Phone className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{channel.name}</h3>
                    <p className="text-sm text-slate-500">{channel.activeConversations} sessões ativas</p>
                  </div>
                </div>
                <div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                    channel.status === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-200' :
                    channel.status === 'DEGRADED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      channel.status === 'ONLINE' ? 'bg-green-500' :
                      channel.status === 'DEGRADED' ? 'bg-amber-500' :
                      'bg-slate-400'
                    )}></span>
                    {channel.status}
                  </span>
                </div>
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
    <div className={cn("bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden", alert ? "border-amber-200" : "border-slate-200")}>
      {alert && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>}
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <div className={cn("text-xs font-medium px-2 py-1 rounded-md", trend.startsWith('+') ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50")}>
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
