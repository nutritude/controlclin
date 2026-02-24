import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from './firebaseConfigData';

export { firebaseConfig };

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
