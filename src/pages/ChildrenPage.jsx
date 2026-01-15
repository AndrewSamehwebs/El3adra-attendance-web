// src/pages/ChildrenPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from "firebase/firestore";
import { debounce } from "lodash";
import * as XLSX from "xlsx";
import { useParams } from "react-router-dom";

const stageNames = {
  angels: "ملايكة",
  grade1: "سنة أولى",
  grade2: "سنة ثانية",
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة"
};

export default function ChildrenPage() {
  const { stage } = useParams();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const rowsPerPage = 10;
  const childrenCollection = collection(db, "children");
  const cachedRows = useRef(null);

  // ================= FETCH =================
  useEffect(() => {
    const fetchData = async () => {
      if (cachedRows.current) {
        setRows(cachedRows.current);
        return;
      }
      const q = query(childrenCollection, where("page", "==", stage));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        name: d.data().name?.trim() || ""
      }));
      setRows(data);
      cachedRows.current = data;
    };
    fetchData();
  }, [stage]);

  // ================= UPDATE =================
  const debounceUpdate = useRef(
    debounce(async (id, field, value) => {
      if (field === "name" && value.trim() === "") return;
      await updateDoc(doc(db, "children", id), { [field]: value });
    }, 400)
  ).current;

  const handleChange = (id, field, value) => {
    setRows(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, [field]: value } : r);
      cachedRows.current = updated;
      return updated;
    });
    debounceUpdate(id, field, value);
  };

  // ================= ADD =================
const addRow = async () => {
  const newRow = { name: "", phone: "", phone1: "", phone2: "", notes: "", address: "", dateOfBirth: "", stage: "", birthCertificate: "", visited: {}, page: stage };

  // منع التكرار: لو الاسم فارغ أو موجود بالفعل، ما نضيفش
  const exists = rows.some(r => r.name.trim().toLowerCase() === newRow.name.trim().toLowerCase());
  if (exists) return alert("⚠️ الاسم موجود بالفعل");

  const docRef = await addDoc(childrenCollection, newRow);
  const updated = [...rows, { id: docRef.id, ...newRow }];
  setRows(updated);
  cachedRows.current = updated;
};


  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ هل أنت متأكد من الحذف؟")) return;
    await deleteDoc(doc(db, "children", id));
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    cachedRows.current = updated;
  };

  // ================= RESET VISITS =================
  const handleReset = async () => {
    if (!window.confirm("⚠️ إعادة ضبط الزيارات لهذا الشهر؟")) return;
    const updated = [];
    for (const r of rows) {
      const newVisited = { ...r.visited, [selectedMonth]: false };
      await updateDoc(doc(db, "children", r.id), { visited: newVisited });
      updated.push({ ...r, visited: newVisited });
    }
    setRows(updated);
    cachedRows.current = updated;
  };

  // ================= EXCEL UPLOAD =================
// ================= EXCEL UPLOAD (SMART HEADER MATCHING) =================
const normalize = (text = "") =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const headerMap = {
  name: ["اسم", "اسم الطفل", "الاسم", "name"],
  phone: ["رقم", "رقم الهاتف", "التليفون", "phone"],
  phone1: ["رقم2", "رقم 2", "هاتف2"],
  phone2: ["رقم3", "رقم 3", "هاتف3"],
  notes: ["ملاحظات", "notes", "note"],
  address: ["العنوان", "عنوان", "address"],
  dateOfBirth: ["تاريخ الميلاد", "الميلاد", "dob"],
  stage: ["المرحلة", "stage"],
  birthCertificate: ["شهادة الميلاد", "شهادة", "birth"]
};


const matchField = (excelHeader) => {
  const key = normalize(excelHeader);
  for (const field in headerMap) {
    if (headerMap[field].some(alias => normalize(alias) === key)) {
      return field;
    }
  }
  return null;
};

const readPhones = (value) => {
  if (!value) return [];
  return value
    .toString()
    .split(/[,\/\- ]+/)
    .map(v => v.trim())
    .filter(Boolean);
};

const handleUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Set محلي للأسماء الموجودة بالفعل
    const existingNames = new Set(rows.map(r => r.name.trim().toLowerCase()));

    const newRows = [];

    for (const row of json) {
      const cleanRow = {};
      Object.keys(row).forEach(k => {
        cleanRow[k.trim()] = row[k];
      });

      const parseDate = (value) => {
        if (!value) return "";
        if (typeof value === "number") return new Date((value - 25569) * 86400 * 1000).toLocaleDateString("en-GB");
        return value.toString();
      };

      const newRow = {
        name: cleanRow["الاسم"]?.toString().trim() || "",
        phone: cleanRow["رقم التلفون"]?.toString().trim() || "",
        phone1: cleanRow["رقم التلفون 1"]?.toString().trim() || "",
        phone2: cleanRow["رقم التلفون 2"]?.toString().trim() || "",
        notes: cleanRow["ملاحظات"]?.toString().trim() || "",
        address: cleanRow["العنوان"]?.toString().trim() || "",
        dateOfBirth: parseDate(cleanRow["تاريخ الميلاد"]),
        stage: cleanRow["المرحلة"] || "",
        birthCertificate: cleanRow["شهادة الميلاد"]?.toString().trim() || "",
        visited: {},
        page: stage
      };

      if (!newRow.name) continue;
      const lowerName = newRow.name.toLowerCase();
      if (existingNames.has(lowerName)) continue; // تجاهل الاسم المكرر
      existingNames.add(lowerName);

      newRows.push(newRow);
    }

    try {
      for (const child of newRows) {
        const docRef = await addDoc(childrenCollection, child);
        setRows(prev => [...prev, { id: docRef.id, ...child }]);
        cachedRows.current = [...cachedRows.current || [], { id: docRef.id, ...child }];
      }
      alert(`تم إضافة ${newRows.length} صفوف جديدة بنجاح ✅`);
    } catch (error) {
      console.error("خطأ في رفع Excel:", error);
      alert("❌ حدث خطأ أثناء رفع الإكسل");
    }
  };

  reader.readAsArrayBuffer(file);
};
 // نهاية handleUpload





  // ================= FILTER =================
  const filteredRows = useMemo(() => {
    return rows
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [rows, search]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  return (
    <div className="min-h-screen p-6">
      <div className="bg-white/90 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center text-red-900 mb-4">
          إدارة بيانات الأطفال – {stageNames[stage]}
        </h1>

        {/* ===== أزرار التحكم ===== */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" placeholder="🔍 ابحث عن اسم الطفل..." value={search} onChange={e => setSearch(e.target.value)} className="p-2 border rounded-xl flex-1 min-w-[180px]" />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border rounded-xl" />
          <button onClick={addRow} className="px-4 py-2 bg-green-500 text-white rounded-xl">➕ إضافة صف</button>
          <label className="px-4 py-2 bg-blue-500 text-white rounded-xl cursor-pointer">⬆️ Upload Excel
            <input type="file" hidden onChange={handleUpload} />
          </label>
          <button onClick={handleReset} className="px-4 py-2 bg-yellow-500 text-white rounded-xl">🔄 إعادة ضبط الزيارات</button>
          <button disabled className="px-4 py-2 bg-purple-500 text-white rounded-xl">🔒 اختيار الأطفال للنقل</button>
        </div>

        {/* ===== الجدول ===== */}
        <table className="w-full border rounded-xl text-center">
          <thead className="bg-red-800 text-white">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">اسم الطفل</th>
              <th className="p-3">تمت الزيارة ✅</th>
              <th className="p-3">معلومات الطفل</th>
              <th className="p-3">حذف الطفل ❌</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, index) => (
              <React.Fragment key={row.id}>
                <tr className="even:bg-gray-100">
                  <td className="p-3">{indexOfFirstRow + index + 1}</td>
                  <td className="p-3 font-semibold">{row.name}</td>
                  <td className="p-3">
                    <input type="checkbox" checked={row.visited?.[selectedMonth] || false} onChange={e => handleChange(row.id, "visited", { ...row.visited, [selectedMonth]: e.target.checked })} className="w-6 h-6" />
                  </td>
                  <td className="p-3">
                    <button onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)} className="px-4 py-1 bg-red-800 text-white rounded">معلومات الطفل</button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(row.id)} className="px-3 py-1 bg-red-500 text-white rounded">❌ حذف</button>
                  </td>
                </tr>

                {expandedRow === row.id && (
                  <tr className="bg-gray-50">
                    <td colSpan="5" className="p-4 grid md:grid-cols-2 gap-3">
                      <input value={row.name} onChange={e => handleChange(row.id,"name",e.target.value)} placeholder="اسم الطفل" className="p-2 border rounded font-semibold" />
                      <input
                       value={row.phone1 || ""}
                       onChange={e => handleChange(row.id, "phone1", e.target.value)}
                       placeholder="رقم هاتف إضافي 1"
                       className="p-2 border rounded"
                      />

                      <input
                        value={row.phone2 || ""}
                        onChange={e => handleChange(row.id, "phone2", e.target.value)}
                        placeholder="رقم هاتف إضافي 2"
                        className="p-2 border rounded"
                       />

                       <input
                         value={row.notes || ""}
                         onChange={e => handleChange(row.id, "notes", e.target.value)}
                         placeholder="ملاحظات"
                         className="p-2 border rounded"
                        />


                      <input value={row.phone || ""} onChange={e => handleChange(row.id,"phone",e.target.value)} placeholder="رقم الهاتف" className="p-2 border rounded" />
                      <input value={row.address || ""} onChange={e => handleChange(row.id,"address",e.target.value)} placeholder="العنوان" className="p-2 border rounded" />
                      <input value={row.dateOfBirth || ""} onChange={e => handleChange(row.id,"dateOfBirth",e.target.value)} placeholder="تاريخ الميلاد" className="p-2 border rounded" />
                      <input value={row.stage || ""} onChange={e => handleChange(row.id,"stage",e.target.value)} placeholder="المرحلة" className="p-2 border rounded" />
                      <input value={row.birthCertificate || ""} onChange={e => handleChange(row.id,"birthCertificate",e.target.value)} placeholder="شهادة الميلاد" className="p-2 border rounded" />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1 rounded border ${currentPage === p ? "bg-red-800 text-white" : ""}`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
