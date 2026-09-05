import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  PhoneCall, 
  Users, 
  Briefcase, 
  Bot, 
  Settings, 
  Search,
  Bell,
  ChevronDown,
  BookOpen,
  Menu,
  BarChart3,
  LogOut
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Mock data for tenants
const MOCK_TENANTS = [
  { id: 't-1', name: 'Alpha Provedor (ISP)' },
  { id: 't-2', name: 'Beta Telecom' }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = React.useState(true);
  const [isTenantMenuOpen, setIsTenantMenuOpen] = React.useState(false);
  const { user, logout, tenantId, tenantName, switchTenant } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Omnichannel', href: '/omnichannel', icon: MessageSquare },
    { name: 'Telefonia', href: '/telephony', icon: PhoneCall },
    { name: 'Customer 360', href: '/customers', icon: Users },
    { name: 'CRM & Vendas', href: '/crm', icon: Briefcase },
    { name: 'IA & Automação', href: '/ai', icon: Bot },
    { name: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
    { name: 'Relatórios', href: '/reports', icon: BarChart3 },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Topbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">8</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">OCTO<span className="text-blue-600">8</span></span>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>

          {/* Tenant Context Selector */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
              className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant Atual</span>
                <span className="text-sm font-bold text-slate-800">{tenantName || 'Alpha Provedor (ISP)'}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-500 ml-2 transition-transform", isTenantMenuOpen && "rotate-180")} />
            </button>

            {isTenantMenuOpen && (
              <div className="absolute left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Alternar Workspace Tenant
                </div>
                {MOCK_TENANTS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      switchTenant(t.id, t.name);
                      setIsTenantMenuOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors",
                      tenantId === t.id ? "bg-blue-50/70 text-blue-700 font-bold" : "text-slate-700 font-medium"
                    )}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">ID: {t.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Busca global (Clientes, Tickets...)" 
              className="pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm w-64 transition-all outline-none"
            />
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 relative transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="flex items-center gap-2 cursor-pointer group">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full border border-slate-200" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-100 overflow-hidden border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  {user?.displayName || user?.email?.split('@')[0] || 'Administrador'}
                </p>
                <p className="text-[10px] font-medium text-slate-500 uppercase">
                  {user?.isDemo ? 'Admin (Demo)' : 'Admin'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={logout}
              title="Sair da Plataforma"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-300 ease-in-out z-10",
            isSidebarOpen ? "w-64" : "w-0 -translate-x-full md:translate-x-0 md:w-20"
          )}
        >
          <nav className="p-3 space-y-1 h-full overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title={!isSidebarOpen ? item.name : undefined}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700")} />
                  <span className={cn("font-medium text-sm whitespace-nowrap transition-opacity", !isSidebarOpen && "md:opacity-0 md:hidden")}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
