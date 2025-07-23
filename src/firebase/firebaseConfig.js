import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'; // ✅ CAMBIO
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'; // ✅ CAMBIO
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBfloTLsRpQ297v5jkOfnhs4VAj9xT6Hb4",
  authDomain: "elenlaceapp.firebaseapp.com",
  projectId: "elenlaceapp",
  storageBucket: "elenlaceapp.firebasestorage.app",
  messagingSenderId: "446527663342",
  appId: "1:446527663342:web:afff6652369716478b17ff"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = initializeAuth(app, { // ✅ CAMBIO
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, db, auth, storage, functions, firebaseConfig };
