import React, { useState } from 'react';
import { 
  Server, Network, Database, ShieldCheck, Activity, 
  Settings, Key, AlertCircle, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TenantSettings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-600" /> Configurações do Tenant
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie conexões de infraestrutura, PBX, faturamento e integrações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
               <h2 className="font-bold text-slate-800 flex items-center gap-2">
                 <Network className="w-5 h-5 text-slate-500" /> Integrações de Infraestrutura
               </h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              <ConnectionRow 
                name="Asterisk PBX (SBC Central)" 
                status="CONNECTED" 
                latency="12ms" 
                lastSync="Há 2 min" 
                icon={<Server className="w-5 h-5 text-blue-500" />} 
              />
              <ConnectionRow 
                name="SGP (Sistema de Gestão)" 
                status="CONNECTED" 
                latency="45ms" 
                lastSync="Há 15 min" 
                icon={<Database className="w-5 h-5 text-emerald-500" />} 
              />
              <ConnectionRow 
                name="WhatsApp Business API" 
                status="DEGRADED" 
                latency="-" 
                lastSync="Falha às 10:15" 
                icon={<Activity className="w-5 h-5 text-amber-500" />} 
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-slate-500" /> Credenciais de API (Webhooks)
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-sm text-slate-600 break-all">
              https://api.octo8.com/v1/webhooks/tenant_1/receive?token=sk_live_...
            </div>
            <p className="text-xs text-slate-500 mt-2">Utilize esta URL para enviar eventos externos para a plataforma.</p>
          </div>
        </div>

        {/* System Health Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Saúde do Sistema
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">Uso de Banco de Dados</span>
                  <span className="font-bold text-slate-900">45%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[45%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">Armazenamento (Gravações)</span>
                  <span className="font-bold text-slate-900">82%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[82%]"></div>
                </div>
                <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Limite de 500GB próximo
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ConnectionRow({ name, status, latency, lastSync, icon }: any) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-slate-900">{name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Última sincronização: {lastSync}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn(
          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
          status === 'CONNECTED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {status === 'CONNECTED' ? 'Conectado' : 'Instável'}
        </span>
        {latency !== '-' && <span className="text-[10px] font-mono text-slate-400">{latency}</span>}
      </div>
    </div>
  );
}
