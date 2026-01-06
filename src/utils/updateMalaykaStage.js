// src/utils/updateMalaykaStage.jsx
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function updateMalaykaStage() {
  try {
    const childrenCollection = collection(db, "children");
    const snapshot = await getDocs(childrenCollection);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      // 🔹 لو الطفل ماعندوش stage محدد أو كان غلط، نعدله لـ "angels"
      if (!data.stage || data.stage.toLowerCase().includes("malayka") || data.stage === "") {
        const docRef = doc(db, "children", docSnap.id);
        await updateDoc(docRef, { stage: "angels" });
        console.log(`✅ تم تحديث: ${data.name}`);
      }
    }
    console.log("🎉 تم تحديث كل أسماء ملايكة بنجاح!");
  } catch (error) {
    console.error("❌ خطأ أثناء تحديث ملايكة:", error);
  }
}

// 🔹 استدعاء الدالة مباشرة
updateMalaykaStage();
