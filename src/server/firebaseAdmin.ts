import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { applicationDefault } from 'firebase-admin/app';

// Initialize the Firebase Admin SDK using application default credentials 
// or by explicitly defining the project ID when running in Cloud Run/Functions
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "gen-lang-client-0184488005" 
  });
}

const app = getApp();

// Since we are using a specific named database in Firestore Enterprise (from the blueprint),
// we must specify the databaseId when calling firestore().
export const adminDb = getFirestore(app, 'ai-studio-octo8-a4947e0a-1f43-4b77-998c-4b9b6c49d6ef');
export const adminAuth = getAuth(app);
