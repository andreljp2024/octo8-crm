import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../../lib/firebase-admin';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    tenantId: string;
    role: string;
  };
}

// Simple RBAC definitions mirroring the frontend
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'ADMIN': ['*'], // Bypass
  'SUPERVISOR': ['view_reports', 'manage_agents', 'transfer_calls', 'view_dashboard', 'manage_tickets'],
  'AGENT': ['view_dashboard', 'answer_calls', 'manage_tickets']
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Check for Demo Token (used by our frontend mock login)
    if (token.startsWith('demo-token-')) {
      const parts = token.split('|'); // e.g. demo-token-uid|tenantId|ROLE
      req.user = {
        uid: parts[0] || 'demo-uid',
        tenantId: parts[1] || 't-1',
        role: parts[2] || 'AGENT'
      };
      return next();
    }

    // 2. Real Firebase Token Verification
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Note: In a full production app, you would fetch the user's role and tenantId from Firestore 
    // here using the decodedToken.uid. For now, we extract custom claims or fallback.
    req.user = {
      uid: decodedToken.uid,
      tenantId: (decodedToken.tenantId as string) || 't-1',
      role: (decodedToken.role as string) || 'AGENT'
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const { role } = req.user;

    if (role === 'ADMIN') {
      return next();
    }

    const permissions = ROLE_PERMISSIONS[role] || [];
    
    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient privileges', 
        required: requiredPermission, 
        currentRole: role 
      });
    }

    next();
  };
};
