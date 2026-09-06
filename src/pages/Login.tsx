import React, { useState, useEffect } from 'react';
import { AlertCircle, Bot, ExternalLink, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const { loginAsDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      setIsInIframe(window !== window.parent);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleDemoLogin = (role: string) => {
    loginAsDemo('t-1', 'Alpha Provedor (ISP)', role);
    navigate('/');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O login foi cancelado pelo usuário.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domínio não autorizado pelo Firebase. Adicione "${window.location.hostname}" em Firebase Console > Authentication > Configurações > Domínios Autorizados, ou clique abaixo em "Acesso Rápido Demo" para testar agora.`);
      } else if (isInIframe && (err.message?.includes('Cross-Origin-Opener-Policy') || err.code === 'auth/internal-error')) {
        setError('O iframe do navegador bloqueou a janela do Google. Clique em "Abrir em Nova Aba" ou entre com o "Acesso Rápido Demo".');
      } else {
        setError(err.message || 'Erro ao autenticar com o Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Bot className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Octo8
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          SaaS Multitenant • Contact Center, CRM & AI Copilot
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-5 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100 text-center">
          
          <h3 className="text-lg font-bold text-slate-900 mb-2">Acesse seu Workspace</h3>
          <p className="text-xs text-slate-500 mb-6">Escolha como deseja se autenticar na plataforma:</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 mb-5 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Access (Guaranteed to work inside iframe or standalone) */}
          <div className="mb-5 p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Modo Demonstração Instantâneo
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded-full">
                Pronto
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Simule a visão de diferentes perfis (RBAC) no tenant <strong>Alpha Provedor (ISP)</strong>.
            </p>
            
            <div className="space-y-2">
              <button
                onClick={() => handleDemoLogin('ADMIN')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Entrar como Administrador (Acesso Total)
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleDemoLogin('SUPERVISOR')}
                  className="flex-1 flex items-center justify-center py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  Supervisor
                </button>
                <button
                  onClick={() => handleDemoLogin('AGENT')}
                  className="flex-1 flex items-center justify-center py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  Atendente
                </button>
              </div>
            </div>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">ou autenticação corporativa</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center gap-3 py-2.5 px-4 border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? (
              'Autenticando...'
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Entrar com o Google
              </>
            )}
          </button>

          {/* Iframe Notice & Open in New Tab */}
          {isInIframe && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-left">
              <span className="text-xs text-slate-500">Visualizando dentro de iframe?</span>
              <button
                onClick={handleOpenNewTab}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                Abrir em Nova Aba <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Isolamento multitenant criptografado via Firestore Rules</span>
          </div>

        </div>
      </div>
    </div>
  );
}
