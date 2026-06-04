import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminSettings() {
  const navigate = useNavigate();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({ full_name: "", username: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .single();
      if (data)
        setFormData({ full_name: data.full_name, username: data.username });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: formData.full_name, username: formData.username })
        .eq("id", user.id);

      if (error) throw error;
      setMessage({ text: "Profil berhasil diperbarui! 🎉", type: "success" });
    } catch (err) {
      setMessage({
        text: "Gagal update profil: " + err.message,
        type: "error",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({
        text: "Konfirmasi password baru tidak cocok!",
        type: "error",
      });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({
        text: "Password baru minimal harus 6 karakter!",
        type: "error",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password,
      });

      if (error) throw error;

      setMessage({
        text: "Password akun berhasil diubah! 🔐",
        type: "success",
      });
      setPasswordData({ new_password: "", confirm_password: "" });
      setShowPasswordForm(false);
    } catch (err) {
      setMessage({
        text: "Gagal mengubah password: " + err.message,
        type: "error",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#172033] p-6 lg:p-8 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800/80 transition-colors duration-300 min-h-[70vh]">
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        {/* Tombol Kembali */}
        <div>
          <button className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-2 transition-colors">
            <span>&larr;</span> Kembali ke Dashboard
          </button>
        </div>

        {/* Layout Grid Utama: 1 Kolom di HP, 3 Kolom di Layar Lebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KARTU KIRI: Informasi Keamanan */}
          <div className="bg-white dark:bg-[#172033] p-6 lg:p-8 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800/80 lg:col-span-1 flex flex-col items-start">
            {/* Ikon Gembok (Menggunakan warna biru khas Admin) */}
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Keamanan Akun
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Harap amankan credential login Anda secara mandiri demi keamanan
              sistem digital dan privasi data sekolah.
            </p>
          </div>

          {/* KARTU KANAN: Form Pengaturan */}
          <div className="bg-white dark:bg-[#172033] p-6 lg:p-8 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800/80 lg:col-span-2">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
              Ubah Kata Sandi
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Perbarui kata sandi akun portal SD Padmajaya Anda secara berkala.
            </p>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input: Password Baru */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {/* Ikon Mata (Show/Hide Password) */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Input: Konfirmasi Password */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Ulangi password baru"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Area Tombol Simpan */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                >
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
