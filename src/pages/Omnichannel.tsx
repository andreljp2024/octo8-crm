import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Phone, User, Clock, CheckCircle2, 
  AlertTriangle, Bot, MoreVertical, Send, Paperclip, 
  Mic, Image as ImageIcon, Search, Tag, Activity, FileText, PhoneForwarded 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, where, doc, setDoc, addDoc, orderBy } from 'firebase/firestore';
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

export default function Omnichannel() {
  const [activeConv, setActiveConv] = useState('conv-1');
  const [inputMsg, setInputMsg] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiInsight, setAiInsight] = useState<{summary: string, sentiment: string, suggestion: string} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
              placeholder="Buscar conversas..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
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
          ))}
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
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Transferir">
               <PhoneForwarded className="w-5 h-5" />
            </button>
            <button className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Resolver
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
                <div className="bg-slate-200/60 text-slate-500 text-xs font-medium px-4 py-1.5 rounded-full flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
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

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-500 transition-all">
            <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Paperclip className="w-5 h-5" /></button>
            <textarea 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Digite sua mensagem (use / para atalhos)..."
              className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[44px] py-3 text-sm focus:ring-0 outline-none placeholder:text-slate-400"
              rows={1}
            />
            <div className="flex gap-1 pb-1 pr-1">
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Mic className="w-5 h-5" /></button>
              <button 
                onClick={handleSendMessage}
                disabled={!inputMsg.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="p-6 border-b border-slate-200 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            {conversations.find(c => c.id === activeConv)?.name.charAt(0) || 'C'}
          </div>
          <h3 className="font-bold text-slate-900">{conversations.find(c => c.id === activeConv)?.name || 'Carregando...'}</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Cliente desde Jan/2024</p>
          
          <div className="flex justify-center gap-2 mt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">VIP</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">FTTH</span>
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
    </div>
  );
}
