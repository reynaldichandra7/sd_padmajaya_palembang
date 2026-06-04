import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import logoPadmajaya from "../assets/logo_sdpadmajaya.png";

export default function TeacherLayout() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [userProfile, setUserProfile] = useState({
    full_name: "Loading...",
    role: "GURU",
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
            let primaryRole = "GURU PENGAJAR";
            if (data.roles?.includes("homeroom")) primaryRole = "WALI KELAS";
            setUserProfile({ full_name: data.full_name, role: primaryRole });
          }
        }
      } catch (err) {
        setUserProfile({ full_name: "Guru Padmajaya", role: "GURU" });
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
      window.location.href = "/";
    } catch (error) {
      alert("Gagal logout: " + error.message);
    }
  };

  const getHeaderTitle = () => {
    if (location.pathname === "/guru/riwayat") return "Riwayat Mengajar";
    if (location.pathname === "/guru/profile-akun") return "Profil Saya";
    if (location.pathname === "/guru/pengaturan-akun")
      return "Pengaturan Keamanan";
    return "Dashboard Guru";
  };

  const [activeYear, setActiveYear] = useState("Memuat TA...");

  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const { data, error } = await supabase
          .from("academic_years")
          .select("year_name")
          .eq("is_active", true)
          .single();

        if (error) throw error;

        if (data) {
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
            <p className="text-amber-500 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              Portal Tenaga Pendidik
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <NavLink
            to="/guru"
            className={() =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                location.pathname === "/guru" ||
                location.pathname.includes("/guru/absensi")
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
              />
            </svg>
            Dashboard Utama
          </NavLink>

          <NavLink
            to="/guru/kelas"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Daftar Kelas
          </NavLink>

          <NavLink
            to="/guru/riwayat"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Riwayat Mengajar
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
            <div className="hidden sm:flex items-center px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-xl border border-amber-200 dark:border-amber-500/20">
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
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/60 dark:border-slate-800 hover:border-amber-500 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20 text-sm uppercase">
                  {userProfile.full_name
                    ? userProfile.full_name.charAt(0)
                    : "G"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-0.5 max-w-[140px] truncate">
                    {userProfile.full_name}
                  </div>
                  <div className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest leading-none mt-0.5">
                    {userProfile.role}
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

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-60 bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 transform origin-top-right transition-all">
                    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/60 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold uppercase">
                          {userProfile.full_name
                            ? userProfile.full_name.charAt(0)
                            : "G"}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white max-w-[140px] truncate">
                            {userProfile.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            Guru SD Padmajaya
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/guru/profile-akun");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0F172A]/50 font-medium transition-colors"
                    >
                      Profile Saya
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate("/guru/pengaturan-akun");
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
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-[#0F172A] transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
