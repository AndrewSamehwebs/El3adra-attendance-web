import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// ❌ شيل analytics مؤقتًا
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAZvfO-N7l-e542lap1AdP0TBwenJoVkqA",
  authDomain: "el3adra-moharam-bek-attendance.firebaseapp.com",
  projectId: "el3adra-moharam-bek-attendance",
  storageBucket: "el3adra-moharam-bek-attendance.appspot.com",
  messagingSenderId: "759522690484",
  appId: "1:759522690484:web:ff236df511b3bff0b5dee1",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// ❌ متصدرش analytics دلوقتي
// export const analytics = getAnalytics(app);
