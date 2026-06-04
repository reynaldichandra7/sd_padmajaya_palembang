import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function DaftarKelas() {
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJadwal();
  }, []);

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Ambil data jadwal, pastikan kolom start_time & end_time ada di tabelmu
      const { data, error } = await supabase
        .from("teaching_schedule")
        .select(
          `
          id,
          day_name,
          start_time,
          end_time,
          classes ( class_name ),
          subjects ( subject_name )
        `,
        )
        .eq("teacher_id", session.user.id)
        .order("day_name", { ascending: true }); // Kamu bisa tambahkan logika sort hari nanti jika perlu

      if (error) throw error;
      setJadwal(data || []);
    } catch (err) {
      console.error("Gagal ambil jadwal:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
        Daftar Kelas & Jadwal
      </h1>

      {loading ? (
        <div className="text-slate-500">Memuat jadwal...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Hari</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {jadwal.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {item.day_name}
                  </td>
                  <td className="px-6 py-4">
                    {item.start_time} - {item.end_time}
                  </td>
                  <td className="px-6 py-4">{item.classes?.class_name}</td>
                  <td className="px-6 py-4">{item.subjects?.subject_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {jadwal.length === 0 && (
            <p className="text-center py-10 text-slate-500">
              Belum ada jadwal mengajar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
