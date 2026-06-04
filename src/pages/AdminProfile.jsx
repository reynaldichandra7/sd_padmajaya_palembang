import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      }
    } catch (err) {
      console.error("Gagal memuat profil:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#172033] p-6 lg:p-8 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800/80 transition-colors duration-300 min-h-[70vh]">
      <button
        onClick={() => navigate("/admin")}
        className="group flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-8"
      >
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </div>
        Kembali ke Dashboard
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">
          Profil Saya
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Kelola informasi data diri personal Anda.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse flex gap-6 items-center">
          <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="space-y-3">
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-full md:w-1/3 bg-slate-50 dark:bg-[#0F172A] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800/60 text-center">
              <div className="w-24 h-24 bg-indigo-600 text-white flex items-center justify-center text-4xl font-black rounded-3xl mx-auto mb-4 shadow-xl shadow-indigo-500/20">
                {profile?.full_name?.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {profile?.full_name}
              </h3>
              <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest mt-1">
                {profile?.roles?.[0]}
              </p>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Username
                </p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  @{profile?.username || "belun diatur"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Email Terdaftar
                </p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {profile?.email || "Tidak ada email"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                  Status Akun
                </p>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-lg uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>{" "}
                  Aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
