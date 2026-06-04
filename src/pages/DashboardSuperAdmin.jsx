import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseUrl, supabaseKey } from "../supabaseClient";
import { createClient } from "@supabase/supabase-js";

export default function DashboardSuperAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState(() => {
    if (location.pathname.includes("pengaturan-akun")) return "account";
    if (location.pathname.includes("pengaturan")) return "settings";
    if (location.pathname.includes("pengguna")) return "management";
    if (location.pathname.includes("log-aktivitas")) return "logs";
    if (location.pathname.includes("profile-akun")) return "profiles";
    return "dashboard";
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("pengaturan-akun")) setView("account");
    else if (path.includes("pengaturan")) setView("settings");
    else if (path.includes("pengguna")) setView("management");
    else if (path.includes("log-aktivitas")) setView("logs");
    else if (path.includes("profile-akun")) setView("profile");
    else setView("dashboard");
  }, [location.pathname]);

  const [adminProfile, setAdminProfile] = useState(null);
  useEffect(() => {
    const getAdminData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();
        setAdminProfile(data);
      }
    };
    getAdminData();
  }, []);

  const [toast, setToast] = useState({ show: false, message: "" });

  const showSuccessToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("sd_padmajaya_theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    username: "",
    role: "teacher",
    employee_number: "",
    is_active: true,
    password: "",
    role: [],
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [attendanceRules, setAttendanceRules] = useState({
    check_in_time: "07:00",
    late_tolerance_minutes: 15,
    check_out_time: "15:00",
  });

  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTable, setFilterTable] = useState("ALL");

  const [selectedRoles, setSelectedRoles] = useState([]);

  const handleRoleToggle = (roleValue) => {
    const currentRoles = Array.isArray(formData.role) ? formData.role : [];

    const newRoles = currentRoles.includes(roleValue)
      ? currentRoles.filter((r) => r !== roleValue)
      : [...currentRoles, roleValue];

    setFormData({ ...formData, role: newRoles });
  };

  const formatRoleLabel = (roleString) => {
    if (!roleString) return "-";

    const roleMap = {
      principal: "Kepala Sekolah",
      teacher: "Guru Pengajar",
      homeroom: "Wali Kelas",
      admin: "Admin Master",
      super_admin: "Super Admin",
    };

    return roleString
      .split(",")
      .map((r) => roleMap[r.trim()] || r)
      .join(" • ");
  };

  const handleSimpanData = async () => {
    if (selectedRoles.length === 0) {
      alert("Pilih minimal 1 role!");
      return;
    }
    const roleString = selectedRoles.join(", ");
  };

  useEffect(() => {
    if (view === "management") fetchUsers();
    if (view === "settings") {
      fetchAcademicYears();
      fetchAttendanceRules();
    }
    if (view === "logs") fetchLogs();
  }, [view]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const fetchAcademicYears = async () => {
    setLoadingSettings(true);
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("year_name", { ascending: false });
    if (!error) setAcademicYears(data || []);
    setLoadingSettings(false);
  };

  const fetchAttendanceRules = async () => {
    setLoadingSettings(true);
    const { data, error } = await supabase
      .from("attendance_settings")
      .select("*")
      .single();
    if (!error && data) setAttendanceRules(data);
    setLoadingSettings(false);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase
      .from("activity_logs")
      .select(`*, profiles:user_id (full_name, roles)`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setActivityLogs(data || []);
    setLoadingLogs(false);
  };

  const logActivity = async (
    activityDesc,
    targetTable = null,
    targetId = null,
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("activity_logs").insert([
        {
          user_id: session.user.id,
          activity: activityDesc,
          target_table: targetTable,
          target_id: targetId,
          user_agent: navigator.userAgent,
          ip_address: "127.0.0.1",
        },
      ]);
    } catch (err) {
      console.error("LOG FAIL:", err);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentRoles = Array.isArray(formData.role)
        ? formData.role
        : [formData.role];
      const finalRoles = [
        ...new Set(currentRoles.flat(Infinity).filter(Boolean)),
      ];

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          email: formData.email,
          roles: finalRoles,
        })
        .eq("id", formData.id);

      if (error) throw error;

      await logActivity(
        `Memperbarui profil: ${formData.full_name}`,
        "profiles",
        formData.id,
      );
      showSuccessToast("Profil berhasil diperbarui!");
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      showSuccessToast("Gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentRoles = Array.isArray(formData.role)
        ? formData.role
        : [formData.role];
      const finalRoles = [
        ...new Set(currentRoles.flat(Infinity).filter(Boolean)),
      ];

      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data: authData, error: authError } =
        await tempSupabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

      if (authError) throw authError;

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user.id,
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
          roles: finalRoles,
          employee_number: formData.employee_number || null,
          is_active: formData.is_active,
        },
      ]);

      if (profileError) throw profileError;

      showSuccessToast("User Berhasil Ditambahkan!");
      setShowModal(false);

      window.location.reload();
    } catch (err) {
      showSuccessToast("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    setDeleteConfirm({
      show: true,
      message: "Apakah Anda yakin ingin menghapus akun ini secara permanen?",
      onConfirm: async () => {
        setDeleteConfirm({ show: false, message: "", onConfirm: null });
        setLoading(true);
        try {
          const { error } = await supabase.rpc("delete_user_completely", {
            target_user_id: userId,
          });
          if (error) throw error;
          await logActivity(
            `Menghapus akun permanen (ID: ${userId})`,
            "profiles",
            userId,
          );
          showSuccessToast("Akun berhasil dihapus!");
          fetchUsers();
        } catch (err) {
          showSuccessToast("Gagal Hapus: " + err.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const getRoleLabel = (roles) => {
    const labels = {
      principal: "KEPALA SEKOLAH",
      super_admin: "SUPER ADMIN",
      admin: "ADMIN",
      homeroom: "WALI KELAS",
      teacher: "GURU PENGAJAR",
    };

    if (!roles || roles.length === 0) return "TIDAK ADA JABATAN";

    const uniqueRoles = [...new Set(roles)];

    return uniqueRoles.map((r) => labels[r] || r).join(" & ");
  };

  const handleAddAcademicYear = async (e) => {
    e.preventDefault();
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("academic_years")
        .insert([{ year_name: newYearName, is_active: false }])
        .select()
        .single();
      if (error) throw error;
      await logActivity(
        `Menambah tahun ajaran baru: ${newYearName}`,
        "academic_years",
        data.id,
      );
      showSuccessToast("Tahun ajaran baru berhasil ditambahkan!");
      setNewYearName("");
      setShowAddYearModal(false);
      fetchAcademicYears();
    } catch (err) {
      showSuccessToast("Gagal: " + err.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSetYearActive = async (idToActivate) => {
    setLoadingSettings(true);
    try {
      await supabase
        .from("academic_years")
        .update({ is_active: false })
        .eq("is_active", true);
      await supabase
        .from("academic_years")
        .update({ is_active: true })
        .eq("id", idToActivate);
      await logActivity(
        `Mengubah Tahun Ajaran aktif (ID: ${idToActivate})`,
        "academic_years",
        idToActivate,
      );
      showSuccessToast("Tahun ajaran aktif berhasil diperbarui!");
      fetchAcademicYears();
    } catch (err) {
      showSuccessToast("Gagal: " + err.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDeleteYear = (id, isActive) => {
    if (isActive)
      return showSuccessToast(
        "Tidak bisa menghapus! Tahun ajaran ini sedang aktif.",
      );
    setDeleteConfirm({
      show: true,
      message:
        "Apakah Anda yakin ingin menghapus tahun ajaran ini secara permanen?",
      onConfirm: async () => {
        setDeleteConfirm({ show: false, message: "", onConfirm: null });
        setLoadingSettings(true);
        try {
          await supabase.from("academic_years").delete().eq("id", id);
          showSuccessToast("Tahun ajaran berhasil dihapus!");
          fetchAcademicYears();
        } catch (err) {
          showSuccessToast("Gagal: " + err.message);
        } finally {
          setLoadingSettings(false);
        }
      },
    });
  };

  const handleUpdateRules = async (e) => {
    e.preventDefault();
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from("attendance_settings")
        .update(attendanceRules)
        .eq("id", 1);
      if (error) throw error;
      await logActivity(
        "Memperbarui aturan jam absensi harian",
        "attendance_settings",
        1,
      );
      showSuccessToast("Aturan absensi berhasil diperbarui!");
    } catch (err) {
      showSuccessToast("Gagal: " + err.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    message: "",
    onConfirm: null,
  });

  const uniqueTables = [
    "ALL",
    ...new Set(activityLogs.map((log) => log.target_table).filter(Boolean)),
  ];

  const filteredLogs = activityLogs.filter((log) => {
    const namaPelaku = log.profiles?.full_name || "Sistem / Unknown";
    const matchSearch =
      namaPelaku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.activity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTable =
      filterTable === "ALL" || log.target_table === filterTable;
    return matchSearch && matchTable;
  });

  return (
    <div className="w-full">
      {view === "dashboard" && (
        <div className="w-full animate-in fade-in duration-500">
          <div className="mb-8 p-8 rounded-[32px] bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden flex flex-col justify-center text-left">
            <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-black/10 rounded-full blur-xl"></div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
              Selamat Datang di Pusat Kendali Tertinggi, Super Admin! 👑🚀
            </h2>
            <p className="mt-2 text-sm md:text-base text-indigo-100 font-medium max-w-4xl leading-relaxed">
              Pegang kendali penuh atas seluruh infrastruktur digital SD
              Padmajaya hari ini. Mulai dari manajemen hak akses penuh akun
              admin master harian, inspeksi jejak rekam audit log keamanan,
              hingga otorisasi konfigurasi aturan jam absensi global dari satu
              panel eksekutif.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              onClick={() => navigate("/super-admin/pengguna")}
              className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-slate-900 dark:bg-[#0F172A] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
                Manajemen Pengguna
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Kelola hak akses, tambah peran, dan audit staf sekolah.
              </p>
            </div>
            <div
              onClick={() => navigate("/super-admin/pengaturan")}
              className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-slate-900 dark:bg-[#0F172A] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
                Pengaturan Sistem
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Konfigurasi data master akademik SD Padmajaya.
              </p>
            </div>
            <div
              onClick={() => navigate("/super-admin/log-aktivitas")}
              className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-slate-700 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 bg-slate-900 dark:bg-[#0F172A] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-all">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">
                Log Aktivitas
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Pantau jejak rekam dan riwayat perubahan data.
              </p>
            </div>
          </div>
        </div>
      )}

      {view === "management" && (
        <div className="w-full animate-in slide-in-from-bottom-4 duration-500 space-y-4">
          <button
            onClick={() => navigate("/super-admin")}
            className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-2 hover:underline mb-2"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-8 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  Manajemen Pengguna
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Kelola hak akses dan peran seluruh staf sekolah.
                </p>
              </div>
              <button
                onClick={() => {
                  setFormData({
                    id: "",
                    full_name: "",
                    email: "",
                    username: "",
                    role: "teacher",
                    password: "",
                  });
                  setIsEdit(false);
                  setShowModal(true);
                }}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-600/10"
              >
                <span>+</span> Tambah Pengguna
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-500 font-bold animate-pulse">
                Memuat data pengguna...
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-6 text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                        Nama Lengkap
                      </th>
                      <th className="p-6 text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                        Identitas Akun
                      </th>
                      <th className="p-6 text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                        Jabatan
                      </th>
                      <th className="p-6 text-[11px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 text-center">
                        Aksi Manajemen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-6">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {user.full_name}
                          </p>
                        </td>

                        <td className="p-6">
                          <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                            @{user.username}
                          </p>
                          <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500">
                            {user.email}
                          </p>
                        </td>

                        <td className="p-6">
                          <p className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            {getRoleLabel(user.roles)}
                          </p>
                        </td>

                        <td className="p-6">
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => {
                                let roleArray = [];
                                if (Array.isArray(user.roles)) {
                                  roleArray = user.roles;
                                } else if (typeof user.roles === "string") {
                                  roleArray = user.roles
                                    .split(",")
                                    .map((r) => r.trim());
                                } else {
                                  roleArray = ["teacher"];
                                }

                                setFormData({
                                  id: user.id,
                                  full_name: user.full_name,
                                  username: user.username,
                                  email: user.email,
                                  role: roleArray,
                                });

                                setIsEdit(true);
                                setShowModal(true);
                              }}
                              className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                            >
                              Edit Profil & Role
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-rose-500 text-[10px] font-bold hover:text-rose-700 transition uppercase tracking-wider"
                            >
                              Hapus Akun
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "settings" && (
        <div className="w-full animate-in slide-in-from-bottom-4 duration-500 space-y-4 max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/super-admin")}
            className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-2 hover:underline mb-2"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                Pengaturan Sistem
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Konfigurasi data master akademik SD Padmajaya.
              </p>
            </div>

            <div className="rounded-3xl p-8 mb-8 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0F172A]/50 transition-colors">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    Tahun Ajaran Akademik
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Pilih tahun ajaran mana yang sedang berjalan saat ini.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddYearModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                >
                  + Tahun Ajaran Baru
                </button>
              </div>

              {loadingSettings ? (
                <div className="text-center p-8 text-slate-400 text-sm font-bold animate-pulse">
                  Memuat pengaturan...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {academicYears.map((year) => (
                    <div
                      key={year.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all gap-4 ${year.is_active ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${year.is_active ? "bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "bg-slate-300 dark:bg-slate-600"}`}
                        ></div>
                        <span
                          className={`font-bold text-lg ${isDark ? "text-slate-200" : "text-slate-700"}`}
                        >
                          {year.year_name}
                        </span>
                        {year.is_active && (
                          <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Aktif
                          </span>
                        )}
                      </div>
                      {!year.is_active && (
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() =>
                              handleDeleteYear(year.id, year.is_active)
                            }
                            className="text-xs font-bold text-rose-500 hover:text-white px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-lg hover:bg-rose-500 bg-white dark:bg-slate-900 transition-colors"
                          >
                            Hapus
                          </button>
                          <button
                            onClick={() => handleSetYearActive(year.id)}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-lg bg-white dark:bg-slate-900 transition-colors"
                          >
                            Jadikan Aktif
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl p-8 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0F172A]/50 transition-colors">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
                Aturan Jam Absensi
              </h2>
              <form
                onSubmit={handleUpdateRules}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={attendanceRules.check_in_time.slice(0, 5)}
                    onChange={(e) =>
                      setAttendanceRules({
                        ...attendanceRules,
                        check_in_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Toleransi (Menit)
                  </label>
                  <input
                    type="number"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={attendanceRules.late_tolerance_minutes}
                    onChange={(e) =>
                      setAttendanceRules({
                        ...attendanceRules,
                        late_tolerance_minutes: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={attendanceRules.check_out_time.slice(0, 5)}
                    onChange={(e) =>
                      setAttendanceRules({
                        ...attendanceRules,
                        check_out_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-3 flex justify-end mt-2">
                  <button
                    type="submit"
                    className="bg-slate-800 dark:bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md"
                  >
                    Simpan Aturan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {view === "logs" && (
        <div className="w-full animate-in slide-in-from-bottom-4 duration-500 space-y-4">
          <button
            onClick={() => navigate("/super-admin")}
            className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-2 hover:underline mb-2"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-8 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  Riwayat Log Aktivitas
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Jejak rekam audit seluruh perubahan data di SD Padmajaya.
                </p>
              </div>

              {/* FITUR SEARCH & FILTER */}
              <div className="flex w-full md:w-auto items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari nama atau aktivitas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 p-3.5 rounded-xl border text-sm font-bold bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:bg-[#0F172A] dark:border-slate-700 dark:text-white dark:focus:ring-indigo-500"
                />
                <select
                  value={filterTable}
                  onChange={(e) => setFilterTable(e.target.value)}
                  className="p-3.5 rounded-xl border text-[11px] uppercase tracking-wider font-black bg-slate-50 border-slate-200 text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all dark:bg-[#0F172A] dark:border-slate-700 dark:text-slate-300 dark:focus:ring-indigo-500"
                >
                  {uniqueTables.map((table) => (
                    <option key={table} value={table}>
                      {table === "ALL" ? "SEMUA TABEL" : table}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingLogs ? (
              <div className="text-center py-16 font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                Memuat riwayat sistem...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 font-bold text-slate-400">
                Tidak ada aktivitas yang cocok dengan pencarianmu.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                        Waktu
                      </th>
                      <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                        Pelaku (User)
                      </th>
                      <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                        Aktivitas
                      </th>
                      <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 text-right">
                        Target Tabel
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* SEKARANG KITA LOOPING filteredLogs, BUKAN activityLogs */}
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-6">
                          <p className="font-bold text-xs text-slate-700 dark:text-slate-200">
                            {new Date(log.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400">
                            {new Date(log.created_at).toLocaleTimeString(
                              "id-ID",
                            )}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                            {log.profiles?.full_name || "Sistem / Unknown"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">
                            {log.ip_address}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">
                            {log.activity}
                          </p>
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            {log.target_table || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "profile" && (
        <div className="w-full animate-in fade-in duration-300 max-w-4xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/super-admin")}
            className="mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-2 hover:underline"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-dashed border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-500/20">
                  {adminProfile?.full_name?.charAt(0) || "A"}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-[#1E293B] rounded-full"
                  title="Sistem Aktif"
                ></div>
              </div>
              <div className="text-center sm:text-left space-y-3">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  {adminProfile?.full_name || "Admin"}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                    Super Admin
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    Otoritas Penuh
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-10">
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2 font-mono">
                  Username
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  @{adminProfile?.username || "admin_padmajaya"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2 font-mono">
                  Alamat Email
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {adminProfile?.email || "admin@padmajaya.sch.id"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2 font-mono">
                  NIP / No. Staf
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {adminProfile?.employee_number || "— (Pusat Terpusat)"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2 font-mono">
                  Koneksi Basis Data
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Aktif & Terverifikasi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "account" && (
        <div className="w-full animate-in fade-in duration-300 max-w-5xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/super-admin")}
            className="mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-2 hover:underline"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors duration-300">
              <div className="space-y-5">
                <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m0 0v2m0-2h2m-2 0H10m3.432-3.032a1.75 1.75 0 00-2.864 0L3.34 16a1.75 1.75 0 001.433 2.75h14.454a1.75 1.75 0 001.433-2.75l-7.23-11.032z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">
                    Proteksi Kredensial
                  </h3>
                  <p className="text-sm mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
                    Gunakan kombinasi huruf besar, angka, dan simbol khusus
                    untuk menjaga keamanan penuh otoritas Super Admin Anda.
                  </p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/60 text-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Level Akses:
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Sesi Autentikasi:
                  </span>
                  <div className="flex items-center gap-2 font-bold text-emerald-500 dark:text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Terenkripsi
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  Pengaturan Akun
                </h2>
                <p className="text-base mt-2 text-slate-500 dark:text-slate-400">
                  Perbarui kata sandi untuk mengamankan hak akses data master SD
                  Padmajaya.
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const newPassword = e.target.elements.newPassword.value;
                  const confirmPassword =
                    e.target.elements.confirmPassword.value;
                  if (!newPassword)
                    return showSuccessToast("Password tidak boleh kosong!");
                  if (newPassword.length < 6)
                    return showSuccessToast("Password minimal 6 karakter!");
                  if (newPassword !== confirmPassword)
                    return showSuccessToast("Konfirmasi password tidak cocok!");

                  const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                  });
                  if (error)
                    showSuccessToast(
                      "Gagal memperbarui password: " + error.message,
                    );
                  else {
                    showSuccessToast(
                      "Sip! Kata sandi akun Anda berhasil diperbarui.",
                    );
                    e.target.reset();
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2 font-mono">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Minimal 6 karakter"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        {showNewPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-500 mb-2 font-mono">
                      Konfirmasi Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Ulangi password baru"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all w-full sm:w-auto"
                  >
                    Simpan Password Baru
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="p-8 rounded-[32px] w-full max-w-md shadow-2xl border transition-colors bg-white border-transparent dark:bg-[#0F172A] dark:border-slate-800">
            <h2 className="text-2xl font-black mb-6 tracking-tight text-slate-800 dark:text-white">
              {isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </h2>
            <form
              onSubmit={isEdit ? handleUpdateUser : handleAddUser}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  placeholder="Misal: Budi Santoso, S.Pd"
                  className="w-full p-4 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-slate-50 border-slate-200 text-slate-900 focus:bg-white dark:bg-[#020617] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Username
                </label>
                <input
                  required
                  placeholder="Misal: guru_budi"
                  className="w-full p-4 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-slate-50 border-slate-200 text-slate-900 focus:bg-white dark:bg-[#020617] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  placeholder="budi@padmajaya.sch.id"
                  className="w-full p-4 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-slate-50 border-slate-200 text-slate-900 focus:bg-white dark:bg-[#020617] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800 disabled:opacity-50"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isEdit}
                />
              </div>
              {!isEdit && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      className="w-full p-4 pr-12 rounded-2xl border font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-slate-50 border-slate-200 text-slate-900 focus:bg-white dark:bg-[#020617] dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:bg-slate-800"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Role / Jabatan (Bisa pilih lebih dari satu)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${formData.role.includes("principal") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role.includes("principal")}
                      onChange={() => handleRoleToggle("principal")}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Kepala Sekolah
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${formData.role.includes("teacher") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role.includes("teacher")}
                      onChange={() => handleRoleToggle("teacher")}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Guru Pengajar
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${formData.role.includes("homeroom") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role.includes("homeroom")}
                      onChange={() => handleRoleToggle("homeroom")}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Wali Kelas
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${formData.role.includes("admin") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role.includes("admin")}
                      onChange={() => handleRoleToggle("admin")}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Admin Master
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${formData.role.includes("super_admin") ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-50 border-slate-200 dark:bg-[#020617] dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500"}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.role.includes("super_admin")}
                      onChange={() => handleRoleToggle("super_admin")}
                      className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-800 dark:border-slate-600"
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Super Admin
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/3 py-4 rounded-2xl font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm p-8 rounded-[32px] shadow-2xl border transition-colors bg-white border-transparent dark:bg-[#0F172A] dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
              Tahun Ajaran Baru
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">
              Masukkan format tahun ajaran, misal: 2026/2027
            </p>
            <form onSubmit={handleAddAcademicYear} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 font-mono">
                  Nama Tahun Ajaran
                </label>
                <input
                  required
                  className="w-full p-4 rounded-2xl border font-black text-center text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-slate-50 border-slate-200 text-slate-800 focus:bg-white dark:bg-[#020617] dark:border-slate-700 dark:text-white dark:placeholder-slate-600 dark:focus:bg-slate-800"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="2026/2027"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className={`fixed top-8 right-8 z-[100] transition-all duration-500 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-[150%] opacity-0"}`}
      >
        <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-4">
          <div className="bg-white/20 p-1.5 rounded-full">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="font-bold tracking-wide text-sm">{toast.message}</p>
        </div>
      </div>

      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="w-full max-w-sm p-8 rounded-[32px] border shadow-2xl transition-colors animate-in zoom-in-95 duration-200 bg-white border-transparent dark:bg-[#0F172A] dark:border-slate-800">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-500">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-black text-center mb-3 text-slate-800 dark:text-white tracking-tight">
              Konfirmasi Hapus
            </h2>
            <p className="text-sm text-center mb-8 font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {deleteConfirm.message}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setDeleteConfirm({
                    show: false,
                    message: "",
                    onConfirm: null,
                  })
                }
                className="flex-1 py-3.5 rounded-xl font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={deleteConfirm.onConfirm}
                className="flex-1 py-3.5 rounded-xl font-black bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/30"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
