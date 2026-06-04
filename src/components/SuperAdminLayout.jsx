import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logoPadmajaya from "../assets/logo_sdpadmajaya.png";

export default function SuperAdminLayout() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // State baru untuk mengontrol sidebar di HP
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = useState({
    full_name: "Loading...",
    role: "SUPER_ADMIN",
  });

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
            let primaryRole = "SUPER_ADMIN";

            if (data.roles.includes("super_admin")) {
              primaryRole = "SUPER ADMIN";
            } else if (data.roles.includes("admin")) {
              primaryRole = "ADMIN MASTER";
            } else if (data.roles.includes("principal")) {
              primaryRole = "KEPALA SEKOLAH";
            } else if (data.roles.includes("homeroom")) {
              primaryRole = "WALI KELAS";
            } else if (data.roles.includes("teacher")) {
              primaryRole = "GURU PENGAJAR";
            }

            setUserProfile({
              full_name: data.full_name,
              role: primaryRole,
            });
          }
        }
      } catch (err) {
        console.error("Gagal mengambil data profil login:", err.message);
        setUserProfile({
          full_name: "Super Admin Sistem",
          role: "SUPER_ADMIN",
        });
      }
    };

    fetchLoggedUser();
  }, []);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      alert("Gagal logout: " + error.message);
    }
  };

  const getHeaderTitle = () => {
    if (location.pathname === "/super-admin/pengguna")
      return "Manajemen Akun Admin";
    if (location.pathname === "/super-admin/pengaturan")
      return "Pengaturan Global Sistem";
    if (location.pathname === "/super-admin/log-aktivitas")
      return "Log & Audit Aktivitas";
    if (location.pathname === "/super-admin/profile-akun") return "Profil Saya";
    if (location.pathname === "/super-admin/pengaturan-akun")
      return "Pengaturan Akun";
    return "Panel Kontrol Super Admin";
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0F172A] font-sans transition-colors duration-300 overflow-hidden relative">
      {/* OVERLAY GELAP UNTUK MOBILE SAAT SIDEBAR TERBUKA */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/60 h-20 flex flex-row items-center gap-3 justify-start">
          <img
            src={logoPadmajaya}
            alt="Logo SD Padmajaya"
            className="w-10 h-10 object-contain flex-shrink-0"
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

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
          <NavLink
            to="/super-admin"
            end
            onClick={() => setShowMobileMenu(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
              />
            </svg>
            Dashboard
          </NavLink>

          <NavLink
            to="/super-admin/pengguna"
            onClick={() => setShowMobileMenu(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Kelola Akun Admin
          </NavLink>

          <NavLink
            to="/super-admin/log-aktivitas"
            onClick={() => setShowMobileMenu(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Log Aktivitas
          </NavLink>

          <NavLink
            to="/super-admin/pengaturan"
            onClick={() => setShowMobileMenu(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Pengaturan Sistem
          </NavLink>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER DIPERBAIKI MENJADI 1 BARIS */}
        <header className="h-16 md:h-20 border-b flex items-center justify-between px-4 lg:px-8 bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800/80 transition-colors duration-300 z-10 shrink-0">
          <div className="flex-1">
            <h1 className="text-slate-800 dark:text-white font-black text-[15px] md:text-xl tracking-wide line-clamp-1">
              {getHeaderTitle()}
            </h1>
          </div>

          {/* GRUP TOMBOL KANAN */}
          <div className="flex items-center gap-2 md:gap-4 pl-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 md:p-3 rounded-xl bg-slate-100 dark:bg-[#0F172A] text-slate-500 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <svg
                  className="w-4.5 h-4.5 md:w-5 md:h-5"
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
                  className="w-4.5 h-4.5 md:w-5 md:h-5"
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

            {/* TOMBOL PROFIL */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 pr-2 md:pr-4 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all"
              >
                <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 text-xs md:text-sm uppercase">
                  {userProfile.full_name
                    ? userProfile.full_name.charAt(0)
                    : "A"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-0.5 max-w-[140px] truncate">
                    {userProfile.full_name}
                  </div>
                  <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none mt-0.5">
                    {userProfile.role}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 hidden sm:block transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`}
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

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 transform origin-top-right transition-all">
                    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold uppercase">
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
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/super-admin/profile-akun");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 font-medium transition-colors"
                    >
                      Profile Saya
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/super-admin/pengaturan-akun");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 font-medium transition-colors"
                    >
                      Pengaturan Akun
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-2"></div>
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

            {/* TOMBOL HAMBURGER - KHUSUS MOBILE DI POJOK KANAN */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 ml-1 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
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
                  strokeWidth="2.5"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
