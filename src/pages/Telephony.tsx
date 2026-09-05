import React, { useState, useEffect } from 'react';
import { 
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Pause, Play, 
  PhoneForwarded, Users, Clock, History, Search, Filter,
  MoreVertical, CheckCircle2, User, Hash, Voicemail, PlayCircle, Download, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Call, AgentStatus } from '@/types';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mock Data (will still be used to seed the DB if empty, and for non-migrated tabs)
const MOCK_ACTIVE_CALLS: Call[] = [
  { id: 'call-1', tenantId: 't-1', caller: '+55 11 99999-1111', destination: 'Suporte Técnico', status: 'CONNECTED', direction: 'INBOUND', startTime: '10:45', duration: 125, agentId: 'u-1' },
  { id: 'call-2', tenantId: 't-1', caller: '+55 21 98888-2222', destination: 'Comercial', status: 'RINGING', direction: 'INBOUND', startTime: '10:48' },
  { id: 'call-3', tenantId: 't-1', caller: 'Ramal 200', destination: '+55 31 97777-3333', status: 'ON_HOLD', direction: 'OUTBOUND', startTime: '10:40', duration: 310, agentId: 'u-2' },
];

const MOCK_AGENTS: AgentStatus[] = [
  { id: 'u-1', name: 'Ana Silva', status: 'BUSY', timeInStatus: '02:05' },
  { id: 'u-2', name: 'Carlos Ferreira', status: 'ON_CALL', timeInStatus: '05:10' },
  { id: 'u-3', name: 'Roberto Almeida', status: 'AVAILABLE', timeInStatus: '15:30' },
  { id: 'u-4', name: 'Mariana Souza', status: 'PAUSED', timeInStatus: '45:00' },
];

const MOCK_CDR = [
  { id: 'cdr-1', date: '05/09 10:30', caller: '+55 11 99999-1111', callee: 'URA Principal', duration: '00:45', status: 'ANSWERED', sipCause: '200 OK', codec: 'G.711u', recording: true },
  { id: 'cdr-2', date: '05/09 10:25', caller: 'Ramal 101', callee: '+55 21 98888-2222', duration: '12:30', status: 'ANSWERED', sipCause: '200 OK', codec: 'Opus', recording: true },
  { id: 'cdr-3', date: '05/09 10:15', caller: '+55 31 97777-3333', callee: 'Fila Comercial', duration: '03:10', status: 'ABANDONED', sipCause: '487 Request Terminated', codec: '-', recording: false },
  { id: 'cdr-4', date: '05/09 10:10', caller: 'Ramal 105', callee: '+55 41 96666-4444', duration: '00:00', status: 'FAILED', sipCause: '486 Busy Here', codec: '-', recording: false },
];

const MOCK_QUEUES_DETAIL = [
  { id: 'q-1', name: 'Suporte N1 (FTTH)', strategy: 'Round Robin', agentsOnline: 12, agentsTotal: 15, callsWaiting: 3, maxWait: '04:15', slaAdherence: 85 },
  { id: 'q-2', name: 'Vendas Inbound', strategy: 'Ring All', agentsOnline: 5, agentsTotal: 8, callsWaiting: 0, maxWait: '00:00', slaAdherence: 98 },
  { id: 'q-3', name: 'Retenção', strategy: 'Least Recent', agentsOnline: 2, agentsTotal: 2, callsWaiting: 1, maxWait: '01:10', slaAdherence: 90 },
];

export default function Telephony() {
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'QUEUES' | 'CDR'>('ACTIVE');
  const [webphoneState, setWebphoneState] = useState<'IDLE' | 'CALLING' | 'CONNECTED'>('IDLE');
  
  // Real-time State
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // Firestore Subscription
  useEffect(() => {
    const q = query(collection(db, 'calls'), where('status', '!=', 'ENDED'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && activeCalls.length === 0) {
        console.log("Seeding mock calls to Firestore...");
        MOCK_ACTIVE_CALLS.forEach(async (call) => {
          try {
            await setDoc(doc(db, 'calls', call.id), call);
          } catch (e) {
            console.warn("Could not seed call:", e);
          }
        });
        setActiveCalls(MOCK_ACTIVE_CALLS);
      } else {
        const callsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Call));
        setActiveCalls(callsData);
      }
    }, (error) => {
      console.warn("Firestore calls listener error, using fallback calls:", error);
      setActiveCalls(MOCK_ACTIVE_CALLS);
    });

    return () => unsubscribe();
  }, []);

  const handleDial = (digit: string) => {
    setDialNumber(prev => prev + digit);
  };

  const handleStartCall = async () => {
    if (!dialNumber) return;
    setWebphoneState('CALLING');
    
    const newCallId = `call-${Date.now()}`;
    setCurrentCallId(newCallId);
    
    const newCall: Call = {
      id: newCallId,
      tenantId: 't-1',
      caller: 'Ramal 101',
      destination: dialNumber,
      status: 'RINGING',
      direction: 'OUTBOUND',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Optimistic local state
    setActiveCalls(prev => [newCall, ...prev]);

    try {
      await setDoc(doc(db, 'calls', newCallId), newCall);
    } catch (e) {
      console.warn("Firestore setDoc call skipped:", e);
    }

    // Simulate answer after 2 seconds
    setTimeout(async () => {
      setWebphoneState('CONNECTED');
      setActiveCalls(prev => prev.map(c => c.id === newCallId ? { ...c, status: 'CONNECTED', duration: 0 } : c));
      try {
        await updateDoc(doc(db, 'calls', newCallId), {
          status: 'CONNECTED',
          duration: 0
        });
      } catch (e) {
        console.warn("Firestore updateDoc call skipped:", e);
      }
    }, 2000);
  };

  const handleEndCall = async () => {
    setWebphoneState('IDLE');
    setDialNumber('');
    setIsMuted(false);
    setIsOnHold(false);
    
    if (currentCallId) {
      setActiveCalls(prev => prev.filter(c => c.id !== currentCallId));
      try {
        await updateDoc(doc(db, 'calls', currentCallId), { status: 'ENDED' });
      } catch (e) {
        console.warn("Firestore end call update skipped:", e);
      }
      setCurrentCallId(null);
    }
  };

  const handleDropCall = async (id: string) => {
    setActiveCalls(prev => prev.filter(c => c.id !== id));
    try {
      await updateDoc(doc(db, 'calls', id), { status: 'ENDED' });
    } catch (e) {
      console.warn("Firestore drop call update skipped:", e);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      
      {/* 1. Left Panel - Webphone */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-800 p-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", webphoneState !== 'IDLE' ? "bg-emerald-400" : "hidden")}></span>
                <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", webphoneState === 'IDLE' ? "bg-emerald-500" : "bg-emerald-400")}></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider">Ramal 101</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">Conectado (WSS)</span>
          </div>

          <div className="p-6 text-center border-b border-slate-100 bg-slate-50 flex-1 flex flex-col justify-center min-h-[120px]">
            {webphoneState === 'IDLE' ? (
              <input 
                type="text" 
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="Digite o número" 
                className="w-full text-center text-3xl font-light text-slate-700 bg-transparent border-none focus:ring-0 outline-none placeholder:text-slate-300"
              />
            ) : (
              <div className="animate-in fade-in zoom-in duration-200">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {webphoneState === 'CALLING' ? 'Chamando...' : 'Em Chamada'}
                </div>
                <div className="text-3xl font-light text-slate-900">{dialNumber || '+55 11 99999-1111'}</div>
                {webphoneState === 'CONNECTED' && (
                  <div className="text-emerald-600 font-mono text-lg mt-2 flex justify-center items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    02:05
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
                <button 
                  key={digit}
                  onClick={() => handleDial(digit.toString())}
                  className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-lg font-medium text-slate-700 transition-colors active:bg-slate-200"
                >
                  {digit}
                </button>
              ))}
            </div>

            {webphoneState === 'IDLE' ? (
              <button 
                onClick={handleStartCall}
                disabled={!dialNumber}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Phone className="w-5 h-5 fill-current" /> Ligar
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      "h-12 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors",
                      isMuted ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase">Mute</span>
                  </button>
                  <button 
                    onClick={() => setIsOnHold(!isOnHold)}
                    className={cn(
                      "h-12 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors",
                      isOnHold ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase">Hold</span>
                  </button>
                  <button className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex flex-col items-center justify-center gap-1 transition-colors">
                    <PhoneForwarded className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">Transf</span>
                  </button>
                </div>
                <button 
                  onClick={handleEndCall}
                  className="w-full h-14 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <PhoneOff className="w-5 h-5 fill-current" /> Desligar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Status da Equipe</h3>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {MOCK_AGENTS.map(agent => (
              <div key={agent.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {agent.name.charAt(0)}
                    </div>
                    <span className={cn(
                      "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                      agent.status === 'AVAILABLE' ? 'bg-emerald-500' :
                      agent.status === 'ON_CALL' ? 'bg-red-500' :
                      agent.status === 'BUSY' ? 'bg-amber-500' : 'bg-slate-400'
                    )}></span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{agent.timeInStatus}</p>
                  </div>
                </div>
                <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Ligar para ramal">
                  <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Area - Operation Center */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 px-2 pt-2">
          <button 
            onClick={() => setActiveTab('ACTIVE')}
            className={cn(
              "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'ACTIVE' ? "border-blue-600 text-blue-700 bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <PhoneCall className="w-4 h-4" /> Chamadas Ativas
            <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{activeCalls.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('QUEUES')}
            className={cn(
              "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'QUEUES' ? "border-blue-600 text-blue-700 bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="w-4 h-4" /> Filas de Atendimento
          </button>
          <button 
            onClick={() => setActiveTab('CDR')}
            className={cn(
              "px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'CDR' ? "border-blue-600 text-blue-700 bg-white rounded-t-lg" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <History className="w-4 h-4" /> Histórico (CDR)
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar número, agente..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
          {activeTab === 'ACTIVE' && (
            <div className="space-y-3">
              {activeCalls.map(call => (
                <div key={call.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                      call.direction === 'INBOUND' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {call.direction === 'INBOUND' ? <Phone className="w-5 h-5" /> : <PhoneForwarded className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight">{call.caller}</h4>
                        <span className="text-xs font-bold text-slate-400 uppercase">→ {call.destination}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          call.status === 'CONNECTED' ? "bg-emerald-100 text-emerald-700" :
                          call.status === 'RINGING' ? "bg-amber-100 text-amber-700 animate-pulse" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {call.status}
                        </span>
                        {call.agentId && (
                          <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-slate-400" />
                            {MOCK_AGENTS.find(a => a.id === call.agentId)?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {call.duration !== undefined ? (
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração</p>
                        <p className="text-xl font-mono text-slate-700">{formatDuration(call.duration)}</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aguardando</p>
                        <p className="text-xl font-mono text-amber-600 animate-pulse">00:15</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                       <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Monitorar Chamada (Listen/Whisper)">
                        <Mic className="w-5 h-5" />
                       </button>
                       <button onClick={() => handleDropCall(call.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Derrubar">
                        <PhoneOff className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'QUEUES' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Nome da Fila (Queue)</th>
                    <th className="p-4">Estratégia (Ring)</th>
                    <th className="p-4 text-center">Agentes (On/Total)</th>
                    <th className="p-4 text-center">Em Espera</th>
                    <th className="p-4 text-right">Espera Máx</th>
                    <th className="p-4 text-right">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {MOCK_QUEUES_DETAIL.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{q.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{q.strategy}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md border border-blue-200">
                          {q.agentsOnline} / {q.agentsTotal}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center font-bold px-2 py-1 rounded-md border",
                          q.callsWaiting > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {q.callsWaiting}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600">{q.maxWait}</td>
                      <td className="p-4 text-right font-bold">
                        <span className={q.slaAdherence >= 90 ? "text-emerald-600" : "text-amber-600"}>{q.slaAdherence}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'CDR' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-4">Data / Hora</th>
                    <th className="p-4">Origem (Caller ID)</th>
                    <th className="p-4">Destino (DID/Ext)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Causa SIP</th>
                    <th className="p-4 text-right">Duração</th>
                    <th className="p-4 text-center">Gravação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {MOCK_CDR.map((cdr) => (
                    <tr key={cdr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600 font-medium">{cdr.date}</td>
                      <td className="p-4 font-semibold text-slate-900">{cdr.caller}</td>
                      <td className="p-4 text-slate-600 font-medium">{cdr.callee}</td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider",
                          cdr.status === 'ANSWERED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          cdr.status === 'ABANDONED' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {cdr.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {cdr.sipCause}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-700">{cdr.duration}</td>
                      <td className="p-4 text-center flex justify-center items-center gap-2">
                        {cdr.recording ? (
                          <>
                            <button className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Ouvir Gravação">
                              <PlayCircle className="w-4 h-4" />
                            </button>
                            <button className="text-slate-500 hover:bg-slate-100 p-1.5 rounded transition-colors" title="Download WAV">
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
