import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const nativeGoogleWebClientId = String(import.meta.env.VITE_FIREBASE_GOOGLE_WEB_CLIENT_ID || '').trim();
export const hasNativeGoogleClientId = nativeGoogleWebClientId.length > 0;

export const hasFirebaseConfig = Object.values(firebaseConfig).every(
    (value) => typeof value === 'string' && value.trim().length > 0
);

let app = null;
let auth = null;
let googleProvider = null;

if (hasFirebaseConfig) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export { app, auth, googleProvider };
