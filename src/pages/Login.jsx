import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { logActivity } from "../logger";
import logoPadmajaya from "../assets/logo_sdpadmajaya.png";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let emailToLogin = identifier;

      if (!identifier.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", identifier)
          .single();

        if (profileError || !profile)
          throw new Error("Username atau Email tidak ditemukan");
        emailToLogin = profile.email;
      }

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: emailToLogin,
          password: password,
        });

      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      const userRoles = Array.isArray(profile.roles)
        ? profile.roles
        : [profile.roles];

      let primaryRole = "teacher";
      let targetRoute = "/guru";

      if (userRoles.includes("super_admin")) {
        primaryRole = "super_admin";
        targetRoute = "/super-admin";
      } else if (userRoles.includes("admin")) {
        primaryRole = "admin";
        targetRoute = "/admin";
      } else if (userRoles.includes("headmaster")) {
        primaryRole = "headmaster";
        targetRoute = "/kepsek";
      } else if (userRoles.includes("homeroom")) {
        primaryRole = "homeroom";
        targetRoute = "/wali-kelas";
      }

      localStorage.setItem("activeRole", primaryRole);

      await logActivity(
        authData.user.id,
        `Melakukan login ke dalam sistem (Role: ${primaryRole})`,
        "AUTH",
        authData.user.id,
      );

      navigate(targetRoute);
    } catch (error) {
      alert("Login gagal: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Tambahkan px-4 agar di HP tidak mentok pinggir, p-4 md:p-0 untuk atas-bawah
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4 py-8 md:p-0">
      <form
        onSubmit={handleLogin}
        // Ubah p-10 menjadi p-8 di HP, dan md:p-12 di laptop agar proporsional
        className="bg-white p-8 md:p-12 rounded-[32px] w-full max-w-md shadow-2xl transition-all duration-300"
      >
        <div className="flex justify-center mb-6">
          <img
            src={logoPadmajaya}
            alt="Logo SD Padmajaya"
            // Perbaiki ukuran logo menjadi w-28 (HP) dan md:w-36 (Laptop)
            className="w-28 md:w-36 h-auto object-contain drop-shadow-md"
          />
        </div>

        <h1 className="text-xl md:text-2xl font-black mb-8 text-slate-800 text-center tracking-tight">
          Login SD Padmajaya
        </h1>

        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Username atau Email
            </label>
            <input
              required
              type="text"
              className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 transition-all text-sm md:text-base"
              placeholder="Username atau Email Anda"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Password
            </label>
            <input
              required
              type={showPassword ? "text" : "password"}
              className="w-full p-3.5 md:p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 pr-12 transition-all text-sm md:text-base"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              // Sesuaikan posisi tombol mata agar pas di tengah input
              className="absolute right-4 top-[34px] md:top-[38px] text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {showPassword ? (
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.96 9.96 0 011.53-2.613m4.61-4.61A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7-.31 1.002-.756 1.944-1.326 2.793m-4.61 4.61A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.96 9.96 0 011.53-2.613m4.61-4.61A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7-.31 1.002-.756 1.944-1.326 2.793m4.61 4.61A10.05 10.05 0 0112 19"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3l18 18"
                  />
                </svg>
              )}
            </button>
          </div>

          <button
            disabled={loading}
            className="w-full py-3.5 md:py-4 mt-2 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk ke Sistem"}
          </button>
        </div>
      </form>
    </div>
  );
}
