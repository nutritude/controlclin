import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export let firebaseError = false;

// Defensive check to avoid silent crash on missing env vars
if (!firebaseConfig.apiKey) {
    console.error("CRITICAL: Firebase API Key is missing! Please check your environment variables (VITE_FIREBASE_API_KEY).");
    firebaseError = true;
}

let app;
export let db: any;
export let auth: any;

try {
    if (!firebaseError) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } else {
        throw new Error("Missing Firebase API Key");
    }
} catch (error) {
    console.error("FAILED to initialize Firebase:", error);
    firebaseError = true;
    // Dummy objects to prevent module resolution crashes
    db = { collection: () => ({}), doc: () => ({}) };
    auth = { onAuthStateChanged: () => ({}), currentUser: null };
}
