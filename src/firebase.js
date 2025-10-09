import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDa1x2ltYYfjHtqTL6zPnI63Inn8ykXpT4",
  authDomain: "nightrun-b8b53.firebaseapp.com",
  projectId: "nightrun-b8b53",
  storageBucket: "nightrun-b8b53.firebasestorage.app",
  messagingSenderId: "638784317787",
  appId: "1:638784317787:web:7c8e382cfab5cafca7127e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
