import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBN35Iic4Tnrssd5GWcgPfD7WmweYSwrZQ",
  authDomain: "roadhazex.firebaseapp.com",
  projectId: "roadhazex",
  storageBucket: "roadhazex.firebasestorage.app",
  messagingSenderId: "789679064279",
  appId: "1:789679064279:web:ffd39628c79a0bf0e4dc92",
  measurementId: "G-4JRN31P28J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export Firestore, Storage and Auth DB
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

