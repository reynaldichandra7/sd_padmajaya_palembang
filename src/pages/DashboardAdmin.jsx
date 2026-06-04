import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function DashboardAdmin() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    schedules: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      const { count: teacherCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .contains("roles", ["teacher"]);
      const hariIni = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ][new Date().getDay()];
      const { count: scheduleCount } = await supabase
        .from("teaching_schedule")
        .select("*", { count: "exact", head: true })
        .eq("day_name", hariIni);
      const { count: pendingCount } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "PENDING");

      setStats({
        students: studentCount || 0,
        teachers: teacherCount || 0,
        schedules: scheduleCount || 0,
        pending: pendingCount || 0,
      });
    } catch (error) {
      console.error("Gagal mengambil statistik:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-slate-500 font-medium dark:text-slate-400">
        Mengolah data dashboard...
      </div>
    );

  return (
    <div className="transition-colors duration-300">
      <div className="mb-10 bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl p-8 text-white shadow-lg shadow-blue-200 dark:shadow-none">
        <h1 className="text-3xl font-black mb-2">
          Selamat Datang di Pusat Kendali, Admin! 🚀
        </h1>
        <p className="text-blue-100 text-sm md:text-base max-w-2xl">
          Pantau seluruh aktivitas akademik SD Padmajaya hari ini. Mulai dari
          jumlah siswa aktif, kesiapan tenaga pendidik, hingga antrean
          persetujuan absensi kelas.
        </p>
      </div>

      <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-2">
        Ringkasan Hari Ini
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
            </div>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Total Siswa
            </span>
          </div>
          <span className="text-4xl font-black text-slate-800 dark:text-white">
            {stats.students}
          </span>
          <div
            onClick={() => navigate("/admin/master")}
            className="mt-4 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer hover:underline flex items-center gap-1"
          >
            Kelola Data Siswa{" "}
            <span className="text-lg leading-none">&rarr;</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-md hover:border-emerald-100 dark:hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
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
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Total Guru
            </span>
          </div>
          <span className="text-4xl font-black text-slate-800 dark:text-white">
            {stats.teachers}
          </span>
          <div className="mt-4 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
            Tenaga Pendidik Aktif
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col group hover:shadow-md hover:border-violet-100 dark:hover:border-violet-500/30 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl group-hover:scale-110 transition-transform">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Jadwal Hari Ini
            </span>
          </div>
          <span className="text-4xl font-black text-slate-800 dark:text-white">
            {stats.schedules}
          </span>
          <div className="mt-4 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center gap-1">
            Sesi Kelas Berlangsung
          </div>
        </div>

        <div
          onClick={() => navigate("/admin/persetujuan")}
          className={`p-6 rounded-3xl shadow-sm border flex flex-col cursor-pointer transition-all group ${
            stats.pending > 0
              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 hover:shadow-md hover:bg-amber-100 dark:hover:bg-amber-500/20"
              : "bg-white dark:bg-[#1E293B] border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${stats.pending > 0 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500"}`}
            >
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                ></path>
              </svg>
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${stats.pending > 0 ? "text-amber-600 dark:text-amber-400 animate-pulse" : "text-slate-400 dark:text-slate-500"}`}
            >
              Butuh Persetujuan
            </span>
          </div>
          <span
            className={`text-4xl font-black ${stats.pending > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-white"}`}
          >
            {stats.pending}
          </span>
          <div
            className={`mt-4 text-xs font-bold flex items-center gap-1 ${stats.pending > 0 ? "text-amber-700 dark:text-amber-500" : "text-slate-500 dark:text-slate-400"}`}
          >
            Lihat Antrean Absensi{" "}
            <span className="text-lg leading-none">&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
