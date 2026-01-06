import React from "react";
import { Link, useParams } from "react-router-dom";

export default function Dashboard() {
  const { stage } = useParams(); // هنستخدم stage لتحديد الصف

  // تحديد الصفوف اللي مسموح لها بحضور التسبحة
  const allowRosary = ["grade3", "grade4", "grade5", "grade6"];

  return (
    <div className="min-h-screen p-6 bg-[url('/church-bg.jpg')] bg-cover bg-center bg-fixed">
      <div className="backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-red-900">لوحة التحكم</h1>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={`/${stage}/children`}
            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
          >
            👼 الأطفال
          </Link>

          <Link
            to={`/${stage}/attendance`}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
          >
            📘 الحضور
          </Link>

          <Link
            to={`/${stage}/mass`}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition"
          >
            ⛪ القداس
          </Link>

          {allowRosary.includes(stage) && (
            <Link
              to={`/${stage}/rosary`}
              className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition"
            >
              🙏 حضور التسبحة
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
