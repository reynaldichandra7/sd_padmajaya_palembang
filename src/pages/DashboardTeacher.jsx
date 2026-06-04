import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function DashboardTeacher() {
  const navigate = useNavigate();
  const location = useLocation();

  const { id: sessionId } = useParams();

  const [view, setView] = useState(() => {
    const path = location.pathname;
    if (path.includes("/guru/riwayat")) return "history";
    if (path.endsWith("/guru/kelas")) return "classes";
    if (path.includes("/guru/profil")) return "profile";
    if (path.includes("/guru/pengaturan-akun")) return "account";
    if (path.includes("/guru/absensi/")) return "attendance";
    return "dashboard";
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/guru/riwayat")) setView("history");
    else if (path.endsWith("/guru/kelas")) setView("classes");
    else if (path.includes("/guru/profil")) setView("profile");
    else if (path.includes("/guru/pengaturan-akun")) setView("account");
    else if (path.includes("/guru/absensi/")) setView("attendance");
    else setView("dashboard");
  }, [location.pathname]);

  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceInput, setAttendanceInput] = useState({});

  const handleHadirSemua = () => {
    const bulkAttendance = {};
    students.forEach((student) => {
      bulkAttendance[student.id] = { status: "HADIR", notes: "" };
    });
    setAttendanceData(bulkAttendance);
  };

  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [teacherProfile, setTeacherProfile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [allClasses, setAllClasses] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  const hariIni = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ][new Date().getDay()];

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

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
    const getProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setTeacherProfile(data);
      }
    };
    getProfile();
  }, []);

  const hiddenScheduleId = location.state?.scheduleId;

  useEffect(() => {
    if (view === "dashboard") fetchSchedules();
    if (view === "classes") fetchAllClasses();
    if (view === "history") fetchHistory();

    if (view === "attendance") {
      if (hiddenScheduleId) {
        loadSessionAttendance(hiddenScheduleId);
      } else {
        navigate("/guru");
      }
    }
  }, [view, hiddenScheduleId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("teaching_schedule")
        .select(
          `id, day_name, start_time, end_time, classes ( id, class_name ), subjects ( id, subject_name )`,
        )
        .eq("teacher_id", session.user.id)
        .eq("day_name", hariIni);

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Gagal mengambil jadwal:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClasses = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("teaching_schedule")
        .select(
          `id, day_name, start_time, end_time, classes ( id, class_name ), subjects ( id, subject_name )`,
        )
        .eq("teacher_id", session.user.id);

      if (error) throw error;
      setAllClasses(data || []);
    } catch (error) {
      console.error("Gagal menarik daftar kelas:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("attendance_records")
        .select(
          `
          id, attendance_date, approval_status, teaching_schedule_id,
          teaching_schedule!inner ( day_name, classes ( class_name ), subjects ( subject_name ) )
        `,
        )
        .eq("created_by", session.user.id)
        .order("attendance_date", { ascending: false });

      if (error) throw error;

      const groupedHistory = [];
      const seen = new Set();
      data?.forEach((record) => {
        const key = `${record.attendance_date}_${record.teaching_schedule_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          groupedHistory.push(record);
        }
      });

      setHistoryLogs(groupedHistory);
    } catch (error) {
      console.error("Gagal menarik riwayat:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAttendance = async (schedId) => {
    setLoading(true);
    const todayDate = new Date().toISOString().split("T")[0];

    try {
      const { data: schedule, error: schedErr } = await supabase
        .from("teaching_schedule")
        .select(
          `id, day_name, start_time, end_time, classes ( id, class_name ), subjects ( id, subject_name )`,
        )
        .eq("id", schedId)
        .single();

      if (schedErr) throw schedErr;
      setSelectedSchedule(schedule);

      const { data: existingAttendance } = await supabase
        .from("attendance_records")
        .select("id, approval_status")
        .eq("teaching_schedule_id", schedule.id)
        .eq("attendance_date", todayDate)
        .limit(1);

      if (existingAttendance && existingAttendance.length > 0) {
        setIsAlreadySubmitted(true);
      } else {
        setIsAlreadySubmitted(false);
        const { data: stdData, error } = await supabase
          .from("students")
          .select("id, full_name")
          .eq("class_id", schedule.classes.id)
          .order("full_name", { ascending: true });

        if (error) throw error;
        setStudents(stdData || []);
        const initialData = {};
        stdData?.forEach((student) => {
          initialData[student.id] = { status: "", notes: "" };
        });
        setAttendanceData(initialData);
      }
    } catch (err) {
      showToast("Error saat menarik data sesi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: newStatus,
      },
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedSchedule) return;
    setSubmitting(true);

    const unrecordedStudents = students.filter(
      (student) => !attendanceData[student.id]?.status,
    );

    if (unrecordedStudents.length > 0) {
      showToast(
        `⚠️ Masih ada ${unrecordedStudents.length} siswa yang belum diisi kehadirannya!`,
      );
      setSubmitting(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const todayDate = new Date().toISOString().split("T")[0];

      const payload = students.map((student) => ({
        student_id: student.id,
        teaching_schedule_id: selectedSchedule.id,
        attendance_date: todayDate,
        status: attendanceData[student.id].status,
        created_by: session.user.id,
      }));

      const { error } = await supabase
        .from("attendance_records")
        .insert(payload);

      if (error) throw error;

      const { error: logError } = await supabase.from("activity_logs").insert([
        {
          user_id: session.user.id,
          activity: `Guru melakukan absensi untuk kelas ${selectedSchedule.classes.class_name}`,
          target_table: "attendance_records",
          target_id: selectedSchedule.id,
        },
      ]);

      if (logError) {
        console.error("Gagal menyimpan log aktivitas:", logError.message);
      }

      showToast("Berhasil! Absensi tersimpan dalam status PENDING.");
      navigate("/guru");
    } catch (error) {
      showToast("Gagal: " + error.message);
      setSubmitting(false);
    }
  };

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (
    loading &&
    (view === "dashboard" ||
      view === "classes" ||
      view === "history" ||
      view === "attendance")
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 bg-amber-500 rounded-2xl animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase">
          Memuat Data...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* 1. VIEW MAIN DASHBOARD (JADWAL HARI INI SAJA) */}
      {view === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                Jadwal Mengajar Hari {hariIni}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                Pilih sesi kelas di bawah ini untuk memulai pencatatan absensi
                siswa hari ini.
              </p>
            </div>
            <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-500/20 font-bold flex items-center gap-2">
              <svg
                className="w-5 h-5 animate-pulse"
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
              <span>
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 border-dashed rounded-[32px]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 12H4M8 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Kosong/Libur
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Anda tidak memiliki jadwal mengajar pada hari {hariIni}.
                </p>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="group relative bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-amber-200 dark:hover:border-slate-700 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-14 h-14 bg-amber-500 dark:bg-amber-500/10 text-amber-500 dark:text-amber-500 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-inner">
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700">
                      Sesi Aktif
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-1">
                    {schedule.classes?.class_name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                    Mata Pelajaran:{" "}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {schedule.subjects?.subject_name}
                    </span>
                  </p>

                  <button
                    onClick={() => {
                      const urlCantik = schedule.classes?.class_name
                        .toLowerCase()
                        .replace(/\s+/g, "-");
                      navigate(`/guru/absensi/${urlCantik}`, {
                        state: { scheduleId: schedule.id },
                      });
                    }}
                    className="mt-auto w-full py-4 bg-slate-50 dark:bg-slate-800/50 text-amber-500 dark:text-amber-500 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-amber-500/20"
                  >
                    Buka Sesi Kelas
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. VIEW ABSENSI */}
      {view === "attendance" && selectedSchedule && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/guru")}
            className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline mb-2"
          >
            ← Kembali ke Dashboard Utama
          </button>
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-10 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 mb-8 border-b border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-amber-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-600/20">
                  {selectedSchedule.classes?.class_name.replace("Kelas ", "")}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    Absensi {selectedSchedule.classes?.class_name}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Mata Pelajaran:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {selectedSchedule.subjects?.subject_name}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 mt-6 md:mt-0">
                <button
                  onClick={handleHadirSemua}
                  type="button"
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-600/10 hover:bg-emerald-600/20 text-amber-500 dark:text-amber-400 border border-amber-500/20 hover:border-emerald-500/50 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  <svg
                    className="w-4 h-4"
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
                  Tandai Hadir Semua
                </button>

                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>{" "}
                  Sesi Terbuka
                </div>
              </div>
            </div>

            {isAlreadySubmitted ? (
              <div className="p-8 text-center bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-3xl">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-amber-800 dark:text-amber-500 mb-2">
                  Absensi Sudah Terkirim!
                </h2>
                <p className="text-amber-700 dark:text-amber-400 font-medium max-w-lg mx-auto">
                  Laporan kehadiran untuk kelas ini pada hari ini telah berhasil
                  direkam dan sedang dalam status{" "}
                  <strong className="text-amber-900 dark:text-amber-300 uppercase">
                    Pending
                  </strong>{" "}
                  (Menunggu Verifikasi Admin).
                </p>
              </div>
            ) : (
              <div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="p-4 sm:p-6 space-y-3">
                    {students.map((student, index) => (
                      <div
                        key={student.id}
                        className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-amber-200 dark:hover:border-slate-600 transition-colors gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-bold font-mono">
                            {index + 1}
                          </div>
                          <span className="font-bold text-base text-slate-800 dark:text-slate-200">
                            {student.full_name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 lg:justify-end">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`hadir-${student.id}`}
                              name={`status-${student.id}`}
                              className="peer/hadir w-4 h-4 cursor-pointer accent-emerald-500"
                              value="HADIR"
                              checked={
                                attendanceData[student.id]?.status === "HADIR"
                              }
                              onChange={() =>
                                handleStatusChange(student.id, "HADIR")
                              }
                            />
                            <label
                              htmlFor={`hadir-${student.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer peer-checked/hadir:text-emerald-600 dark:peer-checked/hadir:text-emerald-400 transition-colors"
                            >
                              Hadir
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`sakit-${student.id}`}
                              name={`status-${student.id}`}
                              className="peer/sakit w-4 h-4 cursor-pointer accent-sky-500"
                              value="SAKIT"
                              checked={
                                attendanceData[student.id]?.status === "SAKIT"
                              }
                              onChange={() =>
                                handleStatusChange(student.id, "SAKIT")
                              }
                            />
                            <label
                              htmlFor={`sakit-${student.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer peer-checked/sakit:text-sky-600 dark:peer-checked/sakit:text-sky-400 transition-colors"
                            >
                              Sakit
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`izin-${student.id}`}
                              name={`status-${student.id}`}
                              className="peer/izin w-4 h-4 cursor-pointer accent-amber-500"
                              value="IZIN"
                              checked={
                                attendanceData[student.id]?.status === "IZIN"
                              }
                              onChange={() =>
                                handleStatusChange(student.id, "IZIN")
                              }
                            />
                            <label
                              htmlFor={`izin-${student.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer peer-checked/izin:text-amber-600 dark:peer-checked/izin:text-amber-400 transition-colors"
                            >
                              Izin
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`alpha-${student.id}`}
                              name={`status-${student.id}`}
                              className="peer/alpha w-4 h-4 cursor-pointer accent-rose-500"
                              value="ALPHA"
                              checked={
                                attendanceData[student.id]?.status === "ALPHA"
                              }
                              onChange={() =>
                                handleStatusChange(student.id, "ALPHA")
                              }
                            />
                            <label
                              htmlFor={`alpha-${student.id}`}
                              className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer peer-checked/alpha:text-rose-600 dark:peer-checked/alpha:text-rose-400 transition-colors"
                            >
                              Alpha
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-slate-500 dark:text-slate-400 font-bold">
                          Belum ada data siswa terdaftar di kelas ini.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                    Pastikan status kehadiran seluruh siswa telah diisi dengan
                    benar sebelum mengirim laporan.
                  </p>
                  <button
                    onClick={handleSubmitAttendance}
                    disabled={submitting || students.length === 0}
                    className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-amber-700 disabled:opacity-50 transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Menyimpan Data...
                      </>
                    ) : (
                      "Kirim Laporan (Pending)"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VIEW DAFTAR SELURUH KELAS */}
      {view === "classes" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                Daftar Kelas Anda
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Daftar seluruh jadwal kelas yang dibebankan kepada Anda selama
                seminggu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allClasses.length === 0 ? (
                <div className="col-span-full p-12 text-center border border-slate-100 dark:border-slate-800 border-dashed rounded-[32px]">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    Anda belum di-assign ke kelas manapun.
                  </p>
                </div>
              ) : (
                allClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-amber-200 dark:hover:border-slate-700 transition-colors flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-5">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <span className="px-3 py-1 bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700">
                        {cls.day_name}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                      {cls.classes?.class_name}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      {cls.subjects?.subject_name}
                    </p>

                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center gap-2 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 rounded-lg w-max uppercase tracking-wider">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {cls.start_time
                            ? cls.start_time.slice(0, 5)
                            : "--:--"}{" "}
                          - {cls.end_time ? cls.end_time.slice(0, 5) : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW RIWAYAT MENGAJAR */}
      {view === "history" && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                Riwayat Mengajar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Laporan rekapitulasi sesi kelas yang pernah Anda serahkan.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                      Tgl. Sesi
                    </th>
                    <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                      Kelas & Mata Pelajaran
                    </th>
                    <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                      Status Validasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium"
                      >
                        Belum ada riwayat absensi yang dikirimkan.
                      </td>
                    </tr>
                  ) : (
                    historyLogs.map((log, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-6">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {new Date(log.attendance_date).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                            {log.teaching_schedule?.day_name}
                          </p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            {log.teaching_schedule?.classes?.class_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {log.teaching_schedule?.subjects?.subject_name}
                          </p>
                        </td>
                        <td className="p-6">
                          {log.approval_status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-[10px] font-black uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>{" "}
                              Pending
                            </span>
                          ) : (
                            // PERHATIAN: Status disetujui sengaja dibiarkan warna Emerald agar lebih intuitif.
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                              Disetujui
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW PROFIL SAYA */}
      {view === "profile" && (
        <div className="w-full animate-in fade-in duration-300 max-w-4xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/guru")}
            className="mb-2 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-2 hover:underline"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-dashed border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="w-28 h-28 bg-gradient-to-tr from-amber-500 to-amber-700 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-amber-500/20">
                  {teacherProfile?.full_name?.charAt(0) || "G"}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-[#1E293B] rounded-full"
                  title="Sistem Aktif"
                ></div>
              </div>
              <div className="text-center sm:text-left space-y-3">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  {teacherProfile?.full_name || "Guru Pengajar"}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-widest">
                    Tenaga Pendidik
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    Terverifikasi
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-10">
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2 font-mono">
                  Username
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  @{teacherProfile?.username || "guru_padmajaya"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2 font-mono">
                  Alamat Email
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {teacherProfile?.email || "guru@padmajaya.sch.id"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2 font-mono">
                  NIP / No. Induk
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {teacherProfile?.employee_number || "—"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 transition-colors">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2 font-mono">
                  Koneksi Basis Data
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Sistem Normal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. VIEW PENGATURAN AKUN */}
      {view === "account" && (
        <div className="w-full animate-in fade-in duration-300 max-w-5xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/guru")}
            className="mb-2 text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-2 hover:underline"
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
                    Ganti kata sandi secara berkala untuk menjaga keamanan akun
                    portal SD Padmajaya Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  Pengaturan Akun
                </h2>
                <p className="text-base mt-2 text-slate-500 dark:text-slate-400">
                  Perbarui kata sandi sistem manajemen Anda.
                </p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const newPassword = e.target.elements.newPassword.value;
                  const confirmPassword =
                    e.target.elements.confirmPassword.value;
                  if (!newPassword)
                    return showToast("Password tidak boleh kosong!");
                  if (newPassword.length < 6)
                    return showToast("Password minimal 6 karakter!");
                  if (newPassword !== confirmPassword)
                    return showToast("Konfirmasi password tidak cocok!");

                  const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                  });
                  if (error)
                    showToast("Gagal memperbarui password: " + error.message);
                  else {
                    showToast("Sip! Kata sandi akun Anda berhasil diperbarui.");
                    e.target.reset();
                  }
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2 font-mono">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Minimal 6 karakter"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
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
                    <label className="block text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2 font-mono">
                      Konfirmasi Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Ulangi password baru"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
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
                    className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-amber-600/20 transition-all w-full sm:w-auto"
                  >
                    Simpan Password Baru
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div
        className={`fixed top-8 right-8 z-[200] transition-all duration-500 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-[150%] opacity-0"}`}
      >
        <div className="bg-amber-600 text-white px-8 py-4 rounded-[22px] shadow-2xl shadow-amber-600/30 flex items-center gap-4">
          <div className="bg-white/20 p-1.5 rounded-full">
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
          <p className="font-black tracking-wide text-sm">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}
