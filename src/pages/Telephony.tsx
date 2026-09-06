import React, { useState, useEffect } from 'react';
import { 
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Pause, Play, 
  PhoneForwarded, Users, Clock, History, Search, Filter,
  MoreVertical, CheckCircle2, User, Hash, Voicemail, PlayCircle, 
  Download, Activity, Volume2, VolumeX, Radio, Sparkles, X, 
  ShieldAlert, Headphones, FileText, Check, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Call, AgentStatus } from '@/types';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'QUEUES' | 'CDR'>('ACTIVE');
  const [webphoneState, setWebphoneState] = useState<'IDLE' | 'CALLING' | 'CONNECTED'>('IDLE');
  
  // Real-time State
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  // Auto-populate dial number and tab from query param
  useEffect(() => {
    const dialParam = searchParams.get('dial');
    if (dialParam) {
      setDialNumber(dialParam);
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'QUEUES' || tabParam === 'CDR' || tabParam === 'ACTIVE') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Search & Filter
  const [searchTermTelephony, setSearchTermTelephony] = useState('');

  // Recording Audio Player Dialog
  const [selectedCdrForAudio, setSelectedCdrForAudio] = useState<typeof MOCK_CDR[0] | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(25);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Supervisor Live Call Monitoring (Listen/Whisper/Barge)
  const [monitoringCall, setMonitoringCall] = useState<Call | null>(null);
  const [monitorMode, setMonitorMode] = useState<'LISTEN' | 'WHISPER' | 'BARGE'>('LISTEN');

  // In-call Webphone Transfer
  const [isWebphoneTransferOpen, setIsWebphoneTransferOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState('Ramal 102 - Carlos Ferreira');
  const [transferType, setTransferType] = useState<'BLIND' | 'ATTENDED'>('ATTENDED');
  const [webphoneNotice, setWebphoneNotice] = useState<string | null>(null);

  // Audio Playback Simulation
  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1 * playbackSpeed;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio, playbackSpeed]);

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

  const handleCallExtension = (agentName: string, ext: string) => {
    setDialNumber(ext);
    setWebphoneState('CALLING');
    const newCallId = `call-${Date.now()}`;
    setCurrentCallId(newCallId);
    const newCall: Call = {
      id: newCallId,
      tenantId: 't-1',
      caller: 'Ramal 101',
      destination: `${ext} (${agentName})`,
      status: 'RINGING',
      direction: 'OUTBOUND',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActiveCalls(prev => [newCall, ...prev]);
    setTimeout(() => {
      setWebphoneState('CONNECTED');
      setActiveCalls(prev => prev.map(c => c.id === newCallId ? { ...c, status: 'CONNECTED', duration: 0 } : c));
    }, 1500);
  };

  const handleConfirmWebphoneTransfer = () => {
    if (!currentCallId) return;
    setWebphoneNotice(`Chamada transferida para ${transferTarget} com sucesso.`);
    setIsWebphoneTransferOpen(false);
    setTimeout(() => {
      handleEndCall();
      setWebphoneNotice(null);
    }, 2000);
  };

  const handleDownloadAudio = (caller: string, date: string) => {
    const dummyData = `OCTO8_AUDIO_CDR_EXPORT\nCaller: ${caller}\nDate: ${date}\nTenant: Octo8 Telecom\nSIP Call-ID: call-octo8-9842839\nCodec: Opus-HD 16kHz\nStatus: Encrypted`;
    const blob = new Blob([dummyData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravacao-${caller.replace(/[^0-9]/g, '') || 'chamada'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredActiveCalls = activeCalls.filter(c => {
    if (!searchTermTelephony.trim()) return true;
    const term = searchTermTelephony.toLowerCase();
    return c.caller.toLowerCase().includes(term) || 
           c.destination.toLowerCase().includes(term) ||
           (c.agentId && c.agentId.toLowerCase().includes(term));
  });

  const filteredCDR = MOCK_CDR.filter(cdr => {
    if (!searchTermTelephony.trim()) return true;
    const term = searchTermTelephony.toLowerCase();
    return cdr.caller.toLowerCase().includes(term) || 
           cdr.callee.toLowerCase().includes(term) ||
           cdr.status.toLowerCase().includes(term);
  });

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
                {webphoneNotice && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 text-center animate-in fade-in">
                    {webphoneNotice}
                  </div>
                )}
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
                  <button 
                    onClick={() => setIsWebphoneTransferOpen(true)}
                    className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex flex-col items-center justify-center gap-1 transition-colors"
                  >
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
            {MOCK_AGENTS.map((agent, idx) => (
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
                    <p className="text-[10px] text-slate-500 font-medium">Ramal 10{idx + 2} • {agent.timeInStatus}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCallExtension(agent.name, `10${idx + 2}`)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" 
                  title={`Ligar para ${agent.name} (Ramal 10${idx + 2})`}
                >
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
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTermTelephony}
              onChange={(e) => setSearchTermTelephony(e.target.value)}
              placeholder="Buscar por número, destino, status..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">SIP Server: sbc01.octo8.telecom (Port 5060)</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4">
          {activeTab === 'ACTIVE' && (
            <div className="space-y-3">
              {filteredActiveCalls.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">
                  Nenhuma chamada ativa no momento.
                </div>
              ) : (
                filteredActiveCalls.map(call => (
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
                       <button 
                         onClick={() => setMonitoringCall(call)}
                         className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                         title="Monitorar Chamada (Listen/Whisper/Barge)"
                       >
                         <Headphones className="w-5 h-5" />
                       </button>
                       <button onClick={() => handleDropCall(call.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Derrubar">
                         <PhoneOff className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                </div>
              )))}
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
                  {filteredCDR.map((cdr) => (
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
                            <button 
                              onClick={() => {
                                setSelectedCdrForAudio(cdr);
                                setIsPlayingAudio(true);
                                setAudioProgress(20);
                              }}
                              className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" 
                              title="Ouvir Gravação"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDownloadAudio(cdr.caller, cdr.date)}
                              className="text-slate-500 hover:bg-slate-100 p-1.5 rounded transition-colors" 
                              title="Download WAV"
                            >
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

      {/* MODAL 1: Gravação de Áudio & Copilot Transcription (CDR) */}
      {selectedCdrForAudio && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-snug">Gravação da Chamada</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedCdrForAudio.caller} → {selectedCdrForAudio.callee} • {selectedCdrForAudio.date}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCdrForAudio(null); setIsPlayingAudio(false); }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Waveform Visualization */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-end justify-between h-14 gap-1 px-2 mb-3">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const isPassed = (i / 36) * 100 <= audioProgress;
                    const heightPercent = 25 + Math.sin(i * 0.7) * 35 + Math.cos(i * 1.2) * 30;
                    return (
                      <div 
                        key={i} 
                        className={cn(
                          "w-full rounded-full transition-all duration-150",
                          isPassed ? "bg-blue-500" : "bg-slate-800",
                          isPlayingAudio && isPassed ? "opacity-100 scale-y-105" : "opacity-80"
                        )}
                        style={{ height: `${Math.max(15, Math.min(100, heightPercent))}%` }}
                      />
                    );
                  })}
                </div>

                {/* Scrubber track */}
                <div 
                  className="h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const newProgress = Math.round((clickX / rect.width) * 100);
                    setAudioProgress(Math.max(0, Math.min(100, newProgress)));
                  }}
                >
                  <div 
                    className="h-full bg-blue-500 transition-all duration-150"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-md"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <span className="font-mono text-slate-200">
                      {Math.floor((audioProgress / 100) * 180 / 60).toString().padStart(2, '0')}:
                      {Math.floor(((audioProgress / 100) * 180) % 60).toString().padStart(2, '0')} / {selectedCdrForAudio.duration}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-bold transition-colors",
                          playbackSpeed === spd ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transcrição IA Copilot */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Transcrição Inteligente (Speech-to-Text)
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Sentimento: Positivo
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  &quot;<strong>Cliente:</strong> Olá, gostaria de confirmar se o meu sinal de fibra óptica já foi restabelecido aqui na Rua das Flores.<br/>
                  <strong>Operador:</strong> Boa tarde! Sim, a equipe externa de telecom concluiu a fusão na caixa CTO-08. Pelo nosso diagnóstico OLT, sua ONT já sincronizou em -19.2 dBm com conexão estável.&quot;
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button 
                  onClick={() => handleDownloadAudio(selectedCdrForAudio.caller, selectedCdrForAudio.date)}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" /> Baixar Gravação (WAV)
                </button>
                <button 
                  onClick={() => { setSelectedCdrForAudio(null); setIsPlayingAudio(false); }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Monitoramento em Tempo Real do Supervisor (Listen / Whisper / Barge) */}
      {monitoringCall && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Headphones className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-snug">Supervisão de Chamada Ativa</h3>
                  <p className="text-xs text-indigo-300 font-mono">
                    {monitoringCall.caller} ↔ {monitoringCall.destination}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMonitoringCall(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status and Audio Meter */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-indigo-900 tracking-wider">Canal de Áudio</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">Sessão RTP Monitorada</p>
                </div>
                <div className="flex items-center gap-1 h-6">
                  {[40, 70, 95, 60, 85, 30, 75, 90, 50].map((val, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-indigo-600 rounded-full animate-pulse"
                      style={{ height: `${val}%`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Modo de Interação do Supervisor
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMonitorMode('LISTEN')}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      monitorMode === 'LISTEN' 
                        ? "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p className="text-xs font-bold">Escuta</p>
                    <p className="text-[10px] text-slate-500 mt-1">Silenciosa</p>
                  </button>

                  <button
                    onClick={() => setMonitorMode('WHISPER')}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      monitorMode === 'WHISPER' 
                        ? "bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p className="text-xs font-bold">Sussurro</p>
                    <p className="text-[10px] text-slate-500 mt-1">Só Atendente</p>
                  </button>

                  <button
                    onClick={() => setMonitorMode('BARGE')}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      monitorMode === 'BARGE' 
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <p className="text-xs font-bold">Intervenção</p>
                    <p className="text-[10px] text-slate-500 mt-1">Conferência</p>
                  </button>
                </div>
              </div>

              {/* Mode Description */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                {monitorMode === 'LISTEN' && "Modo Escuta: Você ouve o cliente e o operador em tempo real. O microfone do supervisor fica completamente mudo para ambos."}
                {monitorMode === 'WHISPER' && "Modo Sussurro: Você fala diretamente no headset do operador para orientar o atendimento. O cliente NÃO escuta sua voz."}
                {monitorMode === 'BARGE' && "Modo Intervenção (Barge-in): Você entra na chamada como terceiro participante ativo, dialogando simultaneamente com o operador e o cliente."}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setMonitoringCall(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Encerrar Monitoramento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Transferência do Webphone */}
      {isWebphoneTransferOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PhoneForwarded className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">Transferir Chamada VoIP</h3>
              </div>
              <button 
                onClick={() => setIsWebphoneTransferOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Destino da Transferência
                </label>
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                >
                  <option value="Ramal 102 - Carlos Ferreira">Ramal 102 - Carlos Ferreira (Suporte N1)</option>
                  <option value="Ramal 103 - Roberto Almeida">Ramal 103 - Roberto Almeida (NOC & Redes)</option>
                  <option value="Ramal 104 - Mariana Souza">Ramal 104 - Mariana Souza (Financeiro)</option>
                  <option value="Fila Suporte FTTH N2">Fila Suporte FTTH N2</option>
                  <option value="Fila Comercial & Upgrades">Fila Comercial & Upgrades</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Modalidade
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferType('ATTENDED')}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-semibold text-center transition-all",
                      transferType === 'ATTENDED' 
                        ? "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Com Consulta (Assistida)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferType('BLIND')}
                    className={cn(
                      "p-2.5 rounded-lg border text-xs font-semibold text-center transition-all",
                      transferType === 'BLIND' 
                        ? "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    Transferência Direta (Cega)
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsWebphoneTransferOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmWebphoneTransfer}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm"
                >
                  Transferir Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
