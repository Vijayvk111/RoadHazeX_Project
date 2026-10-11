import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBN35Iic4Tnrssd5GWcgPfD7WmweYSwrZQ",
  authDomain: "roadhazex.firebaseapp.com",
  projectId: "roadhazex",
  storageBucket: "roadhazex.firebasestorage.app",
  messagingSenderId: "789679064279",
  appId: "1:789679064279:web:ffd39628c79a0bf0e4dc92",
  measurementId: "G-4JRN31P28J"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

