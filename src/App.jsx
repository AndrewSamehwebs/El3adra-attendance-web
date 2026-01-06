import React, { useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useParams,
} from "react-router-dom";

// UI
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

// Pages
import AttendancePage from "./pages/Attendance";
import MassPage from "./pages/MassPage";
import ChildrenPage from "./pages/ChildrenPage";
import TusbhaAttendance from "./pages/TusbhaAttendance";

/* =========================
   يوزر + باسورد لكل صف
========================= */
const STAGE_CREDENTIALS = {
  angels: { username: "ملايكاوي", password: "12345" },
  grade1: { username: "grade1", password: "2222" },
  grade2: { username: "grade2", password: "3333" },
  grade3: { username: "grade3", password: "4444" },
  grade4: { username: "grade4", password: "5555" },
  grade5: { username: "grade5", password: "6666" },
  grade6: { username: "grade6", password: "7777" },
};

/* =========================
   أسماء الصفوف بالعربي
========================= */
const STAGE_LABELS = {
  angels: "ملايكة",
  grade1: "سنة أولى",
  grade2: "سنة تانية",
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة",
};

/* =========================
   Route Protection
========================= */
function ProtectedStage({ children }) {
  const { stage } = useParams();
  const allowed = localStorage.getItem(`auth_${stage}`) === "true";
  return allowed ? children : <Navigate to={`/login/${stage}`} />;
}

/* =========================
   Login لكل صف (بالعربي)
========================= */
function StageLogin() {
  const { stage } = useParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

const handleLogin = () => {
  const creds = STAGE_CREDENTIALS[stage];
  if (!creds) {
    setError("❌ خطأ في الصفحة");
    return;
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (
    cleanUsername === creds.username &&
    cleanPassword === creds.password
  ) {
    localStorage.setItem(`auth_${stage}`, "true");
    window.location.href = `#/${stage}/dashboard`;
  } else {
    setError("❌ اسم المستخدم أو كلمة المرور غير صحيحة");
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md p-6 rounded-2xl shadow-xl">
        <CardContent>
          <h1 className="text-2xl font-bold text-center mb-1 text-red-900">
            تسجيل الدخول
          </h1>

          <p className="text-center text-gray-600 mb-4">
            {STAGE_LABELS[stage]}
          </p>

          {error && <p className="text-center text-red-600 mb-2">{error}</p>}

          <input
            type="text"
            placeholder="اسم المستخدم"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 border rounded-xl mb-4"
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-xl mb-4"
          />

          <Button className="w-full" onClick={handleLogin}>
            دخول
          </Button>

          <Link to="/" className="block text-center mt-4 text-blue-600">
          ⬅ رجوع
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================
   Dashboard خاص بكل صف
========================= */
function StageDashboard() {
  const { stage } = useParams();
  const showTusbha = ["grade3", "grade4", "grade5", "grade6"].includes(stage);

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-4xl font-bold mb-1 text-center text-red-900">
        لوحة التحكم
      </h1>

      <p className="text-center text-gray-600 mb-6 text-lg">
        {STAGE_LABELS[stage]}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 rounded-2xl shadow-xl">
          <CardContent>
            <Link to={`/${stage}/children`} className="block text-xl text-center">
              👼 بيانات الاطفال
            </Link>
          </CardContent>
        </Card>

        <Card className="p-4 rounded-2xl shadow-xl">
          <CardContent>
            <Link to={`/${stage}/attendance`} className="block text-xl text-center">
              📘 مدارس الاحد
            </Link>
          </CardContent>
        </Card>

        <Card className="p-4 rounded-2xl shadow-xl">
          <CardContent>
            <Link to={`/${stage}/mass`} className="block text-xl text-center">
              ⛪ القداس
            </Link>
          </CardContent>
        </Card>

        {showTusbha && (
          <Card className="p-4 rounded-2xl shadow-xl">
            <CardContent>
              <Link to={`/${stage}/tusbha`} className="block text-xl text-center">
                🎼 التسبحة
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* =========================
   Dashboard الرئيسي
========================= */
function MainDashboard() {
  const stages = [
    { key: "angels", label: "👼 ملايكة" },
    { key: "grade1", label: "📘 سنة أولى" },
    { key: "grade2", label: "📗 سنة تانية" },
    { key: "grade3", label: "📙 سنة تالتة" },
    { key: "grade4", label: "📕 سنة رابعة" },
    { key: "grade5", label: "📒 سنة خامسة" },
    { key: "grade6", label: "📓 سنة سادسة" },
  ];

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-center text-red-900">
        الأقسام
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stages.map((s) => (
          <Card key={s.key} className="p-4 rounded-2xl shadow-xl">
            <CardContent>
              <Link to={`/login/${s.key}`} className="block text-xl text-center">
                {s.label}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* =========================
   App
========================= */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainDashboard />} />
        <Route path="/login/:stage" element={<StageLogin />} />

        <Route
          path="/:stage/dashboard"
          element={
            <ProtectedStage>
              <StageDashboard />
            </ProtectedStage>
          }
        />

        <Route
          path="/:stage/children"
          element={
            <ProtectedStage>
              <ChildrenPage />
            </ProtectedStage>
          }
        />

        <Route
          path="/:stage/attendance"
          element={
            <ProtectedStage>
              <AttendancePage />
            </ProtectedStage>
          }
        />

        <Route
          path="/:stage/mass"
          element={
            <ProtectedStage>
              <MassPage />
            </ProtectedStage>
          }
        />

        <Route
          path="/:stage/tusbha"
          element={
            <ProtectedStage>
              <TusbhaAttendance />
            </ProtectedStage>
          }
        />
      </Routes>
    </Router>
  );
}
