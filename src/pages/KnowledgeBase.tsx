import React, { useState } from 'react';
import { 
  BookOpen, Search, Folder, FileText, 
  Plus, Edit3, Trash2, Cpu, CheckCircle2,
  Lock, Globe, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock Data
const CATEGORIES = [
  { id: 'cat-1', name: 'Suporte Técnico (FTTH)', count: 24, icon: <Folder className="w-4 h-4" /> },
  { id: 'cat-2', name: 'Roteiros de Vendas', count: 12, icon: <Folder className="w-4 h-4" /> },
  { id: 'cat-3', name: 'Políticas de Cobrança', count: 8, icon: <Lock className="w-4 h-4" /> },
  { id: 'cat-4', name: 'Perguntas Frequentes (FAQ)', count: 45, icon: <Globe className="w-4 h-4" /> },
];

const ARTICLES = [
  { 
    id: 'art-1', 
    categoryId: 'cat-1', 
    title: 'Procedimento: Cliente sem conexão (LOS Vermelho)', 
    excerpt: 'Passo a passo para diagnóstico de rompimento de fibra óptica e agendamento de visita.',
    status: 'PUBLISHED', 
    aiSynced: true, 
    lastUpdated: 'Ontem, 14:30' 
  },
  { 
    id: 'art-2', 
    categoryId: 'cat-1', 
    title: 'Configuração Roteador Padrão (Wi-Fi 6)', 
    excerpt: 'Parâmetros de PPPoE, VLAN e configurações recomendadas para o roteador AX3000.',
    status: 'PUBLISHED', 
    aiSynced: true, 
    lastUpdated: 'Há 3 dias' 
  },
  { 
    id: 'art-3', 
    categoryId: 'cat-2', 
    title: 'Script de Abordagem: Upgrade para 1 Giga', 
    excerpt: 'Argumentos de venda e quebra de objeções para clientes da base.',
    status: 'DRAFT', 
    aiSynced: false, 
    lastUpdated: 'Hoje, 09:15' 
  },
];

export default function KnowledgeBase() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Base de Conhecimento (Knowledge)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie artigos, scripts e a base de dados (RAG) que alimenta a IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium">
            <Cpu className="w-4 h-4" /> Indexação de IA: Ativa
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Artigo
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Sidebar - Categorias */}
        <div className="w-64 flex-shrink-0 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">Categorias</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                onClick={() => setActiveCategory('ALL')}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeCategory === 'ALL' ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Todos os Artigos
                </div>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">89</span>
              </button>
              
              <div className="my-2 border-t border-slate-100"></div>

              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeCategory === cat.id ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={activeCategory === cat.id ? "text-emerald-600" : "text-slate-400"}>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs shrink-0", activeCategory === cat.id ? "bg-emerald-200/50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Nova Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Artigos */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
            <div className="relative w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, conteúdo ou tag..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-sm transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Ordenar por:</span>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500">
                <option>Mais recentes</option>
                <option>Mais acessados</option>
                <option>Alfabética</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {ARTICLES.filter(a => activeCategory === 'ALL' || a.categoryId === activeCategory).map(article => (
              <div key={article.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border",
                      article.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {article.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Atualizado: {article.lastUpdated}
                    </span>
                  </div>
                  
                  {article.aiSynced ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100" title="Sincronizado com Banco Vetorial (RAG)">
                      <Cpu className="w-3.5 h-3.5" /> IA Sincronizada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200" title="Aguardando sincronização com IA">
                      <AlertTriangle className="w-3.5 h-3.5" /> Não Sincronizado
                    </span>
                  )}
                </div>
              </div>
            ))}

            {ARTICLES.filter(a => activeCategory === 'ALL' || a.categoryId === activeCategory).length === 0 && (
               <div className="flex flex-col items-center justify-center h-48 text-center bg-white border border-dashed border-slate-300 rounded-xl">
                 <FileText className="w-10 h-10 text-slate-300 mb-3" />
                 <p className="text-slate-500 font-medium text-sm">Nenhum artigo encontrado nesta categoria.</p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
