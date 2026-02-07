// src/pages/MassPage.jsx
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

const STAGE_LABELS = {
  angels: "ملايكة",
  grade1: "سنة أولى",
  grade2: "سنة تانية",
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة",
};

export default function MassPage() {
  const { stage } = useParams();
  const stageLabel = STAGE_LABELS[stage] || stage;

  const [children, setChildren] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newChildName, setNewChildName] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedRows, setSelectedRows] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [openFilter, setOpenFilter] = useState(false);
  const rowsPerPage = 10;

  const massCollection = collection(db, "attendance"); // نفس الكولكشن

  useEffect(() => {
    const fetchData = async () => {
      const q = query(massCollection, where("page", "==", stage));
      const snapshot = await getDocs(q);
      setChildren(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    };
    fetchData();
  }, [stage]);

  const debounceUpdate = debounce(async (docRef, date, field, value) => {
    await updateDoc(docRef, { [`days.${date}.${field}`]: value });
  }, 300);

  const handleCheckboxChange = (id, field, checked) => {
    setChildren(prev =>
      prev.map(c => {
        if (c.id === id) {
          const days = { ...c.days, [selectedDate]: { ...c.days?.[selectedDate], [field]: checked } };
          debounceUpdate(doc(db, "attendance", id), selectedDate, field, checked);
          return { ...c, days };
        }
        return c;
      })
    );
  };

const addChild = async () => {
  const name = newChildName.trim();
  if (!name) return alert("⚠️ أدخل اسم الطفل");

  const lowerName = name.toLowerCase();
  const exists = children.some(c => c.name.trim().toLowerCase() === lowerName);
  if (exists) return alert("⚠️ الاسم موجود بالفعل");

  const newChild = { name, days: {}, page: stage };
  const ref = await addDoc(massCollection, newChild);
  setChildren(prev => [...prev, { id: ref.id, ...newChild }]);
  setNewChildName("");
};


  const deleteChild = async (id) => {
    if (!window.confirm("⚠️ متأكد من الحذف؟")) return;
    await deleteDoc(doc(db, "attendance", id));
    setChildren(prev => prev.filter(c => c.id !== id));
  };

  const resetAttendance = async () => {
    if (!window.confirm("⚠️ إعادة ضبط حضور اليوم؟")) return;
    for (const c of children) {
      await updateDoc(doc(db, "attendance", c.id), { [`days.${selectedDate}.massPresent`]: false });
    }
    setChildren(prev =>
      prev.map(c => ({ ...c, days: { ...c.days, [selectedDate]: { ...c.days[selectedDate], massPresent: false } } }))
    );
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

    // التحقق من الأعمدة الأساسية بدون مشاكل المسافات
    const requiredColumns = ["الاسم"];
    const fileColumns = Object.keys(rowsData[0]).map(c => c.trim().replace(/\s+/g, ""));
    const missingColumns = requiredColumns.filter(c => 
      !fileColumns.some(fc => fc.replace(/\s+/g, "") === c)
    );
    if (missingColumns.length) {
      return alert(`❌ الملف غير صالح، الأعمدة المفقودة: ${missingColumns.join(", ")}`);
    }

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
      const ref = await addDoc(massCollection, newChild);

      setChildren(prev => [...prev, { id: ref.id, ...newChild }]);
      addedCount++;
    }

    alert(`✅ تم إضافة ${addedCount} صفوف جديدة بنجاح`);
  } catch (err) {
    console.error("خطأ في رفع Excel:", err);
    alert("❌ حدث خطأ أثناء رفع الملف، تأكد أنه ملف إكسل صالح وعمود 'الاسم' موجود");
  }
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

      // فلتر القداس (massPresent)
      if (filterStatus === "present") return day?.massPresent === true;
      if (filterStatus === "absent") return day?.massPresent === false;
      if (filterStatus === "none") return !day;

      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}, [children, search, filterStatus, selectedDate]);


  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filteredChildren.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredChildren.length / rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const getMonthlyCount = (child) => {
    const [y, m] = selectedDate.split("-");
    return Object.entries(child.days || {}).filter(([d, v]) => d.startsWith(`${y}-${m}`) && v.massPresent).length;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">
          حضور القداس – {stageLabel}
        </h1>

        {/* أدوات التحكم */}
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ابحث عن اسم الطفل..."
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

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="p-2 border rounded-xl"
          />
          <input
            value={newChildName}
            onChange={e => setNewChildName(e.target.value)}
            placeholder="إضافة اسم طفل..."
            className="p-2 border rounded-xl"
          />
          <button onClick={addChild} className="px-4 py-2 bg-green-500 text-white rounded-xl">➕ إضافة</button>
          <label className="px-4 py-2 bg-blue-500 text-white rounded-xl cursor-pointer">
            ⬆️ Upload Excel
            <input type="file" accept=".xlsx,.xls" onChange={uploadExcel} className="hidden" />
          </label>
          <button onClick={resetAttendance} className="px-4 py-2 bg-yellow-500 text-white rounded-xl">🔄 إعادة ضبط</button>
          <button onClick={() => setShowSelection(true)} className="px-4 py-2 bg-purple-500 text-white rounded-xl">اختيار للنقل</button>
        </div>

        {/* زر اختيار للنقل */}
        {showSelection && (
          <div className="mb-4 p-4 border rounded-xl bg-gray-50 flex gap-2 items-center">
            <span>اختر المحددين للنقل:</span>
            <select className="p-2 border rounded" defaultValue="">
              <option value="" disabled>اختر الصف</option>
            </select>
            <button disabled className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed opacity-70">🔒 مقفول</button>
            <button onClick={() => setShowSelection(false)} className="px-4 py-2 bg-gray-400 text-white rounded">إلغاء</button>
          </div>
        )}

        {/* الجدول */}
        <div className="overflow-x-auto">
          <table className="w-full border shadow rounded-xl overflow-hidden text-center min-w-[700px]">
            <thead className="bg-red-800 text-white text-lg">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">حضور القداس</th>
                <th className="p-3">عدد الشهر</th>
                {showSelection && <th className="p-3">اختيار</th>}
                <th className="p-3">حذف</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((c, i) => {
                const d = c.days?.[selectedDate] || {};
                return (
                  <tr key={c.id} className="even:bg-gray-100 text-lg">
                    <td className="p-3">{indexOfFirst + i + 1}</td>
                    <td className="p-3 font-bold text-center break-words">{c.name}</td>
                    <td className="p-3">
                      <input type="checkbox" className="w-6 h-6"
                        checked={d.massPresent || false}
                        onChange={e => handleCheckboxChange(c.id, "massPresent", e.target.checked)}
                      />
                    </td>
                    <td className="p-3 font-bold text-green-700">{getMonthlyCount(c)}</td>
                    {showSelection && (
                      <td className="p-3">
                        <input type="checkbox" className="w-6 h-6"
                          checked={!!selectedRows[c.id]}
                          onChange={e => setSelectedRows(prev => ({ ...prev, [c.id]: e.target.checked }))}
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <button onClick={() => deleteChild(c.id)} className="px-2 py-1 bg-red-500 text-white rounded">❌</button>
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
