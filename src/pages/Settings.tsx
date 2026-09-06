import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Users, Shield, 
  Building, CreditCard, Lock, Bell, Search, 
  Plus, Edit, Trash2, ShieldCheck, Mail, Check, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, AppUser } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TenantSettings from '@/pages/TenantSettings';

const TABS = [
  { id: 'users', label: 'Usuários e Controle de Acesso', icon: Users, permission: 'admin_only' },
  { id: 'organization', label: 'Dados da Organização', icon: Building, permission: 'admin_only' },
  { id: 'security', label: 'Segurança & Auditoria', icon: Shield, permission: 'admin_only' },
  { id: 'billing', label: 'Faturamento', icon: CreditCard, permission: 'admin_only' }
];

const ROLES = [
  { id: 'ADMIN', label: 'Administrador (Acesso Total)' },
  { id: 'SUPERVISOR', label: 'Supervisor (Gestão e Relatórios)' },
  { id: 'AGENT', label: 'Agente (Atendimento Base)' }
];

export default function Settings() {
  const { user: currentUser, tenantId, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // User Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'AGENT'
  });

  useEffect(() => {
    if (!tenantId) return;

    // Simulate fetching users for this tenant
    // In a real app, this queries the 'users' collection where tenantId == tenantId
    const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedUsers: AppUser[] = snapshot.docs.map(d => ({ 
        uid: d.id, 
        ...d.data() 
      } as AppUser));
      
      // If empty, seed mock data
      if (fetchedUsers.length === 0) {
        setUsers([
          { uid: 'u-1', displayName: 'Admin Principal', email: 'admin@provedor.com.br', role: 'ADMIN' },
          { uid: 'u-2', displayName: 'Carlos Supervisor', email: 'carlos@provedor.com.br', role: 'SUPERVISOR' },
          { uid: 'u-3', displayName: 'Ana Silva', email: 'ana.silva@provedor.com.br', role: 'AGENT' },
        ]);
      } else {
        setUsers(fetchedUsers);
      }
    });

    return () => unsubscribe();
  }, [tenantId]);

  if (!hasPermission('admin_only')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Lock className="w-12 h-12 mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Restrito</h2>
        <p>Apenas Administradores podem acessar as configurações do sistema.</p>
      </div>
    );
  }

  const handleOpenModal = (userToEdit?: AppUser) => {
    if (userToEdit) {
      setEditingUserId(userToEdit.uid);
      setFormData({
        name: userToEdit.displayName || '',
        email: userToEdit.email || '',
        role: userToEdit.role || 'AGENT'
      });
    } else {
      setEditingUserId(null);
      setFormData({ name: '', email: '', role: 'AGENT' });
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUid = editingUserId || `u-${Date.now()}`;
    const newUser = {
      uid: newUid,
      displayName: formData.name,
      email: formData.email,
      role: formData.role,
      tenantId
    };

    setUsers(prev => {
      if (editingUserId) return prev.map(u => u.uid === editingUserId ? newUser : u);
      return [newUser, ...prev];
    });

    try {
      await setDoc(doc(db, 'users', newUid), newUser);
    } catch (error) {
      console.warn("Firestore save skipped:", error);
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === currentUser?.uid) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }
    if (confirm("Tem certeza que deseja remover este usuário do sistema?")) {
      setUsers(prev => prev.filter(u => u.uid !== uid));
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        console.warn("Firestore delete skipped:", error);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-600" /> Configurações do Workspace
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie usuários, regras de negócio e integrações.
        </p>
      </div>

      {/* Tabs Nav */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
              activeTab === tab.id 
                ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Users (RBAC) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar usuário por nome ou email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg text-sm outline-none transition-colors"
              />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Perfil de Acesso (RBAC)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {user.displayName?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.displayName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border",
                        user.role === 'ADMIN' ? "bg-purple-50 text-purple-700 border-purple-200" :
                        user.role === 'SUPERVISOR' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {user.role === 'ADMIN' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Ativo
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Organization (Tenant PBX Settings) */}
      {activeTab === 'organization' && (
        <TenantSettings />
      )}

      {/* Placeholder for other tabs */}
      {activeTab !== 'users' && activeTab !== 'organization' && (
        <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">Módulo em Desenvolvimento</h3>
          <p className="text-sm">As configurações desta seção estarão disponíveis em breve.</p>
        </div>
      )}

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário (Agente)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail Comercial</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Perfil de Acesso (RBAC)</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700"
                >
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                  {formData.role === 'ADMIN' && 'Tem acesso irrestrito a todas as áreas, faturamento e exclusão de dados.'}
                  {formData.role === 'SUPERVISOR' && 'Pode visualizar relatórios de desempenho, escutar ligações e gerenciar o CRM.'}
                  {formData.role === 'AGENT' && 'Acesso restrito à tela de Omnichannel e Telefonia para realizar atendimentos.'}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Convidar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
