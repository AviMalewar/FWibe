import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Replace the following with your own Firebase project configuration
// You can find this in your Firebase Console: Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCQF-fKEeyb16sB0_PhUD_U5DInA2uL5Q4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vibe-login-e5386.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://vibe-login-e5386-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vibe-login-e5386",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vibe-login-e5386.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488033838213",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:488033838213:web:7e5d983ee978138d43b5ec"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export default app;
