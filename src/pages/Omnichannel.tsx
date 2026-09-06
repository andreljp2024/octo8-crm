import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MessageSquare, Phone, User, Clock, CheckCircle2, 
  AlertTriangle, Bot, MoreVertical, Send, Paperclip, 
  Mic, Image as ImageIcon, Search, Tag, Activity, FileText, 
  PhoneForwarded, X, Zap, Sparkles, ExternalLink, Check, PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, where, doc, setDoc, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Interfaces
interface Conversation {
  id: string;
  name: string;
  channel: string;
  status: string;
  time: string;
  preview: string;
  unread: number;
}

interface Message {
  id: string;
  conversationId: string;
  sender: 'CUSTOMER' | 'BOT' | 'SYSTEM' | 'AGENT';
  text: string;
  time: string;
  createdAt: number;
}

// Mock Data (will still be used to seed the DB if empty)
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 'conv-1', name: 'Carlos Ferreira', channel: 'WhatsApp', status: 'WAITING', time: '10:45', preview: 'Preciso de ajuda com a fibra...', unread: 2 },
  { id: 'conv-2', name: 'Mariana Silva', channel: 'Instagram', status: 'ACTIVE', time: '10:42', preview: 'Qual o valor do plano?', unread: 0 },
  { id: 'conv-3', name: 'Empresa Alpha', channel: 'WebChat', status: 'ACTIVE', time: '09:15', preview: 'A conexão caiu novamente.', unread: 0 },
];

const MOCK_MESSAGES: Message[] = [
  { id: 'm-1', conversationId: 'conv-1', sender: 'CUSTOMER', text: 'Bom dia, minha internet parou de funcionar do nada.', time: '10:42', createdAt: Date.now() - 50000 },
  { id: 'm-2', conversationId: 'conv-1', sender: 'BOT', text: 'Olá! Sou o assistente virtual. Para agilizar, pode me confirmar seu CPF?', time: '10:42', createdAt: Date.now() - 40000 },
  { id: 'm-3', conversationId: 'conv-1', sender: 'CUSTOMER', text: '111.222.333-44', time: '10:43', createdAt: Date.now() - 30000 },
  { id: 'm-4', conversationId: 'conv-1', sender: 'BOT', text: 'Obrigado. Identifiquei uma instabilidade na sua região. Vou transferir para um especialista.', time: '10:43', createdAt: Date.now() - 20000 },
  { id: 'm-5', conversationId: 'conv-1', sender: 'SYSTEM', text: 'Atendimento transferido da fila: Triage_Bot para: Suporte_N1', time: '10:45', createdAt: Date.now() - 10000 },
];

const QUICK_MACROS = [
  { 
    label: 'Boleto & PIX', 
    text: 'Olá! Segue sua chave PIX Copia e Cola para quitação imediata da fatura: 00020126580014br.gov.bcb.pix0136octo8-telecom-fibra-financeiro. O sinal é reestabelecido automaticamente em até 10 minutos após a confirmação bancária.' 
  },
  { 
    label: 'Reboot da ONU/ONT', 
    text: 'Por favor, retire a fonte da tomada da ONU/ONT por 30 segundos e ligue novamente. Aguarde 2 minutos até que os LEDs PON e LAN fiquem na cor verde fixa e me informe.' 
  },
  { 
    label: 'Incidente Massivo', 
    text: 'Nossos sistemas registraram rompimento de fibra óptica afetando sua região. As equipes de campo já estão executando as fusões no anel óptico. Previsão de normalização: 40 minutos.' 
  },
  { 
    label: 'Agendamento Técnico', 
    text: 'Ordem de serviço aberta com sucesso sob o protocolo 20260905981. Nosso técnico certificado comparecerá na janela acordada munido de equipamentos para certificação óptica.' 
  },
  { 
    label: 'Upgrade 1 Giga Mesh', 
    text: 'Identificamos viabilidade de upgrade para o plano de 1 Giga com 2 módulos Wi-Fi 6 Mesh na sua residência por apenas +R$ 39,90/mês. Gostaria de confirmar a ativação?' 
  },
];

export default function Omnichannel() {
  const navigate = useNavigate();
  const [activeConv, setActiveConv] = useState('conv-1');
  const [inputMsg, setInputMsg] = useState('');
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiInsight, setAiInsight] = useState<{summary: string, sentiment: string, suggestion: string} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Handle URL deep linking for customer or search
  useEffect(() => {
    const cust = searchParams.get('customer') || searchParams.get('search');
    if (cust) {
      setSearchTerm(cust);
      const list = conversations.length > 0 ? conversations : MOCK_CONVERSATIONS;
      const matched = list.find(c => c.name.toLowerCase().includes(cust.toLowerCase()));
      if (matched) {
        setActiveConv(matched.id);
      }
    }
  }, [searchParams, conversations]);

  // Modals & Macros State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState('Suporte FTTH N2 (Redes)');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState('Dúvida Sanada / Suporte Concluído');
  const [showMacros, setShowMacros] = useState(false);

  // Poll backend for ACD Assigned Queue (Fase 3 integration)
  useEffect(() => {
    const pollQueue = () => {
      fetch('/api/routing/agent-assignments/agent-1', {
        headers: { 'x-tenant-id': 'default-tenant' }
      })
      .then(res => res.json())
      .then(data => {
        if (data.assignments && data.assignments.length > 0) {
          // Merge incoming ACD tasks with local state smoothly
          setConversations(prev => {
            const currentIds = new Set(prev.map(c => c.id));
            const newAssignments = data.assignments.filter((a: any) => !currentIds.has(a.id)).map((a: any) => ({
              id: a.id,
              name: a.customerId,
              channel: a.type,
              status: 'WAITING',
              time: new Date(a.enqueueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              preview: 'Nova interação roteada via ACD...',
              unread: 1
            }));
            
            if (newAssignments.length > 0) {
              return [...newAssignments, ...prev];
            }
            return prev;
          });
        }
      })
      .catch(console.error);
    };

    const interval = setInterval(pollQueue, 5000);
    pollQueue(); // Initial fetch
    
    return () => clearInterval(interval);
  }, []);

  // Firestore Subscription: Conversations
  useEffect(() => {
    const q = query(collection(db, 'conversations'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && conversations.length === 0) {
        console.log("Seeding mock conversations to Firestore...");
        MOCK_CONVERSATIONS.forEach(async (conv) => {
          try {
            await setDoc(doc(db, 'conversations', conv.id), conv);
          } catch (e) {
            console.warn("Could not seed conversation:", e);
          }
        });
        setConversations(MOCK_CONVERSATIONS);
        if (!activeConv) setActiveConv(MOCK_CONVERSATIONS[0].id);
      } else {
        const convsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
        setConversations(convsData);
        if (convsData.length > 0 && !activeConv) {
          setActiveConv(convsData[0].id);
        }
      }
    }, (error) => {
      console.warn("Firestore conversations listener error, using fallback:", error);
      setConversations(MOCK_CONVERSATIONS);
      if (!activeConv) setActiveConv(MOCK_CONVERSATIONS[0].id);
    });

    return () => unsubscribe();
  }, []);

  // Firestore Subscription: Messages
  useEffect(() => {
    if (!activeConv) return;

    const q = query(
      collection(db, 'messages'), 
      where('conversationId', '==', activeConv),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && activeConv === 'conv-1' && messages.length === 0) {
        console.log("Seeding mock messages to Firestore...");
        MOCK_MESSAGES.forEach(async (msg) => {
          try {
            await setDoc(doc(db, 'messages', msg.id), msg);
          } catch (e) {
            console.warn("Could not seed message:", e);
          }
        });
        setMessages(MOCK_MESSAGES);
      } else {
        const msgsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        setMessages(msgsData);
      }
    }, (error) => {
      console.warn("Firestore messages listener error, using fallback:", error);
      setMessages(MOCK_MESSAGES.filter(m => m.conversationId === activeConv));
    });

    return () => unsubscribe();
  }, [activeConv]);

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !activeConv) return;
    
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConv,
      sender: 'AGENT',
      text: inputMsg,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    
    setInputMsg('');
    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);

    try {
      await addDoc(collection(db, 'messages'), newMsg);
    } catch (e) {
      console.warn("Firestore addDoc message skipped:", e);
    }
  };

  const handleTransferConversation = async () => {
    if (!activeConv) return;
    const sysMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConv,
      sender: 'SYSTEM',
      text: `Atendimento transferido por Operador para a fila: ${selectedQueue}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, sysMsg]);
    setConversations(prev => prev.map(c => c.id === activeConv ? { ...c, preview: `Transferido: ${selectedQueue}` } : c));
    try {
      await addDoc(collection(db, 'messages'), sysMsg);
      await updateDoc(doc(db, 'conversations', activeConv), { preview: `Transferido: ${selectedQueue}` });
    } catch (e) {
      console.warn("Transfer doc update skipped:", e);
    }
    setIsTransferModalOpen(false);
  };

  const handleResolveConversation = async () => {
    if (!activeConv) return;
    const sysMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConv,
      sender: 'SYSTEM',
      text: `Atendimento encerrado pelo Operador. Desfecho: ${resolveReason}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, sysMsg]);
    setConversations(prev => prev.map(c => c.id === activeConv ? { ...c, status: 'RESOLVED', unread: 0, preview: `Resolvido: ${resolveReason}` } : c));
    try {
      await addDoc(collection(db, 'messages'), sysMsg);
      await updateDoc(doc(db, 'conversations', activeConv), { status: 'RESOLVED', preview: `Resolvido: ${resolveReason}`, unread: 0 });
    } catch (e) {
      console.warn("Resolve doc update skipped:", e);
    }
    setIsResolveModalOpen(false);
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           c.channel.toLowerCase().includes(term) || 
           c.preview.toLowerCase().includes(term);
  });

  const handleGenerateInsight = async () => {
    if (messages.length === 0) return;
    setIsAiLoading(true);
    setAiInsight(null);
    try {
      const res = await fetch('/api/copilot/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data);
      } else {
        console.error('Failed to fetch AI insights');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      
      {/* 1. Left Sidebar: Inbox / Fila */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Omnichannel Inbox</h2>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></span>
              <span className="text-sm font-semibold text-slate-600">Online</span>
            </div>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, canal..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={cn(
                  "p-4 border-b border-slate-100 cursor-pointer transition-colors relative",
                  activeConv === conv.id ? "bg-blue-50/50" : "hover:bg-white bg-transparent"
                )}
              >
                {activeConv === conv.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>}
                
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-slate-900 text-sm">{conv.name}</h3>
                  <span className="text-[10px] font-medium text-slate-400">{conv.time}</span>
                </div>
                
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                    conv.channel === 'WhatsApp' ? "bg-emerald-100 text-emerald-700" :
                    conv.channel === 'Instagram' ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {conv.channel}
                  </span>
                  {conv.status === 'WAITING' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Fila
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-500 truncate pr-4">{conv.preview}</p>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Middle Panel: Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50 relative">
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
              {conversations.find(c => c.id === activeConv)?.name.charAt(0) || 'C'}
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{conversations.find(c => c.id === activeConv)?.name || 'Carregando...'}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                Via {conversations.find(c => c.id === activeConv)?.channel || '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold" 
              title="Transferir atendimento para outra fila ou setor"
            >
               <PhoneForwarded className="w-3.5 h-3.5" /> Transferir
            </button>
            <button 
              onClick={() => setIsResolveModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolver
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-center my-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-200 px-3 py-1 rounded-full">Hoje</span>
          </div>

          {messages.map(msg => (
            <div key={msg.id} className={cn(
              "flex w-full",
              msg.sender === 'CUSTOMER' ? "justify-start" : 
              msg.sender === 'SYSTEM' ? "justify-center" : "justify-end"
            )}>
              
              {msg.sender === 'SYSTEM' ? (
                <div className="bg-slate-200/80 text-slate-600 text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-2 shadow-2xs border border-slate-300/60">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  {msg.text}
                </div>
              ) : (
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                  msg.sender === 'CUSTOMER' ? "bg-white border border-slate-200 rounded-tl-sm" : 
                  msg.sender === 'BOT' ? "bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-tr-sm" : 
                  "bg-blue-600 text-white rounded-tr-sm"
                )}>
                  {msg.sender === 'BOT' && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      <Bot className="w-3.5 h-3.5" /> Octo8 Copilot
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <div className={cn(
                    "text-[10px] font-medium mt-1 text-right",
                    msg.sender === 'CUSTOMER' ? "text-slate-400" :
                    msg.sender === 'BOT' ? "text-indigo-400" : "text-blue-200"
                  )}>
                    {msg.time}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Macros Drawer */}
        {showMacros && (
          <div className="p-3 bg-amber-50/90 border-t border-amber-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1 shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Respostas Rápidas:
            </span>
            {QUICK_MACROS.map((macro, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputMsg(macro.text);
                  setShowMacros(false);
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-medium shrink-0 transition-colors shadow-2xs"
              >
                {macro.label}
              </button>
            ))}
            <button 
              type="button"
              onClick={() => setShowMacros(false)} 
              className="p-1 hover:bg-amber-200 text-amber-700 rounded-md shrink-0 ml-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setShowMacros(!showMacros)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Modelos Rápidos (/atalhos)
            </button>
            <span className="text-[11px] text-slate-400 font-medium">Pressione Enter para enviar</span>
          </div>

          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-500 transition-all">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Anexar comprovante ou foto de sinal"><Paperclip className="w-5 h-5" /></button>
            <textarea 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Digite sua mensagem para o assinante..."
              className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 text-sm focus:ring-0 outline-none placeholder:text-slate-400"
              rows={1}
            />
            <div className="flex gap-1 pb-1 pr-1">
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Gravar áudio"><Mic className="w-5 h-5" /></button>
              <button 
                onClick={handleSendMessage}
                disabled={!inputMsg.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Sidebar: Customer Info & Copilot */}
      <div className="w-80 flex-shrink-0 bg-white flex flex-col">
        {/* Customer Mini Profile */}
        <div className="p-5 border-b border-slate-200 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold mx-auto mb-2 shadow-2xs">
            {conversations.find(c => c.id === activeConv)?.name.charAt(0) || 'C'}
          </div>
          <h3 className="font-bold text-slate-900">{conversations.find(c => c.id === activeConv)?.name || 'Carregando...'}</h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Assinante Fibra FTTH</p>
          
          <div className="flex justify-center gap-1.5 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">GPON Ativo</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">Em Dia</span>
          </div>

          {/* Direct Actions to Telecom & CRM */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button 
              onClick={() => {
                const currentName = conversations.find(c => c.id === activeConv)?.name;
                if (currentName) {
                  navigate(`/customers?search=${encodeURIComponent(currentName)}`);
                } else {
                  navigate('/customers');
                }
              }}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Ficha 360°
            </button>
            <button 
              onClick={() => navigate('/telephony')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Ligar VoIP
            </button>
          </div>
        </div>

        {/* AI Copilot Panel */}
        <div className="flex-1 overflow-y-auto bg-indigo-50/30">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/80">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-indigo-900 text-sm">Octo8 Copilot</h4>
            </div>
            <button 
              onClick={handleGenerateInsight}
              disabled={isAiLoading || messages.length === 0}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
            >
              {isAiLoading ? 'Analisando...' : 'Analisar Chat'}
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {!aiInsight && !isAiLoading && (
              <div className="text-center p-6">
                <Bot className="w-12 h-12 text-indigo-200 mx-auto mb-2" />
                <p className="text-xs text-indigo-400 font-medium">Clique em Analisar Chat para a IA ler as mensagens e extrair contexto.</p>
              </div>
            )}

            {isAiLoading && (
              <div className="flex items-center justify-center p-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {aiInsight && !isAiLoading && (
              <>
                {/* Resumo da Conversa */}
                <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm">
                  <h5 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Resumo do Problema
                  </h5>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {aiInsight.summary}
                  </p>
                </div>

                {/* Sugestão de Resposta */}
                <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-emerald-400"></div>
                  <h5 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resposta Sugerida
                  </h5>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{aiInsight.suggestion}"
                  </p>
                  <button 
                    onClick={() => setInputMsg(aiInsight.suggestion)}
                    className="mt-3 w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-bold transition-colors"
                  >
                    Usar Resposta
                  </button>
                </div>
                
                {/* Sentiment */}
                <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Sentimento do Cliente</h5>
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded uppercase",
                      aiInsight.sentiment === 'POSITIVO' ? 'bg-emerald-100 text-emerald-700' :
                      aiInsight.sentiment === 'NEGATIVO' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    )}>
                      {aiInsight.sentiment}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <PhoneForwarded className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Transferir Atendimento</h3>
                  <p className="text-xs text-slate-500">Selecione o setor de destino para transferir</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Fila de Atendimento ou Setor
              </label>
              {[
                { id: 'Suporte FTTH N2 (Redes)', desc: 'Problemas de sinal óptico, OLT, lentidão e Wi-Fi avançado' },
                { id: 'Comercial & Upgrades', desc: 'Migração para 1 Giga, planos móveis e novas contratações' },
                { id: 'Financeiro & Cobrança', desc: 'Negociação de débitos, comprovantes e desbloqueio em confiança' },
                { id: 'Bot Triagem IA (N1)', desc: 'Devolver para fluxo de autoatendimento inteligente' }
              ].map(queue => (
                <label 
                  key={queue.id}
                  onClick={() => setSelectedQueue(queue.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedQueue === queue.id 
                      ? "border-blue-600 bg-blue-50/50 shadow-2xs" 
                      : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="radio" 
                    name="queue" 
                    checked={selectedQueue === queue.id}
                    onChange={() => setSelectedQueue(queue.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{queue.id}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{queue.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleTransferConversation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Finalizar Atendimento</h3>
                  <p className="text-xs text-slate-500">Selecione o motivo da resolução (FCR)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Motivo / Tabulação de Encerramento
              </label>
              {[
                'Dúvida Sanada / Suporte Concluído',
                'Segunda Via de Boleto / PIX Enviado',
                'Visita Técnica Agendada com Sucesso',
                'Upgrade de Plano Fechado',
                'Sem Retorno do Assinante'
              ].map(reason => (
                <label 
                  key={reason}
                  onClick={() => setResolveReason(reason)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    resolveReason === reason 
                      ? "border-emerald-600 bg-emerald-50/50 shadow-2xs" 
                      : "border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <input 
                    type="radio" 
                    name="resolveReason" 
                    checked={resolveReason === reason}
                    onChange={() => setResolveReason(reason)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold text-slate-800">{reason}</span>
                </label>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={handleResolveConversation}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Concluir e Resolver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
