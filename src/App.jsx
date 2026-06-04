import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import DashboardHomeroom from "./pages/DashboardHomeroom";
import HomeroomLayout from "./components/HomeroomLayout";
import DashboardTeacher from "./pages/DashboardTeacher";
import TeacherLayout from "./components/TeacherLayout";
import TeacherHistory from "./pages/TeacherHistory";
import DaftarKelas from "./pages/DaftarKelas";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import SuperAdminLayout from "./components/SuperAdminLayout";
import DashboardAdmin from "./pages/DashboardAdmin";
import AdminApproval from "./pages/AdminApproval";
import AdminMaster from "./pages/AdminMaster";
import AdminProfile from "./pages/AdminProfile";
import AdminSettings from "./pages/AdminSettings";
import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<DashboardSuperAdmin />} />
          <Route path="pengguna" element={<DashboardSuperAdmin />} />
          <Route path="pengaturan" element={<DashboardSuperAdmin />} />
          <Route path="log-aktivitas" element={<DashboardSuperAdmin />} />
          <Route path="profile-akun" element={<DashboardSuperAdmin />} />
          <Route path="pengaturan-akun" element={<DashboardSuperAdmin />} />
        </Route>{" "}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardAdmin />} />
          <Route path="master" element={<AdminMaster />} />
          <Route path="persetujuan" element={<AdminApproval />} />
          <Route path="profile-akun" element={<AdminProfile />} />
          <Route path="pengaturan-akun" element={<AdminSettings />} />
        </Route>
        <Route path="/guru" element={<TeacherLayout />}>
          <Route index element={<DashboardTeacher />} />
          <Route path="kelas" element={<DashboardTeacher />} />
          <Route path="riwayat" element={<DashboardTeacher />} />
          <Route path="profile-akun" element={<DashboardTeacher />} />
          <Route path="pengaturan-akun" element={<DashboardTeacher />} />
          <Route path="absensi/:namaKelas" element={<DashboardTeacher />} />
          <Route path="/guru/kelas" element={<DaftarKelas />} />
        </Route>
        <Route path="/wali-kelas" element={<HomeroomLayout />}>
          <Route index element={<DashboardHomeroom />} />
          <Route path="siswa" element={<DashboardHomeroom />} />
          <Route path="profile-akun" element={<DashboardHomeroom />} />
          <Route path="pengaturan-akun" element={<DashboardHomeroom />} />
          <Route path="input-absensi" element={<DashboardHomeroom />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
