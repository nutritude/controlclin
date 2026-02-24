
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Defensive check to avoid silent crash on missing env vars
if (!firebaseConfig.apiKey) {
    console.error("CRITICAL: Firebase API Key is missing! Please check your environment variables (VITE_FIREBASE_API_KEY).");
}

let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("FAILED to initialize Firebase:", error);
    // Create a dummy app object to prevent downstream import crashes if possible
    app = { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as any;
}

export const db = getFirestore(app);
export const auth = getAuth(app);
