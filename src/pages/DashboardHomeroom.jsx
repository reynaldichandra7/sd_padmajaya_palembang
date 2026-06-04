import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoPadmajaya from "../assets/logo_sdpadmajaya.png"; // Pastikan path file ini benar

export default function DashboardHomeroom() {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentDay = () => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
    return days[new Date().getDay()];
  };

  const [view, setView] = useState(() => {
    const path = location.pathname;
    if (path.includes("siswa")) return "students";
    if (path.includes("profil")) return "profile";
    if (path.includes("pengaturan-akun")) return "account";
    if (path.includes("input-absensi")) return "input-absensi";
    return "dashboard";
  });

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("siswa")) setView("students");
    else if (path.includes("profil")) setView("profile");
    else if (path.includes("pengaturan-akun")) setView("account");
    else if (path.includes("input-absensi")) setView("input-absensi");
    else setView("dashboard");
  }, [location.pathname]);

  const [loading, setLoading] = useState(true);
  const [myClass, setMyClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    hadir: 0,
    sakit: 0,
    izin: 0,
    alpha: 0,
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceInput, setAttendanceInput] = useState({});
  const [schedules, setSchedules] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  useEffect(() => {
    let realtimeSubscription;

    const initializeDashboard = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUserProfile(profile);

        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, class_name")
          .eq("homeroom_teacher_id", session.user.id)
          .maybeSingle();

        if (classError) throw classError;

        if (classData) {
          setMyClass(classData);

          const { data: studentList } = await supabase
            .from("students")
            .select("id, full_name, nis, gender")
            .eq("class_id", classData.id)
            .order("full_name", { ascending: true });

          setStudents(studentList || []);

          const hariIni = getCurrentDay();
          if (hariIni === "Sabtu" || hariIni === "Minggu") {
            setSchedules([]);
          } else {
            const { data: scheduleList } = await supabase
              .from("teaching_schedule")
              .select(`id, day_name, subjects ( id, subject_name )`)
              .eq("class_id", classData.id)
              .eq("day_name", hariIni);
            setSchedules(scheduleList || []);
          }

          const fetchAbsensi = async () => {
            const { data: attData } = await supabase
              .from("attendance_records")
              .select(
                `
                id, attendance_date, status, approval_status,
                students!inner ( full_name, nis, class_id ),
                teaching_schedule ( subjects ( subject_name ) )
              `,
              )
              .eq("approval_status", "APPROVED")
              .eq("students.class_id", classData.id)
              .order("attendance_date", { ascending: false });

            setAttendanceRecords(attData || []);

            if (studentList) {
              setStats((prev) => ({ ...prev, total: studentList.length }));
            }
          };

          // 1. Eksekusi pertama kali
          await fetchAbsensi();

          // 2. Pasang Listener Realtime
          realtimeSubscription = supabase
            .channel(`realtime-absensi-${Date.now()}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "attendance_records" },
              (payload) => {
                console.log("⚡ Realtime Triggered: Data Absensi Berubah!");
                fetchAbsensi();
              },
            )
            .subscribe();
        }
      } catch (err) {
        console.error("Gagal memuat data wali kelas:", err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();

    // Pembersihan ketika pindah halaman
    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, [view]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">
          Menyelaraskan Data Kelas...
        </p>
      </div>
    );
  }

  // --- LOGIKA FILTER GRAFIK & TABEL BULANAN ---
  const filteredChartRecords = attendanceRecords.filter((rec) => {
    if (!rec.attendance_date) return false;
    const recMonth = new Date(rec.attendance_date).getMonth() + 1;
    return recMonth === parseInt(selectedMonth);
  });

  // MENGHITUNG SUMMARY PER SISWA (Termasuk yang 0)
  const studentAttendanceSummary = students.map((student) => {
    const records = filteredChartRecords.filter(
      (r) => r.students?.full_name === student.full_name,
    );
    return {
      id: student.id,
      name: student.full_name,
      nis: student.nis || "—",
      gender: student.gender || "-",
      hadir: records.filter((r) => r.status === "HADIR").length,
      sakit: records.filter((r) => r.status === "SAKIT").length,
      izin: records.filter((r) => r.status === "IZIN").length,
      alpha: records.filter((r) => r.status === "ALPHA").length,
    };
  });

  const handleSaveAttendance = async () => {
    if (!selectedSubject) {
      showToast("⚠️ Silakan pilih Mata Pelajaran terlebih dahulu!");
      return;
    }

    const unrecordedStudents = students.filter(
      (student) => !attendanceInput[student.id],
    );
    if (unrecordedStudents.length > 0) {
      showToast(
        `⚠️ Masih ada ${unrecordedStudents.length} siswa yang belum diisi kehadirannya!`,
      );
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    try {
      const { data: existingRecord, error: checkError } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("teaching_schedule_id", selectedSubject)
        .eq("attendance_date", todayStr)
        .limit(1);

      if (checkError) throw checkError;

      if (existingRecord && existingRecord.length > 0) {
        showToast(
          "⚠️ Peringatan: Mata Pelajaran ini sudah diabsen hari ini! Anda tidak bisa absen dua kali.",
        );
        return;
      }

      const recordsToInsert = students.map((student) => ({
        student_id: student.id,
        status: attendanceInput[student.id],
        attendance_date: todayStr,
        approval_status: "PENDING",
        teaching_schedule_id: selectedSubject,
      }));

      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert(recordsToInsert);

      if (insertError) throw insertError;

      showToast(
        "✅ Mantap! Rekaman presensi berhasil disimpan dan menunggu validasi Admin.",
      );
      setSelectedSubject("");
      setAttendanceInput({});

      navigate("/wali-kelas");
    } catch (err) {
      console.error("Gagal menyimpan absensi:", err);
      showToast("❌ Gagal menyimpan data: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const monthName = monthNames[parseInt(selectedMonth) - 1];
    const currentYear = new Date().getFullYear();

    const excelData = studentAttendanceSummary.map((student, index) => {
      return {
        NO: index + 1,
        NISN: student.nis,
        "NAMA LENGKAP": student.name,
        "JENIS KELAMIN": student.gender,
        HADIR: student.hadir,
        SAKIT: student.sakit,
        IZIN: student.izin,
        ALPHA: student.alpha,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const columnWidths = [
      { wch: 5 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
    ];
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${monthName}`);

    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_${myClass?.class_name}_${monthName}_${currentYear}.xlsx`,
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // 1. SETUP VARIABEL WAKTU & PERIODE
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const currentYear = new Date().getFullYear();
    const monthName = monthNames[parseInt(selectedMonth) - 1];

    const lastDay = new Date(currentYear, parseInt(selectedMonth), 0).getDate();
    const periodeStr = `1 ${monthName} ${currentYear} s.d. ${lastDay} ${monthName} ${currentYear}`;

    // 2. RENDER KOP SURAT (HEADER)
    try {
      const img = new Image();
      img.src = logoPadmajaya;
      doc.addImage(img, "PNG", 14, 10, 18, 18);
    } catch (e) {
      console.warn("Gagal merender logo ke PDF", e);
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SEKOLAH DASAR PADMAJAYA PALEMBANG", 105, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("LAPORAN REKAPITULASI PRESENSI SISWA", 105, 24, {
      align: "center",
    });

    doc.setLineWidth(0.8);
    doc.line(14, 30, 196, 30);

    // 3. INFORMASI IDENTITAS DATA
    doc.setFontSize(10);
    doc.text("Kelas", 14, 38);
    doc.text(`: ${myClass?.class_name || "-"}`, 42, 38);

    doc.text("Periode Absensi", 14, 44);
    doc.text(`: ${periodeStr}`, 42, 44);

    doc.text("Wali Kelas", 14, 50);
    doc.text(`: ${userProfile?.full_name || "-"}`, 42, 50);

    // 4. RENDER TABEL DATA & MENGHITUNG TOTAL
    const tableColumn = [
      "NO",
      "NISN",
      "NAMA LENGKAP",
      "GENDER",
      "HADIR",
      "SAKIT",
      "IZIN",
      "ALPHA",
    ];
    const tableRows = [];

    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;

    studentAttendanceSummary.forEach((student, index) => {
      totalHadir += student.hadir;
      totalSakit += student.sakit;
      totalIzin += student.izin;
      totalAlpha += student.alpha;

      tableRows.push([
        index + 1,
        student.nis,
        student.name,
        student.gender,
        student.hadir,
        student.sakit,
        student.izin,
        student.alpha,
      ]);
    });

    autoTable(doc, {
      startY: 56,
      head: [tableColumn],
      body: tableRows,
      foot: [
        [
          {
            content: "TOTAL KESELURUHAN",
            colSpan: 4,
            styles: {
              halign: "left",
              fillColor: [241, 245, 249],
              textColor: [15, 23, 42],
            },
          },
          {
            content: totalHadir,
            styles: {
              halign: "center",
              fillColor: [241, 245, 249],
              textColor: [5, 150, 105],
            },
          },
          {
            content: totalSakit,
            styles: {
              halign: "center",
              fillColor: [241, 245, 249],
              textColor: [59, 130, 246],
            },
          },
          {
            content: totalIzin,
            styles: {
              halign: "center",
              fillColor: [241, 245, 249],
              textColor: [245, 158, 11],
            },
          },
          {
            content: totalAlpha,
            styles: {
              halign: "center",
              fillColor: [241, 245, 249],
              textColor: [225, 29, 72],
            },
          },
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      footStyles: {
        fontStyle: "bold",
        lineWidth: 0.1,
        lineColor: [204, 204, 204],
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center", textColor: [5, 150, 105], fontStyle: "bold" },
        5: { halign: "center", textColor: [59, 130, 246], fontStyle: "bold" },
        6: { halign: "center", textColor: [245, 158, 11], fontStyle: "bold" },
        7: { halign: "center", textColor: [225, 29, 72], fontStyle: "bold" },
      },
    });

    // 5. AREA TANDA TANGAN
    const finalY = doc.lastAutoTable.finalY || 56;
    const ttdDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    doc.setFont("helvetica", "normal");
    doc.text(`Palembang, ${ttdDate}`, 140, finalY + 15);
    doc.text("Mengetahui,", 140, finalY + 20);
    doc.text("Wali Kelas,", 140, finalY + 25);

    doc.setFont("helvetica", "bold");
    doc.text(
      `${userProfile?.full_name || "Nama Wali Kelas"}`,
      140,
      finalY + 45,
    );
    doc.setLineWidth(0.3);
    doc.line(140, finalY + 46, 190, finalY + 46);

    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${userProfile?.employee_number || "-"}`, 140, finalY + 51);

    doc.save(
      `Rekap_Absensi_${myClass?.class_name}_${monthName}_${currentYear}.pdf`,
    );
  };

  const uniqueSchedules = [];
  const seenSubjectIds = new Set();

  schedules.forEach((sched) => {
    const subjectId = sched.subjects?.id || "unknown";
    if (!seenSubjectIds.has(subjectId)) {
      seenSubjectIds.add(subjectId);
      uniqueSchedules.push(sched);
    }
  });

  const handleTandaiHadirSemua = () => {
    setAttendanceInput((prev) => {
      const updatedData = { ...prev };
      students.forEach((student) => {
        updatedData[student.id] = "HADIR"; 
      });
      return updatedData;
    });
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      {view === "dashboard" && (
        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                Rekapitulasi Kehadiran Siswa
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Total Siswa Binaan:{" "}
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {stats.total} Anak
                </span>
              </p>
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-sm transition-all"
            >
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 w-16">
                    No
                  </th>
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                    Nama Siswa
                  </th>
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-500 text-center">
                    Hadir
                  </th>
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-sky-600 dark:text-sky-500 text-center">
                    Sakit
                  </th>
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-amber-600 dark:text-amber-500 text-center">
                    Izin
                  </th>
                  <th className="p-5 text-[11px] uppercase font-black tracking-widest text-rose-600 dark:text-rose-500 text-center">
                    Alpha
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentAttendanceSummary.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium"
                    >
                      Belum ada anak yang terdaftar di kelas ini.
                    </td>
                  </tr>
                ) : (
                  studentAttendanceSummary.map((student, index) => (
                    <tr
                      key={student.id || `rekap-${index}`}
                      className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-5 text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                        {index + 1}
                      </td>
                      <td className="p-5">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                          {student.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          NIS/NISN: {student.nis}
                        </p>
                      </td>
                      <td className="p-5 text-center">
                        <span className="inline-block min-w-[36px] px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-sm border border-emerald-100 dark:border-emerald-500/20">
                          {student.hadir}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="inline-block min-w-[36px] px-3 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold rounded-lg text-sm border border-sky-100 dark:border-sky-500/20">
                          {student.sakit}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="inline-block min-w-[36px] px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-lg text-sm border border-amber-100 dark:border-amber-500/20">
                          {student.izin}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="inline-block min-w-[36px] px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-sm border border-rose-100 dark:border-rose-500/20">
                          {student.alpha}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "students" && (
        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex justify-between items-center mb-6 px-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                Anggota Kelas Binaan
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Daftar nama seluruh peserta didik resmi terdaftar di kelas
                asuhan Anda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-rose-600/20"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Export PDF
              </button>

              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 w-16">
                    No
                  </th>
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                    Nomor Induk / NISN
                  </th>
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                    Nama Lengkap Siswa
                  </th>
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                    Gender
                  </th>
                  <th className="p-6 text-center text-emerald-600">H</th>
                  <th className="p-6 text-center text-blue-500">S</th>
                  <th className="p-6 text-center text-amber-500">I</th>
                  <th className="p-6 text-center text-rose-500">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {studentAttendanceSummary.map((student, index) => (
                  <tr
                    key={student.id || `member-${index}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-6 text-sm text-slate-700 dark:text-slate-300">
                      {index + 1}
                    </td>
                    <td className="p-6 text-sm font-bold text-slate-800 dark:text-white">
                      {student.nis}
                    </td>
                    <td className="p-6 text-sm font-medium text-slate-800 dark:text-white">
                      {student.name}
                    </td>
                    <td className="p-6 text-sm text-slate-700 dark:text-slate-300">
                      {student.gender}
                    </td>
                    <td className="p-6 text-sm font-bold text-center text-emerald-600">
                      {student.hadir}
                    </td>
                    <td className="p-6 text-sm font-bold text-center text-blue-500">
                      {student.sakit}
                    </td>
                    <td className="p-6 text-sm font-bold text-center text-amber-500">
                      {student.izin}
                    </td>
                    <td className="p-6 text-sm font-bold text-center text-rose-500">
                      {student.alpha}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "profile" && (
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/wali-kelas")}
            className="mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 hover:underline"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-28 h-28 bg-gradient-to-tr from-emerald-500 to-teal-700 rounded-[32px] flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-emerald-500/20">
                {userProfile?.full_name?.charAt(0) || "W"}
              </div>
              <div className="text-center sm:text-left space-y-3">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  {userProfile?.full_name || "Wali Kelas"}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                    Wali Kelas Aktif
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    Asuhan: {myClass?.class_name || "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-10">
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 text-left">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2 font-mono">
                  Username Log
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  @{userProfile?.username || "wali_kelas"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 text-left">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2 font-mono">
                  Alamat Email
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {userProfile?.email || "—"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 text-left">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2 font-mono">
                  Nomor Induk Pegawai
                </p>
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {userProfile?.employee_number || "—"}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 text-left">
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mb-2 font-mono">
                  Status Hak Akses
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Authorized & Synchronized
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "account" && (
        <div className="w-full max-w-5xl mx-auto space-y-4">
          <button
            onClick={() => navigate("/wali-kelas")}
            className="mb-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-2 hover:underline"
          >
            ← Kembali ke Dashboard
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-8 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors duration-300 text-left">
              <div className="space-y-5">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
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
                    Keamanan Akun
                  </h3>
                  <p className="text-sm mt-2 leading-relaxed text-slate-500 dark:text-slate-400">
                    Harap amankan credential login Anda secara mandiri demi
                    keamanan privasi data peserta didik kelas.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 p-10 rounded-[32px] bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
              <div className="mb-8 text-left">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                  Ubah Kata Sandi
                </h2>
                <p className="text-base mt-2 text-slate-500 dark:text-slate-400">
                  Perbarui kata sandi akun portal SD Padmajaya Anda.
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
                className="space-y-6 text-left"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-2 font-mono">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        placeholder="Minimal 6 karakter"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
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
                    <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-2 font-mono">
                      Konfirmasi Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Ulangi password baru"
                        className="w-full p-4 pr-12 rounded-2xl border text-sm transition-all font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
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
                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all w-full sm:w-auto"
                  >
                    Simpan Password Baru
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {view === "input-absensi" && (
        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="mb-8 text-left">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              Pencatatan Presensi {myClass?.class_name || "Kelas"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Silakan pilih mata pelajaran terlebih dahulu sebelum mengisi
              kehadiran siswa hari ini.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 text-left mb-8 max-w-md">
            <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-2 font-mono">
              Mata Pelajaran Saat Ini
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-4 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
            >
              <option value="" disabled>
                — Pilih Mata Pelajaran —
              </option>
              {uniqueSchedules.length === 0 ? (
                <option value="" disabled>
                  {["Sabtu", "Minggu"].includes(getCurrentDay())
                    ? "🎉 HARI LIBUR: SD Padmajaya Tutup!"
                    : "Belum ada jadwal hari ini"}
                </option>
              ) : (
                uniqueSchedules.map((sched) => (
                  <option key={sched.id} value={sched.id}>
                    {sched.subjects?.subject_name ||
                      "Mata Pelajaran Tidak Diketahui"}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={handleTandaiHadirSemua}
              className="group flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-emerald-500/80 text-emerald-500 hover:bg-emerald-500/10 dark:border-emerald-500/50 dark:hover:bg-emerald-500/20 transition-all font-bold text-sm w-full sm:w-auto shrink-0"
            >
              <svg
                className="w-4 h-4 group-active:scale-90 transition-transform"
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
              Tandai Hadir Semua
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 w-16">
                    No
                  </th>
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400">
                    Nama Siswa
                  </th>
                  <th className="p-6 text-[11px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 text-center w-80">
                    Status Kehadiran
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-50 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-6 font-mono text-sm text-slate-400">
                      {i + 1}
                    </td>
                    <td className="p-6">
                      <p className="font-black text-sm text-slate-700 dark:text-slate-200">
                        {student.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        NIS: {student.nis || "—"}
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-5">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`hadir-${student.id}`}
                            name={`status-${student.id}`}
                            className="peer/hadir w-4 h-4 cursor-pointer accent-emerald-500"
                            value="HADIR"
                            checked={attendanceInput[student.id] === "HADIR"}
                            onChange={() =>
                              setAttendanceInput((prev) => ({
                                ...prev,
                                [student.id]: "HADIR",
                              }))
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
                            checked={attendanceInput[student.id] === "SAKIT"}
                            onChange={() =>
                              setAttendanceInput((prev) => ({
                                ...prev,
                                [student.id]: "SAKIT",
                              }))
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
                            checked={attendanceInput[student.id] === "IZIN"}
                            onChange={() =>
                              setAttendanceInput((prev) => ({
                                ...prev,
                                [student.id]: "IZIN",
                              }))
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
                            checked={attendanceInput[student.id] === "ALPHA"}
                            onChange={() =>
                              setAttendanceInput((prev) => ({
                                ...prev,
                                [student.id]: "ALPHA",
                              }))
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveAttendance}
              type="button"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all w-full sm:w-auto"
            >
              Simpan Rekaman Presensi
            </button>
          </div>
        </div>
      )}

      <div
        className={`fixed top-8 right-8 z-[200] transition-all duration-500 transform ${toast.show ? "translate-x-0 opacity-100" : "translate-x-[150%] opacity-0"}`}
      >
        <div className="bg-emerald-600 text-white px-8 py-4 rounded-[22px] shadow-2xl shadow-emerald-600/30 flex items-center gap-4">
          <div className="bg-white/20 p-1.5 rounded-full">
            <svg
              className="w-5 h-5 text-white"
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
          </div>
          <p className="font-black tracking-wide text-sm">{toast.message}</p>
        </div>
      </div>
    </div>
  );
}
