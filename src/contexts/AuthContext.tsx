import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isDemo?: boolean;
  role?: string; // e.g. ADMIN, SUPERVISOR, AGENT
  teamId?: string;
}

interface AuthContextType {
  user: AppUser | null;
  tenantId: string | null;
  tenantName: string;
  loading: boolean;
  logout: () => Promise<void>;
  loginAsDemo: (tenantId?: string, tenantName?: string, role?: string) => void;
  switchTenant: (newTenantId: string, newTenantName?: string) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'octo8_demo_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not read demo session:", e);
    }
    return null;
  });
  
  const [tenantId, setTenantId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tenantId || 't-1';
      }
    } catch (e) {}
    return 't-1';
  });

  const [tenantName, setTenantName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tenantName || 'Alpha Provedor (ISP)';
      }
    } catch (e) {}
    return 'Alpha Provedor (ISP)';
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const mappedUser: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuário',
          photoURL: currentUser.photoURL,
          isDemo: false
        };
        setUser(mappedUser);
        
        // Fetch user's tenant context from Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setTenantId(data.tenantId || 't-1');
            setTenantName(data.tenantName || 'Alpha Provedor (ISP)');
            setUser(prev => prev ? { ...prev, role: data.role || 'AGENT', teamId: data.teamId } : null);
          } else {
            // Provision initial tenant for new user
            const defaultTenantId = 't-1';
            const defaultTenantName = 'Alpha Provedor (ISP)';
            await setDoc(userDocRef, {
              email: currentUser.email,
              displayName: mappedUser.displayName,
              tenantId: defaultTenantId,
              tenantName: defaultTenantName,
              role: 'ADMIN',
              createdAt: new Date().toISOString()
            });
            setTenantId(defaultTenantId);
            setTenantName(defaultTenantName);
            setUser(prev => prev ? { ...prev, role: 'ADMIN' } : null);
          }
        } catch (error) {
          console.warn("Erro ao buscar dados do usuário no Firestore, usando fallback local:", error);
          setTenantId('t-1');
          setTenantName('Alpha Provedor (ISP)');
          setUser(prev => prev ? { ...prev, role: 'ADMIN' } : null);
        }
      } else {
        // If not in Firebase Auth, verify if demo session exists
        const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
        if (!savedDemo) {
          setUser(null);
          setTenantId(null);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsDemo = (tId: string = 't-1', tName: string = 'Alpha Provedor (ISP)', role: string = 'ADMIN') => {
    const demoUser: AppUser = {
      uid: 'demo-admin-uid',
      email: 'admin@octo8.io',
      displayName: 'André Pereira (Admin)',
      isDemo: true,
      role
    };
    setUser(demoUser);
    setTenantId(tId);
    setTenantName(tName);
    
    // Create a structured mock token for backend verification (uid|tenantId|role)
    const mockToken = `demo-token-demo-admin-uid|${tId}|${role}`;
    
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
        ...demoUser,
        tenantId: tId,
        tenantName: tName,
        token: mockToken
      }));
    } catch (e) {
      console.warn("Storage write error:", e);
    }
  };

  const switchTenant = (newTenantId: string, newTenantName: string = 'Tenant Selecionado') => {
    setTenantId(newTenantId);
    setTenantName(newTenantName);
    if (user?.isDemo) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
          ...user,
          tenantId: newTenantId,
          tenantName: newTenantName
        }));
      } catch (e) {}
    }
  };

  // Mocked RBAC Implementation for Demo based on PRD scopes
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;
    if (user.role === 'ADMIN') return true; // Admins bypass everything
    
    // Simplistic RBAC matrix for Supervisor / Agent
    const roles: Record<string, string[]> = {
      'SUPERVISOR': ['view_reports', 'manage_agents', 'transfer_calls', 'view_dashboard', 'manage_tickets'],
      'AGENT': ['view_dashboard', 'answer_calls', 'manage_tickets']
    };

    return roles[user.role]?.includes(permission) || false;
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Signout error:", e);
    } finally {
      setUser(null);
      setTenantId(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, tenantId, tenantName, loading, logout, loginAsDemo, switchTenant, hasPermission }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
