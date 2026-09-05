import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// O config abaixo normalmente viria de variáveis de ambiente no cliente (VITE_...)
// Mas em ambientes AI Studio, o config JSON é injetado/criado no projeto.
// Vamos carregar a partir do import para este cenário, ou usar env vars.
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
// Pass the specific database ID since we are using a named database for the applet
export const db = getFirestore(app, firebaseConfigData.firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);
