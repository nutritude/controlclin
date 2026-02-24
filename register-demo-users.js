import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCaBGmBq4Hj6IJA0765q6kDKk6JWG4_Sws",
    authDomain: "controclin-602b6.firebaseapp.com",
    projectId: "controclin-602b6",
    storageBucket: "controclin-602b6.firebasestorage.app",
    messagingSenderId: "510250226894",
    appId: "1:510250226894:web:265ccdd6f92c55ca656c9f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function register() {
    const users = [
        { email: 'roberto@control.com', pass: '123456' },
        { email: 'camila@control.com', pass: '123456' },
        { email: 'rangel@control.com', pass: '123456' },
        { email: 'admin@clinica.com', pass: '123456' },
        { email: 'doutor@clinica.com', pass: '123456' }
    ];

    for (let u of users) {
        try {
            await createUserWithEmailAndPassword(auth, u.email, u.pass);
            console.log("✔️ Created Firebase user: " + u.email);
        } catch (e) {
            console.log("⚠️ Exists or skip: " + u.email + " -> " + e.message);
        }
    }
    console.log("Processo concluído!");
    process.exit(0);
}
register();
