// src/firebase/helpers/firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBfloTLsRpQ297v5jkOfnhs4VAj9xT6Hb4",
  authDomain: "elenlaceapp.firebaseapp.com",
  projectId: "elenlaceapp",
  storageBucket: "elenlaceapp.appspot.com", // ← CORREGIDO
  messagingSenderId: "446527663342",
  appId: "1:446527663342:web:afff6652369716478b17ff"
};

// 🔐 Previene error de "ya inicializado"
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Exports
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };
