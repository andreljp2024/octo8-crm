import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, MoreHorizontal, DollarSign, 
  Calendar, User, TrendingUp, X, Check, ArrowRight, 
  Trash2, Award, Phone, Building2, Percent, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Interfaces
export interface Opportunity {
  id: string;
  tenantId?: string;
  title: string;
  company: string;
  value: number;
  probability: number;
  closeDate: string;
  contact: string;
  stageId: string;
  phone?: string;
  notes?: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
}

const STAGES: Stage[] = [
  { id: 'stage-1', name: 'Prospecção (Lead)', color: 'bg-slate-200 text-slate-700' },
  { id: 'stage-2', name: 'Qualificação', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'stage-3', name: 'Proposta Enviada', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'stage-4', name: 'Negociação', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'stage-5', name: 'Fechado (Ganho)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
];

// Mock Data for seeding
const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: 'op-1', title: 'Upgrade Link Dedicado 1G', company: 'TechCorp SA', value: 4500, probability: 40, closeDate: '15/10', contact: 'Roberto Nogueira', stageId: 'stage-1', phone: '+55 11 98888-1001' },
  { id: 'op-2', title: 'Migração FTTH Empresarial', company: 'Consultoria Alpha', value: 1200, probability: 30, closeDate: '20/10', contact: 'Ana Paula', stageId: 'stage-1', phone: '+55 11 98888-1002' },
  { id: 'op-3', title: 'PABX em Nuvem (50 ramais)', company: 'Logística BR', value: 8500, probability: 60, closeDate: '05/10', contact: 'Carlos Eduardo', stageId: 'stage-2', phone: '+55 11 98888-1003' },
  { id: 'op-4', title: 'Projeto Wi-Fi 6 + Fibra', company: 'Hotel Estrela', value: 15000, probability: 75, closeDate: '30/09', contact: 'Mariana Castro', stageId: 'stage-3', phone: '+55 11 98888-1004' },
  { id: 'op-5', title: 'Link de Backup BGP', company: 'Fintech X', value: 5000, probability: 80, closeDate: '28/09', contact: 'João Ribeiro', stageId: 'stage-3', phone: '+55 11 98888-1005' },
  { id: 'op-6', title: 'Contrato 36 meses ISP', company: 'Condomínio Vale', value: 18000, probability: 90, closeDate: '25/09', contact: 'Fernanda Lima', stageId: 'stage-4', phone: '+55 11 98888-1006' },
];

export default function CrmSales() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const { tenantId } = useAuth();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // New Deal Modal
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealCompany, setDealCompany] = useState('');
  const [dealValue, setDealValue] = useState<number>(3500);
  const [dealContact, setDealContact] = useState('');
  const [dealPhone, setDealPhone] = useState('');
  const [dealCloseDate, setDealCloseDate] = useState('15/10');
  const [dealStageId, setDealStageId] = useState('stage-1');
  const [dealProbability, setDealProbability] = useState(40);

  // Opportunity Detail Modal
  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const q = query(collection(db, 'opportunities'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && opportunities.length === 0) {
        console.log("Seeding mock opportunities to Firestore...");
        MOCK_OPPORTUNITIES.forEach(async (opp) => {
          const seededOpp = { ...opp, tenantId: tenantId };
          try {
            await setDoc(doc(db, 'opportunities', opp.id), seededOpp);
          } catch (e) {
            console.warn("Could not seed opportunity:", e);
          }
        });
        setOpportunities(MOCK_OPPORTUNITIES);
      } else {
        const oppsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity));
        setOpportunities(oppsData);
      }
    }, (error) => {
      console.warn("Firestore listener error, using fallback opportunities:", error);
      setOpportunities(MOCK_OPPORTUNITIES);
    });

    return () => unsubscribe();
  }, [tenantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, stageId } : opp));
      try {
        await updateDoc(doc(db, 'opportunities', id), {
          stageId: stageId
        });
      } catch (error) {
        console.warn("Firestore updateDoc fallback:", error);
      }
    }
    setDraggedItem(null);
  };

  // Create New Deal
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealCompany.trim()) return;

    const newDeal: Opportunity = {
      id: `op-${Date.now()}`,
      tenantId: tenantId || 'demo-tenant',
      title: dealTitle.trim(),
      company: dealCompany.trim(),
      value: Number(dealValue) || 0,
      probability: Number(dealProbability) || 50,
      closeDate: dealCloseDate || 'Fim do mês',
      contact: dealContact.trim() || 'Comercial',
      phone: dealPhone.trim() || '',
      stageId: dealStageId,
    };

    setOpportunities(prev => [newDeal, ...prev]);

    try {
      await setDoc(doc(db, 'opportunities', newDeal.id), newDeal);
    } catch (e) {
      console.warn("Could not save opportunity to Firestore:", e);
    }

    // Reset Form
    setDealTitle('');
    setDealCompany('');
    setDealValue(3500);
    setDealContact('');
    setDealPhone('');
    setIsNewDealModalOpen(false);
  };

  // Update Deal from Detail Modal
  const handleUpdateDeal = async (updated: Opportunity) => {
    setOpportunities(prev => prev.map(o => o.id === updated.id ? updated : o));
    setSelectedDeal(updated);

    try {
      await updateDoc(doc(db, 'opportunities', updated.id), {
        title: updated.title,
        value: updated.value,
        stageId: updated.stageId,
        probability: updated.probability,
        closeDate: updated.closeDate,
        contact: updated.contact,
        phone: updated.phone || ''
      });
    } catch (e) {
      console.warn("Could not update opportunity:", e);
    }
  };

  // Delete Deal
  const handleDeleteDeal = async (id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setSelectedDeal(null);

    try {
      await deleteDoc(doc(db, 'opportunities', id));
    } catch (e) {
      console.warn("Could not delete opportunity:", e);
    }
  };

  const filteredOpps = opportunities.filter(o => 
    o.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.contact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pipeline metrics
  const totalPipelineValue = opportunities.reduce((sum, o) => sum + o.value, 0);
  const weightedPipelineValue = opportunities.reduce((sum, o) => sum + (o.value * (o.probability / 100)), 0);
  const wonValue = opportunities.filter(o => o.stageId === 'stage-5').reduce((sum, o) => sum + o.value, 0);
  const avgTicket = opportunities.length > 0 ? totalPipelineValue / opportunities.length : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" /> CRM & Funil de Vendas ISP
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de oportunidades comerciais, links dedicados, PABX em nuvem e expansão de rede.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar oportunidade..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-xs w-64 transition-all outline-none shadow-2xs"
            />
          </div>
          <button 
            onClick={() => {
              setDealStageId('stage-1');
              setIsNewDealModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nova Oportunidade
          </button>
        </div>
      </div>

      {/* Pipeline Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total em Funil</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalPipelineValue)}</p>
          <span className="text-slate-500 text-[11px]">{opportunities.length} oportunidades ativas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Previsão Ponderada</span>
          <p className="text-xl font-bold text-indigo-700 mt-0.5">{formatCurrency(weightedPipelineValue)}</p>
          <span className="text-slate-500 text-[11px]">Ajustado pela probabilidade</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fechado / Ganho</span>
          <p className="text-xl font-bold text-emerald-700 mt-0.5">{formatCurrency(wonValue)}</p>
          <span className="text-slate-500 text-[11px]">Contratos assinados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Médio (MRR)</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(avgTicket)}</p>
          <span className="text-slate-500 text-[11px]">Média por negociação</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x min-h-[550px]">
        {STAGES.map((stage) => {
          const stageOpps = filteredOpps.filter(o => o.stageId === stage.id);
          const stageAmount = stageOpps.reduce((sum, opp) => sum + opp.value, 0);

          return (
            <div 
              key={stage.id} 
              className={cn(
                "w-72 sm:w-80 flex-shrink-0 flex flex-col bg-slate-50 border rounded-xl snap-center shadow-2xs transition-colors", 
                draggedItem ? "border-slate-300 bg-slate-100/80" : "border-slate-200"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              
              {/* Stage Header */}
              <div className="p-3.5 border-b border-slate-200 bg-white/60 rounded-t-xl">
                <div className="flex justify-between items-center mb-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", stage.color)}>
                    {stage.name}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">{stageOpps.length}</span>
                </div>
                <div className="flex items-center text-slate-900 font-bold text-sm tracking-tight">
                  {formatCurrency(stageAmount)}
                </div>
              </div>

              {/* Stage Content (Cards) */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[160px]">
                {stageOpps.map((opp) => (
                  <div 
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    onClick={() => setSelectedDeal(opp)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="font-bold text-slate-900 text-xs leading-tight group-hover:text-blue-600 transition-colors">
                        {opp.title}
                      </h3>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        opp.probability >= 80 ? "bg-emerald-100 text-emerald-800" :
                        opp.probability >= 50 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      )}>
                        {opp.probability}%
                      </span>
                    </div>
                    
                    <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" /> {opp.company}
                    </p>
                    
                    <div className="flex items-center text-xs font-mono font-bold text-slate-900 mb-2.5">
                      {formatCurrency(opp.value)}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1 truncate max-w-[140px]">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{opp.contact}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-slate-400 shrink-0">
                        <Calendar className="w-3 h-3" /> {opp.closeDate}
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageOpps.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                    Arraste cards para cá
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setDealStageId(stage.id);
                  setIsNewDealModalOpen(true);
                }}
                className="m-2.5 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors border border-dashed border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Oportunidade
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL: Nova Oportunidade */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Nova Oportunidade Comercial
              </h3>
              <button onClick={() => setIsNewDealModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título do Projeto / Negócio</label>
                <input 
                  type="text" 
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Ex: Link Dedicado 1 Giga + Bloco IP" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-semibold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Empresa / Provedor Parceiro</label>
                <input 
                  type="text" 
                  value={dealCompany}
                  onChange={(e) => setDealCompany(e.target.value)}
                  placeholder="Ex: Hotel Atlântico ou Indústria Metalúrgica" 
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor do Negócio (R$)</label>
                  <input 
                    type="number" 
                    value={dealValue}
                    onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Etapa Inicial</label>
                  <select 
                    value={dealStageId}
                    onChange={(e) => setDealStageId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-semibold text-xs"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome do Contato</label>
                  <input 
                    type="text" 
                    value={dealContact}
                    onChange={(e) => setDealContact(e.target.value)}
                    placeholder="Ex: Diretor de TI" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previsão de Fechamento</label>
                  <input 
                    type="text" 
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                    placeholder="Ex: 30/10" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Probabilidade de Fechamento: {dealProbability}%</label>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  value={dealProbability}
                  onChange={(e) => setDealProbability(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Criar Oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Detalhes da Oportunidade */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-600 rounded">
                  {STAGES.find(s => s.id === selectedDeal.stageId)?.name || 'Oportunidade'}
                </span>
                <h3 className="font-bold text-white text-base mt-1">{selectedDeal.title}</h3>
                <p className="text-xs text-slate-300">{selectedDeal.company}</p>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              
              {/* Stage Progression Bar */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">
                  Fase do Funil
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {STAGES.map((s, idx) => {
                    const isCurrent = s.id === selectedDeal.stageId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateDeal({ ...selectedDeal, stageId: s.id })}
                        className={cn(
                          "py-1.5 px-1 text-[9px] font-bold rounded text-center transition-all border",
                          isCurrent 
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                        )}
                      >
                        {idx + 1}. {s.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Value & Probability */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Recorrente (MRR)</span>
                  <input
                    type="number"
                    value={selectedDeal.value}
                    onChange={(e) => handleUpdateDeal({ ...selectedDeal, value: parseFloat(e.target.value) || 0 })}
                    className="w-full font-mono font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none text-sm mt-0.5"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Probabilidade: {selectedDeal.probability}%</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={selectedDeal.probability}
                    onChange={(e) => handleUpdateDeal({ ...selectedDeal, probability: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 mt-2"
                  />
                </div>
              </div>

              {/* Contact Information & Call Action */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contato do Decisor</span>
                  {selectedDeal.phone && (
                    <button
                      onClick={() => navigate('/telephony')}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      <Phone className="w-3.5 h-3.5" /> Ligar via WebRTC
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold">Nome</label>
                    <input 
                      type="text" 
                      value={selectedDeal.contact}
                      onChange={(e) => handleUpdateDeal({ ...selectedDeal, contact: e.target.value })}
                      className="w-full font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold">Previsão Fechamento</label>
                    <input 
                      type="text" 
                      value={selectedDeal.closeDate}
                      onChange={(e) => handleUpdateDeal({ ...selectedDeal, closeDate: e.target.value })}
                      className="w-full font-mono text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteDeal(selectedDeal.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-xs p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>

                <div className="flex items-center gap-2">
                  {selectedDeal.stageId !== 'stage-5' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateDeal({ ...selectedDeal, stageId: 'stage-5', probability: 100 })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs"
                    >
                      <Award className="w-3.5 h-3.5" /> Marcar como Ganho
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDeal(null)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                  >
                    Salvar & Fechar
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
