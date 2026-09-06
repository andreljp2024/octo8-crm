import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireTenant = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Extract tenantId from headers for isolation
  const tenantId = req.headers['x-tenant-id'];
  
  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: Missing x-tenant-id header' });
  }

  // TODO: In a production scenario, we must verify if the req.user has permission for this tenantId.
  // req.user.tenantId == tenantId or similar RBAC verification logic using firestore roles.
  
  // Expose it onto the request for downstream controllers
  (req as any).tenantId = tenantId;
  next();
};
