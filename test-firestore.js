import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function test() {
  console.log("Connecting to Firestore Project:", process.env.VITE_FIREBASE_PROJECT_ID);
  try {
    const testDoc = doc(firestore, "system_data", "test_connection");
    await setDoc(testDoc, { timestamp: Date.now() });
    console.log("✅ Successfully wrote to Firestore system_data/test_connection");
    
    const snap = await getDoc(testDoc);
    console.log("✅ Successfully read from Firestore:", snap.data());
  } catch (err) {
    console.error("❌ Firestore Error:", err.code, err.message);
  }
  process.exit();
}
test();
