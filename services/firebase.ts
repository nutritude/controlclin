import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCaBGmBq4Hj6IJA0765q6kDKk6JWG4_Sws",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "controclin-602b6.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "controclin-602b6",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "controclin-602b6.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "510250226894",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:510250226894:web:265ccdd6f92c55ca656c9f"
};

export let firebaseError = false;

let app;
export let db: any;
export let auth: any;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("FAILED to initialize Firebase:", error);
    firebaseError = true;
    db = { collection: () => ({}), doc: () => ({}) };
    auth = { onAuthStateChanged: () => ({}), currentUser: null };
}
