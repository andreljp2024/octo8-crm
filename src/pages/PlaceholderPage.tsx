import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl text-slate-400">🚧</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
      <p className="text-slate-500 mt-2 max-w-md">
        Este módulo está planejado na arquitetura mestre do Octo8 e será implementado nas próximas fases.
      </p>
    </div>
  );
}
