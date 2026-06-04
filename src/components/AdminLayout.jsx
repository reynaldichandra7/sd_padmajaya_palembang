import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logoPadmajaya from "../assets/logo_sdpadmajaya.png";

export default function AdminLayout() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeRole, setActiveRole] = useState(
    localStorage.getItem("activeRole") || "admin",
  );

  const handleSwitchRole = (newRole) => {
    setActiveRole(newRole);
    localStorage.setItem("activeRole", newRole);

    if (newRole === "admin") {
      navigate("/admin");
    } else if (newRole === "homeroom") {
      navigate("/wali-kelas");
    } else if (newRole === "teacher") {
      navigate("/guru");
    } else if (newRole === "headmaster") {
      navigate("/kepsek");
    }
  };

  const [userProfile, setUserProfile] = useState({
    full_name: "Loading...",
    role: "ADMIN",
  });

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("sd_padmajaya_theme") === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleDarkMode = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("sd_padmajaya_theme", newTheme ? "dark" : "light");
  };

  useEffect(() => {
    const fetchLoggedUser = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("full_name, roles")
            .eq("id", user.id)
            .single();

          if (error) throw error;
          if (data) {
            setUserProfile(data);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data profil login:", err.message);
        setUserProfile({ full_name: "Admin Sistem", roles: "ADMIN" });
      }
    };

    fetchLoggedUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      alert("Gagal logout: " + error.message);
    }
  };

  const getHeaderTitle = () => {
    if (location.pathname === "/admin/master") return "Manajemen Data Master";
    if (location.pathname === "/admin/persetujuan")
      return "Persetujuan Absensi";
    if (location.pathname === "/admin/profile-akun") return "Profil Saya";
    if (location.pathname === "/admin/pengaturan-akun")
      return "Pengaturan Akun";
    return "Panel Kontrol Admin";
  };

  // 1. State untuk menampung teks tahun ajaran
  const [activeYear, setActiveYear] = useState("Memuat TA...");

  // 2. Fungsi penarik data otomatis saat komponen dimuat
  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("year_name")
          .eq("is_active", true)
          .single(); // Ambil 1 data yang statusnya aktif

        if (error) throw error;

        if (data) {
          // Kamu bisa tambahkan "TA: " di depannya agar rapi
          setActiveYear(`TA: ${data.year_name}`);
        }
      } catch (err) {
        console.error("Gagal menarik tahun ajaran:", err.message);
        setActiveYear("TA: Belum diatur");
      }
    };

    fetchActiveYear();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0F172A] font-sans transition-colors duration-300 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 h-20 flex flex-row items-center gap-3 justify-start">
          <img
            src={logoPadmajaya}
            alt="Logo SD Padmajaya"
            className="w-10 h-25 object-contain flex-shrink-0"
          />
          <div className="flex flex-col justify-center mt-0.5">
            <h2 className="text-xl font-black text-slate-800 dark:text-white leading-tight tracking-wide">
              SD Padmajaya
            </h2>
            <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              Super Admin Center
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
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
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
              />
            </svg>
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/master"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
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
                d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4"
              />
            </svg>
            Data Master
          </NavLink>

          <NavLink
            to="/admin/persetujuan"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Persetujuan Absen
          </NavLink>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b flex items-center justify-between px-6 lg:px-8 bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800/80 transition-colors duration-300 z-10">
          <div>
            <h1 className="text-slate-800 dark:text-white font-black text-xl tracking-wide">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl border border-blue-200 dark:border-blue-500/20">
              {activeYear}
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-3 rounded-xl bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            <div className="relative">
              {/* TOMBOL PROFIL UTAMA */}
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 text-sm uppercase">
                  {userProfile.full_name
                    ? userProfile.full_name.charAt(0)
                    : "A"}
                </div>

                <div className="text-left hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-0.5 max-w-[140px] truncate">
                    {userProfile.full_name}
                  </div>
                  <div className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest leading-none mt-0.5">
                    {/* Menampilkan role yang SEDANG AKTIF saat ini */}
                    {activeRole === "admin"
                      ? "Admin Master"
                      : activeRole === "homeroom"
                        ? "Wali Kelas"
                        : activeRole === "headmaster"
                          ? "Kepala Sekolah"
                          : "Guru Mapel"}
                  </div>
                </div>

                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* ISI DROPDOWN MENU */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 transform origin-top-right transition-all">
                    {/* Header Dropdown */}
                    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold uppercase">
                          {userProfile.full_name
                            ? userProfile.full_name.charAt(0)
                            : "A"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white max-w-[140px] truncate">
                            {userProfile.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            Sistem SD Padmajaya
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Pengaturan Standar */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/admin/profile-akun");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 font-medium transition-colors"
                    >
                      Profile Saya
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/admin/pengaturan-akun");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 font-medium transition-colors"
                    >
                      Pengaturan Akun
                    </button>

                    {/* --- SEKSI GANTI PERAN (Hanya muncul jika punya lebih dari 1 role) --- */}
                    {userProfile.roles &&
                      Array.isArray(userProfile.roles) &&
                      userProfile.roles.length > 1 && (
                        <>
                          <div className="px-4 py-2 mt-2 bg-slate-50 dark:bg-[#0F172A]/30">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              Ganti Mode:
                            </span>
                          </div>
                          {[...new Set(userProfile.roles)].map(
                            (roleItem, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setShowProfileMenu(false);
                                  handleSwitchRole(roleItem);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                                  activeRole === roleItem
                                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-l-2 border-blue-600"
                                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 border-l-2 border-transparent"
                                }`}
                              >
                                <span>
                                  {roleItem === "admin"
                                    ? "Sistem Admin"
                                    : roleItem === "homeroom"
                                      ? "Wali Kelas"
                                      : roleItem === "headmaster"
                                        ? "Akses Kepsek"
                                        : "Akses Guru"}
                                </span>
                                {activeRole === roleItem && (
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </button>
                            ),
                          )}
                        </>
                      )}

                    <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-2"></div>

                    {/* Tombol Logout */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-bold transition-colors"
                    >
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
