import React from 'react';
import { PhoneCall, Bot, Network, Server } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center bg-white border border-slate-200 rounded-xl shadow-sm animate-in zoom-in-95 duration-300">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
        {title.includes('Telefonia') ? (
          <PhoneCall className="w-10 h-10 text-emerald-500" />
        ) : title.includes('IA') ? (
          <Bot className="w-10 h-10 text-indigo-500" />
        ) : title.includes('Tenant') ? (
          <Server className="w-10 h-10 text-slate-500" />
        ) : (
          <Network className="w-10 h-10 text-blue-500" />
        )}
      </div>
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
      <p className="text-slate-500 mt-3 max-w-md text-sm leading-relaxed">
        Este módulo de VoIP/Contact Center está aguardando provisionamento de infraestrutura (SIP/WebRTC). 
        A interface será inicializada nas próximas fases de integração.
      </p>
    </div>
  );
}
