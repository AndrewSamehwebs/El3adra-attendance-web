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
  const [filterStatus, setFilterStatus] = useState("all");
  const [openFilter, setOpenFilter] = useState(false);
  const rowsPerPage = 10;
  // حساب عدد الحضور في نفس الشهر
const getMonthlyAttendanceForChild = (child) => {
  if (!child.days || !selectedDate) return 0;

  const selectedMonth = selectedDate.slice(0, 7); // YYYY-MM

  return Object.keys(child.days).filter(
    (dateKey) =>
      dateKey.startsWith(selectedMonth) &&
      child.days[dateKey]?.present === true
  ).length;
};


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

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rowsData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

    if (!rowsData.length) return alert("❌ الملف فارغ");

    // نسخة محلية من الأسماء الموجودة بدون مشاكل المسافات
    const existingNames = new Set(children.map(c => c.name.trim().toLowerCase()));
    let addedCount = 0;

    for (const row of rowsData) {
      // ايجاد العمود اللي فيه "الاسم" حتى لو فيه مسافات
      const nameColumn = Object.keys(row).find(k => k.replace(/\s+/g, "") === "الاسم");
      const name = row[nameColumn]?.toString().trim();
      if (!name) continue;

      const normalized = name.toLowerCase();
      if (existingNames.has(normalized)) continue;

      existingNames.add(normalized);

      const newChild = { name, days: {}, page: stage };
      const ref = await addDoc(tusbhaCollection, newChild);

      setChildren(prev => [...prev, { id: ref.id, ...newChild }]);
      addedCount++;
    }

    alert(`✅ تم إضافة ${addedCount} صفوف جديدة بنجاح`);
  } catch (err) {
    console.error("خطأ في رفع Excel:", err);
    alert("❌ حدث خطأ أثناء رفع الإكسل. تأكد أن الملف صالح وعمود 'الاسم' موجود");
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
    .filter(c => {
      // بحث بالاسم
      const matchSearch = c.name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchSearch) return false;

      const day = c.days?.[selectedDate];

      // فلتر الحضور
      if (filterStatus === "present") return day?.present === true;
      if (filterStatus === "absent") return day?.present === false;
      if (filterStatus === "none") return !day;

      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}, [children, search, filterStatus, selectedDate]);


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

<div className="flex flex-wrap items-center gap-2 mb-4">

  {/* السيرش أول حاجة */}
  <input
    type="text"
    placeholder="ابحث عن اسم الطفل..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="p-2 border rounded-xl flex-1 min-w-[180px]"
  />

  {/* فلتر الحضور */}
  <select
    value={filterStatus}
    onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
    className="p-2 border rounded-xl"
  >
    <option value="all">الكل</option>
    <option value="present">الحاضرين</option>
    <option value="none">الغياب</option>
  </select>


  {/* التاريخ */}
  <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="p-2 border rounded-xl w-40"
  />

  {/* خانة الاسم + زر الإضافة جنب بعض */}
  <div className="flex gap-2">
    <input
      type="text"
      placeholder="اضافة اسم الطفل..."
      value={newChildName}
      onChange={(e) => setNewChildName(e.target.value)}
      className="p-2 border rounded-xl w-48"
    />
    <button
      onClick={addChild}
      className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
    >
      ➕ إضافة طفل
    </button>
  </div>

  {/* زر رفع الإكسل */}
  <label className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer">
    Upload Excel ⬆️
    <input type="file" accept=".xlsx, .xls" onChange={uploadExcel} className="hidden" />
  </label>

  {/* إعادة ضبط الحضور */}
  <button
    onClick={resetAttendance}
    className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition"
  >
    🔄 إعادة ضبط الحضور
  </button>

  {/* اختيار الأطفال للنقل */}
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
    <select className="p-2 border rounded" onChange={(e) => handleCutSelected(e.target.value)} defaultValue="">
      <option value="" disabled>اختر الصف</option>
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
                <th className="p-3 w-60">الاسم</th>
                <th className="p-3 w-24">حضور</th>
                <th className="p-3 w-28 text-center">عدد الحضور</th>
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
                    <td className="p-3 font-bold text-center break-words">{childName}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="w-7 h-7"
                        checked={dayData.present}
                        onChange={(e) => handleCheckboxChange(child.id, e.target.checked)}
                      />
                    </td>
                   
<td className="p-3 font-bold text-red-700">
  {getMonthlyAttendanceForChild(child)}
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

                {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              السابق
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page
                    ? "bg-red-800 text-white"
                    : "bg-white text-red-800 hover:bg-red-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
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
