import React, { useState } from 'react';
import { 
  Bot, Settings, Play, CheckCircle2, AlertTriangle, 
  Plus, MoreVertical, Cpu, MessageSquare, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_AGENTS = [
  { id: 'bot-1', name: 'Suporte N1 (Triage)', type: 'ROUTING', status: 'ACTIVE', model: 'gemini-1.5-flash', interactions: 1450, successRate: 88 },
  { id: 'bot-2', name: 'Vendas (Lead Qualify)', type: 'CONVERSATIONAL', status: 'ACTIVE', model: 'gemini-1.5-pro', interactions: 820, successRate: 92 },
  { id: 'bot-3', name: 'Retenção (Churn Prevent)', type: 'CONVERSATIONAL', status: 'DRAFT', model: 'gemini-1.5-pro', interactions: 0, successRate: 0 },
];

export default function AiAutomation() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" /> Inteligência Artificial & Agentes
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure fluxos, prompts de sistema e modelos de linguagem para atendimento.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Agente IA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Agentes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_AGENTS.map((agent) => (
              <div key={agent.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-300 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      agent.status === 'ACTIVE' ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"
                    )}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{agent.name}</h3>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{agent.type}</span>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                    agent.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
                  )}>
                    {agent.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {agent.model}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interações</p>
                    <p className="text-lg font-bold text-slate-800">{agent.interactions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolução</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-slate-800">{agent.successRate}%</p>
                      {agent.status === 'ACTIVE' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Settings & Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <Cpu className="w-5 h-5 text-slate-400" /> Motor de IA Global
             </h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div>
                   <p className="text-sm font-semibold text-slate-800">Indexação RAG</p>
                   <p className="text-xs text-slate-500">Última sync: Há 2h</p>
                 </div>
                 <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center p-1 cursor-pointer">
                   <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
                 </div>
               </div>
               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div>
                   <p className="text-sm font-semibold text-slate-800">Handoff Automático</p>
                   <p className="text-xs text-slate-500">Transferir p/ humano em falha</p>
                 </div>
                 <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center p-1 cursor-pointer">
                   <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
               <Zap className="w-5 h-5 text-indigo-600" /> Configuração Rápida
            </h3>
            <p className="text-sm text-indigo-700/80 mb-4">
              Crie um novo agente a partir de templates pré-configurados para o seu segmento.
            </p>
            <button className="w-full py-2 bg-white text-indigo-700 font-semibold rounded-lg text-sm shadow-sm hover:bg-indigo-50 transition-colors border border-indigo-200">
              Ver Templates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
