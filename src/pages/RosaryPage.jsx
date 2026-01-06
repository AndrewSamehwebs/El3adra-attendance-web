// src/pages/RosaryPage.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useParams } from "react-router-dom";

export default function RosaryPage() {
  const { stage } = useParams();
  const [children, setChildren] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const rosaryCollection = collection(db, `rosary_${stage}`); // كل صف عنده Collection خاص به

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(rosaryCollection);
        const tempChildren = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name,
          days: docSnap.data().days || {}
        }));
        setChildren(tempChildren);
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
      }
    };
    fetchData();
  }, [stage]);

  const handleCheckboxChange = async (childId, checked) => {
    const child = children.find(c => c.id === childId);
    const updatedDays = { ...child.days, [selectedDate]: checked };
    const docRef = doc(db, `rosary_${stage}`, childId);
    await updateDoc(docRef, { days: updatedDays });
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, days: updatedDays } : c));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="bg-white p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">🙏 حضور التسبحة - {stage}</h1>

        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border rounded-xl mb-4"/>

        <table className="w-full border text-center">
          <thead className="bg-red-800 text-white">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">اسم الطفل</th>
              <th className="p-3">حضور التسبحة ✅</th>
            </tr>
          </thead>
          <tbody>
            {children.map((child, idx) => (
              <tr key={child.id} className="even:bg-gray-100">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3 text-left">{child.name}</td>
                <td className="p-3">
                  <input type="checkbox" checked={child.days[selectedDate] || false} onChange={e => handleCheckboxChange(child.id, e.target.checked)} className="w-6 h-6"/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
