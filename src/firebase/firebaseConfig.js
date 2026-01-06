// src/firebase.js

// Import Firebase core
import { initializeApp } from "firebase/app";

// Import Firestore
import { getFirestore } from "firebase/firestore";

// Firebase configuration (المشروع الجديد)
const firebaseConfig = {
  apiKey: "AIzaSyAZvfO-N7l-e542lap1AdP0TBwenJoVkqA",
  authDomain: "el3adra-moharam-bek-attendance.firebaseapp.com",
  projectId: "el3adra-moharam-bek-attendance",
  storageBucket: "el3adra-moharam-bek-attendance.firebasestorage.app",
  messagingSenderId: "759522690484",
  appId: "1:759522690484:web:ff236df511b3bff0b5dee1"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
