// src/pages/TusbhaAttendance.jsx
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import { debounce } from "lodash";
import * as XLSX from "xlsx";

/* =========================
   أسماء الصفوف بالعربي
========================= */
const STAGE_LABELS = {
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة",
};

export default function TusbhaAttendance() {
  const { stage } = useParams();
  const stageLabel = STAGE_LABELS[stage] || stage;

  const [children, setChildren] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newChildName, setNewChildName] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedRows, setSelectedRows] = useState({});
  const rowsPerPage = 10;

  const tusbhaCollection = collection(db, "tusbha");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(tusbhaCollection, where("page", "==", stage));
        const snapshot = await getDocs(q);
        const tempChildren = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return { id: docSnap.id, name: data.name, days: data.days || {} };
        });
        setChildren(tempChildren);
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        alert("❌ فشل تحميل البيانات");
      }
    };
    fetchData();
  }, [stage]);

  const debounceUpdate = debounce(async (docRef, date, value) => {
    try {
      await updateDoc(docRef, { [`days.${date}.present`]: value }, { merge: true });
    } catch (error) {
      console.error("خطأ في تحديث اليوم:", error);
      alert("❌ فشل تحديث اليوم");
    }
  }, 300);

  const handleCheckboxChange = (childId, checked) => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.id === childId) {
          const updatedDays = { ...c.days, [selectedDate]: { present: checked } };
          const docRef = doc(db, "tusbha", childId);
          debounceUpdate(docRef, selectedDate, checked);
          return { ...c, days: updatedDays };
        }
        return c;
      })
    );
  };

const addChild = async () => {
  const trimmedName = newChildName.trim();
  if (!trimmedName) return alert("⚠️ أدخل اسم الطفل");

  // تأكد إن الاسم مش موجود
  const exists = children.some(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (exists) {
    return alert("⚠️ الاسم ده موجود بالفعل");
  }

  const newChild = { name: trimmedName, days: {}, page: stage };

  try {
    const docRef = await addDoc(tusbhaCollection, newChild);
    setChildren((prev) => [...prev, { id: docRef.id, ...newChild }]);
    setNewChildName("");
  } catch (error) {
    console.error("خطأ في إضافة الطفل:", error);
    alert("❌ حدث خطأ أثناء الإضافة");
  }
};


  const deleteChild = async (childId) => {
    if (!window.confirm("⚠️ هل أنت متأكد من حذف بيانات هذا الطفل؟")) return;
    try {
      await deleteDoc(doc(db, "tusbha", childId));
      setChildren((prev) => prev.filter((c) => c.id !== childId));
    } catch (error) {
      console.error("خطأ في حذف الطفل:", error);
      alert("❌ فشل حذف الطفل");
    }
  };

  const resetAttendance = async () => {
    if (!window.confirm("هل أنت متأكد من إعادة ضبط الحضور لهذا اليوم؟")) return;
    try {
      const updatedChildren = [];
      for (const c of children) {
        const updatedDays = { ...c.days, [selectedDate]: { present: false } };
        const docRef = doc(db, "tusbha", c.id);
        await updateDoc(docRef, { [`days.${selectedDate}`]: { present: false } });
        updatedChildren.push({ ...c, days: updatedDays });
      }
      setChildren(updatedChildren);
    } catch (error) {
      console.error("خطأ في إعادة ضبط الحضور:", error);
      alert("❌ حدث خطأ أثناء إعادة ضبط الحضور");
    }
  };

const uploadExcel = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // نسخة محلية من الأسماء الموجودة
  const existingNames = new Set(
    children.map((c) => c.name.trim().toLowerCase())
  );

  const newChildrenToAdd = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    const name = row[0];
    if (!name) continue;

    const trimmedName = name.toString().trim();
    const lowerName = trimmedName.toLowerCase();

    if (existingNames.has(lowerName)) continue;

    existingNames.add(lowerName);

    newChildrenToAdd.push({
      name: trimmedName,
      days: {},
      page: stage,
    });
  }

  try {
    for (const child of newChildrenToAdd) {
      const docRef = await addDoc(tusbhaCollection, child);
      setChildren((prev) => [...prev, { id: docRef.id, ...child }]);
    }
  } catch (error) {
    console.error("خطأ في رفع Excel:", error);
    alert("❌ حصل خطأ أثناء رفع الإكسل");
  }
};


  const handleCutSelected = async (targetStage) => {
    const selectedIds = Object.keys(selectedRows).filter((id) => selectedRows[id]);
    if (selectedIds.length === 0) return alert("⚠️ اختر الأطفال لنقلهم أولاً");
    if (!window.confirm(`⚠️ هل أنت متأكد من نقل ${selectedIds.length} طفل إلى ${targetStage}?`)) return;

    for (const id of selectedIds) {
      const docRef = doc(db, "tusbha", id);
      await updateDoc(docRef, { page: targetStage });
    }
    setChildren(prev => prev.filter(c => !selectedIds.includes(c.id)));
    setSelectedRows({});
    setShowSelection(false);
  };

  const filteredChildren = useMemo(() => {
    return children
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [children, search]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredChildren.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredChildren.length / rowsPerPage);

  return (
    <div className="min-h-screen p-6">
      <div className="bg-white p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-red-900">
            حضور التسبحة - {stageLabel}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <input
            type="text"
            placeholder="ابحث عن اسم الطفل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded-xl w-full md:w-auto flex-grow"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded-xl w-full md:w-auto"
          />
          <input
            type="text"
            placeholder="اضافة اسم الطفل..."
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            className="p-2 border rounded-xl w-full md:w-auto"
          />
          <label className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer">
            Upload Excel ⬆️
            <input type="file" accept=".xlsx, .xls" onChange={uploadExcel} className="hidden" />
          </label>
          <button
            onClick={addChild}
            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
          >
            ➕ إضافة طفل
          </button>
          <button
            onClick={resetAttendance}
            className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition"
          >
            🔄 إعادة ضبط الحضور
          </button>
          <button
            onClick={() => setShowSelection(true)}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
          >
            اختيار الأطفال للنقل
          </button>
        </div>

        {/* نقل الأطفال المحددين تحت الأدوات */}
        {showSelection && (
          <div className="mt-4 p-4 border rounded-xl bg-gray-50 flex gap-2 items-center flex-wrap">
            <span>نقل الأطفال المحددين إلى:</span>
            <select
              className="p-2 border rounded"
              onChange={(e) => handleCutSelected(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                اختر الصف
              </option>
            </select>
            <button
              onClick={() => alert("⚠️ هذا الزر مقفول حاليًا")}
              disabled
              className="px-4 py-2 bg-gray-400 text-white rounded flex items-center gap-1 cursor-not-allowed opacity-70"
            >
              🔒 مقفول
            </button>
            <button
              onClick={() => setShowSelection(false)}
              className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* جدول الأطفال */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full border shadow rounded-xl text-center min-w-[500px]">
            <thead className="bg-red-800 text-white text-lg sticky top-0">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3 w-60">اسم الطفل</th>
                <th className="p-3 w-24">حضور ✅</th>
                {showSelection && <th className="p-3 w-16">اختيار للنقل</th>}
                <th className="p-3 w-16">حذف</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((child, idx) => {
                const dayData = (child.days && child.days[selectedDate]) || { present: false };
                const childName = child.name || "---"; // لو الاسم مش موجود
                return (
                  <tr key={child.id} className="even:bg-gray-100 hover:bg-gray-200 transition">
                    <td className="p-3">{indexOfFirstRow + idx + 1}</td>
                    <td className="p-3 text-center break-words">{childName}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="w-7 h-7"
                        checked={dayData.present}
                        onChange={(e) => handleCheckboxChange(child.id, e.target.checked)}
                      />
                    </td>
                    {showSelection && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="w-7 h-7"
                          checked={!!selectedRows[child.id]}
                          onChange={(e) =>
                            setSelectedRows((prev) => ({ ...prev, [child.id]: e.target.checked }))
                          }
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <button
                        onClick={() => deleteChild(child.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination الجديد */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              السابق
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page
                    ? "bg-red-800 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
