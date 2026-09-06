import React, { useState, useEffect } from 'react';
import { 
  Bot, Settings, Play, CheckCircle2, AlertTriangle, 
  Plus, MoreVertical, Cpu, MessageSquare, Zap, X,
  Send, Sparkles, Sliders, Shield, BookOpen, Trash2, Edit3, ArrowRight, RefreshCw, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Agent {
  id: string;
  name: string;
  type: 'ROUTING' | 'CONVERSATIONAL' | 'QUALIFICATION' | 'RETENTION';
  status: 'ACTIVE' | 'DRAFT' | 'PAUSED';
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
  temperature: number;
  knowledgeBaseLinked: boolean;
  interactions: number;
  successRate: number;
  lastTrained: string;
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'bot-1',
    name: 'Suporte N1 (Triagem FTTH)',
    type: 'ROUTING',
    status: 'ACTIVE',
    model: 'gemini-2.5-flash',
    systemPrompt: 'Você é o atendente virtual N1 da operadora. Identifique se o cliente está sem internet (verificar LOS vermelho na ONU/ONT) ou com lentidão no Wi-Fi. Solicite o CPF do titular caso não tenha sido informado. Se for rompimento na rua, colete o endereço e encaminhe para o Suporte N2.',
    temperature: 0.3,
    knowledgeBaseLinked: true,
    interactions: 1450,
    successRate: 88,
    lastTrained: 'Hoje às 08:30'
  },
  {
    id: 'bot-2',
    name: 'Vendas & Planos Fibra',
    type: 'QUALIFICATION',
    status: 'ACTIVE',
    model: 'gemini-2.5-flash',
    systemPrompt: 'Aja como consultor comercial de planos de internet fibra óptica. Apresente os planos de 500 Mega (R$ 99/mês com Wi-Fi 6) e 1 Giga (R$ 149/mês com 2 roteadores Mesh). Colete CEP e número para checagem de viabilidade e conduza o lead para fechamento.',
    temperature: 0.7,
    knowledgeBaseLinked: true,
    interactions: 820,
    successRate: 92,
    lastTrained: 'Ontem às 18:00'
  },
  {
    id: 'bot-3',
    name: 'Retenção & Prevenção de Churn',
    type: 'RETENTION',
    status: 'DRAFT',
    model: 'gemini-2.5-pro',
    systemPrompt: 'Você atua na retenção de clientes insatisfeitos com problemas técnicos recorrentes ou cancelamento. Seja empático, reconheça o incômodo, ofereça visita técnica prioritária de certificação de sinal e desconto de 20% na próxima mensalidade.',
    temperature: 0.4,
    knowledgeBaseLinked: false,
    interactions: 140,
    successRate: 74,
    lastTrained: 'Há 3 dias'
  },
];

const TEMPLATES = [
  {
    name: 'Assistente de Segunda Via & Boletos',
    type: 'CONVERSATIONAL' as const,
    model: 'gemini-2.5-flash' as const,
    prompt: 'Solicite o CPF ou CNPJ cadastrado, localize as faturas em aberto no SGP e envie a linha digitável ou código PIX copia e cola para pagamento imediato.'
  },
  {
    name: 'Qualificador de Vendas B2B (Link Dedicado)',
    type: 'QUALIFICATION' as const,
    model: 'gemini-2.5-flash' as const,
    prompt: 'Qualifique clientes empresariais interessados em IP Fixo, Link Dedicado com SLA 99.8% ou Telefonia SIP Trunk. Pergunte quantidade de colaboradores e endereço da sede.'
  },
  {
    name: 'Triagem Noturna Automática',
    type: 'ROUTING' as const,
    model: 'gemini-2.5-flash' as const,
    prompt: 'Atenda clientes fora do horário comercial. Valide se há incidente massivo na região e cadastre protocolo de chamado para abertura automática na manhã seguinte.'
  }
];

export default function AiAutomation() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Playground state
  const [activePlaygroundAgent, setActivePlaygroundAgent] = useState<Agent | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; role: 'user' | 'agent'; text: string; feedback?: 'THUMBS_UP' | 'THUMBS_DOWN' }[]>([]);
  const [inputChat, setInputChat] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<Agent['type']>('CONVERSATIONAL');
  const [formModel, setFormModel] = useState<Agent['model']>('gemini-2.5-flash');
  const [formPrompt, setFormPrompt] = useState('');
  const [formTemperature, setFormTemperature] = useState(0.4);
  const [formKnowledge, setFormKnowledge] = useState(true);

  // Firestore Subscription
  useEffect(() => {
    const q = query(collection(db, 'ai_agents'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && agents.length === 0) {
        // Seed initial agents to Firestore if empty
        DEFAULT_AGENTS.forEach(async (agent) => {
          try {
            await setDoc(doc(db, 'ai_agents', agent.id), agent);
          } catch (e) {
            console.warn("Could not seed AI Agent:", e);
          }
        });
        setAgents(DEFAULT_AGENTS);
      } else {
        const docsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Agent));
        // Sort explicitly if needed, here just raw data
        setAgents(docsData.sort((a,b) => b.interactions - a.interactions));
      }
    }, (error) => {
      console.warn("Firestore listener error, using fallback agents:", error);
      setAgents(DEFAULT_AGENTS);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingAgent(null);
    setFormName('');
    setFormType('CONVERSATIONAL');
    setFormModel('gemini-2.5-flash');
    setFormPrompt('');
    setFormTemperature(0.4);
    setFormKnowledge(true);
    setIsModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setEditingAgent(agent);
    setFormName(agent.name);
    setFormType(agent.type);
    setFormModel(agent.model);
    setFormPrompt(agent.systemPrompt);
    setFormTemperature(agent.temperature);
    setFormKnowledge(agent.knowledgeBaseLinked);
    setIsModalOpen(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingAgent) {
      const updated: Agent = {
        ...editingAgent,
        name: formName,
        type: formType,
        model: formModel,
        systemPrompt: formPrompt,
        temperature: formTemperature,
        knowledgeBaseLinked: formKnowledge,
        lastTrained: 'Recém-atualizado'
      };
      setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
      
      try {
        await updateDoc(doc(db, 'ai_agents', updated.id), { ...updated });
      } catch (err) {
        console.warn("Could not update agent in Firestore:", err);
      }
    } else {
      const newAgent: Agent = {
        id: `bot-${Date.now()}`,
        name: formName,
        type: formType,
        status: 'ACTIVE',
        model: formModel,
        systemPrompt: formPrompt,
        temperature: formTemperature,
        knowledgeBaseLinked: formKnowledge,
        interactions: 0,
        successRate: 100,
        lastTrained: 'Recém-criado'
      };
      setAgents(prev => [newAgent, ...prev]);

      try {
        await setDoc(doc(db, 'ai_agents', newAgent.id), newAgent);
      } catch (err) {
        console.warn("Could not save new agent to Firestore:", err);
      }
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    
    const nextStatus = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
    
    try {
      await updateDoc(doc(db, 'ai_agents', id), { status: nextStatus });
    } catch (err) {
      console.warn("Could not update agent status in Firestore:", err);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este agente de IA?')) {
      setAgents(prev => prev.filter(a => a.id !== id));
      if (activePlaygroundAgent?.id === id) {
        setActivePlaygroundAgent(null);
      }
      
      try {
        await deleteDoc(doc(db, 'ai_agents', id));
      } catch (err) {
        console.warn("Could not delete agent from Firestore:", err);
      }
    }
  };

  const handleOpenPlayground = (agent: Agent) => {
    setActivePlaygroundAgent(agent);
    setChatMessages([
      { 
        id: `msg-${Date.now()}`,
        role: 'agent', 
        text: `Olá! Sou o agente "${agent.name}" pronto para testar. Como posso ajudar seu atendimento hoje?` 
      }
    ]);
  };

  const handleSendMessageToPlayground = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputChat.trim() || !activePlaygroundAgent) return;

    const userMessage = inputChat.trim();
    setInputChat('');
    const newHistory = [...chatMessages, { id: `msg-${Date.now()}`, role: 'user' as const, text: userMessage }];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/copilot/test-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: activePlaygroundAgent.name,
          systemPrompt: activePlaygroundAgent.systemPrompt,
          message: userMessage,
          history: newHistory
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { id: `msg-${Date.now() + 1}`, role: 'agent', text: data.reply }]);
    } catch (err) {
      console.error("Error talking to agent sandbox:", err);
      setChatMessages(prev => [...prev, { 
        id: `msg-${Date.now() + 1}`,
        role: 'agent', 
        text: 'Desculpe, ocorreu uma oscilação na resposta da IA. Mas a configuração do seu agente está gravada e operante!' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, rating: 'THUMBS_UP' | 'THUMBS_DOWN') => {
    setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: rating } : m));
    
    try {
      await fetch('/api/copilot/agent-chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: messageId,
          agentName: activePlaygroundAgent?.id || 'unknown',
          rating,
          comment: 'Feedback from Playground Sandbox'
        })
      });
    } catch (e) {
      console.warn("Failed to send feedback", e);
    }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setFormName(t.name);
    setFormType(t.type);
    setFormModel(t.model);
    setFormPrompt(t.prompt);
    setFormTemperature(0.4);
    setFormKnowledge(true);
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" /> Inteligência Artificial & Agentes
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure fluxos, prompts de sistema, modelos de linguagem e teste ao vivo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Agente IA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Section: Agents List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div 
                key={agent.id} 
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                        agent.status === 'ACTIVE' ? "bg-indigo-600 text-white" : 
                        agent.status === 'PAUSED' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                      )}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-tight">{agent.name}</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{agent.type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(agent)}
                        title="Editar Agente"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAgent(agent.id)}
                        title="Excluir Agente"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                    "{agent.systemPrompt}"
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button 
                      onClick={() => handleToggleStatus(agent.id)}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors cursor-pointer",
                        agent.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                        agent.status === 'PAUSED' ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" :
                        "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      ● {agent.status === 'ACTIVE' ? 'Ativo' : agent.status === 'PAUSED' ? 'Pausado' : 'Rascunho'}
                    </button>

                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {agent.model}
                    </span>

                    {agent.knowledgeBaseLinked && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> RAG
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-100 text-left">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interações</p>
                      <p className="text-base font-bold text-slate-800">{agent.interactions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolução</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-base font-bold text-slate-800">{agent.successRate}%</p>
                        {agent.status === 'ACTIVE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </div>
                  </div>

                  {/* Sandbox Button */}
                  <button 
                    onClick={() => handleOpenPlayground(agent)}
                    className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-indigo-700" /> Testar no Sandbox
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Global Engine & Quick Templates */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Global Engine Switches */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" /> Motor de IA & Regras Globais
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Indexação RAG (Base de Conhecimento)</p>
                  <p className="text-xs text-slate-500">Consulta vetorial aos artigos do provedor</p>
                </div>
                <button 
                  onClick={() => setRagEnabled(!ragEnabled)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors flex items-center px-1 shrink-0",
                    ragEnabled ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                    ragEnabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Handoff Automático p/ Humano</p>
                  <p className="text-xs text-slate-500">Transfere em caso de frustração ou pedido explícito</p>
                </div>
                <button 
                  onClick={() => setAutoHandoff(!autoHandoff)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors flex items-center px-1 shrink-0",
                    autoHandoff ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                    autoHandoff ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Templates Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-xl p-5 shadow-sm">
            <h3 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" /> Templates Prontos para ISP
            </h3>
            <p className="text-xs text-indigo-700/80 mb-4">
              Clique em um modelo para carregar a estrutura recomendada de atendimento:
            </p>
            
            <div className="space-y-2">
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(t)}
                  className="w-full text-left p-2.5 bg-white hover:bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs font-semibold text-slate-800 transition-all flex items-center justify-between group shadow-xs"
                >
                  <span className="truncate mr-2">{t.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL: Create / Edit Agent */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingAgent ? 'Editar Agente de IA' : 'Configurar Novo Agente IA'}
                </h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nome do Agente
                </label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Suporte N1 (Triagem FTTH)" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Papel / Especialidade
                  </label>
                  <select 
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none"
                  >
                    <option value="ROUTING">Triagem & Roteamento</option>
                    <option value="CONVERSATIONAL">Conversacional Geral</option>
                    <option value="QUALIFICATION">Qualificação de Vendas</option>
                    <option value="RETENTION">Retenção de Churn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Modelo de Linguagem
                  </label>
                  <select 
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-indigo-500 outline-none font-mono"
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra Rápido)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Raciocínio Complexo)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Instruções de Sistema (Prompt Persona)
                  </label>
                  <span className="text-[10px] text-slate-400">Defina o tom e regras de resposta</span>
                </div>
                <textarea 
                  rows={4}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="Você é o assistente virtual da operadora. Identifique o motivo do contato, consulte faturas ou oriente reinicialização da ONU caso o led esteja vermelho..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-indigo-500 outline-none leading-relaxed"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Vincular Base de Conhecimento (RAG)</p>
                    <p className="text-[11px] text-slate-500">Permite ao agente consultar os artigos publicados do provedor</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formKnowledge} 
                    onChange={(e) => setFormKnowledge(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600">Temperatura (Criatividade): {formTemperature}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{formTemperature < 0.5 ? 'Preciso & Determinístico' : 'Criativo'}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={formTemperature}
                    onChange={(e) => setFormTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  {editingAgent ? 'Salvar Alterações' : 'Criar Agente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAYGROUND DRAWER: Live Interactive Testing */}
      {activePlaygroundAgent && (
        <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">{activePlaygroundAgent.name}</h3>
                <p className="text-[10px] text-indigo-300 font-mono">Sandbox de Teste • {activePlaygroundAgent.model}</p>
              </div>
            </div>
            <button 
              onClick={() => setActivePlaygroundAgent(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* System Prompt Summary pill */}
          <div className="p-2.5 bg-indigo-50/80 border-b border-indigo-100 text-left text-[11px] text-indigo-900 flex items-center justify-between">
            <span className="truncate mr-2 font-medium">
              Diretrizes: "{activePlaygroundAgent.systemPrompt.substring(0, 60)}..."
            </span>
            <span className="text-[10px] font-bold text-indigo-600 shrink-0 uppercase bg-white px-1.5 py-0.5 rounded border border-indigo-200">
              Temp: {activePlaygroundAgent.temperature}
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col max-w-[85%] text-xs leading-relaxed p-3 rounded-2xl shadow-xs",
                  msg.role === 'user' 
                    ? "ml-auto bg-indigo-600 text-white rounded-br-none" 
                    : "mr-auto bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                )}
              >
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider mb-1",
                  msg.role === 'user' ? "text-indigo-200" : "text-slate-400"
                )}>
                  {msg.role === 'user' ? 'Você (Cliente)' : activePlaygroundAgent.name}
                </span>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.role === 'agent' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => handleFeedback(msg.id, 'THUMBS_UP')}
                      className={cn("p-1 rounded transition-colors", msg.feedback === 'THUMBS_UP' ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50")}
                      title="Boa resposta"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleFeedback(msg.id, 'THUMBS_DOWN')}
                      className={cn("p-1 rounded transition-colors", msg.feedback === 'THUMBS_DOWN' ? "text-red-600 bg-red-50" : "text-slate-400 hover:text-red-600 hover:bg-red-50")}
                      title="Resposta ruim"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {isChatLoading && (
              <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-bl-none text-xs text-slate-500 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>O agente está formulando a resposta...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessageToPlayground} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input 
              type="text" 
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              placeholder="Digite uma mensagem como cliente..." 
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <button 
              type="submit"
              disabled={isChatLoading || !inputChat.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
