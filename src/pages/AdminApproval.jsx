import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AdminApproval() {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [filterKelas, setFilterKelas] = useState("Semua Kelas");

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  useEffect(() => {
    fetchPendingAttendance();
  }, []);

  const fetchPendingAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance_records")
      .select(
        `
        id, attendance_date, status, approval_status,
        students ( full_name ),
        teaching_schedule ( classes ( class_name ), subjects ( subject_name ) )
      `,
      )
      .eq("approval_status", "PENDING")
      .order("attendance_date", { ascending: false });

    if (error) console.error(error);
    else setPendingRecords(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from("attendance_records")
      .update({ status: newStatus })
      .eq("id", id);

    if (!error) {
      await logActivity(
        `Admin mengubah status absensi ID: ${id} menjadi ${newStatus}`,
        "attendance_records",
        id,
      );
    }

    if (error) {
      showToast("Gagal update status!");
    } else {
      showToast("Status berhasil diubah!");
      fetchPendingAttendance();
    }
  };

  const logActivity = async (
    actionText,
    targetTable = null,
    targetId = null,
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("activity_logs").insert({
        user_id: user?.id,
        activity: actionText,
        target_table: targetTable,
        target_id: targetId,
      });

      if (error) {
        console.error("Gagal mencatat log ke database:", error.message);
      }
    } catch (err) {
      console.error("Terjadi kesalahan sistem log:", err);
    }
  };

  const handleApprove = async (recordId, studentName, finalStatus) => {
    try {
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({
          approval_status: "APPROVED",
          status: finalStatus,
        })
        .eq("id", recordId);

      if (updateError) throw updateError;

      await logActivity(
        `Menyetujui absensi ${studentName || "Siswa"} (Status: ${finalStatus})`,
        "attendance_records",
        recordId,
      );

      showToast(`✅ Absensi ${studentName || "Siswa"} berhasil disetujui!`);

      setPendingRecords((prevData) =>
        prevData.filter((item) => item.id !== recordId),
      );
    } catch (err) {
      console.error("Gagal menyetujui absensi:", err);
      showToast("❌ Gagal memproses data: " + err.message);
    }
  };

  const daftarKelas = [
    "Semua Kelas",
    ...new Set(
      pendingRecords
        .map((rec) => rec.teaching_schedule?.classes?.class_name)
        .filter(Boolean),
    ),
  ];

  const filteredRecords =
    filterKelas === "Semua Kelas"
      ? pendingRecords
      : pendingRecords.filter(
          (rec) => rec.teaching_schedule?.classes?.class_name === filterKelas,
        );

  const handleApproveAll = async () => {
    if (filteredRecords.length === 0) return;

    const recordIds = filteredRecords.map((rec) => rec.id);

    try {
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({ approval_status: "APPROVED" })
        .in("id", recordIds);

      if (updateError) throw updateError;

      await logActivity(
        `Menyetujui ${recordIds.length} absensi secara massal (Filter: ${filterKelas})`,
        "attendance_records",
      );

      showToast(`✅ ${recordIds.length} data absensi berhasil disetujui!`);

      setPendingRecords((prev) =>
        prev.filter((item) => !recordIds.includes(item.id)),
      );
    } catch (err) {
      console.error("Gagal menyetujui massal:", err);
      showToast("❌ Gagal memproses data massal: " + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen dark:bg-[#0F172A] transition-colors">
      <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-6">
        Validasi Absensi Admin
      </h1>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">
            Filter Kelas:
          </label>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-sm px-4 py-3 sm:py-2 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            {daftarKelas.map((kelas) => (
              <option key={kelas} value={kelas}>
                {kelas}
              </option>
            ))}
          </select>
        </div>

        {filteredRecords.length > 0 && (
          <button
            onClick={handleApproveAll}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 sm:py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Setujui Semua ({filteredRecords.length})
          </button>
        )}
      </div>

      {/* Pembungkus Tabel yang Diperbarui */}
      <div className="bg-white dark:bg-[#1E293B] rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
        <table className="w-full text-left min-w-max whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100 dark:border-slate-800/60">
            <tr>
              <th className="p-4 md:p-6">Tanggal</th>
              <th className="p-4 md:p-6">Siswa</th>
              <th className="p-4 md:p-6">Kelas</th>
              <th className="p-4 md:p-6">Status (Bisa Diedit)</th>
              <th className="p-4 md:p-6 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className="p-8 md:p-12 text-center text-slate-400 dark:text-slate-500 font-bold italic"
                >
                  Tidak ada absensi menunggu validasi.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="p-4 md:p-6 font-bold text-sm text-slate-800 dark:text-slate-200">
                    {rec.attendance_date}
                  </td>
                  <td className="p-4 md:p-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {rec.students?.full_name}
                  </td>
                  <td className="p-4 md:p-6 text-sm text-slate-500">
                    {rec.teaching_schedule?.classes?.class_name}
                  </td>
                  <td className="p-4 md:p-6">
                    <select
                      value={rec.status}
                      onChange={(e) =>
                        handleStatusChange(rec.id, e.target.value)
                      }
                      className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-[10px] md:text-xs font-black uppercase p-2 md:p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-emerald-500 cursor-pointer transition-colors"
                    >
                      <option value="HADIR">HADIR</option>
                      <option value="SAKIT">SAKIT</option>
                      <option value="IZIN">IZIN</option>
                      <option value="ALPHA">ALPHA</option>
                    </select>
                  </td>
                  <td className="p-4 md:p-6 text-center">
                    <button
                      onClick={() =>
                        handleApprove(
                          rec.id,
                          rec.students?.full_name,
                          rec.status,
                        )
                      }
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      Setujui
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className={`fixed top-8 right-4 left-4 md:left-auto md:right-8 z-[200] transition-all duration-500 transform ${toast.show ? "translate-y-0 md:translate-x-0 opacity-100" : "-translate-y-[150%] md:translate-y-0 md:translate-x-[150%] opacity-0"}`}
      >
        <div className="bg-emerald-600 text-white px-6 md:px-8 py-4 rounded-[22px] shadow-2xl shadow-emerald-600/30 flex items-center gap-4">
          <div className="bg-white/20 p-1.5 rounded-full shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="font-black tracking-wide text-xs md:text-sm leading-tight">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
}
