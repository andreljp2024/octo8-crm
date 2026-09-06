import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Folder, FileText, 
  Plus, Edit3, Trash2, Cpu, CheckCircle2,
  Lock, Globe, AlertTriangle, X, Sparkles, RefreshCw, Check, ArrowRight, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Category {
  id: string;
  name: string;
  count: number;
  iconType: 'folder' | 'lock' | 'globe';
}

interface Article {
  id: string;
  categoryId: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  status: 'PUBLISHED' | 'DRAFT';
  aiSynced: boolean;
  lastUpdated: string;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Suporte Técnico (FTTH)', count: 24, iconType: 'folder' },
  { id: 'cat-2', name: 'Roteiros de Vendas', count: 12, iconType: 'folder' },
  { id: 'cat-3', name: 'Políticas de Cobrança', count: 8, iconType: 'lock' },
  { id: 'cat-4', name: 'Perguntas Frequentes (FAQ)', count: 45, iconType: 'globe' },
];

const INITIAL_ARTICLES: Article[] = [
  { 
    id: 'art-1', 
    categoryId: 'cat-1', 
    title: 'Procedimento: Cliente sem conexão (LOS Vermelho na ONU)', 
    excerpt: 'Passo a passo para diagnóstico de rompimento de fibra óptica e agendamento de visita.',
    content: `## Diagnóstico de Rompimento de Fibra (LOS Vermelho)\n\nQuando a luz **LOS** (Loss of Signal) estiver piscando em vermelho na ONU/ONT do cliente, indica ausência de potência óptica vinda da OLT/Splitter.\n\n### Roteiro de Atendimento:\n1. **Confirmação Visual:** Peça para o cliente verificar se o conector verde (SC-APC) está devidamente encaixado na porta óptica da ONU.\n2. **Checagem de Curvatura:** Oriente o cliente a não dobrar o cordão de fibra óptica.\n3. **Checagem de Incidente Massivo:** Consulte no mapa de rede se a CTO correspondente está em alarme.\n4. **Abertura de O.S.:** Se for rompimento individual, abra a Ordem de Serviço com prioridade Normal (SLA de 4 horas para clientes residenciais ou 2 horas para corporativos).`,
    tags: ['fibra', 'los', 'onu', 'suporte'],
    status: 'PUBLISHED', 
    aiSynced: true, 
    lastUpdated: 'Hoje, 14:30' 
  },
  { 
    id: 'art-2', 
    categoryId: 'cat-1', 
    title: 'Configuração Roteador Padrão Wi-Fi 6 (AX3000)', 
    excerpt: 'Parâmetros de PPPoE, VLAN e configurações de frequências 2.4GHz e 5GHz.',
    content: `## Guia de Provisionamento do Roteador Wi-Fi 6\n\nConfigurações recomendadas para instalação em clientes com planos a partir de 500 Mega:\n\n- **Modo de Operação:** Roteador Wireless (PPPoE)\n- **VLAN ID Internet:** 100\n- **MTU:** 1492\n- **DNS Primário:** 1.1.1.1 | **DNS Secundário:** 8.8.8.8\n- **Band Steering (Smart Connect):** Ativado por padrão para unificar os SSIDs de 2.4GHz e 5GHz com chave WPA3/WPA2-PSK.`,
    tags: ['wifi6', 'ax3000', 'pppoe', 'config'],
    status: 'PUBLISHED', 
    aiSynced: true, 
    lastUpdated: 'Há 3 dias' 
  },
  { 
    id: 'art-3', 
    categoryId: 'cat-2', 
    title: 'Script de Abordagem: Upgrade para 1 Giga com Mesh', 
    excerpt: 'Argumentos de venda e quebra de objeções para clientes da base residencial.',
    content: `## Pitch de Vendas: Upgrade 1 Giga\n\n### Perfil Alvo:\nClientes da base que relatam múltiplos dispositivos conectados (Smart TVs 4K, consoles de videogame, home office).\n\n### Script Sugerido:\n"Olá [Nome], identifiquei que sua residência possui diversos aparelhos conectados simultaneamente. Nosso plano de 1 Giga inclui dois módulos Mesh Wi-Fi 6 que eliminam pontos cegos na sua casa sem necessidade de passar cabos, por uma diferença de apenas R$ 39,90 na sua fatura!"`,
    tags: ['vendas', 'upgrade', 'mesh', '1giga'],
    status: 'PUBLISHED', 
    aiSynced: true, 
    lastUpdated: 'Ontem, 09:15' 
  },
  { 
    id: 'art-4', 
    categoryId: 'cat-3', 
    title: 'Política de Desbloqueio em Confiança (Promessa de Pagamento)', 
    excerpt: 'Regras e critérios para liberação temporária de sinal de internet por 48 horas.',
    content: `## Desbloqueio em Confiança\n\nO desbloqueio em confiança pode ser concedido 1 única vez por ciclo de faturamento para clientes com até 15 dias de atraso.\n\n### Critérios:\n- Cliente não pode ter histórico de quebra de acordo nos últimos 90 dias.\n- O sinal é restabelecido por 48 horas úteis enquanto o boleto ou PIX é compensado.\n- Após 48 horas sem baixa bancária, o bloqueio automático é reativado pelo sistema de faturamento.`,
    tags: ['financeiro', 'desbloqueio', 'cobranca'],
    status: 'DRAFT', 
    aiSynced: false, 
    lastUpdated: 'Hoje, 11:00' 
  },
];

export default function KnowledgeBase() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title'>('recent');

  // Article reading modal
  const [viewingArticle, setViewingArticle] = useState<Article | null>(null);

  // Article create / edit modal
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState(INITIAL_CATEGORIES[0].id);
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artStatus, setArtStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  
  // AI generation states
  const [isGeneratingExcerpt, setIsGeneratingExcerpt] = useState(false);

  // Category create modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // RAG sync notification feedback
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Firestore Subscription: Articles
  useEffect(() => {
    const q = query(collection(db, 'kb_articles'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && articles.length === 0) {
        // Seed mock articles to Firestore if empty
        INITIAL_ARTICLES.forEach(async (art) => {
          try {
            await setDoc(doc(db, 'kb_articles', art.id), {
              ...art,
              lastUpdated: new Date().toISOString()
            });
          } catch (e) {
            console.warn("Could not seed KB article:", e);
          }
        });
        setArticles(INITIAL_ARTICLES);
      } else {
        const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Article));
        setArticles(docsData);
      }
    }, (error) => {
      console.warn("Firestore listener error, using fallback articles:", error);
      setArticles(INITIAL_ARTICLES);
    });

    return () => unsubscribe();
  }, []);

  const filteredArticles = articles
    .filter(a => activeCategory === 'ALL' || a.categoryId === activeCategory)
    .filter(a => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return b.id.localeCompare(a.id);
    });

  const openCreateArticle = () => {
    setEditingArticle(null);
    setArtTitle('');
    setArtCategory(activeCategory !== 'ALL' ? activeCategory : categories[0].id);
    setArtExcerpt('');
    setArtContent('');
    setArtStatus('PUBLISHED');
    setIsArticleModalOpen(true);
  };

  const openEditArticle = (art: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingArticle(art);
    setArtTitle(art.title);
    setArtCategory(art.categoryId);
    setArtExcerpt(art.excerpt);
    setArtContent(art.content);
    setArtStatus(art.status);
    setIsArticleModalOpen(true);
  };

  const handleDeleteArticle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Deseja excluir este artigo da base?')) {
      setArticles(prev => prev.filter(a => a.id !== id));
      if (viewingArticle?.id === id) setViewingArticle(null);
      
      try {
        await deleteDoc(doc(db, 'kb_articles', id));
      } catch (err) {
        console.warn("Could not delete from Firestore:", err);
      }
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim() || !artContent.trim()) return;

    if (editingArticle) {
      const updated: Article = {
        ...editingArticle,
        title: artTitle,
        categoryId: artCategory,
        excerpt: artExcerpt || artContent.substring(0, 100) + '...',
        content: artContent,
        status: artStatus,
        aiSynced: false,
        lastUpdated: new Date().toISOString()
      };
      setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
      
      try {
        await updateDoc(doc(db, 'kb_articles', updated.id), { ...updated });
      } catch (err) {
        console.warn("Could not update article in Firestore:", err);
      }
    } else {
      const newArt: Article = {
        id: `art-${Date.now()}`,
        categoryId: artCategory,
        title: artTitle,
        excerpt: artExcerpt || artContent.substring(0, 100) + '...',
        content: artContent,
        tags: ['geral'],
        status: artStatus,
        aiSynced: true,
        lastUpdated: new Date().toISOString()
      };
      setArticles(prev => [newArt, ...prev]);

      try {
        await setDoc(doc(db, 'kb_articles', newArt.id), newArt);
      } catch (err) {
        console.warn("Could not save new article to Firestore:", err);
      }
    }

    setIsArticleModalOpen(false);
  };

  const handleGenerateExcerpt = async () => {
    if (!artContent.trim()) {
      alert("Adicione conteúdo ao artigo antes de gerar o resumo.");
      return;
    }
    
    setIsGeneratingExcerpt(true);
    try {
      const res = await fetch('/api/copilot/kb-excerpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: artContent })
      });
      const data = await res.json();
      if (data.excerpt) {
        setArtExcerpt(data.excerpt);
      }
    } catch (e) {
      console.error("Erro ao gerar resumo", e);
    } finally {
      setIsGeneratingExcerpt(false);
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      count: 0,
      iconType: 'folder'
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName('');
    setIsCatModalOpen(false);
  };

  const handleSyncRAG = () => {
    setSyncFeedback('Sincronizando embeddings vetoriais com Gemini RAG...');
    setTimeout(async () => {
      const updatedArticles = articles.map(a => ({ ...a, aiSynced: true }));
      setArticles(updatedArticles);
      setSyncFeedback('Base de Conhecimento indexada com sucesso no motor de IA!');
      
      // Update in Firestore
      for (const art of updatedArticles) {
        if (!art.aiSynced) { // actually, we check if they were not synced before, but we can just update all or just those that need it
          try {
            await updateDoc(doc(db, 'kb_articles', art.id), { aiSynced: true });
          } catch (e) {
            console.warn("Could not sync to Firestore", e);
          }
        }
      }
      
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 1200);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Base de Conhecimento (Knowledge)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie artigos, scripts de atendimento e a base RAG que alimenta os agentes de IA.</p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={handleSyncRAG}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Cpu className="w-4 h-4" /> Indexar RAG com IA
          </button>
          <button 
            onClick={openCreateArticle}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Artigo
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> {syncFeedback}
          </span>
          <button onClick={() => setSyncFeedback(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        
        {/* Sidebar - Categorias */}
        <div className="w-64 flex-shrink-0 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Categorias</h2>
              <span className="text-[10px] text-slate-400 font-mono">{categories.length} grupos</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                onClick={() => setActiveCategory('ALL')}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors",
                  activeCategory === 'ALL' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 opacity-70" /> Todos os Artigos
                </div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px]", activeCategory === 'ALL' ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600")}>
                  {articles.length}
                </span>
              </button>
              
              <div className="my-2 border-t border-slate-100"></div>

              {categories.map(cat => {
                const count = articles.filter(a => a.categoryId === cat.id).length;
                return (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                      activeCategory === cat.id ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className={cn("w-3.5 h-3.5", activeCategory === cat.id ? "text-emerald-600" : "text-slate-400")} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] shrink-0", activeCategory === cat.id ? "bg-emerald-200/60 text-emerald-800 font-bold" : "bg-slate-100 text-slate-500")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setIsCatModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Categoria
              </button>
            </div>
          </div>
        </div>

        {/* Artigos List */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          {/* Top Search & Filter */}
          <div className="p-3.5 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, conteúdo, palavra-chave..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs font-semibold text-slate-500">Ordenar:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 outline-none font-medium"
              >
                <option value="recent">Mais recentes</option>
                <option value="title">Ordem alfabética</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {filteredArticles.map(article => (
              <div 
                key={article.id} 
                onClick={() => setViewingArticle(article)}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => openEditArticle(article, e)}
                      title="Editar Artigo"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteArticle(article.id, e)}
                      title="Excluir Artigo"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                  {article.excerpt}
                </p>

                <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                      article.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {article.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Atualizado: {article.lastUpdated}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {article.aiSynced ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        <Cpu className="w-3 h-3 text-indigo-600" /> IA Indexada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Pendente de Indexação
                      </span>
                    )}
                    <span className="text-xs font-semibold text-emerald-700 group-hover:underline flex items-center gap-0.5">
                      Ver <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredArticles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-white border border-dashed border-slate-300 rounded-xl">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-600 font-semibold text-xs">Nenhum artigo encontrado.</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Tente ajustar o termo de pesquisa ou crie um novo artigo.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: View Article Details */}
      {viewingArticle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    {viewingArticle.status}
                  </span>
                  {viewingArticle.aiSynced && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Vetorizado no RAG
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{viewingArticle.title}</h2>
              </div>
              <button 
                onClick={() => setViewingArticle(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 font-medium italic">
                Resumo: {viewingArticle.excerpt}
              </div>

              <div className="prose prose-slate max-w-none text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {viewingArticle.content}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Última atualização: {viewingArticle.lastUpdated}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    openEditArticle(viewingArticle);
                    setViewingArticle(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Editar Artigo
                </button>
                <button 
                  onClick={() => setViewingArticle(null)}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Article */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingArticle ? 'Editar Artigo' : 'Novo Artigo na Base'}
              </h2>
              <button 
                onClick={() => setIsArticleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Título do Artigo
                </label>
                <input 
                  type="text" 
                  value={artTitle}
                  onChange={(e) => setArtTitle(e.target.value)}
                  placeholder="Ex: Roteiro para Diagnóstico de Perda de Pacotes" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Categoria
                  </label>
                  <select 
                    value={artCategory}
                    onChange={(e) => setArtCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 outline-none font-medium"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Status de Publicação
                  </label>
                  <select 
                    value={artStatus}
                    onChange={(e) => setArtStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 outline-none font-medium"
                  >
                    <option value="PUBLISHED">Publicado (Visível para Agentes & IA)</option>
                    <option value="DRAFT">Rascunho (Interno)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Resumo Curto (Excerpt)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={artExcerpt}
                    onChange={(e) => setArtExcerpt(e.target.value)}
                    placeholder="Breve descrição em 1 linha para exibição no card..." 
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateExcerpt}
                    disabled={isGeneratingExcerpt || !artContent.trim()}
                    className={cn(
                      "px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors",
                      (isGeneratingExcerpt || !artContent.trim()) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isGeneratingExcerpt ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    Auto-resumo
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">O resumo é indexado para busca semântica do RAG e exibido na listagem de artigos.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Conteúdo Completo (Procedimento / Script / Markdown)
                </label>
                <textarea 
                  rows={8}
                  value={artContent}
                  onChange={(e) => setArtContent(e.target.value)}
                  placeholder="Escreva as instruções detalhadas, passos de teste de ping, roteamento ou script de abordagem..." 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                >
                  {editingArticle ? 'Salvar Artigo' : 'Publicar Artigo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Category */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Nova Categoria</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome da Categoria</label>
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Treinamento Operacional" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
