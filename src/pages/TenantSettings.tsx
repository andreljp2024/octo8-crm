import React, { useState } from 'react';
import { 
  Server, Network, Database, ShieldCheck, Activity, 
  Settings, Key, AlertCircle, RefreshCw, Copy, Check,
  Radio, Sliders, Save, PhoneCall, CheckCircle2, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function TenantSettings() {
  const { currentTenant, setCurrentTenant, availableTenants } = useAuth();

  // Settings State
  const [pbxHost, setPbxHost] = useState('sbc-sp.telecom-octo8.net');
  const [sipPort, setSipPort] = useState('5060');
  const [transport, setTransport] = useState<'TLS' | 'UDP' | 'TCP'>('TLS');
  const [codecOpus, setCodecOpus] = useState(true);
  const [codecG711, setCodecG711] = useState(true);
  const [codecG729, setCodecG729] = useState(false);
  
  // SLA thresholds
  const [slaWarningSecs, setSlaWarningSecs] = useState(60);
  const [maxQueueWaitSecs, setMaxQueueWaitSecs] = useState(180);
  const [desbordoEnabled, setDesbordoEnabled] = useState(true);

  // Webhook
  const [webhookToken, setWebhookToken] = useState('sk_live_octo8_99a8b7c6d5e4f3a2b1');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Diagnostic / Ping
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'OK' | 'ERR'; latency: string; message: string } | null>(null);

  // Save feedback
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleCopyWebhook = () => {
    const fullUrl = `https://api.octo8.com/v1/webhooks/${currentTenant?.id || 'tenant_1'}/receive?token=${webhookToken}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleRegenerateToken = () => {
    if (confirm('Regerar o token de webhook invalidará a integração atual com seu ERP/SGP. Deseja continuar?')) {
      setWebhookToken(`sk_live_octo8_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`);
    }
  };

  const handleTestPbxConnection = () => {
    setIsPinging(true);
    setPingResult(null);
    setTimeout(() => {
      setIsPinging(false);
      setPingResult({
        status: 'OK',
        latency: '11ms',
        message: 'SIP OPTIONS handshake 200 OK via TLS (Porta 5061)'
      });
    }, 1000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" /> Configurações do Tenant & PBX
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerenciamento de infraestrutura SIP Trunk, integração SGP/ERP, SLAs e segurança.
          </p>
        </div>

        {savedFeedback && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Configurações salvas com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Telecom PBX & Integrations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PBX / SIP Trunk Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Server className="w-4 h-4 text-blue-600" /> Conexão SIP Trunk / Session Border Controller (SBC)
              </h2>
              <button 
                type="button" 
                onClick={handleTestPbxConnection}
                disabled={isPinging}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-blue-600", isPinging && "animate-spin")} />
                {isPinging ? 'Testando SIP...' : 'Testar Conexão'}
              </button>
            </div>

            <div className="p-5 space-y-4">
              {pingResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between text-emerald-800">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {pingResult.message}
                  </span>
                  <span className="font-mono font-bold">{pingResult.latency}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Endereço Host / SBC FQDN
                  </label>
                  <input 
                    type="text" 
                    value={pbxHost}
                    onChange={(e) => setPbxHost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Porta SIP
                  </label>
                  <input 
                    type="text" 
                    value={sipPort}
                    onChange={(e) => setSipPort(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Protocolo de Transporte
                  </label>
                  <div className="flex gap-2">
                    {(['TLS', 'UDP', 'TCP'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransport(t)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors",
                          transport === t 
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs" 
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Codecs de Áudio Suportados
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={codecOpus} onChange={(e) => setCodecOpus(e.target.checked)} className="rounded text-blue-600" />
                      <span className="font-mono">Opus (HD)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={codecG711} onChange={(e) => setCodecG711(e.target.checked)} className="rounded text-blue-600" />
                      <span className="font-mono">G.711a (PCMA)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={codecG729} onChange={(e) => setCodecG729(e.target.checked)} className="rounded text-blue-600" />
                      <span className="font-mono">G.729</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook & ERP SGP Integration */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-emerald-600" /> Webhook de Integração Externa (SGP / ERP)
              </h2>
              <button
                type="button"
                onClick={handleRegenerateToken}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors"
              >
                Regerar Token
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Endpoint Webhook Receptor
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-700 truncate select-all">
                  https://api.octo8.com/v1/webhooks/{currentTenant?.id || 'tenant_1'}/receive?token={webhookToken}
                </div>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedWebhook ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Configure esta URL no seu sistema de faturamento para notificações de abertura de O.S., pagamento de fatura ou bloqueio de cliente.
              </p>
            </div>
          </div>

          {/* SLAs & Queues */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Sliders className="w-4 h-4 text-indigo-600" /> Parâmetros de SLA & Transbordo de Filas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tempo Limite de Alerta de Fila (Segundos)
                </label>
                <input 
                  type="number" 
                  value={slaWarningSecs}
                  onChange={(e) => setSlaWarningSecs(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Chamadas em espera acima desse valor ficam em alerta amarelo no painel.</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tempo Máximo de Espera antes do Transbordo (Segundos)
                </label>
                <input 
                  type="number" 
                  value={maxQueueWaitSecs}
                  onChange={(e) => setMaxQueueWaitSecs(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-indigo-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Tempo limite antes de direcionar para o pool de atendimento reserva.</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Ativar Transbordo Automático (Overflow)</p>
                <p className="text-[11px] text-slate-500">Direciona chamadas excedentes para URA de retorno de ligação inteligente (Call-back)</p>
              </div>
              <input 
                type="checkbox" 
                checked={desbordoEnabled}
                onChange={(e) => setDesbordoEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" /> Salvar Configurações
            </button>
          </div>
        </div>

        {/* Col 3: Tenant Identity & Storage / Quota */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tenant Details */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" /> Identidade do Provedor
            </h3>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant Ativo</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{currentTenant?.name || 'Alpha Provedor (ISP)'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant ID</p>
              <p className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded mt-0.5">{currentTenant?.id || 'tenant_1'}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plano Atual</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Enterprise Telecom
                </span>
                <span className="text-xs text-slate-500 font-medium">300 Ramais SIP</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Health Status */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Capacidade do Cluster
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Canais de Voz Simultâneos</span>
                <span className="font-bold text-slate-900">250 / 300</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-[83%]"></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Gravações de Áudio (Storage)</span>
                <span className="font-bold text-slate-900">410 GB / 500 GB</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[82%]"></div>
              </div>
              <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> 82% do armazenamento utilizado
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Requisições de IA / Mês</span>
                <span className="font-bold text-slate-900">42.800 / 100.000</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[42%]"></div>
              </div>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
}
