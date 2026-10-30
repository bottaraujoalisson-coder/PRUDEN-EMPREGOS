import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicialização opcional de Firebase App Check quando VITE_RECAPTCHA_SITE_KEY estiver configurado (AUD-18)
if (typeof window !== 'undefined') {
  const recaptchaSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
  if (recaptchaSiteKey && typeof recaptchaSiteKey === 'string' && recaptchaSiteKey.trim()) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey.trim()),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      // Ignora se já inicializado
    }
  }
}

function createDbInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      { ignoreUndefinedProperties: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createDbInstance();
export const auth = getAuth(app);

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase está operando em modo offline ou desconectado.');
    }
  }
}

// Run connection validation on boot
testConnection();

export default app;
