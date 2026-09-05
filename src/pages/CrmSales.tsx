import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreHorizontal, DollarSign, Calendar, User, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, query, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Interfaces
interface Opportunity {
  id: string;
  title: string;
  company: string;
  value: number;
  probability: number;
  closeDate: string;
  contact: string;
  stageId: string;
}

interface Stage {
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
  { id: 'op-1', title: 'Upgrade Link Dedicado', company: 'TechCorp SA', value: 4500, probability: 30, closeDate: '15/10', contact: 'Roberto', stageId: 'stage-1' },
  { id: 'op-2', title: 'Migração FTTH Empresarial', company: 'Consultoria Alpha', value: 1200, probability: 20, closeDate: '20/10', contact: 'Ana', stageId: 'stage-1' },
  { id: 'op-3', title: 'PABX em Nuvem (50 ramais)', company: 'Logística BR', value: 8500, probability: 50, closeDate: '05/10', contact: 'Carlos', stageId: 'stage-2' },
  { id: 'op-4', title: 'Projeto Wi-Fi 6 + Fibra', company: 'Hotel Estrela', value: 15000, probability: 75, closeDate: '30/09', contact: 'Mariana', stageId: 'stage-3' },
  { id: 'op-5', title: 'Link de Backup BGP', company: 'Fintech X', value: 5000, probability: 80, closeDate: '28/09', contact: 'João', stageId: 'stage-3' },
  { id: 'op-6', title: 'Contrato 36 meses ISP', company: 'Condomínio Vale', value: 18000, probability: 90, closeDate: '25/09', contact: 'Fernanda', stageId: 'stage-4' },
];

export default function CrmSales() {
  const [searchQuery, setSearchQuery] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const { tenantId } = useAuth();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

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
      // Optimistic local update
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

  const filteredOpps = opportunities.filter(o => 
    o.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" /> CRM & Pipeline de Vendas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de oportunidades (Kanban), previsão de receita e fechamentos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar oportunidade..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm w-64 transition-all outline-none shadow-sm"
            />
          </div>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Oportunidade
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
        {STAGES.map((stage) => {
          const stageOpps = filteredOpps.filter(o => o.stageId === stage.id);
          const stageAmount = stageOpps.reduce((sum, opp) => sum + opp.value, 0);

          return (
            <div 
              key={stage.id} 
              className={cn("w-80 flex-shrink-0 flex flex-col bg-slate-50 border rounded-xl snap-center shadow-sm transition-colors", 
                draggedItem ? "border-slate-300 bg-slate-100" : "border-slate-200"
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              
              {/* Stage Header */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", stage.color)}>
                    {stage.name}
                  </span>
                  <span className="text-sm font-bold text-slate-400">{stageOpps.length}</span>
                </div>
                <div className="flex items-center text-slate-900 font-bold tracking-tight">
                  {formatCurrency(stageAmount)}
                </div>
              </div>

              {/* Stage Content (Cards) */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px]">
                {stageOpps.map((opp) => (
                  <div 
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-700 transition-colors">{opp.title}</h3>
                      <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <p className="text-xs font-medium text-slate-500 mb-3">{opp.company}</p>
                    
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-800 mb-3">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      {formatCurrency(opp.value)}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {opp.contact}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                          <Calendar className="w-3 h-3" /> {opp.closeDate}
                        </div>
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded",
                          opp.probability >= 80 ? "bg-emerald-100 text-emerald-700" :
                          opp.probability >= 50 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {opp.probability}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageOpps.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                    Arraste cards para cá
                  </div>
                )}
              </div>
              
              <button className="m-3 py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-transparent">
                <Plus className="w-4 h-4" /> Add Card
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
